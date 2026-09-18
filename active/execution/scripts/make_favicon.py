"""Generate the ClubMatch favicon set from the site's own Source Serif 4 file.

The mark is the wordmark's serif C, knocked out of a cardinal tile. Outlines are
read from the real font binary so the icon and the wordmark share a letterform.
Gold is deliberately absent: a hairline reads as a yellow cap, not a masthead
rule, at 16-48px.

Run: python3 active/execution/scripts/make_favicon.py
"""

import glob
import os

from fontTools.misc.transform import Transform
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
APP = os.path.join(ROOT, "app")

CARDINAL = "#c8102e"

BOX = 64.0  # viewBox units
RADIUS = 6.0
CAP = 36.0
CENTER_Y = 32.0
WEIGHT = 650  # a touch above the wordmark's 600, so serifs hold at 16px


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def load_glyph(weight=WEIGHT):
    """Return the C glyph, instantiated at `weight`, in font units."""
    path = glob.glob(os.path.join(ROOT, ".next/static/media/68d403cf9f2c68c5-s.p*.woff2"))
    if not path:
        raise SystemExit("Source Serif subset not found; run `npm run dev` once to cache fonts.")

    font = instancer.instantiateVariableFont(TTFont(path[0]), {"wght": weight})
    return font.getGlyphSet()["C"]


def flatten(glyph):
    """Return the outline as contours of straight (x, y) points, for raster fill."""
    pen = RecordingPen()
    glyph.draw(pen)

    contours = []
    current = []
    cursor = (0.0, 0.0)

    def flatten_quad(p0, c, p1, steps=24):
        for i in range(1, steps + 1):
            t = i / steps
            u = 1 - t
            yield (
                u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
                u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
            )

    def flatten_cubic(p0, c1, c2, p1, steps=24):
        for i in range(1, steps + 1):
            t = i / steps
            u = 1 - t
            yield (
                u**3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t**3 * p1[0],
                u**3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t**3 * p1[1],
            )

    for op, args in pen.value:
        if op == "moveTo":
            if current:
                contours.append(current)
            cursor = args[0]
            current = [cursor]
        elif op == "lineTo":
            cursor = args[0]
            current.append(cursor)
        elif op == "qCurveTo":
            points = list(args)
            # A trailing None means the contour is all off-curve points.
            if points[-1] is None:
                points = points[:-1]
                cursor = (
                    (points[0][0] + points[-1][0]) / 2,
                    (points[0][1] + points[-1][1]) / 2,
                )
                current.append(cursor)
            on_curve = points[-1]
            off = points[:-1]
            for i, ctrl in enumerate(off):
                if i + 1 < len(off):
                    nxt = off[i + 1]
                    end = ((ctrl[0] + nxt[0]) / 2, (ctrl[1] + nxt[1]) / 2)
                else:
                    end = on_curve
                current.extend(flatten_quad(cursor, ctrl, end))
                cursor = end
        elif op == "curveTo":
            c1, c2, end = args
            current.extend(flatten_cubic(cursor, c1, c2, end))
            cursor = end
        elif op == "closePath":
            if current:
                contours.append(current)
                current = []

    if current:
        contours.append(current)

    return contours


def placement(contours):
    """Transform scaling the outline to CAP, centred in the tile, y flipped."""
    xs = [p[0] for c in contours for p in c]
    ys = [p[1] for c in contours for p in c]
    s = CAP / (max(ys) - min(ys))
    cx = (min(xs) + max(xs)) / 2
    cy = (min(ys) + max(ys)) / 2
    return Transform(s, 0, 0, -s, BOX / 2 - s * cx, CENTER_Y + s * cy)


def to_svg(glyph, transform):
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.2f}")
    glyph.draw(TransformPen(pen, transform))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {BOX:.0f} {BOX:.0f}">'
        f"<title>ClubMatch</title>"
        f'<rect width="{BOX:.0f}" height="{BOX:.0f}" rx="{RADIUS:.0f}" fill="{CARDINAL}"/>'
        f'<path d="{pen.getCommands()}" fill="#ffffff"/>'
        f"</svg>\n"
    )


def render(contours, size, scale=8):
    """Rasterise the same geometry at `size` px, supersampled."""
    s = size * scale
    k = s / BOX

    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=RADIUS * k, fill=255)

    layer = Image.new("RGB", (s, s), hex_to_rgb(CARDINAL))
    draw = ImageDraw.Draw(layer)
    for contour in contours:
        draw.polygon([(x * k, y * k) for x, y in contour], fill=(255, 255, 255))

    tile = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    tile.paste(layer, (0, 0), mask)
    return tile.resize((size, size), Image.LANCZOS)


def main():
    glyph = load_glyph()
    raw = flatten(glyph)
    transform = placement(raw)
    contours = [[transform.transformPoint(p) for p in contour] for contour in raw]

    with open(os.path.join(APP, "icon.svg"), "w") as fh:
        fh.write(to_svg(glyph, transform))

    render(contours, 180).save(os.path.join(APP, "apple-icon.png"))
    render(contours, 256).save(
        os.path.join(APP, "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("wrote app/icon.svg, app/apple-icon.png, app/favicon.ico")


if __name__ == "__main__":
    main()
