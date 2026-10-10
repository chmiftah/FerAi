import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

export const COOKIE = 'session';

const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

// Token tergantung AUTH_SECRET + APP_PASSWORD: ganti password = semua sesi login batal.
export const makeToken = () => hmac(env.AUTH_SECRET, env.APP_PASSWORD).toString('hex');

export function isLoggedIn(cookies) {
	if (!env.AUTH_SECRET || !env.APP_PASSWORD) return false;
	const c = cookies.get(COOKIE);
	if (!c) return false;
	const a = Buffer.from(c);
	const b = Buffer.from(makeToken());
	return a.length === b.length && timingSafeEqual(a, b);
}

export function checkPassword(p) {
	if (!env.APP_PASSWORD) return false;
	return timingSafeEqual(hmac('pw', p), hmac('pw', env.APP_PASSWORD));
}
