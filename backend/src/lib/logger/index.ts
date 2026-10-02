type Fields = Record<string, unknown>;

function write(level: 'INFO' | 'WARN' | 'ERROR', message: string, fields?: Fields) {
	const extra = fields
		? ' ' +
			Object.entries(fields)
				.map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
				.join(' ')
		: '';
	const line = `${new Date().toISOString()} ${level} ${message}${extra}`;
	if (level === 'ERROR') console.error(line);
	else console.log(line);
}

export const log = {
	info: (message: string, fields?: Fields) => write('INFO', message, fields),
	warn: (message: string, fields?: Fields) => write('WARN', message, fields),
	error: (message: string, fields?: Fields) => write('ERROR', message, fields)
};
