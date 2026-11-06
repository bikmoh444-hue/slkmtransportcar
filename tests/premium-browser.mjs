import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge'});
await mkdir('artifacts/premium',{recursive:true});
try {
for(const locale of ['fr','ar']) for(const width of [320,360,375,390,414,430,768,1024,1440]) {
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:3030/${locale}`,{waitUntil:'networkidle'});
 assert.equal(await page.locator('h1').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${locale} ${width} overflow`);
 assert.equal(await page.locator('#services-track > .service-card').count(),4);
 const toggle=page.locator('.expertise-toggle');
 await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 assert.equal(await toggle.textContent(),locale==='fr'?'Voir moins':'عرض أقل');
 assert.equal(await page.locator('#expertise-extra .service-card').first().isVisible(),true);
 await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 assert.equal(await page.locator('#expertise-extra').getAttribute('inert'),'');
 await page.evaluate(()=>scrollTo(0,0));
 const h=await page.locator('.hero').evaluate(e=>e.clientHeight);
 await page.getByRole('button',{name:locale==='fr'?'Slide suivante':'الشريحة التالية',exact:true}).click();
 assert.equal(await page.locator('.hero').evaluate(e=>e.clientHeight),h,'hero height stable');
 if(width<=1024) { await page.locator('.menu-toggle').click(); assert.equal(await page.locator('#main-nav').isVisible(),true); await page.keyboard.press('Escape'); assert.equal(await page.locator('#main-nav').isVisible(),false); }
 const map=page.locator('.map-preview:not(:disabled)').first();
 if(await map.count()) { await map.click(); assert.equal(await page.locator('dialog[open]').count(),1); await page.keyboard.press('Escape'); }
 assert.deepEqual(errors,[]);
 if(width===390||width===1440) { await page.evaluate(()=>scrollTo(0,0)); await page.screenshot({path:`artifacts/premium/${locale}-${width}.png`,fullPage:true}); }
 console.log(`PASS ${locale} ${width}`); await page.close();
}
} finally {await browser.close();}
