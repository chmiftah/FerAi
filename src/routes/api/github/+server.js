import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const MAKS = 100_000;

export async function GET({ url }) {
	const m = (url.searchParams.get('url') ?? '').match(
		/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:[?#].*)?$/
	);
	if (!m) {
		return json(
			{ error: 'Pakai URL file GitHub: https://github.com/user/repo/blob/cabang/path/file' },
			{ status: 400 }
		);
	}
	const [, owner, repo, ref, path] = m;
	const enc = encodeURIComponent;
	const api =
		`https://api.github.com/repos/${enc(owner)}/${enc(repo)}/contents/` +
		`${path.split('/').map(enc).join('/')}?ref=${enc(ref)}`;

	const res = await fetch(api, {
		headers: {
			accept: 'application/vnd.github.raw+json',
			'user-agent': 'chatbot-svelte',
			...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {})
		}
	});
	if (!res.ok) {
		const hint = res.status === 404 ? ' (file tidak ada, atau repo privat: set GITHUB_TOKEN)' : '';
		return json({ error: `GitHub ${res.status}${hint}` }, { status: 502 });
	}
	const text = await res.text();
	if (text.length > MAKS) return json({ error: 'File terlalu besar (maks 100 KB)' }, { status: 413 });
	if (text.includes('\u0000')) return json({ error: 'Bukan file teks' }, { status: 415 });
	return json({ name: path.split('/').pop(), text });
}
