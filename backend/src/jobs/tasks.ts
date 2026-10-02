import { log } from '../lib/logger';
import type { Job } from './index';

export class UnknownTaskError extends Error {}

/** Register app-specific tasks here, by name. */
const tasks: Record<string, (job: Job) => Promise<void> | void> = {
	ping(job) {
		const message = typeof job.args?.message === 'string' ? job.args.message : 'pong';
		log.info(`ping job received: ${message}`);
	}
};

export async function runTask(job: Job) {
	const task = Object.hasOwn(tasks, job.task) ? tasks[job.task] : undefined;
	if (!task) throw new UnknownTaskError(job.task);
	await task(job);
}
