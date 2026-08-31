const pages = [
  ['home', 'index.html', '✦', 'Bougie Cakes'],
  ['custom', 'custom.html', '♧', 'Custom'],
  ['flavors', 'flavors.html', '⌁', 'Flavors'],
  ['gallery', 'gallery.html', '▧', 'Gallery'],
  ['about', 'about.html', 'i', 'About'],
  ['inquire', 'order.html', '↗', 'Inquire']
];

const current = document.body.dataset.page || 'home';
const navigation = document.createElement('nav');
navigation.className = 'universal-nav';
navigation.setAttribute('aria-label', 'Site pages');
navigation.innerHTML = pages.map(([id, href, icon, label], index) => {
  const position = index % 2 === 0 ? 'label-bottom' : 'label-top';
  const path = position === 'label-top' ? 'M 3 17 A 30 30 0 0 1 61 17' : 'M 3 7 A 30 30 0 0 0 61 7';
  const labelMarkup = id === 'home' ? '' : `<svg class="page-label" viewBox="0 0 64 24" aria-hidden="true"><path id="arc-${id}" d="${path}" fill="none"/><text><textPath href="#arc-${id}" startOffset="50%" text-anchor="middle">${label}</textPath></text></svg>`;
  return `<a class="page-button ${position}${id === 'home' ? ' brand-button' : ''}${id === current ? ' is-current' : ''}" href="${href}" aria-label="${label}"${id === current ? ' aria-current="page"' : ''}>${labelMarkup}<span class="page-icon" aria-hidden="true">${icon}</span></a>`;
}).join('');
document.body.append(navigation);
