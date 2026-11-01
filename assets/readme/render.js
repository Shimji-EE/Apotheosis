// Renders the README art from the live site styles (docs/). Run: node assets/readme/render.js
// Then convert hero/quote/gallery PNGs to JPG and trim the title/footer PNGs.
const { chromium } = require('playwright');
const path = require('path');
const OUT = __dirname;
const SITE = 'file://' + path.resolve(__dirname, '../../docs/index.html');
const freeze = `
*,*::before,*::after{animation:none!important;transition:none!important}
.reveal{opacity:1!important;transform:none!important}
.frame-circle,.frame-die{stroke-dashoffset:0!important}
.frame-die{opacity:.55!important}.frame-die-inner{opacity:.35!important}
.tracked,.hero-sub,.hero-facts,.script{opacity:1}
.script{opacity:.65!important}
#dust,.nav,.scroll-cue,.hero-actions{display:none!important}
[data-parallax]{transform:none!important}
`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
  await page.goto(SITE, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: freeze });
  await page.evaluate(() => document.fonts.ready);

  // Dark pieces: hero, quote, gallery
  await page.addStyleTag({ content: `.hero{min-height:0!important;padding:4rem 16px 3.5rem!important}` });
  await page.locator('header.hero').screenshot({ path: path.join(OUT, 'hero.png') });
  await page.addStyleTag({ content: `.quote{padding:3.2rem 16px 2.8rem!important}` });
  await page.locator('section.quote').screenshot({ path: path.join(OUT, 'quote.png') });
  await page.addStyleTag({ content: `.gallery{padding-top:2.5rem!important;padding-bottom:3rem!important}` });
  await page.locator('section.gallery').screenshot({ path: path.join(OUT, 'gallery.png') });

  // Transparent pieces
  await page.addStyleTag({ content: `html,body{background:transparent!important}.haze{display:none!important}
    .title{margin:0!important;padding:6px 4px 4px;width:820px}` });
  const titles = [['#world', 'part-1-world'], ['#inside', 'part-2-inside'], ['#playing', 'part-3-playing']];
  for (const [sel, name] of titles) {
    await page.locator(`${sel} > header.title`).screenshot({ path: path.join(OUT, name + '.png'), omitBackground: true });
  }
  const sockets = page.locator('.feature .socket');
  const names = ['rules', 'gestalt', 'species', 'religions', 'afflictions', 'magic', 'bestiary'];
  await page.addStyleTag({ content: `.socket{margin:7px}` });
  for (let i = 0; i < names.length; i++) {
    await sockets.nth(i).scrollIntoViewIfNeeded(); const box = await sockets.nth(i).boundingBox();
    await page.screenshot({ path: path.join(OUT, `socket-${names[i]}.png`), omitBackground: true,
      clip: { x: box.x - 6, y: box.y - 6, width: box.width + 12, height: box.height + 12 } });
  }
  await page.locator('.notice .tab').screenshot({ path: path.join(OUT, 'tab-alpha.png'), omitBackground: true });
  await page.addStyleTag({ content: `.footer-mark{margin:0!important;padding:4px 12px}` });
  await page.locator('.footer-mark').screenshot({ path: path.join(OUT, 'footer-mark.png'), omitBackground: true });
  await page.addStyleTag({ content: `.rule-short{margin:0!important;width:360px!important}` });
  await page.locator('.quote .rule').screenshot({ path: path.join(OUT, 'rule.png'), omitBackground: true });
  // Buttons
  await page.evaluate(() => {
    const wrap = document.createElement('div');
    wrap.id = 'btns'; wrap.style.cssText = 'position:fixed;top:0;left:0;display:flex;gap:24px;padding:10px;z-index:99';
    wrap.innerHTML = '<a class="button" id="b1">Visit the website</a>';
    document.body.appendChild(wrap);
    window.scrollTo(0, 0);
  });
  for (const id of ['b1']) {
    const box = await page.locator('#' + id).boundingBox();
    await page.screenshot({ path: path.join(OUT, 'button-website.png'), omitBackground: true,
      clip: { x: box.x - 6, y: box.y - 6, width: box.width + 12, height: box.height + 12 } });
  }
  await browser.close();
})();
