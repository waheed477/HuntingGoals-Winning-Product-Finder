export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { connectDB } = await import('./lib/db.js');
    await connectDB();

    // Register all models so they are available before any route runs
    await import('./models/index.js');
    console.log('✅ DB connected and all models registered');

    const { startAllJobs } = await import('./lib/scheduler.js');
    startAllJobs();

    const { seedIfEmpty, seedSuppliersIfEmpty, seedAdsIfEmpty } = await import('./lib/seed.js');
    await seedIfEmpty();
    await seedSuppliersIfEmpty();
    await seedAdsIfEmpty();
  }
}
