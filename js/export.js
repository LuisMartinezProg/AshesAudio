
/**
 * export.js
 * Empaqueta el proyecto (o una selección) en un .zip:
 *   /audio/<categoria>/<id>.<ext>
 *   metadata.json  (array con todos los metadatos + referencia de archivo)
 * Usa JSZip (cargado por CDN en index.html).
 */

const ExportModule = (() => {
  function extFromMime(mime) {
    if (!mime) return 'webm';
    if (mime.includes('mp4')) return 'm4a';
    if (mime.includes('ogg')) return 'ogg';
    return 'webm';
  }

  function buildMetadataEntry(asset, take) {
    const filename = take ? `${asset.id}.${extFromMime(take.mimeType)}` : null;
    return {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      category: asset.category,
      tags: asset.tags || [],
      priority: asset.priority,
      volume: asset.suggestedVolume,
      loop: !!asset.loop,
      status: asset.status,
      voiceDirection: asset.voiceCharacter ? {
        character: asset.voiceCharacter,
        emotion: asset.voiceEmotion,
        context: asset.voiceContext,
        intensity: asset.voiceIntensity,
        situation: asset.voiceSituation,
      } : null,
      narrative: (asset.narrChapter || asset.narrMission || asset.narrScene || asset.narrEvent) ? {
        chapter: asset.narrChapter, mission: asset.narrMission,
        scene: asset.narrScene, event: asset.narrEvent,
      } : null,
      music: asset.category === 'musica' ? {
        type: asset.musicType, duration: asset.musicDuration,
        emotionalState: asset.musicEmotionalState, intensity: asset.musicIntensity,
        usageLocation: asset.musicUsageLocation,
      } : null,
      ambient: asset.category === 'ambientes' ? {
        type: asset.ambientType, layerable: !!asset.ambientLayerable,
      } : null,
      sfx: asset.sfxType ? { type: asset.sfxType } : null,
      take: take ? {
        takeNumber: take.takeNumber, date: take.date, duration: take.duration,
        responsible: take.responsible, observations: take.observations,
      } : null,
      file: filename,
    };
  }

  async function exportAssets(assetList, { onProgress } = {}) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip no está disponible (revisa tu conexión a internet).');
    }
    const zip = new JSZip();
    const metadata = [];
    let i = 0;

    for (const asset of assetList) {
      const take = Store.getActiveTake(asset.id);
      const entry = buildMetadataEntry(asset, take);
      metadata.push(entry);
      if (take && take.blob) {
        const folder = `audio/${asset.category}`;
        zip.file(`${folder}/${entry.file}`, take.blob);
      }
      i++;
      if (onProgress) onProgress(i, assetList.length);
    }

    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    const readme = [
      '# Ashes Audio Studio — Export',
      '',
      `Generado: ${new Date().toLocaleString('es-CO')}`,
      `Assets incluidos: ${assetList.length}`,
      `Assets con audio grabado: ${metadata.filter(m => m.file).length}`,
      '',
      'Estructura:',
      '  audio/<categoria>/<id>.<ext>   -> archivos de audio (toma activa de cada asset)',
      '  metadata.json                  -> metadatos completos para integrar en el juego',
    ].join('\n');
    zip.file('LEEME.txt', readme);

    const blob = await zip.generateAsync({ type: 'blob' }, (meta) => {
      if (onProgress) onProgress(null, null, meta.percent);
    });
    return blob;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return { exportAssets, downloadBlob };
})();

window.ExportModule = ExportModule;
