import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
const BASE = process.env.BASE_URL;
const EMAIL = process.env.USER_ADMIN_EMAIL;
const PASS = process.env.USER_ADMIN_PASSWORD;

async function deepDump(page, label) {
  const info = await page.evaluate(() => {
    const t = el => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      h2: [...document.querySelectorAll('h1,h2')].map(el => t(el)).filter(Boolean),
      buttons: [...document.querySelectorAll('button')].map(el => ({
        text: t(el).slice(0,120), aria: el.getAttribute('aria-label'), id: el.id||null, disabled: el.disabled,
        visible: !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length)
      })).filter(b => b.visible && !['How It Works','About Us','Language','My Account','Log Out'].includes(b.text)),
      inputs: [...document.querySelectorAll('input,textarea,select')].map(el => {
        const r=el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(), type: el.type, id: el.id||null, name: el.name||null,
          placeholder: el.placeholder||null, visible: r.width>0||r.height>0,
          prevLabel: el.previousElementSibling && el.previousElementSibling.tagName==='LABEL' ? t(el.previousElementSibling) : null,
          parentText: el.parentElement ? t(el.parentElement).slice(0,80) : null,
          forLabel: el.id ? (document.querySelector(`label[for="${CSS.escape(el.id)}"]`) && t(document.querySelector(`label[for="${CSS.escape(el.id)}"]`))) : null,
        };
      }).filter(i=>i.visible),
      dialogs: [...document.querySelectorAll('[role=dialog],.MuiDialog-root')].map(d => ({
        display: getComputedStyle(d).display,
        visibility: getComputedStyle(d).visibility,
        titles: [...d.querySelectorAll('h1,h2,h3,h4,.MuiDialogTitle-root')].map(x=>t(x)),
        text: t(d).slice(0,600),
        buttons: [...d.querySelectorAll('button')].map(b=>t(b)),
        inputs: [...d.querySelectorAll('input,textarea')].map(i=>({id:i.id,type:i.type,label: document.querySelector(`label[for="${i.id}"]`)?.innerText}))
      })),
      tables: [...document.querySelectorAll('table')].map(tb => ({
        headers: [...tb.querySelectorAll('thead th')].map(th=>t(th)),
        rows: tb.querySelectorAll('tbody tr').length,
        firstRow: t(tb.querySelector('tbody tr')).slice(0,200)
      })),
      allForIds: [...document.querySelectorAll('label[for]')].map(l=>({for:l.getAttribute('for'), text:t(l)})),
      elementsById: ['ADDRESS','COUNTRIES','CONTRIBUTORS','STATUS','RESPONSIBILITY','CLAIM_STATUSES','DATA_SOURCE','MODERATION_STATUS','before-date','after-date','dialog-text-field','status-change-reason','add-claim-review-note','contributors'].map(id => {
        const el = document.getElementById(id);
        if (!el) return {id, found:false};
        return {id, found:true, tag:el.tagName, type:el.type||null, placeholder:el.placeholder||null, name:el.name||null, text:t(el).slice(0,80)};
      }),
      bodyHas: {
        rejectList: /REJECT LIST/i.test(document.body.innerText),
        approveClaim: /APPROVE CLAIM/i.test(document.body.innerText),
        statusChangeReason: !!document.getElementById('status-change-reason'),
      }
    };
  });
  info.label = label;
  console.log('\n====', label, info.url);
  console.log('h2', info.h2.filter(h=>!/What is OS Hub|Who is it|What does it|Resources|Technology|Featured|Organization|People|Connect|Follow Us/.test(h)));
  console.log('buttons', info.buttons.slice(0,30));
  console.log('inputs', info.inputs);
  console.log('dialogs', JSON.stringify(info.dialogs,null,2));
  console.log('tables', info.tables);
  console.log('byId', info.elementsById.filter(e=>e.found || ['ADDRESS','status-change-reason','dialog-text-field'].includes(e.id)));
  console.log('labels for=', info.allForIds);
  console.log('bodyHas', info.bodyHas);
  return info;
}

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900}});
const out=[];

await page.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded',timeout:60000});
await page.locator('#LOGIN_EMAIL').fill(EMAIL);
await page.locator('#LOGIN_PASSWORD').fill(PASS);
await page.getByRole('button',{name:'LOG IN'}).click();
await page.getByRole('button',{name:'My Account'}).waitFor({timeout:30000});

