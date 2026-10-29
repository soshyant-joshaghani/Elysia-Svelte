import { Redis } from 'ioredis';
import type { AppConfig } from '../app/config';
import { log } from '../lib/logger';
import { MAX_RETRIES, QUEUE_KEY, type Job } from './index';
import { runTask, UnknownTaskError } from './tasks';

type Push = (payload: string) => Promise<unknown>;

/** Handle one popped payload: run it, drop unknown tasks, re-push failures up to MAX_RETRIES times. */
export async function processPayload(raw: string, push: Push, run: (job: Job) => Promise<void> = runTask) {
	let job: Job;
	try {
		job = JSON.parse(raw) as Job;
		if (!job || typeof job.task !== 'string') throw new Error('missing task');
	} catch (error) {
		log.warn('dropping malformed job payload', { error: error instanceof Error ? error.message : String(error) });
		return;
	}
	try {
		await run(job);
		log.info(`job ${job.id} (${job.task}) done`);
	} catch (error) {
		if (error instanceof UnknownTaskError) {
			log.warn(`job ${job.id}: unknown task '${job.task}', dropped`);
			return;
		}
		const reason = error instanceof Error ? error.message : String(error);
		const attempt = job.attempt ?? 0;
		if (attempt < MAX_RETRIES) {
			job.attempt = attempt + 1;
			log.warn(`job ${job.id} (${job.task}) failed: ${reason}; retry ${job.attempt}/${MAX_RETRIES}`);
			await push(JSON.stringify(job));
		} else {
			log.error(`job ${job.id} (${job.task}) failed permanently: ${reason}`);
		}
	}
}

/** Blocking worker loop: `BRPOP foxg:jobs 5`. Reconnects when Redis goes away. */
export async function runWorker(config: Pick<AppConfig, 'redisHost' | 'redisPort' | 'redisDb' | 'redisPassword'>) {
	const redis = new Redis({
		host: config.redisHost,
		port: config.redisPort,
		db: config.redisDb,
		password: config.redisPassword || undefined,
		maxRetriesPerRequest: null,
		retryStrategy: (times) => Math.min(times * 500, 5000)
	});
	redis.on('error', (error: Error) => log.warn('redis error', { error: error.message }));

	let stopping = false;
	const stop = () => {
		if (stopping) return;
		stopping = true;
		log.info('worker shutting down');
		redis.disconnect();
	};
	process.on('SIGINT', stop);
	process.on('SIGTERM', stop);

	log.info(`worker started, waiting for jobs on ${QUEUE_KEY}`);
	while (!stopping) {
		try {
			const popped = await redis.brpop(QUEUE_KEY, 5);
			if (popped) await processPayload(popped[1], (payload) => redis.lpush(QUEUE_KEY, payload));
		} catch (error) {
			if (stopping) break;
			log.warn('redis error, retrying', { error: error instanceof Error ? error.message : String(error) });
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
	}
}
