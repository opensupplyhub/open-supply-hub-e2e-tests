import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const BASE = process.env.BASE_URL;
const EMAIL = process.env.USER_ADMIN_EMAIL;
const PASS = process.env.USER_ADMIN_PASSWORD;

async function dump(page, label) {
  const info = await page.evaluate(() => {
    const t = el => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    const vis = el => {
      if (!el) return false;
      const s = getComputedStyle(el);
      if (s.display==='none'||s.visibility==='hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width>0 || r.height>0 || el.offsetParent!==null;
    };
    return {
      url: location.href,
      title: document.title,
      headings: [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map(el=>({tag:el.tagName,text:t(el),id:el.id||null})),
      buttons: [...document.querySelectorAll('button,[role=button],input[type=submit],input[type=button]')].filter(vis).map(el=>({
        text: t(el)||el.value||'', aria: el.getAttribute('aria-label'), id: el.id||null, disabled: !!el.disabled,
        testId: el.getAttribute('data-testid'), className: String(el.className||'').slice(0,100)
      })),
      inputs: [...document.querySelectorAll('input,textarea,select')].filter(vis).map(el=>{
        let label=null; if(el.id){ const lab=document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if(lab) label=t(lab); }
        return {tag:el.tagName.toLowerCase(), type:el.type||null, id:el.id||null, name:el.name||null, placeholder:el.placeholder||null, label, aria:el.getAttribute('aria-label')};
      }),
      labels: [...document.querySelectorAll('label')].filter(vis).map(l=>({text:t(l).slice(0,120), for:l.getAttribute('for')})),
      dialogs: [...document.querySelectorAll('[role=dialog],.MuiDialog-root,[aria-modal=true]')].filter(vis).map(d=>({
        aria:d.getAttribute('aria-label'), titles:[...d.querySelectorAll('h1,h2,h3,h4,.MuiDialogTitle-root')].map(x=>t(x)),
        text:t(d).slice(0,500),
        buttons:[...d.querySelectorAll('button')].map(b=>t(b)||b.getAttribute('aria-label')),
        inputs:[...d.querySelectorAll('input,textarea,select')].map(i=>({id:i.id,name:i.name,type:i.type,placeholder:i.placeholder}))
      })),
      links: [...document.querySelectorAll('a[href]')].filter(vis).map(a=>({text:t(a), href:a.getAttribute('href')})).filter(a=>a.text).slice(0,120),
      idsInteresting: [...document.querySelectorAll('[id]')].map(e=>e.id).filter(id=>/status|reason|claim|facility|os|search|id_|ADDRESS|COUNTRIES|before|after|CONTRIBUTOR|RESPONSIBILITY|CLAIM|MODERATION|DATA_SOURCE|is_active|LOGIN/i.test(id)).slice(0,100),
      bodySnippet: t(document.body).slice(0,1000),
      navTexts: [...document.querySelectorAll('nav a, [class*="Dashboard"] a, aside a, .MuiDrawer-root a, [class*="sidebar"] a, [class*="SideBar"] a')].filter(vis).map(a=>({text:t(a), href:a.getAttribute('href')})),
    };
  });
  info.label = label;
  console.log('\n====', label, '====');
  console.log('URL:', info.url);
  console.log('Headings:', info.headings.map(h=>h.text));
  const actionBtns = info.buttons.filter(b=>!['How It Works','About Us','Language','My Account','Log Out'].includes(b.text));
  console.log('Buttons:', JSON.stringify(actionBtns.slice(0,40), null, 0));
  console.log('Inputs:', JSON.stringify(info.inputs.slice(0,30)));
  console.log('Labels:', JSON.stringify(info.labels.slice(0,30)));
  console.log('Dialogs:', JSON.stringify(info.dialogs,null,2));
  console.log('Interesting IDs:', info.idsInteresting);
  console.log('Nav:', info.navTexts.slice(0,40));
  const dashLinks = info.links.filter(l => (l.href||'').includes('/dashboard') || (l.href||'').includes('/admin') || /claim/i.test(l.href||''));
  console.log('Dash/admin links:', dashLinks.slice(0,50));
  return info;
}

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900}});
const out = [];

await page.goto(`${BASE}/auth/login`, {waitUntil:'domcontentloaded', timeout:60000});
await page.locator('#LOGIN_EMAIL').fill(EMAIL);
await page.locator('#LOGIN_PASSWORD').fill(PASS);
await page.getByRole('button', {name:'LOG IN'}).click();
await page.getByRole('button', {name:'My Account'}).waitFor({timeout:30000});

await page.goto(`${BASE}/dashboard`, {waitUntil:'domcontentloaded', timeout:60000});
await page.waitForTimeout(2500);
out.push(await dump(page, '/dashboard'));

await page.goto(`${BASE}/dashboard/lists`, {waitUntil:'domcontentloaded', timeout:60000});
await page.waitForTimeout(3000);
out.push(await dump(page, '/dashboard/lists'));
const listRow = page.locator('table tbody tr').first();
if (await listRow.count()) {
  await listRow.click();
  await page.waitForTimeout(2500);
  out.push(await dump(page, '/dashboard/lists-after-row-click'));
}

