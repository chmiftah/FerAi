import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db.js';
import { MODES } from '$lib/modes.js';
import { profilAktif } from '$lib/server/profil.js';

export const config = { maxDuration: 60 };

const MAKS_PESAN = 40; // pesan terakhir yang dikirim ke model
const MAKS_PANJANG = 400_000; // karakter, termasuk isi file terlampir
const INT_MAX = 2147483647;
const gagal = (pesan, status) => json({ error: pesan }, { status });

export async function POST({ request, cookies }) {
	// ulang = true: ganti pertukaran terakhir (Coba lagi: tanpa `pesan`; Edit: dengan `pesan` baru)
	const { sesiId, pesan, images = [], mode, ulang = false } = await request.json();
	if (pesan != null && typeof pesan !== 'string') return gagal('Pesan tidak valid', 400);
	if (!ulang && !pesan?.trim()) return gagal('Pesan kosong', 400);
	if (ulang && !sesiId) return gagal('Tidak ada obrolan untuk diulang', 400);
	if (pesan && pesan.length > MAKS_PANJANG) {
		return gagal('Pesan terlalu panjang (kurangi file terlampir)', 413);
	}
	const gambarOk =
		Array.isArray(images) &&
		images.length <= 4 &&
		images.every((u) => typeof u === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,/.test(u));
	if (!gambarOk) return gagal('Gambar tidak valid (maks 4, format JPEG/PNG/WebP/GIF)', 400);

	const sql = await db();
	const profil = await profilAktif(cookies);

	let riwayat = [];
	let teks = pesan;
	let gantiDari = null; // id pesan user terakhir yang akan diganti
	if (sesiId) {
		const [ada] = await sql`select 1 as ok from sesi where id = ${sesiId} and profil = ${profil}`;
		if (!ada) return gagal('Obrolan tidak ditemukan di profile ini', 404);
		if (ulang) {
			const [terakhir] = await sql`
				select id, isi from pesan where sesi_id = ${sesiId} and role = 'user' order by id desc limit 1`;
			if (!terakhir) return gagal('Tidak ada pesan untuk diulang', 400);
			gantiDari = terakhir.id;
			teks = pesan?.trim() ? pesan : terakhir.isi;
		}
		const rows = await sql`
			select role, isi from (
				select id, role, isi from pesan
				where sesi_id = ${sesiId} and id < ${gantiDari ?? INT_MAX}
				order by id desc limit ${MAKS_PESAN}
			) t order by id`;
		riwayat = rows.map((r) => ({ role: r.role, content: r.isi }));
	}
	riwayat.push({
		role: 'user',
		content: images.length
			? [{ type: 'text', text: teks }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))]
			: teks
	});

	// Prompt sistem = mode + instruksi khusus profile
	let sistem = (MODES.find((m) => m.key === mode) ?? MODES[0]).prompt;
	const [pf] = await sql`select instruksi from profil where nama = ${profil}`;
	if (pf?.instruksi?.trim()) {
		sistem += `\n\nInstruksi khusus untuk profile "${profil}" (selalu ikuti):\n${pf.instruksi.trim()}`;
	}

	const ac = new AbortController();
	request.signal?.addEventListener('abort', () => ac.abort());
	const upstream = await fetch('https://api.deepseek.com/chat/completions', {
		method: 'POST',
		signal: ac.signal,
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
		},
		body: JSON.stringify({
			model: images.length
				? env.DEEPSEEK_VISION_MODEL || 'deepseek-flash'
				: env.DEEPSEEK_MODEL || 'deepseek-flash',
			messages: [{ role: 'system', content: sistem }, ...riwayat],
			stream: true
		})
	});
	if (!upstream.ok || !upstream.body) {
		const t = await upstream.text().catch(() => '');
		return gagal(`DeepSeek ${upstream.status}: ${t.slice(0, 300)}`, 502);
	}

	let id = sesiId;
	const baru = !id;
	if (baru) {
		const judul = pesan.split('\n')[0].slice(0, 50);
		const [row] = await sql`insert into sesi (judul, profil) values (${judul}, ${profil}) returning id`;
		id = row.id;
	}

	// Gambar tidak disimpan ke database, hanya penanda di teks riwayat
	const tersimpan =
		pesan?.trim() && images.length ? `[${images.length} gambar dilampirkan]\n${pesan}` : teks;

	async function simpan(jawaban) {
		if (gantiDari) await sql`delete from pesan where sesi_id = ${id} and id >= ${gantiDari}`;
		await sql`insert into pesan (sesi_id, role, isi) values (${id}, 'user', ${tersimpan}), (${id}, 'assistant', ${jawaban})`;
	}
	async function hapusSesiBaru() {
		if (!baru) return;
		try { await sql`delete from sesi where id = ${id}`; } catch {}
	}

	const enc = new TextEncoder();
	const dec = new TextDecoder();
	let dibatalkan = false;
	const stream = new ReadableStream({
		async start(controller) {
			let full = '';
			let buf = '';
			try {
				const reader = upstream.body.getReader();
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buf += dec.decode(value, { stream: true });
					const lines = buf.split('\n');
					buf = lines.pop();
					for (const line of lines) {
						if (!line.startsWith('data:')) continue;
						const data = line.slice(5).trim();
						if (!data || data === '[DONE]') continue;
						const delta = JSON.parse(data).choices?.[0]?.delta?.content;
						if (delta) {
							full += delta;
							if (!dibatalkan) controller.enqueue(enc.encode(delta));
						}
					}
				}
				if (!full) throw new Error('Jawaban kosong');
				// Simpan setelah jawaban lengkap, sebelum stream ditutup
				await simpan(full);
				controller.close();
			} catch (e) {
				if (dibatalkan) {
					// Pengguna menekan Stop: simpan jawaban sebagian kalau ada (upaya terbaik)
					try {
						if (full.trim()) await simpan(full);
						else await hapusSesiBaru();
					} catch {}
					return;
				}
				await hapusSesiBaru();
				controller.error(e);
			}
		},
		cancel() {
			dibatalkan = true;
			ac.abort();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store',
			'x-sesi-id': String(id)
		}
	});
}
