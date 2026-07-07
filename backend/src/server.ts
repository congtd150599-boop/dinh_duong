import { createApp } from './app';
import { prisma } from './db/prisma';
import { startRevisitReminderJob } from './jobs/revisit-reminder.job';
import { bootstrapAdminIfNeeded } from './services/auth.service';
import { ensureSystemDefaultsSeeded, loadFromDatabase as loadFoodsFromDatabase } from './services/food.service';
import { loadFromDatabase } from './services/growth-standards.service';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const app = createApp(prisma);

async function main() {
  // If a growth-standards CSV was imported previously, use it; otherwise the
  // bundled WHO default (loaded at module init) stays active.
  const loaded = await loadFromDatabase(prisma);
  console.log(
    loaded > 0
      ? `Loaded ${loaded} growth-standard records from the database (imported data).`
      : 'No imported growth-standard data found — using the bundled WHO default.',
  );

  await ensureSystemDefaultsSeeded(prisma);
  const foodsLoaded = await loadFoodsFromDatabase(prisma);
  console.log(`Loaded ${foodsLoaded} food records from the database.`);

  await bootstrapAdminIfNeeded(prisma);
  startRevisitReminderJob(prisma);

  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

main();
