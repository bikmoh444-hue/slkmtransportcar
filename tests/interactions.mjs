import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:3030';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 await page.goto(`${base}/fr`,{waitUntil:'networkidle'});
 const heroHeight=await page.locator('.hero').evaluate(el=>el.getBoundingClientRect().height);
 await page.getByRole('button',{name:'Suspendre',exact:true}).click();
 const heading=await page.locator('h1').textContent();
 await page.waitForTimeout(6500);
 assert.equal(await page.locator('h1').textContent(),heading,'paused carousel must stay on its slide');
 await page.getByRole('button',{name:'Reprendre',exact:true}).click();
 await page.waitForFunction(previous=>document.querySelector('h1')?.textContent!==previous,heading,{timeout:8000});
 assert.equal(await page.locator('.hero').evaluate(el=>el.getBoundingClientRect().height),heroHeight);
 await page.locator('.menu-toggle').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#main-nav').isVisible(),true);
 await page.keyboard.press('Enter');assert.equal(await page.locator('#main-nav').isVisible(),false);
 assert.equal(await page.locator('.whatsapp-float').isVisible(),true);
 await page.locator('.complaint').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.whatsapp-float')?.hasAttribute('hidden'));
 assert.equal(await page.locator('.whatsapp-float').isVisible(),false,'floating contact must not obscure the form');
 await page.close();console.log('PASS: real autoplay, pause/resume, stable hero height, keyboard menu, floating WhatsApp avoids form');
}finally{await browser.close()}
