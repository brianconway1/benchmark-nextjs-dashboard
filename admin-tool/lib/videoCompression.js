// lib/videoCompression.js
// Video compression utility using FFmpeg.wasm
// Compresses videos to 720p at 2-4 Mbps for faster loading

// FFmpeg imports are optional - compression will be disabled if not installed
let FFmpeg = null;
let fetchFile = null;
let ffmpeg = null;
let ffmpegLoaded = false;
let ffmpegAvailable = null; // null = not checked, true/false = checked

async function checkFFmpegAvailable() {
  if (ffmpegAvailable !== null) return ffmpegAvailable;

  try {
    const ffmpegModule = await import('@ffmpeg/ffmpeg');
    const utilModule = await import('@ffmpeg/util');
    FFmpeg = ffmpegModule.FFmpeg;
    fetchFile = utilModule.fetchFile;
    ffmpegAvailable = true;
    return true;
  } catch (e) {
    console.warn('FFmpeg not available - video compression disabled. Install @ffmpeg/ffmpeg and @ffmpeg/util to enable.');
    ffmpegAvailable = false;
    return false;
  }
}

/**
 * Load FFmpeg WASM (only loads once)
 * @param {function} onProgress - Progress callback for loading
 * @returns {Promise<FFmpeg>}
 */
async function loadFFmpeg(onProgress = () => {}) {
  const isAvailable = await checkFFmpegAvailable();
  if (!isAvailable) {
    throw new Error('FFmpeg is not installed. Install @ffmpeg/ffmpeg and @ffmpeg/util to enable video compression.');
  }

  if (ffmpegLoaded && ffmpeg) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  // Listen to progress events
  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.round(progress * 100));
  });

  // Log loading for debugging
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  // Try multiple CDN sources in case one fails
  const cdnSources = [
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
    'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
  ];

  for (let i = 0; i < cdnSources.length; i++) {
    const baseURL = cdnSources[i];
    try {
      console.log(`Loading FFmpeg from: ${baseURL} (attempt ${i + 1}/${cdnSources.length})`);

      // Fetch with timeout to avoid hanging
      const fetchWithTimeout = async (url, mimeType) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const blob = await response.blob();
          clearTimeout(timeout);
          return URL.createObjectURL(new Blob([blob], { type: mimeType }));
        } catch (err) {
          clearTimeout(timeout);
          throw err;
        }
      };

      const coreURL = await fetchWithTimeout(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      console.log('FFmpeg core.js loaded');

      const wasmURL = await fetchWithTimeout(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      console.log('FFmpeg core.wasm loaded');

      await ffmpeg.load({ coreURL, wasmURL });

      ffmpegLoaded = true;
      console.log('FFmpeg loaded successfully');
      return ffmpeg;
    } catch (error) {
      console.error(`Failed to load FFmpeg from ${baseURL}:`, error);
      if (i === cdnSources.length - 1) {
        // Last attempt failed
        throw new Error(`FFmpeg failed to load after trying all CDN sources. Last error: ${error.message}`);
      }
      console.log('Trying next CDN source...');
    }
  }

  throw new Error('FFmpeg failed to load from all CDN sources');
}

/**
 * Get video metadata (duration, resolution)
 * @param {File} file - Video file
 * @returns {Promise<{duration: number, width: number, height: number}>}
 */
export function getVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Check if video needs compression
 * @param {File} file - Video file
 * @param {Object} metadata - Video metadata
 * @returns {boolean}
 */
export function needsCompression(file, metadata) {
  // If ffmpeg is known to be unavailable, never suggest compression
  if (ffmpegAvailable === false) {
    return false;
  }

  // Compress if:
  // - File is larger than 10MB (target ~2-4 Mbps means ~15-30MB/min)
  // - Resolution is higher than 720p
  const fileSizeMB = file.size / (1024 * 1024);
  const isHighRes = metadata.height > 720;
  const isLargeFile = fileSizeMB > 10;

  return isHighRes || isLargeFile;
}

/**
 * Compress video to 720p at 2-4 Mbps
 * @param {File} file - Video file to compress
 * @param {Object} options - Compression options
 * @param {function} options.onLoadProgress - FFmpeg loading progress (0-100)
 * @param {function} options.onCompressProgress - Compression progress (0-100)
 * @param {function} options.onStatusChange - Status message callback
 * @returns {Promise<File>} - Compressed video file
 */
