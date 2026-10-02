import { describe, expect, test } from 'bun:test';
import { MAX_RETRIES, QUEUE_KEY, newJob, type Job } from '../../../backend/src/jobs';
import { runTask } from '../../../backend/src/jobs/tasks';
import { processPayload } from '../../../backend/src/jobs/worker';

describe('jobs (Redis list protocol)', () => {
	test('job payload shape', () => {
		const job = newJob('ping', { message: 'hi' });
		expect(QUEUE_KEY).toBe('foxg:jobs');
		expect(Object.keys(job).sort()).toEqual(['args', 'enqueued_at', 'id', 'task']);
		expect(job.enqueued_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	test('ping logs "ping job received: <message>"', async () => {
		const lines: string[] = [];
		const original = console.log;
		console.log = (line: string) => void lines.push(String(line));
		try {
			await runTask(newJob('ping', { message: 'contract' }));
		} finally {
			console.log = original;
		}
		expect(lines.some((line) => line.includes('ping job received: contract'))).toBe(true);
	});

	test('unknown tasks are dropped, not retried', async () => {
		const pushed: string[] = [];
		await processPayload(JSON.stringify(newJob('nope', {})), async (p) => void pushed.push(p));
		expect(pushed).toEqual([]);
	});

	test('malformed payloads are dropped', async () => {
		const pushed: string[] = [];
		await processPayload('not json', async (p) => void pushed.push(p));
		expect(pushed).toEqual([]);
	});

	test('a failing task is re-pushed with attempt n, at most 3 times', async () => {
		const pushed: Job[] = [];
		const fail = async () => {
			throw new Error('boom');
		};
		let raw = JSON.stringify(newJob('ping', {}));
		for (let round = 1; round <= MAX_RETRIES; round++) {
			pushed.length = 0;
			await processPayload(raw, async (p) => void pushed.push(JSON.parse(p)), fail);
			expect(pushed).toHaveLength(1);
			expect(pushed[0]!.attempt).toBe(round);
			raw = JSON.stringify(pushed[0]);
		}
		pushed.length = 0;
		await processPayload(raw, async (p) => void pushed.push(JSON.parse(p)), fail);
		expect(pushed).toHaveLength(0);
	});
});
