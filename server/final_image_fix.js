import { db, initDb } from './db.js';

async function finalFix() {
  process.env.DB_OPEN_MODE = 'READWRITE';
  await initDb();
  
  db.all("SELECT id, name, image_url FROM products", [], (err, rows) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    
    let updates = [];
    
    for (const row of rows) {
      const name = row.name.toLowerCase();
      let newPath = row.image_url;
      
      // If empty or NULL, apply fallback
      if (!row.image_url || row.image_url.toUpperCase() === 'NULL' || row.image_url.trim() === '') {
        let photoId = '1514432324607'; // Default coffee
        if (name.includes('smoothie')) photoId = '1505252585441'; 
        else if (name.includes('matcha')) photoId = '1582733315328';
        else if (name.includes('boba')) photoId = '1513233833560'; // Better boba photo ID
        else if (name.includes('cake') || name.includes('molten') || name.includes('san sebastian') || name.includes('tiramisu')) photoId = '1533134242443';
        else if (name.includes('croissant') || name.includes('patisserie')) photoId = '1555507036-ab1f4038808d';
        
        newPath = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&q=80&w=600&h=600`;
      } else if (row.image_url.includes('\\') || row.image_url.includes('C:')) {
        // Double check for any lingering local paths
        const filename = row.image_url.split(/[/\\]/).pop();
        newPath = `/images/${filename}`;
      }
      
      if (newPath !== row.image_url) {
        updates.push({ id: row.id, path: newPath });
      }
    }
    
    if (updates.length === 0) {
      console.log('No updates needed.');
      process.exit(0);
    }
    
    console.log(`Applying ${updates.length} updates...`);
    
    let completed = 0;
    for (const update of updates) {
      const safePath = update.path.replace(/'/g, "''");
      db.exec(`UPDATE products SET image_url = '${safePath}' WHERE id = ${update.id}`, (err) => {
        if (err) console.error(err);
        completed++;
        if (completed === updates.length) {
          console.log('Final fix complete.');
          process.exit(0);
        }
      });
    }
  });
}

finalFix().catch(console.error);
