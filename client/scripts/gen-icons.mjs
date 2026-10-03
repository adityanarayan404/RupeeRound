// Draws the RupeeRound app icons as PNGs with no image libraries (node:zlib only).
// Same design as public/favicon.svg. Run: pnpm --filter ./client icons
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../public/icons')

const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16))
const CARD_TOP = hex('#2A211C')
const CARD_BOTTOM = hex('#000000')
const COIN = hex('#F4F1EC')
const RING = hex('#958C84')
const ARROW_INK = hex('#0A0807')

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}
function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Signed distance helpers, in a 64×64 design space (matches favicon.svg).
const segment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}
const roundedRect = (px, py, size, radius) => {
  const qx = Math.abs(px - size / 2) - (size / 2 - radius)
  const qy = Math.abs(py - size / 2) - (size / 2 - radius)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
}
const ARROW = [
  [23, 38, 29.5, 31.5],
  [29.5, 31.5, 34, 35.5],
  [34, 35.5, 42, 26.5],
  [36.5, 26.5, 42, 26.5],
  [42, 26.5, 42, 32],
]

/** Colour at a design-space point, or null for transparent. `inset` shrinks the art for maskable icons. */
function shade(x, y, { rounded, inset }) {
  const scale = 1 / inset
  const cx = 32 + (x - 32) * scale
  const cy = 32 + (y - 32) * scale
  const coin = Math.hypot(cx - 32, cy - 32)
  if (ARROW.some(([ax, ay, bx, by]) => segment(cx, cy, ax, ay, bx, by) <= 1.7) && coin < 19) return ARROW_INK
  if (Math.abs(coin - 15) <= 0.75) return RING
  if (coin <= 19) return COIN
  if (rounded && roundedRect(x, y, 64, 18) > 0) return null
  const t = (x + y) / 128
  return CARD_TOP.map((value, i) => Math.round(value + (CARD_BOTTOM[i] - value) * t))
}

function render(size, options) {
  const samples = 4 // 4×4 supersampling for smooth edges
  const pixels = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const color = shade(((px + (sx + 0.5) / samples) / size) * 64, ((py + (sy + 0.5) / samples) / size) * 64, options)
          if (!color) continue
          r += color[0]
          g += color[1]
          b += color[2]
          a += 1
        }
      }
      const offset = (py * size + px) * 4
      pixels[offset] = a ? r / a : 0
      pixels[offset + 1] = a ? g / a : 0
      pixels[offset + 2] = a ? b / a : 0
      pixels[offset + 3] = Math.round((a / samples ** 2) * 255)
    }
  }
  return encodePng(size, pixels)
}

mkdirSync(OUT, { recursive: true })
const icons = [
  ['icon-192.png', 192, { rounded: true, inset: 1 }],
  ['icon-512.png', 512, { rounded: true, inset: 1 }],
  // Maskable icons get cropped to a circle/squircle, so keep the art in the safe zone.
  ['maskable-512.png', 512, { rounded: false, inset: 0.8 }],
  // iOS adds its own rounded corners.
  ['apple-touch-icon.png', 180, { rounded: false, inset: 0.9 }],
]
for (const [name, size, options] of icons) {
  writeFileSync(join(OUT, name), render(size, options))
  console.log(`wrote ${name}`)
}
