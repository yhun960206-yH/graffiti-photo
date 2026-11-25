"""
tools/light.py —— 把每张照片当成一张被光照透的幻灯片：光穿过照片，落在背后的纸上。

    python tools/light.py              # 处理全部卷（加了新照片后跑一次，再跑 node tools/build-series.mjs）
    python tools/light.py aman lane    # 仅增量处理指定的卷，并合并写回 tools/light.json
    python tools/light.py --edges-only # 仅采样原图比例与边缘色（只需 Pillow + NumPy，不重算光晕）

对每张照片生成四样东西：
  1. 它下面的纸的颜色（写进 tools/light.json -> plates）
     在 OKLab 色彩空间按画面明暗与色相计算深色底纸（toned_paper）：照片越暗纸越深，
     色相取自照片本身但更安静，保证浅色文字在任何页面与长截图里都清晰可读。
  2. 画面真实比例与左/下边缘三段色值（写进 tools/light.json -> edges）
     供首页目录预览在横竖图无匹配时（如横屏无横图，竖图居右），向左/向下无缝延伸边缘渐变色。
  3. 它四周的光晕（images/series/<卷>/glow-NN.webp）
     光穿过照片洇开一圈：哪一侧亮、是什么颜色，那一侧的纸就被染上，越远越淡。
     离线生成无损平滑小图，网页上直接铺在照片背后，滚动时零实时模糊开销。
  4. 封面/卷尾背景模糊层（images/series/<卷>/blur-NN.webp）
     供封面滚出时的模糊过渡与卷尾跋文卡底图使用。
"""
import glob, json, os, sys
from PIL import Image, ImageFilter
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIGHT_JSON = os.path.join(ROOT, 'tools', 'light.json')

lin = lambda c: np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
srgb = lambda c: np.where(c <= .0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, 1), 1 / 2.4) - .055)
hexof = lambda c: '#%02x%02x%02x' % tuple(int(round(float(v) * 255)) for v in np.clip(c, 0, 1))
LUM = np.array([.2126, .7152, .0722])

# ── OKLab, to set the paper's lightness and colourfulness on a scale the eye agrees with ──
M1 = np.array([[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]])
M2 = np.array([[.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660]])
oklab = lambda c: M2 @ np.cbrt(M1 @ c)

def from_oklab(L):
    l = np.linalg.solve(M2, L) ** 3
    return np.linalg.solve(M1, l)

