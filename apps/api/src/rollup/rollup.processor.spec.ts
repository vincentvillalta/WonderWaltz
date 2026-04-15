import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nestjs';
import type { RollupProcessor as RollupProcessorType } from './rollup.processor.js';

/**
 * Unit tests for RollupProcessor.
 *
 * DATA-03a: mock db.execute returns a row with start_time 10min ago, status='succeeded'
 *           -> no Sentry call
 * DATA-03b: mock db.execute returns row with start_time 100min ago -> Sentry.captureException called
 * Additional: status='failed' -> Sentry called even if start_time is recent
 * Additional: no rows (pg_cron never ran) -> Sentry called
 *
 * This worker is a MONITOR ONLY -- it queries cron.job_run_details via raw SQL.
 * It does NOT call REFRESH MATERIALIZED VIEW.
 */

describe('RollupProcessor', () => {
  let processor: RollupProcessorType;
  let mockDb: { execute: ReturnType<typeof vi.fn> };
  let mockSlackAlerter: { sendDeadLetter: ReturnType<typeof vi.fn> };
  let mockRollupQueue: { upsertJobScheduler: ReturnType<typeof vi.fn> };
  let sentryCaptureSpy: ReturnType<typeof vi.fn>;

  function makeRow(overrides: {
    start_time?: string;
    status?: string;
    return_message?: string | null;
  }) {
    const defaultStart = new Date(Date.now() - 10 * 60_000).toISOString();
    return {
      status: 'succeeded',
      start_time: defaultStart,
      end_time: new Date().toISOString(),
      return_message: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockDb = { execute: vi.fn() };
    mockSlackAlerter = { sendDeadLetter: vi.fn().mockResolvedValue(undefined) };
    mockRollupQueue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };

    const spy = vi.spyOn(Sentry, 'captureException').mockImplementation(() => '');
    spy.mockClear();
    sentryCaptureSpy = spy as ReturnType<typeof vi.fn>;

    const { RollupProcessor } = (await import('./rollup.processor.js')) as {
      RollupProcessor: new (...args: never[]) => RollupProcessorType;
    };
    processor = new RollupProcessor(
      mockDb as never,
      mockSlackAlerter as never,
      mockRollupQueue as never,
    );
  });

  describe('onModuleInit', () => {
    it('calls upsertJobScheduler with cron pattern 30 * * * *', async () => {
      await processor.onModuleInit();

      expect(mockRollupQueue.upsertJobScheduler).toHaveBeenCalledOnce();
      const [schedulerId, schedule, jobConfig] = mockRollupQueue.upsertJobScheduler.mock
        .calls[0] as [string, { pattern: string }, { name: string; data: object; opts: object }];

      expect(schedulerId).toBe('rollup-verify-scheduler');
      expect(schedule.pattern).toBe('30 * * * *');
      expect(jobConfig.name).toBe('rollup_wait_history');
    });
  });

  describe('process -- DATA-03a: no alert on fresh successful run', () => {
    it('does NOT call Sentry when last run is 10min ago with status succeeded', async () => {
      mockDb.execute.mockResolvedValue([
        makeRow({ start_time: new Date(Date.now() - 10 * 60_000).toISOString() }),
      ]);

      const mockJob = {
        id: 'job-1',
        name: 'rollup_wait_history',
        data: {},
        attemptsMade: 0,
        opts: { attempts: 3 },
      };
      await processor.process(mockJob as never);

      expect(sentryCaptureSpy).not.toHaveBeenCalled();
    });
  });

  describe('process -- DATA-03b: Sentry called on stale run', () => {
    it('calls Sentry.captureException when last run is 100min ago', async () => {
      mockDb.execute.mockResolvedValue([
        makeRow({ start_time: new Date(Date.now() - 100 * 60_000).toISOString() }),
      ]);

      const mockJob = {
        id: 'job-2',
        name: 'rollup_wait_history',
        data: {},
        attemptsMade: 0,
        opts: { attempts: 3 },
      };
      await processor.process(mockJob as never);

      expect(sentryCaptureSpy).toHaveBeenCalledOnce();
      const [error] = sentryCaptureSpy.mock.calls[0] as [Error, unknown];
      expect(error.message).toContain('pg_cron refresh missed');
    });
  });

  describe('process -- failed status triggers Sentry', () => {
    it('calls Sentry.captureException when status is failed even if run is recent', async () => {
      mockDb.execute.mockResolvedValue([
        makeRow({ status: 'failed', return_message: 'ERROR: relation not found' }),
      ]);

      const mockJob = {
        id: 'job-3',
        name: 'rollup_wait_history',
        data: {},
        attemptsMade: 0,
        opts: { attempts: 3 },
      };
      await processor.process(mockJob as never);

      expect(sentryCaptureSpy).toHaveBeenCalledOnce();
      const [error] = sentryCaptureSpy.mock.calls[0] as [Error, unknown];
      expect(error.message).toContain('pg_cron refresh missed');
    });
  });

  describe('process -- no rows: pg_cron never ran', () => {
    it('calls Sentry.captureException when cron.job_run_details has no rows', async () => {
      mockDb.execute.mockResolvedValue([]);

      const mockJob = {
        id: 'job-4',
        name: 'rollup_wait_history',
        data: {},
        attemptsMade: 0,
        opts: { attempts: 3 },
      };
      await processor.process(mockJob as never);

      expect(sentryCaptureSpy).toHaveBeenCalledOnce();
      const [error] = sentryCaptureSpy.mock.calls[0] as [Error, unknown];
      expect(error.message).toContain('pg_cron rollup has never run');
    });
  });

  describe('onFailed -- dead-letter detection', () => {
    it('calls Sentry.captureException when all retries are exhausted', async () => {
      const mockJob = {
        id: 'dead-letter-job',
        name: 'rollup_wait_history',
        data: {},
        attemptsMade: 3,
        opts: { attempts: 3 },
      };
      const error = new Error('All retries exhausted');

      await processor.onFailed(mockJob as never, error);

      expect(sentryCaptureSpy).toHaveBeenCalledOnce();
      expect(mockSlackAlerter.sendDeadLetter).toHaveBeenCalledOnce();
    });

    it('does NOT call Sentry for transient failures', async () => {
      const mockJob = {
        id: 'retry-job',
        name: 'rollup_wait_history',
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
});
