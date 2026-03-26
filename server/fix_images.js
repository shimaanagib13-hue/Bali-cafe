import { db, initDb } from './db.js';

async function run() {
  // Ensure we can write to the database during this local script execution
  process.env.DB_OPEN_MODE = 'READWRITE';
  
  await initDb();
  
  console.log('Database initialized. Scanning for local image paths...');
  
  db.all("SELECT id, name, image_url FROM products", [], (err, rows) => {
    if (err) {
      console.error('Error fetching products:', err);
      process.exit(1);
    }
    
    let updatesCount = 0;

    for (const row of rows) {
      if (!row.image_url) continue;

      let currentPath = row.image_url.trim();

      // Skip empty, explicit 'Null' strings, or external URLs
      if (currentPath.toUpperCase() === 'NULL' || 
          currentPath.startsWith('http://') || 
          currentPath.startsWith('https://')) {
          continue; 
      }

      // If it's a local path (e.g., C:\...\image.jpg or src/assets/image.jpg), 
      // extract just the filename and construct the correct public path.
      // This regex splits on both forward and backward slashes.
      const filename = currentPath.split(/[/\\]/).pop();
      const newPath = `/images/${filename}`;

      // Only execute UPDATE if the path actually needs changing
      if (newPath !== currentPath) {
          // Escape single quotes for SQL safety
          const safePath = newPath.replace(/'/g, "''");
          
          db.exec(`UPDATE products SET image_url = '${safePath}' WHERE id = ${row.id}`, (execErr) => {
              if (execErr) console.error(`Failed to update ID ${row.id}:`, execErr);
          });
          
          console.log(`Corrected [${row.name}]:\n   Old: ${currentPath}\n   New: ${newPath}\n`);
          updatesCount++;
      }
    }
    
    console.log(`\nMigration complete. Updated ${updatesCount} product images.`);
    process.exit(0);
  });
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
