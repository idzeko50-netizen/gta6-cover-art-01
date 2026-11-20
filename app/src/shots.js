// Fixed scenes for screenshots. `?shot=editor` shows the editor with the
// sample photos loaded and a cover arranged; `?shot=cover` shows the cover
// alone, full-window. Query params pick the scene: layout, grade, size,
// caption, tagline, photo, photo2 (sample names). window.__shotReady is set
// once the scene has painted.

/** The editor scene: a trio cover with both samples loaded. */
function editorScene(query) {
  return {
    layout: query.get('layout') ?? 'trio',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'square',
    caption: query.get('caption') ?? 'Sunset Heist',
    tagline: query.get('tagline') ?? 'Vice City · Summer',
    photos: [query.get('photo') ?? 'boulevard', query.get('photo2') ?? 'pier'],
    panelPhotos: [0, 1, 0],
    panelCrops: [{ zoom: 1.15, dx: 0, dy: -18 }, { zoom: 1.2, dx: 0, dy: 0 }, { zoom: 1.3, dx: 10, dy: 0 }],
  };
}

/** The cover-alone scene: the same cover, no editor chrome. */
function coverScene(query) {
  return {
    layout: query.get('layout') ?? 'trio',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'square',
    caption: query.get('caption') ?? 'Sunset Heist',
    tagline: query.get('tagline') ?? 'Vice City · Summer',
    photos: [query.get('photo') ?? 'pier', query.get('photo2') ?? 'boulevard'],
    panelPhotos: [0, 1, 1, 0],
    panelCrops: [{ zoom: 1.1, dx: 0, dy: 0 }, { zoom: 1.25, dx: 0, dy: -14 }, { zoom: 1.2, dx: -8, dy: 0 }, { zoom: 1.15, dx: 0, dy: 10 }],
  };
}

export async function runShot(shot, query, hooks) {
  const scene = shot === 'cover' ? coverScene(query) : editorScene(query);
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await hooks.applyScene(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
