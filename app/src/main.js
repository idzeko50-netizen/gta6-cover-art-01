// Wires Vice Cover Studio: photos, layouts, grades, caption, panel pan/zoom
// and export. The cover the preview shows is the cover the PNG holds —
// export draws the same state through drawCover at the full export size.
// A `?shot=` query sets up a fixed scene for a screenshot instead (shots.js).

import { drawCover, LAYOUTS, GRADES, SIZES, panelsForLayout } from './cover.js';
import { runShot } from './shots.js';

const MAX_PHOTOS = 6;
const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const taglineInput = document.getElementById('tagline');
const status = document.getElementById('status');
const zoomSlider = document.getElementById('zoom');
const photosTray = document.getElementById('photos');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('photo');

const state = {
  layout: 'trio',
  grade: 'sunset',
  size: 'square',
  caption: 'Sunset Heist',
  tagline: 'Vice City · Summer',
  photos: [],
  panels: panelsForLayout('trio', []),
  selectedPanel: 0,
  selectedPhoto: -1,
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function redraw() {
  const size = SIZES[state.size];
  // A cover-alone screenshot scene renders at the full export size; the
  // editor preview renders at a smaller size for speed.
  const previewW = document.body.classList.contains('shot-cover') ? size.w : 540;
  const previewH = Math.round((previewW * size.h) / size.w);
  if (canvas.width !== previewW || canvas.height !== previewH) {
    canvas.width = previewW;
    canvas.height = previewH;
  }
  drawCover(canvas, state);
  syncZoomSlider();
}

function syncZoomSlider() {
  const panel = state.panels[state.selectedPanel];
  zoomSlider.value = String(panel ? panel.zoom : 1);
}

/** Rebuilds the photo tray: one slot per photo, plus an empty slot to add more. */
function renderPhotos() {
  photosTray.replaceChildren();
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot';
    button.setAttribute('aria-pressed', String(state.selectedPhoto === i));
    button.title = photo.name;
    const thumb = document.createElement('img');
    thumb.src = photo.url;
    thumb.alt = photo.name;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = photo.name;
    button.append(thumb, tag);
    button.addEventListener('click', () => {
      state.selectedPhoto = i;
      renderPhotos();
      const panel = state.panels[state.selectedPanel];
      if (panel) {
        panel.photo = i;
        redraw();
      }
    });
    photosTray.append(button);
  });
  if (state.photos.length < MAX_PHOTOS) {
    const empty = document.createElement('button');
    empty.type = 'button';
    empty.className = 'slot empty';
    empty.textContent = '+';
    empty.title = 'Add a photo';
    empty.addEventListener('click', () => fileInput.click());
    photosTray.append(empty);
  }
}

/** Builds a row of toggle buttons from a { id: { label } } map. */
function buildToggles(containerId, options, current, onPick) {
  const container = document.getElementById(containerId);
  Object.entries(options).forEach(([id, option]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.label;
    button.setAttribute('aria-pressed', String(current === id));
    button.addEventListener('click', () => {
      onPick(id);
      container.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
    });
    container.append(button);
  });
}

buildToggles('layouts', LAYOUTS, state.layout, (id) => {
  state.layout = id;
  state.panels = panelsForLayout(id, state.panels);
  state.selectedPanel = 0;
  redraw();
});
buildToggles('grades', GRADES, state.grade, (id) => {
  state.grade = id;
  redraw();
});
buildToggles('sizes', SIZES, state.size, (id) => {
  state.size = id;
  redraw();
});

/** Adds image files as photos, up to the tray's limit. */
async function addFiles(files) {
  for (const file of files) {
    if (state.photos.length >= MAX_PHOTOS) break;
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      state.photos.push({ img, url, name: file.name.replace(/\.[^.]+$/, '') });
      state.selectedPhoto = state.photos.length - 1;
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  renderPhotos();
  redraw();
}

/** Loads one of the bundled sample photos into the tray. */
async function addSample(name) {
  if (state.photos.length >= MAX_PHOTOS) return;
  const url = `samples/${name}.jpg`;
  const img = await loadImage(url);
  state.photos.push({ img, url, name });
  state.selectedPhoto = state.photos.length - 1;
  renderPhotos();
  redraw();
}

fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';
});
document.getElementById('add-photo').addEventListener('click', () => fileInput.click());
document.getElementById('sample-boulevard').addEventListener('click', () => addSample('boulevard'));
document.getElementById('sample-pier').addEventListener('click', () => addSample('pier'));
dropzone.addEventListener('click', (e) => {
  if (e.target === dropzone) fileInput.click();
});
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('over');
  addFiles(e.dataTransfer.files);
});