// Deny dialog on claim
await page.goto(`${BASE}/dashboard/claims/5823`,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(2500);
await page.getByRole('button',{name:'DENY CLAIM'}).click();
await page.waitForTimeout(1000);
out.push(await deepDump(page, 'claim-deny-dialog'));
await page.keyboard.press('Escape');

// Moderation: click first PENDING row button by aria
await page.goto(`${BASE}/dashboard/moderation-queue`,{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForTimeout(4000);
const pending = page.locator('button[aria-label^="View contribution record"]').filter({hasText:'PENDING'}).first();
console.log('pending count', await page.locator('button[aria-label^="View contribution record"]').count());
// rows that include PENDING text
const rowBtn = page.locator('table tbody tr button[aria-label^="View contribution record"], button[aria-label^="View contribution record"]').first();
// Better: evaluate click first PENDING
const clicked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button[aria-label^="View contribution record"]')];
  const pendingBtn = btns.find(b => (b.innerText||'').includes('PENDING'));
  if (pendingBtn) { pendingBtn.click(); return pendingBtn.getAttribute('aria-label'); }
  if (btns[0]) { btns[0].click(); return 'first:'+btns[0].getAttribute('aria-label'); }
  return null;
});
console.log('clicked moderation', clicked);
await page.waitForTimeout(5000);
out.push(await deepDump(page, 'moderation-queue-detail'));

// Try moderation approve/reject buttons if on detail
const modBtns = await page.getByRole('button').allTextContents();
console.log('all buttons on mod detail', modBtns.filter(t=>t && t.length<40));

// Lists: filter pending / look for REJECT LIST text in page source of a pending list if any
await page.goto(`${BASE}/dashboard/lists`,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(3000);
// open Status filter and try PENDING if available
const statusLabel = page.locator('label:has-text("List Status")');
console.log('list status label', await statusLabel.count());
out.push(await deepDump(page, 'lists-filters'));
// Check Active column values
const actives = await page.locator('table tbody tr td:last-child').allTextContents();
console.log('Active col sample', actives.slice(0,10));

// Find a list with potential reject - search page for Reject
const hasRejectListBtn = await page.getByRole('button',{name:/REJECT/i}).allTextContents();
console.log('REJECT-ish buttons on lists', hasRejectListBtn);

// apiblocks deep
await page.goto(`${BASE}/dashboard/apiblocks`,{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForTimeout(5000);
out.push(await deepDump(page, 'apiblocks-deep'));
// contributor filter label
console.log('apiblocks text snippet', (await page.locator('h2').allTextContents()));

// geocoder DOM for ADDRESS
await page.goto(`${BASE}/dashboard/geocoder`,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(2000);
const geoDom = await page.evaluate(() => {
  const addrLabel = document.querySelector('label[for="ADDRESS"]');
  const addr = document.getElementById('ADDRESS');
  const countries = document.getElementById('COUNTRIES');
  return {
    addrLabel: addrLabel?.outerHTML?.slice(0,300),
    addrOuter: addr?.outerHTML?.slice(0,300),
    countriesOuter: countries?.outerHTML?.slice(0,300),
    allInputs: [...document.querySelectorAll('input,textarea')].map(el=>({id:el.id,name:el.name,placeholder:el.placeholder,type:el.type,outer:el.outerHTML.slice(0,200)}))
  };
});
console.log('geoDom', JSON.stringify(geoDom,null,2));
out.push({label:'geocoder-dom', ...geoDom});

// Update facility location contributor select id
await page.goto(`${BASE}/dashboard/updatefacilitylocation`,{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(1500);
out.push(await deepDump(page, 'update-location-deep'));

// Admin filter headings more carefully  
await page.goto(`${BASE}/admin/api/source/?source_type__exact=LIST`,{waitUntil:'domcontentloaded',timeout:90000});
if ((await page.title()).includes('Log in')) {
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASS);
  await page.getByRole('button',{name:'Log In'}).click();
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/admin/api/source/?source_type__exact=LIST`,{waitUntil:'domcontentloaded',timeout:90000});
}
const admin = await page.evaluate(() => {
  const filter = document.querySelector('#changelist-filter');
  return {
    url: location.href,
    filterHTML: filter ? filter.innerText.slice(0,800) : null,
    search: document.querySelector('#searchbar') ? {id:'searchbar', name: document.querySelector('#searchbar').name, placeholder: document.querySelector('#searchbar').placeholder} : null,
    q: document.querySelector('input[name=q]') ? true : false,
    resultListHeaders: [...document.querySelectorAll('#result_list thead th')].map(th=>th.innerText.trim()),
    firstRow: document.querySelector('#result_list tbody tr')?.innerText?.slice(0,200),
    breadcrumbs: document.querySelector('.breadcrumbs')?.innerText,
  };
});
console.log('admin', admin);
out.push({label:'admin-source-list', ...admin});

fs.writeFileSync('.cursor/sessions/dashboard-locators-pass3.json', JSON.stringify(out,null,2));
console.log('done', out.length);
await browser.close();
