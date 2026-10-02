# Background jobs

Jobs use a Redis list (`foxg:jobs`) and a Redis list worker (`backend/src/jobs/worker.ts`). The protocol is in [CONTRACT.md](../../../../CONTRACT.md). There is no queue library (BullMQ was removed).

- Enqueue from a service after the database write succeeds (`JobQueue.enqueue(task, args)` in `backend/src/jobs`). Do not run long work inside the request.
- The worker pops with `BRPOP foxg:jobs 5`, runs the task by name, drops unknown tasks, and re-pushes a failed task with `"attempt": n` up to three times.
- Register a task in `backend/src/jobs/tasks.ts`. `ping` is the example and logs `ping job received: <message>`.
- `POST /api/v1/private/jobs/ping?message=hi` enqueues a ping (`ENVIRONMENT=local` only). A missing Redis returns 503.

The full profile starts Redis and the worker. Slim mode omits both. Production always includes the worker.
