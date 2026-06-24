/**
 * diagnostics.js
 * Panel visual para debuguear errores sin DevTools
 */

const Diagnostics = (() => {
  let errors = [];
  let warnings = [];

  function logError(msg, context = '') {
    const full = context ? `${msg} (${context})` : msg;
    errors.push({ msg: full, time: new Date().toLocaleTimeString() });
    console.error(full);
  }

  function logWarn(msg) {
    warnings.push({ msg, time: new Date().toLocaleTimeString() });
    console.warn(msg);
  }

  function show() {
    const html = `
      <div style="
        position: fixed; bottom: 0; left: 0; right: 0; top: 0;
        background: rgba(0,0,0,0.95); z-index: 9999;
        padding: 20px; overflow-y: auto; font-family: monospace; color: #0f0;
      ">
        <h2 style="color:#f00;margin-top:0">🔴 DIAGNÓSTICO</h2>
        
        <div style="margin-bottom:20px">
          <h3 style="color:#ff6600">⚠️ ERRORES (${errors.length})</h3>
          ${errors.length ? errors.map(e => `<div style="color:#f00">[${e.time}] ${e.msg}</div>`).join('') : '<div style="color:#090">Sin errores</div>'}
        </div>

        <div style="margin-bottom:20px">
          <h3 style="color:#ff6600">⚠️ AVISOS (${warnings.length})</h3>
          ${warnings.length ? warnings.map(e => `<div style="color:#ff9">[${e.time}] ${e.msg}</div>`).join('') : '<div style="color:#090">Sin avisos</div>'}
        </div>

        <div style="margin-bottom:20px">
          <h3 style="color:#0af">ℹ️ ESTADO DEL SISTEMA</h3>
          <div>IndexedDB disponible: <span style="color:${window.indexedDB ? '#0f0' : '#f00'}">${window.indexedDB ? 'SÍ' : 'NO'}</span></div>
          <div>Fallback mode activo: <span style="color:${window.DBFallbackMode && window.DBFallbackMode() ? '#f90' : '#0f0'}">${window.DBFallbackMode && window.DBFallbackMode() ? 'SÍ (datos en memoria)' : 'NO (datos persistentes)'}</span></div>
          <div>Assets en memoria: ${window.fallbackAssets ? window.fallbackAssets.length : '?'}</div>
          <div>Tomas en memoria: ${window.fallbackTakes ? window.fallbackTakes.length : '?'}</div>
        </div>

        <button onclick="Diagnostics.hide()" style="
          padding:10px 20px; background:#0f0; color:#000; border:none; cursor:pointer;
          font-weight:bold; font-size:14px
        ">CERRAR</button>
      </div>
    `;
    document.body.innerHTML += html;
  }

  function hide() {
    const panel = document.querySelector('[style*="9999"]');
    if (panel) panel.remove();
  }

  return { logError, logWarn, show, hide, errors, warnings };
})();

window.Diagnostics = Diagnostics;
