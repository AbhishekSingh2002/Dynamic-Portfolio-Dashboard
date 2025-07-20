const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon configurations
const iconSizes = [192, 256, 384, 512];

// Create a simple icon with text
function createIcon(size, text) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(0, 0, size, size);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const fontSize = Math.floor(size / 4);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillText(text, size / 2, size / 2);
  
  return canvas.toBuffer();
}

// Generate all icons
iconSizes.forEach(size => {
  const buffer = createIcon(size, `${size}x${size}`);
  const filename = `icon-${size}x${size}.png`;
  fs.writeFileSync(path.join(iconsDir, filename), buffer);
  console.log(`Generated ${filename}`);
});

// Also create favicon.ico and apple-touch-icon.png
const favicon = createIcon(32, 'DP');
fs.writeFileSync(path.join(iconsDir, '../favicon.ico'), favicon);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createIcon(180, 'DP'));

console.log('Icons generated successfully!');
