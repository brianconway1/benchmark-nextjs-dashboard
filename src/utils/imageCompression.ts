// Image compression utility
// Note: Requires browser-image-compression package
// Install with: npm install browser-image-compression

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType: string;
}

/**
 * Compress an image file
 * Note: This requires the browser-image-compression package
 * For now, this is a placeholder that returns the original file
 * Install: npm install browser-image-compression
 */
export const compressImage = async (file: File, options?: Partial<CompressionOptions>): Promise<File> => {
  // Default options
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 0.2, // 200KB max
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type,
  };

  const opts = { ...defaultOptions, ...options };

  try {
    // Dynamic import to avoid errors if package not installed
    const imageCompression = await import('browser-image-compression');
    const compressedFile = await imageCompression.default(file, opts);
    console.log(
      `Compressed: ${file.name} (${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB)`
    );
    return compressedFile;
  } catch (error) {
    console.warn('Image compression not available, using original file:', error);
    // Return original file if compression library not available
    return file;
  }
};

