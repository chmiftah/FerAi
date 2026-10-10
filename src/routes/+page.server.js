import { daftarProfil, profilAktif } from '$lib/server/profil.js';

export async function load({ cookies }) {
	return { profiles: await daftarProfil(), aktif: await profilAktif(cookies) };
}
