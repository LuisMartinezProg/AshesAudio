/**
 * db.js
 * Capa de datos: envuelve IndexedDB en una API basada en promesas.
 * Dos almacenes: "assets" (metadatos) y "takes" (tomas de audio, con el blob).
 */

const DB_NAME = 'ashes_audio_studio';
const DB_VERSION = 1;

let dbPromise = null;
let fallbackMode = false; // se activa si IndexedDB no está disponible
let fallbackAssets = [];  // almacén en memoria
let fallbackTakes = [];   // tomas en memoria

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!indexedDB) {
      fallbackMode = true;
      resolve(null);
      return;
    }

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
    req.onerror = () => {
      fallbackMode = true;
      resolve(null);
    };
  });
  return dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => {
    if (!db || fallbackMode) return Promise.resolve(null);
    return Promise.resolve(db.transaction(storeName, mode).objectStore(storeName));
  });
}

function wrap(request) {
  if (!request) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const DB = {
  // ---- Assets ----
  async getAllAssets() {
    if (fallbackMode) return fallbackAssets.slice();
    const store = await tx('assets');
    if (!store) return fallbackAssets.slice();
    return wrap(store.getAll());
  },
  async getAsset(id) {
    if (fallbackMode) return fallbackAssets.find(a => a.id === id) || null;
    const store = await tx('assets');
    if (!store) return fallbackAssets.find(a => a.id === id) || null;
    return wrap(store.get(id));
  },
  async putAsset(asset) {
    if (fallbackMode) {
      const idx = fallbackAssets.findIndex(a => a.id === asset.id);
      if (idx >= 0) fallbackAssets[idx] = asset;
      else fallbackAssets.push(asset);
      return asset;
    }
    const store = await tx('assets', 'readwrite');
    if (!store) {
      const idx = fallbackAssets.findIndex(a => a.id === asset.id);
      if (idx >= 0) fallbackAssets[idx] = asset;
      else fallbackAssets.push(asset);
      return asset;
    }
    await wrap(store.put(asset));
    return asset;
  },
  async deleteAsset(id) {
    if (fallbackMode) {
      fallbackAssets = fallbackAssets.filter(a => a.id !== id);
      return;
    }
    const store = await tx('assets', 'readwrite');
    if (!store) {
      fallbackAssets = fallbackAssets.filter(a => a.id !== id);
      return;
    }
    return wrap(store.delete(id));
  },

  // ---- Takes ----
  async getTakesForAsset(assetId) {
    if (fallbackMode) return fallbackTakes.filter(t => t.assetId === assetId);
    const store = await tx('takes');
    if (!store) return fallbackTakes.filter(t => t.assetId === assetId);
    const idx = store.index('assetId');
    return wrap(idx.getAll(assetId));
  },
  async getTake(id) {
    if (fallbackMode) return fallbackTakes.find(t => t.id === id) || null;
    const store = await tx('takes');
    if (!store) return fallbackTakes.find(t => t.id === id) || null;
    return wrap(store.get(id));
  },
  async putTake(take) {
    if (fallbackMode) {
      const idx = fallbackTakes.findIndex(t => t.id === take.id);
      if (idx >= 0) fallbackTakes[idx] = take;
      else fallbackTakes.push(take);
      return take;
    }
    const store = await tx('takes', 'readwrite');
    if (!store) {
      const idx = fallbackTakes.findIndex(t => t.id === take.id);
      if (idx >= 0) fallbackTakes[idx] = take;
      else fallbackTakes.push(take);
      return take;
    }
    await wrap(store.put(take));
    return take;
  },
  async deleteTake(id) {
    if (fallbackMode) {
      fallbackTakes = fallbackTakes.filter(t => t.id !== id);
      return;
    }
    const store = await tx('takes', 'readwrite');
    if (!store) {
      fallbackTakes = fallbackTakes.filter(t => t.id !== id);
      return;
    }
    return wrap(store.delete(id));
  },
  async deleteTakesForAsset(assetId) {
    if (fallbackMode) {
      fallbackTakes = fallbackTakes.filter(t => t.assetId !== assetId);
      return;
    }
    const takes = await DB.getTakesForAsset(assetId);
    const store = await tx('takes', 'readwrite');
    if (!store) {
      fallbackTakes = fallbackTakes.filter(t => t.assetId !== assetId);
      return;
    }
    await Promise.all(takes.map(t => wrap(store.delete(t.id))));
  },

  // ---- Mantenimiento ----
  async getAllTakes() {
    if (fallbackMode) return fallbackTakes.slice();
    const store = await tx('takes');
    if (!store) return fallbackTakes.slice();
    return wrap(store.getAll());
  },
  async exportRaw() {
    const assets = await DB.getAllAssets();
    const takes = await DB.getAllTakes();
    return { assets, takes };
  },
};

window.DB = DB;
window.DBFallbackMode = () => fallbackMode;