await page.goto(`${BASE}/dashboard/claims/?statuses=PENDING`, {waitUntil:'domcontentloaded', timeout:90000});
await page.waitForTimeout(3000);
const claimId = await page.evaluate(() => {
  const row = document.querySelector('table tbody tr');
  if (!row) return null;
  const cells = [...row.querySelectorAll('td')];
  return { claimId: cells[0]?.innerText?.trim(), cellHtml: cells[0]?.innerHTML?.slice(0,300), rowText: row.innerText.slice(0,150) };
});
console.log('First pending claim:', claimId);
if (claimId?.claimId) {
  await page.locator('table tbody tr').first().locator('td').first().click();
  await page.waitForTimeout(3000);
  let info = await dump(page, 'claims-after-claimid-click');
  out.push(info);
  for (const path of [`/dashboard/claims/${claimId.claimId}`, `/dashboard/claim/${claimId.claimId}`]) {
    console.log('Trying', path);
    const resp = await page.goto(`${BASE}${path}`, {waitUntil:'domcontentloaded', timeout:60000});
    await page.waitForTimeout(2500);
    info = await dump(page, `claim-try-${path}`);
    info.status = resp?.status();
    out.push(info);
    if (info.buttons.some(b => /APPROVE|DENY|CLAIM/i.test(b.text||''))) break;
  }
}

const approve = page.getByRole('button', { name: /APPROVE CLAIM/i });
if (await approve.count() && await approve.first().isVisible().catch(()=>false)) {
  await approve.first().click();
  await page.waitForTimeout(1000);
  out.push(await dump(page, 'claim-approve-dialog'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}
const deny = page.getByRole('button', { name: /DENY CLAIM/i });
if (await deny.count() && await deny.first().isVisible().catch(()=>false)) {
  await deny.first().click();
  await page.waitForTimeout(1000);
  out.push(await dump(page, 'claim-deny-dialog'));
  await page.keyboard.press('Escape');
}

try {
  await page.goto(`${BASE}/dashboard/apiblocks`, {waitUntil:'domcontentloaded', timeout:90000});
  await page.waitForTimeout(5000);
  out.push(await dump(page, '/dashboard/apiblocks'));
} catch(e) {
  out.push({label:'/dashboard/apiblocks', error: String(e)});
}

await page.goto(`${BASE}/dashboard/moderation-queue`, {waitUntil:'domcontentloaded', timeout:90000});
await page.waitForTimeout(4000);
const pendingRowBtn = page.locator('table tbody tr').filter({hasText:'PENDING'}).first().locator('button[aria-label*="View contribution record"]');
if (await pendingRowBtn.count()) {
  await pendingRowBtn.click();
  await page.waitForTimeout(4000);
  out.push(await dump(page, 'moderation-queue-detail'));
} else {
  out.push({label:'moderation-queue-detail', note:'no pending row button'});
}

for (const p of ['/dashboard/deletefacility','/dashboard/mergefacilities','/dashboard/linkid','/dashboard/updatefacilitylocation','/dashboard/adjustfacilitymatches','/dashboard/activityreports','/dashboard/geocoder']) {
  await page.goto(`${BASE}${p}`, {waitUntil:'domcontentloaded', timeout:60000});
  await page.waitForTimeout(2000);
  out.push(await dump(page, p+'-structure'));
}

await page.goto(`${BASE}/admin/api/source/?source_type__exact=LIST`, {waitUntil:'domcontentloaded', timeout:90000});
if ((await page.title()).includes('Log in')) {
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASS);
  await page.getByRole('button', {name:'Log In'}).click();
  await page.waitForTimeout(2000);
  await page.goto(`${BASE}/admin/api/source/?source_type__exact=LIST`, {waitUntil:'domcontentloaded', timeout:90000});
}
await page.waitForTimeout(2000);
const adminList = await dump(page, '/admin/api/source/?source_type__exact=LIST');
adminList.resultHeaders = await page.locator('#result_list thead th').allTextContents().catch(()=>[]);
adminList.searchbarCount = await page.locator('#searchbar').count();
adminList.qName = await page.locator('input[name="q"]').count();
adminList.filterH3 = await page.locator('#changelist-filter h2, #changelist-filter h3, #changelist-filter summary').allTextContents().catch(()=>[]);
out.push(adminList);
const firstChange = page.locator('#result_list tbody tr th a').first();
if (await firstChange.count()) {
  const href = await firstChange.getAttribute('href');
  console.log('Opening source change', href);
  await firstChange.click();
  await page.waitForTimeout(2000);
  const change = await dump(page, '/admin/api/source/<id>/change');
  change.isActive = await page.evaluate(() => {
    const el = document.querySelector('#id_is_active');
    if (!el) return {found:false, allIds:[...document.querySelectorAll('[id^=id_]')].map(e=>e.id).slice(0,40)};
    return {found:true, id: el.id, name: el.name, type: el.type, checked: el.checked, label: document.querySelector('label[for="id_is_active"]')?.innerText};
  });
  change.submitButtons = await page.locator('input[type=submit]').evaluateAll(els => els.map(e=>({value:e.value, name:e.name})));
  out.push(change);
}

fs.writeFileSync('.cursor/sessions/dashboard-locators-followup.json', JSON.stringify(out, null, 2));
console.log('Wrote followup JSON, entries', out.length);
await browser.close();
