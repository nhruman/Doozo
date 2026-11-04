const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

// Database folder path
const dataDir = path.join(__dirname, "..", "data");

fs.mkdirSync(dataDir, { recursive: true });

// Database file path
const dbPath = path.join(dataDir, "products.db");

// Connect SQLite
const db = new DatabaseSync(dbPath);

// Enable Foreign Keys
db.exec("PRAGMA foreign_keys = ON;");

// Create Products Table
db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL,
        condition TEXT,
        location TEXT,
        image_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// Add status column if it does not exist
const productColumns = db.prepare(
    "PRAGMA table_info(products)"
).all();

if (!productColumns.some(column => column.name === "status")) {
    db.exec(`
        ALTER TABLE products
        ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    `);
}

// Migration for existing database
const columns = db.prepare(
    "PRAGMA table_info(products)"
).all();

if (!columns.some(column => column.name === "user_id")) {
    db.exec(`
        ALTER TABLE products
        ADD COLUMN user_id TEXT
    `);
}

// Create Product Images Table
db.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON DELETE CASCADE
    );
`);

console.log("SQLite Database Connected!");
console.log("Products Table Ready!");
console.log("Product Images Table Ready!");

// Export database
module.exports = db;