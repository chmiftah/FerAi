<script>
	let { form } = $props();
	let showPassword = $state(false);
	let submitting = $state(false);
</script>

<svelte:head>
	<title>FedinAi — Asisten Coding & Workspace AI</title>
</svelte:head>

<div class="auth-wrapper">
	<div class="auth-shell">
		<!-- Left / Intro Panel: Penjelasan Aplikasi FedinAi -->
		<section class="intro-panel" aria-label="Tentang FedinAi">
			<div class="intro-badge">
				<span class="sparkle-icon">✨</span>
				<span>TEMAN DISKUSI & ASISTEN CODING AI</span>
			</div>

			<h1 class="intro-headline">
				Bantu selesaikan bug, rapikan kode, dan wujudkan ide aplikasimu.
			</h1>

			<p class="intro-desc">
				<strong>FedinAi</strong> adalah asisten pintar privat bernuansa <em>Cozy Studio</em>. Tempat aman dan nyaman untuk membedah error, konsultasi arsitektur kode, hingga brainstorming ide tanpa ribet.
			</p>

			<!-- 4 Highlight Kemampuan FedinAi -->
			<div class="feature-grid">
				<div class="feature-card">
					<div class="feature-bubble bubble-matcha">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
							<circle cx="12" cy="12" r="3" />
						</svg>
					</div>
					<div class="feature-text">
						<span class="feature-title">🐞 Analisis & Fix Bug</span>
						<p class="feature-sub">Pecahkan pesan error yang bikin pusing dengan penjelasan solusi yang runut.</p>
					</div>
				</div>

				<div class="feature-card">
					<div class="feature-bubble bubble-honey">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="16" y1="13" x2="8" y2="13" />
							<line x1="16" y1="17" x2="8" y2="17" />
							<polyline points="10 9 9 9 8 9" />
						</svg>
					</div>
					<div class="feature-text">
						<span class="feature-title">🔍 Review & Rapikan Kode</span>
						<p class="feature-sub">Bikin kodemu lebih bersih (*clean code*), aman, dan mudah dipahami.</p>
					</div>
				</div>

				<div class="feature-card">
					<div class="feature-bubble bubble-rose">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					</div>
					<div class="feature-text">
						<span class="feature-title">🍵 Multi-Profile & Persona</span>
						<p class="feature-sub">Ganti profil ruang kerja sesuai proyek, lengkap dengan instruksi AI kustom.</p>
					</div>
				</div>

				<div class="feature-card">
					<div class="feature-bubble bubble-lilac">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<polyline points="21 15 16 10 5 21" />
						</svg>
					</div>
					<div class="feature-text">
						<span class="feature-title">📎 Analisis Gambar Error</span>
						<p class="feature-sub">Tarik & lepas tangkapan layar error atau berkas untuk dianalisis langsung.</p>
					</div>
				</div>
			</div>

			<!-- Note Privasi & Keamanan -->
			<div class="intro-privacy-pill">
				<span class="privacy-icon">🔒</span>
				<span><strong>Privat & Lokal:</strong> Riwayat chat & kunci disimpan aman di komputermu.</span>
			</div>
		</section>

		<!-- Right Side: Login Box -->
		<div class="auth-container">
			<!-- Top Aesthetic Telemetry -->
			<div class="telemetry-bar">
				<span class="telemetry-item">
					<span class="status-dot"></span>
					WORKSPACE • SIAP
				</span>
				<span class="telemetry-item">SECURE ACCESS</span>
			</div>

			<!-- Card Content -->
			<div class="auth-card">
				<!-- Brand Section -->
				<div class="brand-section">
					<div class="logo-box">
						<svg class="logo-icon" viewBox="0 0 44 44" fill="none">
							<rect width="44" height="44" rx="14" fill="#2d5a3f" />
							<!-- Stylized minimal clean leaf & sparkle -->
							<path d="M22 10c-7 0-12 5.5-12 12.5 0 8 12 15 12 15s12-7 12-15C34 15.5 29 10 22 10zm0 7.5c3.6 0 6.5 2.8 6.5 6.5 0 4.5-6.5 9-6.5 9s-6.5-4.5-6.5-9c0-3.7 2.9-6.5 6.5-6.5z" fill="#fef3c7" />
						</svg>
					</div>
					<h2 class="brand-title">FEDINAI</h2>
					<p class="brand-subtitle">MASUK KE RUANG KERJA 🌿</p>
				</div>

				<!-- Form Section -->
				<form method="POST" onsubmit={() => (submitting = true)}>
					<div class="input-group">
						<label for="password-input" class="input-label">
							<span class="label-prefix">Password Akses</span>
							<span class="label-hint">Masukkan kode sandi</span>
						</label>
						<div class="input-wrapper">
							<span class="input-icon">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
									<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								</svg>
							</span>
							<input
								id="password-input"
								type={showPassword ? 'text' : 'password'}
								name="password"
								placeholder="Ketik password workspace..."
								required
								autocomplete="current-password"
							/>
							<button
								type="button"
								class="toggle-visibility"
								onclick={() => (showPassword = !showPassword)}
								title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
								tabindex="-1"
							>
								{#if showPassword}
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
										<line x1="1" y1="1" x2="23" y2="23" />
									</svg>
								{:else}
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
								{/if}
							</button>
						</div>
					</div>

					{#if form?.error}
						<div class="error-banner">
							<span class="error-icon">✕</span>
							<span class="error-msg">{form.error}</span>
						</div>
					{/if}

					<button type="submit" class="auth-btn" disabled={submitting}>
						<span class="btn-text">{submitting ? 'Membuka...' : 'Buka Workspace ✨'}</span>
						<span class="btn-arrow">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<line x1="5" y1="12" x2="19" y2="12" />
								<polyline points="12 5 19 12 12 19" />
							</svg>
						</span>
					</button>
				</form>

				<!-- Footer Security Info -->
				<div class="card-footer">
					<div class="footer-badge">
						<span class="honey-dot"></span>
						<span>LINGKUNGAN PRIVAT & AMAN</span>
					</div>
					<span class="footer-meta">v2.4</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f7f5ef;
		color: #1c1917;
		font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.auth-wrapper {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 36px 20px;
		background: #f7f5ef;
	}

	.auth-shell {
		width: 100%;
		max-width: 980px;
		display: grid;
		grid-template-columns: 1.18fr 0.82fr;
		gap: 42px;
		align-items: center;
	}

	/* Left Side Intro Panel */
	.intro-panel {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.intro-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 11px;
		background: #eaf3eb;
		border: 1px solid #b7dcb8;
		border-radius: 20px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		font-weight: 700;
		color: #2d5a3f;
		letter-spacing: 0.05em;
		width: fit-content;
	}

	.sparkle-icon {
		font-size: 12px;
	}

	.intro-headline {
		margin: 0;
		font-family: 'Outfit', sans-serif;
		font-size: 29px;
		font-weight: 800;
		line-height: 1.25;
		color: #1c1917;
		letter-spacing: -0.01em;
	}

	.intro-desc {
		margin: 0;
		font-size: 14px;
		line-height: 1.6;
		color: #57534e;
	}

	.intro-desc strong {
		color: #2d5a3f;
		font-weight: 700;
	}

	.intro-desc em {
		font-style: italic;
		color: #1c1917;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 4px;
	}

	.feature-card {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px;
		background: #ffffff;
		border: 1px solid #e7e2d7;
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(45, 90, 63, 0.03);
		transition: transform 0.15s ease, border-color 0.15s ease;
	}

	.feature-card:hover {
		transform: translateY(-1px);
		border-color: #2d5a3f;
	}

	.feature-bubble {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.bubble-matcha {
		background: #d8ebd9;
		color: #1e462c;
		border: 1px solid #b7dcb8;
	}

	.bubble-honey {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fde68a;
	}

	.bubble-rose {
		background: #ffe4e6;
		color: #9f1239;
		border: 1px solid #fecdd3;
	}

	.bubble-lilac {
		background: #ede9fe;
		color: #5b21b6;
		border: 1px solid #ddd6fe;
	}

	.feature-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.feature-title {
		font-size: 12.5px;
		font-weight: 700;
		color: #1c1917;
		margin-bottom: 2px;
	}

	.feature-sub {
		font-size: 11px;
		color: #78716c;
		line-height: 1.45;
		margin: 0;
	}

	.intro-privacy-pill {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 13px;
		background: #faf8f5;
		border: 1px solid #e7e2d7;
		border-radius: 10px;
		font-size: 11.5px;
		color: #57534e;
		margin-top: 4px;
	}

	.intro-privacy-pill strong {
		color: #1c1917;
	}

	.privacy-icon {
		font-size: 13px;
	}

	/* Right Side Auth Container */
	.auth-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.telemetry-bar {
		display: flex;
		justify-content: space-between;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: #78716c;
		letter-spacing: 0.05em;
		padding: 0 4px;
	}

	.telemetry-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #2d5a3f;
	}

	.auth-card {
		background: #ffffff;
		border: 1px solid #e7e2d7;
		border-radius: 18px;
		padding: 34px 28px;
		box-shadow: 0 2px 8px rgba(45, 90, 63, 0.05);
	}

	.brand-section {
		text-align: center;
		margin-bottom: 26px;
	}

	.logo-box {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
	}

	.logo-icon {
		width: 52px;
		height: 52px;
	}

	.brand-title {
		margin: 0;
		font-family: 'Outfit', sans-serif;
		font-size: 26px;
		font-weight: 800;
		letter-spacing: 0.05em;
		color: #1c1917;
	}

	.brand-subtitle {
		margin: 6px 0 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 10.5px;
		letter-spacing: 0.08em;
		color: #57534e;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.input-label {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
	}

	.label-prefix {
		color: #1c1917;
		font-weight: 600;
	}

	.label-hint {
		color: #78716c;
		font-size: 11px;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-icon {
		position: absolute;
		left: 12px;
		color: #a8a29e;
		display: flex;
		align-items: center;
		pointer-events: none;
	}

	input[type='password'],
	input[type='text'] {
		width: 100%;
		padding: 11px 40px 11px 38px;
		background: #faf9f6;
		border: 1px solid #d5cec2;
		border-radius: 10px;
		color: #1c1917;
		font-size: 13.5px;
		outline: none;
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	input:focus {
		border-color: #2d5a3f;
		background: #ffffff;
	}

	input::placeholder {
		color: #a8a29e;
		font-family: 'Plus Jakarta Sans', sans-serif;
	}

	.toggle-visibility {
		position: absolute;
		right: 10px;
		background: none;
		border: none;
		padding: 4px;
		color: #78716c;
		cursor: pointer;
		display: flex;
		align-items: center;
		border-radius: 4px;
	}

	.toggle-visibility:hover {
		color: #1c1917;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 10px;
		padding: 9px 12px;
		color: #b91c1c;
		font-size: 12px;
	}

	.error-icon {
		color: #dc2626;
		font-weight: 700;
	}

	.auth-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 12px 18px;
		border-radius: 10px;
		border: 1px solid #2d5a3f;
		background: #2d5a3f;
		color: #ffffff;
		font-family: 'Outfit', sans-serif;
		font-size: 13.5px;
		font-weight: 700;
		letter-spacing: 0.03em;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-top: 4px;
	}

	.auth-btn:hover:not(:disabled) {
		background: #234933;
		border-color: #234933;
		transform: translateY(-1px);
	}

	.auth-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.auth-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-arrow {
		display: flex;
		align-items: center;
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 22px;
		padding-top: 16px;
		border-top: 1px solid #f2ede4;
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: #78716c;
	}

	.footer-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #57534e;
	}

	.honey-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #d97706;
	}

	/* Responsive for Tablet & Mobile */
	@media (max-width: 860px) {
		.auth-shell {
			grid-template-columns: 1fr;
			max-width: 460px;
			gap: 28px;
		}

		.auth-container {
			order: 1;
		}

		.intro-panel {
			order: 2;
		}

		.intro-headline {
			font-size: 24px;
		}
	}

	@media (max-width: 500px) {
		.feature-grid {
			grid-template-columns: 1fr;
		}

		.auth-card {
			padding: 26px 20px;
		}
	}
</style>