def toned_paper(img_lin):
    """the paper in the picture's own key: dark paper tinted with the picture's hue but quieter,
    so light text always reads cleanly."""
    px = img_lin.reshape(-1, 3)
    labs = np.array([oklab(c) for c in px[::max(1, len(px) // 2000)]])
    L, a, b = np.median(labs[:, 0]), labs[:, 1].mean(), labs[:, 2].mean()
    Lp = float(np.clip(.2 + (L - .25) * .34, .2, .32))      # picture L .25 → .20 … L .6 → .32
    c = np.hypot(a, b)
    k = min(1, .04 / max(c, 1e-6)) * .8                      # keep the hue, soften the colour
    return srgb(np.clip(from_oklab(np.array([Lp, a * k, b * k])), 0, 1))

def sample_edges(im):
    """Sample true aspect ratio plus 3-stop median colors along the left and bottom edges."""
    ow, oh = im.size
    small = im.copy()
    small.thumbnail((240, 240))
    arr = np.asarray(small, dtype=float)
    h, w, _ = arr.shape
    lw = max(3, int(w * 0.05))
    bh = max(3, int(h * 0.05))

    def band3(strip, axis):
        n = strip.shape[axis]
        cols = []
        for a, b in ((0, n // 3), (n // 3, 2 * n // 3), (2 * n // 3, n)):
            sub = strip[a:b, :, :] if axis == 0 else strip[:, a:b, :]
            m = np.median(sub.reshape(-1, 3), axis=0)
            cols.append('#%02x%02x%02x' % tuple(int(round(float(v))) for v in np.clip(m, 0, 255)))
        return cols

    return {
        'r': round(ow / oh, 4),
        'l': band3(arr[:, :lw, :], 0),
        'b': band3(arr[h - bh:, :, :], 1),
    }

def glow(img_lin, out):
    """a small, blurred map of the light spilling round the picture on dark paper."""
    from scipy.ndimage import gaussian_filter, zoom
    h, w, _ = img_lin.shape
    W, H = w * 3, h * 3
    canvas = np.zeros((H, W, 3))
    canvas[h:2 * h, w:2 * w] = img_lin
    # blurred in floating point (no 8-bit steps), wide enough that the light has no visible edge
    L = np.dstack([gaussian_filter(canvas[..., k], min(w, h) * .3, mode='constant') for k in range(3)])
    lum = L @ LUM
    hue = L / np.maximum(L.max(-1, keepdims=True), 1e-4)
    # strength saturates softly — a hard ceiling leaves a flat plateau whose rim reads as a stripe
    soft = lambda x, top: top * (1 - np.exp(-x / top))
    rgb, a = hue, soft(lum * 2.2, .5)
    # gentle fade over the outer band makes sure it ends at exactly zero
    ss = lambda t: (lambda c: c * c * (3 - 2 * c))(np.clip(t, 0, 1))
    yy, xx = np.mgrid[0:H, 0:W]
    a = a * ss(np.minimum(xx, W - 1 - xx) / (W * .16)) * ss(np.minimum(yy, H - 1 - yy) / (H * .16))
    # enlarged with cubic interpolation and saved lossless to avoid dark-paper banding
    rgba = np.dstack([srgb(rgb), a])
    rgba = np.dstack([zoom(rgba[..., k], 3, order=3, mode='nearest') for k in range(4)])
    Image.fromarray((rgba * 255).round().clip(0, 255).astype('uint8'), 'RGBA').save(out, 'WEBP', lossless=True, method=6)

def main():
    args = sys.argv[1:]
    edges_only = '--edges-only' in args
    only = {a for a in args if not a.startswith('--')}

    if not edges_only:
        try:
            import scipy.ndimage  # noqa: F401
        except ImportError:
            sys.exit('缺少依赖 scipy，请先运行：pip install pillow numpy scipy（或使用 --edges-only 仅采样边缘色）')

    out = {}
    if (only or edges_only) and os.path.exists(LIGHT_JSON):
        with open(LIGHT_JSON, encoding='utf-8') as f:
            out = json.load(f)

    dirs = sorted(glob.glob(os.path.join(ROOT, 'images', 'series', '*')))
    for d in dirs:
        if not os.path.isdir(d):
            continue
        slug = os.path.basename(d)
        if only and slug not in only:
            continue
        prev = out.get(slug, {})
        per = dict(prev.get('plates', {})) if edges_only else {}
        edges = {}
        for f in sorted(glob.glob(os.path.join(d, 'sm-*.jpg'))):
            n = int(os.path.basename(f)[3:5])
            im = Image.open(f).convert('RGB')
            edges[str(n)] = sample_edges(im)
            if not edges_only:
                small = im.copy()
                small.thumbnail((96, 96))
                L = lin(np.asarray(small).astype(float) / 255)
                per[str(n)] = hexof(toned_paper(L))
                g = im.copy()
                g.thumbnail((56, 56))
                glow(lin(np.asarray(g).astype(float) / 255), os.path.join(d, f'glow-{n:02d}.webp'))
                bim = im.copy()
                bim.thumbnail((320, 320), Image.Resampling.LANCZOS)
                bim.filter(ImageFilter.GaussianBlur(radius=14)).save(os.path.join(d, f'blur-{n:02d}.webp'), 'WEBP', quality=78)
        out[slug] = {'night': True, 'plates': per, 'edges': edges}
        print(f'{slug:9s}', f'{len(edges)} edges' if edges_only else ' '.join(per.values()))

    with open(LIGHT_JSON, 'w', encoding='utf-8') as f:
        json.dump(dict(sorted(out.items())), f, indent=2)

if __name__ == '__main__':
    main()
