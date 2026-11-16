const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const SVG_CODE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="TURX FOREVER">
  <defs>
    <!-- Gold Gradients -->
    <linearGradient id="gold-bright" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF0"/>
      <stop offset="30%" stop-color="#FEF08A"/>
      <stop offset="65%" stop-color="#EAB308"/>
      <stop offset="100%" stop-color="#CA8A04"/>
    </linearGradient>
    <linearGradient id="gold-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#CA8A04"/>
      <stop offset="50%" stop-color="#A16207"/>
      <stop offset="100%" stop-color="#5E2B08"/>
    </linearGradient>
    <linearGradient id="shield-gold-border" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="35%" stop-color="#F59E0B"/>
      <stop offset="80%" stop-color="#92400E"/>
      <stop offset="100%" stop-color="#451A03"/>
    </linearGradient>
    <!-- Royal Alliance Blue Shield Interior -->
    <linearGradient id="shield-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A"/>
      <stop offset="35%" stop-color="#172554"/>
      <stop offset="75%" stop-color="#0A142F"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>
    <!-- Sword Blade Gradients -->
    <linearGradient id="blade-left" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="45%" stop-color="#BAE6FD"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <linearGradient id="blade-right" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="45%" stop-color="#93C5FD"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <!-- Cyan Neon Infinity -->
    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#00F2FE"/>
    </linearGradient>
    <!-- Subtle drop filter -->
    <filter id="cyan-bloom" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Dark drop shadow for contrast against white or dark browser tabs -->
  <path d="M 32 3 L 55 7.5 L 55 33 C 55 47, 44 57.5, 32 62.5 C 20 57.5, 9 47, 9 33 L 9 7.5 Z" fill="#020617" opacity="0.75" />

  <!-- Outer Shield Border (Beveled Gold Frame) -->
  <path d="M 32 3.8 L 54 8 L 54 33 C 54 46.5, 43 56.5, 32 61 C 21 56.5, 10 46.5, 10 33 L 10 8 Z" fill="url(#shield-gold-border)" stroke="#3B1803" stroke-width="0.8" stroke-linejoin="round" />

  <!-- Inner Shield Field (Royal Alliance Blue) -->
  <path d="M 32 6.5 L 51 10 L 51 33 C 51 44.5, 41 54, 32 58 C 23 54, 13 44.5, 13 33 L 13 10 Z" fill="url(#shield-bg)" stroke="#FDE047" stroke-width="0.7" stroke-opacity="0.4" />

  <!-- Shield Subtle Vertical Inset Line -->
  <line x1="32" y1="7" x2="32" y2="57" stroke="#38BDF8" stroke-width="0.6" stroke-opacity="0.25" />

  <!-- ==================== CROSSED SWORDS ==================== -->
  <!-- Sword 1: Top-Left to Bottom-Right -->
  <g>
    <!-- Pommel -->
    <circle cx="12.5" cy="11.5" r="2.2" fill="url(#gold-bright)" stroke="#78350F" stroke-width="0.5" />
    <circle cx="12.5" cy="11.5" r="0.8" fill="#FFFFFF" />
    <!-- Grip -->
    <line x1="14" y1="13" x2="17.5" y2="16.5" stroke="#92400E" stroke-width="1.8" stroke-linecap="round" />
    <!-- Crossguard -->
    <path d="M 14.5 19.5 L 20.5 13.5" stroke="url(#gold-bright)" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="14" cy="20" r="0.8" fill="#FDE047" />
    <circle cx="21" cy="13" r="0.8" fill="#FDE047" />
    <!-- Blade -->
    <polygon points="19,18 48,47 46,49 17,20" fill="url(#blade-left)" />
    <!-- Blade Runic Edge Highlight -->
    <line x1="18" y1="19" x2="47" y2="48" stroke="#00F2FE" stroke-width="0.7" opacity="0.9" />
  </g>

  <!-- Sword 2: Top-Right to Bottom-Left -->
  <g>
    <!-- Pommel -->
    <circle cx="51.5" cy="11.5" r="2.2" fill="url(#gold-bright)" stroke="#78350F" stroke-width="0.5" />
    <circle cx="51.5" cy="11.5" r="0.8" fill="#FFFFFF" />
    <!-- Grip -->
    <line x1="50" y1="13" x2="46.5" y2="16.5" stroke="#92400E" stroke-width="1.8" stroke-linecap="round" />
    <!-- Crossguard -->
    <path d="M 49.5 19.5 L 43.5 13.5" stroke="url(#gold-bright)" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="50" cy="20" r="0.8" fill="#FDE047" />
    <circle cx="43" cy="13" r="0.8" fill="#FDE047" />
    <!-- Blade -->
    <polygon points="45,18 16,47 18,49 47,20" fill="url(#blade-right)" />
    <!-- Blade Runic Edge Highlight -->
    <line x1="46" y1="19" x2="17" y2="48" stroke="#00F2FE" stroke-width="0.7" opacity="0.9" />
  </g>

  <!-- ==================== BOLD GOLDEN 'T' (TURX) ==================== -->
  <!-- Shadow of T for 3D depth -->
  <g transform="translate(0, 1.2)" opacity="0.6">
    <path d="M 16 19 L 22 17 L 32 15 L 42 17 L 48 19 L 47 26 L 43 25 L 36 25 L 36 44 L 32 49 L 28 44 L 28 25 L 21 25 L 17 26 Z" fill="#020617"/>
  </g>

  <!-- T - Left Bevel (Light Gold) -->
  <path d="M 16 19 L 22 17 L 32 15 L 32 49 L 28 44 L 28 25 L 21 25 L 17 26 Z" 
        fill="url(#gold-bright)" 
        stroke="#78350F" 
        stroke-width="0.6" 
        stroke-linejoin="round" />

  <!-- T - Right Bevel (Deep Gold / Amber) -->
  <path d="M 32 15 L 42 17 L 48 19 L 47 26 L 43 25 L 36 25 L 36 44 L 32 49 Z" 
        fill="url(#gold-shadow)" 
        stroke="#5E2B08" 
        stroke-width="0.6" 
        stroke-linejoin="round" />

  <!-- T Center Chiseled Ridge Line -->
  <line x1="32" y1="15" x2="32" y2="49" stroke="#FFFDF0" stroke-width="1.1" stroke-linecap="round" />

  <!-- Glowing Crown Gem on top of T -->
  <polygon points="32,13 34.5,16.5 32,20 29.5,16.5" fill="#00F2FE" stroke="#FFFFFF" stroke-width="0.6" filter="url(#cyan-bloom)" />

  <!-- ==================== FOREVER INFINITY SYMBOL ==================== -->
  <!-- Glow underlay -->
  <path d="M 32 49.5 C 27 43 17 43 17 49.5 C 17 56 27 56 32 49.5 C 37 43 47 43 47 49.5 C 47 56 37 56 32 49.5 Z" 
        fill="none" 
        stroke="#0284C7" 
        stroke-width="4.5" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        opacity="0.6" />

  <!-- Main glowing cyan infinity loop -->
  <path d="M 32 49.5 C 27 43 17 43 17 49.5 C 17 56 27 56 32 49.5 C 37 43 47 43 47 49.5 C 47 56 37 56 32 49.5 Z" 
        fill="none" 
        stroke="url(#cyan-glow)" 
        stroke-width="2.5" 
        stroke-linecap="round" 
        stroke-linejoin="round" />

  <!-- Inner brilliant white core line -->
  <path d="M 32 49.5 C 27 43 17 43 17 49.5 C 17 56 27 56 32 49.5 C 37 43 47 43 47 49.5 C 47 56 37 56 32 49.5 Z" 
        fill="none" 
        stroke="#FFFFFF" 
        stroke-width="0.9" 
        stroke-linecap="round" 
        stroke-linejoin="round" />

  <!-- Overlap crossover detail -->
  <path d="M 29.5 52.5 L 34.5 46.5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />

  <!-- Left and Right Infinity Anchor Rivets -->
  <circle cx="17" cy="49.5" r="1.1" fill="#FDE047" stroke="#78350F" stroke-width="0.4" />
  <circle cx="47" cy="49.5" r="1.1" fill="#FDE047" stroke="#78350F" stroke-width="0.4" />
