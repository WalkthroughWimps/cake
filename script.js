const editor = document.querySelector('.editor');
const hub = document.querySelector('.editor-bauble');
const options = document.querySelector('.editor-options');
const panel = document.querySelector('.editor-panel');
const featuredImage = document.querySelector('.featured-cake img');
const storedState = JSON.parse(localStorage.getItem('atelier-cake-appearance') || '{}');
const textToolbar = document.querySelector('#text-toolbar');
const copyEdits = JSON.parse(localStorage.getItem('cake-copy-edits') || '{}');
const poreLayer = document.querySelector('.pore-layer');
const orderOverlay = document.querySelector('#order-overlay');

const menu = {
  root: [['colors', '◐', 'Color'], ['fonts', 'Aa', 'Type'], ['layers', '▧', 'Layers'], ['cakeBlur', '◌', 'Cake blur'], ['history', '↶', 'History']],
  colors: [['cakePreset', '▧', 'Cake type'], ['cakeTint', '◒', 'Cake tint'], ['crust', '▰', 'Crust'], ['icing', '◻', 'Icing'], ['ink', '●', 'Main text'], ['accent', '𝒜', 'Title']],
  fonts: [['fontFamily', '𝓕', 'Font'], ['displaySize', 'A↕', 'Title size'], ['bodySize', 'a↕', 'Body size'], ['weight', 'A+', 'Weight'], ['spacing', 'A↔', 'Spacing']],
  layers: [['icingSoftness', '☁', 'Softness'], ['icingTilt', '╱', 'Tilt'], ['pores', '⋯', 'Pores']],
  cakeBlur: [['blend', '◐', 'Blend'], ['feather', '≋', 'Feather'], ['fill', '●', 'Fill'], ['lineDrift', '↕', 'Line drift'], ['lineFrequency', '⌇', 'Line frequency'], ['lineHold', '―', 'Line hold'], ['ridge', '⌃', 'Top ridges'], ['valley', '⌄', 'Top valleys']],
  history: [['undo', '↶', 'Undo'], ['redo', '↷', 'Redo'], ['historyList', '☷', 'Timeline'], ['petCat', '♧', 'Pet cat']]
};

let activeMenu = 'root';
let moved = false;
let dragTarget = hub;
let startX = 0;
let startY = 0;
let activeText = null;
let pressTimer = null;
let panelSnapshot = null;
let changeHistory = [];
let redoHistory = [];

const clone = (value) => JSON.parse(JSON.stringify(value));
const stateSnapshot = () => clone(storedState);

function restoreState(snapshot) {
  Object.keys(storedState).forEach((key) => delete storedState[key]);
  Object.assign(storedState, clone(snapshot));
  saveState();
  applyState();
  decorateIcing();
}

function commitPanelChange(label) {
  if (!panelSnapshot) return;
  const before = JSON.stringify(panelSnapshot);
  const after = JSON.stringify(storedState);
  if (before !== after) {
    changeHistory.push({ label, state: panelSnapshot });
    redoHistory = [];
    saveState();
  }
  panelSnapshot = null;
}

function saveState() {
  localStorage.setItem('atelier-cake-appearance', JSON.stringify(storedState));
}

