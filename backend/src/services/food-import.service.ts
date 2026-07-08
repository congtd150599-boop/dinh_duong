import type { PrismaClient } from '@prisma/client';
import { FOOD_CATEGORIES, FOOD_CONDITION_TAGS, type FoodCategory, type FoodConditionTag } from '@dinhduong/shared';
import { listFoods, loadFromDatabase, type CreateFoodInput } from './food.service';

export class FoodImportError extends Error {
  constructor(
    message: string,
    public lineNumber?: number,
  ) {
    super(message);
  }
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

const HEADER = [
  'name',
  'category',
  'kcalper100',
  'proteinper100',
  'carbper100',
  'fatper100',
  'costper100',
  'preferencescore',
  'benefits',
  'cautionnote',
  'conditiontags',
  'source',
];

/**
 * Parses a CSV with header `name,category,kcalPer100,proteinPer100,carbPer100,fatPer100,costPer100,preferenceScore,benefits,cautionNote,conditionTags,source`.
 * `conditionTags` is a `|`-separated list of tags from FOOD_CONDITION_TAGS inside one quoted field (e.g. "Tiểu đường|Gout").
 * Throws FoodImportError with a 1-based line number on the first malformed row — the whole import is rejected rather
 * than partially applied (see importFoods, which upserts by name so this never wipes isSystemDefault rows).
 */
export function parseFoodsCsv(csvText: string): CreateFoodInput[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) throw new FoodImportError('CSV rỗng hoặc thiếu dữ liệu (chỉ có header)');

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  if (HEADER.some((col, i) => header[i] !== col)) {
    throw new FoodImportError(`Header phải đúng thứ tự: ${HEADER.join(',')} (nhận được: ${header.join(',')})`, 1);
  }

  const records: CreateFoodInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i]);
    if (cols.length < HEADER.length) {
      throw new FoodImportError(`Dòng ${lineNumber}: thiếu cột (cần đủ ${HEADER.length} cột, có ${cols.length})`, lineNumber);
    }
    const [nameRaw, categoryRaw, kcalRaw, proteinRaw, carbRaw, fatRaw, costRaw, preferenceRaw, benefits, cautionNote, conditionTagsRaw, source] =
      cols;

    const name = nameRaw.trim();
    if (!name) throw new FoodImportError(`Dòng ${lineNumber}: name không được để trống`, lineNumber);

    const category = categoryRaw.trim();
    if (!FOOD_CATEGORIES.includes(category as FoodCategory)) {
      throw new FoodImportError(`Dòng ${lineNumber}: category phải là một trong ${FOOD_CATEGORIES.join('/')}, nhận được "${categoryRaw}"`, lineNumber);
    }

    const kcalPer100 = Number(kcalRaw);
    if (!Number.isFinite(kcalPer100) || kcalPer100 < 0) {
      throw new FoodImportError(`Dòng ${lineNumber}: kcalPer100 phải là số không âm, nhận được "${kcalRaw}"`, lineNumber);
    }
    const proteinPer100 = proteinRaw.trim() === '' ? 0 : Number(proteinRaw);
    const carbPer100 = carbRaw.trim() === '' ? 0 : Number(carbRaw);
    const fatPer100 = fatRaw.trim() === '' ? 0 : Number(fatRaw);
    if (![proteinPer100, carbPer100, fatPer100].every((v) => Number.isFinite(v) && v >= 0)) {
      throw new FoodImportError(`Dòng ${lineNumber}: proteinPer100/carbPer100/fatPer100 phải là số không âm`, lineNumber);
    }

    const costPer100 = costRaw.trim() === '' ? null : Number(costRaw);
    if (costPer100 !== null && (!Number.isFinite(costPer100) || costPer100 < 0)) {
      throw new FoodImportError(`Dòng ${lineNumber}: costPer100 phải là số không âm hoặc để trống, nhận được "${costRaw}"`, lineNumber);
    }
    const preferenceScore = preferenceRaw.trim() === '' ? 3 : Number(preferenceRaw);
    if (!Number.isInteger(preferenceScore) || preferenceScore < 1 || preferenceScore > 5) {
      throw new FoodImportError(`Dòng ${lineNumber}: preferenceScore phải là số nguyên 1-5, nhận được "${preferenceRaw}"`, lineNumber);
    }

    const conditionTags = conditionTagsRaw
      .split('|')
      .map((t) => t.trim())
      .filter(Boolean);
    for (const tag of conditionTags) {
      if (!FOOD_CONDITION_TAGS.includes(tag as FoodConditionTag)) {
        throw new FoodImportError(`Dòng ${lineNumber}: conditionTags có giá trị không hợp lệ "${tag}"`, lineNumber);
      }
    }

    records.push({
      name,
      category: category as FoodCategory,
      kcalPer100,
      proteinPer100,
      carbPer100,
      fatPer100,
      costPer100,
      preferenceScore,
      benefits: benefits.trim() || null,
      cautionNote: cautionNote.trim() || null,
      conditionTags: conditionTags as FoodConditionTag[],
      source: source.trim() || null,
    });
  }

  if (records.length === 0) {
    throw new FoodImportError('CSV không có dòng dữ liệu hợp lệ nào');
  }

  return records;
}

/**
 * Upserts every parsed row by `name` — unlike growth-standards' import
 * (which replaces the whole table), this never deletes existing rows, so
 * `isSystemDefault` foods that back menu.service.ts survive an import
 * untouched unless the CSV explicitly names them (in which case only their
 * nutrition/notes fields update — isSystemDefault itself is never set by import).
 */
export async function importFoods(prisma: PrismaClient, records: CreateFoodInput[]): Promise<number> {
  for (const r of records) {
    await prisma.food.upsert({
      where: { name: r.name },
      update: {
        category: r.category,
        kcalPer100: r.kcalPer100,
        proteinPer100: r.proteinPer100 ?? 0,
        carbPer100: r.carbPer100 ?? 0,
        fatPer100: r.fatPer100 ?? 0,
        costPer100: r.costPer100 ?? null,
        preferenceScore: r.preferenceScore ?? 3,
        benefits: r.benefits ?? null,
        cautionNote: r.cautionNote ?? null,
        conditionTags: r.conditionTags ?? [],
        source: r.source ?? null,
      },
      create: {
        name: r.name,
        category: r.category,
        kcalPer100: r.kcalPer100,
        proteinPer100: r.proteinPer100 ?? 0,
        carbPer100: r.carbPer100 ?? 0,
        fatPer100: r.fatPer100 ?? 0,
        costPer100: r.costPer100 ?? null,
        preferenceScore: r.preferenceScore ?? 3,
        benefits: r.benefits ?? null,
        cautionNote: r.cautionNote ?? null,
        conditionTags: r.conditionTags ?? [],
        source: r.source ?? null,
      },
    });
  }
  await loadFromDatabase(prisma);
  return records.length;
}

export async function exportFoodsCsv(prisma: PrismaClient): Promise<string> {
  const foods = await listFoods(prisma);
  const rows = foods.map((f) =>
    [
      f.name,
      f.category,
      f.kcalPer100,
      f.proteinPer100,
      f.carbPer100,
      f.fatPer100,
      f.costPer100 ?? '',
      f.preferenceScore,
      f.benefits ?? '',
      f.cautionNote ?? '',
      f.conditionTags.join('|'),
      f.source ?? '',
    ]
      .map(csvEscape)
      .join(','),
  );
  return '﻿' + [HEADER.join(','), ...rows].join('\n'); // BOM prefix so Excel renders Vietnamese diacritics correctly
}
