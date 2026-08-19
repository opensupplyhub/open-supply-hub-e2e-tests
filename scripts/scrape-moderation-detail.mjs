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
await page.waitForTimeout(2000);
const firstRow=page.locator('table tbody tr').first();
const locationName=await firstRow.locator('td').nth(1).innerText();
console.log('location', locationName.trim());
const rowInfo=await firstRow.evaluate(row=>({
  html:row.outerHTML.slice(0,1200),
  aria:row.getAttribute('aria-label'),
  role:row.getAttribute('role'),
  button: row.querySelector('button')?.outerHTML?.slice(0,500),
  roleButtons:[...row.querySelectorAll('[role=button],button')].map(b=>({tag:b.tagName,aria:b.getAttribute('aria-label'),role:b.getAttribute('role')}))
}));
console.log('rowInfo', JSON.stringify(rowInfo,null,2));

const pagePromise=context.waitForEvent('page',{timeout:15000}).catch(()=>null);
await firstRow.click();
const newPage=await pagePromise;
let detailPage=newPage || page;
if (newPage) {
  await newPage.waitForLoadState('domcontentloaded');
  console.log('opened popup', newPage.url());
} else {
  await page.waitForTimeout(3000);
  console.log('same page', page.url());
}
await detailPage.waitForTimeout(3000);
const dump=await detailPage.evaluate(()=>{
  const t=el=>(el?.innerText||'').replace(/\s+/g,' ').trim();
  return {
    url:location.href,
    headings:[...document.querySelectorAll('h1,h2,h3')].map(h=>t(h)).filter(h=>h && !/What is OS Hub|Who is it|Resources|Technology|Featured|Organization|People|Connect|Follow Us|What does it/.test(h)),
    buttons:[...document.querySelectorAll('button,[role=button]')].map(b=>({text:t(b).slice(0,80),aria:b.getAttribute('aria-label'),disabled:!!b.disabled,id:b.id||null})).filter(b=>b.text||b.aria).filter(b=>!['How It Works','About Us','Language','My Account','Log Out','Reject','Accept','REJECT','ACCEPT'].includes(b.text)),
    inputs:[...document.querySelectorAll('input,textarea,select')].map(i=>({id:i.id||null,name:i.name||null,placeholder:i.placeholder||null,type:i.type||null,label:i.id?document.querySelector(`label[for="${CSS.escape(i.id)}"]`)?.innerText:null})),
    ids:[...document.querySelectorAll('[id]')].map(e=>e.id).filter(id=>!/react-select|mui|jss/i.test(id)).slice(0,60),
    labels:[...document.querySelectorAll('label')].map(l=>({for:l.getAttribute('for'),text:t(l).slice(0,100)})).filter(l=>l.text).slice(0,40),
    dialogs:[...document.querySelectorAll('[role=dialog],.MuiDialog-root')].map(d=>({titles:[...d.querySelectorAll('h1,h2,h3,.MuiDialogTitle-root')].map(x=>t(x)),text:t(d).slice(0,500),buttons:[...d.querySelectorAll('button')].map(b=>t(b))})),
    body:t(document.body).slice(0,1500)
  };
});
console.log(JSON.stringify(dump,null,2));
fs.writeFileSync('.cursor/sessions/moderation-detail.json', JSON.stringify({locationName,rowInfo,dump},null,2));

// Also try list detail for REJECT LIST - open a pending filtered list item
await page.goto(`${BASE}/dashboard/lists`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2500);
// STATUS already Pending from earlier default?
const statusText=await page.locator('#STATUS').innerText().catch(()=>'');
console.log('list status filter', statusText);
// click first row - may open /lists/:id
const listPagePromise=context.waitForEvent('page',{timeout:5000}).catch(()=>null);
await page.locator('table tbody tr').first().click();
const listNew=await listPagePromise;
const listPage=listNew||page;
await listPage.waitForTimeout(2500);
const listDump=await listPage.evaluate(()=>{
  const t=el=>(el?.innerText||'').replace(/\s+/g,' ').trim();
  return {
    url:location.href,
    headings:[...document.querySelectorAll('h1,h2')].map(h=>t(h)).filter(h=>h&&!/What is OS Hub|Who is it|Resources|Technology|Featured|Organization|People|Connect|Follow Us|What does it/.test(h)),
    buttons:[...document.querySelectorAll('button')].map(b=>t(b)).filter(x=>x && !['How It Works','About Us','Language','My Account','Log Out','Reject','Accept'].includes(x)),
    bodyHasRejectList:/REJECT LIST/i.test(document.body.innerText),
    allButtonTexts:[...document.querySelectorAll('button')].map(b=>(b.innerText||'').trim()).filter(Boolean)
  };
});
console.log('list detail', listDump);
await browser.close();