document.getElementById('fill-all').addEventListener('click', () => {
  if (state.selectedPhoto < 0) {
    status.textContent = 'Pick a photo first, then fill all panels with it.';
    return;
  }
  state.panels.forEach((panel) => { panel.photo = state.selectedPhoto; });
  redraw();
});
document.getElementById('remove-photo').addEventListener('click', () => {
  const i = state.selectedPhoto;
  if (i < 0) return;
  const removed = state.photos.splice(i, 1)[0];
  if (removed.url.startsWith('blob:')) URL.revokeObjectURL(removed.url);
  state.panels.forEach((panel) => {
    if (panel.photo === i) panel.photo = -1;
    else if (panel.photo > i) panel.photo -= 1;
  });
  state.selectedPhoto = state.photos.length ? 0 : -1;
  renderPhotos();
  redraw();
});
document.getElementById('reset-crop').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.zoom = 1;
  panel.dx = 0;
  panel.dy = 0;
  redraw();
});
document.getElementById('clear-panel').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.photo = -1;
  redraw();
});
zoomSlider.addEventListener('input', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.zoom = Number(zoomSlider.value);
  redraw();
});
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
taglineInput.addEventListener('input', () => {
  state.tagline = taglineInput.value;
  redraw();
});

/** Which panel, if any, a point on the preview canvas falls in. */
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  const layout = LAYOUTS[state.layout];
  const i = layout.panels.findIndex(([x, y, w, h]) => fx >= x && fx < x + w && fy >= y && fy < y + h);
  return i < 0 ? layout.panels.length - 1 : i;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  state.selectedPanel = panelAt(e.clientX, e.clientY);
  const panel = state.panels[state.selectedPanel];
  if (!panel || panel.photo < 0) {
    redraw();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  drag = { x: e.clientX, y: e.clientY, dx: panel.dx, dy: panel.dy, scale };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.dx = drag.dx + (e.clientX - drag.x) * drag.scale;
  panel.dy = drag.dy + (e.clientY - drag.y) * drag.scale;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selectedPanel];
  if (!panel || panel.photo < 0) return;
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
  redraw();
}, { passive: false });

/** Renders the cover at an export size and returns its PNG as a data URL. */
export function exportPNG(sizeId) {
  const size = SIZES[sizeId] ?? SIZES[state.size];
  const offscreen = document.createElement('canvas');
  offscreen.width = size.w;
  offscreen.height = size.h;
  drawCover(offscreen, state);
  return new Promise((resolve) => offscreen.toBlob((blob) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  }, 'image/png'));
}

document.getElementById('export').addEventListener('click', async () => {
  const size = SIZES[state.size];
  const dataUrl = await exportPNG(state.size);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `vice-cover-${size.w}x${size.h}.png`;
  a.click();
  status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
});

// Test and screenshot hook: the same export the button runs, as a data URL.
window.__vice = { state, exportPNG, redraw };

// A fixed scene for screenshots: ?shot=editor loads the samples and arranges
// a cover; ?shot=cover shows the cover alone, full-window.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    loadImage,
    applyScene: async (scene) => {
      if (scene.layout) {
        state.layout = scene.layout;
        state.panels = panelsForLayout(scene.layout, state.panels);
      }
      if (scene.grade) state.grade = scene.grade;
      if (scene.size) state.size = scene.size;
      if (scene.caption !== undefined) {
        state.caption = scene.caption;
        captionInput.value = scene.caption;
      }
      if (scene.tagline !== undefined) {
        state.tagline = scene.tagline;
        taglineInput.value = scene.tagline;
      }
      for (const name of scene.photos ?? []) {
        if (state.photos.some((p) => p.name === name)) continue;
        const url = `samples/${name}.jpg`;
        const img = await loadImage(url);
        state.photos.push({ img, url, name });
      }
      (scene.panelPhotos ?? []).forEach((photoIndex, i) => {
        if (state.panels[i]) state.panels[i].photo = photoIndex;
      });
      (scene.panelCrops ?? []).forEach((crop, i) => {
        if (state.panels[i]) Object.assign(state.panels[i], crop);
      });
      state.selectedPhoto = state.photos.length ? 0 : -1;
      renderPhotos();
      redraw();
    },
  });
} else {
  renderPhotos();
  redraw();
}
