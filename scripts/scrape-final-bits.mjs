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

// Claim Update Status section DOM
await page.goto(`${BASE}/dashboard/claims/5823`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2500);
const claimDom=await page.evaluate(()=>{
  const t=el=>(el?.innerText||'').replace(/\s+/g,' ').trim();
  // Find Update Status section
  const h2s=[...document.querySelectorAll('h2')];
  const update=h2s.find(h=>t(h)==='Update Status');
  let section=null;
  if(update){
    let n=update.parentElement;
    section={parentText:t(n).slice(0,400), html:n.outerHTML.slice(0,1500)};
  }
  return {
    section,
    textareas:[...document.querySelectorAll('textarea')].map(ta=>({id:ta.id, outer:ta.outerHTML.slice(0,250)})),
    selects:[...document.querySelectorAll('select,[role=button][aria-haspopup],#status, [id*=status]')].slice(0,20).map(el=>({tag:el.tagName,id:el.id,role:el.getAttribute('role'),text:t(el).slice(0,80)})),
    noteHeading: document.getElementById('add-claim-review-note')?.tagName,
    noteTextareas: [...document.querySelectorAll('#add-claim-review-note')].map(el=>({tag:el.tagName, id:el.id}))
  };
});
console.log('claimDom', JSON.stringify(claimDom,null,2));

await page.getByRole('button',{name:'DENY CLAIM'}).click();
await page.waitForTimeout(500);
const deny=await page.evaluate(()=>{
  const d=document.querySelector('[role=dialog],.MuiDialog-root');
  const t=el=>(el?.innerText||'').replace(/\s+/g,' ').trim();
  return {
    title: [...d.querySelectorAll('h2,.MuiDialogTitle-root')].map(x=>t(x)),
    labels:[...d.querySelectorAll('label')].map(l=>({for:l.htmlFor,text:t(l)})),
    inputs:[...d.querySelectorAll('textarea,input')].map(i=>({id:i.id, name:i.name, type:i.type, required:i.required, aria:i.getAttribute('aria-label')})),
    buttons:[...d.querySelectorAll('button')].map(b=>t(b)).filter(Boolean)
  };
});
console.log('deny', deny);
await page.keyboard.press('Escape');

// Moderation reject + matches
await page.goto(`${BASE}/dashboard/moderation-queue`,{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForSelector('table tbody tr');
await page.waitForTimeout(1500);
const pp=context.waitForEvent('page');
await page.locator('table tbody tr').first().click();
const detail=await pp;
await detail.waitForLoadState('domcontentloaded');
await detail.waitForTimeout(2500);
await detail.getByRole('button',{name:'REJECT CONTRIBUTION'}).click();
await detail.waitForTimeout(800);
const rej=await detail.evaluate(()=>{
  const d=[...document.querySelectorAll('[role=dialog],.MuiDialog-root')].find(el=>getComputedStyle(el).display!=='none');
  const t=el=>(el?.innerText||'').replace(/\s+/g,' ').trim();
  return {
    title:[...d.querySelectorAll('h2,.MuiDialogTitle-root,h3')].map(x=>t(x)),
    fullText:t(d).slice(0,800),
    labels:[...d.querySelectorAll('label')].map(l=>({for:l.htmlFor,text:t(l),id:l.id})),
    inputs:[...d.querySelectorAll('textarea,input')].map(i=>({id:i.id,name:i.name,type:i.type,placeholder:i.placeholder,aria:i.getAttribute('aria-label'),className:String(i.className).slice(0,80)})),
    buttons:[...d.querySelectorAll('button')].map(b=>({text:t(b),disabled:b.disabled})).filter(b=>b.text)
  };
});
console.log('mod reject', JSON.stringify(rej,null,2));
await detail.keyboard.press('Escape');
await detail.waitForTimeout(500);
// potential matches UI
const matches=await detail.evaluate(()=>{
  const t=el=>(el?.innerText||'').replace(/\s+/g,' ').trim();
  return {
    headings:[...document.querySelectorAll('h1,h2,h3')].map(h=>t(h)).filter(h=>/Potential|Match|Moderation|Contribution|PENDING|CREATE|REJECT/i.test(h)||h.length<60),
    buttons:[...document.querySelectorAll('button')].map(b=>({text:t(b),disabled:b.disabled})).filter(b=>b.text&&!['How It Works','About Us','Language','My Account','Log Out','Reject','Accept'].includes(b.text)),
    links:[...document.querySelectorAll('a')].map(a=>({text:t(a),href:a.getAttribute('href')})).filter(a=>/facilit|os|match|claim/i.test((a.text||'')+(a.href||''))).slice(0,20),
    tableHeaders:[...document.querySelectorAll('table thead th')].map(th=>t(th)),
    firstMatchRow:t(document.querySelector('table tbody tr')).slice(0,300)
  };
});
console.log('matches', JSON.stringify(matches,null,2));

// apiblocks contributor label text near CONTRIBUTORS
await page.goto(`${BASE}/dashboard/apiblocks`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(3000);
const api=await page.evaluate(()=>{
  const t=el=>(el?.innerText||'').replace(/\s+/g,' ').trim();
  const c=document.getElementById('CONTRIBUTORS');
  return {
    contributorsParent: c?.parentElement ? t(c.parentElement).slice(0,200) : null,
    labels:[...document.querySelectorAll('label')].map(l=>({for:l.htmlFor,text:t(l)})),
    emptyMessages:[...document.querySelectorAll('p,h3,div')].map(el=>t(el)).filter(x=>/no |empty|block/i.test(x)&&x.length<80).slice(0,20),
    bodyAroundTables: t(document.querySelector('#mainPanel')||document.body).slice(0,800)
  };
});
console.log('api', JSON.stringify(api,null,2));

// Dashboard empty-state note for claims default URL without filter
await page.goto(`${BASE}/dashboard/claims`,{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForTimeout(3000);
console.log('claims url after load', page.url());
const claimsFilters=await page.evaluate(()=>({
  claimStatuses: document.getElementById('CLAIM_STATUSES')?.innerText,
  countries: document.getElementById('COUNTRIES')?.innerText,
}));
console.log('claims filters', claimsFilters);

fs.writeFileSync('.cursor/sessions/final-bits.json', JSON.stringify({claimDom,deny,rej,matches,api,claimsFilters},null,2));
await browser.close();
