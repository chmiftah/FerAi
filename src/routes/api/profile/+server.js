import { json } from '@sveltejs/kit';
import { COOKIE_PROFIL, daftarProfil } from '$lib/server/profil.js';

const COOKIE_OPSI = { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 };

// Pindah profile aktif
export async function POST({ request, cookies }) {
	const { nama } = await request.json();
	if (!(await daftarProfil()).includes(nama)) {
		return json({ error: 'Profile tidak dikenal' }, { status: 400 });
	}
	cookies.set(COOKIE_PROFIL, nama, COOKIE_OPSI);
	return json({ ok: true });
}
