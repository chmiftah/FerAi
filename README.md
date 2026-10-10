# FerAi

> **FerdinAi (FerAi)** — Asisten Pintar & Teman Diskusi Coding AI bernuansa *Cozy Studio Matcha & Warm Honey*.

Aplikasi AI workspace privat berbasis SvelteKit untuk membantu developer menganalisis bug, mereview kode, berdiskusi ide arsitektur, dan mengelola multi-profil ruang kerja secara terorganisir.

## ✨ Fitur Utama

- 🐞 **Analisis & Fix Bug**: Pecahkan error dengan penjelasan solusi yang runut.
- 🔍 **Review & Rapikan Kode**: Audit dan rapikan kode agar bersih (*clean code*) dan aman.
- 🍵 **Multi-Profile & Persona**: Kelola profil ruang kerja terpisah dengan aturan prompt khusus.
- 📎 **Analisis Gambar & Dokumen**: Drag-and-drop tangkapan layar error untuk analisis langsung.
- 📊 **Markdown & GFM Table Support**: Render tabel markdown dan syntax highlighting kode yang rapi.
- 🔒 **Privat & Aman**: Dilengkapi autentikasi password workspace dan penyimpanan sesi database.

## 🚀 Memulai

### 1. Prasyarat
- Node.js 18+
- npm / pnpm

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (.env)
Salin `.env.example` menjadi `.env` lalu sesuaikan isinya:
```bash
cp .env.example .env
```

Isi konfigurasi berikut:
- `DEEPSEEK_API_KEY`: API Key dari DeepSeek.
- `DATABASE_URL`: URL PostgreSQL (contoh: Neon Postgres).
- `APP_PASSWORD`: Password untuk login ke workspace.
- `AUTH_SECRET`: Secret key untuk session cookie.

### 4. Menjalankan di Mode Development
```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173) (atau port yang tertera) di browser Anda.

---
Dibuat dengan ❤️ menggunakan SvelteKit & DeepSeek AI.
