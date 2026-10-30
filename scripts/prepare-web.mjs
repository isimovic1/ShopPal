// Finishes `expo export --platform web` for GitHub Pages and the iPhone home
// screen: adds the icon and web-app meta tags, a manifest, and a 404.html copy
// so reloading a deep link still loads the app.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const DIST = 'dist';
const BASE = '/ShopPal';
const THEME = '#6D28D9';

copyFileSync('assets/icon.png', `${DIST}/apple-touch-icon.png`);
copyFileSync('assets/icon.png', `${DIST}/icon-512.png`);

writeFileSync(
  `${DIST}/manifest.json`,
  JSON.stringify({
    name: 'ShopPal',
    short_name: 'ShopPal',
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: 'standalone',
    background_color: '#F3F5F9',
    theme_color: THEME,
    icons: [{ src: `${BASE}/icon-512.png`, sizes: '1024x1024', type: 'image/png' }],
  }),
);

const head = [
  `<link rel="apple-touch-icon" href="${BASE}/apple-touch-icon.png">`,
  `<link rel="manifest" href="${BASE}/manifest.json">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="ShopPal">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  `<meta name="theme-color" content="${THEME}">`,
].join('\n');

const index = readFileSync(`${DIST}/index.html`, 'utf8')
  .replace('<title>', `${head}\n<title>`)
  // Stop iOS from zooming into inputs and keep the layout inside the safe area.
  .replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">');
writeFileSync(`${DIST}/index.html`, index);
writeFileSync(`${DIST}/404.html`, index);
console.log('Web build ready for GitHub Pages');
