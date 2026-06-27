import { Controller, Post, Body, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { generateMahjongTileReference, generateChineseTextImage } from '../utils/text-to-image.util';
import * as fs from 'fs';
import * as path from 'path';

interface GenerateReferenceDto {
  text: string;
  width?: number;
  height?: number;
  fontSize?: number;
}

@Controller('debug')
export class DebugController {
  private debugDir = path.join(process.cwd(), '..', 'public', 'debug-references');

  constructor() {
    // Ensure debug directory exists
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }

  @Post('generate-reference')
  async generateReference(@Body() dto: GenerateReferenceDto) {
    const { text, width, height, fontSize } = dto;

    // Generate the reference image
    const referenceImage = width || height || fontSize
      ? generateChineseTextImage({ text, width, height, fontSize })
      : generateMahjongTileReference(text);

    // Extract base64 data
    const base64Data = referenceImage.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Save to debug folder
    const timestamp = Date.now();
    const filename = `${text.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${timestamp}.png`;
    const filepath = path.join(this.debugDir, filename);
    
    fs.writeFileSync(filepath, buffer);

    const publicUrl = `/debug-references/${filename}`;

    return {
      success: true,
      message: 'Reference image generated and saved',
      text,
      filename,
      filepath,
      publicUrl,
      base64: referenceImage,
      size: `${Math.round(referenceImage.length / 1024)} KB`,
    };
  }

  @Get('list-references')
  async listReferences() {
    if (!fs.existsSync(this.debugDir)) {
      return { files: [] };
    }

    const files = fs.readdirSync(this.debugDir)
      .filter(f => f.endsWith('.png'))
      .map(filename => {
        const filepath = path.join(this.debugDir, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          url: `/debug-references/${filename}`,
          size: `${Math.round(stats.size / 1024)} KB`,
          created: stats.mtime,
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    return { files, count: files.length };
  }

  @Get('view-reference')
  async viewReference(@Query('filename') filename: string, @Res() res: Response) {
    const filepath = path.join(this.debugDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filepath);
  }

  @Post('clear-references')
  async clearReferences() {
    if (fs.existsSync(this.debugDir)) {
      const files = fs.readdirSync(this.debugDir).filter(f => f.endsWith('.png'));
      files.forEach(file => {
        fs.unlinkSync(path.join(this.debugDir, file));
      });
      return { success: true, deleted: files.length };
    }
    return { success: true, deleted: 0 };
  }
}
