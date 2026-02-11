// components/VideoUploader.jsx
// Video upload component with preview, progress, and optional compression

import React, { useRef, useState } from 'react';
import { Upload, X, Video, Play, Link, Loader2, Zap } from 'lucide-react';
import { extractYouTubeVideoId, getYouTubeThumbnail } from '../lib/storageService';
import { compressVideo, getVideoMetadata, needsCompression, formatFileSize } from '../lib/videoCompression';

export default function VideoUploader({
  value, // Current video URL
  youtubeUrl, // YouTube URL if using YouTube
  onChange, // Callback when file selected (receives File)
  onYouTubeChange, // Callback when YouTube URL changes
  onClear, // Callback to clear the video
  uploading = false,
  progress = 0,
  label = 'Video',
  accept = 'video/*',
  allowYouTube = true,
  enableCompression = false, // Enable video compression for masterclass videos
  className = '',
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mode, setMode] = useState(youtubeUrl ? 'youtube' : 'upload'); // 'upload' or 'youtube'
  const [youtubeInput, setYoutubeInput] = useState(youtubeUrl || '');

  // Compression state
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState('');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [originalFile, setOriginalFile] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL immediately
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setOriginalFile(file);

    // If compression is enabled, check if needed and compress
    if (enableCompression) {
      try {
        setIsCompressing(true);
        setCompressionStatus('Analyzing video...');
        setCompressionProgress(0);

        const metadata = await getVideoMetadata(file);

        if (needsCompression(file, metadata)) {
          setCompressionStatus(`Video is ${formatFileSize(file.size)} at ${metadata.height}p - compressing to 720p...`);

          const compressedFile = await compressVideo(file, {
            onLoadProgress: (p) => {
              setCompressionStatus('Loading video processor...');
              setCompressionProgress(Math.round(p * 0.1)); // 0-10%
            },
            onCompressProgress: (p) => {
              setCompressionProgress(10 + Math.round(p * 0.9)); // 10-100%
            },
            onStatusChange: setCompressionStatus,
          });

          // Update preview with compressed file
          URL.revokeObjectURL(url);
          const compressedUrl = URL.createObjectURL(compressedFile);
          setPreviewUrl(compressedUrl);

          // Pass compressed file to parent
          onChange(compressedFile);
        } else {
          setCompressionStatus(`Video already optimized (${formatFileSize(file.size)} at ${metadata.height}p)`);
          // Pass original file
          onChange(file);
        }
      } catch (error) {
        console.error('Compression failed:', error);
        setCompressionStatus(`Compression failed - using original file`);
        // Show detailed error in console but simpler message to user
        console.error('Full compression error:', error.stack || error);
        alert(`Video compression failed. The original file will be uploaded instead.\n\nIf this keeps happening, try:\n1. Refreshing the page\n2. Using a different browser (Chrome works best)\n3. Converting .mov to .mp4 before uploading`);
        // Fall back to original file
        onChange(file);
      } finally {
        setIsCompressing(false);
        // Clear status after a delay
        setTimeout(() => setCompressionStatus(''), 5000);
      }
    } else {
      // No compression, just pass file directly
      onChange(file);
    }
  };

  const handleYouTubeSubmit = () => {
    const videoId = extractYouTubeVideoId(youtubeInput);
    if (videoId) {
      onYouTubeChange?.(youtubeInput, videoId);
    }
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setYoutubeInput('');
    setOriginalFile(null);
    setCompressionStatus('');
    setCompressionProgress(0);
    onClear?.();
  };

  const displayUrl = previewUrl || value;
  const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {enableCompression && (
          <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
            <Zap size={12} />
            Auto-compress to 720p
          </span>
        )}
      </div>

      {/* Mode Toggle */}
      {allowYouTube && !displayUrl && !youtubeVideoId && !isCompressing && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              mode === 'upload'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Upload size={16} className="inline mr-2" />
            Upload Video
          </button>
          <button
            type="button"
            onClick={() => setMode('youtube')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              mode === 'youtube'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Link size={16} className="inline mr-2" />
            YouTube Link
          </button>
        </div>
      )}

      {/* YouTube Input */}
      {mode === 'youtube' && allowYouTube && !displayUrl && !youtubeVideoId && (
        <div className="space-y-2">
          <input
            type="text"
            value={youtubeInput}
            onChange={(e) => setYoutubeInput(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleYouTubeSubmit}
            disabled={!youtubeInput}
            className="w-full py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add YouTube Video
          </button>
        </div>
      )}

      {/* YouTube Preview */}
      {youtubeVideoId && (
        <div className="relative">
          <img
            src={getYouTubeThumbnail(youtubeVideoId)}
            alt="YouTube thumbnail"
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <Play size={32} className="text-white ml-1" fill="white" />
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            YouTube
          </div>
        </div>
      )}

      {/* Video Upload - show if not using YouTube */}
      {!youtubeVideoId && (
        <>
          {/* Compression in progress */}
          {isCompressing && (
            <div className="border border-purple-200 bg-purple-50 rounded-lg p-6 text-center">
              <Loader2 size={32} className="animate-spin text-purple-600 mx-auto mb-3" />
              <div className="text-sm font-medium text-purple-900 mb-2">
                Compressing Video
              </div>
              <div className="text-xs text-purple-700 mb-3">
                {compressionStatus}
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${compressionProgress}%` }}
                />
              </div>
              <div className="text-xs text-purple-600 mt-2">
                {compressionProgress}% complete
              </div>
            </div>
          )}

          {/* Video preview - show existing video or newly selected video */}
          {displayUrl && !isCompressing ? (
            <div className="relative">
              <video
                src={displayUrl}
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
                controls={!uploading}
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-white text-center">
                    <div className="text-lg font-semibold">{progress}%</div>
                    <div className="text-sm">Uploading...</div>
                    <div className="w-48 bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {!uploading && !isCompressing && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                >
                  <X size={16} />
                </button>
              )}
              {/* Compression status badge */}
              {compressionStatus && !uploading && (
                <div className="absolute bottom-2 left-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded max-w-[80%] truncate">
                  {compressionStatus}
                </div>
              )}
            </div>
          ) : !isCompressing && mode === 'upload' && (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <Video className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">Click to upload a video</p>
              <p className="text-xs text-gray-400 mt-1">
                MP4, MOV, WebM
                {enableCompression && ' - Will be compressed to 720p'}
              </p>
            </div>
          )}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isCompressing}
      />

      {displayUrl && !uploading && !youtubeVideoId && !isCompressing && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Replace video
        </button>
      )}
    </div>
  );
}