function applyState() {
  const root = document.documentElement;
  const title = document.querySelector('#site-name');
  const intro = document.querySelector('#site-intro');
  Object.entries(storedState.colors || {}).forEach(([key, value]) => {
    if (key === 'description') intro.style.color = value;
    else root.style.setProperty(key, value);
  });
  const preset = (storedState.colors || {}).cakePreset;
  if (preset) {
    const presets = {
      redVelvet: ['#8b0f22', 'url("assets/images/backgrounds/red-velvet-crumb-2048.png")'],
      chocolate: ['#4a251a', 'url("assets/images/backgrounds/red-velvet-crumb-2048.png")'],
      lemon: ['#d6b12f', 'url("assets/images/backgrounds/red-velvet-crumb-2048.png")'],
      vanilla: ['#e4c77b', 'url("assets/images/backgrounds/red-velvet-crumb-2048.png")'],
      white: ['#fffdf8', 'url("assets/images/backgrounds/cake-detail-white-derived-v3.png")'],
      carrot: ['#b85a27', 'url("assets/images/backgrounds/red-velvet-crumb-2048.png")']
    };
    const [tint, texture] = presets[preset];
    root.style.setProperty('--cake-tint', tint);
    root.style.setProperty('--cake-texture', texture);
  }
  const type = storedState.type || {};
  if (type.fontFamily) root.style.setProperty('--display-font', type.fontFamily);
  if (type.displaySize) title.style.fontSize = `${type.displaySize}rem`;
  if (type.bodySize) intro.style.fontSize = `${type.bodySize}rem`;
  if (type.weight) title.style.fontWeight = type.weight;
  if (type.spacing) title.style.letterSpacing = `${type.spacing}em`;
  const layers = storedState.layers || {};
  if (layers.icingSoftness !== undefined) root.style.setProperty('--icing-blur', `${layers.icingSoftness}px`);
  if (layers.icingTilt !== undefined) root.style.setProperty('--layer-tilt', `${layers.icingTilt}deg`);
  if (layers.pores !== undefined) root.style.setProperty('--pore-opacity', layers.pores);
  const blur = storedState.blur || {};
  if (blur.blend !== undefined) root.style.setProperty('--cake-contact-blend', blur.blend);
  if (blur.feather !== undefined) root.style.setProperty('--cake-feather', `${blur.feather}px`);
  if (blur.fill !== undefined) root.style.setProperty('--cake-fill-depth', blur.fill);
  if (blur.lineDrift !== undefined) root.style.setProperty('--cake-drift', `${blur.lineDrift}px`);
  if (blur.lineFrequency !== undefined) root.style.setProperty('--cake-frequency', blur.lineFrequency);
  if (blur.lineHold !== undefined) root.style.setProperty('--cake-hold', blur.lineHold);
  if (blur.ridge !== undefined) root.style.setProperty('--cake-ridge', `${blur.ridge}px`);
  if (blur.valley !== undefined) root.style.setProperty('--cake-valley', `${blur.valley}px`);
  const photo = storedState.photo || {};
  if (featuredImage && photo.shape) featuredImage.style.borderRadius = photo.shape;
  if (featuredImage && photo.crop !== undefined) featuredImage.style.objectPosition = `${photo.crop}% center`;
  if (featuredImage && photo.softness !== undefined) featuredImage.style.filter = `blur(${photo.softness}px)`;
  if (featuredImage && photo.swap) featuredImage.src = `assets/images/cakes/cake-${photo.swap}.jpg`;
}

function makeButton([id, icon, label], isControl) {
  return `<button class="${isControl ? 'is-control' : ''}" type="button" data-action="${id}" aria-label="${label}"><span class="icon">${icon}</span>${label}</button>`;
}

function largestFreeArc(radius) {
  const rect = editor.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const free = [];
  for (let angle = 0; angle < 360; angle += 3) {
    const radians = angle * Math.PI / 180;
    const x = centerX + Math.cos(radians) * radius;
    const y = centerY + Math.sin(radians) * radius;
    if (x > 36 && x < innerWidth - 36 && y > 36 && y < innerHeight - 36) free.push(angle);
  }
  const arcs = [];
  free.forEach((angle) => {
    const previous = arcs.at(-1);
    if (previous && angle === previous.at(-1) + 3) previous.push(angle);
    else arcs.push([angle]);
  });
  if (arcs.length > 1 && arcs[0][0] === 0 && arcs.at(-1).at(-1) === 357) {
    arcs[0] = arcs.pop().map((angle) => angle - 360).concat(arcs[0]);
  }
  return arcs.sort((a, b) => b.length - a.length)[0] || [180];
}

function placeBaubles() {
  const nodes = [...options.querySelectorAll('button')];
  if (!nodes.length) return;
  // Rows build from the middle outward: five becomes 3 + 2, six becomes 3 + 2 + 1.
  // This keeps a corner cluster feeling gathered rather than leaving one item dangling.
  const rows = [];
  let remaining = nodes.length;
  for (const count of [3, 2, 1, 3, 2]) {
    if (!remaining) break;
    const take = Math.min(count, remaining);
    rows.push(take);
    remaining -= take;
  }
  let nodeIndex = 0;
  rows.forEach((count, rowIndex) => {
    const radius = 84 + rowIndex * 68;
    const arc = largestFreeArc(radius);
    const arcCenter = arc[Math.floor(arc.length / 2)];
    const requestedSpan = count === 1 ? 0 : (count - 1) * (rowIndex ? 34 : 42);
    const safeSpan = Math.min(requestedSpan, Math.max(0, (arc.length - 8) * 3));
    for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
      const angle = arcCenter + (count === 1 ? 0 : (itemIndex / (count - 1) - .5) * safeSpan);
      const radians = angle * Math.PI / 180;
      const node = nodes[nodeIndex++];
      node.style.setProperty('--x', `${Math.round(Math.cos(radians) * radius)}px`);
      node.style.setProperty('--y', `${Math.round(Math.sin(radians) * radius)}px`);
      node.style.setProperty('--delay', `${(rowIndex * 45) + (itemIndex * 26)}ms`);
    }
  });
  positionPanel();
}

