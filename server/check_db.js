import { initDb, db } from './db.js';
import fs from 'fs';

async function run() {
    await initDb();
    
    // 1. Find the product
    db.all("SELECT id, name FROM products WHERE name LIKE '%Ice White Mocha%'", [], (err, rows) => {
        if (err) {
            console.error('Error finding product:', err);
            process.exit(1);
        }
        console.log('Found products:', JSON.stringify(rows, null, 2));
        
        // 2. Find empty images
        db.all("SELECT id, name, category_id, image_url FROM products WHERE image_url IS NULL OR image_url = '' OR image_url = 'NULL'", [], (err, emptyRows) => {
            if (err) {
                console.error('Error finding empty images:', err);
                process.exit(1);
            }
            console.log('Products with empty images:', JSON.stringify(emptyRows, null, 2));
            process.exit(0);
        });
    });
}

run();
