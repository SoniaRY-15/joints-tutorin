const os = require('node:os');
const path = require('node:path');
const { openStorage } = require('../backend/src/storage');
const { createApp } = require('../backend/src/app');

let appPromise;

function getApp() {
  if (!appPromise) {
    const dataFile = process.env.DATA_FILE || path.join(os.tmpdir(), 'tutorin-vercel.json');
    appPromise = openStorage(dataFile).then((storage) => createApp(storage));
  }
  return appPromise;
}

module.exports = async (req, res) => {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error('API gagal dimulai:', error.message);
    return res.status(500).json({ message: 'Server belum dapat memproses permintaan. Coba kembali.' });
  }
};
