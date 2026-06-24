
/**
 * app.js
 * Controlador de la aplicación: enrutado por hash, estado de UI,
 * delegación de eventos y orquestación entre Store, Recorder, UI y Export.
 */

const AppState = {
  route: 'dashboard',
  filters: { text: '', category: '', status: '', emotion: '', character: '', chapter: '', tag: '', minDuration: null, maxDuration: null },
  filterPanelOpen: false,
  exportSelected: new Set(),
  mixer: {}, // assetId -> HTMLAudioElement
  recorder: null, // { assetId, status, blob, mimeType, duration, responsible, observations }
};

let previousRoute = null;
const $ = (id) => document.getElementById(id);

// ---------------- Router ----------------

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [route, param] = h.split('/');
  return { route: route || 'dashboard', param };
}

function navigate(hash) {
  if (location.hash === hash) { render(true); return; }
  location.hash = hash;
}

function updateNavActive(route) {
  document.querySelectorAll('.bottomnav button').forEach(b => {
    b.classList.toggle('active', b.dataset.route === route);
  });
}

function render(resetScroll) {
  const { route, param } = parseHash();

  if (previousRoute === 'mixer' && route !== 'mixer') stopAllMixerAudio();
  previousRoute = route;
  AppState.route = route;
  updateNavActive(route);

  let html = '';
  if (route === 'dashboard') html = UI.viewDashboard();
  else if (route === 'library') { AppState.filters._open = AppState.filterPanelOpen; html = UI.viewLibrary(AppState.filters); }
  else if (route === 'asset') html = UI.viewAssetEditor(param === 'new' ? null : param);
  else if (route === 'mixer') html = UI.viewMixer();
  else if (route === 'export') html = UI.viewExport(AppState.exportSelected);
  else html = UI.viewDashboard();

  $('app-main').innerHTML = html;

  const filterPanel = document.querySelector('.filter-panel');
  if (filterPanel) filterPanel.addEventListener('toggle', (e) => { AppState.filterPanelOpen = e.target.open; });

  $('fab-root').innerHTML = route === 'library'
    ? `<button class="fab" data-action="new-asset" aria-label="Nuevo asset">${UI.ICN.plus}</button>`
    : '';

  if (resetScroll) window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => render(true));

// ---------------- Asset form ----------------

function getFormData() {
  const tags = $('a-tags').value.split(',').map(s => s.trim()).filter(Boolean);
  return {
    name: $('a-name').value.trim(),
    id: $('a-id').value.trim(),
    category: $('a-category').value,
    description: $('a-description').value.trim(),
    tags,
    priority: $('a-priority').value,
    status: $('a-status').value,
    suggestedVolume: parseFloat($('a-volume').value),
    loop: $('a-loop').checked,
    voiceCharacter: $('a-voiceCharacter').value.trim(),
    voiceEmotion: $('a-voiceEmotion').value.trim(),
    voiceIntensity: parseInt($('a-voiceIntensity').value, 10),
    voiceContext: $('a-voiceContext').value.trim(),
    voiceSituation: $('a-voiceSituation').value.trim(),
    narrChapter: $('a-narrChapter').value.trim(),
    narrMission: $('a-narrMission').value.trim(),
    narrScene: $('a-narrScene').value.trim(),
    narrEvent: $('a-narrEvent').value.trim(),
    musicType: $('a-musicType').value,
    musicDuration: $('a-musicDuration').value,
    musicEmotionalState: $('a-musicEmotionalState').value.trim(),
    musicIntensity: parseInt($('a-musicIntensity').value, 10),
    musicUsageLocation: $('a-musicUsageLocation').value.trim(),
    ambientType: $('a-ambientType').value,
    ambientLayerable: $('a-ambientLayerable').checked,
    sfxType: $('a-sfxType').value,
  };
}

async function handleSaveAsset() {
  const data = getFormData();
  if (!data.name) { UI.toast('Ponle un nombre al asset'); return; }
  const form = $('asset-form');
  const existingId = form.dataset.assetId;
  try {
    if (existingId) {
      const patch = { ...data };
      delete patch.id;
      await Store.updateAsset(existingId, patch);
      UI.toast('Asset guardado');
      render(false);
    } else {
      const asset = await Store.createAsset(data);
      UI.toast('Asset creado');
      navigate(`#/asset/${asset.id}`);
    }
  } catch (err) {
    UI.toast('Error al guardar: ' + err.message);
  }
}

async function handleDeleteAsset(id) {
  if (!confirm('¿Eliminar este asset y todas sus tomas grabadas? Esta acción no se puede deshacer.')) return;
  await Store.deleteAsset(id);
  UI.toast('Asset eliminado');
  navigate('#/library');
}

// ---------------- Grabador ----------------

function openRecorder(assetId) {
  AppState.recorder = { assetId, status: 'idle', responsible: '', observations: '' };
  renderRecorderModal();
}

