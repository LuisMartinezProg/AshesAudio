
/**
 * ui.js
 * Capa de presentación: iconos en línea, componentes reutilizables y
 * plantillas de cada vista. Estas funciones devuelven *strings* de HTML;
 * la capa de control (app.js) decide cuándo montarlas y maneja eventos
 * por delegación.
 */

const ICN = {
  dashboard: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 19V11"/><path d="M12 19V5"/><path d="M19 19v-7"/></svg>`,
  library: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/></svg>`,
  mixer: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 5v14"/><circle cx="6" cy="9" r="2.3" fill="currentColor" stroke="none"/><path d="M12 5v14"/><circle cx="12" cy="16" r="2.3" fill="currentColor" stroke="none"/><path d="M18 5v14"/><circle cx="18" cy="11" r="2.3" fill="currentColor" stroke="none"/></svg>`,
  export: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><path d="M4 18h16"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.3-4.3"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
  back: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7"/></svg>`,
  play: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><path d="M7 5l13 7-13 7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3"/></svg>`,
};

function esc(s) {
  return (s ?? '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg) {
  const root = document.getElementById('toast-root');
  root.innerHTML = '';
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = msg;
  root.appendChild(node);
  setTimeout(() => { if (node.parentNode === root) node.remove(); }, 2400);
}

function ledMeter(pct, color) {
  const segs = 12;
  const on = Math.round((Taxonomy.clamp(pct, 0, 100) / 100) * segs);
  let html = `<div class="led-meter" style="--mc:${color || 'var(--amber)'}">`;
  for (let i = 0; i < segs; i++) html += `<div class="seg ${i < on ? 'on' : ''}"></div>`;
  html += `</div>`;
  return html;
}

function meterRow(label, total, done, color) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `
    <div class="meter-row">
      <div class="meter-label"><strong>${esc(label)}</strong><span class="pct">${done}/${total} · ${pct}%</span></div>
      ${ledMeter(pct, color)}
    </div>`;
}

function statusBadge(statusId) {
  const s = Taxonomy.statusInfo(statusId);
  return `<span class="badge status" style="border-color:${s.color};color:${s.color}">${esc(s.label)}</span>`;
}

function categoryChipRow(activeCategory) {
  const cats = Taxonomy.CATEGORIES;
  let html = `<div class="chip-row" id="category-chip-row">`;
  html += `<button class="chip ${!activeCategory ? 'active' : ''}" data-action="set-category-filter" data-id="">Todas</button>`;
  cats.forEach(c => {
    html += `<button class="chip ${activeCategory === c.id ? 'active' : ''}" style="--cc:${c.color}" data-action="set-category-filter" data-id="${c.id}"><span class="dot"></span>${esc(c.label)}</button>`;
  });
  html += `</div>`;
  return html;
}

function assetCard(asset) {
  const cat = Taxonomy.getCategory(asset.category);
  const take = Store.getActiveTake(asset.id);
  const tagsHtml = (asset.tags || []).slice(0, 4).map(t => `<span class="badge">#${esc(t)}</span>`).join('');
  const voiceHtml = asset.voiceCharacter
    ? `<span class="badge">${esc(asset.voiceCharacter)}${asset.voiceEmotion ? ' · ' + esc(asset.voiceEmotion) : ''}</span>` : '';
  const chapterHtml = asset.narrChapter ? `<span class="badge">${esc(asset.narrChapter)}</span>` : '';
  const durHtml = take ? `<span class="badge">${Taxonomy.formatDuration(take.duration)}</span>` : '';

  return `
  <div class="slate-card" data-asset-card="${esc(asset.id)}">
    <div class="slate-band" style="--cc:${cat ? cat.color : '#8A8F98'}"></div>
    <div class="slate-body">
      <div class="slate-row1">
        <div class="slate-name">${esc(asset.name || '(sin nombre)')}</div>
        <div class="slate-id">${esc(asset.id)}</div>
      </div>
      ${asset.description ? `<div class="slate-desc">${esc(asset.description)}</div>` : ''}
      <div class="slate-meta">
        ${statusBadge(asset.status)}
        <span class="badge">${esc(cat ? cat.label : asset.category)}</span>
        ${voiceHtml}${chapterHtml}${durHtml}${tagsHtml}
      </div>
      <div class="slate-actions">
        ${take ? `<button class="btn small" data-action="preview-take" data-take="${take.id}">${ICN.play} Reproducir</button>` : ''}
        <button class="btn small" data-action="open-recorder" data-asset="${esc(asset.id)}">${ICN.mic} Grabar</button>
        <button class="btn small ghost" data-action="open-asset" data-id="${esc(asset.id)}">Editar</button>
      </div>
    </div>
  </div>`;
}

