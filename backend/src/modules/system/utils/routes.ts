import { Elysia, t } from 'elysia';

export const utilsRoutes = () =>
	new Elysia({ prefix: '/utils', tags: ['[SYSTEM] System - Utils'] }).get('/health-check', () => true, {
		response: { 200: t.Boolean() },
		detail: { summary: 'Health Check' }
	});
