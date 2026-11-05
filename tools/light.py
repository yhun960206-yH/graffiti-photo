"""
tools/light.py —— 把每张照片当成一张被光照透的幻灯片：光穿过照片，落在背后的纸上。

    python3 tools/light.py        # 加了新照片后跑一次，再跑 node tools/build-series.mjs

对每张照片算两样东西：
  1. 它投下的光的颜色（写进 tools/light.json）
     光穿过照片时，亮处透过的光多、暗处几乎不透，所有透过的光混在一起，就是它投到纸上的颜色。
     做法：在线性光空间里对所有像素取平均（亮的像素自然占得多）。
     页面背景顺着每张照片的位置，变成「纸被这种光照着」的颜色，照片之间慢慢过渡。
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
    slug = os.path.basename(d); dark = slug in night
    per = {}
    for f in sorted(glob.glob(d + '/sm-*.jpg')):
        n = int(os.path.basename(f)[3:5])
        im = Image.open(f).convert('RGB')
        small = im.copy(); small.thumbnail((96, 96))
        L = lin(np.asarray(small).astype(float) / 255)
        hue, t = light_through(L)
        per[str(n)] = hexof(lit_paper(hue, t, dark))
        g = im.copy(); g.thumbnail((40, 40))
        glow(lin(np.asarray(g).astype(float) / 255), dark, os.path.join(d, f'glow-{n:02d}.webp'))
    out[slug] = {'night': dark, 'plates': per}
    print(f'{slug:9s}', ' '.join(per.values()))
json.dump(out, open(os.path.join(ROOT, 'tools/light.json'), 'w'), indent=2)
