<script>
	import { onMount, tick } from "svelte";
	import { MODES } from "$lib/modes.js";
	import { sorot } from "$lib/highlight.js";
	import { marked } from "marked";

	marked.setOptions({
		gfm: true,
		breaks: true,
	});

	const FENCE = "```";

	let { data } = $props();

	let sessions = $state([]);
	let current = $state(null);
	let messages = $state([]);
	let input = $state("");
	let busy = $state(false);
	let error = $state("");
	let box = $state();
	const ultimoUser = $derived(
		messages.findLastIndex((m) => m.role === "user"),
	);
	let images = $state([]);
	let fileInput = $state();
	let abort;
	let editing = $state(false);
	let instruksi = $state("");
	let dlg = $state();
	let profil = $state(data.aktif);
	let profiles = $state(data.profiles);
	let files = $state([]);
	let mode = $state("umum");
	let q = $state("");
	let results = $state(null);
	let timer;
	let dragging = $state(false);
	let sidebarOpen = $state(false);
	let copiedIndex = $state(null);
	let profileMenuOpen = $state(false);

	function toggleProfileMenu() {
		profileMenuOpen = !profileMenuOpen;
	}

	function closeProfileMenu() {
		profileMenuOpen = false;
	}

	function openProfileSwitcher() {
		if (typeof window !== "undefined" && window.innerWidth < 768) {
			sidebarOpen = true;
		}
		profileMenuOpen = true;
	}

	function handleKeydown(e) {
		if (e.key === "Escape" && profileMenuOpen) {
			profileMenuOpen = false;
		}
	}

	const AVATAR_PALETTES = [
		{ bg: "#d8ebd9", text: "#1e462c", border: "#b7dcb8" }, // Matcha mint
		{ bg: "#fef3c7", text: "#92400e", border: "#fde68a" }, // Warm honey
		{ bg: "#ffe4e6", text: "#9f1239", border: "#fecdd3" }, // Rose peach
		{ bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" }, // Soft lilac
		{ bg: "#f5f0e6", text: "#78350f", border: "#e6dcce" }, // Cream oat
		{ bg: "#e0f2fe", text: "#075985", border: "#bae6fd" }, // Sky breeze
		{ bg: "#fef9c3", text: "#854d0e", border: "#fef08a" }, // Lemon curd
	];

	function getAvatarStyle(name) {
		let hash = 0;
		for (let i = 0; i < (name || "").length; i++) {
			hash = (hash << 5) - hash + name.charCodeAt(i);
		}
		const p = AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
		return `background-color: ${p.bg}; color: ${p.text}; border-color: ${p.border};`;
	}

	function getInitials(name) {
		if (!name) return "AI";
		const parts = name.trim().split(/\s+/);
		if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	const starterPrompts = [
		{
			title: "🐞 Analisis & Fix Bug",
			desc: "Cari tahu akar masalah error dan berikan solusi perbaikan yang simpel.",
			mode: "bug",
			prompt: "Tolong bantu analisis error berikut dan temukan cara memperbaikinya:",
		},
		{
			title: "🔍 Review Kerapian Kode",
			desc: "Audit kode agar lebih rapi, aman, dan mudah dipahami.",
			mode: "review",
			prompt: "Tolong lakukan review untuk kode ini agar lebih rapi dan aman:",
		},
		{
			title: "🧪 Buat Unit Tests",
			desc: "Bikinkan skenario test otomatis lengkap untuk berbagai kondisi.",
			mode: "test",
			prompt: "Tolong buatkan unit test untuk fungsi kode berikut:",
		},
		{
			title: "💡 Ide Refaktor & Optimasi",
			desc: "Sederhanakan logika kode agar lebih clean dan efisien.",
			mode: "refactor",
			prompt: "Tolong refaktor potongan kode ini biar lebih simpel dan bersih:",
		},
	];

	async function loadSessions() {
		const res = await fetch("/api/sessions");
		if (res.ok) sessions = await res.json();
	}

	async function openSession(id) {
		const res = await fetch(`/api/sessions/${id}`);
		if (!res.ok) return;
		current = id;
		editing = false;
		messages = await res.json();
		error = "";
		sidebarOpen = false;
		scrollDown();
	}

	async function kelolaProfil(method, body) {
		if (busy) return;
		const res = await fetch("/api/profiles", {
			method,
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		const j = await res.json().catch(() => ({}));
		if (!res.ok) {
			error = j.error || `HTTP ${res.status}`;
			return;
		}
		error = "";
		profiles = j.profiles;
		if (j.aktif !== profil) {
			profil = j.aktif;
			if (method !== "PATCH") {
				newChat();
				q = "";
				results = null;
			}
		}
		await loadSessions();
	}

	function tambahProfil() {
		profileMenuOpen = false;
		const nama = prompt("Nama profile baru:");
		if (nama?.trim()) kelolaProfil("POST", { nama });
	}

	function ubahNamaProfil() {
		profileMenuOpen = false;
		const baru = prompt(`Ganti nama profile "${profil}" menjadi:`, profil);
		if (baru?.trim() && baru.trim() !== profil)
			kelolaProfil("PATCH", { nama: profil, baru });
	}

	function hapusProfil() {
		profileMenuOpen = false;
		if (
			!confirm(
				`Hapus profile "${profil}" beserta SEMUA obrolannya? Tindakan ini tidak bisa dibatalkan.`,
			)
		)
			return;
		kelolaProfil("DELETE", { nama: profil });
	}

	async function gantiProfil(nama) {
		profileMenuOpen = false;
		if (nama === profil || busy) return;
		const res = await fetch("/api/profile", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ nama }),
		});
		if (!res.ok) {
			error = "Gagal ganti profile";
			return;
		}
		profil = nama;
		newChat();
		q = "";
		results = null;
		await loadSessions();
	}

	function newChat() {
		current = null;
		editing = false;
		messages = [];
		error = "";
		sidebarOpen = false;
	}

	async function remove(id, e) {
		e?.stopPropagation();
		if (!confirm("Hapus obrolan ini dari database?")) return;
		await fetch(`/api/sessions/${id}`, { method: "DELETE" });
		if (current === id) newChat();
		await loadSessions();
	}

	async function scrollDown() {
		await tick();
		if (box) box.scrollTop = box.scrollHeight;
	}

	function stop() {
		abort?.abort();
	}

	async function jalankan({ pesan, imgs = [], ulang = false, pulihkan }) {
		const cadangan = messages.map((m) => ({ ...m }));
		const currentSebelum = current;
		busy = true;
		error = "";
		if (ulang) {
			const i = messages.findLastIndex((m) => m.role === "user");
			const lama = messages[i];
			messages.splice(i);
			messages.push({
				role: "user",
				content: pesan ?? lama.content,
				images: imgs,
			});
		} else {
			messages.push({ role: "user", content: pesan, images: imgs });
		}
		messages.push({ role: "assistant", content: "" });
		const idx = messages.length - 1;
		scrollDown();
		abort = new AbortController();
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					sesiId: current,
					pesan,
					images: imgs,
					mode,
					ulang,
				}),
				signal: abort.signal,
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || `HTTP ${res.status}`);
			}
			const sid = res.headers.get("x-sesi-id");
			if (sid) current = Number(sid);
			const reader = res.body.getReader();
			const dec = new TextDecoder();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				messages[idx].content += dec.decode(value, { stream: true });
				scrollDown();
			}
		} catch (e) {
			if (e.name === "AbortError" && messages[idx]?.content) {
				// stopped gracefully
			} else {
				if (e.name !== "AbortError") error = e.message;
				messages = cadangan;
				current = currentSebelum;
				pulihkan?.();
			}
		} finally {
			busy = false;
			abort = undefined;
			await loadSessions();
		}
	}

	async function send() {
		const base =
			input.trim() ||
			(files.length
				? "Jelaskan file ini."
				: images.length
					? "Jelaskan gambar ini."
					: "");
		if (!base || busy) return;
		const text =
			base +
			files
				.map((f) => `\n\n${FENCE}${f.name}\n${f.text}\n${FENCE}`)
				.join("");
		const kirim = [...images];
		const kirimFiles = [...files];
		const sedangEdit = editing;
		input = "";
		images = [];
		files = [];
		editing = false;
		await jalankan({
			pesan: text,
			imgs: kirim,
			ulang: sedangEdit,
			pulihkan: () => {
				input = base;
				images = kirim;
				files = kirimFiles;
				editing = sedangEdit;
			},
		});
	}

	function cobaLagi() {
		if (busy || !current) return;
		jalankan({ imgs: messages[ultimoUser].images ?? [], ulang: true });
	}

	function editTerakhir() {
		if (busy || !current) return;
		const m = messages[ultimoUser];
		input = m.content;
		images = [...(m.images ?? [])];
		files = [];
		editing = true;
	}

	function batalEdit() {
		editing = false;
		input = "";
		images = [];
	}

	async function bukaInstruksi() {
		const res = await fetch("/api/profile/instruksi");
		if (res.ok) instruksi = (await res.json()).instruksi;
		dlg.showModal();
	}

	async function simpanInstruksi() {
		const res = await fetch("/api/profile/instruksi", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ instruksi }),
		});
		if (res.ok) dlg.close();
		else
			error =
				(await res.json().catch(() => ({}))).error ||
				"Gagal menyimpan instruksi";
	}

	function resize(file, max = 1600) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const url = URL.createObjectURL(file);
			img.onload = () => {
				const s = Math.min(1, max / Math.max(img.width, img.height));
				const c = document.createElement("canvas");
				c.width = Math.round(img.width * s);
				c.height = Math.round(img.height * s);
				const ctx = c.getContext("2d");
				ctx.fillStyle = "#fff";
				ctx.fillRect(0, 0, c.width, c.height);
				ctx.drawImage(img, 0, 0, c.width, c.height);
				URL.revokeObjectURL(url);
				resolve(c.toDataURL("image/jpeg", 0.85));
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error("Gagal membaca gambar"));
			};
			img.src = url;
		});
	}

	async function addFiles(daftar) {
		for (const f of [...daftar]) {
			if (f.type.startsWith("image/")) {
				if (images.length >= 4) {
					error = "Maksimal 4 gambar per pesan";
					continue;
				}
				try {
					images.push(await resize(f));
				} catch (e) {
					error = e.message;
				}
			} else {
				if (files.length >= 5) {
					error = "Maksimal 5 file per pesan";
					continue;
				}
				if (f.size > 100_000) {
					error = `${f.name} terlalu besar (maks 100 KB)`;
					continue;
				}
				const text = await f.text();
				if (text.includes("\u0000")) {
					error = `${f.name} bukan file teks`;
					continue;
				}
				files.push({ name: f.name, text });
			}
		}
	}

	function onPaste(e) {
		const fs = [...(e.clipboardData?.files ?? [])];
		if (fs.length) {
			e.preventDefault();
			addFiles(fs);
		}
	}

	async function addGithub() {
		const url = prompt(
			"URL file GitHub (contoh: https://github.com/user/repo/blob/main/src/file.js)",
		);
		if (!url) return;
		if (files.length >= 5) {
			error = "Maksimal 5 file per pesan";
			return;
		}
		const res = await fetch(
			"/api/github?url=" + encodeURIComponent(url.trim()),
		);
		const j = await res.json().catch(() => ({}));
		if (!res.ok) {
			error = j.error || `HTTP ${res.status}`;
			return;
		}
		files.push({ name: j.name, text: j.text });
	}

	function cari() {
		clearTimeout(timer);
		if (q.trim().length < 2) {
			results = null;
			return;
		}
		timer = setTimeout(async () => {
			const res = await fetch(
				"/api/search?q=" + encodeURIComponent(q.trim()),
			);
			if (res.ok) results = await res.json();
		}, 300);
	}

	function bukaHasil(id) {
		q = "";
		results = null;
		openSession(id);
	}

	function onKey(e) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function parse(text) {
		return text.split("```").map((p, i) => {
			if (i % 2 === 0) return { code: false, html: marked.parse(p) };
			const nl = p.indexOf("\n");
			return {
				code: true,
				lang: (nl === -1 ? p : p.slice(0, nl)).trim() || "text",
				text: nl === -1 ? "" : p.slice(nl + 1).replace(/\n$/, ""),
			};
		});
	}

	async function copyCode(t, id) {
		await navigator.clipboard.writeText(t);
		copiedIndex = id;
		setTimeout(() => {
			if (copiedIndex === id) copiedIndex = null;
		}, 2000);
	}

	function applyStarter(p) {
		mode = p.mode;
		input = p.prompt + "\n\n";
	}

	onMount(loadSessions);
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>FerdinAi — Cozy Matcha Studio</title>
</svelte:head>

