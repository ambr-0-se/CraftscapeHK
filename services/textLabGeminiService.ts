import { GoogleGenAI, Type } from "@google/genai";

// Use backend API instead of calling Gemini directly
const USE_BACKEND_API = true;
// Remove /api suffix if present in the base URL to avoid duplication
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/api$/, '');

type GlyphName = 
  | 'shou' | 'tian' | 'shui' | 'kou' | 'nian' | 'bu' | 'shan' | 'ge' | 'ren' | 'xin'
  | 'ri' | 'shi' | 'mu' | 'huo' | 'tu' | 'zhu' | 'da' | 'zhong' | 'jin' | 'nu'
  | 'yue' | 'gong' | 'heng' | 'shu' | 'pie' | 'na' | 'dian' | 'ti';

interface CanvasElement {
  id: string;
  glyph: GlyphName;
  char: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  fontWeight: number;
}

interface AiLayoutElement {
  glyph: GlyphName;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  fontWeight: number;
  isMirror?: boolean;
  isOutline?: boolean;
}

interface AiLayout {
  description: string;
  elements: AiLayoutElement[];
}

const GLYPH_LIBRARY: { name: string; glyph: GlyphName }[] = [
  { name: '手', glyph: 'shou' },
  { name: '田', glyph: 'tian' },
  { name: '水', glyph: 'shui' },
  { name: '口', glyph: 'kou' },
  { name: '廿', glyph: 'nian' },
  { name: '卜', glyph: 'bu' },
  { name: '山', glyph: 'shan' },
  { name: '戈', glyph: 'ge' },
  { name: '人', glyph: 'ren' },
  { name: '心', glyph: 'xin' },
  { name: '日', glyph: 'ri' },
  { name: '尸', glyph: 'shi' },
  { name: '木', glyph: 'mu' },
  { name: '火', glyph: 'huo' },
  { name: '土', glyph: 'tu' },
  { name: '竹', glyph: 'zhu' },
  { name: '大', glyph: 'da' },
  { name: '中', glyph: 'zhong' },
  { name: '金', glyph: 'jin' },
  { name: '女', glyph: 'nu' },
  { name: '月', glyph: 'yue' },
  { name: '弓', glyph: 'gong' },
  { name: '一', glyph: 'heng' },
  { name: '丨', glyph: 'shu' },
  { name: '丿', glyph: 'pie' },
  { name: '㇏', glyph: 'na' },
  { name: '㇔', glyph: 'dian' },
  { name: '𠃋', glyph: 'ti' },
];


let ai: GoogleGenAI | null = null;

try {
} catch (error) {
  console.warn('Failed to initialize Google GenAI:', error);
}

const glyphNames = GLYPH_LIBRARY.map(g => g.glyph);

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        layouts: {
            type: Type.ARRAY,
            description: "An array of 3 distinct layout proposals for the seal.",
            items: {
                type: Type.OBJECT,
                properties: {
                    description: {
                        type: Type.STRING,
                        description: "A brief, artistic description of the visual style (e.g., 'A minimalist cat using strokes for its form.', 'A house shape built from radicals.').",
                    },
                    elements: {
                        type: Type.ARRAY,
                        description: "The array of graphical elements that compose the design. Use at least 5 glyphs, but feel free to use more to create a detailed shape.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                glyph: {
                                    type: Type.STRING,
                                    enum: glyphNames,
                                    description: "The name of the glyph or stroke to use."
                                },
                                x: {
                                    type: Type.NUMBER,
                                    description: "The x-coordinate for the center of the element on a 300x300 canvas."
                                },
                                y: {
                                    type: Type.NUMBER,
                                    description: "The y-coordinate for the center of the element on a 300x300 canvas."
                                },
                                scale: {
                                    type: Type.NUMBER,
                                    description: "The scale of the element. 1 is normal size."
                                },
                                rotation: {
                                    type: Type.NUMBER,
                                    description: "The rotation in degrees."
                                },
                                fontWeight: {
                                    type: Type.NUMBER,
                                    description: "The font weight from 100 to 900. Use different weights to create visual hierarchy and contrast."
                                },
                                isMirror: {
                                    type: Type.BOOLEAN,
                                    description: "Whether to flip the glyph horizontally (mirror/reflect across the Y-axis). Use this to create symmetry or achieve directional effects. Optional, defaults to false."
                                }
                            },
                            required: ["glyph", "x", "y", "scale", "rotation", "fontWeight"]
                        }
                    }
                },
                required: ["description", "elements"]
            }
        }
    },
    required: ["layouts"]
};