function render(menuName = 'root') {
  activeMenu = menuName;
  const rootMenu = menuName === 'root';
  editor.classList.toggle('is-focused', !rootMenu);
  options.innerHTML = menu[menuName].map((item) => makeButton(item, !rootMenu)).join('');
  hub.textContent = rootMenu ? '✦' : '←';
  hub.setAttribute('aria-label', rootMenu ? 'Close appearance settings' : 'Back to appearance settings');
  requestAnimationFrame(placeBaubles);
}

function enterCategory(menuName, selected) {
  selected.classList.add('is-selected');
  hub.textContent = '←';
  editor.classList.add('is-transitioning');
  window.setTimeout(() => {
    editor.classList.remove('is-transitioning');
    render(menuName);
  }, 190);
}

function panelConfig(action) {
  const colors = storedState.colors || {};
  const type = storedState.type || {};
  const layers = storedState.layers || {};
  return {
    cakeTint: ['Cake color', `<input type="color" value="${colors['--cake-tint'] || '#8b0f22'}" data-kind="color" data-key="--cake-tint">`],
    crust: ['Crust color', `<input type="color" value="${colors['--crust-color'] || '#6f2418'}" data-kind="color" data-key="--crust-color">`],
    cakePreset: ['Cake type', `<select data-kind="color" data-key="cakePreset"><option value="redVelvet">Red velvet</option><option value="chocolate">Chocolate</option><option value="lemon">Lemon</option><option value="vanilla">Vanilla</option><option value="white">White cake</option><option value="carrot">Carrot cake</option></select>`],
    icing: ['Icing color', `<input type="color" value="${colors['--icing'] || '#fff4df'}" data-kind="color" data-key="--icing">`],
    ink: ['Main text', `<input type="color" value="${colors['--ink'] || '#513c44'}" data-kind="color" data-key="--ink">`],
    accent: ['Title text', `<input type="color" value="${colors['--accent'] || '#b87583'}" data-kind="color" data-key="--accent">`],
    description: ['Description text', `<input type="color" value="${colors.description || '#513c44'}" data-kind="color" data-key="description">`],
    fontFamily: ['Title font', `<select data-kind="type" data-key="fontFamily"><option value="'Playwrite IT Moderna', cursive">Scripted</option><option value="'Cormorant Garamond', serif">Editorial serif</option><option value="'DM Sans', sans-serif">Clean sans</option></select>`],
    displaySize: ['Title size', `<input type="range" min="2.5" max="6" step=".1" value="${type.displaySize || '4.8'}" data-kind="type" data-key="displaySize">`],
    bodySize: ['Body size', `<input type="range" min=".85" max="1.35" step=".05" value="${type.bodySize || '1'}" data-kind="type" data-key="bodySize">`],
    weight: ['Title weight', `<input type="range" min="200" max="700" step="100" value="${type.weight || '300'}" data-kind="type" data-key="weight">`],
    spacing: ['Letter spacing', `<input type="range" min="-.04" max=".12" step=".01" value="${type.spacing || '0'}" data-kind="type" data-key="spacing">`],
    icingSoftness: ['Icing softness', `<input type="range" min="0" max="3" step=".1" value="${layers.icingSoftness || '.25'}" data-kind="layer" data-key="icingSoftness">`],
    icingTilt: ['Layer slope', `<input type="range" min="-.8" max=".8" step=".1" value="${layers.icingTilt || '0'}" data-kind="layer" data-key="icingTilt">`],
    pores: ['Pore strength', `<input type="range" min="0" max="1" step=".05" value="${layers.pores || '.42'}" data-kind="layer" data-key="pores">`],
    blend: ['Cake / icing blend', `<input type="range" min="0" max="1" step=".05" value="${blur.blend || '.65'}" data-kind="blur" data-key="blend">`],
    feather: ['Border feather', `<input type="range" min="0" max="5" step=".1" value="${blur.feather || '1.2'}" data-kind="blur" data-key="feather">`],
    fill: ['Pore fill depth', `<input type="range" min="0" max="1" step=".05" value="${blur.fill || '.78'}" data-kind="blur" data-key="fill">`],
    lineDrift: ['Line drift', `<input type="range" min="0" max="14" step="1" value="${blur.lineDrift || '5'}" data-kind="blur" data-key="lineDrift">`],
    lineFrequency: ['Line frequency', `<input type="range" min="4" max="26" step="1" value="${blur.lineFrequency || '12'}" data-kind="blur" data-key="lineFrequency">`],
    lineHold: ['Line hold', `<input type="range" min="8" max="64" step="1" value="${blur.lineHold || '28'}" data-kind="blur" data-key="lineHold">`],
    ridge: ['Top layer ridges', `<input type="range" min="0" max="12" step="1" value="${blur.ridge || '5'}" data-kind="blur" data-key="ridge">`],
    valley: ['Top layer valleys', `<input type="range" min="0" max="12" step="1" value="${blur.valley || '4'}" data-kind="blur" data-key="valley">`]
  }[action];
}

