
/**
 * taxonomy.js
 * Estructura fija del proyecto de audio, enumeraciones y utilidades puras.
 * Sin dependencias de DOM ni de IndexedDB: solo datos y funciones de apoyo.
 */

// Categorías principales del árbol del proyecto (jerarquía fija pedida en el brief).
const CATEGORIES = [
  { id: 'npc',        label: 'NPCs',              group: 'Personajes', color: '#E8542C' },
  { id: 'enemigos',   label: 'Enemigos',          group: 'Personajes', color: '#E8542C' },
  { id: 'jefes',      label: 'Jefes',             group: 'Personajes', color: '#E8542C' },
  { id: 'habilidades',label: 'Habilidades',       group: null,         color: '#2BB3A3' },
  { id: 'armas',      label: 'Armas',             group: null,         color: '#2BB3A3' },
  { id: 'ambientes',  label: 'Ambientes',         group: null,         color: '#4C8BF5' },
  { id: 'musica',     label: 'Música',            group: null,         color: '#C792EA' },
  { id: 'cinematicas',label: 'Cinemáticas',       group: null,         color: '#E8542C' },
  { id: 'interfaz',   label: 'Interfaz',          group: null,         color: '#8A8F98' },
  { id: 'eventos',    label: 'Eventos especiales',group: null,         color: '#F2C14E' },
];

const CATEGORY_GROUPS = ['Personajes']; // categorías que se agrupan visualmente bajo un encabezado

function getCategory(id) {
  return CATEGORIES.find(c => c.id === id) || null;
}

function categoryColor(id) {
  const c = getCategory(id);
  return c ? c.color : '#8A8F98';
}

function categoryLabel(id) {
  const c = getCategory(id);
  return c ? c.label : id;
}

// Emociones sugeridas para dirección de actuación de voz (lista abierta vía datalist).
const EMOTIONS = [
  'Alegría', 'Tristeza', 'Furia', 'Miedo', 'Sorpresa', 'Calma',
  'Determinación', 'Desesperación', 'Orgullo', 'Burla', 'Dolor',
  'Esperanza', 'Amenaza', 'Nostalgia', 'Neutral',
];

const PRIORITIES = [
  { id: 'baja',    label: 'Baja' },
  { id: 'media',   label: 'Media' },
  { id: 'alta',    label: 'Alta' },
  { id: 'critica', label: 'Crítica' },
];

const STATUSES = [
  { id: 'pendiente', label: 'Pendiente', color: '#8A8F98' },
  { id: 'grabado',   label: 'Grabado',   color: '#4C8BF5' },
  { id: 'aprobado',  label: 'Aprobado',  color: '#3FBF6F' },
  { id: 'faltante',  label: 'Faltante',  color: '#E8542C' },
];

function statusInfo(id) {
  return STATUSES.find(s => s.id === id) || STATUSES[0];
}

// Subcategorías de ambiente (capas combinables).
const AMBIENT_TYPES = ['Bosque', 'Ciudad', 'Mazmorra', 'Castillo', 'Tormenta', 'Noche', 'Combate'];

// Subcategorías de efectos de sonido.
const SFX_TYPES = ['Espadas', 'Magia', 'Fuego', 'Hielo', 'Electricidad', 'Impactos', 'Pasos', 'UI'];

// Subcategorías de música.
const MUSIC_TYPES = ['Regional', 'Combate', 'Jefe', 'Cinemática', 'Menú', 'Tema principal'];

// ---------- Utilidades puras ----------

function uid(prefix = '') {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-5);
  return `${prefix}${prefix ? '_' : ''}${time}${rand}`;
}

function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'asset';
}

function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '--:--';
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function debounce(fn, wait = 200) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// Export global (sin módulos ES, para máxima compatibilidad con GitHub Pages + carga por <script>).
window.Taxonomy = {
  CATEGORIES, CATEGORY_GROUPS, EMOTIONS, PRIORITIES, STATUSES,
  AMBIENT_TYPES, SFX_TYPES, MUSIC_TYPES,
  getCategory, categoryColor, categoryLabel, statusInfo,
  uid, slugify, formatDuration, formatDate, debounce, clamp,
};
