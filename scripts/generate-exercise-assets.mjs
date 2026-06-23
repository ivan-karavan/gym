import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const outputDir = new URL("../public/exercises/", import.meta.url);

const C = {
  bg: "#f5fbfa",
  ink: "#24313a",
  inkSoft: "#53636d",
  teal: "#0f9f9a",
  tealSoft: "#d7f2ef",
  tealMid: "#6fcfca",
  steel: "#91a0a9",
  white: "#ffffff",
};

const attr = (attributes) =>
  Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

const tag = (name, attributes, content) =>
  content === undefined ? `<${name} ${attr(attributes)} />` : `<${name} ${attr(attributes)}>${content}</${name}>`;

const line = (x1, y1, x2, y2, stroke = C.ink, width = 14) =>
  tag("line", {
    x1,
    y1,
    x2,
    y2,
    stroke,
    "stroke-width": width,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });

const polyline = (points, stroke = C.ink, width = 14) =>
  tag("polyline", {
    points: points.map(([x, y]) => `${x},${y}`).join(" "),
    fill: "none",
    stroke,
    "stroke-width": width,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });

const path = (d, stroke = C.ink, width = 14, fill = "none") =>
  tag("path", {
    d,
    fill,
    stroke,
    "stroke-width": width,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });

const circle = (cx, cy, r, fill = C.white, stroke = C.ink, width = 10) =>
  tag("circle", { cx, cy, r, fill, stroke, "stroke-width": width });

const ellipse = (cx, cy, rx, ry, fill = C.white, stroke = C.ink, width = 10) =>
  tag("ellipse", { cx, cy, rx, ry, fill, stroke, "stroke-width": width });

const rect = (x, y, width, height, fill = C.white, stroke = C.ink, strokeWidth = 10, rx = 8) =>
  tag("rect", { x, y, width, height, rx, fill, stroke, "stroke-width": strokeWidth });

const group = (content, transform) => tag("g", { transform }, content.join(""));

const joint = (x, y, r = 7) => circle(x, y, r, C.teal, C.teal, 0);

const dumbbell = (cx, cy, angle = 0) =>
  group(
    [
      line(cx - 24, cy, cx + 24, cy, C.ink, 8),
      rect(cx - 36, cy - 13, 12, 26, C.teal, C.ink, 6, 4),
      rect(cx + 24, cy - 13, 12, 26, C.teal, C.ink, 6, 4),
    ],
    `rotate(${angle} ${cx} ${cy})`,
  );

const barbell = (x1, y, x2, plateSize = 1) => {
  const outer = 20 * plateSize;
  const inner = 16 * plateSize;
  const height = 70 * plateSize;
  const shortHeight = 52 * plateSize;

  return [
    line(x1, y, x2, y, C.ink, 10),
    rect(x1 - outer - inner, y - shortHeight / 2, inner, shortHeight, C.teal, C.ink, 6, 3),
    rect(x1 - outer, y - height / 2, inner, height, C.white, C.ink, 6, 3),
    rect(x2 + outer - inner, y - height / 2, inner, height, C.white, C.ink, 6, 3),
    rect(x2 + outer, y - shortHeight / 2, inner, shortHeight, C.teal, C.ink, 6, 3),
  ];
};

const floor = () => path("M74 414 C142 394 213 420 279 407 C342 394 389 389 438 408", C.tealSoft, 28);

const frame = (parts) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${C.bg}" />
  <path d="M62 84 H188" stroke="${C.tealSoft}" stroke-width="34" stroke-linecap="round" />
  <path d="M384 62 V182" stroke="${C.tealSoft}" stroke-width="28" stroke-linecap="round" />
  ${parts.join("\n  ")}
