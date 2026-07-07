// One-off backfill for the new Guardian table (see prisma/schema.prisma).
// For every Child still carrying the old flat guardianEmail/guardianPhone
// fields (about to be dropped — see the drop_child_guardian_contact migration
// that must run right after this script), creates one Guardian row with
// relationship='Mẹ'. We have no way to know which parent the old flat email
// actually belonged to, so 'Mẹ' is a best-effort default — a doctor can
// correct/add the other parent afterward via the "Thông tin liên hệ" edit UI.
//
// Run with: node backend/scripts/backfill-guardians-from-child.mjs
// Safe to re-run: skips children that already have a 'Mẹ' Guardian row.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const children = await prisma.child.findMany({
    where: { OR: [{ guardianEmail: { not: null } }, { guardianPhone: { not: null } }] },
  });

  if (children.length === 0) {
    console.log('No children with legacy guardianEmail/guardianPhone — nothing to backfill.');
    return;
  }

  let created = 0;
  for (const child of children) {
    const existing = await prisma.guardian.findUnique({ where: { childId_relationship: { childId: child.id, relationship: 'Mẹ' } } });
    if (existing) continue;

    await prisma.guardian.create({
      data: {
        childId: child.id,
        relationship: 'Mẹ',
        email: child.guardianEmail,
        phone: child.guardianPhone,
      },
    });
    created++;
  }

  console.log(`Backfill complete: ${created} Guardian row(s) created from ${children.length} legacy Child record(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
