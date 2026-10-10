import hljs from 'highlight.js/lib/core';
import 'highlight.js/styles/github.css';

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import diff from 'highlight.js/lib/languages/diff';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import ruby from 'highlight.js/lib/languages/ruby';
import ini from 'highlight.js/lib/languages/ini';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

const bahasaTerdaftar = {
	javascript, typescript, python, json, bash, css, xml, sql, java, go, rust, php,
	yaml, markdown, diff, c, cpp, csharp, ruby, ini, dockerfile
};
for (const [nama, def] of Object.entries(bahasaTerdaftar)) hljs.registerLanguage(nama, def);

// Ekstensi file / label fence -> nama bahasa highlight.js
const EXT = {
	js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
	ts: 'typescript', tsx: 'typescript',
	py: 'python', rs: 'rust', rb: 'ruby', cs: 'csharp', h: 'c',
	sh: 'bash', zsh: 'bash', yml: 'yaml', md: 'markdown', toml: 'ini',
	html: 'xml', svelte: 'xml', vue: 'xml'
};

const MAKS_SOROT = 20000; // karakter; di atas ini tampil polos supaya tidak lambat

function bahasa(label = '') {
	const l = label.trim().toLowerCase().split(/\s+/)[0] ?? '';
	const kunci = l.includes('.') ? l.split('.').pop() : l;
	const nama = EXT[kunci] ?? kunci;
	return nama && hljs.getLanguage(nama) ? nama : null;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Mengembalikan HTML aman (sudah di-escape) untuk blok kode. */
export function sorot(kode, label) {
	const nama = bahasa(label);
	if (!nama || kode.length > MAKS_SOROT) return esc(kode);
	try {
		return hljs.highlight(kode, { language: nama, ignoreIllegals: true }).value;
	} catch {
		return esc(kode);
	}
}
