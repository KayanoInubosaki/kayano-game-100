(() => {
  'use strict';
  const core = window.KAYANO_CORE;
  if(core.loadError()){document.addEventListener('DOMContentLoaded',()=>core.showLoadError(core.loadError()));return;}
  const allGames = (window.KAYANO_GAMES || []).slice().sort((a, b) => a.id - b.id);
  const games = allGames.filter(core.visible);
  const ips = (window.KAYANO_IPS || []).slice();
  const GENRES = ['すべて', ...new Set(games.map((game) => game.genre).filter(Boolean))];
  const MOODS = ['すべて', ...new Set(games.flatMap(game => game.tags || []).filter(Boolean))];
  const state = { genre: 'すべて', mood: 'すべて', query: '', sort: 'number', showSlots: true };
  const $ = (id) => document.getElementById(id);
  const escapeHTML = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const twoOrThree = (id) => String(id).padStart(3,'0');
  const normal = (value) => String(value || '').normalize('NFKC').toLocaleLowerCase('ja');

  const upcomingLabel = core.label;
  function artHTML(game) {
    // 画像は images/games/001.png ～ 100.png。画像ファイルだけ置き換えれば反映される。
    // ファイルが存在しない作品は既存の文字ベースの仮アイコンへ戻る。
    const image = game.image || `images/games/${twoOrThree(game.id)}.png`;
    return `<div class="game-art game-art--${escapeHTML(game.art || 'clean')} game-art--image"><img src="${escapeHTML(image)}" alt="" loading="lazy" decoding="async"><span class="art-number">#${twoOrThree(game.id)}</span><span class="art-display">${escapeHTML(game.artText || game.title)}</span><span class="art-corner">KAYANO</span>${upcomingLabel(game) ? `<span class="art-badge">${escapeHTML(upcomingLabel(game))}</span>` : ''}</div>`;
  }
  function fillChips(targetId, values, key) {
    const wrap = $(targetId);
    values.forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = value;
      button.setAttribute('aria-pressed', String(value === state[key]));
      button.addEventListener('click', () => {
        state[key] = value;
        wrap.querySelectorAll('.chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.textContent === value)));
        renderGames();
      });
      wrap.appendChild(button);
    });
  }
  function isFiltered() { return state.genre !== 'すべて' || state.mood !== 'すべて' || state.query.trim() !== ''; }
  function matchingGames() {
    const query = normal(state.query.trim());
    const filtered = games.filter((game) => {
      if (state.genre !== 'すべて' && game.genre !== state.genre) return false;
      if (state.mood !== 'すべて' && !(game.tags || []).includes(state.mood)) return false;
      const haystack = normal([game.title, game.genre, game.description, game.searchTerms, ...(game.tags || [])].join(' '));
      return !query || haystack.includes(query);
    });
    if (state.sort === 'newest') filtered.sort((a, b) => b.id - a.id);
    else if (state.sort === 'shortest') filtered.sort((a, b) => (a.minutes ?? Infinity) - (b.minutes ?? Infinity) || a.id - b.id);
    else if (state.sort === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    else filtered.sort((a, b) => a.id - b.id);
    return filtered;
  }
  function renderGames() {
    const matched = matchingGames();
    const grid = $('games-grid');
    grid.replaceChildren();
    const cardsById = new Map();
    matched.forEach((game) => {
      const card = document.createElement('button');
      card.className = 'game-card' + (game.status === 'upcoming' ? ' game-card--upcoming' : '');
      card.type = 'button';
      card.setAttribute('aria-label', `${game.title}の詳細を開く`);
      const statusText=upcomingLabel(game);
      card.innerHTML = `${artHTML(game)}<div class="game-name">${escapeHTML(game.title)}${statusText ? `<span class="game-name-status"> · ${escapeHTML(statusText)}</span>` : ''}</div><p class="game-meta">${escapeHTML(game.genre)}</p>`;
      card.addEventListener('click', () => openGame(game));
      cardsById.set(game.id, card);
    });
    // 絞り込み中は空欄を出さず、見つかった作品だけを表示
    const displaySlots = !isFiltered() && state.showSlots && state.sort === 'number';
    if (displaySlots) {
      for (let i = 1; i <= Math.max(100,...allGames.map(game=>game.id)); i++) {
        const card = cardsById.get(i);
        if(card){grid.appendChild(card);continue;}
        const slot = document.createElement('div');
        slot.className = 'empty-slot';
        slot.setAttribute('aria-label', `No.${twoOrThree(i)} これからのゲーム`);
        slot.innerHTML = `<span class="slot-num">${twoOrThree(i)}</span><span class="slot-star" aria-hidden="true">✳</span><span class="slot-title">未登録</span>`;
        grid.appendChild(slot);
      }
    } else matched.forEach((game) => grid.appendChild(cardsById.get(game.id)));
    $('result-count').textContent = `${matched.length}作品が見つかりました${displaySlots ? ' ／ 全100枠を表示中' : ''}`;
    $('empty-results').hidden = matched.length > 0;
    $('games-grid').hidden = matched.length === 0 && !displaySlots;
    $('show-slots').disabled = isFiltered() || state.sort !== 'number';
    $('show-slots').closest('label').title = (isFiltered() || state.sort !== 'number') ? '検索・並び替え中は空き枠を表示しません' : '';
  }
  function openGame(game) {
    const other = games.filter((g) => g.id !== game.id && g.status === 'published').map((g) => ({ ...g, score: (g.tags || []).filter((t) => (game.tags || []).includes(t)).length + (g.genre === game.genre ? 2 : 0) })).filter((g) => g.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    const tags = (game.tags || []).map((t) => `<span class="dialog-tag">#${escapeHTML(t)}</span>`).join('');
    const safeGameURL = core.validUrl(game.url);
    const link = safeGameURL
      ? `<a class="dialog-link" href="${escapeHTML(safeGameURL)}" target="_blank" rel="noopener noreferrer">${core.linkText(game)} ↗</a>`
      : `<div class="dialog-upcoming">${game.status === 'published' ? 'プレイリンクは未登録です' : '公開前（リンク未登録）'}</div>`;
    $('dialog-content').innerHTML = `<div class="dialog-layout">${artHTML(game)}<div><span class="dialog-subtitle">GAME ${twoOrThree(game.id)} / ${escapeHTML(game.genre)}</span><h2 id="dialog-title" class="dialog-title">${escapeHTML(game.title)}</h2><p class="dialog-description">${escapeHTML(game.description)}</p><div class="dialog-tags">${tags}</div>${game.timeLabel || game.status === 'published' || upcomingLabel(game) ? `<p class="dialog-status">${[game.timeLabel,game.status === 'published' ? '公開中' : upcomingLabel(game)].filter(Boolean).map(escapeHTML).join(' ／ ')}</p>` : ''}${core.accessLabel(game) ? `<p class="dialog-status">${escapeHTML(core.accessLabel(game))}</p>` : ''}${link}${core.validUrl(game.noteUrl) ? `<p><a href="${escapeHTML(game.noteUrl)}" class="dialog-note" target="_blank" rel="noopener noreferrer">制作日記を読む ↗</a></p>` : ''}</div></div>${other.length ? `<div class="dialog-more"><p class="dialog-more-title">関連ゲーム</p><div class="dialog-related">${other.map((g) => `<button type="button" class="related-button" data-related="${g.id}">${escapeHTML(g.title)} ↗</button>`).join('')}</div></div>` : ''}`;
    $('dialog-content').querySelectorAll('[data-related]').forEach((button) => button.addEventListener('click', () => openGame(games.find((g) => g.id === Number(button.dataset.related)))));
    const dialog = $('game-dialog');
    if (!dialog.open) dialog.showModal();
    $('dialog-close').focus();
  }

  function renderIPs() {
    const grid = $('ip-grid');
    if (!grid) return;
    const homeIPNames=$('home-ip-names');
    if(homeIPNames)homeIPNames.textContent=ips.map(ip=>ip.name).filter(Boolean).join('／');
    grid.replaceChildren();
    ips.forEach((ip) => {
      const card = document.createElement('a');
      card.className = 'ip-card ip-card--linked';
      card.href = `ip.html?ip=${encodeURIComponent(ip.id)}`;
      card.setAttribute('aria-label', `${ip.name}の紹介ページへ`);
      const image = ip.image || `images/ip/${ip.id}.png`;
      card.innerHTML = `<div class="ip-visual ip-visual--image"><img src="${escapeHTML(image)}" loading="lazy" decoding="async" alt=""></div><div class="ip-body"><small>${escapeHTML(ip.category || '')}</small><h2>${escapeHTML(ip.name)}</h2>${ip.summary ? `<p>${escapeHTML(ip.summary)}</p>` : ''}<span class="ip-button ip-button--link">紹介ページを見る ↗</span></div>`;
      grid.appendChild(card);
    });
  }

  function route() {
    const raw = window.location.hash.replace('#', '');
    const [hashPage, hashQuery = ''] = raw.split('?');
    const page = ['games', 'ip', 'diary', 'about'].includes(raw) ? raw : 'games';
    document.querySelectorAll('[data-page]').forEach((panel) => {
      const shown = panel.dataset.page === page;
      panel.hidden = !shown;
      panel.classList.toggle('page--active', shown);
    });
    document.querySelectorAll('[data-nav]').forEach((nav) => {
      if (nav.dataset.nav === page) nav.setAttribute('aria-current', 'page');
      else nav.removeAttribute('aria-current');
    });
    document.title = `${page === 'games' ? 'カヤノ産ゲーム100本ノック' : {ip:'個人IP', diary:'制作日記', about:'作者について'}[page]} | 犬吠埼カヤノ`;
    // 内部アンカーでゲーム一覧へ移動した場合はゲーム画面を表示する
    if (hashPage === 'collection' || hashPage === 'main-content') {
      const tag = new URLSearchParams(hashQuery).get('tag');
      if (tag) {
        state.genre = 'すべて'; state.mood = MOODS.includes(tag) ? tag : 'すべて'; state.query = MOODS.includes(tag) ? '' : tag;
        $('search-input').value = state.query;
        document.querySelectorAll('#genre-filters .chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.textContent === state.genre)));
        document.querySelectorAll('#mood-filters .chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.textContent === state.mood)));
        renderGames();
      }
      document.querySelector('[data-page="games"]').hidden = false;
      document.querySelectorAll('[data-page]:not([data-page="games"])').forEach((p) => p.hidden = true);
      document.querySelectorAll('[data-nav]').forEach((n) => n.dataset.nav === 'games' ? n.setAttribute('aria-current','page') : n.removeAttribute('aria-current'));
      requestAnimationFrame(() => $(hashPage).scrollIntoView({block:'start'}));
      return;
    }
    window.scrollTo({top:0,behavior:'instant'});
  }
  function init() {
    document.addEventListener('error', (event) => {
      if (event.target.matches('.game-art--image img')) {
        const art = event.target.closest('.game-art');
        if (art) art.classList.remove('game-art--image');
        event.target.hidden = true;
      }
      if (event.target.matches('.ip-visual--image img')) {
        event.target.hidden = true;
        event.target.closest('.ip-visual').classList.add('ip-visual--missing');
      }
    }, true);
    const { published, registered } = core.stats(allGames);
    $('live-total').textContent = String(published).padStart(2, '0');
    $('registered-total').textContent = String(registered).padStart(2, '0');
    const labeledUpcoming=core.stats(allGames).upcoming;
    $('upcoming-total').textContent = labeledUpcoming ? `＋${labeledUpcoming}本 公開予定` : '';
    $('progress-fill').style.width = `${Math.min(100, registered)}%`;
    $('progress-fill').setAttribute('aria-label', `登録${registered}本／100枠`);
    fillChips('genre-filters', GENRES, 'genre');
    fillChips('mood-filters', MOODS, 'mood');
    $('search-input').addEventListener('input', (event) => { state.query = event.target.value; renderGames(); });
    $('sort-select').addEventListener('change', (event) => { state.sort = event.target.value; renderGames(); });
    $('show-slots').addEventListener('change', (event) => { state.showSlots = event.target.checked; renderGames(); });
    $('clear-filters').addEventListener('click', () => {
      state.genre = 'すべて'; state.mood = 'すべて'; state.query = ''; state.sort = 'number';
      $('search-input').value = ''; $('sort-select').value = 'number';
      document.querySelectorAll('#genre-filters .chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.textContent === 'すべて')));
      document.querySelectorAll('#mood-filters .chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.textContent === 'すべて')));
      renderGames();
    });
    $('random-game').addEventListener('click', () => {
      const playable = core.randomCandidates(games);
      if (playable.length) openGame(playable[Math.floor(Math.random() * playable.length)]);
      else {
        $('dialog-content').innerHTML='<h2 id="dialog-title" class="dialog-title">おまかせで1本</h2><p>現在、おまかせの対象となるゲームはありません。</p>';
        if(!$('game-dialog').open)$('game-dialog').showModal();
        $('dialog-close').focus();
      }
    });
    $('dialog-close').addEventListener('click', () => $('game-dialog').close());
    $('game-dialog').addEventListener('click', (event) => { if (event.target === $('game-dialog')) $('game-dialog').close(); });
    document.querySelectorAll('[data-ip-filter]').forEach((button) => button.addEventListener('click', () => {
      state.genre = 'すべて'; state.mood = button.dataset.ipFilter; state.query = '';
      $('search-input').value = '';
      document.querySelectorAll('#genre-filters .chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.textContent === state.genre)));
      document.querySelectorAll('#mood-filters .chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.textContent === state.mood)));
      renderGames(); window.location.hash = 'collection';
    }));
    window.addEventListener('hashchange', route);
    renderIPs(); renderGames(); route();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
