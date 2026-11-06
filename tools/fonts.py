"""
tools/fonts.py —— 网站自带字体：只保留网站用到的字，国内打开不必再连 Google。

    python tools/fonts.py D:/AI/美学/_fonts-src     # 改了文字之后跑一次（在 build-series.mjs 之后）

需要原始字体（Google Fonts 官方仓库，SIL OFL 授权）放在给定的文件夹里：
    NotoSerifSC-VF.ttf   https://github.com/google/fonts/tree/main/ofl/notoserifsc
    NotoSansSC-VF.ttf    https://github.com/google/fonts/tree/main/ofl/notosanssc
输出 fonts/serif.woff2、fonts/sans.woff2：可变字重，只留网站用到的那一段粗细。
"""
import glob, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', '_fonts-src')

# every character the site can show: the pages, the content, and the scripts (the decode effect's random strokes)
text = set()
for pat in ['*.html', 'series/*.html', '*.js', 'tools/series-data.mjs', 'copy/*.md']:
    for f in glob.glob(os.path.join(ROOT, pat)):
        if os.path.basename(f) == 'proof.html': continue          # the proofing page is not part of the site
        s = open(f, encoding='utf-8').read()
        s = re.sub(r'<script type="application/ld\+json">.*?</script>', '', s, flags=re.S)
        text |= set(s)
text |= set(map(chr, range(0x20, 0x7f)))                      # ASCII
text |= set('，。、；：？！…—–·「」『』（）《》〈〉“”‘’　→←↑↓×／％')
text = ''.join(sorted(c for c in text if ord(c) >= 0x20))

FONTS = [('NotoSerifSC-VF.ttf', 'serif.woff2', (200, 400)),
         ('NotoSansSC-VF.ttf', 'sans.woff2', (300, 400))]
os.makedirs(os.path.join(ROOT, 'fonts'), exist_ok=True)
CHARS = os.path.join(ROOT, 'fonts', 'chars.txt')

# nothing new: leave the fonts exactly as they are (no new files to publish, nothing for visitors to fetch again)
have = open(CHARS, encoding='utf-8').read() if os.path.exists(CHARS) else ''
if set(text) <= set(have) and all(os.path.exists(os.path.join(ROOT, 'fonts', o)) for _, o, _ in FONTS):
    print(f'fonts        已包含全部 {len(set(text))} 字，不用重做')
    sys.exit(0)

# the list of what the fonts hold, so build-series.mjs can warn when the copy uses a character they don't have
open(CHARS, 'w', encoding='utf-8').write(text)
for src, out, (lo, hi) in FONTS:
    font = TTFont(os.path.join(SRC, src), lazy=False)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'vert', 'vrt2', 'vkna', 'vpal', 'palt', 'locl']  # vertical forms for 竖排
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    font = instancer.instantiateVariableFont(font, {'wght': (lo, hi)})   # only the weights the site uses
    path = os.path.join(ROOT, 'fonts', out)
    font.flavor = 'woff2'
    font.recalcTimestamp = False                        # same characters → the same file, byte for byte
    font['head'].modified = font['head'].created
    font.save(path)
    print(f'{out:12s} {len(text)} 字  {os.path.getsize(path) / 1024:.0f} KB')
