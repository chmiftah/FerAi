import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { profilAktif } from '$lib/server/profil.js';

const MAKS = 4000;

export async function GET({ cookies }) {
	const sql = await db();
	const profil = await profilAktif(cookies);
	const [r] = await sql`select instruksi from profil where nama = ${profil}`;
	return json({ profil, instruksi: r?.instruksi ?? '' });
}

export async function PUT({ request, cookies }) {
	const { instruksi } = await request.json();
	if (typeof instruksi !== 'string' || instruksi.length > MAKS) {
		return json({ error: `Instruksi maksimal ${MAKS} karakter` }, { status: 400 });
	}
	const sql = await db();
	const profil = await profilAktif(cookies);
	await sql`update profil set instruksi = ${instruksi.trim()} where nama = ${profil}`;
	return json({ ok: true });
}