function positionPanel() {
  if (!panel.classList.contains('is-visible')) return;
  const hubRect = hub.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const baubleRects = [hubRect, ...[...options.querySelectorAll('button')]
    .filter((button) => getComputedStyle(button).opacity !== '0')
    .map((button) => button.getBoundingClientRect())];
  const clusterTop = Math.min(...baubleRects.map((rect) => rect.top));
  const clusterBottom = Math.max(...baubleRects.map((rect) => rect.bottom));
  const roomAbove = clusterTop - 14;
  const roomBelow = innerHeight - clusterBottom - 14;
  const placeAbove = roomAbove >= roomBelow;
  const room = placeAbove ? roomAbove : roomBelow;
  const scale = Math.max(.72, Math.min(1, room / Math.max(1, panelRect.height)));
  const left = Math.max(8, Math.min(innerWidth - panelRect.width - 8, hubRect.left + hubRect.width / 2 - panelRect.width / 2));
  panel.style.left = `${left}px`;
  panel.style.top = `${placeAbove ? Math.max(8, clusterTop - panelRect.height - 14) : Math.min(innerHeight - panelRect.height - 8, clusterBottom + 14)}px`;
  panel.style.setProperty('--panel-scale', scale);
  panel.dataset.side = placeAbove ? 'above' : 'below';
}

function showPanel(action) {
  if (action === 'historyList') {
    const entries = [...changeHistory].reverse().map((entry, index) => `<li>${index + 1}. ${entry.label}</li>`).join('') || '<li>No changes yet.</li>';
    const redos = redoHistory.length ? `<p>Redo queue: ${redoHistory.length}</p>` : '<p>Redo queue is empty.</p>';
    panel.innerHTML = `<h2>Change history</h2><ol class="history-list">${entries}</ol>${redos}<div class="panel-actions"><button type="button" data-panel-close>NAH!</button><button type="button" data-panel-close>YUP!</button></div>`;
    panel.querySelectorAll('[data-panel-close]').forEach((button) => button.addEventListener('click', closePanel));
    panel.classList.add('is-visible');
    requestAnimationFrame(positionPanel);
    return;
  }
  if (action === 'petCat') {
    panel.innerHTML = `<h2>Cat status</h2><p>A scientist has put the cat in a box, so petting is unavailable for now.</p><div class="panel-actions"><button type="button" data-panel-close>NAH!</button><button type="button" data-panel-close>YUP!</button></div>`;
    panel.querySelectorAll('[data-panel-close]').forEach((button) => button.addEventListener('click', closePanel));
    panel.classList.add('is-visible');
    requestAnimationFrame(positionPanel);
    return;
  }
  const [title, control] = panelConfig(action);
  panelSnapshot = stateSnapshot();
  panel.innerHTML = `<h2>${title}</h2><label class="control-row"><span>Adjust</span>${control}</label><div class="panel-actions"><button type="button" data-cancel>NAH!</button><button type="button" data-confirm>YUP!</button></div>`;
  const input = panel.querySelector('input, select');
  const group = input.dataset.kind === 'color' ? 'colors' : input.dataset.kind === 'type' ? 'type' : 'layers';
  if (storedState[group]?.[input.dataset.key] !== undefined) input.value = storedState[group][input.dataset.key];
  input.addEventListener('input', updateControl);
  panel.querySelector('[data-cancel]').addEventListener('click', cancelPanel);
  panel.querySelector('[data-confirm]').addEventListener('click', () => { commitPanelChange(title); closePanel(); });
  panel.classList.add('is-visible');
  requestAnimationFrame(positionPanel);
}

