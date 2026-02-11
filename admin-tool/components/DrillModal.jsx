// components/DrillModal.jsx
// Modal for creating/editing benchmark drills

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Camera } from 'lucide-react';
import ImageUploader from './ImageUploader';
import VideoUploader from './VideoUploader';
import ThumbnailPicker from './ThumbnailPicker';
import {
  SECTIONS,
  SKILL_FOCUS_OPTIONS,
  AGE_GROUPS,
  SPORTS,
  DEFAULT_RECOMMENDED_PARAMETERS,
  getDefaultDrillData,
} from '../constants/drillOptions';
import {
  createBenchmarkDrill,
  updateBenchmarkDrill,
} from '../lib/drillService';
import {
  uploadDrillImage,
  uploadDrillVideo,
  extractYouTubeVideoId,
  getYouTubeThumbnail,
} from '../lib/storageService';
import { generateVideoThumbnail } from '../lib/videoCompression';

export default function DrillModal({
  isOpen,
  onClose,
  drill = null, // If provided, we're editing
  onSaved, // Callback after save
}) {
  const isEditing = !!drill?.id;

  const [formData, setFormData] = useState(getDefaultDrillData());
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

  // Initialize form when drill changes
  useEffect(() => {
    if (drill) {
      setFormData({
        title: drill.title || '',
        description: drill.description || '',
        section: Array.isArray(drill.section) ? drill.section : (drill.section ? [drill.section] : []),
        skillFocus: Array.isArray(drill.skillFocus) ? drill.skillFocus : (drill.skillFocus ? [drill.skillFocus] : []),
        ageGroups: Array.isArray(drill.ageGroups) ? drill.ageGroups : (drill.ageGroups ? [drill.ageGroups] : []),
        sport: drill.sport || '',
        image: drill.image || null,
        video: drill.video || null,
        youtubeUrl: drill.youtubeUrl || '',
        youtubeVideoId: drill.youtubeVideoId || '',
        recommendedParameters: drill.recommendedParameters || { ...DEFAULT_RECOMMENDED_PARAMETERS },
        coachesNotes: drill.coachesNotes || '',
        // Masterclass drill fields
        isMasterclassDrill: drill.isMasterclassDrill || false,
        masterclassId: drill.masterclassId || '',
      });
    } else {
      setFormData(getDefaultDrillData());
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
  }, [drill, isOpen]);

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

      // Create or get drill ID for file uploads
      let drillId = drill?.id;

      if (!drillId) {
        // Create the drill first to get an ID
        const created = await createBenchmarkDrill({
          ...finalData,
          image: null,
          video: null,
        });
        drillId = created.id;
      }

      // Upload image if new file selected
      if (imageFile) {
        setUploading((prev) => ({ ...prev, image: true }));
        const imageUrl = await uploadDrillImage(imageFile, drillId, (progress) => {
          setUploadProgress((prev) => ({ ...prev, image: progress }));
        });
        finalData.image = imageUrl;
        setUploading((prev) => ({ ...prev, image: false }));
      }

      // Upload video if new file selected (and not using YouTube)
      if (videoFile && !finalData.youtubeVideoId) {
        setUploading((prev) => ({ ...prev, video: true }));
        const videoUrl = await uploadDrillVideo(videoFile, drillId, (progress) => {
          setUploadProgress((prev) => ({ ...prev, video: progress }));
        });
        finalData.video = videoUrl;
        setUploading((prev) => ({ ...prev, video: false }));
      }

      // Update or create
      if (isEditing) {
        await updateBenchmarkDrill(drill.id, finalData);
      } else {
        // Update the created drill with file URLs
        await updateBenchmarkDrill(drillId, finalData);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving drill:', err);
      setError(err.message || 'Failed to save drill');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isUploading = uploading.image || uploading.video;

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
              {isEditing ? 'Edit Drill' : 'Add New Drill'}
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
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Enter drill title"
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
                placeholder="Enter drill description"
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

            {/* Image Upload */}
            <ImageUploader
              value={formData.image}
              externalPreview={thumbnailPreview}
              onChange={setImageFile}
              onClear={clearImage}
              uploading={uploading.image}
              progress={uploadProgress.image}
              label="Drill Image"
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
              label="Drill Video"
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

            {/* Sections */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sections
              </label>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => toggleArrayField('section', section)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      formData.section?.includes(section)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </div>
            </div>

            {/* Skill Focus */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill Focus
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILL_FOCUS_OPTIONS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleArrayField('skillFocus', skill)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      formData.skillFocus?.includes(skill)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Age Groups */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age Groups
              </label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => toggleArrayField('ageGroups', age)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      formData.ageGroups?.includes(age)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.recommendedParameters?.parameters?.durationMinutes || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 10;
                  updateField('recommendedParameters', {
                    ...formData.recommendedParameters,
                    parameterMode: 'duration',
                    parameters: {
                      ...formData.recommendedParameters?.parameters,
                      durationMinutes: value,
                    },
                  });
                }}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Coaches Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coaches Notes
              </label>
              <textarea
                value={formData.coachesNotes}
                onChange={(e) => updateField('coachesNotes', e.target.value)}
                placeholder="Additional notes for coaches..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              />
            </div>

            {/* Masterclass Drill Settings */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Masterclass Settings</h3>

              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="isMasterclassDrill"
                  checked={formData.isMasterclassDrill}
                  onChange={(e) => updateField('isMasterclassDrill', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="isMasterclassDrill" className="text-sm text-gray-700">
                  This is a Masterclass drill (shows orange "Masterclass" badge in library)
                </label>
              </div>

              {formData.isMasterclassDrill && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Masterclass ID (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.masterclassId}
                    onChange={(e) => updateField('masterclassId', e.target.value)}
                    placeholder="Reference to masterclass document ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Links this drill to a specific masterclass for reference
                  </p>
                </div>
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
              disabled={saving || isUploading}
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
                  {isEditing ? 'Update Drill' : 'Create Drill'}
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
