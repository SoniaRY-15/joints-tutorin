import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error('API gagal dimulai:', error.message);
    return res.status(500).json({ message: 'Server belum dapat memproses permintaan. Coba kembali.' });
  }
}
