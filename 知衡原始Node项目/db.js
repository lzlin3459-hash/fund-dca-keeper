const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'data', 'store.json');

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return null;
    }
    const data = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading store.json:', err);
    return null;
  }
}

function writeStore(data) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing store.json:', err);
    return false;
  }
}

module.exports = {
  readStore,
  writeStore
};
