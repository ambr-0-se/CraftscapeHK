import { generateChineseTextImage, generateMahjongTileReference } from './text-to-image.util';

describe('TextToImageUtil', () => {
  describe('generateChineseTextImage', () => {
    it('should generate a base64 PNG image with Chinese text', () => {
      const result = generateChineseTextImage({ text: '發財' });
      
      expect(result).toBeDefined();
      expect(result).toContain('data:image/png;base64,');
      expect(result.length).toBeGreaterThan(100);
    });

    it('should handle custom dimensions', () => {
      const result = generateChineseTextImage({ 
        text: '海莉',
        width: 500,
        height: 700,
        fontSize: 150,
      });
      
      expect(result).toBeDefined();
      expect(result).toContain('data:image/png;base64,');
    });

    it('should handle single character', () => {
      const result = generateChineseTextImage({ text: '龍' });
      
      expect(result).toBeDefined();
      expect(result).toContain('data:image/png;base64,');
    });

    it('should handle multiple characters vertically', () => {
      const result = generateChineseTextImage({ text: '港大麻雀' });
      
      expect(result).toBeDefined();
      expect(result).toContain('data:image/png;base64,');
    });
  });

  describe('generateMahjongTileReference', () => {
    it('should generate a mahjong-optimized reference image', () => {
      const result = generateMahjongTileReference('發財');
      
      expect(result).toBeDefined();
      expect(result).toContain('data:image/png;base64,');
      expect(result.length).toBeGreaterThan(100);
    });

    it('should work with various character lengths', () => {
      const singleChar = generateMahjongTileReference('福');
      const twoChars = generateMahjongTileReference('幸福');
      const fourChars = generateMahjongTileReference('恭喜發財');
      
      expect(singleChar).toBeDefined();
      expect(twoChars).toBeDefined();
      expect(fourChars).toBeDefined();
    });
  });
});
