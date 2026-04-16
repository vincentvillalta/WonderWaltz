import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nestjs';
import { PlanGenerationProcessor } from '../../src/plan-generation/plan-generation.processor.js';

vi.mock('@sentry/nestjs', () => ({
  captureException: vi.fn(),
}));

/**
 * PlanGenerationProcessor tests -- BullMQ processor wiring.
 *
 * Verifies:
 * - Happy path: calls service.generate, returns planId
 * - Failed handler: retries logged, dead-letter on final
 * - UnrecoverableError: dead-letter immediately
 */

const TRIP_ID = 'trip-001';
const PLAN_ID = 'plan-001';

function buildMockService(opts: { shouldThrow?: boolean } = {}) {
  return {
    generate: opts.shouldThrow
      ? vi.fn().mockRejectedValue(new Error('solver failed'))
      : vi.fn().mockResolvedValue({ planId: PLAN_ID, cached: false }),
  };
}

function buildMockSlack() {
  return {
    sendDeadLetter: vi.fn().mockResolvedValue(undefined),
    sendAlert: vi.fn().mockResolvedValue(undefined),
    resetConsecutiveCount: vi.fn().mockResolvedValue(undefined),
  };
}

function buildMockJob(
  opts: {
    attemptsMade?: number;
    maxAttempts?: number;
  } = {},
) {
  return {
    id: 'job-001',
    data: { tripId: TRIP_ID, kind: 'initial' as const },
    attemptsMade: opts.attemptsMade ?? 1,
    opts: { attempts: opts.maxAttempts ?? 5 },
  };
}

describe('PlanGenerationProcessor', () => {
  let service: ReturnType<typeof buildMockService>;
  let slack: ReturnType<typeof buildMockSlack>;
  let processor: PlanGenerationProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    service = buildMockService();
    slack = buildMockSlack();
    processor = new PlanGenerationProcessor(service as never, slack as never);
  });

  describe('process', () => {
    it('calls service.generate and returns result', async () => {
      const job = buildMockJob();

      const result = await processor.process(job as never);

      expect(service.generate).toHaveBeenCalledWith(TRIP_ID);
      expect(result).toEqual({ planId: PLAN_ID, cached: false });
    });
  });

  describe('onFailed', () => {
    it('logs transient failure without dead-letter', async () => {
      const job = buildMockJob({ attemptsMade: 2, maxAttempts: 5 });
      const error = new Error('transient error');

      await processor.onFailed(job as never, error);

      // Sentry NOT called for transient failures
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(slack.sendDeadLetter).not.toHaveBeenCalled();
    });

    it('fires Sentry + Slack dead-letter after final retry', async () => {
      const job = buildMockJob({ attemptsMade: 5, maxAttempts: 5 });
      const error = new Error('final failure');

      await processor.onFailed(job as never, error);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            queue: 'plan-generation',
            jobId: 'job-001',
          },
        }),
      );
      expect(slack.sendDeadLetter).toHaveBeenCalledWith(
        'plan-generation',
        'job-001',
        expect.stringContaining('final failure'),
      );
    });

    it('fires dead-letter on attempt 1/1 (no retries)', async () => {
      const job = buildMockJob({ attemptsMade: 1, maxAttempts: 1 });
      const error = new Error('immediate failure');

      await processor.onFailed(job as never, error);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(slack.sendDeadLetter).toHaveBeenCalled();
    });
  });

  describe('onCompleted', () => {
    it('resets consecutive count on success', async () => {
      await processor.onCompleted();

      expect(slack.resetConsecutiveCount).toHaveBeenCalledWith('plan-generation');
    });
  });
});
