// Regenerates backend/src/data/growth-standards-who-default.{csv,ts} and
// backend/src/data/wfh-lms-who-default.ts from the official WHO source files.
// Run with: node backend/scripts/generate-lms-growth-data.mjs
//
// Unlike the previous (uncommitted, lost) median-only generator, this one is
// committed — re-run it if WHO ever revises one of these standards. It fetches
// fresh from GitHub each time (with retry/backoff — raw.githubusercontent.com
// rate-limits aggressively; falls back to the jsdelivr CDN mirror per file).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const SEX_TO_GENDER = { 1: 'Nam', 2: 'Nữ' };

const SOURCES = {
  weianthro: {
    github: 'https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/data-raw/growthstandards/weianthro.txt',
    jsdelivr: 'https://cdn.jsdelivr.net/gh/WorldHealthOrganization/anthro@master/data-raw/growthstandards/weianthro.txt',
  },
  lenanthro: {
    github: 'https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/data-raw/growthstandards/lenanthro.txt',
    jsdelivr: 'https://cdn.jsdelivr.net/gh/WorldHealthOrganization/anthro@master/data-raw/growthstandards/lenanthro.txt',
  },
  wflanthro: {
    github: 'https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/data-raw/growthstandards/wflanthro.txt',
    jsdelivr: 'https://cdn.jsdelivr.net/gh/WorldHealthOrganization/anthro@master/data-raw/growthstandards/wflanthro.txt',
  },
  wfhanthro: {
    github: 'https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/data-raw/growthstandards/wfhanthro.txt',
    jsdelivr: 'https://cdn.jsdelivr.net/gh/WorldHealthOrganization/anthro@master/data-raw/growthstandards/wfhanthro.txt',
  },
  hfawho2007: {
    github: 'https://raw.githubusercontent.com/WorldHealthOrganization/anthroplus/main/data-raw/growthstandards/hfawho2007.txt',
    jsdelivr: 'https://cdn.jsdelivr.net/gh/WorldHealthOrganization/anthroplus@main/data-raw/growthstandards/hfawho2007.txt',
  },
  bmianthro: {
    github: 'https://raw.githubusercontent.com/WorldHealthOrganization/anthro/master/data-raw/growthstandards/bmianthro.txt',
    jsdelivr: 'https://cdn.jsdelivr.net/gh/WorldHealthOrganization/anthro@master/data-raw/growthstandards/bmianthro.txt',
  },
  bfawho2007: {
    github: 'https://raw.githubusercontent.com/WorldHealthOrganization/anthroplus/main/data-raw/growthstandards/bfawho2007.txt',
    jsdelivr: 'https://cdn.jsdelivr.net/gh/WorldHealthOrganization/anthroplus@main/data-raw/growthstandards/bfawho2007.txt',
  },
};

