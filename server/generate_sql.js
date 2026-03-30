import fs from 'fs';

const seedData = fs.readFileSync('server/seed.sql', 'utf8');

const output = `
-- Supabase Schema Translation 

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon_name TEXT,
    color_code TEXT
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    description_ar TEXT,
    long_description TEXT,
    category_id INTEGER REFERENCES categories(id),
    image_url TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    ingredients JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE product_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

CREATE TABLE tables (
    id SERIAL PRIMARY KEY,
    table_number TEXT NOT NULL UNIQUE,
    capacity INTEGER,
    status TEXT DEFAULT 'available'
);

-- Insert Categories
${seedData.match(/INSERT INTO categories.*?;\s*/s)[0]}

-- Insert Products
${seedData.match(/INSERT INTO products.*?;\s*/s)[0]}

-- Insert Product Prices
${seedData.match(/INSERT INTO product_prices.*?;\s*/s)[0]}

`;

fs.writeFileSync('server/supabase_seed.sql', output);
