import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { COOKIE_PROFIL, daftarProfil, profilAktif } from '$lib/server/profil.js';

const OPSI = { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 };
const bersih = (s) => String(s ?? '').trim().slice(0, 30);
const err = (pesan, status) => json({ error: pesan }, { status });

// Buat profile baru dan langsung pindah ke sana
export async function POST({ request, cookies }) {
	const nama = bersih((await request.json()).nama);
	if (!nama) return err('Nama kosong', 400);
	const sql = await db();
	const [ada] = await sql`select 1 as ok from profil where nama = ${nama}`;
	if (ada) return err('Nama profile sudah dipakai', 409);
	await sql`insert into profil (nama) values (${nama})`;
	cookies.set(COOKIE_PROFIL, nama, OPSI);
	return json({ profiles: await daftarProfil(), aktif: nama });
}

// Ganti nama profile (obrolannya ikut pindah lewat ON UPDATE CASCADE)
export async function PATCH({ request, cookies }) {
	const b = await request.json();
	const lama = String(b.nama ?? '');
	const baru = bersih(b.baru);
	if (!baru) return err('Nama kosong', 400);
	const daftar = await daftarProfil();
	if (!daftar.includes(lama)) return err('Profile tidak ditemukan', 404);
	if (baru !== lama && daftar.includes(baru)) return err('Nama profile sudah dipakai', 409);
	const aktifLama = await profilAktif(cookies); // dibaca sebelum nama diubah
	const sql = await db();
	await sql`update profil set nama = ${baru} where nama = ${lama}`;
	const aktif = aktifLama === lama ? baru : aktifLama;
	cookies.set(COOKIE_PROFIL, aktif, OPSI);
	return json({ profiles: await daftarProfil(), aktif });
}

// Hapus profile beserta semua obrolannya (ON DELETE CASCADE)
export async function DELETE({ request, cookies }) {
	const { nama } = await request.json();
	const daftar = await daftarProfil();
	if (!daftar.includes(nama)) return err('Profile tidak ditemukan', 404);
	if (daftar.length <= 1) return err('Minimal harus ada satu profile', 400);
	const sql = await db();
	await sql`delete from profil where nama = ${nama}`;
	cookies.delete(COOKIE_PROFIL, { path: '/' });
	return json({ profiles: await daftarProfil(), aktif: await profilAktif(cookies) });
}
