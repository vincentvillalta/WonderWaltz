import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nestjs';
import type { QueueTimesProcessor as QueueTimesProcessorType } from './queue-times.processor.js';

/**
 * Unit tests for QueueTimesProcessor.
 *
 * DATA-06a: Sentry.captureException called when job is dead-lettered (attemptsMade >= maxAttempts)
 * + SlackAlerterService.sendDeadLetter called at dead-letter threshold
 * + onFailed NOT calling Sentry for transient failures (attemptsMade < maxAttempts)
 *
 * Note: We import Sentry directly (without going through setup.js) to avoid the
 * CJS/ESM issue with compiled setup.js. The global Sentry mock from setupFiles
 * is still active — we just use vi.spyOn directly here.
 */

describe('QueueTimesProcessor', () => {
  let processor: QueueTimesProcessorType;
  let mockQueueTimesService: { pollPark: ReturnType<typeof vi.fn> };
  let mockSlackAlerter: {
    sendDeadLetter: ReturnType<typeof vi.fn>;
    resetConsecutiveCount: ReturnType<typeof vi.fn>;
  };
  let mockLagAlertService: { checkAndAlert: ReturnType<typeof vi.fn> };
  let mockWaitTimesQueue: { upsertJobScheduler: ReturnType<typeof vi.fn> };
  let sentryCaptureSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockQueueTimesService = { pollPark: vi.fn().mockResolvedValue(undefined) };
    mockSlackAlerter = {
      sendDeadLetter: vi.fn().mockResolvedValue(undefined),
      resetConsecutiveCount: vi.fn().mockResolvedValue(undefined),
    };
    mockLagAlertService = { checkAndAlert: vi.fn().mockResolvedValue(undefined) };
    mockWaitTimesQueue = {
      upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
    };

    const spy = vi.spyOn(Sentry, 'captureException').mockImplementation(() => '');
    spy.mockClear();
    sentryCaptureSpy = spy as ReturnType<typeof vi.fn>;

    const { QueueTimesProcessor } = await import('./queue-times.processor.js');
    processor = new QueueTimesProcessor(
      mockQueueTimesService as never,
      mockSlackAlerter as never,
      mockLagAlertService as never,
      mockWaitTimesQueue as never,
    );
  });

  describe('onModuleInit', () => {
    it('calls upsertJobScheduler with 5-minute interval', async () => {
      await processor.onModuleInit();

      expect(mockWaitTimesQueue.upsertJobScheduler).toHaveBeenCalledOnce();
      const [schedulerId, schedule, jobConfig] = mockWaitTimesQueue.upsertJobScheduler.mock
        .calls[0] as [string, { every: number }, { name: string; data: object; opts: object }];

      expect(schedulerId).toBe('fetch-wait-times-scheduler');
      expect(schedule.every).toBe(5 * 60 * 1000); // 5 minutes in ms
      expect(jobConfig.name).toBe('fetch_queue_times');
    });
  });

  describe('process', () => {
    it('calls pollPark for each of the 4 WDW parks', async () => {
      const mockJob = {
        id: 'job-1',
        name: 'fetch_queue_times',
        data: {},
        attemptsMade: 0,
        opts: { attempts: 5 },
      };

      await processor.process(mockJob as never);

      expect(mockQueueTimesService.pollPark).toHaveBeenCalledTimes(4);
      // Park IDs: EPCOT=5, MK=6, HS=7, AK=8
      expect(mockQueueTimesService.pollPark).toHaveBeenCalledWith(5);
      expect(mockQueueTimesService.pollPark).toHaveBeenCalledWith(6);
      expect(mockQueueTimesService.pollPark).toHaveBeenCalledWith(7);
      expect(mockQueueTimesService.pollPark).toHaveBeenCalledWith(8);
    });

    it('calls lagAlertService.checkAndAlert after polling all parks', async () => {
      const mockJob = {
        id: 'job-1',
        name: 'fetch_queue_times',
        data: {},
        attemptsMade: 0,
        opts: { attempts: 5 },
      };

      await processor.process(mockJob as never);

      expect(mockLagAlertService.checkAndAlert).toHaveBeenCalledOnce();
    });
  });

  describe('onFailed — dead-letter detection (DATA-06a)', () => {
    it('calls Sentry.captureException when attemptsMade >= maxAttempts', async () => {
      const mockJob = {
        id: 'dead-letter-job',
        name: 'fetch_queue_times',
        data: {},
        attemptsMade: 5, // exhausted all retries
        opts: { attempts: 5 },
      };
      const error = new Error('All retries exhausted');

      await processor.onFailed(mockJob as never, error);

      expect(sentryCaptureSpy).toHaveBeenCalledOnce();
    });

    it('calls slackAlerter.sendDeadLetter when attemptsMade >= maxAttempts', async () => {
      const mockJob = {
        id: 'dead-letter-job',
        name: 'fetch_queue_times',
        data: {},
        attemptsMade: 5,
        opts: { attempts: 5 },
      };
      const error = new Error('All retries exhausted');

      await processor.onFailed(mockJob as never, error);

      expect(mockSlackAlerter.sendDeadLetter).toHaveBeenCalledOnce();
      const [queueName, jobId] = mockSlackAlerter.sendDeadLetter.mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(queueName).toBe('wait-times');
      expect(jobId).toBe('dead-letter-job');
    });

    it('does NOT call Sentry when attemptsMade < maxAttempts (transient failure)', async () => {
      const mockJob = {
        id: 'retry-job',
        name: 'fetch_queue_times',
        data: {},
        attemptsMade: 2, // still has retries remaining
        opts: { attempts: 5 },
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

      expect(mockSlackAlerter.resetConsecutiveCount).toHaveBeenCalledWith('wait-times');
    });
  });
});
