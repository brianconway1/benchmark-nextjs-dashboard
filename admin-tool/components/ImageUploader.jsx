// components/ImageUploader.jsx
// Image upload component with preview and progress

import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export default function ImageUploader({
  value, // Current image URL
  externalPreview, // External preview URL (e.g., from auto-generated thumbnail)
  onChange, // Callback when file selected (receives File)
  onClear, // Callback to clear the image
  uploading = false,
  progress = 0,
  label = 'Image',
  accept = 'image/*',
  className = '',
  helperText, // Optional helper text to show below the image
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Pass file to parent
    onChange(file);
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onClear?.();
  };

  // Priority: local preview > external preview > saved value
  const displayUrl = previewUrl || externalPreview || value;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {displayUrl ? (
        <div className="relative">
          <img
            src={displayUrl}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <div className="text-lg font-semibold">{progress}%</div>
                <div className="text-sm">Uploading...</div>
              </div>
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Click to upload an image</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {displayUrl && !uploading && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Replace image
          </button>
          {helperText && (
            <span className="text-xs text-green-600">{helperText}</span>
          )}
        </div>
      )}
    </div>
  );
}
