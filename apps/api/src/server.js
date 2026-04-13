const app = require('./app');
const { connectDb, closeDb } = require('./config/db');
const { port } = require('./config/env');
const { seedActivitiesIfEmpty } = require('./data/seedActivities');

(async function bootstrap() {
  try {
    await connectDb();
    await seedActivitiesIfEmpty();
    const server = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on port ${port}`);
    });
    const shutdown = async () => {
      server.close(async () => {
        await closeDb();
        process.exit(0);
      });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        // eslint-disable-next-line no-console
        console.error(
          `Port ${port} is already in use. Stop the previous process with: lsof -nP -iTCP:${port} -sTCP:LISTEN`
        );
        process.exit(1);
      }
      throw err;
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Startup error:', err.message);
    process.exit(1);
  }
})();
