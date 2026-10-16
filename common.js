// Shared by literature.html, knowledge.html and worklist.html.
// Load it in <head> (before first paint) so the saved theme applies without a flash.

// ============================================================
// THEME (☀/🌙) — one choice for all three tools, synced across open tabs
// ============================================================
const THEME_KEY = 'ml-theme';
try { const t = localStorage.getItem(THEME_KEY); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch(_) {}

function currentTheme() {
  return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}
function toggleTheme() {
  const t = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch(_) {}
  updateThemeBtn();
}
function updateThemeBtn() {
  const b = document.getElementById('theme-btn');
  if (!b) return;
  const dark = currentTheme() === 'dark';
  b.textContent = dark ? '☀' : '🌙';
  b.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
}
matchMedia('(prefers-color-scheme: light)').addEventListener('change', updateThemeBtn);
window.addEventListener('storage', e => {
  if (e.key !== THEME_KEY) return;
  if (e.newValue) document.documentElement.dataset.theme = e.newValue; else delete document.documentElement.dataset.theme;
  updateThemeBtn();
});
document.addEventListener('DOMContentLoaded', updateThemeBtn);

// ============================================================
// HELPERS
// ============================================================
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function sid(l){ return l.source && typeof l.source==='object' ? l.source.id : l.source; }
function tid(l){ return l.target && typeof l.target==='object' ? l.target.id : l.target; }
function splitList(v){ return [...new Set(String(v||'').split(',').map(t=>t.trim()).filter(Boolean))]; }
function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// For a single-quoted JS string inside a double-quoted HTML attribute
function escAttr(v){ return esc(String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")); }
function safeUrl(u){
  u = String(u||'').trim();
  if (!u) return '#';
  if (/^(https?:|mailto:)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '#'; // block javascript:, data:, …
  return 'https://' + u;
}
// Tags are stored lowercase, deduped and sorted alphabetically; matching is case-insensitive
function tkey(t){ return String(t??'').trim().toLowerCase(); }
function byAlpha(a,b){ return a.localeCompare(b, undefined, {sensitivity:'base'}); }
function uniqTags(list){ return [...new Set((list||[]).map(tkey).filter(Boolean))].sort(byAlpha); }
function fmtWhen(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? d.toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'}) : 'unknown';
}

// ============================================================
// TOAST + STATUS BAR
// ============================================================
function toast(msg, dur=2500) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.style.pointerEvents = ''; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(()=>el.classList.remove('show'), dur);
}
// Toast with one action button (e.g. Undo); stays up longer
function toastAction(msg, label, fn, dur=10000) {
  const el = document.getElementById('toast');
  el.innerHTML = `${esc(msg)} <button class="toast-btn">${esc(label)}</button>`;
  el.style.pointerEvents = 'auto'; el.classList.add('show');
  el.querySelector('.toast-btn').onclick = () => { el.classList.remove('show'); fn(); };
  clearTimeout(toast._t); toast._t = setTimeout(()=>el.classList.remove('show'), dur);
}
// Expects #status-txt and #save-dot (Literature, Knowledge)
function setStatus(msg, dirty) {
  document.getElementById('status-txt').textContent = msg;
  if (dirty !== undefined) document.getElementById('save-dot').classList.toggle('dirty', dirty);
}

// ============================================================
// DIALOGS — shared markup/styles, injected once
// ============================================================
function sharedUI() {
  if (document.getElementById('shared-ui')) return;
  const root = document.createElement('div');
  root.id = 'shared-ui';
  root.innerHTML = `
      <style>
        .sync-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900;align-items:center;justify-content:center;padding:16px}
        .sync-bg.open{display:flex}
        .sync-box{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:12px;padding:20px;width:440px;max-width:100%;max-height:90vh;overflow-y:auto}
        .sync-box h3{font-size:15px;margin-bottom:14px}
        .sync-row{display:flex;gap:10px;font-size:12px;margin-bottom:6px}
        .sync-k{width:70px;flex-shrink:0;font-weight:600;color:var(--muted, var(--c888))}
        .sync-note{font-size:11px;line-height:1.5;margin:12px 0 4px;color:var(--muted, var(--c888))}
        .sync-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
        .sync-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--border)}
        .sync-when{font-size:12px}
        .sync-why{font-size:11px;margin-top:2px;color:var(--muted, var(--c888))}
        .link-btn{background:none;border:none;cursor:pointer;font-size:11px;padding:0;font-family:inherit;color:var(--muted, var(--c888))}
        .link-btn:hover{color:var(--accent)}
        .sync-danger{color:var(--danger, #f72585);font-weight:600}
        .toast-btn{margin-left:10px;background:var(--accent);color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;cursor:pointer}
      </style>
      <div class="sync-bg" id="confirm-delete">
        <div class="sync-box">
          <h3 id="cd-title"></h3>
          <p class="sync-note" id="cd-detail"></p>
          <p class="sync-note sync-danger">This can't be undone.</p>
          <div class="sync-actions">
            <button class="btn btn-secondary btn-sm" data-choice="cancel">Cancel</button>
            <button class="btn btn-danger btn-sm" data-choice="delete">Delete</button>
          </div>
        </div>
      </div>
      <div class="sync-bg" id="sync-load">
        <div class="sync-box">
          <h3 id="sync-title"></h3>
          <div class="sync-row"><span class="sync-k">This file</span><span id="sync-file"></span></div>
          <div class="sync-row"><span class="sync-k">On screen</span><span id="sync-cur"></span></div>
          <p class="sync-note"><b>Merge</b> keeps everything from both. For items in both, the more recently edited version wins.
            Either way, your current work is backed up first (↶ Backups in the status bar).</p>
          <div class="sync-actions">
            <button class="btn btn-primary btn-sm" data-choice="merge">Merge</button>
            <button class="btn btn-secondary btn-sm" data-choice="replace">Replace with file</button>
            <button class="btn btn-secondary btn-sm" data-choice="cancel">Cancel</button>
          </div>
        </div>
      </div>
      <div class="sync-bg" id="sync-backups">
        <div class="sync-box">
          <h3>Backups</h3>
          <div id="sync-list"></div>
          <div class="sync-actions"><button class="btn btn-secondary btn-sm" data-choice="cancel">Close</button></div>
        </div>
      </div>`;
  document.body.appendChild(root);
}

// Show a dialog; resolves with the clicked [data-choice] value. Escape / backdrop = 'cancel'.
function openDialog(id, focusChoice) {
  sharedUI();
  return new Promise(resolve => {
    const bg = document.getElementById(id);
    const done = c => { bg.classList.remove('open'); document.removeEventListener('keydown', onKey, true); resolve(c); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); done('cancel'); } };
    bg.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => done(b.dataset.choice));
    bg.onclick = e => { if (e.target === bg) done('cancel'); };
    document.addEventListener('keydown', onKey, true);
    bg.classList.add('open');
    bg.querySelector(`[data-choice="${focusChoice}"]`)?.focus();
  });
}

