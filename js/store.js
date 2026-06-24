/**
 * store.js
 * Estado de la aplicación en memoria + lógica de negocio.
 * Hace de puente entre la UI y la capa de datos (db.js).
 */

const Store = (() => {
  let assets = [];          // cache en memoria
  let takesByAsset = {};    // { assetId: [take, ...] }

  async function init() {
    assets = await DB.getAllAssets();
    const allTakes = await DB.getAllTakes();
    takesByAsset = {};
    allTakes.forEach(t => {
      (takesByAsset[t.assetId] = takesByAsset[t.assetId] || []).push(t);
    });
    Object.values(takesByAsset).forEach(list => list.sort((a, b) => a.takeNumber - b.takeNumber));
  }

  function list() {
    return assets.slice();
  }

  function getAsset(id) {
    return assets.find(a => a.id === id) || null;
  }

  function getTakes(assetId) {
    return (takesByAsset[assetId] || []).slice();
  }

  function getActiveTake(assetId) {
    const asset = getAsset(assetId);
    if (!asset || !asset.activeTakeId) return null;
    return (takesByAsset[assetId] || []).find(t => t.id === asset.activeTakeId) || null;
  }

  function getTakeById(takeId) {
    for (const list of Object.values(takesByAsset)) {
      const found = list.find(t => t.id === takeId);
      if (found) return found;
    }
    return null;
  }

  function blankAsset(category) {
    return {
      id: '', name: '', description: '', category: category || 'npc', tags: [],
      voiceCharacter: '', voiceEmotion: '', voiceContext: '', voiceIntensity: 5, voiceSituation: '',
      narrChapter: '', narrMission: '', narrScene: '', narrEvent: '',
      musicType: '', musicDuration: '', musicEmotionalState: '', musicIntensity: 5, musicUsageLocation: '',
      ambientType: '', ambientLayerable: false,
      sfxType: '',
      priority: 'media', suggestedVolume: 0.8, loop: false,
      status: 'pendiente', activeTakeId: null,
      createdAt: null, updatedAt: null,
    };
  }

  async function createAsset(data) {
    const now = new Date().toISOString();
    let id = Taxonomy.slugify(data.id || data.name);
    let candidate = id, n = 2;
    while (assets.some(a => a.id === candidate)) { candidate = `${id}_${n++}`; }
    const asset = { ...blankAsset(data.category), ...data, id: candidate, createdAt: now, updatedAt: now };
    await DB.putAsset(asset);
    assets.push(asset);
    return asset;
  }

  async function updateAsset(id, patch) {
    const asset = getAsset(id);
    if (!asset) throw new Error('Asset no encontrado: ' + id);
    Object.assign(asset, patch, { updatedAt: new Date().toISOString() });
    await DB.putAsset(asset);
    return asset;
  }

  async function deleteAsset(id) {
    await DB.deleteAsset(id);
    await DB.deleteTakesForAsset(id);
    assets = assets.filter(a => a.id !== id);
    delete takesByAsset[id];
  }

  async function addTake(assetId, { blob, mimeType, duration, responsible, observations }) {
    const list = takesByAsset[assetId] || [];
    const take = {
      id: Taxonomy.uid('take'),
      assetId,
      blob,
      mimeType,
      duration: duration || 0,
      date: new Date().toISOString(),
      responsible: responsible || '',
      observations: observations || '',
      takeNumber: list.length + 1,
    };
    await DB.putTake(take);
    takesByAsset[assetId] = [...list, take];

    const asset = getAsset(assetId);
    if (asset) {
      const patch = { activeTakeId: take.id };
      if (asset.status === 'pendiente' || asset.status === 'faltante') patch.status = 'grabado';
      await updateAsset(assetId, patch);
    }
    return take;
  }

  async function setActiveTake(assetId, takeId) {
    await updateAsset(assetId, { activeTakeId: takeId });
  }

  async function deleteTake(takeId) {
    const take = await DB.getTake(takeId);
    if (!take) return;
    await DB.deleteTake(takeId);
    takesByAsset[take.assetId] = (takesByAsset[take.assetId] || []).filter(t => t.id !== takeId);

    const asset = getAsset(take.assetId);
    if (asset && asset.activeTakeId === takeId) {
      const remaining = takesByAsset[take.assetId] || [];
      const next = remaining[remaining.length - 1] || null;
      await updateAsset(take.assetId, {
        activeTakeId: next ? next.id : null,
        status: next ? asset.status : 'pendiente',
      });
    }
  }

  // ---------- Filtros ----------
  function filterAssets(filters = {}) {
    const f = filters;
    return assets.filter(a => {
      if (f.text) {
        const hay = `${a.name} ${a.description} ${a.id} ${(a.tags || []).join(' ')} ${a.voiceCharacter}`.toLowerCase();
        if (!hay.includes(f.text.toLowerCase())) return false;
      }
      if (f.category && a.category !== f.category) return false;
      if (f.status && a.status !== f.status) return false;
      if (f.character && !(a.voiceCharacter || '').toLowerCase().includes(f.character.toLowerCase())) return false;
      if (f.emotion && a.voiceEmotion !== f.emotion) return false;
      if (f.chapter && a.narrChapter !== f.chapter) return false;
      if (f.tag && !(a.tags || []).includes(f.tag)) return false;
      if (f.minDuration != null) {
        const dur = getActiveTake(a.id)?.duration ?? (parseFloat(a.musicDuration) || 0);
        if (dur < f.minDuration) return false;
      }
      if (f.maxDuration != null) {
        const dur = getActiveTake(a.id)?.duration ?? (parseFloat(a.musicDuration) || 0);
        if (dur > f.maxDuration) return false;
      }
      return true;
    });
  }

  function allTags() {
    const set = new Set();
    assets.forEach(a => (a.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }

  function allCharacters() {
    const set = new Set();
    assets.forEach(a => { if (a.voiceCharacter) set.add(a.voiceCharacter); });
    return Array.from(set).sort();
  }

  function allChapters() {
    const set = new Set();
    assets.forEach(a => { if (a.narrChapter) set.add(a.narrChapter); });
    return Array.from(set).sort();
  }

  // ---------- Estadísticas para el dashboard ----------
  function stats() {
    const total = assets.length;
    const byStatus = {};
    Taxonomy.STATUSES.forEach(s => byStatus[s.id] = 0);
    assets.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

    const byCategory = Taxonomy.CATEGORIES.map(c => {
      const items = assets.filter(a => a.category === c.id);
      const done = items.filter(a => a.status === 'grabado' || a.status === 'aprobado').length;
      return { ...c, total: items.length, done, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
    });

    const charMap = {};
    assets.forEach(a => {
      if (!a.voiceCharacter) return;
      charMap[a.voiceCharacter] = charMap[a.voiceCharacter] || { name: a.voiceCharacter, total: 0, done: 0 };
      charMap[a.voiceCharacter].total++;
      if (a.status === 'grabado' || a.status === 'aprobado') charMap[a.voiceCharacter].done++;
    });
    const byCharacter = Object.values(charMap).map(c => ({ ...c, pct: Math.round((c.done / c.total) * 100) }))
      .sort((a, b) => b.total - a.total);

    const chapMap = {};
    assets.forEach(a => {
      if (!a.narrChapter) return;
      chapMap[a.narrChapter] = chapMap[a.narrChapter] || { name: a.narrChapter, total: 0, done: 0 };
      chapMap[a.narrChapter].total++;
      if (a.status === 'grabado' || a.status === 'aprobado') chapMap[a.narrChapter].done++;
    });
    const byChapter = Object.values(chapMap).map(c => ({ ...c, pct: Math.round((c.done / c.total) * 100) }))
      .sort((a, b) => (a.name > b.name ? 1 : -1));

    return { total, byStatus, byCategory, byCharacter, byChapter };
  }

  return {
    init, list, getAsset, getTakes, getActiveTake, getTakeById, blankAsset,
    createAsset, updateAsset, deleteAsset,
    addTake, setActiveTake, deleteTake,
    filterAssets, allTags, allCharacters, allChapters, stats,
  };
})();

window.Store = Store;