</svg>`

function buildIco(images) {
  // images: array of { width, height, buffer }
  const headerSize = 6
  const dirEntrySize = 16
  const numImages = images.length
  let offset = headerSize + dirEntrySize * numImages

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(numImages, 4)

  const dirEntries = []
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize)
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0)
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(img.buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    dirEntries.push(entry)
    offset += img.buffer.length
  }

  return Buffer.concat([header, ...dirEntries, ...images.map(i => i.buffer)])
}

async function run() {
  const root = process.cwd()
  const publicDir = path.join(root, 'public')
  const appDir = path.join(root, 'app')

  // 1. Write SVG icons
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), SVG_CODE, 'utf8')
  fs.writeFileSync(path.join(appDir, 'icon.svg'), SVG_CODE, 'utf8')
  console.log('✓ Wrote icon.svg to public/ and app/')

  // 2. Generate PNGs at all needed resolutions
  const svgBuf = Buffer.from(SVG_CODE)

  const png16 = await sharp(svgBuf).resize(16, 16).png().toBuffer()
  const png32 = await sharp(svgBuf).resize(32, 32).png().toBuffer()
  const png48 = await sharp(svgBuf).resize(48, 48).png().toBuffer()
  const png64 = await sharp(svgBuf).resize(64, 64).png().toBuffer()
  const png180 = await sharp(svgBuf).resize(180, 180).png().toBuffer()
  const png512 = await sharp(svgBuf).resize(512, 512).png().toBuffer()

  // 3. Write 32x32 PNGs
  fs.writeFileSync(path.join(publicDir, 'icon-light-32x32.png'), png32)
  fs.writeFileSync(path.join(publicDir, 'icon-dark-32x32.png'), png32)
  console.log('✓ Wrote icon-light-32x32.png and icon-dark-32x32.png')

  // 4. Write app/icon.png and public/icon.png
  fs.writeFileSync(path.join(appDir, 'icon.png'), png512)
  fs.writeFileSync(path.join(publicDir, 'icon.png'), png512)
  console.log('✓ Wrote icon.png (512x512) to app/ and public/')

  // 5. Write apple-icon.png
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), png180)
  fs.writeFileSync(path.join(publicDir, 'apple-icon.png'), png180)
  console.log('✓ Wrote apple-icon.png (180x180) to app/ and public/')

  // 6. Build multi-size favicon.ico (16, 32, 48)
  const icoBuf = buildIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ])
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuf)
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf)
  console.log(`✓ Wrote favicon.ico (${icoBuf.length} bytes) to app/ and public/`)
}

run().catch(console.error)