function emptyState(text) {
  return `<div class="empty-state"><div class="em-mark"></div><p>${esc(text)}</p></div>`;
}

// ---------------- Vistas ----------------

function viewDashboard() {
  const s = Store.stats();
  const grabadosAprobados = (s.byStatus.grabado || 0) + (s.byStatus.aprobado || 0);
  let html = `<div class="view-title">Dashboard del director de sonido</div>`;
  html += `
    <div class="stat-grid">
      <div class="stat-card"><div class="num">${s.total}</div><div class="lbl">Total assets</div></div>
      <div class="stat-card"><div class="num" style="color:var(--green)">${grabadosAprobados}</div><div class="lbl">Grabados/Aprobados</div></div>
      <div class="stat-card"><div class="num" style="color:var(--gray)">${s.byStatus.pendiente || 0}</div><div class="lbl">Pendientes</div></div>
      <div class="stat-card"><div class="num" style="color:var(--amber)">${s.byStatus.faltante || 0}</div><div class="lbl">Faltantes</div></div>
    </div>`;

  html += `<div class="section-h">Progreso por categoría</div>`;
  const catsWithData = s.byCategory.filter(c => c.total > 0);
  if (catsWithData.length === 0) {
    html += emptyState('Aún no hay assets. Crea el primero desde la Biblioteca.');
  } else {
    catsWithData.forEach(c => { html += meterRow(c.label, c.total, c.done, c.color); });
  }

  if (s.byCharacter.length) {
    html += `<div class="section-h">Progreso por personaje</div>`;
    s.byCharacter.slice(0, 8).forEach(c => { html += meterRow(c.name, c.total, c.done, 'var(--amber)'); });
  }

  if (s.byChapter.length) {
    html += `<div class="section-h">Progreso por capítulo / misión</div>`;
    s.byChapter.forEach(c => { html += meterRow(c.name, c.total, c.done, 'var(--blue)'); });
  }

  return html;
}

