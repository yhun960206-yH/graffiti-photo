"""
tools/light.py —— 把每张照片当成一张被光照透的幻灯片：光穿过照片，落在背后的纸上。

    python3 tools/light.py        # 加了新照片后跑一次，再跑 node tools/build-series.mjs

对每张照片算两样东西：
  1. 它下面的纸的颜色（写进 tools/light.json）
     这里的照片大多是低调的，所以纸是深色的：照片越暗纸越深，色相取自照片本身、但更安静（toned_paper）。
     页面背景顺着每张照片的位置变成它的颜色，照片之间慢慢过渡；文字一律浅色，长截图里也始终看得清。
  2. 它四周的光晕（images/series/<卷>/glow-NN.webp）
     光不止照在正后方，还会洇开一圈：哪一侧照片亮、是什么颜色，那一侧的纸就被染成什么颜色，越远越淡。
     预先做成很小的模糊图（几 KB），网页上放大铺在照片后面——浏览器不用做任何实时模糊。
"""
import json, glob, os
from PIL import Image, ImageFilter
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAPER = {'day': (0xf2, 0xef, 0xe7), 'night': (0x17, 0x17, 0x1a)}

lin = lambda c: np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
srgb = lambda c: np.where(c <= .0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, 1), 1 / 2.4) - .055)
hexof = lambda c: '#%02x%02x%02x' % tuple(int(round(float(v) * 255)) for v in np.clip(c, 0, 1))
LUM = np.array([.2126, .7152, .0722])

def light_through(rgb_lin):
    """mean transmitted light → (hue normalised to its brightest channel, how much light gets through)"""
    m = rgb_lin.reshape(-1, 3).mean(0)
    return m / max(m.max(), 1e-6), float(m @ LUM)

def lit_paper(hue, t, night):
    """the paper under that light. Day: the light tints the paper (paper × light). Night: the light adds to it."""
    if night:
        p = lin(np.array(PAPER['night']) / 255)
        return srgb(p + hue * min(.05, t * .16))
    p = lin(np.array(PAPER['day']) / 255)
    k = min(.5, .18 + t * .9)                               # brighter pictures cast more colour
    return srgb(p * ((1 - k) + k * hue))

# ── OKLab, to set the paper's lightness and colourfulness on a scale the eye agrees with ──
M1 = np.array([[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]])
M2 = np.array([[.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660]])
oklab = lambda c: M2 @ np.cbrt(M1 @ c)
def from_oklab(L):
    l = np.linalg.solve(M2, L) ** 3
    return np.linalg.solve(M1, l)

def toned_paper(img_lin):
    """the paper in the picture's own key: the photographs here are mostly low-key, so the paper is dark,
    darker for a darker picture, tinted with the picture's own colour but quieter than it.
    Stays dark enough that light text on it always reads."""
    px = img_lin.reshape(-1, 3)
    labs = np.array([oklab(c) for c in px[::max(1, len(px) // 2000)]])
    L, a, b = np.median(labs[:, 0]), labs[:, 1].mean(), labs[:, 2].mean()
    Lp = float(np.clip(.2 + (L - .25) * .34, .2, .32))      # picture L .25 → .20 … L .6 → .32
    c = np.hypot(a, b); k = min(1, .04 / max(c, 1e-6)) * .8   # keep the hue, soften the colour
    return srgb(np.clip(from_oklab(np.array([Lp, a * k, b * k])), 0, 1))

def glow(img_lin, night, out):
    """a small, blurred map of the light spilling round the picture: the picture in the middle, the same size
    again of paper around it on every side, so light fades outward"""
    h, w, _ = img_lin.shape
    W, H = w * 2, h * 2
    canvas = np.zeros((H, W, 3))
    canvas[h // 2:h // 2 + h, w // 2:w // 2 + w] = img_lin
    im = Image.fromarray((canvas * 65535 / 65535 * 255).clip(0, 255).astype('uint8'))  # temp, linear values
    im = im.filter(ImageFilter.GaussianBlur(w * .16))
    L = np.asarray(im).astype(float) / 255                 # light arriving at each point of the paper
    lum = L @ LUM
    hue = L / np.maximum(L.max(-1, keepdims=True), 1e-4)
    if night:
        rgb, a = hue, np.clip(lum * 2.2, 0, .5)
    else:
        p = lin(np.array(PAPER['day']) / 255)
        rgb, a = p * hue, np.clip(lum * 2.6, 0, .55)         # paper × light, laid over the paper
    rgba = np.dstack([srgb(rgb), a])
    Image.fromarray((rgba * 255).round().astype('uint8'), 'RGBA').save(out, 'WEBP', quality=82, method=6)

import importlib.util, subprocess
night = set(json.loads(subprocess.check_output(['node', '-e',
    "import('./tools/series-data.mjs').then(d=>console.log(JSON.stringify(d.volumes.filter(v=>v.theme==='night').map(v=>v.slug))))"], cwd=ROOT)))

out = {}
for d in sorted(glob.glob(os.path.join(ROOT, 'images/series/*'))):
    slug = os.path.basename(d); dark = True                  # every volume is set on dark paper now (see toned_paper)
    per = {}
    for f in sorted(glob.glob(d + '/sm-*.jpg')):
        n = int(os.path.basename(f)[3:5])
        im = Image.open(f).convert('RGB')
        small = im.copy(); small.thumbnail((96, 96))
        L = lin(np.asarray(small).astype(float) / 255)
        per[str(n)] = hexof(toned_paper(L))
        g = im.copy(); g.thumbnail((40, 40))
        glow(lin(np.asarray(g).astype(float) / 255), dark, os.path.join(d, f'glow-{n:02d}.webp'))
    out[slug] = {'night': dark, 'plates': per}
    print(f'{slug:9s}', ' '.join(per.values()))
json.dump(out, open(os.path.join(ROOT, 'tools/light.json'), 'w'), indent=2)