export const generateDrafts = async (prompt: string, craftName: string = 'Letterpress', mode: 'concept' | 'literal' = 'concept'): Promise<AiLayout[]> => {
    console.log('=== AI Image Generation Prompt ===');
    console.log('Craft:', craftName);
    console.log('Mode:', mode);
    console.log('Full Model Prompt:');
    console.log(prompt);
    console.log('===================================');

    try {
        // Use backend API instead of calling Gemini directly
        if (USE_BACKEND_API) {
            const response = await fetch(`${API_BASE_URL}/api/ai/generate-text-lab-layouts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    craftName,
                    userInput: prompt,
                    mode,
                }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Failed to generate layouts' }));
                console.error('Backend API error:', error);
                throw new Error(error.message || 'Failed to generate drafts from the AI.');
            }

            const responseJson = await response.json();
            
            if (import.meta.env.MODE !== 'production') {
                console.log('[Text Lab - Backend Response] Layouts:', responseJson?.layouts?.length || 0);
            }

            if (!responseJson.layouts || responseJson.layouts.length === 0) {
                throw new Error('No layouts returned from backend');
            }

            return responseJson.layouts as AiLayout[];
        }
    } catch (error) {
        console.error("Error calling backend API:", error);
        console.error(error);
        throw new Error('Failed to generate drafts from the AI.');
    }

    // Fallback to mock data if backend fails
    if (!ai) {
        console.warn('Google GenAI not initialized, returning mock data');
        // Return hardcoded samples for demo
        const lowerPrompt = prompt.toLowerCase().trim();
        
        // Cat example
        if (lowerPrompt.includes('cat') || lowerPrompt.includes('猫') || lowerPrompt.includes('貓')) {
            return [{
                description: "A playful cat with arched back and expressive details",
                elements: [
                    { glyph: 'dian', x: 113, y: 96, scale: 0.93, rotation: -80, fontWeight: 600 },
                    { glyph: 'gong', x: 161, y: 161, scale: 1.90, rotation: -66, fontWeight: 600 },
                    { glyph: 'pie', x: 140, y: 55, scale: 0.92, rotation: -45, fontWeight: 500 },
                    { glyph: 'na', x: 114, y: 59, scale: 0.90, rotation: 74, fontWeight: 500 },
                    { glyph: 'dian', x: 64, y: 100, scale: 0.84, rotation: 64, fontWeight: 600, isMirror: true },
                    { glyph: 'pie', x: 230, y: 140, scale: 1.00, rotation: 209, fontWeight: 900 },
                    { glyph: 'pie', x: 55, y: 59, scale: 0.92, rotation: -61, fontWeight: 500 },
                    { glyph: 'na', x: 39, y: 68, scale: 0.90, rotation: 51, fontWeight: 500 },
                    { glyph: 'nian', x: 91, y: 125, scale: 0.78, rotation: -5, fontWeight: 800 }
                ]
            }];
        }
        
        // Hong Kong example
        if (lowerPrompt.includes('香港') || lowerPrompt.includes('hong kong') || lowerPrompt.includes('hongkong')) {
            return [{
                description: "Hong Kong skyline with harbor represented by architectural elements",
                elements: [
                    { glyph: 'heng', x: 147, y: 239, scale: 4.42, rotation: 0, fontWeight: 100 },
                    { glyph: 'shan', x: 97, y: 207, scale: 1.86, rotation: 180, fontWeight: 700 },
                    { glyph: 'kou', x: 147, y: 212, scale: 1.40, rotation: 0, fontWeight: 900 },
                    { glyph: 'kou', x: 82, y: 217, scale: 1.17, rotation: 0, fontWeight: 900 },
                    { glyph: 'shan', x: 125, y: 184, scale: 1.63, rotation: 180, fontWeight: 500 },
                    { glyph: 'ri', x: 212, y: 132, scale: 1, rotation: 0, fontWeight: 900 }
                ]
            }];
        }
        
        // Heart example
        if (lowerPrompt.includes('❤️') || lowerPrompt.includes('heart') || lowerPrompt.includes('爱') || lowerPrompt.includes('愛') || lowerPrompt.includes('♥')) {
            return [{
                description: "A symmetrical heart shape with curved strokes and balanced composition",
                elements: [
                    { glyph: 'pie', x: 127, y: 206, scale: 2.55, rotation: 130, fontWeight: 300 },
                    { glyph: 'pie', x: 189, y: 208, scale: 2.55, rotation: -122, fontWeight: 300, isMirror: true },
                    { glyph: 'dian', x: 143, y: 132, scale: 1.42, rotation: 0, fontWeight: 300 },
                    { glyph: 'dian', x: 179, y: 132, scale: 1.42, rotation: 0, fontWeight: 300, isMirror: true },
                    { glyph: 'na', x: 206, y: 137, scale: 1, rotation: 174, fontWeight: 500 },
                    { glyph: 'na', x: 114, y: 136, scale: 1, rotation: 185, fontWeight: 500, isMirror: true },
                    { glyph: 'xin', x: 158, y: 173, scale: 1, rotation: 5, fontWeight: 900 }
                ]
            }];
        }
        
        // Default fallback samples
        return [
            {
                description: `Minimalist design of "${prompt}"`,
                elements: [
                    { glyph: 'zhong', x: 150, y: 150, scale: 1.2, rotation: 0, fontWeight: 900 },
                    { glyph: 'heng', x: 150, y: 120, scale: 0.8, rotation: 0, fontWeight: 700 },
                    { glyph: 'shu', x: 120, y: 150, scale: 0.8, rotation: 0, fontWeight: 700 },
                    { glyph: 'dian', x: 180, y: 150, scale: 0.6, rotation: 0, fontWeight: 500 },
                    { glyph: 'dian', x: 150, y: 180, scale: 0.6, rotation: 0, fontWeight: 500 },
                ]
            },
            {
                description: `Dynamic composition of "${prompt}"`,
                elements: [
                    { glyph: 'shan', x: 140, y: 140, scale: 1.0, rotation: 15, fontWeight: 800 },
                    { glyph: 'shui', x: 160, y: 160, scale: 1.1, rotation: -10, fontWeight: 900 },
                    { glyph: 'huo', x: 150, y: 120, scale: 0.9, rotation: 30, fontWeight: 600 },
                    { glyph: 'tu', x: 130, y: 170, scale: 0.8, rotation: 45, fontWeight: 700 },
                    { glyph: 'jin', x: 170, y: 130, scale: 0.7, rotation: -30, fontWeight: 500 },
                ]
            },
            {
                description: `Symmetrical design of "${prompt}" with mirroring`,
                elements: [
                    { glyph: 'da', x: 150, y: 130, scale: 1.3, rotation: 0, fontWeight: 900 },
                    { glyph: 'xin', x: 150, y: 170, scale: 1.0, rotation: 0, fontWeight: 800 },
                    { glyph: 'pie', x: 120, y: 200, scale: 0.8, rotation: 0, fontWeight: 600 },
                    { glyph: 'pie', x: 180, y: 200, scale: 0.8, rotation: 0, fontWeight: 600, isMirror: true },
                    { glyph: 'heng', x: 150, y: 100, scale: 0.9, rotation: 0, fontWeight: 700 },
                    { glyph: 'dian', x: 130, y: 150, scale: 0.6, rotation: 0, fontWeight: 500 },
                    { glyph: 'dian', x: 170, y: 150, scale: 0.6, rotation: 0, fontWeight: 500 },
                ]
            }
        ];
    }

    try {
        const systemInstruction = `You are a creative visual artist specializing in typography art. Your task is to create a visual representation of a user's concept by arranging a set of predefined Chinese radicals and strokes on a canvas. Your goal is to form a recognizable shape or silhouette of the concept, not to create a new, valid Chinese character.

Follow these steps meticulously:

1.  **Visualize the Concept**: Imagine the user's prompt (e.g., 'Dragon', '香港', '❤️', 'a running cat') as a simple, iconic shape.

2.  **Select Glyphs as Building Blocks**: You have a limited palette of Chinese radicals and strokes. Think of them as your "ink" or "pixels". Select a variety of these glyphs to use as building blocks for your artwork. You can use a glyph multiple times. You are REQUIRED to use at least 5 glyphs for each design, but feel free to use more. A design with fewer than 5 glyphs is an invalid response.

3.  **Arrange Glyphs to Form the Shape (VERY IMPORTANT)**:
    *   **Canvas**: The canvas is a 300x300 grid. The main drawing area is the central 200x200 box (from x=50 to x=250, y=50 to y=250). All coordinates are for the element's CENTER.
    *   **Placement**: Place the selected glyphs on the canvas. Use their 'x' and 'y' coordinates to position them.
    *   **Transformation**: Use 'scale' to make glyphs larger or smaller, and 'rotation' to orient them correctly to fit the contours of the shape you are creating. For example, you might rotate the 'heng' (一) stroke to form lines at different angles, or scale up a 'kou' (口) to be an outline.
    *   **Mirror**: Use 'isMirror' (set to true) to flip a glyph horizontally. This is useful for creating symmetrical designs or achieving directional effects. For example, you can mirror the 'pie' (丿) stroke to create both left and right diagonal strokes, or mirror radicals to create balanced compositions.
    *   **Font Weight**: Use 'fontWeight' (100-900) to create visual hierarchy and emphasis. Use heavier weights (700-900) for main structural elements, medium weights (400-600) for supporting elements, and lighter weights (100-300) for subtle details.

4.  **Create 3 Distinct Variations**: Generate three different artistic interpretations of the same concept. They should differ in their composition, glyph choice, or style (e.g., one formal, one literal, one simple). AVOID making it too abstract.

5.  **Describe the Artwork**: For each layout, provide a brief description of what you were trying to depict and how the glyphs were used to achieve the visual effect. For example: "A minimalist representation of a cat, using the 'gong' (弓) glyph for its arched back and 'dian' (㇔) for its eyes."

EXAMPLE OUTPUTS for reference (study these to understand how to create effective compositions):

Example 1 - 香港 (Hong Kong):
{
  "description": "Hong Kong skyline with harbor represented by architectural elements",
  "elements": [
    { "glyph": "heng", "x": 147, "y": 239, "scale": 4.42, "rotation": 0, "fontWeight": 100 },
    { "glyph": "shan", "x": 97, "y": 207, "scale": 1.86, "rotation": 180, "fontWeight": 700 },
    { "glyph": "kou", "x": 147, "y": 212, "scale": 1.40, "rotation": 0, "fontWeight": 900 },
    { "glyph": "kou", "x": 82, "y": 217, "scale": 1.17, "rotation": 0, "fontWeight": 900 },
    { "glyph": "shan", "x": 125, "y": 184, "scale": 1.63, "rotation": 180, "fontWeight": 500 },
    { "glyph": "ri", "x": 212, "y": 132, "scale": 1, "rotation": 0, "fontWeight": 900 }
  ]
}

Example 2 - ❤️ (Heart):
{
  "description": "A symmetrical heart shape with curved strokes and balanced composition",
  "elements": [
    { "glyph": "pie", "x": 127, "y": 206, "scale": 2.55, "rotation": 130, "fontWeight": 300 },
    { "glyph": "pie", "x": 189, "y": 208, "scale": 2.55, "rotation": -122, "fontWeight": 300, "isMirror": true },
    { "glyph": "dian", "x": 143, "y": 132, "scale": 1.42, "rotation": 0, "fontWeight": 300 },
    { "glyph": "dian", "x": 179, "y": 132, "scale": 1.42, "rotation": 0, "fontWeight": 300, "isMirror": true },
    { "glyph": "na", "x": 206, "y": 137, "scale": 1, "rotation": 174, "fontWeight": 500 },
    { "glyph": "na", "x": 114, "y": 136, "scale": 1, "rotation": 185, "fontWeight": 500, "isMirror": true },
    { "glyph": "xin", "x": 158, "y": 173, "scale": 1, "rotation": 5, "fontWeight": 900 }
  ]
}

Now create 3 unique variations for the user's concept, using similar creative techniques. AVOID making it too abstract.`;
        
        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Generate layouts for the concept: "${prompt}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = result.text.trim();
        
        // Debug: Print raw JSON response in dev mode
        if (import.meta.env.MODE !== 'production') {
            console.log('[Text Lab - Gemini Response] Raw JSON:', jsonText);
        }
        
        const responseJson = JSON.parse(jsonText);

        // Debug: Print parsed response in dev mode
        if (import.meta.env.MODE !== 'production') {
            console.log('[Text Lab - Gemini Response] Parsed JSON:', JSON.stringify(responseJson, null, 2));
            console.log('[Text Lab - Gemini Response] Number of layouts:', responseJson?.layouts?.length || 0);
        }

        if (responseJson && Array.isArray(responseJson.layouts)) {
            let layouts = responseJson.layouts;
            
            // Check if prompt matches hardcoded examples and inject them
            const lowerPrompt = prompt.toLowerCase().trim();
            let hardcodedExample: AiLayout | null = null;
            
            // Cat example
            if (lowerPrompt.includes('cat') || lowerPrompt.includes('猫')) {
                hardcodedExample = {
                    description: "A playful cat with arched back and expressive details",
                    elements: [
                        { glyph: 'dian', x: 113, y: 96, scale: 0.93, rotation: -80, fontWeight: 600 },
                        { glyph: 'gong', x: 161, y: 161, scale: 1.90, rotation: -66, fontWeight: 600 },
                        { glyph: 'pie', x: 140, y: 55, scale: 0.92, rotation: -45, fontWeight: 500 },
                        { glyph: 'na', x: 114, y: 59, scale: 0.90, rotation: 74, fontWeight: 500 },
                        { glyph: 'dian', x: 64, y: 100, scale: 0.84, rotation: 64, fontWeight: 600, isMirror: true },
                        { glyph: 'pie', x: 230, y: 140, scale: 1.00, rotation: 209, fontWeight: 900 },
                        { glyph: 'pie', x: 55, y: 59, scale: 0.92, rotation: -61, fontWeight: 500 },
                        { glyph: 'na', x: 39, y: 68, scale: 0.90, rotation: 51, fontWeight: 500 },
                        { glyph: 'nian', x: 91, y: 125, scale: 0.78, rotation: -5, fontWeight: 800 }
                    ]
                };
            }
            // Hong Kong example
            else if (lowerPrompt.includes('香港') || lowerPrompt.includes('hong kong') || lowerPrompt.includes('hongkong')) {
                hardcodedExample = {
                    description: "Hong Kong skyline with harbor represented by architectural elements",
                    elements: [
                        { glyph: 'heng', x: 147, y: 239, scale: 4.42, rotation: 0, fontWeight: 100 },
                        { glyph: 'shan', x: 97, y: 207, scale: 1.86, rotation: 180, fontWeight: 700 },
                        { glyph: 'kou', x: 147, y: 212, scale: 1.40, rotation: 0, fontWeight: 900 },
                        { glyph: 'kou', x: 82, y: 217, scale: 1.17, rotation: 0, fontWeight: 900 },
                        { glyph: 'shan', x: 125, y: 184, scale: 1.63, rotation: 180, fontWeight: 500 },
                        { glyph: 'ri', x: 212, y: 132, scale: 1, rotation: 0, fontWeight: 900 }
                    ]
                };
            }
            // Heart example
            else if (lowerPrompt.includes('❤️') || lowerPrompt.includes('heart') || lowerPrompt.includes('爱') || lowerPrompt.includes('♥')) {
                hardcodedExample = {
                    description: "A symmetrical heart shape with curved strokes and balanced composition",
                    elements: [
                        { glyph: 'pie', x: 127, y: 206, scale: 2.55, rotation: 130, fontWeight: 300 },
                        { glyph: 'pie', x: 189, y: 208, scale: 2.55, rotation: -122, fontWeight: 300, isMirror: true },
                        { glyph: 'dian', x: 143, y: 132, scale: 1.42, rotation: 0, fontWeight: 300 },
                        { glyph: 'dian', x: 179, y: 132, scale: 1.42, rotation: 0, fontWeight: 300, isMirror: true },
                        { glyph: 'na', x: 206, y: 137, scale: 1, rotation: 174, fontWeight: 500 },
                        { glyph: 'na', x: 114, y: 136, scale: 1, rotation: 185, fontWeight: 500, isMirror: true },
                        { glyph: 'xin', x: 158, y: 173, scale: 1, rotation: 5, fontWeight: 900 }
                    ]
                };
            }
            
            // If we have a hardcoded example, replace the first AI-generated layout with it
            if (hardcodedExample && layouts.length > 0) {
                layouts[0] = hardcodedExample;
            }
            
            return layouts;
        }

        console.error("Parsed response is not in the expected format:", responseJson);
        return [];

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate drafts from the AI.");
    }
};