function updateControl(event) {
  const { kind, key } = event.currentTarget.dataset;
  const group = kind === 'color' ? 'colors' : kind === 'type' ? 'type' : kind === 'blur' ? 'blur' : 'layers';
  storedState[group] ||= {};
  storedState[group][key] = event.currentTarget.value;
  applyState();
  if (group === 'blur') decorateIcing();
}

function closePanel() {
  panelSnapshot = null;
  panel.classList.remove('is-visible');
}

function cancelPanel() {
  if (panelSnapshot) restoreState(panelSnapshot);
  closePanel();
}

function undoChange() {
  const entry = changeHistory.pop();
  if (!entry) return;
  redoHistory.push({ label: entry.label, state: stateSnapshot() });
  restoreState(entry.state);
}

function redoChange() {
  const entry = redoHistory.pop();
  if (!entry) return;
  changeHistory.push({ label: entry.label, state: stateSnapshot() });
  restoreState(entry.state);
}

function resetAppearance() {
  localStorage.removeItem('atelier-cake-appearance');
  Object.keys(storedState).forEach((key) => delete storedState[key]);
  document.querySelector('#site-name').removeAttribute('style');
  document.querySelector('#site-intro').removeAttribute('style');
  if (featuredImage) featuredImage.removeAttribute('style');
  document.documentElement.removeAttribute('style');
  panel.classList.remove('is-visible');
}

function saveCopy() {
  if (!activeText) return;
  copyEdits[activeText.dataset.editKey] = {
    html: activeText.innerHTML,
    align: activeText.style.textAlign,
    size: activeText.style.fontSize,
    weight: activeText.style.fontWeight
  };
  localStorage.setItem('cake-copy-edits', JSON.stringify(copyEdits));
}

function positionTextToolbar(node) {
  textToolbar.hidden = false;
  const rect = node.getBoundingClientRect();
  const toolbarRect = textToolbar.getBoundingClientRect();
  const left = Math.max(8, Math.min(innerWidth - toolbarRect.width - 8, rect.left));
  const below = rect.bottom + 8;
  textToolbar.style.left = `${left}px`;
  textToolbar.style.top = `${below + toolbarRect.height < innerHeight - 8 ? below : Math.max(8, rect.top - toolbarRect.height - 8)}px`;
}

function beginTextEdit(node) {
  if (activeText && activeText !== node) finishTextEdit();
  activeText = node;
  node.contentEditable = 'true';
  node.spellcheck = true;
  node.classList.add('is-editing');
  node.focus({ preventScroll: true });
  positionTextToolbar(node);
}

function finishTextEdit() {
  if (!activeText) return;
  saveCopy();
  activeText.contentEditable = 'false';
  activeText.classList.remove('is-editing');
  activeText = null;
  textToolbar.hidden = true;
}

function setupTextEditing() {
  const textNodes = [...document.querySelectorAll('main h1, main h2, main p, main a')]
    .filter((node) => !node.closest('form') && !node.classList.contains('form-note'));
  textNodes.forEach((node, index) => {
    node.classList.add('text-editable');
    node.dataset.editKey = node.id || `copy-${index}`;
    const saved = copyEdits[node.dataset.editKey];
    if (saved) {
      node.innerHTML = saved.html;
      node.style.textAlign = saved.align || '';
      node.style.fontSize = saved.size || '';
      node.style.fontWeight = saved.weight || '';
    }
    node.addEventListener('pointerdown', (event) => {
      if (node.contentEditable === 'true') return;
      const originX = event.clientX;
      const originY = event.clientY;
      pressTimer = window.setTimeout(() => beginTextEdit(node), 550);
      const cancel = (moveEvent) => {
        if (Math.hypot(moveEvent.clientX - originX, moveEvent.clientY - originY) > 8) window.clearTimeout(pressTimer);
      };
      node.addEventListener('pointermove', cancel, { once: true });
      node.addEventListener('pointerup', () => window.clearTimeout(pressTimer), { once: true });
      node.addEventListener('pointercancel', () => window.clearTimeout(pressTimer), { once: true });
    });
    node.addEventListener('input', saveCopy);
    node.addEventListener('blur', saveCopy);
    node.addEventListener('click', (event) => {
      if (node.contentEditable === 'true') event.preventDefault();
    });
  });
}

