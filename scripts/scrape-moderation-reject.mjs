import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
const BASE=process.env.BASE_URL, EMAIL=process.env.USER_ADMIN_EMAIL, PASS=process.env.USER_ADMIN_PASSWORD;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
await page.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'});
await page.locator('#LOGIN_EMAIL').fill(EMAIL);
await page.locator('#LOGIN_PASSWORD').fill(PASS);
await page.getByRole('button',{name:'LOG IN'}).click();
await page.getByRole('button',{name:'My Account'}).waitFor({timeout:30000});
await page.goto(`${BASE}/dashboard/moderation-queue`,{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForSelector('table tbody tr',{timeout:60000});
await page.waitForTimeout(1500);
const pagePromise=context.waitForEvent('page');
await page.locator('table tbody tr').first().click();
const detail=await pagePromise;
await detail.waitForLoadState('domcontentloaded');
await detail.waitForTimeout(2000);
await detail.getByRole('button',{name:'REJECT CONTRIBUTION'}).click();
await detail.waitForTimeout(1000);
let dump=await detail.evaluate(()=>{
  const t=el=>(el?.innerText||'').replace(/\s+/g,' ').trim();
  return {
    dialogs:[...document.querySelectorAll('[role=dialog],.MuiDialog-root')].map(d=>({
      titles:[...d.querySelectorAll('h1,h2,h3,.MuiDialogTitle-root')].map(x=>t(x)),
      text:t(d).slice(0,700),
      buttons:[...d.querySelectorAll('button')].map(b=>t(b)),
      inputs:[...d.querySelectorAll('input,textarea')].map(i=>({id:i.id,type:i.type,label:document.querySelector(`label[for="${i.id}"]`)?.innerText}))
    })),
    buttons:[...document.querySelectorAll('button')].map(b=>({text:t(b),disabled:b.disabled})).filter(b=>b.text&&b.text.length<40)
  };
});
console.log('reject dialog', JSON.stringify(dump,null,2));
await detail.keyboard.press('Escape');
await detail.waitForTimeout(500);
// CREATE NEW LOCATION might open confirm
await detail.getByRole('button',{name:'CREATE NEW LOCATION'}).click();
await detail.waitForTimeout(1000);
dump=await detail.evaluate(()=>{
  const t=el=>(el?.innerText||'').replace(/\s+/g,' ').trim();
  return {
    url:location.href,
    dialogs:[...document.querySelectorAll('[role=dialog],.MuiDialog-root')].map(d=>({
      titles:[...d.querySelectorAll('h1,h2,h3,.MuiDialogTitle-root')].map(x=>t(x)),
      text:t(d).slice(0,700),
      buttons:[...d.querySelectorAll('button')].map(b=>t(b)),
      inputs:[...d.querySelectorAll('input,textarea')].map(i=>({id:i.id,type:i.type,label:document.querySelector(`label[for="${i.id}"]`)?.innerText}))
    })),
    headings:[...document.querySelectorAll('h1,h2,h3')].map(h=>t(h)).filter(h=>h&&h.length<80)
  };
});
console.log('after create new', JSON.stringify(dump,null,2));
fs.writeFileSync('.cursor/sessions/moderation-reject.json', JSON.stringify(dump,null,2));
await browser.close();
