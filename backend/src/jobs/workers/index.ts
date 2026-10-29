import { loadConfig } from '../../app/config';
import { runWorker } from '../worker';

await runWorker(loadConfig());