function changeTextStyle(action) {
  if (!activeText) return;
  if (action === 'align-left') activeText.style.textAlign = 'left';
  if (action === 'align-center') activeText.style.textAlign = 'center';
  if (action === 'align-right') activeText.style.textAlign = 'right';
  if (action === 'font-down' || action === 'font-up') {
    const current = parseFloat(getComputedStyle(activeText).fontSize);
    activeText.style.fontSize = `${Math.max(11, Math.min(96, current + (action === 'font-up' ? 2 : -2)))}px`;
  }
  if (action === 'weight') activeText.style.fontWeight = getComputedStyle(activeText).fontWeight >= 600 ? '400' : '700';
  saveCopy();
  positionTextToolbar(activeText);
}

function dragStart(event, target = hub) {
  dragTarget = target;
  if (target === hub) editor.style.top = 'auto';
  startX = event.clientX;
  startY = event.clientY;
  moved = false;
  dragTarget.setPointerCapture(event.pointerId);
}

function dragMove(event) {
  if (!dragTarget.hasPointerCapture(event.pointerId) || Math.hypot(event.clientX - startX, event.clientY - startY) < 6) return;
  moved = true;
  editor.style.right = `${Math.max(12, Math.min(innerWidth - 64, innerWidth - event.clientX - 26))}px`;
  editor.style.bottom = `${Math.max(12, Math.min(innerHeight - 64, innerHeight - event.clientY - 26))}px`;
  editor.dataset.positioned = 'true';
  placeBaubles();
  positionPanel();
}

function hubAction() {
  if (moved || dragTarget !== hub) return;
  if (activeMenu !== 'root') {
    if (panelSnapshot) cancelPanel();
    else closePanel();
    render('root');
    return;
  }
  if (!editor.dataset.positioned) {
    editor.style.right = '6rem';
    editor.style.top = '40svh';
    editor.style.bottom = 'auto';
    editor.dataset.positioned = 'true';
  }
  editor.classList.toggle('is-open');
  hub.setAttribute('aria-expanded', String(editor.classList.contains('is-open')));
  if (editor.classList.contains('is-open')) render('root');
  else panel.classList.remove('is-visible');
}

