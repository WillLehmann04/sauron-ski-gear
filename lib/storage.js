const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function read(collection) {
  const fp = filePath(collection);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function write(collection, data) {
  fs.writeFileSync(filePath(collection), JSON.stringify(data, null, 2));
}

module.exports = { read, write };