export async function compressVideo(file, options = {}) {
  const {
    onLoadProgress = () => {},
    onCompressProgress = () => {},
    onStatusChange = () => {},
  } = options;

  try {
    // Check if FFmpeg is available
    const isAvailable = await checkFFmpegAvailable();
    if (!isAvailable) {
      onStatusChange('Compression unavailable - using original video');
      return file;
    }

    // Get video metadata first
    onStatusChange('Analyzing video...');
    const metadata = await getVideoMetadata(file);

    // Check if compression is needed
    if (!needsCompression(file, metadata)) {
      onStatusChange('Video already optimized');
      return file; // Return original if already small enough
    }

    // Load FFmpeg
    onStatusChange('Loading video processor...');
    const ffmpegInstance = await loadFFmpeg(onLoadProgress);

    // Write input file to FFmpeg's virtual filesystem
    onStatusChange('Preparing video...');
    const inputFileName = 'input' + getFileExtension(file.name);
    const outputFileName = 'output.mp4';

    await ffmpegInstance.writeFile(inputFileName, await fetchFile(file));

    // Calculate target bitrate (aim for 2 Mbps for good mobile streaming)
    // ~2 Mbps = ~15 MB per minute = ~9 MB for 35 seconds
    const durationMinutes = metadata.duration / 60;
    let videoBitrate = '2000k'; // Default 2 Mbps

    if (durationMinutes < 1) {
      videoBitrate = '2500k'; // 2.5 Mbps for very short videos (< 1 min)
    } else if (durationMinutes > 5) {
      videoBitrate = '1500k'; // 1.5 Mbps for longer videos (> 5 min)
    }

    // Set up progress tracking
    ffmpegInstance.on('progress', ({ progress }) => {
      onCompressProgress(Math.round(progress * 100));
    });

    // Compress video using ABR (average bitrate) mode for predictable file sizes
    // -vf scale=-2:720 = Scale to 720p height, auto-calculate width (keeping aspect ratio, divisible by 2)
    // -c:v libx264 = Use H.264 codec (widely compatible)
    // -preset slow = Better compression (slower but smaller files)
    // -b:v = Target average video bitrate (no CRF = strict bitrate control)
    // -maxrate = Maximum bitrate (1.5x average for peaks)
    // -bufsize = Buffer size for rate control
    // -c:a aac = AAC audio codec
    // -b:a 96k = Audio bitrate (96k is fine for speech/coaching)
    // -movflags +faststart = Move metadata to start for faster streaming
    onStatusChange('Compressing video (this may take a few minutes)...');

    const maxRate = parseInt(videoBitrate) * 1.5 + 'k';

    await ffmpegInstance.exec([
      '-i', inputFileName,
      '-vf', 'scale=-2:720',
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-b:v', videoBitrate,
      '-maxrate', maxRate,
      '-bufsize', '4000k',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-movflags', '+faststart',
      '-y',
      outputFileName
    ]);

    // Read the output file
    onStatusChange('Finalizing...');
    const data = await ffmpegInstance.readFile(outputFileName);

    // Clean up
    await ffmpegInstance.deleteFile(inputFileName);
    await ffmpegInstance.deleteFile(outputFileName);

    // Create new File object
    const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });
    const compressedFile = new File(
      [compressedBlob],
      file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
      { type: 'video/mp4' }
    );

    // Log compression stats
    const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
    const reduction = (((file.size - compressedFile.size) / file.size) * 100).toFixed(1);

    console.log(`Video compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${reduction}% reduction)`);
    onStatusChange(`Compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${reduction}% smaller)`);

    return compressedFile;
  } catch (error) {
    console.error('Video compression error:', error);
    throw new Error('Failed to compress video: ' + error.message);
  }
}

/**
 * Get file extension from filename
 * @param {string} filename
 * @returns {string}
 */
function getFileExtension(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? `.${ext}` : '.mp4';
}

/**
 * Format file size for display
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Generate a thumbnail image from a video file
 * Captures a frame at 25% into the video (avoids black intro/outro frames)
 * @param {File} videoFile - The video file
 * @param {Object} options - Options
 * @param {number} options.seekPercent - Percentage into video to capture (default: 0.25 = 25%)
 * @param {number} options.maxWidth - Max thumbnail width (default: 640)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
 * @returns {Promise<File>} - Thumbnail image as a File object
 */
export function generateVideoThumbnail(videoFile, options = {}) {
  const {
    seekPercent = 0.25, // 25% into the video - usually past any intro fade
    maxWidth = 640,
    quality = 0.8,
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'auto'; // Preload the video data
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const cleanup = () => {
      video.pause();
      video.src = '';
      video.load();
      URL.revokeObjectURL(video.src);
    };

    const captureFrame = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);

        // Check if the frame is mostly black (failed capture)
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let totalBrightness = 0;
        const sampleSize = Math.min(1000, (width * height));
        const step = Math.floor((width * height) / sampleSize);

        for (let i = 0; i < data.length; i += step * 4) {
          totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const avgBrightness = totalBrightness / sampleSize;

        // If too dark, the frame didn't render properly
        if (avgBrightness < 10) {
          console.warn('Captured frame is too dark, video may not have rendered');
        }

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              const thumbnailFile = new File(
                [blob],
                videoFile.name.replace(/\.[^/.]+$/, '_thumbnail.jpg'),
                { type: 'image/jpeg' }
              );
              resolve(thumbnailFile);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    video.onloadeddata = () => {
      // Seek to 25% into the video (or at least 3 seconds if video is long enough)
      const targetTime = Math.max(3, video.duration * seekPercent);
      // But don't go past 80% of the video
      video.currentTime = Math.min(targetTime, video.duration * 0.8);
    };

    video.onseeked = () => {
      // Play briefly to ensure frame renders, then capture
      video.play().then(() => {
        // Wait a tiny bit for the frame to actually render
        setTimeout(() => {
          video.pause();
          captureFrame();
        }, 100);
      }).catch(() => {
        // If autoplay blocked, try capturing anyway
        captureFrame();
      });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
}