function renderRecorderModal() {
  const st = AppState.recorder;
  if (!st) { $('modal-root').innerHTML = ''; return; }
  $('modal-root').innerHTML = UI.recorderModalHTML(st);

  if (st.status === 'review') {
    $('rec-play-btn').addEventListener('click', () => Recorder.play(st.blob));
  } else {
    $('rec-toggle-btn').addEventListener('click', handleRecToggle);
  }
}

async function handleRecToggle() {
  const st = AppState.recorder;
  if (!st) return;
  if (st.status === 'idle') {
    st.status = 'recording';
    renderRecorderModal();
    const canvas = $('rec-canvas');
    try {
      await Recorder.start(canvas);
    } catch (err) {
      UI.toast('No se pudo acceder al micrófono');
      st.status = 'idle';
      renderRecorderModal();
    }
  } else if (st.status === 'recording') {
    const { blob, mimeType } = await Recorder.stop();
    const duration = await Recorder.getBlobDuration(blob);
    Recorder.releaseMic();
    st.status = 'review';
    st.blob = blob;
    st.mimeType = mimeType;
    st.duration = duration;
    renderRecorderModal();
  }
}

function handleRerecord() {
  const st = AppState.recorder;
  if (!st) return;
  st.status = 'idle';
  st.blob = null;
  renderRecorderModal();
}

function closeRecorder() {
  Recorder.cancel();
  Recorder.releaseMic();
  Recorder.stopPlayback();
  AppState.recorder = null;
  $('modal-root').innerHTML = '';
}

async function handleSaveTake() {
  const st = AppState.recorder;
  if (!st || !st.blob) return;
  const responsible = $('rec-responsible').value.trim();
  const observations = $('rec-observations').value.trim();
  await Store.addTake(st.assetId, { blob: st.blob, mimeType: st.mimeType, duration: st.duration, responsible, observations });
  UI.toast('Toma guardada');
  closeRecorder();
  render(false);
}

async function handleSetActiveTake(assetId, takeId) {
  await Store.setActiveTake(assetId, takeId);
  UI.toast('Toma activa actualizada');
  render(false);
}

async function handleDeleteTake(takeId) {
  if (!confirm('¿Eliminar esta toma?')) return;
  await Store.deleteTake(takeId);
  UI.toast('Toma eliminada');
  render(false);
}

function handlePreviewTake(takeId) {
  const take = Store.getTakeById(takeId);
  if (take) Recorder.play(take.blob);
}

// ---------------- Mezclador ----------------

function stopAllMixerAudio() {
  Object.values(AppState.mixer).forEach(audio => { audio.pause(); });
  AppState.mixer = {};
}

function handleMixerToggle(assetId) {
  const btn = document.querySelector(`[data-mix-row="${assetId}"] .mix-toggle`);
  if (AppState.mixer[assetId]) {
    AppState.mixer[assetId].pause();
    delete AppState.mixer[assetId];
    if (btn) { btn.classList.remove('playing'); btn.innerHTML = UI.ICN.play; }
    return;
  }
  const take = Store.getActiveTake(assetId);
  if (!take) { UI.toast('Este ambiente no tiene audio grabado'); return; }
  const row = document.querySelector(`[data-mix-row="${assetId}"] input[type=range]`);
  const audio = Recorder.play(take.blob, () => {
    delete AppState.mixer[assetId];
    if (btn) { btn.classList.remove('playing'); btn.innerHTML = UI.ICN.play; }
  });
  audio.loop = true;
  audio.volume = row ? parseFloat(row.value) : 0.8;
  AppState.mixer[assetId] = audio;
  if (btn) { btn.classList.add('playing'); btn.innerHTML = UI.ICN.pause; }
}

function handleMixerVolume(inputEl) {
  const assetId = inputEl.dataset.asset;
  if (AppState.mixer[assetId]) AppState.mixer[assetId].volume = parseFloat(inputEl.value);
}

// ---------------- Exportar ----------------

function updateExportChrome() {
  const total = Store.list().length;
  const hint = document.querySelector('.export-summary .hint');
  if (hint) hint.textContent = `${AppState.exportSelected.size} de ${total} seleccionados`;
  const count = document.querySelector('.view-title .count');
  if (count) count.textContent = `${AppState.exportSelected.size} seleccionados`;
  const btn = $('export-run-btn');
  if (btn) btn.disabled = AppState.exportSelected.size === 0;
}

function handleExportCheck(id, checked) {
  if (checked) AppState.exportSelected.add(id); else AppState.exportSelected.delete(id);
  updateExportChrome();
}

function selectAllAudio() {
  AppState.exportSelected = new Set(Store.list().filter(a => Store.getActiveTake(a.id)).map(a => a.id));
  render(false);
}

function selectNone() {
  AppState.exportSelected.clear();
  render(false);
}

