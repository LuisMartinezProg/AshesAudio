
/**
 * db.js
 * Capa de datos: envuelve IndexedDB en una API basada en promesas.
 * Dos almacenes: "assets" (metadatos) y "takes" (tomas de audio, con el blob).
 */

const DB_NAME = 'ashes_audio_studio';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('assets')) {
        const assets = db.createObjectStore('assets', { keyPath: 'id' });
        assets.createIndex('category', 'category', { unique: false });
        assets.createIndex('status', 'status', { unique: false });
        assets.createIndex('character', 'voiceCharacter', { unique: false });
      }

      if (!db.objectStoreNames.contains('takes')) {
        const takes = db.createObjectStore('takes', { keyPath: 'id' });
        takes.createIndex('assetId', 'assetId', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const DB = {
  // ---- Assets ----
  async getAllAssets() {
    const store = await tx('assets');
    return wrap(store.getAll());
  },
  async getAsset(id) {
    const store = await tx('assets');
    return wrap(store.get(id));
  },
  async putAsset(asset) {
    const store = await tx('assets', 'readwrite');
    await wrap(store.put(asset));
    return asset;
  },
  async deleteAsset(id) {
    const store = await tx('assets', 'readwrite');
    return wrap(store.delete(id));
  },

  // ---- Takes ----
  async getTakesForAsset(assetId) {
    const store = await tx('takes');
    const idx = store.index('assetId');
    return wrap(idx.getAll(assetId));
  },
  async getTake(id) {
    const store = await tx('takes');
    return wrap(store.get(id));
  },
  async putTake(take) {
    const store = await tx('takes', 'readwrite');
    await wrap(store.put(take));
    return take;
  },
  async deleteTake(id) {
    const store = await tx('takes', 'readwrite');
    return wrap(store.delete(id));
  },
  async deleteTakesForAsset(assetId) {
    const takes = await DB.getTakesForAsset(assetId);
    const store = await tx('takes', 'readwrite');
    await Promise.all(takes.map(t => wrap(store.delete(t.id))));
  },

  // ---- Mantenimiento ----
  async getAllTakes() {
    const store = await tx('takes');
    return wrap(store.getAll());
  },
  async exportRaw() {
    const assets = await DB.getAllAssets();
    const takes = await DB.getAllTakes();
    return { assets, takes };
  },
};

window.DB = DB;
