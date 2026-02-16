// components/ExerciseModal.jsx
// Modal for creating/editing benchmark exercises

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Camera } from 'lucide-react';
import ImageUploader from './ImageUploader';
import VideoUploader from './VideoUploader';
import ThumbnailPicker from './ThumbnailPicker';
import {
  EXERCISE_CATEGORIES,
  SPORTS,
  PARAMETER_MODES,
  DEFAULT_EXERCISE_PARAMETERS,
  getDefaultExerciseData,
} from '../constants/exerciseOptions';
import {
  createBenchmarkExercise,
  updateBenchmarkExercise,
} from '../lib/exerciseService';
import {
  uploadExerciseImage,
  uploadExerciseVideo,
  extractYouTubeVideoId,
  getYouTubeThumbnail,
} from '../lib/storageService';
import { generateVideoThumbnail } from '../lib/videoCompression';

export default function ExerciseModal({
  isOpen,
  onClose,
  exercise = null, // If provided, we're editing
  onSaved, // Callback after save
}) {
  const isEditing = !!exercise?.id;

  const [formData, setFormData] = useState(getDefaultExerciseData());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // File upload state
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ image: 0, video: 0 });
  const [uploading, setUploading] = useState({ image: false, video: false });
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [showThumbnailPicker, setShowThumbnailPicker] = useState(false);

  // Initialize form when exercise changes
  useEffect(() => {
    if (exercise) {
      setFormData({
        title: exercise.title || '',
        description: exercise.description || '',
        sport: exercise.sport || '',
        category: Array.isArray(exercise.category) ? exercise.category : (exercise.category ? [exercise.category] : []),
        section: ['Gym'], // Always hardcoded
        image: exercise.image || null,
        video: exercise.video || null,
        videoThumbnail: exercise.videoThumbnail || null,
        youtubeUrl: exercise.youtubeUrl || '',
        youtubeVideoId: exercise.youtubeVideoId || '',
        recommendedParameters: exercise.recommendedParameters || { ...DEFAULT_EXERCISE_PARAMETERS },
      });
    } else {
      setFormData(getDefaultExerciseData());
    }
    setImageFile(null);
    setVideoFile(null);
    setUploadProgress({ image: 0, video: 0 });
    setUploading({ image: false, video: false });
    setError(null);
    setGeneratingThumbnail(false);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(null);
  }, [exercise, isOpen]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field, value) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const updateParameterMode = (mode) => {
    setFormData((prev) => ({
      ...prev,
      recommendedParameters: {
        ...prev.recommendedParameters,
        parameterMode: mode,
      },
    }));
  };

  const updateParameter = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      recommendedParameters: {
        ...prev.recommendedParameters,
        parameters: {
          ...prev.recommendedParameters?.parameters,
          [key]: value,
        },
      },
    }));
  };

  // Handle video file selection with automatic thumbnail generation
  const handleVideoChange = async (file) => {
    setVideoFile(file);

    // Auto-generate thumbnail if no image is set
    if (file && !formData.image && !imageFile) {
      try {
        setGeneratingThumbnail(true);
        const thumbnail = await generateVideoThumbnail(file);
        setImageFile(thumbnail);
        // Create preview URL for the thumbnail
        const previewUrl = URL.createObjectURL(thumbnail);
        setThumbnailPreview(previewUrl);
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
        // Not critical, continue without thumbnail
      } finally {
        setGeneratingThumbnail(false);
      }
    }
  };

  const handleYouTubeChange = (url, videoId) => {
    setFormData((prev) => ({
      ...prev,
      youtubeUrl: url,
      youtubeVideoId: videoId,
      video: null, // Clear uploaded video when using YouTube
    }));
    setVideoFile(null);

    // Auto-set thumbnail from YouTube if no image
    if (videoId && !formData.image && !imageFile) {
      const ytThumbnail = getYouTubeThumbnail(videoId);
      setFormData((prev) => ({ ...prev, image: ytThumbnail }));
    }
  };

  const clearVideo = () => {
    setFormData((prev) => ({
      ...prev,
      video: null,
      youtubeUrl: '',
      youtubeVideoId: '',
    }));
    setVideoFile(null);
  };

  const clearImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    setImageFile(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      let finalData = { ...formData };

      // Create or get exercise ID for file uploads
      let exerciseId = exercise?.id;

      if (!exerciseId) {
        // Create the exercise first to get an ID
        const created = await createBenchmarkExercise({
          ...finalData,
          image: null,
          video: null,
        });
        exerciseId = created.id;
      }

      // Upload image if new file selected
      if (imageFile) {
        setUploading((prev) => ({ ...prev, image: true }));
        const imageUrl = await uploadExerciseImage(imageFile, exerciseId, (progress) => {
          setUploadProgress((prev) => ({ ...prev, image: progress }));
        });
        finalData.image = imageUrl;
        setUploading((prev) => ({ ...prev, image: false }));
      }

      // Upload video if new file selected (and not using YouTube)
      if (videoFile && !finalData.youtubeVideoId) {
        setUploading((prev) => ({ ...prev, video: true }));
        const videoUrl = await uploadExerciseVideo(videoFile, exerciseId, (progress) => {
          setUploadProgress((prev) => ({ ...prev, video: progress }));
        });
        finalData.video = videoUrl;
        setUploading((prev) => ({ ...prev, video: false }));
      }

      // Update or create
      if (isEditing) {
        await updateBenchmarkExercise(exercise.id, finalData);
      } else {
        // Update the created exercise with file URLs
        await updateBenchmarkExercise(exerciseId, finalData);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving exercise:', err);
      setError(err.message || 'Failed to save exercise');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isUploading = uploading.image || uploading.video;
  const currentMode = formData.recommendedParameters?.parameterMode || 'setsRepsRest';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={!saving ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start justify-center p-4 pt-10">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Exercise' : 'Add New Exercise'}
            </h2>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Enter exercise title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Enter exercise description"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              />
            </div>

            {/* Sport */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sport
              </label>
              <select
                value={formData.sport}
                onChange={(e) => updateField('sport', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">Select sport...</option>
                {SPORTS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleArrayField('category', cat)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      formData.category?.includes(cat)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <ImageUploader
              value={formData.image}
              externalPreview={thumbnailPreview}
              onChange={setImageFile}
              onClear={clearImage}
              uploading={uploading.image}
              progress={uploadProgress.image}
              label="Exercise Image"
              accept="image/*,.gif"
              helperText={thumbnailPreview && !formData.image ? 'Auto-generated from video' : null}
            />

            {/* Video Upload */}
            <VideoUploader
              value={formData.video}
              youtubeUrl={formData.youtubeUrl}
              onChange={handleVideoChange}
              onYouTubeChange={handleYouTubeChange}
              onClear={clearVideo}
              uploading={uploading.video}
              progress={uploadProgress.video}
              label="Exercise Video"
              allowYouTube={true}
              enableCompression={false}
            />
            {generatingThumbnail && (
              <p className="text-xs text-purple-600 flex items-center gap-1 -mt-1">
                <Loader2 size={12} className="animate-spin" />
                Generating thumbnail from video...
              </p>
            )}
            {/* Pick Thumbnail Button - show when video is available */}
            {(videoFile || formData.video) && !formData.youtubeVideoId && (
              <button
                type="button"
                onClick={() => setShowThumbnailPicker(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 -mt-1"
              >
                <Camera size={14} />
                Pick thumbnail from video
              </button>
            )}

            {/* Recommended Parameters */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Recommended Parameters</h3>

              {/* Parameter Mode Toggle */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parameter Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {PARAMETER_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => updateParameterMode(mode.value)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                        currentMode === mode.value
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Parameter Inputs */}
              {currentMode === 'setsRepsRest' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sets
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.recommendedParameters?.parameters?.sets || ''}
                      onChange={(e) => updateParameter('sets', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reps
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.recommendedParameters?.parameters?.reps || ''}
                      onChange={(e) => updateParameter('reps', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rest (seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="600"
                      value={formData.recommendedParameters?.parameters?.restSeconds || ''}
                      onChange={(e) => updateParameter('restSeconds', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {currentMode === 'duration' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.recommendedParameters?.parameters?.durationMinutes || ''}
                    onChange={(e) => updateParameter('durationMinutes', parseInt(e.target.value) || 0)}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              )}

              {currentMode === 'timeTrial' && (
                <p className="text-sm text-gray-500">
                  Time trial exercises are completed as fast as possible with no set duration.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || isUploading || !formData.title}
              className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving || isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {isUploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {isEditing ? 'Update Exercise' : 'Create Exercise'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnail Picker Modal */}
      {showThumbnailPicker && (
        <ThumbnailPicker
          videoFile={videoFile}
          videoUrl={formData.video}
          onCapture={(thumbnailFile) => {
            setImageFile(thumbnailFile);
            const previewUrl = URL.createObjectURL(thumbnailFile);
            if (thumbnailPreview) {
              URL.revokeObjectURL(thumbnailPreview);
            }
            setThumbnailPreview(previewUrl);
          }}
          onClose={() => setShowThumbnailPicker(false)}
        />
      )}
    </div>
  );
}
