import path from 'path';
import fs from 'fs';
import serverless from 'serverless-http';

let appInstance = null;

// Shared initialization log to prevent starting the DB multiple times
async function bootstrap() {
  const resolvedDb = path.join(process.cwd(), 'server', 'bali.db');
  
  if (!fs.existsSync(resolvedDb)) {
    console.error('Database file not found at:', resolvedDb);
    throw new Error(`Database file not found: ${resolvedDb}`);
  }

  process.env.DB_PATH = process.env.DB_PATH || resolvedDb;
  process.env.DB_OPEN_MODE = 'READONLY';

  if (!appInstance) {
    const dbModule = await import('../server/db.js');
    if (dbModule && typeof dbModule.initDb === 'function') {
      await dbModule.initDb();
    }
    const appModule = await import('../server/server.js');
    appInstance = appModule.default || appModule;
  }
  return appInstance;
}

// ============================================
// VERCEL HANDLER
// Vercel naturally passes standard Node HTTP (req, res) objects.
// Express instances natively handle these without needing a wrapper.
// ============================================
export default async function vercelHandler(req, res) {
  try {
    const app = await bootstrap();
    
    // In Vercel, rewrites typically preserve the original req.url (e.g. /api/menu).
    // Express will match this directly. We don't need complex normalize logic!
    return app(req, res);
  } catch (err) {
    console.error('Vercel API Error:', err);
    res.status(502).json({ error: 'Server initialization failed', message: err.message });
  }
}

// ============================================
// NETLIFY HANDLER (Kept for fallback/cross-compatibility)
// Netlify functions use AWS Lambda signature (event, context).
// ============================================
export const handler = async (event, context) => {
  try {
    const app = await bootstrap();

    // Netlify path normalization
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
    console.error('Netlify API Error:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server initialization failed', message: err.message })
    };
  }
};
