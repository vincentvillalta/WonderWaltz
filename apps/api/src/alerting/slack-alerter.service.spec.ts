import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nestjs';
import { SlackAlerterService } from './slack-alerter.service.js';
import { makeRedisClient } from '../../tests/setup.js';

/**
 * Unit tests for SlackAlerterService.
 *
 * DATA-06a: Sentry.captureException called on dead-letter
 * DATA-06b: Slack webhook called with correct payload on dead-letter
 */
describe('SlackAlerterService', () => {
  let service: SlackAlerterService;
  let mockRedis: ReturnType<typeof makeRedisClient>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRedis = makeRedisClient();
    // Set the SLACK_ALERT_WEBHOOK_URL env var for tests
    process.env['SLACK_ALERT_WEBHOOK_URL'] = 'https://hooks.slack.com/test-webhook';

    service = new SlackAlerterService(mockRedis as never);

    // Spy on global fetch
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchSpy);
  });

  describe('sendDeadLetter', () => {
    it('DATA-06a: calls Sentry.captureException when a dead-letter job is processed', async () => {
      const sentryCaptureSpy = vi.spyOn(Sentry, 'captureException');

      await service.sendDeadLetter('queue-times', 'job-123', 'Connection timeout');

      expect(sentryCaptureSpy).toHaveBeenCalledOnce();
      const [error, context] = sentryCaptureSpy.mock.calls[0]!;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Connection timeout');
      expect(context).toMatchObject({ tags: { queue: 'queue-times', jobId: 'job-123' } });
    });

    it('DATA-06b: POSTs to Slack webhook with correct URL and dead-letter message', async () => {
      await service.sendDeadLetter('queue-times', 'job-456', 'Network error');

      expect(fetchSpy).toHaveBeenCalledOnce();
      const callArgs = fetchSpy.mock.calls[0] as [
        string,
        { method: string; headers: Record<string, string>; body: string },
      ];
      const [url, options] = callArgs;
      expect(url).toBe('https://hooks.slack.com/test-webhook');
      expect(options.method).toBe('POST');
      expect(options.headers).toMatchObject({ 'Content-Type': 'application/json' });
      const body = JSON.parse(options.body) as { text: string };
      expect(body.text).toContain(':rotating_light:');
      expect(body.text).toContain('queue-times');
      expect(body.text).toContain('job-456');
      expect(body.text).toContain('Network error');
    });

    it('increments Redis key dlq_consecutive:{queueName} on dead-letter', async () => {
      await service.sendDeadLetter('queue-times', 'job-789', 'Error');

      expect(mockRedis.incr).toHaveBeenCalledWith('dlq_consecutive:queue-times');
    });

    it('does NOT throw when SLACK_ALERT_WEBHOOK_URL is missing', async () => {
      delete process.env['SLACK_ALERT_WEBHOOK_URL'];
      service = new SlackAlerterService(mockRedis as never);

      await expect(
        service.sendDeadLetter('queue-times', 'job-000', 'Error'),
      ).resolves.not.toThrow();
    });
  });

  describe('resetConsecutiveCount', () => {
    it('sets dlq_consecutive:{queueName} to 0 with 24h TTL in Redis', async () => {
      await service.resetConsecutiveCount('queue-times');

      expect(mockRedis.set).toHaveBeenCalledWith('dlq_consecutive:queue-times', '0', 'EX', 86400);
    });
  });

  describe('sendLagAlert', () => {
    it('POSTs a lag alert to Slack with the lag minutes', async () => {
      await service.sendLagAlert(42);

      expect(fetchSpy).toHaveBeenCalledOnce();
      const callArgs = fetchSpy.mock.calls[0] as [
        string,
        { method: string; headers: Record<string, string>; body: string },
      ];
      const [url, options] = callArgs;
      expect(url).toBe('https://hooks.slack.com/test-webhook');
      const body = JSON.parse(options.body) as { text: string };
      expect(body.text).toContain(':warning:');
      expect(body.text).toContain('42');
    });

    it('does NOT call Sentry.captureException for lag alerts (not an exception)', async () => {
      const sentryCaptureSpy = vi.spyOn(Sentry, 'captureException');
      sentryCaptureSpy.mockClear();

      await service.sendLagAlert(35);

      expect(sentryCaptureSpy).not.toHaveBeenCalled();
    });
  });
});
