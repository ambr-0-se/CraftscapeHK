import { createCanvas, registerFont } from 'canvas';
import * as path from 'path';

// Register the Hong Kong Kai font with fallback to Edukai
// Fonts are now in server/assets/mahjong and deployed to /app/assets/mahjong
const assetsDir = path.join(__dirname, '..', '..', 'assets', 'mahjong');

const fontPath = path.join(assetsDir, 'Free-HK-Kai_4700-v1.02.ttf');
const fallbackFontPath = path.join(assetsDir, 'edukai-5.0.ttf');

// Register fonts if available
try {
  registerFont(fontPath, { family: 'Free HK Kai' });
  console.log('✅ Registered Free HK Kai font from:', fontPath);
} catch (err) {
  console.warn('⚠️ Failed to register Free HK Kai font:', err.message);
}
try {
  registerFont(fallbackFontPath, { family: 'TW-MOE-Std-Kai' });
  registerFont(fallbackFontPath, { family: '教育部標準楷書' });
  console.log('✅ Registered fallback font from:', fallbackFontPath);
} catch (err) {
  console.warn('⚠️ Failed to register fallback font:', err.message);
}

const fallbackFontFamilyName = 'TW-MOE-Std-Kai';

export interface TextImageOptions {
  text: string;
  width?: number;
  height?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
  padding?: number;
}



/**
 * Generates a PNG image with Chinese text rendered vertically using the Free HK Kai font
 * @param options Configuration for text rendering
 * @returns Base64 encoded PNG image
 */
export function generateChineseTextImage(options: TextImageOptions): string {
  const {
    text,
    width = 300,
    height = 400,
    fontSize: requestedFontSize = 120,
    backgroundColor = '#FFFFFF',
    textColor = '#000000',
    padding = 40,
  } = options;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Calculate dynamic font size to fit text with padding
  const characters = Array.from(text);
  const numChars = characters.length;
  
  // Available space for text
  const availableWidth = width - (padding * 2);
  const availableHeight = height - (padding * 2);
  
  // Calculate maximum font size that fits
  // For vertical text: height per character = fontSize + spacing
  const charSpacing = 20; // spacing between characters
  const totalSpacingHeight = (numChars - 1) * charSpacing;
  const maxFontSizeByHeight = (availableHeight - totalSpacingHeight) / numChars;
  
  // Font size also limited by width (characters shouldn't overflow horizontally)
  const maxFontSizeByWidth = availableWidth;
  
  // Use the smaller of the constraints, but don't exceed requested size
  const fontSize = Math.min(
    requestedFontSize,
    maxFontSizeByHeight,
    maxFontSizeByWidth
  );
  
  console.log(`Dynamic font sizing: requested=${requestedFontSize}px, calculated=${Math.round(fontSize)}px for ${numChars} character(s)`);

  // Set text properties
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Calculate vertical positioning for characters
  const totalTextHeight = numChars * fontSize + (numChars - 1) * charSpacing;
  const startY = (height - totalTextHeight) / 2;

  // Draw each character vertically using Free HK Kai if available, else fallback, else system font
  characters.forEach((char, index) => {
    const x = width / 2;
    const y = startY + index * (fontSize + charSpacing);
    // Always try Free HK Kai, then fallback, then system
    ctx.font = `${fontSize}px "Free HK Kai", "${fallbackFontFamilyName}", sans-serif`;
    ctx.fillText(char, x, y);
  });

  // Convert to base64 PNG
  const buffer = canvas.toBuffer('image/png');
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generates a mahjong tile reference image with Chinese character
 * Optimized for mahjong tile generation with appropriate sizing
 */
export function generateMahjongTileReference(chineseText: string): string {
  // Mahjong tiles are typically narrow and tall
  return generateChineseTextImage({
    text: chineseText,
    width: 300,
    height: 400,
    fontSize: 100,
    backgroundColor: '#F5F5DC', // Beige background similar to traditional tiles
    textColor: '#1A1A1A',
    padding: 30,
  });
}
