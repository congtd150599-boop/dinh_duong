// One-off backfill for the new Child.guardianEmail column (see
// prisma/schema.prisma). For every Child still missing a guardianEmail, finds
// its most recent (by examDate) Patient visit that has a non-null
// guardianEmail and copies it up to the Child — guardianEmail is about to be
// dropped from Patient entirely (see the drop_patient_guardian_email migration
// that must run right after this script).
//
// Run with: node backend/scripts/backfill-child-guardian-email.mjs
// Safe to re-run: only touches Child rows where guardianEmail is still null.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const children = await prisma.child.findMany({ where: { guardianEmail: null } });

  if (children.length === 0) {
    console.log('No children missing guardianEmail — nothing to backfill.');
    return;
  }

  let updated = 0;
  for (const child of children) {
    const latestWithEmail = await prisma.patient.findFirst({
      where: { childId: child.id, guardianEmail: { not: null } },
      orderBy: { examDate: 'desc' },
    });
    if (!latestWithEmail) continue;

    await prisma.child.update({ where: { id: child.id }, data: { guardianEmail: latestWithEmail.guardianEmail } });
    updated++;
  }

  console.log(`Backfill complete: ${updated} of ${children.length} child(ren) missing guardianEmail had one found on a past visit.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
