
import { generateCraftImageApi, generateTryOnImageApi } from './apiService';

/**
 * Client-side function to request an image generation from the backend.
 * It no longer handles the API key or direct communication with the Gemini API.
 * @param craftName - The name of the craft (e.g., "Canton Porcelain").
 * @param userPrompt - The user's creative input.
 * @param referenceImageUrl - Optional reference image URL for context.
 * @returns A base64 encoded string of the generated JPEG image, fetched from our backend.
 */
export const generateCraftImage = async (
  craftName: string, 
  userPrompt: string,
  referenceImageUrl?: string
): Promise<string> => {
  try {
    // This now calls our secure backend function instead of the Gemini API directly.
    const imageUrl = await generateCraftImageApi(craftName, userPrompt, referenceImageUrl);
    return imageUrl;
  } catch (error) {
    console.error("Error fetching generated image from backend:", error);
    // Re-throw the error so the UI component can handle it.
    throw error;
  }
};

/**
 * Client-side function to request a try-on image generation from the backend.
 * @param craftName - The name of the craft (e.g., "Cheongsam").
 * @param faceImageUrl - The base64 data URL of the face image.
 * @param userPrompt - The user's styling preferences (optional).
 * @param existingCheongsamImageUrl - Optional existing cheongsam image from concept mode.
 * @returns A base64 encoded string of the generated try-on image.
 */
export const generateTryOnImage = async (
  craftName: string, 
  faceImageUrl: string, 
  userPrompt: string,
  existingCheongsamImageUrl?: string
): Promise<string> => {
  try {
    const imageUrl = await generateTryOnImageApi(craftName, faceImageUrl, userPrompt, existingCheongsamImageUrl);
    return imageUrl;
  } catch (error) {
    console.error("Error fetching generated try-on image from backend:", error);
    throw error;
  }
};
