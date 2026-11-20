// Vice Cover Studio's renderer: turns photos, a layout, a colour grade and a
// caption into GTA-style multi-panel cover art on any canvas, at any size.
// Pure canvas 2D, no fonts or images fetched from anywhere: lettering uses a
// bold system stack with a painted gradient, outline and shadow, and the
// colour grades are painted gradients over the photos the user loaded.

/** The panel layouts, each panel a [x, y, w, h] box in fractions of the cover. */
export const LAYOUTS = {
  hero: { label: 'Hero', panels: [[0, 0, 1, 1]] },
  duo: { label: 'Duo split', panels: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] },
  trio: {
    label: 'Hero + two',
    panels: [[0, 0, 0.62, 1], [0.62, 0, 0.38, 0.5], [0.62, 0.5, 0.38, 0.5]],
  },
  quad: {
    label: 'Four panels',
    panels: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
  },
};

/** The colour grades: a sunset wash, a neon wash, a dusk wash. */
export const GRADES = {
  sunset: { label: 'Sunset', sky: '#ff7a3c', deep: '#c2185b' },
  neon: { label: 'Neon', sky: '#ff2fb3', deep: '#00e5ff' },
  dusk: { label: 'Dusk', sky: '#7b5cff', deep: '#141b4d' },
};

/** The export sizes the app offers. */
export const SIZES = {
  square: { label: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 x 1350', w: 1080, h: 1350 },
  wide: { label: '1920 x 1080', w: 1920, h: 1080 },
};

/** A fresh panel: no photo yet, fit to its box, unpanned. */
export function freshPanel() {
  return { photo: -1, zoom: 1, dx: 0, dy: 0 };
}

/** Panels for a layout, keeping a photo where the old panel at that index had one. */
export function panelsForLayout(layoutId, oldPanels) {
  const count = LAYOUTS[layoutId].panels.length;
  return Array.from({ length: count }, (_, i) => {
    const panel = freshPanel();
    if (oldPanels && oldPanels[i]) {
      panel.photo = oldPanels[i].photo;
      panel.zoom = oldPanels[i].zoom;
      panel.dx = oldPanels[i].dx;
      panel.dy = oldPanels[i].dy;
    }
    return panel;
  });
}

/** The scale that fits an image over a panel box with no gaps. */
function coverScale(img, pw, ph) {
  return Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
}

/** Keeps a pan inside the photo so the panel never shows empty space. */
export function clampPan(panel, img, pw, ph) {
  const scale = coverScale(img, pw, ph) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const maxX = Math.max(0, (dw - pw) / 2);
  const maxY = Math.max(0, (dh - ph) / 2);
  panel.dx = Math.max(-maxX, Math.min(maxX, panel.dx));
  panel.dy = Math.max(-maxY, Math.min(maxY, panel.dy));
}

/** Draws one photo into one panel box, cropped and positioned by the panel. */
function drawPanelPhoto(ctx, img, panel, x, y, pw, ph) {
  const scale = coverScale(img, pw, ph) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (pw - dw) / 2 + panel.dx, y + (ph - dh) / 2 + panel.dy, dw, dh);
}

/** Paints a grade's wash over a panel box. */
function paintGrade(ctx, grade, x, y, pw, ph) {
  const wash = ctx.createLinearGradient(x, y, x + pw, y + ph);
  wash.addColorStop(0, hexA(grade.sky, 0.1));
  wash.addColorStop(0.55, hexA(grade.sky, 0.04));
  wash.addColorStop(1, hexA(grade.deep, 0.34));
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, pw, ph);
  const glow = ctx.createLinearGradient(x, y, x, y + ph);
  glow.addColorStop(0, hexA(grade.sky, 0.16));
  glow.addColorStop(0.4, hexA(grade.sky, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, pw, ph);
}