function submitOrder(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const email = document.querySelector('#business-email').textContent.trim();
  const businessName = document.querySelector('#site-name').innerText.trim().replace(/\s+/g, ' ');
  const note = document.querySelector('#form-note');
  const message = encodeURIComponent(`Name: ${data.get('name')}\nEmail: ${data.get('email')}\nEvent date: ${data.get('date')}\n\n${data.get('details')}`);
  if (!email || email === 'hello@example.com') {
    note.textContent = 'Replace the sample email in the footer before sending inquiries.';
    return;
  }
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(`New cake inquiry for ${businessName}`)}&body=${message}`;
  note.textContent = 'Your email app is opening with the inquiry ready to send.';
}

function createPores() {
  if (!poreLayer) return;
  for (let index = 0; index < 135; index += 1) {
    const pore = document.createElement('span');
    const size = 2 + Math.random() * 11;
    pore.className = 'pore';
    pore.style.left = `${Math.random() * 100}%`;
    pore.style.top = `${Math.random() * 100}%`;
    pore.style.width = `${size}px`;
    pore.style.height = `${size * (.55 + Math.random() * .75)}px`;
    pore.style.opacity = `${.12 + Math.random() * .28}`;
    poreLayer.append(pore);
  }
}

function decorateIcing() {
  document.querySelectorAll('.icing-crest,.icing-valley,.crumb-contact,.pore-fill').forEach((node) => node.remove());
  const blur = storedState.blur || {};
  const frequency = Number(blur.lineFrequency || 12);
  const hold = Number(blur.lineHold || 28);
  const drift = Number(blur.lineDrift || 5);
  const ridge = Number(blur.ridge || 5);
  const valleyDepth = Number(blur.valley || 4);
  const fillDepth = Number(blur.fill || .78);
  document.querySelectorAll('.frosting-band').forEach((band, bandIndex) => {
    for (let index = 0; index < frequency; index += 1) {
      const edge = index % 2 ? 'top' : 'bottom';
      const crest = document.createElement('span');
      const width = Math.max(9, hold * (.65 + ((index * 17) % 31) / 100));
      crest.className = `icing-crest ${edge}`;
      crest.style.left = `${(index * 61.8) % 100}%`;
      crest.style.width = `${width}px`;
      crest.style.height = `${Math.max(1, ridge * (.45 + ((index * 7) % 30) / 100))}px`;
      crest.style.transform = `translateY(${edge === 'top' ? -1 : 1}px) translateX(${((index % 3) - 1) * drift}px)`;
      band.append(crest);
      if (index % 3 === 0) {
        const valley = document.createElement('span');
        valley.className = `icing-valley ${edge}`;
        valley.style.left = `${(index * 61.8 + 17) % 100}%`;
        valley.style.width = `${Math.max(7, hold * .58)}px`;
        valley.style.height = `${Math.max(1, valleyDepth)}px`;
        band.append(valley);
      }
      if (index % 2 === 0) {
        const crumb = document.createElement('span');
        crumb.className = 'crumb-contact';
        crumb.style.left = `${(index * 61.8 + 8) % 100}%`;
        crumb.style.top = edge === 'top' ? '1px' : 'auto';
        crumb.style.bottom = edge === 'bottom' ? '1px' : 'auto';
        band.append(crumb);
      }
    }
    // Neighbouring dark cells receive a soft, size-independent fill near each frosting edge.
    for (let index = 0; index < Math.max(8, Math.round(frequency * 1.4)); index += 1) {
      const filledPore = document.createElement('span');
      filledPore.className = 'pore-fill';
      const width = 10 + ((index * 23) % 26);
      filledPore.style.left = `${(index * 37.7 + bandIndex * 13) % 100}%`;
      filledPore.style.width = `${width}px`;
      filledPore.style.height = `${Math.max(5, width * .4)}px`;
      filledPore.style.opacity = `${fillDepth * (.68 + ((index * 11) % 20) / 100)}`;
      filledPore.style.top = index % 2 ? 'auto' : `${-3 - (index % 3)}px`;
      filledPore.style.bottom = index % 2 ? `${-3 - (index % 3)}px` : 'auto';
      band.append(filledPore);
    }
  });
}

applyState();
createPores();
decorateIcing();
hub.addEventListener('pointerdown', dragStart);
editor.addEventListener('pointermove', dragMove);
editor.addEventListener('pointerup', hubAction);
editor.addEventListener('pointercancel', hubAction);
options.addEventListener('pointerdown', (event) => {
  const selected = event.target.closest('button');
  if (selected) dragStart(event, selected);
});
options.addEventListener('click', (event) => {
  const selected = event.target.closest('button');
  if (!selected || moved) return;
  if (activeMenu === 'root') {
    panel.classList.remove('is-visible');
    enterCategory(selected.dataset.action, selected);
  } else if (selected.dataset.action === 'undo') {
    undoChange();
  } else if (selected.dataset.action === 'redo') {
    redoChange();
  } else showPanel(selected.dataset.action);
});
document.querySelector('#order-form').addEventListener('submit', submitOrder);
document.querySelector('[data-open-order]').addEventListener('click', () => orderOverlay.showModal());
document.querySelector('.close-order').addEventListener('click', () => orderOverlay.close());
window.addEventListener('resize', () => { placeBaubles(); positionPanel(); });
setupTextEditing();
textToolbar.addEventListener('click', (event) => {
  const action = event.target.closest('button')?.dataset.textAction;
  if (!action) return;
  if (action === 'done') finishTextEdit();
  else changeTextStyle(action);
});
document.addEventListener('pointerdown', (event) => {
  if (activeText && !activeText.contains(event.target) && !textToolbar.contains(event.target)) finishTextEdit();
});
