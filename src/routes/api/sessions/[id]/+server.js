import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { profilAktif } from '$lib/server/profil.js';

function getId(params) {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(400, 'ID tidak valid');
	return id;
}

export async function GET({ params, cookies }) {
	const id = getId(params);
	const profil = await profilAktif(cookies);
	const sql = await db();
	return json(
		await sql`
			select p.role, p.isi as content
			from pesan p join sesi s on s.id = p.sesi_id
			where p.sesi_id = ${id} and s.profil = ${profil}
			order by p.id`
	);
}

export async function DELETE({ params, cookies }) {
	const id = getId(params);
	const profil = await profilAktif(cookies);
	const sql = await db();
	await sql`delete from sesi where id = ${id} and profil = ${profil}`;
	return json({ ok: true });
}
