// components/ThumbnailPicker.jsx
// Allows user to scrub through a video and pick a frame as thumbnail

import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCcw } from 'lucide-react';

export default function ThumbnailPicker({
  videoFile, // The video File object
  videoUrl, // Or an existing video URL
  onCapture, // Callback with captured thumbnail File
  onClose, // Callback to close the picker
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);

  // Create object URL for video file
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (videoUrl) {
      setPreviewUrl(videoUrl);
    }
  }, [videoFile, videoUrl]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      // Start at 25% into the video
      const startTime = videoRef.current.duration * 0.25;
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Show preview
    const previewDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPreview(previewDataUrl);

    // Convert to File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const thumbnailFile = new File(
            [blob],
            'thumbnail.jpg',
            { type: 'image/jpeg' }
          );
          onCapture(thumbnailFile);
        }
      },
      'image/jpeg',
      0.8
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetCapture = () => {
    setCapturedPreview(null);
  };

  if (!previewUrl) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Choose Thumbnail</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Video Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={previewUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              className="w-full max-h-[300px] object-contain"
              muted
              playsInline
            />
          </div>

          {/* Scrubber */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Capture Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={captureFrame}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Camera size={20} />
              Capture This Frame
            </button>
            {capturedPreview && (
              <button
                onClick={resetCapture}
                className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset"
              >
                <RotateCcw size={20} />
              </button>
            )}
          </div>

          {/* Captured Preview */}
          {capturedPreview && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Captured Thumbnail:</p>
              <div className="relative">
                <img
                  src={capturedPreview}
                  alt="Captured thumbnail"
                  className="w-full max-h-[150px] object-contain rounded-lg border border-gray-200"
                />
                <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  Saved
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <p className="text-xs text-gray-500 text-center">
            Drag the slider to find the perfect frame, then click "Capture This Frame"
          </p>
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
