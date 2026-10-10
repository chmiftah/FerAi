import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { profilAktif } from '$lib/server/profil.js';

export async function GET({ url, cookies }) {
	const q = (url.searchParams.get('q') ?? '').trim();
	if (q.length < 2) return json([]);
	const sql = await db();
	const profil = await profilAktif(cookies);
	const pola = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
	const rows = await sql`
		select s.id, s.judul, p.isi
		from pesan p join sesi s on s.id = p.sesi_id
		where p.isi ilike ${pola} and s.profil = ${profil}
		order by p.id desc
		limit 60`;

	// satu hasil per obrolan (kecocokan terbaru), dengan cuplikan di sekitar kata
	const hasil = new Map();
	const kecil = q.toLowerCase();
	for (const r of rows) {
		if (hasil.has(r.id)) continue;
		const i = Math.max(0, r.isi.toLowerCase().indexOf(kecil));
		const awal = Math.max(0, i - 40);
		const cuplikan = (awal > 0 ? '…' : '') + r.isi.slice(awal, i + q.length + 80).replace(/\s+/g, ' ');
		hasil.set(r.id, { id: r.id, judul: r.judul, cuplikan });
	}
	return json([...hasil.values()].slice(0, 20));
}
