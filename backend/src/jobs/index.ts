// Redis list job protocol (CONTRACT.md, "Jobs"). No queue library.
//
//   queue    list `foxg:jobs`
//   enqueue  LPUSH {"id","task","args","enqueued_at"}
//   worker   BRPOP foxg:jobs 5, run the task by name, retry a failure up to 3 times with "attempt": n

export const QUEUE_KEY = 'foxg:jobs';
export const MAX_RETRIES = 3;

export type Job = {
	id: string;
	task: string;
	args: Record<string, unknown>;
	enqueued_at: string;
	attempt?: number;
};

export function newJob(task: string, args: Record<string, unknown>): Job {
	return { id: crypto.randomUUID(), task, args, enqueued_at: new Date().toISOString() };
}

export type JobQueue = {
	/** Returns the job id. Rejects with a readable message when Redis is down. */
	enqueue(task: string, args: Record<string, unknown>): Promise<string>;
};

/** In-memory queue for tests. */
export function memoryJobs(): JobQueue & { jobs: Job[]; failWith(message: string | null): void } {
	const jobs: Job[] = [];
	let failure: string | null = null;
	return {
		jobs,
		failWith(message) {
			failure = message;
		},
		async enqueue(task, args) {
			if (failure) throw new Error(failure);
			const job = newJob(task, args);
			jobs.push(job);
			return job.id;
		}
	};
}
