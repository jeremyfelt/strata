"""Draw the app icons -> icons/  (run from the repo root; needs dl/fonts/Archivo.ttf)
A bone tile marked S, standing on three colored layers: the game's strata."""
from PIL import Image, ImageDraw, ImageFont

STONE, SLATE, BONE, SHADE, LINE = '#ecefe9', '#27333c', '#fbfaf5', '#e5e1d5', '#c9d0c7'
SOLES = ['#6a8395', '#8cab86', '#d3a14a']   # layer 0, 1, 2 (slate, sage, ochre)

def draw(size, scale=1.0):
    S = 4 * size / 180                      # design units are a 180px icon, drawn 4x then reduced
    W = int(180 * S)
    img = Image.new('RGB', (W, W), STONE)
    d = ImageDraw.Draw(img)
    u = S * scale
    tw, th, r = 108 * u, 98 * u, 15 * u
    rise, sole = 20 * u, 9 * u
    x0 = (W - tw) / 2
    y0 = (W - (th + 2 * rise + sole)) / 2
    font = ImageFont.truetype('dl/fonts/Archivo.ttf', int(66 * u))
    font.set_variation_by_axes([800, 115])   # weight, width
    for k in range(3):
        y = y0 + (2 - k) * rise
        d.rounded_rectangle([x0, y + sole, x0 + tw, y + th + sole], r, fill=SOLES[k])
        d.rounded_rectangle([x0, y + 2 * u, x0 + tw, y + th + 2 * u], r, fill=SHADE)
        d.rounded_rectangle([x0, y, x0 + tw, y + th], r, fill=BONE, outline=LINE, width=max(1, int(1.5 * u)))
        if k == 2:
            bb = d.textbbox((0, 0), 'S', font=font)
            d.text((x0 + (tw - (bb[2] - bb[0])) / 2 - bb[0], y + (th - (bb[3] - bb[1])) / 2 - bb[1]), 'S', font=font, fill=SLATE)
    return img.resize((size, size), Image.LANCZOS)

for size in (180, 192, 512):
    draw(size).save(f'icons/icon-{size}.png', optimize=True)
draw(512, scale=0.74).save('icons/icon-maskable-512.png', optimize=True)
print('icons/: icon-180, icon-192, icon-512, icon-maskable-512')
