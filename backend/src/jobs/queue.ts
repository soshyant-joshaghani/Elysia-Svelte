import type { RedisHandle } from '../redis/client';
import { newJob, QUEUE_KEY, type JobQueue } from './index';

export function createRedisJobQueue(handle: RedisHandle): JobQueue {
	return {
		async enqueue(task, args) {
			const job = newJob(task, args);
			await handle.client().lpush(QUEUE_KEY, JSON.stringify(job));
			return job.id;
		}
	};
}
