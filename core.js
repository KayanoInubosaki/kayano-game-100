(() => {
  'use strict';
  const validUrl = (value) => {try {const u = new URL(String(value || ''));return ['http:', 'https:'].includes(u.protocol) ? u.href : '';}catch {return '';}};
  const visible = (game) => game.status !== 'hidden';
  const label = (game) => {
    if(game.status !== 'upcoming' || game.showUpcomingLabel === false)return '';
    return String(game.upcomingLabel === undefined ? '公開予定' : (game.upcomingLabel ?? '')).trim();
  };
  const stats = (games) => ({
    registered: games.length,
    published: games.filter(game => game.status === 'published').length,
    upcoming: games.filter(game => game.status === 'upcoming').length,
    visible: games.filter(visible).length
  });
  const loadError = () => {
    if(!Array.isArray(window.KAYANO_GAMES) || !window.KAYANO_GAMES.length || window.KAYANO_GAMES.some(g=>!g || !Number.isInteger(g.id) || g.id<1 || typeof g.title!=='string' || !Array.isArray(g.tags) || !['published','upcoming','hidden'].includes(g.status)))return 'ゲームデータ data.js が不足または破損しています。元ファイルを復旧してください。';
    if(!Array.isArray(window.KAYANO_IPS) || window.KAYANO_IPS.some(ip=>!ip || typeof ip.id!=='string' || typeof ip.name!=='string' || (ip.customLinks && !Array.isArray(ip.customLinks))))return 'IPデータ ip-data.js が不足または破損しています。元ファイルを復旧してください。';
    return '';
  };
  const showLoadError = message => {
    const warning=document.createElement('p');warning.setAttribute('role','alert');warning.textContent=message;
    warning.style.cssText='padding:20px;background:#fff1eb;color:#7b2316;border:2px solid #bd5b3f;overflow-wrap:anywhere';
    document.body.prepend(warning);
  };
  const randomCandidates = games => games.filter(game => visible(game) && game.status === 'published' && validUrl(game.url) && game.randomEligible !== false);
  const accessLabel = game => game.passwordProtected === true ? 'パスワード制' : '';
  const linkText = (game) => validUrl(game.url) ? (game.status === 'published' ? 'このゲームを遊ぶ' : '公開ページを見る') : '';
  window.KAYANO_CORE = Object.freeze({validUrl, visible, label, stats, linkText, loadError, showLoadError, randomCandidates, accessLabel});
})();
