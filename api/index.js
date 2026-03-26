import serverless from 'serverless-http';

let appInstance = null;

async function bootstrap() {
  if (!appInstance) {
    // Ensure the DB is fully initialized and WASM/SQLite is ready BEFORE 
    // any routing or Express code is evaluated.
    const dbModule = await import('../server/db.js');
    if (dbModule && typeof dbModule.initDb === 'function') {
      await dbModule.initDb();
    }
    
    // Now that DB is ready, import the Express application
    const appModule = await import('../server/server.js');
    appInstance = appModule.default || appModule;
  }
  
  return appInstance;
}

// Universal Vercel Serverless Handler
export default async function vercelHandler(req, res) {
  try {
    const app = await bootstrap();
    return app(req, res);
  } catch (err) {
    console.error('Vercel API Initialization Error:', err);
    res.status(502).json({ error: 'Server initialization failed', message: err.message });
  }
}
