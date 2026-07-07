// One-off backfill for the new Patient.childId column (see prisma/schema.prisma's
// Child model). Groups every pre-existing Patient row by normalized name + exact
// dob, creates one Child per group (using the earliest visit's name/dob/gender as
// the canonical snapshot), then assigns childId to every row in that group.
//
// Run with: node backend/scripts/backfill-child-ids.mjs
// Must run against the real dev/prod DB only — the test DB is always empty
// between test runs, so there's nothing to backfill there.
//
// Safe to re-run: rows that already have a childId are skipped.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function main() {
  const patients = await prisma.patient.findMany({
    where: { childId: null },
    orderBy: { createdAt: 'asc' },
  });

  if (patients.length === 0) {
    console.log('No patients missing childId — nothing to backfill.');
    return;
  }

  const groups = new Map(); // key: normalizedName|dobISO -> patient rows
  for (const p of patients) {
    const key = `${normalizeName(p.name)}|${p.dob.toISOString().slice(0, 10)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  let childrenCreated = 0;
  for (const rows of groups.values()) {
    const canonical = rows[0]; // earliest visit (rows are createdAt-ascending within each group)
    const child = await prisma.child.create({
      data: { name: canonical.name, dob: canonical.dob, gender: canonical.gender },
    });
    childrenCreated++;
    await prisma.patient.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { childId: child.id },
    });
  }

  console.log(`Backfill complete: ${childrenCreated} Child record(s) created for ${patients.length} Patient row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
