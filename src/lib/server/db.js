import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

let sql;
let ready;

export async function db() {
	sql ??= neon(env.DATABASE_URL || env.POSTGRES_URL);
	ready ??= (async () => {
		await sql`create table if not exists sesi (
			id serial primary key,
			judul text not null,
			dibuat timestamptz not null default now()
		)`;
		await sql`create table if not exists pesan (
			id serial primary key,
			sesi_id int not null references sesi(id) on delete cascade,
			role text not null,
			isi text not null,
			waktu timestamptz not null default now()
		)`;
		await sql`create index if not exists pesan_sesi_idx on pesan (sesi_id)`;

		// --- Profile (dinamis, disimpan di database) ---
		await sql`create table if not exists profil (
			id serial primary key,
			nama text not null unique
		)`;
		await sql`alter table profil add column if not exists instruksi text not null default ''`;
		await sql`alter table sesi add column if not exists profil text`;
		// profile yang sudah dipakai obrolan (mis. dari versi sebelumnya) ikut didaftarkan
		await sql`insert into profil (nama) select distinct profil from sesi where profil is not null on conflict do nothing`;
		const [{ n }] = await sql`select count(*)::int as n from profil`;
		if (n === 0) {
			// profile awal; PROFILES di env hanya dipakai sekali di sini
			const awal = (env.PROFILES || 'A,B').split(',').map((s) => s.trim()).filter(Boolean);
			for (const nama of awal.length ? [...new Set(awal)] : ['A']) {
				await sql`insert into profil (nama) values (${nama}) on conflict do nothing`;
			}
		}
		// obrolan lama tanpa profile masuk ke profile pertama
		await sql`update sesi set profil = (select nama from profil order by id limit 1) where profil is null`;
		// ganti nama profile ikut mengubah obrolan; hapus profile menghapus obrolannya
		await sql`do $$ begin
			if not exists (select 1 from pg_constraint where conname = 'sesi_profil_fk') then
				alter table sesi add constraint sesi_profil_fk foreign key (profil)
					references profil(nama) on update cascade on delete cascade;
			end if;
		end $$`;
		await sql`create index if not exists sesi_profil_idx on sesi (profil, id desc)`;
	})().catch((e) => {
		ready = undefined;
		throw e;
	});
	await ready;
	return sql;
}