async function handleExportRun() {
  const ids = Array.from(AppState.exportSelected);
  if (!ids.length) return;
  const assets = ids.map(id => Store.getAsset(id)).filter(Boolean);
  UI.toast('Generando paquete…');
  try {
    const blob = await ExportModule.exportAssets(assets);
    const stamp = new Date().toISOString().slice(0, 10);
    ExportModule.downloadBlob(blob, `ashes-audio-export-${stamp}.zip`);
    UI.toast('Exportación lista — descarga iniciada');
  } catch (err) {
    UI.toast('Error al exportar: ' + err.message);
  }
}

// ---------------- Filtros de biblioteca ----------------

const debouncedLibraryRender = Taxonomy.debounce(() => render(false), 220);

function readLibraryFilters() {
  const num = (v) => (v === '' || v == null ? null : parseFloat(v));
  AppState.filters.status = $('f-status') ? $('f-status').value : AppState.filters.status;
  AppState.filters.emotion = $('f-emotion') ? $('f-emotion').value : AppState.filters.emotion;
  AppState.filters.character = $('f-character') ? $('f-character').value : AppState.filters.character;
  AppState.filters.chapter = $('f-chapter') ? $('f-chapter').value : AppState.filters.chapter;
  AppState.filters.tag = $('f-tag') ? $('f-tag').value : AppState.filters.tag;
  AppState.filters.minDuration = $('f-min-dur') ? num($('f-min-dur').value) : AppState.filters.minDuration;
  AppState.filters.maxDuration = $('f-max-dur') ? num($('f-max-dur').value) : AppState.filters.maxDuration;
}

function clearFilters() {
  AppState.filters = { text: '', category: '', status: '', emotion: '', character: '', chapter: '', tag: '', minDuration: null, maxDuration: null };
  render(false);
}

// ---------------- Delegación de eventos ----------------

document.addEventListener('click', (e) => {
  const navBtn = e.target.closest('.bottomnav button');
  if (navBtn) { navigate(`#/${navBtn.dataset.route}`); return; }

  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;

  switch (action) {
    case 'new-asset': navigate('#/asset/new'); break;
    case 'open-asset': navigate(`#/asset/${t.dataset.id}`); break;
    case 'back-to-library': navigate('#/library'); break;
    case 'set-category-filter': AppState.filters.category = t.dataset.id; render(false); break;
    case 'clear-filters': clearFilters(); break;
    case 'save-asset': handleSaveAsset(); break;
    case 'delete-asset': handleDeleteAsset(t.dataset.id); break;
    case 'open-recorder': openRecorder(t.dataset.asset); break;
    case 'close-recorder': closeRecorder(); break;
    case 'rerecord': handleRerecord(); break;
    case 'save-take': handleSaveTake(); break;
    case 'set-active-take': handleSetActiveTake(t.dataset.asset, t.dataset.take); break;
    case 'delete-take': handleDeleteTake(t.dataset.take); break;
    case 'preview-take': handlePreviewTake(t.dataset.take); break;
    case 'mixer-toggle': handleMixerToggle(t.dataset.asset); break;
    case 'select-all-audio': selectAllAudio(); break;
    case 'select-none': selectNone(); break;
    case 'export-run': handleExportRun(); break;
    default: break;
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'a-category') { openRelevantAccordions(t.value); return; }
  if (t.dataset && t.dataset.action === 'export-check') {
    handleExportCheck(t.dataset.id, t.checked);
    return;
  }
  if (t.id && t.id.startsWith('f-')) { readLibraryFilters(); render(false); }
});

function openRelevantAccordions(cat) {
  const relevant = {
    voice: ['npc', 'enemigos', 'jefes', 'cinematicas', 'eventos'].includes(cat),
    narrative: ['cinematicas', 'eventos', 'npc', 'enemigos', 'jefes'].includes(cat),
    music: cat === 'musica',
    ambient: cat === 'ambientes',
    sfx: ['armas', 'habilidades', 'interfaz', 'eventos'].includes(cat),
  };
  Object.entries(relevant).forEach(([key, shouldOpen]) => {
    if (!shouldOpen) return;
    const el = document.querySelector(`details[data-accordion="${key}"]`);
    if (el) el.open = true;
  });
}

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'a-volume') { $('a-volume-val').textContent = t.value; return; }
  if (t.id === 'a-voiceIntensity') { $('a-voiceIntensity-val').textContent = t.value; return; }
  if (t.id === 'a-musicIntensity') { $('a-musicIntensity-val').textContent = t.value; return; }
  if (t.id === 'search-input') { AppState.filters.text = t.value; debouncedLibraryRender(); return; }
  if (t.dataset && t.dataset.action === 'mixer-volume') { handleMixerVolume(t); return; }
  if (t.id === 'f-min-dur' || t.id === 'f-max-dur') { readLibraryFilters(); debouncedLibraryRender(); }
});

// ---------------- Service worker + arranque ----------------

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => { /* offline-first es opcional */ });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Store.init();
  } catch (err) {
    console.error(err);
    UI.toast('Error iniciando la base de datos local');
  }
  if (!location.hash) location.hash = '#/dashboard';
  render(true);
  registerSW();
});
