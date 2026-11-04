/* ==========================================================
   ambient.js —— 每一卷的空气
   One quiet atmosphere per volume, painted on a canvas that sits beneath
   every image and line of text (z-index -1), so it only ever shows in the
   paper margins and never over a picture or a word.
     sakura    落樱      petals drifting down, turning edge-on
     bokeh     夜灯      large soft lantern lights, barely moving
     fluff     飞絮      seed fluff carried sideways by the wind
     dust      光尘      a faint shaft of window light with motes in it
     confetti  纸屑      a few slow paper scraps from a convention hall
     komorebi  叶隙光    soft spots of sunlight through leaves, breathing
     lamp      暖灯      a café after dark: large warm lights out of focus
   Off with reduced motion, in a hidden tab, and in long screenshots.
   ========================================================== */
(() => {
  const theme = document.body.dataset.ambient;
  const cv = document.querySelector('.ambient');
  if (!theme || !cv) return;
  const forced = new URLSearchParams(location.search).has('motion');
  if (!forced && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const capture = matchMedia('(max-aspect-ratio: 1/3)');
  const ctx = cv.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  let W = 0, H = 0, dpr = 1, ps = [], last = performance.now(), t = 0, scrollV = 0, lastY = scrollY;

  const SPEC = {
    sakura:   { n: a => Math.round(a / 90000) + 6, make: anywhere => ({ x: rnd(0, W), y: anywhere ? rnd(0, H) : rnd(-40, -10), r: rnd(6, 11), vy: rnd(14, 26), sway: rnd(14, 36), ph: rnd(0, 6.3), sp: rnd(.4, .9), rot: rnd(0, 6.3), vr: rnd(-.6, .6), flip: rnd(0, 6.3), a: rnd(.35, .6) }) },
    bokeh:    { n: a => Math.round(a / 140000) + 5, make: () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(24, 80), c: [[255, 150, 90], [235, 80, 90], [110, 200, 235], [255, 205, 120]][Math.floor(rnd(0, 4))], a: rnd(.06, .16), vx: rnd(-4, 4), vy: rnd(-6, -1), ph: rnd(0, 6.3), sp: rnd(.2, .5) }) },
    fluff:    { n: a => Math.round(a / 110000) + 5, make: anywhere => ({ x: anywhere ? rnd(0, W) : rnd(-40, -10), y: rnd(0, H), r: rnd(2.5, 4.5), vx: rnd(16, 32), vy: rnd(-5, 2), ph: rnd(0, 6.3), sp: rnd(.5, 1.1), a: rnd(.35, .6) }) },
    dust:     { n: a => Math.round(a / 60000) + 10, make: () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(.8, 2), vx: rnd(-3, 3), vy: rnd(-5, -1), ph: rnd(0, 6.3), sp: rnd(.3, .8), a: rnd(.25, .55) }) },
    // 叶隙光: sunlight through leaves — soft pale spots that breathe as the leaves move
    komorebi: { n: a => Math.round(a / 70000) + 8, make: () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(18, 54), sx: rnd(.6, 1), a: rnd(.10, .22), vx: rnd(-3, 3), vy: rnd(-2, 2), ph: rnd(0, 6.3), sp: rnd(.25, .7), rot: rnd(0, 3.1) }) },
    // 暖灯: the café after dark — a few large warm lights, out of focus
    lamp:     { n: a => Math.round(a / 160000) + 4, make: () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(30, 90), c: [[255, 176, 96], [255, 140, 70], [255, 206, 140]][Math.floor(rnd(0, 3))], a: rnd(.05, .13), vx: rnd(-3, 3), vy: rnd(-4, -1), ph: rnd(0, 6.3), sp: rnd(.15, .4) }) },
    confetti: { n: a => Math.round(a / 120000) + 5, make: anywhere => ({ x: rnd(0, W), y: anywhere ? rnd(0, H) : rnd(-30, -10), w: rnd(5, 9), h: rnd(3, 5), vy: rnd(12, 22), sway: rnd(10, 26), ph: rnd(0, 6.3), sp: rnd(.4, .9), rot: rnd(0, 6.3), vr: rnd(-1, 1), flip: rnd(0, 6.3), c: ['#f2c9cf', '#cfe1ee', '#f1e3c6', '#cde9dc'][Math.floor(rnd(0, 4))], a: rnd(.5, .8) }) },
  }[theme];
  if (!SPEC) return;

  function size() {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = SPEC.n(W * H);
    while (ps.length < n) ps.push(SPEC.make(true));
    ps.length = n;
  }

  const draw = {
    sakura(p, dt) {
      p.ph += p.sp * dt; p.flip += 1.4 * dt; p.rot += p.vr * dt;
      p.y += (p.vy - scrollV * .04) * dt; p.x += (Math.sin(p.ph) * p.sway * .6 + 8) * dt;
      if (p.y > H + 30 || p.x > W + 30) Object.assign(p, SPEC.make(false));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, .5 + .5 * Math.abs(Math.cos(p.flip)));
      ctx.globalAlpha = p.a; ctx.beginPath();
      ctx.moveTo(0, -p.r); ctx.bezierCurveTo(p.r * .9, -p.r * .6, p.r * .7, p.r * .7, 0, p.r); ctx.bezierCurveTo(-p.r * .7, p.r * .7, -p.r * .9, -p.r * .6, 0, -p.r);
      ctx.fillStyle = '#efc1c8'; ctx.fill(); ctx.restore();
    },
    bokeh(p, dt) {
      p.ph += p.sp * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y < -p.r) { p.y = H + p.r; p.x = rnd(0, W); }
      const a = p.a * (.75 + .25 * Math.sin(p.ph));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(${p.c},${a})`); g.addColorStop(.55, `rgba(${p.c},${a * .55})`); g.addColorStop(1, `rgba(${p.c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    },
    komorebi(p, dt) {
      p.ph += p.sp * dt; p.x += (p.vx + Math.sin(p.ph * .7) * 6) * dt; p.y += (p.vy + Math.cos(p.ph * .5) * 4) * dt;
      if (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) { p.x = rnd(0, W); p.y = rnd(0, H); }
      const a = p.a * (.55 + .45 * Math.sin(p.ph * 1.3));   // leaves cross the sun: the spot brightens and fades
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, p.sx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r);
      g.addColorStop(0, `rgba(255,246,206,${a})`); g.addColorStop(.6, `rgba(250,238,190,${a * .5})`); g.addColorStop(1, 'rgba(250,238,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.283); ctx.fill(); ctx.restore();
    },
    lamp(p, dt) {
      p.ph += p.sp * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y < -p.r) { p.y = H + p.r; p.x = rnd(0, W); }
      const a = p.a * (.8 + .2 * Math.sin(p.ph));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(${p.c},${a})`); g.addColorStop(.6, `rgba(${p.c},${a * .5})`); g.addColorStop(1, `rgba(${p.c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    },
    fluff(p, dt) {
      p.ph += p.sp * dt; p.x += p.vx * dt; p.y += (p.vy + Math.sin(p.ph) * 8) * dt;
      if (p.x > W + 20) Object.assign(p, SPEC.make(false));
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = p.a; ctx.strokeStyle = 'rgba(150,140,125,.9)'; ctx.lineWidth = .6;
      for (let k = 0; k < 7; k++) { const an = k / 7 * 6.283 + p.ph * .2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * p.r * 2.2, Math.sin(an) * p.r * 2.2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(150,140,125,.9)'; ctx.beginPath(); ctx.arc(0, 0, .9, 0, 6.283); ctx.fill(); ctx.restore();
    },
    dust(p, dt) {
      p.ph += p.sp * dt; p.x += (p.vx + Math.sin(p.ph) * 3) * dt; p.y += p.vy * dt;
      if (p.y < -5) { p.y = H + 5; p.x = rnd(0, W); }
      // motes only glow inside the shaft of light
      const inBeam = Math.max(0, 1 - Math.abs((p.x - W * .62) + (p.y - H * .5) * .9) / (W * .2));
      ctx.globalAlpha = p.a * (.15 + .85 * inBeam) * (.7 + .3 * Math.sin(p.ph * 2));
      ctx.fillStyle = '#d9b979'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    },
    confetti(p, dt) {
      p.ph += p.sp * dt; p.flip += 2 * dt; p.rot += p.vr * dt;
      p.y += (p.vy - scrollV * .03) * dt; p.x += Math.sin(p.ph) * p.sway * .5 * dt;
      if (p.y > H + 20) Object.assign(p, SPEC.make(false));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.flip), 1);
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    },
  }[theme];

  function beam() {   // the window light for "dust": a faint diagonal band, warm
    const g = ctx.createLinearGradient(W * .35, 0, W * .95, H);
    g.addColorStop(0, 'rgba(255,236,200,0)'); g.addColorStop(.45, 'rgba(255,236,200,.22)'); g.addColorStop(.55, 'rgba(255,236,200,.22)'); g.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    const y = scrollY; scrollV = scrollV * .9 + ((y - lastY) / Math.max(dt, .001)) * .1; lastY = y;
    if (!document.hidden && !capture.matches) {
      ctx.clearRect(0, 0, W, H);
      if (theme === 'dust') beam();
      ctx.globalCompositeOperation = theme === 'bokeh' || theme === 'lamp' ? 'lighter' : 'source-over';
      for (const p of ps) draw(p, dt);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  addEventListener('resize', size);
  size(); requestAnimationFrame(frame);
})();