</svg>`;

const assets = {
  "barbell-squat.png": [
    floor(),
    ...barbell(142, 176, 370, 0.95),
    circle(263, 134, 24),
    line(252, 164, 236, 240),
    line(236, 240, 184, 300),
    line(184, 300, 150, 374),
    line(236, 240, 296, 300),
    line(296, 300, 348, 374),
    line(138, 384, 178, 384),
    line(334, 384, 374, 384),
    line(250, 182, 184, 176),
    line(250, 182, 324, 176),
    joint(236, 240),
    joint(184, 300),
    joint(296, 300),
  ],
  "bench-press.png": [
    floor(),
    line(128, 330, 390, 330, C.ink, 16),
    line(178, 330, 154, 392, C.inkSoft, 12),
    line(336, 330, 366, 392, C.inkSoft, 12),
    ...barbell(148, 184, 364, 0.85),
    circle(158, 280, 22),
    line(186, 292, 316, 308),
    line(316, 308, 360, 356),
    line(320, 308, 274, 360),
    line(224, 296, 230, 238),
    line(230, 238, 226, 190),
    line(285, 304, 296, 244),
    line(296, 244, 300, 190),
    joint(224, 296),
    joint(285, 304),
  ],
  "horizontal-row.png": [
    floor(),
    ...barbell(178, 344, 344, 0.74),
    circle(332, 196, 22),
    line(310, 225, 222, 270),
    line(222, 270, 174, 356),
    line(222, 270, 302, 370),
    line(160, 378, 204, 378),
    line(290, 388, 334, 388),
    line(296, 236, 254, 292),
    line(254, 292, 228, 338),
    line(318, 242, 300, 300),
    line(300, 300, 286, 338),
    joint(222, 270),
    joint(254, 292),
    joint(300, 300),
  ],
  "romanian-deadlift.png": [
    floor(),
    ...barbell(180, 336, 346, 0.72),
    circle(326, 158, 23),
    line(304, 192, 232, 258),
    line(232, 258, 194, 374),
    line(232, 258, 294, 374),
    line(178, 390, 220, 390),
    line(278, 390, 320, 390),
    line(290, 210, 270, 280),
    line(270, 280, 236, 330),
    line(310, 214, 312, 282),
    line(312, 282, 292, 330),
    joint(232, 258),
    joint(270, 280),
    joint(312, 282),
  ],
  "plank.png": [
    rect(90, 338, 332, 26, C.tealSoft, "none", 0, 13),
    circle(132, 270, 22),
    line(164, 282, 284, 300),
    line(284, 300, 380, 318),
    line(178, 292, 150, 344),
    line(222, 294, 206, 346),
    line(370, 318, 414, 348),
    line(402, 358, 438, 358),
    line(138, 350, 184, 350),
    joint(284, 300),
    joint(178, 292),
    joint(222, 294),
  ],
  "deadlift.png": [
    floor(),
    ...barbell(122, 366, 390, 1.05),
    circle(276, 158, 23),
    line(260, 190, 242, 286),
    line(242, 286, 184, 342),
    line(184, 342, 150, 402),
    line(242, 286, 310, 342),
    line(310, 342, 352, 402),
    line(152, 408, 198, 408),
    line(334, 408, 378, 408),
    line(246, 210, 224, 294),
    line(224, 294, 216, 360),
    line(274, 210, 284, 294),
    line(284, 294, 292, 360),
    joint(242, 286),
    joint(184, 342),
    joint(310, 342),
  ],
  "overhead-press.png": [
    floor(),
    ...barbell(146, 98, 366, 0.86),
    circle(256, 158, 23),
    line(256, 190, 256, 286),
    line(256, 286, 204, 386),
    line(256, 286, 310, 386),
    line(188, 400, 230, 400),
    line(292, 400, 334, 400),
    line(238, 186, 206, 134),
    line(206, 134, 204, 102),
    line(274, 186, 306, 134),
    line(306, 134, 308, 102),
    joint(238, 186),
    joint(274, 186),
    joint(256, 286),
  ],
  "pull-up.png": [
    line(116, 90, 396, 90, C.ink, 16),
    line(138, 90, 138, 388, C.steel, 10),
    line(374, 90, 374, 388, C.steel, 10),
    floor(),
    circle(256, 168, 23),
    line(256, 198, 256, 302),
    line(238, 202, 202, 138),
    line(202, 138, 198, 92),
    line(274, 202, 312, 138),
    line(312, 138, 316, 92),
    line(256, 302, 222, 374),
    line(256, 302, 294, 374),
    line(222, 374, 252, 404),
    line(294, 374, 324, 404),
    joint(238, 202),
    joint(274, 202),
    joint(256, 302),
  ],
  "leg-press-lunge.png": [
    floor(),
    rect(112, 388, 152, 18, C.tealSoft, "none", 0, 9),
    dumbbell(178, 282, 86),
    dumbbell(334, 286, 94),
    circle(254, 154, 23),
    line(254, 186, 244, 280),
    line(244, 280, 178, 332),
    line(178, 332, 132, 394),
    line(244, 280, 320, 336),
    line(320, 336, 390, 370),
    line(118, 404, 166, 404),
    line(372, 380, 418, 380),
    line(238, 204, 184, 282),
    line(270, 204, 330, 286),
    joint(244, 280),
    joint(178, 332),
    joint(320, 336),
  ],
  "face-pull.png": [
    floor(),
    rect(392, 86, 20, 302, C.white, C.ink, 8, 4),
    circle(402, 142, 13, C.teal, C.ink, 6),
    line(402, 142, 304, 198, C.teal, 7),
    line(402, 142, 304, 230, C.teal, 7),
    circle(222, 190, 23),
    line(222, 222, 226, 318),
    line(226, 318, 184, 404),
    line(226, 318, 272, 404),
    line(168, 414, 210, 414),
    line(256, 414, 298, 414),
    line(214, 238, 266, 202),
    line(266, 202, 308, 198),
    line(236, 240, 270, 232),
    line(270, 232, 310, 230),
    joint(266, 202),
    joint(270, 232),
    joint(226, 318),
  ],
  "front-squat.png": [
    floor(),
    ...barbell(158, 188, 354, 0.78),
    circle(256, 138, 23),
    line(256, 168, 252, 250),
    line(252, 250, 190, 316),
    line(190, 316, 150, 386),
    line(252, 250, 314, 316),
    line(314, 316, 360, 386),
    line(136, 398, 178, 398),
    line(344, 398, 386, 398),
    line(238, 190, 300, 202),
    line(274, 190, 326, 204),
    joint(252, 250),
    joint(190, 316),
    joint(314, 316),
  ],
  "incline-dumbbell-press.png": [
    floor(),
    line(144, 354, 340, 244, C.ink, 16),
    line(178, 336, 150, 408, C.inkSoft, 12),
    line(304, 266, 364, 392, C.inkSoft, 12),
    dumbbell(252, 166, -12),
    dumbbell(338, 194, 10),
    circle(186, 268, 22),
    line(210, 286, 310, 254),
    line(310, 254, 358, 318),
    line(234, 278, 240, 214),
    line(240, 214, 252, 174),
    line(286, 262, 312, 218),
    line(312, 218, 336, 202),
    joint(234, 278),
    joint(286, 262),
  ],
  "lat-pulldown.png": [
    floor(),
    rect(392, 76, 20, 320, C.white, C.ink, 8, 4),
    line(176, 116, 336, 116, C.ink, 12),
    line(256, 116, 402, 116, C.teal, 6),
    line(402, 116, 402, 142, C.teal, 6),
    rect(188, 340, 136, 18, C.tealSoft, "none", 0, 9),
    circle(256, 214, 22),
    line(256, 246, 256, 334),
    line(238, 258, 206, 190),
    line(206, 190, 196, 122),
    line(274, 258, 306, 190),
    line(306, 190, 316, 122),
    line(256, 334, 224, 402),
    line(256, 334, 292, 402),
    joint(238, 258),
    joint(274, 258),
    joint(256, 334),
  ],
  "hyperextension-leg-curl.png": [
    floor(),
    line(150, 334, 330, 244, C.ink, 16),
    line(210, 304, 170, 404, C.inkSoft, 12),
    line(300, 260, 356, 398, C.inkSoft, 12),
    ellipse(326, 240, 34, 18, C.tealSoft, C.ink, 8),
    ellipse(166, 340, 32, 16, C.tealSoft, C.ink, 8),
    circle(186, 236, 22),
    line(208, 254, 292, 292),
    line(292, 292, 356, 270),
    line(356, 270, 410, 250),
    line(404, 242, 438, 230),
    line(286, 292, 250, 350),
    line(250, 350, 212, 392),
    joint(292, 292),
    joint(356, 270),
  ],
  "lateral-raise-abs.png": [
    floor(),
    rect(98, 390, 124, 22, C.tealSoft, "none", 0, 11),
    path("M116 374 C146 342 178 342 210 374", C.teal, 8),
    dumbbell(138, 218, 0),
    dumbbell(374, 218, 0),
    circle(256, 154, 23),
    line(256, 186, 256, 292),
    line(256, 292, 210, 392),
    line(256, 292, 304, 392),
    line(194, 404, 236, 404),
    line(288, 404, 330, 404),
    line(238, 210, 184, 218),
    line(184, 218, 144, 218),
    line(274, 210, 328, 218),
    line(328, 218, 368, 218),
    joint(238, 210),
    joint(274, 210),
    joint(256, 292),
  ],
};

await fs.mkdir(outputDir, { recursive: true });

for (const [fileName, parts] of Object.entries(assets)) {
  const svg = frame(parts);
  const outputPath = new URL(fileName, outputDir);

  await sharp(Buffer.from(svg)).resize(512, 512).png({ compressionLevel: 9 }).toFile(fileURLToPath(outputPath));
}

console.log(`Generated ${Object.keys(assets).length} exercise assets in ${outputDir.pathname}`);
