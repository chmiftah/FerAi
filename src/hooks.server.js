import { isLoggedIn } from '$lib/server/auth.js';

export async function handle({ event, resolve }) {
	const path = event.url.pathname;
	if (path === '/login' || path.startsWith('/_app/') || isLoggedIn(event.cookies)) {
		return resolve(event);
	}
	if (path.startsWith('/api/')) {
		return new Response(JSON.stringify({ error: 'Belum login' }), {
			status: 401,
			headers: { 'content-type': 'application/json' }
		});
	}
	return new Response(null, { status: 303, headers: { location: '/login' } });
}
