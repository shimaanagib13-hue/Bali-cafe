import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

// Use strictly process.cwd() as requested for Vercel environments
const dbPath = path.join(process.cwd(), 'server', 'bali.db');
export const DB_PATH = dbPath;

const schemaPath = path.join(process.cwd(), 'server', 'schema.sql');
const seedPath = path.join(process.cwd(), 'server', 'seed.sql');

// Vercel Immutable Environment Detection
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
if (isProduction) {
    process.env.DB_OPEN_MODE = 'READONLY';
}

// Allow node module requires matching our strict Vercel directory path limits
const require = createRequire(path.join(process.cwd(), 'server', 'db.js'));

let sqlDb = null;
export let db = {
    all(_sql, _params, cb) { cb && cb(new Error('DB not initialized')); },
    get(_sql, _params, cb) { cb && cb(new Error('DB not initialized')); },
    exec(_sql, cb) { cb && cb(new Error('DB not initialized')); }
};

export async function initDb() {
    if (sqlDb) return db; // already initialized

    try {
        const initSqlJs = require('./sql.js/sql-wasm.cjs');
        const actualInit = initSqlJs.default || initSqlJs.initSqlJs || initSqlJs;
        
        const SQL = await actualInit({
            locateFile: (file) => {
                return path.join(process.cwd(), 'server', 'sql.js', file);
            }
        });

        if (fs.existsSync(dbPath)) {
            const fileBuffer = fs.readFileSync(dbPath);
            sqlDb = new SQL.Database(new Uint8Array(fileBuffer));
            console.log('Loaded database from', dbPath);
        } else {
            sqlDb = new SQL.Database();
            console.log('Initialized in-memory database (no file found)');
        }

        function rowsFromExecResult(resultArray) {
            if (!resultArray || !Array.isArray(resultArray) || resultArray.length === 0) return [];
            const res = resultArray[0];
            if (!res) return [];
            const cols = res.columns || [];
            const vals = res.values || [];
            if (!Array.isArray(vals)) return [];
            return vals.map(v => {
                const obj = {};
                for (let i = 0; i < cols.length; i++) obj[cols[i]] = v[i];
                return obj;
            });
        }

        function persistIfWritable() {
            if (process.env.DB_OPEN_MODE === 'READONLY' || isProduction) return;
            try {
                const data = sqlDb.export();
                fs.writeFileSync(dbPath, Buffer.from(data));
            } catch (e) {
                console.error('Failed to persist DB to disk:', e);
            }
        }

        db = {
            all(sql, params = [], cb) {
                try {
                    const res = sqlDb.exec(sql);
                    const rows = rowsFromExecResult(res);
                    cb && cb(null, rows);
                } catch (e) {
                    cb && cb(e);
                }
            },
            get(sql, params = [], cb) {
                try {
                    const res = sqlDb.exec(sql);
                    const rows = rowsFromExecResult(res);
                    cb && cb(null, rows[0] || undefined);
                } catch (e) {
                    cb && cb(e);
                }
            },
            exec(sql, cb) {
                try {
                    sqlDb.run(sql);
                    persistIfWritable();
                    cb && cb(null);
                } catch (e) {
                    cb && cb(e);
                }
            }
        };

        // Apply schema if present
        if (fs.existsSync(schemaPath)) {
            try {
                const schema = fs.readFileSync(schemaPath, 'utf8');
                sqlDb.run(schema);
                persistIfWritable();
                console.log('Database schema applied.');
            } catch (e) {
                console.error('Error applying schema:', e.message || e);
            }
        }

        // Seed if empty
        try {
            const countRes = sqlDb.exec('SELECT COUNT(*) as count FROM products');
            const rows = rowsFromExecResult(countRes);
            const count = rows[0]?.count || 0;
            if (count === 0 && fs.existsSync(seedPath)) {
                console.log('Seeding database from', seedPath);
                const seedSql = fs.readFileSync(seedPath, 'utf8');
                sqlDb.run(seedSql);
                persistIfWritable();
                console.log('Database seeded successfully.');
            } else if (count > 0) {
                console.log('Database already seeded.');
            } else {
                console.warn('Seed file not found (no seeding)');
            }
        } catch (e) {
            console.error('Error checking/seed database:', e.message || e);
        }

        return db;
    } catch (err) {
        // Vercel Immutable File System fix: Removed all fs.writeFileSync attempts
        // Previously wrote 'db_error.txt' which crashed read-only containers
        console.error('Failed to initialize sql.js-based DB wrapper:', err);
        db = {
            all(_sql, _params, cb) { cb && cb(new Error('DB not available')); },
            get(_sql, _params, cb) { cb && cb(new Error('DB not available')); },
            exec(_sql, cb) { cb && cb(new Error('DB not available')); }
        };
        return db;
    }
}

export default db;