/** A hex colour with an alpha channel, as an rgba() string. */
function hexA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Draws the bold caption with a sunset gradient fill, dark outline and shadow. */
function drawCaption(ctx, text, tagline, w, h, grade) {
  const bandH = h * 0.26;
  const bandY = h - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - h * 0.08, 0, h);
  scrim.addColorStop(0, 'rgba(10, 4, 20, 0)');
  scrim.addColorStop(1, 'rgba(10, 4, 20, 0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - h * 0.08, w, h * 0.34);

  const words = (text || '').trim().toUpperCase();
  const fontStack = `'Arial Black', 'Archivo Black', Impact, 'Helvetica Neue', Arial, sans-serif`;
  // Alphabetic baseline, placed by hand: Firefox's 'middle' baseline hangs
  // the glyphs well below the anchor and clips the caption off the foot.
  // The baseline sits 5.5% up from the foot, leaving room for the outline
  // and shadow below it; the caps rise about 0.72em above it.
  let size = 0;
  let captionTop = h;
  if (words) {
    size = h * 0.105;
    ctx.font = `900 ${size}px ${fontStack}`;
    while (ctx.measureText(words).width > w * 0.92 && size > 10) {
      size -= 2;
      ctx.font = `900 ${size}px ${fontStack}`;
    }
    const cx = w / 2;
    const baselineY = h - h * 0.055;
    captionTop = baselineY - size * 0.72;
    const fill = ctx.createLinearGradient(0, baselineY - size, 0, baselineY + size * 0.2);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.55, '#ffe9a8');
    fill.addColorStop(1, grade.sky);
    ctx.save();
    ctx.translate(cx, baselineY);
    ctx.rotate(-0.018);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeStyle = '#14081f';
    ctx.lineWidth = size * 0.17;
    ctx.strokeText(words, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillText(words, 0, 0);
    ctx.restore();
  }

  const tag = (tagline || '').trim().toUpperCase();
  if (tag) {
    let tagSize = h * 0.032;
    ctx.font = `800 ${tagSize}px ${fontStack}`;
    while (ctx.measureText(tag).width > w * 0.8 && tagSize > 8) {
      tagSize -= 1;
      ctx.font = `800 ${tagSize}px ${fontStack}`;
    }
    // Above the caption with a clear gap, or low in the band on its own.
    const ty = words ? captionTop - h * 0.02 : h - h * 0.06;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = tagSize * 0.3;
    ctx.fillText(tag, w / 2, ty);
    ctx.restore();
  }
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * `state` is { layout, grade, caption, tagline, photos, panels } where
 * photos are images (or null) and panels carry { photo, zoom, dx, dy }.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero;
  const gap = Math.max(2, Math.round(w * 0.007));

  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((box, i) => {
    const panel = state.panels[i] ?? freshPanel();
    const x = Math.round(box[0] * w) + (box[0] > 0 ? gap / 2 : 0);
    const y = Math.round(box[1] * h) + (box[1] > 0 ? gap / 2 : 0);
    const pw = Math.round(box[2] * w) - (box[0] > 0 ? gap / 2 : 0) - (box[0] + box[2] < 1 ? gap / 2 : 0);
    const ph = Math.round(box[3] * h) - (box[1] > 0 ? gap / 2 : 0) - (box[1] + box[3] < 1 ? gap / 2 : 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, pw, ph);
    ctx.clip();
    // A photo entry is an image, or an object holding one in `.img`.
    const entry = panel.photo >= 0 ? state.photos[panel.photo] : null;
    const img = entry ? (entry.img ?? entry) : null;
    if (img) {
      clampPan(panel, img, pw, ph);
      drawPanelPhoto(ctx, img, panel, x, y, pw, ph);
    } else {
      const empty = ctx.createLinearGradient(x, y, x + pw, y + ph);
      empty.addColorStop(0, '#3a1c5e');
      empty.addColorStop(1, '#1c0b33');
      ctx.fillStyle = empty;
      ctx.fillRect(x, y, pw, ph);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = `700 ${Math.max(12, Math.round(ph * 0.045))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', x + pw / 2, y + ph / 2);
    }
    paintGrade(ctx, grade, x, y, pw, ph);
    ctx.restore();
  });

  // A thin poster frame and a soft vignette over the whole cover.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(2, Math.round(w * 0.004));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  const vignette = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  drawCaption(ctx, state.caption, state.tagline, w, h, grade);
}
