// Rasterises Natural Earth land polygons (public domain) into an
// equirectangular greyscale PNG: white = land, black = sea.
//
// Usage:
//   curl -sSLo ne_50m_land.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson
//   node scripts/build-land-mask.mjs ne_50m_land.geojson public/land-mask.png [width]

import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const [input, output, widthArg] = process.argv.slice(2)
if (!input || !output) {
  console.error('usage: build-land-mask.mjs <land.geojson> <out.png> [width]')
  process.exit(1)
}

const W = Number(widthArg ?? 2048)
const H = W / 2
const geo = JSON.parse(readFileSync(input, 'utf8'))

// Every ring of every polygon. Even-odd filling handles holes (lakes) because
// Natural Earth land polygons never overlap each other.
const rings = []
for (const f of geo.features) {
  const g = f.geometry
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []
  for (const poly of polys) for (const ring of poly) rings.push(ring)
}

const pixels = Buffer.alloc(W * H)
const xs = []
for (let y = 0; y < H; y++) {
  const lat = 90 - ((y + 0.5) * 180) / H
  xs.length = 0
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [lng1, lat1] = ring[i]
      const [lng2, lat2] = ring[j]
      if (lat1 > lat !== lat2 > lat) {
        const lng = lng1 + ((lat - lat1) * (lng2 - lng1)) / (lat2 - lat1)
        xs.push(((lng + 180) / 360) * W)
      }
    }
  }
  xs.sort((a, b) => a - b)
  for (let k = 0; k + 1 < xs.length; k += 2) {
    const x0 = Math.max(0, Math.round(xs[k]))
    const x1 = Math.min(W, Math.round(xs[k + 1]))
    pixels.fill(255, y * W + x0, y * W + x1)
  }
}

writeFileSync(output, encodeGreyPng(pixels, W, H))
console.log(`wrote ${output} (${W}×${H})`)

function encodeGreyPng(data, width, height) {
  const raw = Buffer.alloc((width + 1) * height)
  for (let y = 0; y < height; y++) data.copy(raw, y * (width + 1) + 1, y * width, (y + 1) * width)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 0 // greyscale

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type, body) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed))
  return Buffer.concat([len, typed, crc])
}

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}
