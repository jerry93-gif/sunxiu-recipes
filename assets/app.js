/* ============================================================
   孙秀菜谱大全 — app.js
   ============================================================ */
(function () {
  'use strict';

  const DATA = window.RECIPE_DATA || { dishes: [] };
  const DISHES = DATA.dishes.slice();

  const state = {
    q: '',
    region: null,
    cuisine: null,
    kind: null,
    protein: null
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  /* ------------------------------------------------------------ 统计 */
  const fulls = DISHES.filter(d => d.level === 'full');
  const notes = DISHES.filter(d => d.level === 'note');
  const recipes = DISHES.filter(d => d.level !== 'note');
  const songs = new Set(DISHES.map(d => d.cuisine).filter(c => c && c !== '非菜谱'));

  $('#statTotal').textContent = recipes.length;
  $('#statFull').textContent = fulls.length;
  $('#statPending').textContent = DISHES.length - fulls.length - notes.length;
  $('#statTag').textContent = songs.size;
  $('#pendingInline').textContent = DISHES.length - fulls.length - notes.length;
  const fc = document.getElementById('fullCount');
  if (fc) fc.textContent = fulls.length;

  /* ------------------------------------------------------------ 精编卡片 */
  const featuredGrid = $('#featuredGrid');
  fulls.slice(0, 6).forEach((d, i) => {
    const lg = i === 0;
    const card = el('article', 'fcard' + (lg ? ' fcard-lg' : ''));
    const ingPreview = lg
      ? `<div class="fing">
           <span class="fing-title">原料预览</span>
           ${(d.ingredients || []).slice(0, 2).map(g =>
             `<p><b>${esc(g.group)}</b> ${g.items.map(it => esc(it.n) + (it.q ? ' ' + esc(it.q) : '')).join('、')}</p>`
           ).join('')}
         </div>
         <div class="fsteps">
           <span class="fing-title">做法速览</span>
           ${(d.steps || []).map((st, k) => `<p><em>${String(k + 1).padStart(2, '0')}</em>${esc(st.t)}</p>`).join('')}
         </div>`
      : '';
    card.innerHTML = `
      <span class="fnum">NO.0${i + 1} · ${esc(d.region)} / ${esc(d.cuisine)}</span>
      <h3>${esc(d.name)}</h3>
      <span class="fen">${esc(d.en || '')}</span>
      <p>${esc(d.intro || '')}</p>
      ${ingPreview}
      <div class="fmeta">
        <span class="tag tag-region">${esc(d.cuisine)}</span>
        <span class="tag tag-kind-${esc(d.kind)}">${esc(d.kind)} · ${esc(d.protein)}</span>
        <span class="tag">${esc(d.time)}</span>
        <span class="tag">${esc(d.difficulty)}</span>
        <span class="fgo">开始做 →</span>
      </div>`;
    card.addEventListener('click', () => openDish(d));
    featuredGrid.appendChild(card);
  });

  /* ------------------------------------------------------------ 分类体系 */
  const REGION_ORDER = ['中餐', '西餐', '其他'];
  const KIND_ORDER = ['荤', '素', '甜饮', '待定', '其他'];

  function countBy(key, value, extra) {
    return DISHES.filter(d => {
      if (d[key] !== value) return false;
      if (extra && !extra(d)) return false;
      return true;
    }).length;
  }

  function chip(label, sub, count, active, tone, onClick) {
    const b = el('button', 'chip' + (active ? ' is-on' : '') + (tone ? ' chip-' + tone : ''));
    b.type = 'button';
    b.innerHTML = `<span>${esc(label)}</span>${sub ? ` <small>${esc(sub)}</small>` : ''}<small>${count}</small>`;
    b.addEventListener('click', onClick);
    return b;
  }

  function renderTaxonomy() {
    const regionWrap = $('#taxRegion');
    regionWrap.innerHTML = '';

    REGION_ORDER.forEach(region => {
      const items = DISHES.filter(d => d.region === region);
      if (!items.length) return;

      const group = el('div', 'tax-group');
      const head = el('div', 'tax-group-title');
      head.innerHTML = `${esc(region === '其他' ? '其他 / 非菜谱' : region)} <span style="color:var(--ink-3);letter-spacing:.06em">${items.length} 道</span>`;
      group.appendChild(head);

      const chips = el('div', 'chips');
      // 该大区整体
      chips.appendChild(chip(
        '全部' + (region === '其他' ? '' : region),
        '', items.length, state.region === region,
        '',
        () => { toggle('region', region); }
      ));

      const cuisines = [...new Set(items.map(d => d.cuisine))]
        .filter(Boolean)
        .sort((a, b) => countBy('cuisine', b) - countBy('cuisine', a));

      cuisines.forEach(c => {
        chips.appendChild(chip(
          c, '', countBy('cuisine', c), state.cuisine === c, region === '西餐' ? 'jade' : 'red',
          () => { toggle('cuisine', c, region); }
        ));
      });
      group.appendChild(chips);
      regionWrap.appendChild(group);
    });

    const kindWrap = $('#taxKind');
    kindWrap.innerHTML = '';

    KIND_ORDER.forEach(kind => {
      const items = DISHES.filter(d => d.kind === kind);
      if (!items.length) return;

      const group = el('div', 'tax-group');
      const head = el('div', 'tax-group-title');
      const label = kind === '待定' ? '待定 / 需人工分辨' : kind === '甜饮' ? '甜点 · 饮品' : kind;
      head.innerHTML = `${esc(label)} <span style="color:var(--ink-3);letter-spacing:.06em">${items.length} 道</span>`;
      group.appendChild(head);

      const chips = el('div', 'chips');
      chips.appendChild(chip(
        kind === '甜饮' ? '全部甜饮' : (kind === '待定' || kind === '其他') ? '全部' : '全部' + label.split(' ')[0],
        '', items.length, state.kind === kind, kind === '荤' ? 'red' : 'jade',
        () => { toggle('kind', kind); }
      ));

      const proteins = [...new Set(items.map(d => d.protein))]
        .filter(p => p && p !== '待定' && p !== '其他')
        .sort((a, b) => countBy('protein', b) - countBy('protein', a));

      proteins.forEach(p => {
        chips.appendChild(chip(
          p, '', countBy('protein', p), state.protein === p, kind === '荤' ? 'red' : 'jade',
          () => { toggle('protein', p); }
        ));
      });
      if (!proteins.length) {
        const muted = el('span', '', '暂未细分 · 待人工整理');
        muted.style.cssText = 'font-size:11.5px;color:var(--ink-3)';
        chips.appendChild(muted);
      }
      group.appendChild(chips);
      kindWrap.appendChild(group);
    });
  }

  function toggle(key, value, alsoRegion) {
    if (key === 'region') {
      // 选大区时清掉更细的菜系，避免组合死锁
      state.cuisine = null;
      state.region = state.region === value ? null : value;
    } else if (key === 'cuisine') {
      state.cuisine = state.cuisine === value ? null : value;
      state.region = alsoRegion || null;
    } else if (key === 'kind') {
      state.kind = state.kind === value ? null : value;
      if (state.kind !== '荤' && state.kind !== '素') state.protein = null;
    } else if (key === 'protein') {
      state.protein = state.protein === value ? null : value;
    }
    renderAll();
  }

  /* ------------------------------------------------------------ 筛选与列表 */
  function matches(d) {
    if (state.region && d.region !== state.region) return false;
    if (state.cuisine && d.cuisine !== state.cuisine) return false;
    if (state.kind && d.kind !== state.kind) return false;
    if (state.protein && d.protein !== state.protein) return false;
    if (state.q) {
      const q = state.q.trim().toLowerCase();
      if (q) {
        const hay = [d.name, d.raw, d.cuisine, d.protein, d.region, d.en, d.sub,
          (d.ingredients || []).map(g => (g.items || []).map(i => i.n).join(' ')).join(' ')]
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
    }
    return true;
  }

  function renderGrid() {
    const grid = $('#grid');
    const list = DISHES.filter(matches);
    grid.innerHTML = '';
    $('#empty').hidden = list.length > 0;

    // 精编优先，其余按原专辑顺序
    list.sort((a, b) => (b.level === 'full') - (a.level === 'full'));

    list.forEach((d, i) => {
      const card = el('article', 'card');
      const tags = [
        `<span class="tag tag-region" data-f="cuisine" data-v="${esc(d.cuisine)}">${esc(d.cuisine)}</span>`,
        `<span class="tag tag-kind-${esc(d.kind)}" data-f="protein" data-v="${esc(d.protein)}">${esc(d.kind)} · ${esc(d.protein)}</span>`,
        d.time ? `<span class="tag">${esc(d.time)}</span>` : ''
      ].join('');
      card.innerHTML = `
        ${d.level === 'full' ? '<span class="badge-full">精编</span>' : ''}
        <div class="card-top">
          <span class="card-idx">NO.${String(i + 1).padStart(2, '0')}</span>
          <span class="card-idx">${esc(d.region === '其他' ? '' : d.region)}</span>
        </div>
        <h3 class="card-name">${esc(d.name)}</h3>
        ${d.raw && d.raw !== d.name ? `<p class="card-raw">${esc(d.raw)}</p>` : ''}
        <div class="card-tags">${tags}</div>
        <div class="card-foot">
          <span>${d.level === 'full' ? '原料 · 步骤齐全' : '正文待整理'}</span>
          <span class="go">${d.level === 'full' ? '查看菜谱' : '先看笔记'} →</span>
        </div>`;
      card.addEventListener('click', (ev) => {
        const t = ev.target.closest('.tag[data-f]');
        if (t) {
          ev.stopPropagation();
          const f = t.dataset.f, v = t.dataset.v;
          if (v && v !== '待定' && v !== '其他') toggle(f, v);
          return;
        }
        openDish(d);
      });
      grid.appendChild(card);
    });

    $('#resultCount').textContent = list.length === DISHES.length
      ? `共 ${DISHES.length} 道`
      : `筛出 ${list.length} / ${DISHES.length} 道`;
  }

  function renderActiveFilters() {
    const wrap = $('#activeFilters');
    wrap.innerHTML = '';
    const items = [
      ['region', state.region],
      ['cuisine', state.cuisine],
      ['kind', state.kind],
      ['protein', state.protein]
    ].filter(([, v]) => v);

    if (!items.length && !state.q) return;

    if (state.q) {
      const p = el('button', 'pill');
      p.innerHTML = `“${esc(state.q)}” <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
      p.addEventListener('click', () => { state.q = ''; $('#searchInput').value = ''; renderAll(); });
      wrap.appendChild(p);
    }

    items.forEach(([k, v]) => {
      const p = el('button', 'pill');
      p.innerHTML = `${esc(v)} <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
      p.addEventListener('click', () => { state[k] = null; renderAll(); });
      wrap.appendChild(p);
    });

    const clear = el('button', 'clear-all');
    clear.type = 'button';
    clear.textContent = '清空全部';
    clear.addEventListener('click', () => {
      state.region = state.cuisine = state.kind = state.protein = null;
      state.q = ''; $('#searchInput').value = '';
      renderAll();
    });
    wrap.appendChild(clear);
  }

  function renderAll() {
    renderTaxonomy();
    renderGrid();
    renderActiveFilters();
  }

  /* ------------------------------------------------------------ 详情 */
  const modal = $('#modal');
  const sheetInner = $('#sheetInner');
  let lastFocus = null;

  function openDish(d) {
    lastFocus = document.activeElement;
    if (d.level === 'full') {
      sheetInner.innerHTML = fullTemplate(d);
    } else {
      sheetInner.innerHTML = pendingTemplate(d);
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.sheet').scrollTop = 0;
    sheetInner.scrollTop = 0;
    $('.sheet-close').focus({ preventScroll: true });
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function fullTemplate(d) {
    const ings = (d.ingredients || []).map(g => `
      <div class="ing-group">
        <h5>${esc(g.group)}</h5>
        ${(g.items || []).map(it => `
          <div class="ing-row">
            <span class="n">${esc(it.n)}</span>
            <span class="dots"></span>
            <span class="q">${esc(it.q || '')}</span>
          </div>`).join('')}
      </div>`).join('');

    const steps = (d.steps || []).map(s => `
      <li class="step">
        <h4>${esc(s.t)}</h4>
        <p>${esc(s.d)}</p>
        ${s.tip ? `<div class="tip">要点 · ${esc(s.tip)}</div>` : ''}
      </li>`).join('');

    const tips = (d.tips || []).length
      ? `<div class="tips-box"><h4>再记两句</h4><ul>${d.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`
      : '';

    return `
      <header class="sheet-head">
        <div class="sheet-kicker">精编菜谱 · ${esc(d.region)} / ${esc(d.cuisine)}</div>
        <h2 id="sheetTitle">${esc(d.name)}</h2>
        <span class="en">${esc(d.en || '')}</span>
        <p class="sub">${esc(d.sub || '')}</p>
        <div class="sheet-meta">
          <span class="meta-item">分类　<b>${esc(d.cuisine)}</b></span>
          <span class="meta-item">荤素　<b>${esc(d.kind)} · ${esc(d.protein)}</b></span>
          <span class="meta-item">用时　<b>${esc(d.time || '—')}</b></span>
          <span class="meta-item">份量　<b>${esc(d.servings || '—')}</b></span>
          <span class="meta-item">难度　<b>${esc(d.difficulty || '—')}</b></span>
        </div>
      </header>
      <div class="sheet-body">
        <p class="sheet-intro">${esc(d.intro || '')}</p>
        <section>
          <h3 class="ing-title">原料 <small>INGREDIENTS</small></h3>
          ${ings}
        </section>
        <section>
          <h3 class="step-title">做法 <small>METHOD</small></h3>
          <ol class="steps">${steps}</ol>
        </section>
        ${tips}
        <footer class="sheet-foot">
          <span>整理自小红书「${esc(DATA.board ? DATA.board.name : '吃的')}」· ${esc(d.author || '')}</span>
          <span class="foot-links">
            <button class="btn-mini" onclick="window.print()">打印</button>
            <a href="${esc(d.url)}" target="_blank" rel="noopener">查看原笔记 ↗</a>
          </span>
        </footer>
      </div>`;
  }

  function pendingTemplate(d) {
    return `
      <header class="sheet-head">
        <div class="sheet-kicker">已入库 · 正文待整理</div>
        <h2 id="sheetTitle">${esc(d.name)}</h2>
        <span class="en">${esc(d.raw && d.raw !== d.name ? d.raw : '')}</span>
        <div class="sheet-meta">
          <span class="meta-item">菜系　<b>${esc(d.cuisine || '待定')}</b></span>
          <span class="meta-item">荤素　<b>${esc(d.kind)} · ${esc(d.protein)}</b></span>
          <span class="meta-item">状态　<b>待整理</b></span>
        </div>
      </header>
      <div class="pending-box">
        <p>这道菜已经录进菜谱库、并打上了标签，但原笔记的视频还没有逐帧整理成文字。</p>
        <div class="pending-note">${esc(d.note || '标注为自动标签，正式入册时会人工校对。')}</div>
        <p>下一步会补上：原料清单（带份量）→ 逐步做法 → 关键点提示。</p>
        <div class="pending-actions">
          <a class="btn btn-primary" href="${esc(d.url)}" target="_blank" rel="noopener">打开原笔记 ↗</a>
          <button class="btn btn-ghost" data-close>先看别的</button>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------ 事件 */
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  const input = $('#searchInput');
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = input.value;
      renderAll();
    }, 140);
  });

  renderAll();
})();
