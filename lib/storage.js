const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'powval.db');

// Explicit columns per collection: rows stay queryable with real SQL while
// the read/write contract (whole array in, whole array out) is preserved,
// so services need no changes. New collections are added here.
const SCHEMAS = {
  waitlist: ['email', 'name', 'createdAt'],
  shops: ['email', 'name', 'shopName', 'createdAt'],
};

const db = new Database(DB_PATH);
// WAL keeps reads non-blocking during writes and survives crashes cleanly.
db.pragma('journal_mode = WAL');

function assertCollection(collection) {
  if (!SCHEMAS[collection]) {
    throw new Error(`Unknown storage collection: ${collection}`);
  }
}

for (const [collection, cols] of Object.entries(SCHEMAS)) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS ${collection} (${cols.map(c => `${c} TEXT`).join(', ')})`
  );
}

function read(collection) {
  assertCollection(collection);
  const cols = SCHEMAS[collection];
  return db
    .prepare(`SELECT ${cols.join(', ')} FROM ${collection}`)
    .all()
    .map(row => {
      // Old JSON entries used '' for absent fields; keep that contract.
      for (const c of cols) if (row[c] == null) row[c] = '';
      return row;
    });
}

const writeAll = db.transaction((collection, data) => {
  const cols = SCHEMAS[collection];
  db.prepare(`DELETE FROM ${collection}`).run();
  const insert = db.prepare(
    `INSERT INTO ${collection} (${cols.join(', ')}) VALUES (${cols.map(c => `@${c}`).join(', ')})`
  );
  for (const entry of data) {
    const row = {};
    for (const c of cols) row[c] = entry[c] != null ? String(entry[c]) : null;
    insert.run(row);
  }
});

function write(collection, data) {
  assertCollection(collection);
  writeAll(collection, data);
}

// One-time import from the JSON files this module replaces. Runs at startup;
// originals are renamed to *.imported (never deleted) so a bad import can be
// inspected or rolled back by hand.
function importLegacyJson() {
  for (const collection of Object.keys(SCHEMAS)) {
    const jsonPath = path.join(DATA_DIR, `${collection}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    const count = db.prepare(`SELECT COUNT(*) AS n FROM ${collection}`).get().n;
    if (count > 0) {
      console.warn(
        `storage: ${collection}.json present but table already has ${count} rows — leaving file untouched`
      );
      continue;
    }

    const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (rows.length) writeAll(collection, rows);
    fs.renameSync(jsonPath, `${jsonPath}.imported`);
    console.log(`storage: imported ${rows.length} ${collection} rows from JSON into SQLite`);
  }
}

importLegacyJson();

module.exports = { read, write };