function viewLibrary(filters) {
  const assets = Store.filterAssets(filters)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  let html = `<div class="view-title">Biblioteca <span class="count">${assets.length}</span></div>`;
  html += `
    <div class="search-bar">
      ${ICN.search}
      <input type="text" id="search-input" placeholder="Buscar por nombre, ID, personaje, etiqueta…" value="${esc(filters.text || '')}">
    </div>`;
  html += categoryChipRow(filters.category);

  const chars = Store.allCharacters();
  const chapters = Store.allChapters();
  const tags = Store.allTags();

  html += `
    <details class="filter-panel" ${filters._open ? 'open' : ''}>
      <summary>Filtros avanzados ▾</summary>
      <div class="filter-grid">
        <div class="field">
          <label>Estado</label>
          <select id="f-status">
            <option value="">Todos</option>
            ${Taxonomy.STATUSES.map(s => `<option value="${s.id}" ${filters.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Emoción</label>
          <select id="f-emotion">
            <option value="">Todas</option>
            ${Taxonomy.EMOTIONS.map(e => `<option ${filters.emotion === e ? 'selected' : ''}>${e}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Personaje</label>
          <select id="f-character">
            <option value="">Todos</option>
            ${chars.map(c => `<option ${filters.character === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Capítulo / misión</label>
          <select id="f-chapter">
            <option value="">Todos</option>
            ${chapters.map(c => `<option ${filters.chapter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Etiqueta</label>
          <select id="f-tag">
            <option value="">Todas</option>
            ${tags.map(t => `<option ${filters.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Duración mín./máx. (seg)</label>
          <div class="field-row">
            <input type="number" id="f-min-dur" placeholder="min" value="${filters.minDuration ?? ''}">
            <input type="number" id="f-max-dur" placeholder="max" value="${filters.maxDuration ?? ''}">
          </div>
        </div>
        <button class="btn small ghost" data-action="clear-filters" style="grid-column:1/-1">Limpiar filtros</button>
      </div>
    </details>`;

  if (assets.length === 0) {
    html += emptyState('No hay assets que coincidan. Ajusta los filtros o crea uno nuevo con el botón +.');
  } else {
    assets.forEach(a => { html += assetCard(a); });
  }
  return html;
}

function accordionField(category, asset) {
  const cat = category;
  const v = asset;
  const isVoice = ['npc', 'enemigos', 'jefes', 'cinematicas', 'eventos'].includes(cat);
  const isNarr = ['cinematicas', 'eventos', 'npc', 'enemigos', 'jefes'].includes(cat);
  const isMusic = cat === 'musica';
  const isAmbient = cat === 'ambientes';
  const isSfx = ['armas', 'habilidades', 'interfaz', 'eventos'].includes(cat);

  let html = '';

  html += `
  <details class="accordion" data-accordion="general" open>
    <summary>Datos generales</summary>
    <div class="accordion-body">
      <div class="field"><label>Nombre</label><input type="text" id="a-name" value="${esc(v.name)}" placeholder="Ej. Grito de batalla — Rey Vortan"></div>
      <div class="field"><label>ID</label><input type="text" id="a-id" value="${esc(v.id)}" placeholder="se genera automáticamente" ${v.createdAt ? 'readonly' : ''}>
        <div class="hint">${v.createdAt ? 'El ID no se puede cambiar después de crear el asset.' : 'Déjalo en blanco para generarlo a partir del nombre.'}</div></div>
      <div class="field"><label>Categoría</label>
        <select id="a-category">
          ${Taxonomy.CATEGORIES.map(c => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${c.group ? c.group + ' / ' : ''}${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Descripción</label><textarea id="a-description" placeholder="Para qué se usa este audio en el juego">${esc(v.description)}</textarea></div>
      <div class="field"><label>Etiquetas (separadas por coma)</label><input type="text" id="a-tags" value="${esc((v.tags || []).join(', '))}" placeholder="combate, jefe, capitulo3"></div>
      <div class="field-row">
        <div class="field"><label>Prioridad</label>
          <select id="a-priority">${Taxonomy.PRIORITIES.map(p => `<option value="${p.id}" ${v.priority === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Estado</label>
          <select id="a-status">${Taxonomy.STATUSES.map(s => `<option value="${s.id}" ${v.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
        </div>
      </div>
      <div class="field"><label>Volumen sugerido — <span id="a-volume-val">${v.suggestedVolume}</span></label>
        <input type="range" id="a-volume" min="0" max="1" step="0.05" value="${v.suggestedVolume}"></div>
      <div class="checkrow field"><input type="checkbox" id="a-loop" ${v.loop ? 'checked' : ''}><label for="a-loop" style="margin:0">Reproducir en loop</label></div>
    </div>
  </details>`;

  html += `
  <details class="accordion" data-accordion="voice" ${isVoice ? 'open' : ''}>
    <summary>Dirección de actuación de voz</summary>
    <div class="accordion-body">
      <div class="field"><label>Personaje</label><input type="text" id="a-voiceCharacter" value="${esc(v.voiceCharacter)}" placeholder="Ej. Rey Vortan"></div>
      <div class="field"><label>Emoción</label>
        <input type="text" id="a-voiceEmotion" list="emotion-list" value="${esc(v.voiceEmotion)}" placeholder="Ej. Furia">
        <datalist id="emotion-list">${Taxonomy.EMOTIONS.map(e => `<option value="${e}">`).join('')}</datalist>
      </div>
      <div class="field"><label>Intensidad emocional — <span id="a-voiceIntensity-val">${v.voiceIntensity}</span>/10</label>
        <input type="range" id="a-voiceIntensity" min="1" max="10" step="1" value="${v.voiceIntensity}"></div>
      <div class="field"><label>Contexto narrativo</label><textarea id="a-voiceContext" placeholder="Qué está pasando en la escena">${esc(v.voiceContext)}</textarea></div>
      <div class="field"><label>Situación de uso</label><input type="text" id="a-voiceSituation" value="${esc(v.voiceSituation)}" placeholder="Ej. Declaración de guerra"></div>
    </div>
  </details>`;

  html += `
  <details class="accordion" data-accordion="narrative" ${cat === 'cinematicas' ? 'open' : ''}>
    <summary>Ubicación narrativa / cinemática</summary>
    <div class="accordion-body">
      <div class="field-row">
        <div class="field"><label>Capítulo</label><input type="text" id="a-narrChapter" value="${esc(v.narrChapter)}" placeholder="Capítulo 3"></div>
        <div class="field"><label>Misión</label><input type="text" id="a-narrMission" value="${esc(v.narrMission)}" placeholder="Misión 7"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Escena</label><input type="text" id="a-narrScene" value="${esc(v.narrScene)}" placeholder="Cinemática de la invasión"></div>
        <div class="field"><label>Evento</label><input type="text" id="a-narrEvent" value="${esc(v.narrEvent)}" placeholder="Llegada del jefe"></div>
      </div>
    </div>
  </details>`;

  html += `
  <details class="accordion" data-accordion="music" ${isMusic ? 'open' : ''}>
    <summary>Música</summary>
    <div class="accordion-body">
      <div class="field"><label>Tipo</label>
        <select id="a-musicType"><option value="">—</option>${Taxonomy.MUSIC_TYPES.map(t => `<option ${v.musicType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      <div class="field-row">
        <div class="field"><label>Duración (seg)</label><input type="number" id="a-musicDuration" value="${esc(v.musicDuration)}"></div>
        <div class="field"><label>Intensidad — <span id="a-musicIntensity-val">${v.musicIntensity}</span>/10</label><input type="range" id="a-musicIntensity" min="1" max="10" value="${v.musicIntensity}"></div>
      </div>
      <div class="field"><label>Estado emocional</label><input type="text" id="a-musicEmotionalState" value="${esc(v.musicEmotionalState)}" placeholder="Ej. Tenso, heroico, melancólico"></div>
      <div class="field"><label>Ubicación de uso</label><input type="text" id="a-musicUsageLocation" value="${esc(v.musicUsageLocation)}" placeholder="Ej. Combate contra jefe final"></div>
    </div>
  </details>`;

  html += `
  <details class="accordion" data-accordion="ambient" ${isAmbient ? 'open' : ''}>
    <summary>Ambiente</summary>
    <div class="accordion-body">
      <div class="field"><label>Tipo de ambiente</label>
        <select id="a-ambientType"><option value="">—</option>${Taxonomy.AMBIENT_TYPES.map(t => `<option ${v.ambientType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      <div class="checkrow field"><input type="checkbox" id="a-ambientLayerable" ${v.ambientLayerable ? 'checked' : ''}><label for="a-ambientLayerable" style="margin:0">Disponible para combinar en el Mezclador</label></div>
    </div>
  </details>`;

  html += `
  <details class="accordion" data-accordion="sfx" ${isSfx ? 'open' : ''}>
    <summary>Efecto de sonido</summary>
    <div class="accordion-body">
      <div class="field"><label>Tipo de efecto</label>
        <select id="a-sfxType"><option value="">—</option>${Taxonomy.SFX_TYPES.map(t => `<option ${v.sfxType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
    </div>
  </details>`;

  return html;
}

function takesListHTML(assetId) {
  const takes = Store.getTakes(assetId).slice().reverse();
  const asset = Store.getAsset(assetId);
  if (!takes.length) return emptyState('Sin tomas todavía. Graba la primera toma con el botón de abajo.');
  return takes.map(t => `
    <div class="take-row ${asset.activeTakeId === t.id ? 'is-active' : ''}">
      <div class="take-num">T${t.takeNumber}</div>
      <div class="take-info">
        <div class="take-obs">${esc(t.observations) || '<span style=\"color:var(--text-dim)\">Sin observaciones</span>'}</div>
        <div class="take-date">${Taxonomy.formatDate(t.date)} · ${Taxonomy.formatDuration(t.duration)} · ${esc(t.responsible) || 'Sin responsable'}</div>
      </div>
      <div class="take-actions">
        <button data-action="preview-take" data-take="${t.id}" title="Reproducir">${ICN.play}</button>
        <button data-action="set-active-take" data-asset="${esc(assetId)}" data-take="${t.id}" title="Usar como activa">${ICN.check}</button>
        <button data-action="delete-take" data-take="${t.id}" title="Eliminar">${ICN.trash}</button>
      </div>
    </div>`).join('');
}

function viewAssetEditor(assetId) {
  const isNew = !assetId;
  const asset = isNew ? Store.blankAsset() : Store.getAsset(assetId);
  if (!asset) return emptyState('Este asset ya no existe.');

  let html = `
    <div class="view-title">
      <button class="icon-btn" data-action="back-to-library" style="margin-right:4px">${ICN.back}</button>
      ${isNew ? 'Nuevo asset' : 'Editar asset'}
    </div>`;

  html += `<form id="asset-form" data-asset-id="${esc(asset.id)}">`;
  html += accordionField(asset.category, asset);
  html += `</form>`;

  if (!isNew) {
    html += `<div class="section-h">Tomas de grabación</div>`;
    html += `<div id="takes-list">${takesListHTML(asset.id)}</div>`;
    html += `<button class="btn full" data-action="open-recorder" data-asset="${esc(asset.id)}" style="margin-bottom:16px">${ICN.mic} Grabar nueva toma</button>`;
  } else {
    html += `<div class="hint" style="margin:4px 0 16px;color:var(--text-dim);font-size:12px">Guarda el asset para poder grabar tomas de audio.</div>`;
  }

  html += `<button class="btn primary full" data-action="save-asset" style="margin-bottom:10px">Guardar asset</button>`;
  if (!isNew) {
    html += `<button class="btn danger full" data-action="delete-asset" data-id="${esc(asset.id)}">Eliminar asset</button>`;
  }
  return html;
}

function recorderModalHTML(state) {
  const asset = Store.getAsset(state.assetId);
  const title = asset ? asset.name || asset.id : '';

  if (state.status === 'review') {
    return `
      <div class="modal-backdrop" data-action="noop">
        <div class="modal-sheet">
          <h2>Revisar toma — ${esc(title)}</h2>
          <div class="rec-review-player">
            <button class="btn" id="rec-play-btn">${ICN.play} Escuchar</button>
            <span class="badge">${Taxonomy.formatDuration(state.duration)}</span>
          </div>
          <div class="field"><label>Responsable</label><input type="text" id="rec-responsible" value="${esc(state.responsible || '')}" placeholder="Quién grabó esta toma"></div>
          <div class="field"><label>Observaciones</label><textarea id="rec-observations" placeholder="Notas sobre esta toma">${esc(state.observations || '')}</textarea></div>
          <button class="btn primary full" data-action="save-take" style="margin-bottom:8px">Guardar toma</button>
          <button class="btn full" data-action="rerecord">Volver a grabar</button>
          <button class="btn ghost full" data-action="close-recorder" style="margin-top:8px">Descartar y cerrar</button>
        </div>
      </div>`;
  }

  const recording = state.status === 'recording';
  return `
    <div class="modal-backdrop" data-action="noop">
      <div class="modal-sheet">
        <h2>Grabar toma — ${esc(title)}</h2>
        <div class="rec-canvas-wrap"><canvas id="rec-canvas" width="600" height="90"></canvas></div>
        <div class="rec-status">${recording ? 'GRABANDO…' : 'Listo para grabar'}</div>
        <div class="rec-controls">
          <button class="rec-button ${recording ? 'recording' : ''}" id="rec-toggle-btn"><span class="dot"></span></button>
        </div>
        <button class="btn ghost full" data-action="close-recorder">Cancelar</button>
      </div>
    </div>`;
}

function viewMixer() {
  const assets = Store.list().filter(a => a.category === 'ambientes' && Store.getActiveTake(a.id));
  let html = `<div class="view-title">Mezclador de ambientes</div>`;
  html += `<div class="hint" style="color:var(--text-dim);font-size:12px;margin-bottom:14px">Combina varias capas de ambiente al mismo tiempo y ajusta su volumen para previsualizar la atmósfera de una escena.</div>`;
  if (!assets.length) {
    html += emptyState('Aún no hay ambientes grabados. Crea assets de categoría "Ambientes" y grábales una toma.');
    return html;
  }
  assets.forEach(a => {
    html += `
      <div class="mix-row" data-mix-row="${esc(a.id)}">
        <div class="mix-top">
          <div>
            <div class="mix-name">${esc(a.name)}</div>
            <div class="hint" style="color:var(--text-dim);font-size:11px">${esc(a.ambientType || '—')}</div>
          </div>
          <button class="mix-toggle" data-action="mixer-toggle" data-asset="${esc(a.id)}">${ICN.play}</button>
        </div>
        <input type="range" min="0" max="1" step="0.05" value="${a.suggestedVolume}" data-action="mixer-volume" data-asset="${esc(a.id)}">
      </div>`;
  });
  return html;
}

function viewExport(selected) {
  const assets = Store.list().slice().sort((a, b) => a.id < b.id ? -1 : 1);
  const withAudio = assets.filter(a => Store.getActiveTake(a.id));
  let html = `<div class="view-title">Exportar paquete <span class="count">${selected.size} seleccionados</span></div>`;
  html += `<div class="hint" style="color:var(--text-dim);font-size:12px;margin-bottom:10px">Genera un .zip con los audios (toma activa) organizados por categoría + metadata.json listo para integrar en el juego.</div>`;
  html += `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn small" data-action="select-all-audio">Seleccionar con audio (${withAudio.length})</button>
      <button class="btn small ghost" data-action="select-none">Ninguno</button>
    </div>`;

  if (!assets.length) {
    html += emptyState('No hay assets en el proyecto todavía.');
  } else {
    assets.forEach(a => {
      const has = Store.getActiveTake(a.id);
      html += `
        <label class="export-row">
          <input type="checkbox" data-action="export-check" data-id="${esc(a.id)}" ${selected.has(a.id) ? 'checked' : ''}>
          <span class="ex-name">${esc(a.name || a.id)}</span>
          ${has ? `<span class="badge" style="color:var(--green);border-color:var(--green)">audio</span>` : `<span class="badge">sin audio</span>`}
          <span class="badge">${esc(Taxonomy.categoryLabel(a.category))}</span>
        </label>`;
    });
  }

  html += `
    <div class="export-summary">
      <span class="hint" style="font-size:12px">${selected.size} de ${assets.length} seleccionados</span>
      <button class="btn primary" id="export-run-btn" data-action="export-run" ${selected.size ? '' : 'disabled'}>${ICN.export} Exportar .zip</button>
    </div>`;
  return html;
}

window.UI = {
  ICN, esc, toast, ledMeter, meterRow, statusBadge, categoryChipRow, assetCard, emptyState,
  viewDashboard, viewLibrary, viewAssetEditor, recorderModalHTML, viewMixer, viewExport,
  takesListHTML,
};
