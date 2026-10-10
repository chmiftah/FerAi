import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { checkPassword, makeToken, COOKIE } from '$lib/server/auth.js';

export const actions = {
	default: async ({ request, cookies }) => {
		if (!env.APP_PASSWORD || !env.AUTH_SECRET) {
			return fail(500, { error: 'APP_PASSWORD / AUTH_SECRET belum diset di environment.' });
		}
		const data = await request.formData();
		if (!checkPassword(String(data.get('password') ?? ''))) {
			await new Promise((r) => setTimeout(r, 800));
			return fail(401, { error: 'Password salah' });
		}
		cookies.set(COOKIE, makeToken(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30
		});
		redirect(303, '/');
	}
};
