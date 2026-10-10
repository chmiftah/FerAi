import { db } from '$lib/server/db.js';

export const COOKIE_PROFIL = 'profil';

export async function daftarProfil() {
	const sql = await db();
	return (await sql`select nama from profil order by id`).map((r) => r.nama);
}

/** Profile aktif dari cookie; kalau tidak valid, pakai profile pertama. */
export async function profilAktif(cookies) {
	const sql = await db();
	const c = cookies.get(COOKIE_PROFIL);
	if (c) {
		const [r] = await sql`select nama from profil where nama = ${c}`;
		if (r) return r.nama;
	}
	const [p] = await sql`select nama from profil order by id limit 1`;
	return p.nama;
}
