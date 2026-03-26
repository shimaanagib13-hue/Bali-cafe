import serverless from 'serverless-http';

let appInstance = null;

async function bootstrap() {
  // Ensure the database logic doesn't attempt to persist to read-only environments
  process.env.DB_OPEN_MODE = 'READONLY';

  if (!appInstance) {
    // Dynamically import db.js to ensure WASM/SQLite is fully initialized first
    const dbModule = await import('../server/db.js');
    if (dbModule && typeof dbModule.initDb === 'function') {
      await dbModule.initDb();
    }
    
    // Only import the application after the database guarantees it's ready
    const appModule = await import('../server/server.js');
    appInstance = appModule.default || appModule;
  }
  
  return appInstance;
}

// VERCEL HANDLER - Natively accepts standard (req, res) provided by Edge networks
export default async function vercelHandler(req, res) {
  try {
    const app = await bootstrap();
    return app(req, res);
  } catch (err) {
    console.error('Vercel API Initialization Error:', err);
    res.status(502).json({ error: 'Server initialization failed', message: err.message });
  }
}

// NETLIFY HANDLER - Fallback exported for robust cross-environment compatibility
export const handler = async (event, context) => {
  try {
    const app = await bootstrap();

    // Standard Netlify path normalization wrapper 
    if (event && typeof event.path === 'string') {
      let p = event.rawPath || event.path || '';
      const nfPrefix = '/.netlify/functions/';
      if (p.startsWith(nfPrefix)) {
        const parts = p.slice(nfPrefix.length).split('/');
        parts.shift();
        p = '/api/' + parts.join('/');
      }
      event.path = p || '/api';
    }

    const lambdaHandler = serverless(app);
    return await lambdaHandler(event, context);
  } catch (err) {
    console.error('Netlify API Initialization Error:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
