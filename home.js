/* 顶栏：往下读时收起，往回翻时出现；在每一卷里显示当前是第几张。（首页与每一卷共用） */
(() => {
  const bar = document.querySelector('[data-bar]');
  if (!bar) return;
  const count = bar.querySelector('[data-count]');
  const marks = [...document.querySelectorAll('.plates .plate')];
  const total = count ? count.textContent.split('/')[1] : '';
  let lastY = scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, dy = y - lastY;
    if (Math.abs(dy) > 6) bar.classList.toggle('is-hidden', dy > 0 && y > innerHeight * .5);
    if (count) {
      let cur = null;
      // positions come from flow.js's measurements — no layout read while scrolling
      const ps = window.__flow ? window.__flow.plates : [];
      for (const p of ps) if (p.el.closest('.plates') && p.top - y < innerHeight * .55) cur = p.el;
      const text = `${cur ? cur.querySelector('.note__n').textContent : '图 01'} /${total}`;
      if (count.textContent !== text) count.textContent = text;
    }
    lastY = y;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
