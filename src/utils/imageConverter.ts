/**
 * Convert SVG data URL to PNG data URL
 */
export async function svgToPng(svgDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create image element
      const img = new Image();
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 1280;
        canvas.height = img.height || 720;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load SVG image'));
      };
      
      // Set SVG as source
      img.src = svgDataUrl;
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Ensure image is in a format supported by OpenAI Vision API
 */
export async function ensureOpenAICompatibleImage(dataUrl: string): Promise<string> {
  // Check format
  const formatMatch = dataUrl.match(/^data:image\/([^;]+);base64,/);
  if (!formatMatch) {
    throw new Error('Invalid data URL');
  }
  
  const format = formatMatch[1];
  
  // If it's SVG, convert to PNG
  if (format === 'svg+xml' || format === 'svg') {
    console.log('Converting SVG to PNG for OpenAI compatibility');
    return await svgToPng(dataUrl);
  }
  
  // Return as-is for supported formats
  const supportedFormats = ['png', 'jpeg', 'jpg', 'gif', 'webp'];
  if (supportedFormats.includes(format)) {
    return dataUrl;
  }
  
  throw new Error(`Unsupported image format: ${format}`);
}