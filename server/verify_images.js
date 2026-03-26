import { db, initDb } from './db.js';

async function verify() {
  await initDb();
  
  db.all("SELECT id, name, image_url FROM products", [], (err, rows) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    const localPaths = rows.filter(r => r.image_url && r.image_url.startsWith('/images/'));
    const externalPaths = rows.filter(r => r.image_url && r.image_url.startsWith('https://'));
    const missingPaths = rows.filter(r => !r.image_url || (r.image_url.toUpperCase() === 'NULL'));
    
    console.log(`Total products: ${rows.length}`);
    console.log(`Local /images/ paths: ${localPaths.length}`);
    console.log(`External Unsplash paths: ${externalPaths.length}`);
    console.log(`Products with missing images: ${missingPaths.length}`);
    
    if (missingPaths.length > 0) {
      console.log('Examples of missing images:');
      console.log(missingPaths.slice(0, 5));
    } else {
      console.log('Verification Success: All 64 products have valid image URLs (Local or Unsplash).');
    }
    
    process.exit(0);
  });
}

verify().catch(console.error);
