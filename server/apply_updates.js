import { initDb, db } from './db.js';
import fs from 'fs';
import path from 'path';

async function run() {
    await initDb();
    
    // 1. Delete "Ice White Mocha"
    // We'll search by name to be sure
    db.all("SELECT id, name FROM products WHERE name LIKE '%Ice White Mocha%'", [], (err, rows) => {
        if (err) { console.error(err); process.exit(1); }
        
        if (rows.length > 0) {
            const ids = rows.map(r => r.id);
            console.log('Deleting products with IDs:', ids);
            
            // Delete prices first (FK constraint might exist)
            db.exec(`DELETE FROM product_prices WHERE product_id IN (${ids.join(',')})`, (err) => {
                if (err) { console.error('Error deleting prices:', err); }
                
                db.exec(`DELETE FROM products WHERE id IN (${ids.join(',')})`, (err) => {
                    if (err) { console.error('Error deleting products:', err); }
                    console.log('Successfully deleted product(s).');
                    
                    // 2. Find and fix empty images
                    fixEmptyImages();
                });
            });
        } else {
            console.log('No "Ice White Mocha" found to delete.');
            fixEmptyImages();
        }
    });
}

function fixEmptyImages() {
    db.all("SELECT id, name, category_id, image_url FROM products WHERE image_url IS NULL OR image_url = '' OR image_url = 'NULL'", [], async (err, rows) => {
        if (err) { console.error(err); process.exit(1); }
        
        console.log(`Found ${rows.length} products with empty images.`);
        
        // Re-use logic from update_images.js (but simplified)
        // Since I can't easily import from it due to how it's structured, I'll define a basic fallback
        for (const row of rows) {
            let photoId = '1514432324607'; // Default coffee
            const n = row.name.toLowerCase();
            
            if (n.includes('smoothie')) photoId = '1505252585441'; 
            else if (n.includes('matcha')) photoId = '1582733315328';
            else if (n.includes('boba')) photoId = '1558857563';
            else if (n.includes('cake') || n.includes('molten')) photoId = '1533134242443';
            
            const url = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&q=80&w=600&h=600`;
            console.log(`Updating ${row.name} (ID ${row.id}) with image: ${url}`);
            
            await new Promise(resolve => {
                db.exec(`UPDATE products SET image_url = '${url}' WHERE id = ${row.id}`, (err) => {
                    if (err) console.error('Update failed for', row.name, err);
                    resolve();
                });
            });
        }
        
        console.log('Finished updating images.');
        process.exit(0);
    });
}

run();
