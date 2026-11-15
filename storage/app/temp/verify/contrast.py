import json, sys
from collections import Counter
from PIL import Image

png, js = sys.argv[1], sys.argv[2]
data = json.load(open(js, encoding="utf-8"))
img = Image.open(png).convert("RGB")

def lum(c):
    def ch(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = [ch(x) for x in c]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return round((hi + 0.05) / (lo + 0.05), 2)

def parse(rgb_str):
    return tuple(int(float(x)) for x in rgb_str.replace("rgb(", "").replace(")", "").split(","))

for t in data["targets"]:
    x, y, w, h = t["x"], t["y"], t["w"], t["h"]
    box = img.crop((x, y, x + w, y + h))
    # quantize to reduce antialias noise, take most common colour = background
    q = box.quantize(colors=16)
    pal = q.getpalette()[: 16 * 3]
    counts = Counter(q.getdata())
    idx = counts.most_common(1)[0][0]
    bg = tuple(pal[idx * 3 : idx * 3 + 3])
    fg = parse(t["color"])
    print(f'{t["label"]:14s} {t["size"]:>5s}/{t["weight"]:>3s} ratio={ratio(fg, bg):>5} bg={bg} fg={fg}  "{t["text"][:38]}"')
