import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = process.env.BASE_URL || 'https://test.os-hub.net';
const EMAIL = process.env.USER_ADMIN_EMAIL;
const PASSWORD = process.env.USER_ADMIN_PASSWORD;
const OUT = path.join(__dirname, '..', '.cursor', 'sessions', 'dashboard-locators.json');

if (!EMAIL || !PASSWORD) {
  console.error('Missing USER_ADMIN_EMAIL or USER_ADMIN_PASSWORD');
  process.exit(1);
}

async function extractPageInfo(page, label) {
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const text = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 || r.height > 0 || el.offsetParent !== null;
    };

    const headings = [...document.querySelectorAll('h1,h2,h3,h4,[role="heading"]')]
      .filter(visible)
      .map(el => ({ tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), text: text(el), id: el.id || null }));

    const buttons = [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')]
      .filter(visible)
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type'),
        text: text(el) || el.value || '',
        ariaLabel: el.getAttribute('aria-label'),
        id: el.id || null,
        name: el.getAttribute('name'),
        className: (el.className && String(el.className).slice?.(0, 120)) || null,
        disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
      }));

    const links = [...document.querySelectorAll('a[href]')]
      .filter(visible)
      .map(el => ({
        text: text(el),
        href: el.getAttribute('href'),
        id: el.id || null,
        ariaLabel: el.getAttribute('aria-label'),
      }))
      .filter(l => l.text || l.ariaLabel)
      .slice(0, 80);

    const inputs = [...document.querySelectorAll('input, textarea, select')]
      .filter(visible)
      .map(el => {
        const id = el.id || null;
        let label = null;
        if (id) {
          const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (lab) label = text(lab);
        }
        if (!label) {
          const parentLabel = el.closest('label');
          if (parentLabel) label = text(parentLabel).slice(0, 80);
        }
        return {
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          id,
          name: el.getAttribute('name'),
          placeholder: el.getAttribute('placeholder'),
          ariaLabel: el.getAttribute('aria-label'),
          label,
          value: el.type === 'password' ? '[redacted]' : (el.value || '').slice(0, 60),
        };
      });

    const dialogs = [...document.querySelectorAll('[role="dialog"], .MuiDialog-root, .MuiModal-root, [aria-modal="true"]')]
      .filter(visible)
      .map(el => ({
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        textPreview: text(el).slice(0, 300),
        titles: [...el.querySelectorAll('h1,h2,h3,h4,[role="heading"],.MuiDialogTitle-root')].map(t => text(t)),
        buttons: [...el.querySelectorAll('button,[role="button"]')].map(b => text(b) || b.getAttribute('aria-label')),
        inputs: [...el.querySelectorAll('input,textarea,select')].map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder })),
      }));

    const tables = [...document.querySelectorAll('table')]
      .filter(visible)
      .slice(0, 5)
      .map(t => ({
        id: t.id || null,
        className: (t.className && String(t.className).slice?.(0, 80)) || null,
        headers: [...t.querySelectorAll('thead th, thead td')].map(th => text(th)),
        rowCount: t.querySelectorAll('tbody tr').length,
        firstRowLinks: [...t.querySelectorAll('tbody tr:first-child a')].slice(0, 5).map(a => ({ text: text(a), href: a.getAttribute('href') })),
        firstRowCells: [...t.querySelectorAll('tbody tr:first-child td, tbody tr:first-child th')].slice(0, 12).map(c => text(c).slice(0, 80)),
      }));

    const labels = [...document.querySelectorAll('label')]
      .filter(visible)
      .map(l => ({ text: text(l).slice(0, 100), for: l.getAttribute('for'), id: l.id || null }))
      .filter(l => l.text)
      .slice(0, 60);

    const bodyText = text(document.body).slice(0, 500);
    const errorSignals = [];
    if (/not found|404|something went wrong|error|access denied|forbidden|permission/i.test(bodyText)) {
      errorSignals.push(bodyText.slice(0, 200));
    }
    const h2s = headings.filter(h => h.tag === 'h2' || h.tag === 'h1').map(h => h.text);

    return {
      title: document.title,
      url: location.href,
      headings,
      h2s,
      buttons,
      links: links.filter(l => {
        const href = l.href || '';
        return href.includes('/dashboard') || href.includes('/admin') || href.includes('/claim') || href.includes('/facilities') || /approve|deny|reject|geocode|flip|merge|delete|submit|download|filter|search|save|confirm|cancel|pending|moderation/i.test(l.text + (l.ariaLabel||''));
      }).concat(links.slice(0, 25)).filter((v,i,a)=>a.findIndex(x=>x.text===v.text&&x.href===v.href)===i).slice(0,40),
      inputs,
      dialogs,
      tables,
      labels,
      bodyTextPreview: bodyText,
      errorSignals,
    };
  });

  return { label, ...info };
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const results = { baseUrl: BASE_URL, scrapedAt: new Date().toISOString(), pages: [] };

  console.log('Logging in via /auth/login...');
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('#LOGIN_EMAIL').fill(EMAIL);
  await page.locator('#LOGIN_PASSWORD').fill(PASSWORD);
  await page.getByRole('button', { name: 'LOG IN' }).click();
  await page.waitForTimeout(3000);
  try {
    await page.getByRole('button', { name: 'My Account' }).waitFor({ state: 'visible', timeout: 20000 });
    console.log('Login OK (My Account visible)');
  } catch (e) {
    console.log('My Account not visible, current URL:', page.url());
    results.loginNote = 'My Account not visible after login';
    results.loginUrl = page.url();
    results.loginBody = (await page.locator('body').innerText()).slice(0, 400);
  }

  // Cookie banner
  try {
    const accept = page.getByRole('button', { name: /accept/i });
    if (await accept.isVisible({ timeout: 2000 })) await accept.click();
  } catch {}

  const paths = [
    '/dashboard',
    '/dashboard/lists',
    '/dashboard/claims',
    '/dashboard/deletefacility',
    '/dashboard/mergefacilities',
    '/dashboard/adjustfacilitymatches',
    '/dashboard/updatefacilitylocation',
    '/dashboard/apiblocks',
    '/dashboard/activityreports',
    '/dashboard/linkid',
    '/dashboard/geocoder',
    '/dashboard/moderation-queue',
  ];

  for (const p of paths) {
    console.log('Visiting', p);
    try {
      await page.goto(`${BASE_URL}${p}`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(2000);
      const info = await extractPageInfo(page, p);
      results.pages.push(info);
      console.log('  headings:', info.h2s?.slice(0, 3).join(' | '));
      console.log('  buttons:', info.buttons.map(b => b.text || b.ariaLabel).filter(Boolean).slice(0, 15).join(', '));
    } catch (err) {
      console.error('  ERROR', p, err.message);
      results.pages.push({ label: p, error: err.message, url: page.url() });
    }
  }

  // Claim detail if pending exists
  console.log('Looking for claim detail...');
  try {
    await page.goto(`${BASE_URL}/dashboard/claims`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2500);
    const claimLink = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('table tbody tr, a[href*="/dashboard/claims/"]')];
      for (const a of document.querySelectorAll('a[href*="/dashboard/claims/"]')) {
        const href = a.getAttribute('href');
        if (href && /\/dashboard\/claims\/\d+/.test(href)) {
          return { href, text: (a.innerText || '').trim() };
        }
      }
      // try first data row clickable
      const firstLink = document.querySelector('table tbody tr a');
      if (firstLink) return { href: firstLink.getAttribute('href'), text: (firstLink.innerText || '').trim() };
      return null;
    });
    if (claimLink?.href) {
      const href = claimLink.href.startsWith('http') ? claimLink.href : `${BASE_URL}${claimLink.href}`;
      console.log('Opening claim', href);
      await page.goto(href, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(2000);
      const claimInfo = await extractPageInfo(page, 'claim-detail');
      claimInfo.openedFrom = claimLink;
      results.pages.push(claimInfo);

      // Try to observe approve/deny dialogs without confirming destructive actions
      for (const btnName of ['APPROVE CLAIM', 'DENY CLAIM', 'Approve Claim', 'Deny Claim', 'APPROVE', 'DENY']) {
        const btn = page.getByRole('button', { name: btnName, exact: true });
        if (await btn.count() && await btn.first().isVisible().catch(() => false)) {
          console.log('Clicking to open dialog:', btnName);
          await btn.first().click();
          await page.waitForTimeout(1000);
          const withDialog = await extractPageInfo(page, `claim-detail-after-${btnName}`);
          results.pages.push(withDialog);
          // close dialog if cancel/close exists
          const cancel = page.getByRole('button', { name: /cancel|close|no/i });
          if (await cancel.count()) {
            await cancel.first().click().catch(() => {});
            await page.waitForTimeout(500);
          } else {
            await page.keyboard.press('Escape');
          }
          break;
        }
      }
    } else {
      results.pages.push({ label: 'claim-detail', note: 'No claim detail link found on /dashboard/claims', url: page.url() });
    }
  } catch (err) {
    results.pages.push({ label: 'claim-detail', error: err.message });
  }

  // Moderation queue first pending
  console.log('Opening first pending moderation record...');
  try {
    await page.goto(`${BASE_URL}/dashboard/moderation-queue`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(3000);
    // Prefer PENDING status row
    const modLink = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('table tbody tr')];
      for (const row of rows) {
        const t = (row.innerText || '').toUpperCase();
        if (t.includes('PENDING')) {
          const a = row.querySelector('a');
          if (a) return { href: a.getAttribute('href'), text: (a.innerText || '').trim(), rowText: row.innerText.slice(0, 200) };
          // sometimes whole row is clickable
          return { href: null, rowIndex: rows.indexOf(row), rowText: row.innerText.slice(0, 200), clickRow: true };
        }
      }
      const firstA = document.querySelector('table tbody tr a');
      if (firstA) return { href: firstA.getAttribute('href'), text: (firstA.innerText || '').trim(), note: 'first row link (no PENDING found)' };
      const firstRow = document.querySelector('table tbody tr');
      if (firstRow) return { href: null, clickRow: true, rowIndex: 0, rowText: firstRow.innerText.slice(0, 200) };
      return null;
    });

    if (modLink?.href) {
      const href = modLink.href.startsWith('http') ? modLink.href : `${BASE_URL}${modLink.href}`;
      await page.goto(href, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(2500);
      const modInfo = await extractPageInfo(page, 'moderation-queue-detail');
      modInfo.openedFrom = modLink;
      results.pages.push(modInfo);
    } else if (modLink?.clickRow) {
      const rows = page.locator('table tbody tr');
      await rows.nth(modLink.rowIndex || 0).click();
      await page.waitForTimeout(3000);
      const modInfo = await extractPageInfo(page, 'moderation-queue-detail');
      modInfo.openedFrom = modLink;
      results.pages.push(modInfo);
    } else {
      results.pages.push({ label: 'moderation-queue-detail', note: 'No pending/table rows found', url: page.url() });
    }
  } catch (err) {
    results.pages.push({ label: 'moderation-queue-detail', error: err.message });
  }

  // Django admin source LIST filter
  console.log('Visiting Django admin /admin/api/source/ ...');
  try {
    // May need separate django session - try main site cookies first; if login page, login
    await page.goto(`${BASE_URL}/admin/api/source/`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1500);
    if ((await page.title()).includes('Log in')) {
      console.log('Django login required...');
      await page.getByLabel('Email').fill(EMAIL);
      await page.getByLabel('Password').fill(PASSWORD);
      await page.getByRole('button', { name: 'Log In' }).click();
      await page.waitForTimeout(2000);
      await page.goto(`${BASE_URL}/admin/api/source/`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(1500);
    }

    // Try to set LIST filter if present
    const filterInfo = await page.evaluate(() => {
      const filters = [...document.querySelectorAll('#changelist-filter a, #changelist-filter li')].map(el => ({
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || '').trim(),
        href: el.getAttribute('href'),
      }));
      return { filters: filters.slice(0, 80), hasFilter: !!document.querySelector('#changelist-filter') };
    });

    let listFilterClicked = null;
    if (filterInfo.hasFilter) {
      const listLink = page.locator('#changelist-filter a').filter({ hasText: /^LIST$/i });
      const listLink2 = page.locator('#changelist-filter a').filter({ hasText: /LIST/i });
      if (await listLink.count()) {
        listFilterClicked = await listLink.first().getAttribute('href');
        await listLink.first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
      } else if (await listLink2.count()) {
        listFilterClicked = await listLink2.first().innerText();
        await listLink2.first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
      }
    }

    const adminInfo = await extractPageInfo(page, '/admin/api/source/');
    adminInfo.filterSidebar = filterInfo;
    adminInfo.listFilterClicked = listFilterClicked;
    // Also grab Django-specific bits
    adminInfo.djangoExtras = await page.evaluate(() => {
      return {
        searchId: document.querySelector('#searchbar')?.id || null,
        actionSelect: document.querySelector('select[name="action"]') ? true : false,
        resultListId: document.querySelector('#result_list')?.id || null,
        isActiveInputs: [...document.querySelectorAll('#id_is_active, input[name="is_active"]')].map(i => ({ id: i.id, name: i.name, type: i.type })),
        allIds: [...document.querySelectorAll('[id]')]
          .map(el => el.id)
          .filter(id => /^(id_|searchbar|changelist|result)/.test(id))
          .slice(0, 40),
        filterHeadings: [...document.querySelectorAll('#changelist-filter h3')].map(h => h.innerText.trim()),
        selectedFilters: [...document.querySelectorAll('#changelist-filter li.selected a, #changelist-filter a.selected')].map(a => ({ text: a.innerText.trim(), href: a.getAttribute('href') })),
      };
    });
    results.pages.push(adminInfo);
  } catch (err) {
    results.pages.push({ label: '/admin/api/source/', error: err.message });
  }

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log('Wrote', OUT);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