// Deleting always needs an explicit click on the red button: Cancel has focus, so Enter / Escape never delete.
async function confirmDelete(title, detail = '') {
  sharedUI();
  document.getElementById('cd-title').textContent = title;
  document.getElementById('cd-detail').textContent = detail;
  document.getElementById('cd-detail').style.display = detail ? '' : 'none';
  return await openDialog('confirm-delete', 'cancel') === 'delete';
}

// ============================================================
// FILE SYNC — browser copy + linked JSON file, with safe loading
// ============================================================
// Every change is kept in localStorage. Once a JSON file is linked (File System Access API,
// Chrome/Edge) every change is also written to it, and the handle is remembered in IndexedDB.
// Loading a file never silently discards what's on screen:
//   • user Open: if the file differs, ask Merge / Replace / Cancel
//   • page load: keep whichever side was changed more recently
// Each time loading would change the screen, a backup is kept first (last 5, ↶ Backups) and an Undo toast is shown.
//
// cfg: fileName, lsKey, idbName, backupKey      storage names
//      itemsKey ('nodes' | 'concepts'), itemsLabel   where the items live in the data
//      snapshot()  → plain data to save           apply(data) → replace in-memory state and re-render
//      meta()      → the live metadata object (its lastModified is bumped on every change)
//      linkKey(l)  → duplicate key for links      acceptLink(links, l) → optional extra check (e.g. no cycles)
//      mergeExtra(cur, inc) → optional extra fields for a merged result (e.g. domains)
function createFileSync(cfg) {
  const canPick = 'showOpenFilePicker' in window;
  const JSON_TYPE = [{description:'JSON', accept:{'application/json':['.json']}}];
  let handle = null, pending = null, lastBackup = null, writes = Promise.resolve();

  // ---- IndexedDB: remember the linked file across reloads ----
  const idb = () => new Promise((res, rej) => {
    const req = indexedDB.open(cfg.idbName, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
    req.onsuccess = e => res(e.target.result);
    req.onerror = () => rej(req.error);
  });
  async function storeHandle(h) {
    try { (await idb()).transaction('handles','readwrite').objectStore('handles').put(h, 'file'); } catch(_) {}
  }
  async function loadHandle() {
    try {
      const db = await idb();
      return await new Promise((res, rej) => {
        const req = db.transaction('handles','readonly').objectStore('handles').get('file');
        req.onsuccess = () => res(req.result || null); req.onerror = rej;
      });
    } catch(_) { return null; }
  }

  // ---- data helpers ----
  const items = d => (d && d[cfg.itemsKey]) || [];
  const isEmpty = d => !items(d).length;
  const describe = d => `${items(d).length} ${cfg.itemsLabel} · ${(d.links||[]).length} links`;
  const json = () => JSON.stringify(cfg.snapshot(), null, 2);
  const modified = d => (d.metadata && d.metadata.lastModified) || '';
  // Content only: moving a node doesn't count as a change
  function contentKey(d) {
    const strip = n => { const {x,y,fx,fy,vx,vy,index, ...rest} = n; return rest; };
    const byId = (a,b) => String(a.id ?? a[0]).localeCompare(String(b.id ?? b[0]));
    return JSON.stringify([items(d).map(strip).sort(byId), (d.links||[]).map(l=>[l.id, sid(l), tid(l), l.label||'']).sort(byId)]);
  }
  // Union of both; for items in both, the more recently edited one wins (ties keep what's on screen)
  function merge(cur, inc) {
    const byId = new Map(items(cur).map(n => [n.id, n]));
    let added = 0, newer = 0, linksAdded = 0;
    items(inc).forEach(n => {
      const c = byId.get(n.id);
      if (!c) { byId.set(n.id, n); added++; }
      else if ((n.updated||'') > (c.updated||'')) { byId.set(n.id, {...n, x:c.x, y:c.y, fx:c.fx, fy:c.fy}); newer++; }
    });
    const ids = new Set(byId.keys());
    const links = (cur.links||[]).map(l => ({...l, source:sid(l), target:tid(l)}));
    const seen = new Set(links.map(l => l.id)), keys = new Set(links.map(cfg.linkKey));
    (inc.links||[]).forEach(l0 => {
      const l = {...l0, source:sid(l0), target:tid(l0)};
      if (seen.has(l.id) || keys.has(cfg.linkKey(l)) || !ids.has(l.source) || !ids.has(l.target)) return;
      if (cfg.acceptLink && !cfg.acceptLink(links, l)) return;
      links.push(l); seen.add(l.id); keys.add(cfg.linkKey(l)); linksAdded++;
    });
    const data = {...cur, ...(cfg.mergeExtra ? cfg.mergeExtra(cur, inc) : {}), links,
                  metadata: {...cur.metadata, lastModified: new Date().toISOString()}};
    data[cfg.itemsKey] = [...byId.values()];
    return { data, summary: `+${added} ${cfg.itemsLabel}, ${newer} updated, +${linksAdded} links` };
  }

  // ---- local copy ----
  function saveLocal() { try { localStorage.setItem(cfg.lsKey, JSON.stringify(cfg.snapshot())); } catch(_) {} }
  function loadLocal() { try { const d = localStorage.getItem(cfg.lsKey); return d ? JSON.parse(d) : null; } catch(_) { return null; } }

  // ---- linked file ----
  async function link(h) {
    handle = h; pending = null; await storeHandle(h);
    document.getElementById('file-name').textContent = h ? h.name : 'No file linked';
    document.getElementById('relink-banner').style.display = 'none';
  }
  async function write() {
    const w = await handle.createWritable();
    await w.write(json()); await w.close();
    setStatus(`Saved → ${handle.name}`, false);
  }
  // Queued so rapid changes never interleave writes
  function writeSilently() {
    writes = writes.then(write).catch(e => { console.error(e); setStatus('Auto-save failed · Ctrl/Cmd+S to retry', true); });
    return writes;
  }
  function download() {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([json()], {type:'application/json'})), download: cfg.fileName });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Downloaded ${cfg.fileName}`);
  }

  // ---- backups ----
  function pushBackup(reason, data = cfg.snapshot()) {
    if (isEmpty(data)) return;
    lastBackup = { data, handle };
    try {
      const list = JSON.parse(localStorage.getItem(cfg.backupKey) || '[]');
      list.unshift({ at: new Date().toISOString(), reason, data });
      localStorage.setItem(cfg.backupKey, JSON.stringify(list.slice(0, 5)));
    } catch(_) {}
  }
  function backups() { try { return JSON.parse(localStorage.getItem(cfg.backupKey) || '[]'); } catch(_) { return []; } }
  async function restore(data, msg) {
    cfg.apply(data); saveLocal();
    if (handle) await writeSilently(); else setStatus(`${msg} · Ctrl/Cmd+S to save to file`, true);
  }
  async function undo() {
    if (!lastBackup) return;
    const b = lastBackup; lastBackup = null;
    await link(b.handle);
    await restore(b.data, 'Restored previous work');
    toast('Restored your previous work');
  }

  function choose(name, inc) {
    const cur = cfg.snapshot();
    document.getElementById('sync-title').textContent = `Open ${name}?`;
    document.getElementById('sync-file').textContent = `${describe(inc)} · saved ${fmtWhen(modified(inc))}`;
    document.getElementById('sync-cur').textContent = `${describe(cur)} · changed ${fmtWhen(modified(cur))}`;
    return openDialog('sync-load', 'merge');
  }

  // ---- loading ----
  // Returns false if cancelled, 'quiet' if the screen didn't meaningfully change, true otherwise.
  async function adopt(inc, name, { h = null, startup = false } = {}) {
    const cur = cfg.snapshot();
    const linkIt = () => h ? link(h) : null;
    if (isEmpty(cur)) { await linkIt(); cfg.apply(inc); saveLocal(); return 'quiet'; }
    if (contentKey(inc) === contentKey(cur)) { await linkIt(); return 'quiet'; }

    if (startup) {
      await linkIt();
      if (modified(inc) > modified(cur)) {
        pushBackup(`Browser copy before loading newer ${name}`);
        cfg.apply(inc); saveLocal();
        toastAction(`Loaded newer ${name}`, 'Undo', undo);
      } else if (handle) {
        pushBackup(`${name} before it was overwritten by the newer browser copy`, inc);
        await writeSilently();
        toastAction(`Browser copy was newer — saved it to ${name}`, 'Undo', undo);
      } else setStatus(`Browser copy is newer than ${name} · Ctrl/Cmd+S to save`, true);
      return true;
    }

    const choice = await choose(name, inc);
    if (choice === 'cancel') return false;
    pushBackup(`Before opening ${name} (${choice})`);
    await linkIt();
    if (choice === 'replace') {
      cfg.apply(inc); saveLocal();
      toastAction(`Replaced with ${name}`, 'Undo', undo);
    } else {
      const m = merge(cur, inc);
      cfg.apply(m.data); saveLocal();
      if (handle) await writeSilently();
      toastAction(`Merged ${name}: ${m.summary}`, 'Undo', undo);
    }
    return true;
  }
  async function adoptHandle(h) {
    const r = await adopt(JSON.parse(await (await h.getFile()).text()), h.name, { h, startup:true });
    setStatus(`Linked: ${h.name} · auto-save active`, false);
    return r;
  }

  sharedUI(); // pages create the sync at the end of <body>
  return {
    loadLocal, saveLocal,
    // Call after every change
    changed() {
      cfg.meta().lastModified = new Date().toISOString();
      saveLocal();
      if (handle) writeSilently(); else setStatus('Unsaved changes · Ctrl/Cmd+S to save to file', true);
    },
    // Page load: reconnect the remembered file, else compare with the file next to the page (when served)
    async start() {
      if (canPick) {
        const stored = await loadHandle();
        if (stored) {
          try {
            if (await stored.queryPermission({mode:'readwrite'}) === 'granted') { await adoptHandle(stored); return; }
            pending = stored;   // needs a click to re-grant permission
            document.getElementById('relink-banner').style.display = 'flex';
          } catch(_) {}
        }
      }
      try {
        const res = await fetch(cfg.fileName, {cache:'no-store'});
        if (!res.ok) return;
        if (await adopt(await res.json(), cfg.fileName, {startup:true}) === 'quiet' && !handle)
          setStatus(`Loaded ${cfg.fileName} · 📂 Open it to turn on auto-save`, false);
      } catch(_) {}
    },
    async relink() {
      if (!pending) return;
      try {
        if (await pending.requestPermission({mode:'readwrite'}) !== 'granted') return;
        if (await adoptHandle(pending) === 'quiet') toast('File re-linked — auto-save active');
      } catch(e) { console.error(e); }
    },
    async open() {
      const fallback = () => {
        const inp = Object.assign(document.createElement('input'), {type:'file', accept:'.json'});
        inp.onchange = async e => {
          const f = e.target.files[0]; if (!f) return;
          let data; try { data = JSON.parse(await f.text()); } catch(_) { toast('Invalid JSON'); return; }
          if (!await adopt(data, f.name)) toast('Open cancelled — nothing changed');
        };
        inp.click();
      };
      if (!canPick) return fallback();
      try {
        const [h] = await window.showOpenFilePicker({ types: JSON_TYPE });
        const r = await adopt(JSON.parse(await (await h.getFile()).text()), h.name, { h });
        if (!r) { toast('Open cancelled — nothing changed'); return; }
        setStatus(`Linked: ${h.name} · auto-save active`, false);
        if (r === 'quiet') toast(`Opened ${h.name} — auto-save active`);
      } catch(e) {
        if (e.name === 'SyntaxError') toast('Invalid JSON');
        else if (e.name !== 'AbortError') fallback();
      }
    },
    async save() {
      if (handle) {
        try { await (writes = writes.then(write)); toast('Saved to file'); return; } catch(e) { console.error(e); }
      }
      if (!('showSaveFilePicker' in window)) return download();
      try {
        await link(await window.showSaveFilePicker({ suggestedName: cfg.fileName, types: JSON_TYPE }));
        await (writes = writes.then(write));
        toast(`Saved ${handle.name} — auto-save active`);
      } catch(e) { if (e.name !== 'AbortError') download(); }
    },
    exportCopy: download,
    async openBackups() {
      const list = backups();
      document.getElementById('sync-list').innerHTML = list.length
        ? list.map((b,i) => `<div class="sync-item"><div><div class="sync-when">${esc(fmtWhen(b.at))} · ${esc(describe(b.data))}</div><div class="sync-why">${esc(b.reason)}</div></div>
            <button class="btn btn-secondary btn-sm" data-choice="restore:${i}">Restore</button></div>`).join('')
        : `<div class="sync-why">No backups yet. One is made automatically whenever loading a file would change what's on screen.</div>`;
      const c = await openDialog('sync-backups', 'cancel');
      const b = c.startsWith('restore:') && list[+c.slice(8)];
      if (!b) return;
      pushBackup('Before restoring a backup');
      await restore(b.data, 'Restored backup');
      toastAction('Backup restored', 'Undo', undo);
    },
  };
}
