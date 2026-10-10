import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { profilAktif } from '$lib/server/profil.js';

export async function GET({ cookies }) {
	const sql = await db();
	const profil = await profilAktif(cookies);
	return json(await sql`select id, judul from sesi where profil = ${profil} order by id desc limit 50`);
}
