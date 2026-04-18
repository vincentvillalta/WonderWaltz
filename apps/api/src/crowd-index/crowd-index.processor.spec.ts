import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nestjs';
import type { CrowdIndexProcessor as CrowdIndexProcessorType } from './crowd-index.processor.js';

/**
 * Unit tests for CrowdIndexProcessor.
 *
 * Verifies:
 * - onModuleInit registers upsertJobScheduler with cron '0 * * * *'
 * - process() calls crowdIndexService.refreshAll with today's date string
 * - Dead-letter detection: Sentry + Slack on exhausted retries
 * - Transient failures do NOT trigger dead-letter
 * - onCompleted resets the consecutive counter
 */

describe('CrowdIndexProcessor', () => {
  let processor: CrowdIndexProcessorType;
  let mockCrowdIndexService: { refreshAll: ReturnType<typeof vi.fn> };
  let mockSlackAlerter: {
    sendDeadLetter: ReturnType<typeof vi.fn>;
    resetConsecutiveCount: ReturnType<typeof vi.fn>;
  };
  let mockCrowdIndexQueue: { upsertJobScheduler: ReturnType<typeof vi.fn> };
  let sentryCaptureSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockCrowdIndexService = { refreshAll: vi.fn().mockResolvedValue(undefined) };
    mockSlackAlerter = {
      sendDeadLetter: vi.fn().mockResolvedValue(undefined),
      resetConsecutiveCount: vi.fn().mockResolvedValue(undefined),
    };
    mockCrowdIndexQueue = {
      upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
    };

    const spy = vi.spyOn(Sentry, 'captureException').mockImplementation(() => '');
    spy.mockClear();
    sentryCaptureSpy = spy as ReturnType<typeof vi.fn>;

    const { CrowdIndexProcessor } = await import('./crowd-index.processor.js');
    processor = new CrowdIndexProcessor(
      mockCrowdIndexService as never,
      mockSlackAlerter as never,
      mockCrowdIndexQueue as never,
    );
  });

  describe('onModuleInit', () => {
    it('calls upsertJobScheduler with hourly cron pattern', async () => {
      process.env['ENABLE_INGESTION_WORKERS'] = 'true';
      await processor.onModuleInit();
      delete process.env['ENABLE_INGESTION_WORKERS'];

      expect(mockCrowdIndexQueue.upsertJobScheduler).toHaveBeenCalledOnce();
      const [schedulerId, schedule, jobConfig] = mockCrowdIndexQueue.upsertJobScheduler.mock
        .calls[0] as [string, { pattern: string }, { name: string; data: object; opts: object }];

      expect(schedulerId).toBe('crowd-index-scheduler');
      expect(schedule.pattern).toBe('0 * * * *');
      expect(jobConfig.name).toBe('refresh_crowd_index');
    });
  });

  describe('process', () => {
    it("calls crowdIndexService.refreshAll with today's date string", async () => {
      const mockJob = {
        id: 'job-1',
        name: 'refresh_crowd_index',
        data: {},
        attemptsMade: 0,
        opts: { attempts: 3 },
      };

      const today = new Date().toISOString().split('T')[0];
      await processor.process(mockJob as never);

      expect(mockCrowdIndexService.refreshAll).toHaveBeenCalledOnce();
      const [dateArg] = mockCrowdIndexService.refreshAll.mock.calls[0] as [string];

      // Date should be today's YYYY-MM-DD (allow 1 second tolerance for midnight edge case)
      expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Should be today or very recent (within the same minute)
      expect(dateArg).toBe(today);
    });
  });

  describe('onFailed — dead-letter detection', () => {
    it('calls Sentry.captureException when attemptsMade >= maxAttempts', async () => {
      const mockJob = {
        id: 'dead-letter-job',
        name: 'refresh_crowd_index',
        data: {},
        attemptsMade: 3,
        opts: { attempts: 3 },
      };
      const error = new Error('All retries exhausted');

      await processor.onFailed(mockJob as never, error);

      expect(sentryCaptureSpy).toHaveBeenCalledOnce();
    });

    it('calls slackAlerter.sendDeadLetter when attemptsMade >= maxAttempts', async () => {
      const mockJob = {
        id: 'dead-letter-job',
        name: 'refresh_crowd_index',
        data: {},
        attemptsMade: 3,
        opts: { attempts: 3 },
      };
      const error = new Error('All retries exhausted');

      await processor.onFailed(mockJob as never, error);

      expect(mockSlackAlerter.sendDeadLetter).toHaveBeenCalledOnce();
      const [queueName, jobId] = mockSlackAlerter.sendDeadLetter.mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(queueName).toBe('crowd-index');
      expect(jobId).toBe('dead-letter-job');
    });

    it('does NOT call Sentry for transient failures (attemptsMade < maxAttempts)', async () => {
      const mockJob = {
        id: 'retry-job',
        name: 'refresh_crowd_index',
        data: {},
        attemptsMade: 1,
        opts: { attempts: 3 },
      };
      const error = new Error('Transient failure');

      await processor.onFailed(mockJob as never, error);

      expect(sentryCaptureSpy).not.toHaveBeenCalled();
      expect(mockSlackAlerter.sendDeadLetter).not.toHaveBeenCalled();
    });
  });

  describe('onCompleted', () => {
    it('calls slackAlerter.resetConsecutiveCount with queue name', async () => {
      await processor.onCompleted();

      expect(mockSlackAlerter.resetConsecutiveCount).toHaveBeenCalledWith('crowd-index');
    });
  });
});