async function fetchText(urls, attempts = 6, delayMs = 8000) {
  for (const url of urls) {
    for (let i = 0; i < attempts; i++) {
      const res = await fetch(url);
      if (res.ok) return res.text();
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Failed to fetch from all sources: ${urls.join(', ')}`);
}

function parseTable(text) {
  const lines = text.trim().split('\n');
  const header = lines[0].split('\t').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split('\t').map((c) => c.trim());
    const row = {};
    header.forEach((h, i) => (row[h] = cols[i]));
    return row;
  });
}

const round1 = (n) => Math.round(n * 10) / 10;

async function main() {
  console.log('Fetching WHO source files...');
  const [weiText, lenText, wflText, wfhText, hfa2007Text, bmiText, bfa2007Text] = await Promise.all(
    [SOURCES.weianthro, SOURCES.lenanthro, SOURCES.wflanthro, SOURCES.wfhanthro, SOURCES.hfawho2007, SOURCES.bmianthro, SOURCES.bfawho2007].map(
      (s) => fetchText([s.github, s.jsdelivr]),
    ),
  );

  const weianthro = parseTable(weiText);
  const lenanthro = parseTable(lenText);
  const wflanthro = parseTable(wflText);
  const wfhanthro = parseTable(wfhText);
  const hfawho2007 = parseTable(hfa2007Text);
  const bmianthro = parseTable(bmiText);
  const bfawho2007 = parseTable(bfa2007Text);

  // --- WFA + HFA, 0-60 months (day-resolution source -> integer-month rows) ---
  const weiByKey = new Map(weianthro.map((r) => [`${r.sex}_${r.age}`, r]));
  const lenByKey = new Map(lenanthro.map((r) => [`${r.sex}_${r.age}`, r]));

  const growthRows = [];
  for (const sex of [1, 2]) {
    for (let month = 0; month <= 60; month++) {
      // floor, not round: month*30.4375 lands exactly on a .5 boundary at
      // months 8/24/40/56, and JS's Math.round rounds .5 up (731 for month 24)
      // which crosses WHO's own L(recumbent)/H(standing) measurement-method
      // switchover at that exact day — floor reproduces the pre-LMS-upgrade
      // bundled values exactly (cross-checked against months 12/24/60).
      const day = Math.floor(month * 30.4375);
      const w = weiByKey.get(`${sex}_${day}`);
      const l = lenByKey.get(`${sex}_${day}`);
      if (!w || !l) throw new Error(`Missing day ${day} for sex ${sex}`);
      growthRows.push({
        gender: SEX_TO_GENDER[sex],
        metric: 'WFA',
        months: month,
        median: round1(Number(w.m)),
        l: Number(w.l),
        s: Number(w.s),
        source: 'WHO Child Growth Standards 2006 (0-60 thang)',
      });
      growthRows.push({
        gender: SEX_TO_GENDER[sex],
        metric: 'HFA',
        months: month,
        median: round1(Number(l.m)),
        l: Number(l.l),
        s: Number(l.s),
        source: 'WHO Child Growth Standards 2006 (0-60 thang)',
      });
    }
  }

  // --- HFA, 61-228 months, WHO 2007 (already monthly resolution) ---
  const hfa2007ByKey = new Map(hfawho2007.map((r) => [`${r.sex}_${r.age}`, r]));
  for (const sex of [1, 2]) {
    for (let month = 61; month <= 228; month++) {
      const row = hfa2007ByKey.get(`${sex}_${month}`);
      if (!row) throw new Error(`Missing month ${month} for sex ${sex} in hfawho2007`);
      growthRows.push({
        gender: SEX_TO_GENDER[sex],
        metric: 'HFA',
        months: month,
        median: round1(Number(row.m)),
        l: Number(row.l),
        s: Number(row.s),
        source: 'WHO Growth Reference 2007 (61-228 thang)',
      });
    }
  }

  if (growthRows.length !== 580) throw new Error(`Expected 580 WFA+HFA rows, got ${growthRows.length}`);

  // --- BFA (BMI-for-age), 0-228 months — same day-floor/stitch pattern as HFA
  // above. This is the indicator WHO/Bo Y Te mandate for overweight/obesity
  // classification from age 5 onward (Bang 1, "Huong dan dieu tri Nhi khoa
  // Phan Ngoai Tru 2025", tr.148) — the app never had it before (see Bugs.md
  // #1), and used a flat adult BMI>=25 cutoff instead.
  const bmiByKey = new Map(bmianthro.map((r) => [`${r.sex}_${r.age}`, r]));
  const bfaRows = [];
  for (const sex of [1, 2]) {
    for (let month = 0; month <= 60; month++) {
      const day = Math.floor(month * 30.4375);
      const b = bmiByKey.get(`${sex}_${day}`);
      if (!b) throw new Error(`Missing day ${day} for sex ${sex} in bmianthro`);
      bfaRows.push({
        gender: SEX_TO_GENDER[sex],
        months: month,
        l: Number(b.l),
        m: Number(b.m),
        s: Number(b.s),
      });
    }
  }
  const bfa2007ByKey = new Map(bfawho2007.map((r) => [`${r.sex}_${r.age}`, r]));
  for (const sex of [1, 2]) {
    for (let month = 61; month <= 228; month++) {
      const row = bfa2007ByKey.get(`${sex}_${month}`);
      if (!row) throw new Error(`Missing month ${month} for sex ${sex} in bfawho2007`);
      bfaRows.push({ gender: SEX_TO_GENDER[sex], months: month, l: Number(row.l), m: Number(row.m), s: Number(row.s) });
    }
  }
  if (bfaRows.length !== 458) throw new Error(`Expected 458 BFA rows, got ${bfaRows.length}`);

  // --- WFH, 0-60 months, height/length-indexed (native resolution, no month axis) ---
  const wfhRows = [];
  for (const row of wflanthro) {
    wfhRows.push({ gender: SEX_TO_GENDER[row.sex], table: 'length', value: Number(row.length), l: Number(row.l), m: Number(row.m), s: Number(row.s) });
  }
  for (const row of wfhanthro) {
    wfhRows.push({ gender: SEX_TO_GENDER[row.sex], table: 'height', value: Number(row.height), l: Number(row.l), m: Number(row.m), s: Number(row.s) });
  }

  writeGrowthStandardsFiles(growthRows);
  writeWfhLmsFile(wfhRows);
  writeBfaLmsFile(bfaRows);
  console.log(`Wrote ${growthRows.length} WFA+HFA rows, ${wfhRows.length} WFH rows, and ${bfaRows.length} BFA rows.`);
}

function writeGrowthStandardsFiles(rows) {
  const csvHeader = 'gender,metric,months,median,l,s,source';
  const csvLines = [csvHeader, ...rows.map((r) => `${r.gender},${r.metric},${r.months},${r.median},${r.l},${r.s},"${r.source}"`)];
  fs.writeFileSync(path.join(DATA_DIR, 'growth-standards-who-default.csv'), '﻿' + csvLines.join('\n') + '\n');

  const tsRows = rows
    .map(
      (r) =>
        `  { gender: '${r.gender}', metric: '${r.metric}', months: ${r.months}, median: ${r.median}, l: ${r.l}, s: ${r.s}, source: '${r.source}' },`,
    )
    .join('\n');

  const ts = `// Bundled default growth-reference data — used to seed the database on first
// run and as the fallback when no data has been imported yet. NOT hardcoded
// into the calculation logic itself (see growth-standards.service.ts) — this
// is deliberately just data, swappable at runtime via CSV import.
//
// Carries the real WHO LMS parameters (L, M=median, S), not just a median —
// see z-score.service.ts for why (real LMS Z-scores, not the old flat-
// coefficient approximation).
//
// Source: official WHO reference data, mechanically extracted (not retyped)
// from the WHO Anthro / AnthroPlus R packages published by WHO itself:
//   - 0-60 months (WFA, HFA): WHO Child Growth Standards 2006
//     https://github.com/WorldHealthOrganization/anthro/blob/master/data-raw/growthstandards/lenanthro.txt
//     https://github.com/WorldHealthOrganization/anthro/blob/master/data-raw/growthstandards/weianthro.txt
//     (day-resolution source; day = round(month * 30.4375) reproduces the
//     integer-month rows here exactly — cross-checked against the previous
//     median-only extraction before this LMS upgrade)
//   - 61-228 months (HFA only — WFA/WFH are not used past 60 months, per WHO's
//     own convention): WHO Growth Reference 2007
//     https://github.com/WorldHealthOrganization/anthroplus/blob/main/data-raw/growthstandards/hfawho2007.txt
//
// This is mandated by Vietnam's Ministry of Health for exactly this purpose
// (Quyết định 3777/QĐ-BYT-2024): Vietnam does not publish a separate
// population-specific growth STANDARD for classifying individual children —
// it adopts the WHO 2006/2007 standards directly.
//
// NOTE — real, WHO-acknowledged discontinuity at the 60/61-month boundary:
// the 2006 standard and 2007 reference do not align smoothly where they
// meet. This is documented WHO behavior, not a bug — do not smooth over it.
//
// Regenerated via backend/scripts/generate-lms-growth-data.mjs — re-run that
// script if WHO revises a standard (committed, unlike its lost predecessor).
import type { GrowthStandardRecord } from '../services/growth-standards.service';

export const DEFAULT_GROWTH_STANDARDS: GrowthStandardRecord[] = [
${tsRows}
];
`;
  fs.writeFileSync(path.join(DATA_DIR, 'growth-standards-who-default.ts'), ts);
}

function writeWfhLmsFile(rows) {
  const tsRows = rows
    .map((r) => `  { gender: '${r.gender}', table: '${r.table}', value: ${r.value}, l: ${r.l}, m: ${r.m}, s: ${r.s} },`)
    .join('\n');

  const ts = `// Bundled WHO weight-for-height/length LMS reference data — the WFH metric
// this app never had a real table for before (it used to be synthesized
// algebraically from the WFA+HFA medians, which was not a real WHO value).
//
// Unlike WFA/HFA (age-indexed, admin-swappable via the "📐 Chuẩn Tăng Trưởng"
// CSV import tab), this table is indexed by the child's actual measured
// length/height in cm (0.1cm steps) — a fundamentally different axis WHO
// itself uses two separate tables for. Kept as bundled code data (like
// energy-table.data.ts), not wired into the DB-backed import/export feature.
//
// Source: official WHO data (WorldHealthOrganization/anthro GitHub repo):
//   - 'length' rows (45-110cm): weight-for-length, WHO 2006, used for <24 months
//     https://github.com/WorldHealthOrganization/anthro/blob/master/data-raw/growthstandards/wflanthro.txt
//   - 'height' rows (65-120cm): weight-for-height, WHO 2006, used for >=24 months
//     https://github.com/WorldHealthOrganization/anthro/blob/master/data-raw/growthstandards/wfhanthro.txt
// Not applicable beyond 60 months — WHO does not publish a WFH standard past
// 5 years (BMI-for-age is used instead, which this app does not yet compute).
//
// Regenerated via backend/scripts/generate-lms-growth-data.mjs.
export interface WfhLmsPoint {
  gender: 'Nam' | 'Nữ';
  table: 'length' | 'height';
  value: number; // length or height in cm, to 1 decimal
  l: number;
  m: number;
  s: number;
}

// Declared without a per-element type target (cast once at the end instead) —
// TS chokes ("union type too complex to represent") trying to structurally
// check 2400+ object literals individually against a narrow literal-union
// interface in one array literal.
const rawWfhLmsData = [
${tsRows}
];

export const WFH_LMS_DEFAULT = rawWfhLmsData as WfhLmsPoint[];
`;
  fs.writeFileSync(path.join(DATA_DIR, 'wfh-lms-who-default.ts'), ts);
}

function writeBfaLmsFile(rows) {
  const tsRows = rows.map((r) => `  { gender: '${r.gender}', months: ${r.months}, l: ${r.l}, m: ${r.m}, s: ${r.s} },`).join('\n');

  const ts = `// Bundled WHO BMI-for-age (BFA) LMS reference data — the indicator WHO and
// Vietnam's Bo Y Te (Huong dan dieu tri Nhi khoa Phan Ngoai Tru 2025, Bang 1,
// tr.148) mandate for overweight/obesity classification, especially past 60
// months where WFH is not published. Previously this app used a flat adult
// BMI>=25 cutoff instead of an age-adjusted Z-score — see Bugs.md #1 for the
// full writeup of why that was wrong and what this replaces.
//
// Age-indexed like WFA/HFA (not measured-value-indexed like WFH), but kept as
// bundled-only data like wfh-lms-who-default.ts rather than folded into the
// admin-editable "Chuan Tang Truong" CSV table — narrower blast radius for a
// bug fix, consistent with how WFH was added.
//
// Source: official WHO data —
//   - 0-60 months: WHO Child Growth Standards 2006 (day-resolution, same
//     floor(month*30.4375) stitch as WFA/HFA)
//     https://github.com/WorldHealthOrganization/anthro/blob/master/data-raw/growthstandards/bmianthro.txt
//   - 61-228 months: WHO Growth Reference 2007
//     https://github.com/WorldHealthOrganization/anthroplus/blob/main/data-raw/growthstandards/bfawho2007.txt
//
// Regenerated via backend/scripts/generate-lms-growth-data.mjs.
export interface BfaLmsPoint {
  gender: 'Nam' | 'Nữ';
  months: number;
  l: number;
  m: number;
  s: number;
}

export const BFA_LMS_DEFAULT: BfaLmsPoint[] = [
${tsRows}
];
`;
  fs.writeFileSync(path.join(DATA_DIR, 'bfa-lms-who-default.ts'), ts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
