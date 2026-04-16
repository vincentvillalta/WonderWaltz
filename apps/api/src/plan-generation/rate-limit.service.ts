import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT_TOKEN } from '../alerting/slack-alerter.service.js';

/**
 * RateLimitService — Redis-backed rate limiting for plan generation.
 *
 * Two independent counters:
 *   1. Rethink daily cap (LLM-08): 15/day unlocked, 5/day free-tier
 *      Key: `rethink:{userId}:{utcDate}` with 86400s TTL
 *   2. Free-tier lifetime cap (PLAN-05): 3 plans per anonymous user (no TTL)
 *      Key: `plans_generated:{userId}` (permanent)
 *
 * Uses atomic INCR + conditional DECR pattern:
 *   INCR first, check if over cap, DECR if over (rollback).
 *   This is safe under concurrency — worst case is a momentary over-count
 *   that immediately corrects.
 */

const RETHINK_CAP_UNLOCKED = 15;
const RETHINK_CAP_FREE = 5;
const FREE_TIER_LIFETIME_CAP = 3;
const RETHINK_TTL_SECONDS = 86400;

export interface RethinkLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface FreeTierLimitResult {
  allowed: boolean;
  remaining: number;
}

@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis) {}

  /**
   * Check and increment the rethink daily counter for a user.
   *
   * @param userId - The user ID
   * @param isUnlocked - true = paid user (15/day cap), false = free tier (5/day)
   * @returns Whether the rethink is allowed, how many remain, and when the counter resets
   */
  async checkRethinkLimit(userId: string, isUnlocked: boolean): Promise<RethinkLimitResult> {
    const cap = isUnlocked ? RETHINK_CAP_UNLOCKED : RETHINK_CAP_FREE;
    const utcDate = new Date().toISOString().slice(0, 10);
    const key = `rethink:${userId}:${utcDate}`;

    // Atomic increment
    const count = await this.redis.incr(key);

    // Set TTL on first increment (when key had no expiry)
    const currentTtl = await this.redis.ttl(key);
    if (currentTtl < 0) {
      await this.redis.expire(key, RETHINK_TTL_SECONDS);
    }

    // Compute reset time: next UTC midnight
    const tomorrow = new Date(utcDate);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    if (count > cap) {
      // Over limit — roll back the increment
      await this.redis.decr(key);
      return { allowed: false, remaining: 0, resetAt: tomorrow };
    }

    return { allowed: true, remaining: cap - count, resetAt: tomorrow };
  }

  /**
   * Check and increment the free-tier lifetime plan generation counter.
   *
   * @param userId - The anonymous user ID
   * @returns Whether generation is allowed and how many remain
   */
  async checkFreeTierLifetime(userId: string): Promise<FreeTierLimitResult> {
    const key = `plans_generated:${userId}`;

    // Atomic increment — no TTL (permanent counter)
    const count = await this.redis.incr(key);

    if (count > FREE_TIER_LIFETIME_CAP) {
      // Over limit — roll back
      await this.redis.decr(key);
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: FREE_TIER_LIFETIME_CAP - count };
  }
}
