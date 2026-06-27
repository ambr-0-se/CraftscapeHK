/**
 * Example script to generate sample mahjong reference images
 * Run with: node examples/generate-sample-references.js
 */

import { generateMahjongTileReference, generateChineseTextImage } from '../src/utils/text-to-image.util';
import * as fs from 'fs';
import * as path from 'path';

const sampleTexts = [
  '發財',  // Prosperity/Wealth
  '港大',  // HKU
  '海莉',  // Hailey
  '龍',    // Dragon
  '幸福',  // Happiness
  '恭喜發財', // Congratulations and prosperity
];

const outputDir = path.join(__dirname, '..', '..', 'public', 'examples', 'mahjong-references');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Generating sample mahjong reference images...\n');

sampleTexts.forEach(text => {
  try {
    // Generate reference image
    const referenceImage = generateMahjongTileReference(text);
    
    // Extract base64 data and convert to buffer
    const base64Data = referenceImage.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save to file
    const filename = `${text.replace(/\s+/g, '_')}.png`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    console.log(`✓ Generated: ${filename} (${text})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${text}:`, error.message);
  }
});

console.log(`\nAll sample images saved to: ${outputDir}`);
console.log('\nYou can view these images to see how the reference images look before being sent to the AI.');
