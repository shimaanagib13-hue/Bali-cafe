import serverless from 'serverless-http';

let appInstance = null;

async function bootstrap() {
  if (!appInstance) {
    // Import and initialize the Express application and its components (including DB migrations)
    const serverModule = await import('../server/server.js');
    if (serverModule.initApp) {
        await serverModule.initApp();
    }
    appInstance = serverModule.default || serverModule;
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
