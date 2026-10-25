(() => {
  'use strict';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const linkLabels = { youtube:'YouTube', instagram:'Instagram', suzuri:'SUZURI', lineStickers:'LINEスタンプ', x:'X', website:'公式サイト' };
  // Accept HTTP(S) URLs only. Editable data never becomes markup or javascript: links.
  const safeURL = value => { try { const u=new URL(String(value)); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const icon = key => {
    const paths={youtube:'<rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/>',instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7"/>',suzuri:'<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',lineStickers:'<path d="M20 11c0 5-5 8-9 8l-5 3 1-5C1 13 3 4 11 3c5-1 9 3 9 8Z"/><path d="M8 10h8M8 14h5"/>',x:'<path d="m5 3 14 18M19 3 5 21"/>',website:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',custom:'<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>'};
    return `<svg class="ip-link-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[key]||paths.custom}</svg>`;
  };
  function render() {
    const error=window.KAYANO_CORE.loadError();if(error){window.KAYANO_CORE.showLoadError(error);return;}
    const target=document.getElementById('ip-detail');
    const id=new URLSearchParams(window.location.search).get('ip');
    const ip=(window.KAYANO_IPS||[]).find(item=>item.id===id);
    if(!ip){target.innerHTML='<h1>IPが見つかりません</h1><p><a class="ip-back" href="index.html#ip">個人IP一覧へ戻る</a></p>';document.title='個人IP | 犬吠埼カヤノ';return;}
    document.title=`${ip.name} | 個人IP | 犬吠埼カヤノ`;
    const links=[];
    for(const [key,label] of Object.entries(linkLabels)) {
      const url=safeURL(ip.links?.[key]);
      if(url)links.push({label,url,key});
    }
    for(const extra of (ip.customLinks||[])) {
      const label=String(extra?.label||'').trim();const url=safeURL(extra?.url);
      if(label && url)links.push({label,url,key:'custom'});
    }
    const image=ip.image || `images/ip/${ip.id}.png`;
    const published=(window.KAYANO_GAMES||[]).filter(g => window.KAYANO_CORE.visible(g) && ip.gameTag && (g.tags||[]).includes(ip.gameTag));
    const statusLabel = g => g.status === 'published' ? '公開中' : (g.showUpcomingLabel === false ? '' : String(g.upcomingLabel === undefined ? '公開予定' : (g.upcomingLabel||'')));
    target.innerHTML=`
      <div class="ip-detail-hero"><div class="ip-detail-cover"><img src="${escapeHTML(image)}" alt="" onerror="this.hidden=true;this.parentElement.classList.add('ip-visual--missing')"></div>
      <div class="ip-detail-heading"><h1>${escapeHTML(ip.name)}</h1>${ip.description ? `<p class="ip-detail-description">${escapeHTML(ip.description)}</p>` : ''}<div class="ip-detail-meta"><p class="ip-detail-category">${escapeHTML(ip.category||'個人IP')}</p>${ip.summary && ip.summary!==ip.category?`<p class="ip-detail-summary">${escapeHTML(ip.summary)}</p>`:''}</div></div></div>
      ${links.length ? `<section class="ip-detail-section"><h2>関連リンク</h2><div class="ip-detail-links">${links.map(link=>`<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">${icon(link.key)}<span class="ip-link-label">${escapeHTML(link.label)}</span><span class="ip-link-arrow" aria-hidden="true">↗</span></a>`).join('')}</div></section>` : ''}
      ${published.length ? `<section class="ip-detail-section"><h2>関連ゲーム</h2><ul class="ip-related-games">${published.map(g=>`<li><a class="ip-related-link" href="${escapeHTML(safeURL(g.url) || `index.html#collection?tag=${encodeURIComponent(ip.gameTag)}`)}"${safeURL(g.url) ? ' target="_blank" rel="noopener noreferrer"' : ''}><img src="${escapeHTML(g.image || `images/games/${String(g.id).padStart(3,'0')}.png`)}" alt="" loading="lazy"><span class="ip-related-title">${escapeHTML(g.title)}</span><span class="ip-related-status">${escapeHTML(statusLabel(g))}</span><span class="ip-related-arrow" aria-hidden="true">${safeURL(g.url) ? '↗' : '→'}</span></a></li>`).join('')}</ul><p><a class="ip-detail-allgames" href="index.html#collection?tag=${encodeURIComponent(ip.gameTag)}">関連ゲームを一覧で見る ↗</a></p></section>`:''}
    `;
  }
  document.addEventListener('DOMContentLoaded',render);
})();