<div class="workspace">
	<!-- Mobile Overlay Backdrop -->
	{#if sidebarOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="backdrop" onclick={() => (sidebarOpen = false)}></div>
	{/if}

	<!-- Aesthetic Matcha Sidebar -->
	<aside class:open={sidebarOpen}>
		<!-- Brand & Status -->
		<div class="brand-panel">
			<div class="brand-header">
				<div class="matcha-logo">
					<svg viewBox="0 0 34 34" fill="none" class="brand-svg">
						<rect width="34" height="34" rx="10" fill="#2d5a3f" />
						<path
							d="M17 7c-5.5 0-9.5 4.3-9.5 9.8 0 6.2 9.5 11.7 9.5 11.7s9.5-5.5 9.5-11.7C26.5 11.3 22.5 7 17 7zm0 6c2.8 0 5 2.2 5 5 0 3.5-5 7-5 7s-5-3.5-5-7c0-2.8 2.2-5 5-5z"
							fill="#fef3c7"
						/>
					</svg>
				</div>
				<div class="brand-info">
					<div class="brand-title">FERDINAI</div>
					<div class="brand-badge">
						<span class="matcha-dot"></span>
						<span>MATCHA STUDIO • SIAP</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Single Active Profile Card & Switcher Popover -->
		<div class="active-profile-section">
			<div class="active-profile-header">
				<div class="active-profile-tag-group">
					<span class="active-profile-dot"></span>
					<span class="active-profile-label">PROFILE AKTIF</span>
				</div>
				<button
					class="profile-switch-btn"
					onclick={toggleProfileMenu}
					title="Ganti Profile Aktif"
					aria-label="Ganti Profile Aktif"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
					>
						<polyline points="16 3 21 3 21 8" />
						<line x1="4" y1="20" x2="21" y2="3" />
						<polyline points="21 16 21 21 16 21" />
						<line x1="15" y1="15" x2="21" y2="21" />
						<line x1="4" y1="4" x2="9" y2="9" />
					</svg>
					<span>Ganti</span>
				</button>
			</div>

			<!-- Clickable Active Profile Card -->
			<button
				class="active-profile-card"
				class:open={profileMenuOpen}
				onclick={toggleProfileMenu}
				title={`Profile aktif: ${profil}. Klik untuk ganti profile.`}
				aria-label={`Profile aktif ${profil}`}
			>
				<div
					class="active-avatar-circle"
					style={getAvatarStyle(profil)}
				>
					<span class="active-avatar-text">{getInitials(profil)}</span
					>
					<span class="active-avatar-badge">✓</span>
				</div>
				<div class="active-profile-meta">
					<span class="active-profile-name">{profil}</span>
					<span class="active-profile-sub">Pilih / Ganti Profile</span
					>
				</div>
				<div class="active-chevron" class:rotated={profileMenuOpen}>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</div>
			</button>

			<!-- Quick Tool Actions for Active Profile -->
			<div class="active-profile-quick-actions">
				<button
					class="active-quick-btn"
					onclick={bukaInstruksi}
					title="Aturan & Instruksi AI Profile ini"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M12 20h9" />
						<path
							d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
						/>
					</svg>
					<span>Instruksi</span>
				</button>
				<button
					class="active-quick-btn"
					onclick={ubahNamaProfil}
					title="Ganti Nama Profile"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
						/>
						<path
							d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
						/>
					</svg>
					<span>Rename</span>
				</button>
				{#if profiles.length > 1}
					<button
						class="active-quick-btn danger"
						onclick={hapusProfil}
						title="Hapus Profile Ini"
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polyline points="3 6 5 6 21 6" />
							<path
								d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
							/>
						</svg>
						<span>Hapus</span>
					</button>
				{/if}
			</div>

			<!-- Profile Switcher Dropdown Popover -->
			{#if profileMenuOpen}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="profile-switcher-backdrop"
					onclick={closeProfileMenu}
				></div>
				<div
					class="profile-switcher-popover"
					role="dialog"
					aria-label="Pilih Profile"
				>
					<div class="popover-header">
						<div class="popover-title-row">
							<span class="popover-title">PILIH PROFILE</span>
							<span class="popover-counter"
								>{profiles.length} profile</span
							>
						</div>
						<button
							class="popover-close-btn"
							onclick={closeProfileMenu}
							aria-label="Tutup menu">✕</button
						>
					</div>

					<div class="popover-profile-list">
						{#each profiles as nama}
							<button
								class="popover-profile-item"
								class:selected={nama === profil}
								onclick={() => gantiProfil(nama)}
								title={`Ganti ke profile ${nama}`}
							>
								<div
									class="popover-item-avatar"
									style={getAvatarStyle(nama)}
								>
									<span>{getInitials(nama)}</span>
								</div>
								<div class="popover-item-info">
									<span class="popover-item-name">{nama}</span
									>
									{#if nama === profil}
										<span class="popover-item-status"
											>Sedang Aktif</span
										>
									{/if}
								</div>
								{#if nama === profil}
									<span class="popover-item-check">✓</span>
								{/if}
							</button>
						{/each}
					</div>

					<div class="popover-footer">
						<button class="popover-add-btn" onclick={tambahProfil}>
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
							>
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							<span>Tambah Profile Baru</span>
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Initiate New Chat Button -->
		<button class="new-chat-btn" onclick={newChat}>
			<span class="plus-icon">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
				>
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</span>
			<span class="btn-caption">Obrolan Baru ✨</span>
			<span class="shortcut-tag">⌘N</span>
		</button>

		<!-- Search Bar -->
		<div class="search-box">
			<span class="search-icon">
				<svg
					width="13"
					height="13"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
			</span>
			<input
				class="matcha-search"
				type="search"
				placeholder="Cari obrolan..."
				bind:value={q}
				oninput={cari}
			/>
			{#if q}
				<button
					class="clear-search"
					onclick={() => {
						q = "";
						results = null;
					}}>×</button
				>
			{/if}
		</div>

		<!-- Session History List -->
		<div class="session-feed">
			{#if results}
				<div class="list-heading">
					// HASIL PENCARIAN ({results.length})
				</div>
				{#each results as r (r.id)}
					<button
						class="search-hit-card"
						onclick={() => bukaHasil(r.id)}
					>
						<div class="hit-title">{r.judul}</div>
						<div class="hit-snippet">{r.cuplikan}</div>
					</button>
				{:else}
					<div class="empty-state-list">
						<span>Tidak ada percakapan cocok</span>
					</div>
				{/each}
			{:else}
				<div class="list-heading">RIWAYAT PERCAKAPAN</div>
				{#each sessions as s (s.id)}
					<div class="session-item" class:active={s.id === current}>
						<button
							class="session-link"
							onclick={() => openSession(s.id)}
						>
							<span class="session-mark">
								<svg
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
									/>
								</svg>
							</span>
							<span class="session-title-text">{s.judul}</span>
						</button>
						<button
							class="delete-btn"
							onclick={(e) => remove(s.id, e)}
							title="Hapus Obrolan"
							aria-label="Hapus Obrolan"
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
				{:else}
					<div class="empty-state-list">
						<span>Belum ada riwayat sesi</span>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Sidebar Status Bar -->
		<div class="sidebar-footer">
			<div class="core-telemetry">
				<span class="honey-badge-dot"></span>
				<span>FERDINAI • STUDIO MATCHA</span>
			</div>
			<span class="latency-pill">v2.4</span>
		</div>
	</aside>

	<!-- Main Chat Area -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<main
		class:dragging
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={(e) => {
			e.preventDefault();
			dragging = false;
			addFiles(e.dataTransfer.files);
		}}
	>
		<!-- Top Application HUD -->
		<header class="app-header">
			<div class="header-left">
				<button
					class="mobile-toggle"
					onclick={() => (sidebarOpen = !sidebarOpen)}
					aria-label="Menu"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="3" y1="12" x2="21" y2="12" />
						<line x1="3" y1="6" x2="21" y2="6" />
						<line x1="3" y1="18" x2="21" y2="18" />
					</svg>
				</button>
				<div class="active-context-hud">
					<span class="context-tag"
						>PROFILE: <strong class="matcha-bold">{profil}</strong
						></span
					>
					<span class="hud-divider">/</span>
					<span class="context-tag"
						>MODE: <strong class="honey-bold"
							>{MODES.find((m) => m.key === mode)?.label}</strong
						></span
					>
				</div>
			</div>
			<div class="header-right">
				<!-- Clean Active Profile Pill in Header HUD -->
				<button
					class="header-profile-pill"
					onclick={openProfileSwitcher}
					title="Klik untuk ganti profile aktif"
				>
					<span
						class="header-pill-avatar"
						style={getAvatarStyle(profil)}
					>
						{getInitials(profil)}
					</span>
					<span class="header-pill-name">{profil}</span>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</button>

				{#if busy}
					<div class="status-indicator busy-text">
						<span class="spinner-ring"></span>
						<span>Menulis...</span>
					</div>
				{:else}
					<div class="status-indicator ready-text">
						<span class="ready-dot"></span>
						<span>SIAP BEKERJA ✨</span>
					</div>
				{/if}
			</div>
		</header>

		<!-- Drag-and-drop HUD Notice -->
		{#if dragging}
			<div class="drop-overlay">
				<div class="drop-modal">
					<div class="drop-icon">
						<svg
							width="36"
							height="36"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#2d5a3f"
							stroke-width="2"
						>
							<path
								d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
							/>
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
					</div>
					<h3>Lepaskan File atau Screenshot di Sini 🌿</h3>
					<p>
						FerdinAi akan langsung menganalisis filemu dengan
						teliti.
					</p>
				</div>
			</div>
		{/if}

		<!-- Chat Messages Log -->
		<div class="chat-viewport" bind:this={box}>
			{#if messages.length === 0}
				<!-- Clean Warm Matcha Welcome Console -->
				<div class="welcome-container">
					<div class="hero-core">
						<svg
							width="48"
							height="48"
							viewBox="0 0 44 44"
							fill="none"
						>
							<rect
								width="44"
								height="44"
								rx="14"
								fill="#2d5a3f"
							/>
							<path
								d="M22 10c-7 0-12 5.5-12 12.5 0 8 12 15 12 15s12-7 12-15C34 15.5 29 10 22 10zm0 7.5c3.6 0 6.5 2.8 6.5 6.5 0 4.5-6.5 9-6.5 9s-6.5-4.5-6.5-9c0-3.7 2.9-6.5 6.5-6.5z"
								fill="#fef3c7"
							/>
						</svg>
					</div>

					<h2 class="hero-title">
						Halo! Selamat Datang di FerdinAi ✨
					</h2>
					<p class="hero-desc">
						Teman asisten AI coding yang nyaman dan cerdas. Tanyakan
						kode, diskusikan logika, atau cari solusi bug dengan
						tenang 🍵🌿
					</p>

					<!-- Quick Starter Prompts -->
					<div class="starter-grid">
						{#each starterPrompts as starter}
							<button
								class="starter-card"
								onclick={() => applyStarter(starter)}
							>
								<div class="starter-badge">{starter.title}</div>
								<div class="starter-desc">{starter.desc}</div>
								<div class="starter-action">
									<span>PILIH TUGAS</span>
									<svg
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<line x1="5" y1="12" x2="19" y2="12" />
										<polyline points="12 5 19 12 12 19" />
									</svg>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<div class="messages-container">
					{#each messages as m, i}
						<div class="message-card {m.role}">
							<div class="message-meta">
								<div class="sender-avatar {m.role}">
									{#if m.role === "assistant"}
										<svg
											width="13"
											height="13"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
										>
											<polygon
												points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"
											/>
											<circle cx="12" cy="12" r="3" />
										</svg>
									{:else}
										<svg
											width="13"
											height="13"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
										>
											<path
												d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
											/>
											<circle cx="12" cy="7" r="4" />
										</svg>
									{/if}
								</div>
								<span class="sender-name">
									{m.role === "assistant"
										? "FERDIN AI 🌿"
										: "KAMU"}
								</span>
							</div>

							<!-- Image attachments in message -->
							{#if m.images?.length}
								<div class="message-attachments">
									{#each m.images as src}
										<div class="img-preview-box">
											<img {src} alt="lampiran" />
										</div>
									{/each}
								</div>
							{/if}

							<!-- Message Body -->
							<div class="message-content">
								{#each parse(m.content) as p, codeIdx}
									{#if p.code}
										<div class="code-terminal">
											<div class="code-header">
												<div class="code-lang-tag">
													<span class="code-badge-dot"
													></span>
													<span
														>{p.lang.toUpperCase()}</span
													>
												</div>
												<button
													class="copy-code-btn"
													class:copied={copiedIndex ===
														`${i}-${codeIdx}`}
													onclick={() =>
														copyCode(
															p.text,
															`${i}-${codeIdx}`,
														)}
												>
													{#if copiedIndex === `${i}-${codeIdx}`}
														<svg
															width="12"
															height="12"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2.5"
														>
															<polyline
																points="20 6 9 17 4 12"
															/>
														</svg>
														<span>TERSALIN!</span>
													{:else}
														<svg
															width="12"
															height="12"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
														>
															<rect
																x="9"
																y="9"
																width="13"
																height="13"
																rx="2"
																ry="2"
															/>
															<path
																d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
															/>
														</svg>
														<span>SALIN KODE</span>
													{/if}
												</button>
											</div>
											<pre class="code-body"><code
													class="hljs"
													>{@html sorot(
														p.text,
														p.lang,
													)}</code
												></pre>
										</div>
									{:else if p.html}
										<div class="prose-content">
											{@html p.html}
										</div>
									{/if}
								{/each}
							</div>

							<!-- Action Buttons -->
							{#if !busy && current}
								{#if m.role === "assistant" && i === messages.length - 1}
									<div class="message-action-row">
										<button
											class="action-chip"
											onclick={cobaLagi}
										>
											<svg
												width="12"
												height="12"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<polyline
													points="1 4 1 10 7 10"
												/>
												<path
													d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
												/>
											</svg>
											<span>Coba Lagi ↺</span>
										</button>
									</div>
								{:else if m.role === "user" && i === ultimoUser}
									<div class="message-action-row">
										<button
											class="action-chip"
											onclick={editTerakhir}
										>
											<svg
												width="12"
												height="12"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<path d="M12 20h9" />
												<path
													d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
												/>
											</svg>
											<span>Edit Pesan</span>
										</button>
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Error Message Banner -->
		{#if error}
			<div class="alert-banner">
				<div class="alert-content">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
					<span>{error}</span>
				</div>
				<button class="dismiss-alert" onclick={() => (error = "")}
					>✕</button
				>
			</div>
		{/if}

		<!-- Editing Warning Notice -->
		{#if editing}
			<div class="edit-mode-strip">
				<span class="edit-icon">✎</span>
				<span
					>Mode Edit: Mengubah pesan terakhir. Jawaban sebelumnya akan
					diganti.</span
				>
				<button class="cancel-edit-btn" onclick={batalEdit}
					>Batal</button
				>
			</div>
		{/if}

		<!-- Input & Controls Dock -->
		<div class="input-dock">
			<!-- Mode Selector Strip -->
			<div class="mode-bar">
				<div class="mode-scroll">
					{#each MODES as m}
						<button
							class="mode-pill"
							class:active={mode === m.key}
							onclick={() => (mode = m.key)}
						>
							<span>{m.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Attached Files & Images Queue -->
			{#if files.length || images.length}
				<div class="staging-queue">
					{#each files as f, i}
						<div class="file-stage-chip">
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
								/>
								<polyline points="13 2 13 9 20 9" />
							</svg>
							<span class="stage-filename">{f.name}</span>
							<button
								class="remove-stage"
								onclick={() => files.splice(i, 1)}
								aria-label="Hapus file">×</button
							>
						</div>
					{/each}

					{#each images as src, i}
						<div class="image-stage-box">
							<img {src} alt="lampiran" />
							<button
								class="remove-stage img-remove"
								onclick={() => images.splice(i, 1)}
								aria-label="Hapus gambar">×</button
							>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Textarea & Action Buttons Console -->
			<div class="console-box">
				<div class="console-tools">
					<button
						class="icon-tool"
						onclick={() => fileInput.click()}
						title="Lampirkan File / Screenshot"
						aria-label="Lampirkan File"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
							/>
						</svg>
					</button>
					<button
						class="icon-tool"
						onclick={addGithub}
						title="Ambil file langsung dari GitHub URL"
						aria-label="Ambil GitHub"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
							/>
						</svg>
					</button>
					<input
						type="file"
						multiple
						hidden
						bind:this={fileInput}
						onchange={(e) => {
							addFiles(e.currentTarget.files);
							e.currentTarget.value = "";
						}}
					/>
				</div>

				<textarea
					class="console-input"
					rows="3"
					bind:value={input}
					onkeydown={onKey}
					onpaste={onPaste}
					placeholder="Tanyakan kode, jelaskan error, tempel log, atau paste screenshot... (Enter kirim, Shift+Enter baris baru)"
				></textarea>

				<div class="console-actions">
					{#if busy}
						<button class="matcha-btn stop-btn" onclick={stop}>
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<rect
									x="6"
									y="6"
									width="12"
									height="12"
									rx="2"
								/>
							</svg>
							<span>Hentikan</span>
						</button>
					{:else}
						<button
							class="matcha-btn send-btn"
							onclick={send}
							disabled={!input.trim() &&
								!files.length &&
								!images.length}
						>
							<span>{editing ? "Perbarui" : "Kirim ✨"}</span>
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
							>
								<line x1="22" y1="2" x2="11" y2="13" />
								<polygon points="22 2 15 22 11 13 2 9 22 2" />
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Keyboard hints bottom strip -->
			<div class="dock-hints">
				<span>Tekan <strong>Enter</strong> kirim</span>
				<span class="hint-bullet">•</span>
				<span><strong>Shift + Enter</strong> baris baru</span>
				<span class="hint-bullet">•</span>
				<span>Dukungan paste gambar & drag file 🌿</span>
			</div>
		</div>
	</main>
</div>

<!-- Matcha Profile Custom Instruction Modal -->
<dialog bind:this={dlg} class="matcha-modal">
	<div class="modal-box">
		<div class="modal-header">
			<div class="modal-title-group">
				<div class="modal-accent-pill">ATURAN SISTEM AI</div>
				<h3>Instruksi Profile: "{profil}" 🌿</h3>
			</div>
			<button class="modal-close" onclick={() => dlg.close()}>✕</button>
		</div>

		<p class="modal-desc">
			Instruksi khusus yang otomatis disuntikkan ke dalam setiap
			percakapan pada profile ini. Misalnya preferensi stack (SvelteKit,
			Tailwind, Python), aturan clean code, atau gaya bahasa.
		</p>

		<div class="editor-wrapper">
			<textarea
				class="modal-textarea"
				rows="9"
				maxlength="4000"
				bind:value={instruksi}
				placeholder="Contoh: Stack proyek: SvelteKit 2 + Neon Postgres. Gunakan JavaScript standar. Jawab dengan ramah, terstruktur, dan kode yang langsung dapat disalin."
			></textarea>
		</div>

		<div class="modal-footer">
			<button class="ghost-btn" onclick={() => dlg.close()}>Batal</button>
			<button class="matcha-btn save-btn" onclick={simpanInstruksi}>
				<span>Simpan Instruksi ✨</span>
			</button>
		</div>
	</div>
</dialog>

<style>
	:global(body) {
		margin: 0;
		background: #f7f5ef;
		color: #1c1917;
		font-family:
			"Plus Jakarta Sans",
			system-ui,
			-apple-system,
			sans-serif;
		overflow: hidden;
	}

	:global(*) {
		box-sizing: border-box;
	}

	/* Layout Container */
	.workspace {
		display: grid;
		grid-template-columns: 280px 1fr;
		height: 100dvh;
		width: 100vw;
		position: relative;
		overflow: hidden;
		background: #f7f5ef;
	}

	/* ----------------- SIDEBAR ----------------- */
	aside {
		background: #fcfbfa;
		border-right: 1px solid #e7e2d7;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px;
		z-index: 20;
		overflow: hidden;
		position: relative;
	}

	.brand-panel {
		padding-bottom: 12px;
		border-bottom: 1px solid #e7e2d7;
	}

	.brand-header {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.matcha-logo {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.brand-svg {
		width: 100%;
		height: 100%;
	}

	.brand-title {
		font-family: "Outfit", sans-serif;
		font-size: 18px;
		font-weight: 800;
		letter-spacing: 0.05em;
		color: #1c1917;
		line-height: 1.1;
	}

	.brand-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: #2d5a3f;
		font-weight: 600;
		margin-top: 2px;
		letter-spacing: 0.04em;
	}

	.matcha-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #2d5a3f;
	}

	/* Single Active Profile Section & Switcher */
	.active-profile-section {
		background: #ffffff;
		border: 1px solid #e7e2d7;
		border-radius: 12px;
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		position: relative;
		box-shadow: 0 1px 3px rgba(45, 90, 63, 0.04);
	}

	.active-profile-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.active-profile-tag-group {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.active-profile-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #2d5a3f;
	}

	.active-profile-label {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		font-weight: 700;
		color: #2d5a3f;
		letter-spacing: 0.05em;
	}

	.profile-switch-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #f4f9f4;
		border: 1px solid #c2dec6;
		color: #2d5a3f;
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.profile-switch-btn:hover {
		background: #2d5a3f;
		color: #ffffff;
		border-color: #2d5a3f;
	}

	.active-profile-card {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		padding: 8px 10px;
		background: #faf8f5;
		border: 1px solid #e7e2d7;
		border-radius: 10px;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.active-profile-card:hover {
		background: #f5f1e8;
		border-color: #2d5a3f;
	}

	.active-profile-card.open {
		border-color: #2d5a3f;
		background: #ffffff;
		box-shadow: 0 0 0 2px #d8ebd9;
	}

	.active-avatar-circle {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 1.5px solid transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		font-family: "JetBrains Mono", monospace;
		font-size: 12px;
		font-weight: 700;
		flex-shrink: 0;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.active-avatar-text {
		line-height: 1;
	}

	.active-avatar-badge {
		position: absolute;
		bottom: -2px;
		right: -2px;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: #2d5a3f;
		color: #ffffff;
		border: 1.5px solid #ffffff;
		font-size: 8px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.active-profile-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.active-profile-name {
		font-size: 13px;
		font-weight: 700;
		color: #1c1917;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.active-profile-sub {
		font-size: 10px;
		color: #78716c;
		margin-top: 1px;
	}

	.active-chevron {
		color: #78716c;
		display: flex;
		align-items: center;
		transition:
			transform 0.2s ease,
			color 0.15s ease;
		flex-shrink: 0;
	}

	.active-chevron.rotated {
		transform: rotate(180deg);
		color: #2d5a3f;
	}

	.active-profile-quick-actions {
		display: flex;
		align-items: center;
		gap: 5px;
		padding-top: 6px;
		border-top: 1px solid #f2ede4;
	}

	.active-quick-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 4px 6px;
		border-radius: 6px;
		background: #faf8f5;
		border: 1px solid #e7e2d7;
		color: #57534e;
		font-size: 10.5px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.active-quick-btn:hover {
		background: #ffffff;
		border-color: #2d5a3f;
		color: #2d5a3f;
	}

	.active-quick-btn.danger:hover {
		background: #fef2f2;
		border-color: #fca5a5;
		color: #dc2626;
	}

	/* Profile Switcher Popover & Backdrop */
	.profile-switcher-backdrop {
		position: fixed;
		inset: 0;
		z-index: 990;
		background: rgba(28, 25, 23, 0.12);
	}

	.profile-switcher-popover {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		z-index: 995;
		background: #ffffff;
		border: 1px solid #d5cec2;
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(28, 25, 23, 0.12);
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.popover-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 6px;
		border-bottom: 1px solid #f2ede4;
	}

	.popover-title-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.popover-title {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		font-weight: 700;
		color: #2d5a3f;
		letter-spacing: 0.05em;
	}

	.popover-counter {
		font-family: "JetBrains Mono", monospace;
		font-size: 9px;
		color: #78716c;
		background: #f7f5ef;
		padding: 1px 5px;
		border-radius: 4px;
	}

	.popover-close-btn {
		background: none;
		border: none;
		color: #78716c;
		cursor: pointer;
		font-size: 11px;
		padding: 2px 5px;
		border-radius: 4px;
		transition: all 0.1s ease;
	}

	.popover-close-btn:hover {
		background: #f7f5ef;
		color: #1c1917;
	}

	.popover-profile-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 180px;
		overflow-y: auto;
	}

	.popover-profile-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		cursor: pointer;
		text-align: left;
		transition: all 0.12s ease;
	}

	.popover-profile-item:hover {
		background: #f7f5ef;
		border-color: #e7e2d7;
	}

	.popover-profile-item.selected {
		background: #eaf3eb;
		border-color: #b7dcb8;
	}

	.popover-item-avatar {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		font-weight: 700;
		border: 1px solid transparent;
		flex-shrink: 0;
	}

	.popover-item-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.popover-item-name {
		font-size: 12px;
		font-weight: 600;
		color: #1c1917;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.popover-item-status {
		font-size: 9px;
		color: #2d5a3f;
		font-weight: 600;
	}

	.popover-item-check {
		font-size: 13px;
		font-weight: 800;
		color: #2d5a3f;
		margin-left: auto;
	}

	.popover-footer {
		padding-top: 6px;
		border-top: 1px solid #f2ede4;
	}

	.popover-add-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 6px 8px;
		border-radius: 8px;
		background: #faf8f5;
		border: 1px dashed #c4bcad;
		color: #2d5a3f;
		font-family: "Outfit", sans-serif;
		font-size: 11.5px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.popover-add-btn:hover {
		background: #eaf3eb;
		border-color: #2d5a3f;
		border-style: solid;
	}

	/* Header HUD Active Profile Pill */
	.header-profile-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 9px 3px 4px;
		background: #ffffff;
		border: 1px solid #e7e2d7;
		border-radius: 18px;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-right: 8px;
	}

	.header-profile-pill:hover {
		border-color: #2d5a3f;
		background: #faf8f5;
	}

	.header-pill-avatar {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		font-family: "JetBrains Mono", monospace;
		font-size: 9px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid transparent;
		line-height: 1;
	}

	.header-pill-name {
		font-size: 11.5px;
		font-weight: 600;
		color: #1c1917;
		max-width: 90px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.header-profile-pill svg {
		color: #78716c;
	}

	/* New Chat Button */
	.new-chat-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: #2d5a3f;
		border: 1px solid #2d5a3f;
		border-radius: 10px;
		color: #ffffff;
		font-family: "Outfit", sans-serif;
		font-size: 12.5px;
		font-weight: 700;
		letter-spacing: 0.03em;
		cursor: pointer;
		transition:
			background 0.15s ease,
			transform 0.15s ease;
		box-shadow: 0 1px 3px rgba(45, 90, 63, 0.15);
	}

	.new-chat-btn:hover {
		background: #234933;
		border-color: #234933;
		transform: translateY(-1px);
	}

	.plus-icon {
		display: flex;
		align-items: center;
	}

	.btn-caption {
		flex: 1;
		text-align: left;
		margin-left: 8px;
	}

	.shortcut-tag {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		background: #fef3c7;
		border: 1px solid #fde68a;
		border-radius: 4px;
		padding: 1px 4px;
		color: #92400e;
		font-weight: 700;
	}

	/* Search */
	.search-box {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 9px;
		color: #a8a29e;
		pointer-events: none;
		display: flex;
		align-items: center;
	}

	.matcha-search {
		width: 100%;
		padding: 8px 26px 8px 28px;
		background: #ffffff;
		border: 1px solid #e7e2d7;
		border-radius: 8px;
		color: #1c1917;
		font-size: 12px;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.matcha-search:focus {
		border-color: #2d5a3f;
	}

	.clear-search {
		position: absolute;
		right: 6px;
		background: none;
		border: none;
		color: #a8a29e;
		font-size: 13px;
		cursor: pointer;
		padding: 3px;
	}

	/* Session Feed */
	.session-feed {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding-right: 2px;
	}

	.session-feed::-webkit-scrollbar {
		width: 4px;
	}
	.session-feed::-webkit-scrollbar-thumb {
		background: #d5cec2;
		border-radius: 4px;
	}

	.list-heading {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		letter-spacing: 0.06em;
		color: #78716c;
		padding: 6px 4px 3px;
	}

	.session-item {
		display: flex;
		align-items: center;
		border-radius: 8px;
		transition: all 0.15s ease;
		border: 1px solid #e7e2d7;
		background: #ffffff;
	}

	.session-item:hover {
		background: #f7f5ef;
		border-color: #d5cec2;
	}

	.session-item.active {
		background: #eaf3eb;
		border-color: #2d5a3f;
		border-left: 3.5px solid #2d5a3f;
	}

	.session-link {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 9px;
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		text-align: left;
		min-width: 0;
	}

	.session-mark {
		color: #a8a29e;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.session-item.active .session-mark {
		color: #2d5a3f;
	}

	.session-title-text {
		font-size: 12.5px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #44403c;
	}

	.session-item.active .session-title-text {
		color: #1c1917;
		font-weight: 600;
	}

	.delete-btn {
		background: none;
		border: none;
		color: #a8a29e;
		padding: 6px 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		opacity: 0;
		transition:
			opacity 0.15s ease,
			color 0.15s ease;
	}

	.session-item:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		color: #dc2626;
	}

	/* Search Hits */
	.search-hit-card {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 7px 9px;
		border-radius: 8px;
		background: #ffffff;
		border: 1px solid #e7e2d7;
		cursor: pointer;
		text-align: left;
		color: inherit;
		transition: all 0.15s ease;
	}

	.search-hit-card:hover {
		background: #eaf3eb;
		border-color: #2d5a3f;
	}

	.hit-title {
		font-size: 12px;
		font-weight: 600;
		color: #2d5a3f;
	}

	.hit-snippet {
		font-size: 11px;
		color: #78716c;
		line-height: 1.3;
		overflow-wrap: anywhere;
	}

	.empty-state-list {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 20px 8px;
		color: #a8a29e;
		font-size: 11px;
		text-align: center;
	}

	.sidebar-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 10px;
		border-top: 1px solid #e7e2d7;
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: #78716c;
	}

	.core-telemetry {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.honey-badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #d97706;
	}

	.latency-pill {
		background: #ffffff;
		border: 1px solid #e7e2d7;
		color: #78716c;
		padding: 1px 5px;
		border-radius: 4px;
		font-size: 9px;
	}

	/* ----------------- MAIN WORKSPACE ----------------- */
	main {
		display: flex;
		flex-direction: column;
		min-width: 0;
		height: 100dvh;
		position: relative;
		z-index: 10;
		background: #f7f5ef;
	}

	/* App Header HUD */
	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 20px;
		background: #ffffff;
		border-bottom: 1px solid #e7e2d7;
		z-index: 15;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.mobile-toggle {
		display: none;
		background: #f7f5ef;
		border: 1px solid #e7e2d7;
		border-radius: 6px;
		color: #1c1917;
		padding: 6px;
		cursor: pointer;
	}

	.active-context-hud {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: #78716c;
	}

	.matcha-bold {
		color: #2d5a3f;
	}

	.honey-bold {
		color: #92400e;
	}

	.hud-divider {
		color: #d5cec2;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		letter-spacing: 0.04em;
	}

	.ready-text {
		color: #2d5a3f;
		font-weight: 600;
	}

	.ready-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #2d5a3f;
	}

	.busy-text {
		color: #d97706;
	}

	.spinner-ring {
		width: 10px;
		height: 10px;
		border: 2px solid #fde68a;
		border-top-color: #d97706;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Drag-and-drop HUD */
	.drop-overlay {
		position: absolute;
		inset: 0;
		background: rgba(247, 245, 239, 0.95);
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px dashed #2d5a3f;
	}

	.drop-modal {
		text-align: center;
		color: #1c1917;
	}

	.drop-icon {
		margin-bottom: 12px;
	}

	/* Chat Viewport */
	.chat-viewport {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		background: #f7f5ef;
	}

	.chat-viewport::-webkit-scrollbar {
		width: 6px;
	}
	.chat-viewport::-webkit-scrollbar-thumb {
		background: #d5cec2;
		border-radius: 4px;
	}

	/* Welcome Hero */
	.welcome-container {
		margin: auto;
		max-width: 780px;
		width: 100%;
		text-align: center;
		padding: 20px 0;
	}

	.hero-core {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
	}

	.hero-title {
		font-family: "Outfit", sans-serif;
		font-size: 28px;
		font-weight: 800;
		letter-spacing: 0.02em;
		margin: 0 0 8px;
		color: #1c1917;
	}

	.hero-desc {
		font-size: 14.5px;
		color: #57534e;
		max-width: 540px;
		margin: 0 auto 32px;
		line-height: 1.55;
	}

	.starter-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
		text-align: left;
	}

	.starter-card {
		background: #ffffff;
		border: 1px solid #e7e2d7;
		border-radius: 12px;
		padding: 14px 16px;
		cursor: pointer;
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 4px;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			transform 0.15s ease;
		box-shadow: 0 1px 3px rgba(45, 90, 63, 0.04);
	}

	.starter-card:hover {
		background: #faf8f5;
		border-color: #2d5a3f;
		transform: translateY(-1px);
	}

	.starter-badge {
		font-family: "Outfit", sans-serif;
		font-size: 14px;
		font-weight: 700;
		color: #2d5a3f;
	}

	.starter-desc {
		font-size: 12.5px;
		color: #57534e;
		line-height: 1.45;
		flex: 1;
	}

	.starter-action {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		font-weight: 600;
		color: #2d5a3f;
		margin-top: 8px;
		letter-spacing: 0.05em;
	}

	/* Message Log */
	.messages-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: 860px;
		width: 100%;
		margin: 0 auto;
	}

	.message-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		border-radius: 14px;
		border: 1px solid #e7e2d7;
		background: #ffffff;
		position: relative;
		box-shadow: 0 1px 3px rgba(45, 90, 63, 0.03);
	}

	.message-card.user {
		background: #fcfbfa;
		border-color: #e2ddd4;
	}

	.message-card.assistant {
		background: #ffffff;
		border-color: #e7e2d7;
	}

	.message-meta {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.sender-avatar {
		width: 24px;
		height: 24px;
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.sender-avatar.assistant {
		background: #2d5a3f;
		border: 1px solid #2d5a3f;
		color: #ffffff;
	}

	.sender-avatar.user {
		background: #f5efe6;
		border: 1px solid #e2ddd4;
		color: #78350f;
	}

	.sender-name {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: #57534e;
	}

	.message-attachments {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 6px 0;
	}

	.img-preview-box img {
		max-height: 200px;
		max-width: 100%;
		border-radius: 8px;
		border: 1px solid #e7e2d7;
	}

	.message-content {
		font-size: 14px;
		line-height: 1.6;
		color: #292524;
	}

	/* Clean Code Terminal */
	.code-terminal {
		margin: 10px 0;
		border-radius: 10px;
		background: #faf8f5;
		border: 1px solid #e7e2d7;
		overflow: hidden;
	}

	.code-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 12px;
		background: #f3eee4;
		border-bottom: 1px solid #e7e2d7;
	}

	.code-lang-tag {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: #2d5a3f;
		font-weight: 600;
	}

	.code-badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #2d5a3f;
	}

	.copy-code-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		background: #ffffff;
		border: 1px solid #d5cec2;
		border-radius: 5px;
		padding: 3px 8px;
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: #57534e;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.copy-code-btn:hover {
		color: #2d5a3f;
		border-color: #2d5a3f;
		background: #faf8f5;
	}

	.copy-code-btn.copied {
		color: #166534;
		border-color: #166534;
		background: #dcfce7;
	}

	.code-body {
		margin: 0;
		padding: 12px;
		overflow-x: auto;
		max-height: 480px;
		font-family: "JetBrains Mono", monospace;
		font-size: 13px;
		line-height: 1.5;
		background: #faf8f5;
	}

	.code-body::-webkit-scrollbar {
		height: 5px;
		width: 5px;
	}
	.code-body::-webkit-scrollbar-thumb {
		background: #d5cec2;
		border-radius: 4px;
	}

	/* Markdown Prose & Tables */
	.prose-content {
		font-size: 14px;
		line-height: 1.6;
		color: #292524;
		overflow-wrap: anywhere;
	}

	.prose-content :global(p) {
		margin: 0 0 10px;
	}
	.prose-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.prose-content :global(ul),
	.prose-content :global(ol) {
		margin: 8px 0;
		padding-left: 20px;
	}

	.prose-content :global(li) {
		margin: 3px 0;
	}

	.prose-content :global(strong) {
		font-weight: 700;
		color: #1c1917;
	}

	.prose-content :global(code) {
		font-family: "JetBrains Mono", monospace;
		font-size: 12px;
		background: #f5efe6;
		border: 1px solid #e7ded0;
		color: #2d5a3f;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.prose-content :global(blockquote) {
		margin: 8px 0;
		padding: 6px 14px;
		border-left: 3px solid #2d5a3f;
		background: #f7f5ef;
		color: #57534e;
	}

	/* Matcha Light Table Styling */
	.prose-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 12px 0;
		font-size: 13px;
		background: #ffffff;
		border: 1px solid #e7e2d7;
		border-radius: 8px;
		overflow: hidden;
		display: table;
	}

	.prose-content :global(thead) {
		background: #eaf3eb;
		border-bottom: 2px solid #e7e2d7;
	}

	.prose-content :global(th) {
		padding: 10px 14px;
		text-align: left;
		font-family: "Outfit", sans-serif;
		font-weight: 700;
		font-size: 12px;
		letter-spacing: 0.04em;
		color: #1e462c;
		border: 1px solid #e7e2d7;
		white-space: nowrap;
	}

	.prose-content :global(tbody tr) {
		border-bottom: 1px solid #e7e2d7;
		transition: background 0.1s ease;
	}

	.prose-content :global(tbody tr:nth-child(even)) {
		background: #faf9f6;
	}

	.prose-content :global(tbody tr:hover) {
		background: #f1f7f2;
	}

	.prose-content :global(td) {
		padding: 9px 14px;
		color: #44403c;
		border: 1px solid #e7e2d7;
		vertical-align: middle;
		line-height: 1.5;
	}

	.message-action-row {
		display: flex;
		gap: 8px;
		margin-top: 6px;
		padding-top: 6px;
		border-top: 1px solid #f7f5ef;
	}

	.action-chip {
		display: flex;
		align-items: center;
		gap: 5px;
		background: #faf8f5;
		border: 1px solid #e7e2d7;
		border-radius: 6px;
		padding: 4px 9px;
		color: #57534e;
		font-size: 11px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-chip:hover {
		color: #2d5a3f;
		border-color: #2d5a3f;
		background: #eaf3eb;
	}

	/* Alert Banners */
	.alert-banner {
		margin: 0 20px 8px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 14px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #b91c1c;
		font-size: 12px;
		font-family: "JetBrains Mono", monospace;
	}

	.alert-content {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.dismiss-alert {
		background: none;
		border: none;
		color: #b91c1c;
		cursor: pointer;
		padding: 4px;
	}

	.edit-mode-strip {
		margin: 0 20px 8px;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 14px;
		background: #fef3c7;
		border: 1px solid #fde68a;
		border-radius: 8px;
		color: #92400e;
		font-size: 12px;
	}

	.cancel-edit-btn {
		margin-left: auto;
		background: #ffffff;
		border: 1px solid #fde68a;
		color: #92400e;
		border-radius: 4px;
		padding: 3px 8px;
		font-size: 11px;
		cursor: pointer;
	}

	/* ----------------- INPUT DOCK ----------------- */
	.input-dock {
		padding: 10px 20px 14px;
		background: #ffffff;
		border-top: 1px solid #e7e2d7;
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 960px;
		width: 100%;
		margin: 0 auto;
	}

	.mode-bar {
		display: flex;
		align-items: center;
	}

	.mode-scroll {
		display: flex;
		gap: 5px;
		overflow-x: auto;
		padding-bottom: 2px;
	}

	.mode-scroll::-webkit-scrollbar {
		display: none;
	}

	.mode-pill {
		display: flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: 6px;
		background: #faf8f5;
		border: 1px solid #e7e2d7;
		color: #57534e;
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.mode-pill:hover {
		color: #2d5a3f;
		border-color: #2d5a3f;
	}

	.mode-pill.active {
		background: #2d5a3f;
		border-color: #2d5a3f;
		color: #ffffff;
		font-weight: 600;
	}

	/* Staging Queue */
	.staging-queue {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 4px 0;
	}

	.file-stage-chip {
		display: flex;
		align-items: center;
		gap: 6px;
		background: #faf8f5;
		border: 1px solid #e7e2d7;
		border-radius: 6px;
		padding: 3px 8px;
		font-size: 11px;
		color: #2d5a3f;
		font-family: "JetBrains Mono", monospace;
	}

	.stage-filename {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.remove-stage {
		background: none;
		border: none;
		color: #78716c;
		cursor: pointer;
		padding: 0 2px;
		font-size: 13px;
	}

	.remove-stage:hover {
		color: #dc2626;
	}

	.image-stage-box {
		position: relative;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid #e7e2d7;
	}

	.image-stage-box img {
		height: 44px;
		display: block;
	}

	.img-remove {
		position: absolute;
		top: 2px;
		right: 2px;
		background: #1c1917;
		color: #ffffff;
		border-radius: 50%;
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Console Box */
	.console-box {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		background: #ffffff;
		border: 1px solid #d5cec2;
		border-radius: 12px;
		padding: 8px 10px;
		transition: border-color 0.15s ease;
		box-shadow: 0 1px 3px rgba(45, 90, 63, 0.04);
	}

	.console-box:focus-within {
		border-color: #2d5a3f;
	}

	.console-tools {
		display: flex;
		gap: 3px;
		align-self: flex-end;
		margin-bottom: 2px;
	}

	.icon-tool {
		background: none;
		border: none;
		color: #78716c;
		padding: 6px;
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.icon-tool:hover {
		color: #2d5a3f;
		background: #eaf3eb;
	}

	.console-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: #1c1917;
		font-family: inherit;
		font-size: 13.5px;
		line-height: 1.5;
		resize: none;
		max-height: 180px;
		min-height: 48px;
		padding: 4px 0;
	}

	.console-input::placeholder {
		color: #a8a29e;
	}

	.console-actions {
		align-self: flex-end;
		margin-bottom: 2px;
	}

	.matcha-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		border-radius: 8px;
		padding: 8px 16px;
		font-family: "Outfit", sans-serif;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.03em;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.15s ease;
	}

	.send-btn {
		background: #2d5a3f;
		border-color: #2d5a3f;
		color: #ffffff;
		box-shadow: 0 1px 3px rgba(45, 90, 63, 0.2);
	}

	.send-btn:hover:not(:disabled) {
		background: #234933;
		border-color: #234933;
		transform: translateY(-1px);
	}

	.send-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		background: #e7e2d7;
		border-color: #e7e2d7;
		color: #a8a29e;
		box-shadow: none;
	}

	.stop-btn {
		background: #dc2626;
		border-color: #dc2626;
		color: #ffffff;
	}

	.stop-btn:hover {
		background: #b91c1c;
	}

	.dock-hints {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: #a8a29e;
	}

	.dock-hints strong {
		color: #57534e;
	}

	.hint-bullet {
		opacity: 0.4;
	}

	/* ----------------- MODAL DIALOG ----------------- */
	.matcha-modal {
		background: transparent;
		border: none;
		padding: 0;
		max-width: 560px;
		width: 92vw;
	}

	.matcha-modal::backdrop {
		background: rgba(28, 25, 23, 0.45);
	}

	.modal-box {
		background: #ffffff;
		border: 1px solid #e7e2d7;
		border-radius: 16px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		color: #1c1917;
		box-shadow: 0 10px 30px rgba(45, 90, 63, 0.1);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.modal-title-group h3 {
		margin: 4px 0 0;
		font-family: "Outfit", sans-serif;
		font-size: 18px;
		color: #1c1917;
	}

	.modal-accent-pill {
		display: inline-block;
		font-family: "JetBrains Mono", monospace;
		font-size: 9px;
		font-weight: 700;
		color: #1e462c;
		letter-spacing: 0.08em;
		background: #eaf3eb;
		border: 1px solid #b7dcb8;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.modal-close {
		background: none;
		border: none;
		color: #a8a29e;
		font-size: 16px;
		cursor: pointer;
		padding: 4px;
	}

	.modal-close:hover {
		color: #1c1917;
	}

	.modal-desc {
		margin: 0;
		font-size: 12.5px;
		color: #57534e;
		line-height: 1.5;
	}

	.editor-wrapper {
		border: 1px solid #d5cec2;
		border-radius: 10px;
		overflow: hidden;
		background: #faf8f5;
	}

	.modal-textarea {
		width: 100%;
		background: transparent;
		border: none;
		color: #1c1917;
		font-family: "JetBrains Mono", monospace;
		font-size: 12px;
		padding: 12px;
		outline: none;
		resize: vertical;
		line-height: 1.5;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 4px;
	}

	.ghost-btn {
		background: none;
		border: 1px solid #d5cec2;
		color: #57534e;
		border-radius: 8px;
		padding: 7px 14px;
		font-size: 12px;
		cursor: pointer;
	}

	.ghost-btn:hover {
		color: #1c1917;
		background: #f7f5ef;
	}

	.save-btn {
		background: #2d5a3f;
		border-color: #2d5a3f;
		color: #ffffff;
	}

	/* ----------------- RESPONSIVE ----------------- */
	@media (max-width: 860px) {
		.workspace {
			grid-template-columns: 1fr;
		}

		aside {
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			width: 270px;
			transform: translateX(-100%);
			transition: transform 0.2s ease;
			z-index: 100;
			box-shadow: 4px 0 16px rgba(45, 90, 63, 0.1);
		}

		aside.open {
			transform: translateX(0);
		}

		.backdrop {
			position: fixed;
			inset: 0;
			background: rgba(28, 25, 23, 0.4);
			z-index: 90;
		}

		.mobile-toggle {
			display: flex;
		}

		.starter-grid {
			grid-template-columns: 1fr;
		}

		.dock-hints {
			display: none;
		}
	}
</style>
