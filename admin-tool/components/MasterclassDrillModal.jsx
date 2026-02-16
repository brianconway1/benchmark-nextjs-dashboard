// components/MasterclassDrillModal.jsx
// Modal for creating/editing masterclass drills

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import ImageUploader from './ImageUploader';
import VideoUploader from './VideoUploader';
import {
  SECTIONS,
  SKILL_FOCUS_OPTIONS,
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  SPORTS,
  DEFAULT_RECOMMENDED_PARAMETERS,
  getDefaultDrillData,
} from '../constants/drillOptions';
import {
  createMasterclassDrill,
  updateMasterclassDrill,
} from '../lib/masterclassDrillService';
import {
  uploadMasterclassDrillImage,
  uploadMasterclassDrillVideo,
  extractYouTubeVideoId,
} from '../lib/storageService';

export default function MasterclassDrillModal({
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

  // Initialize form when drill changes
  useEffect(() => {
    if (drill) {
      setFormData({
        title: drill.title || '',
        description: drill.description || '',
        section: Array.isArray(drill.section) ? drill.section : (drill.section ? [drill.section] : []),
        skillFocus: Array.isArray(drill.skillFocus) ? drill.skillFocus : (drill.skillFocus ? [drill.skillFocus] : []),
        ageGroups: Array.isArray(drill.ageGroups) ? drill.ageGroups : (drill.ageGroups ? [drill.ageGroups] : []),
        sport: drill.sport || "Men's Football, Ladies' Football",
        image: drill.image || null,
        video: drill.video || null,
        youtubeUrl: drill.youtubeUrl || '',
        youtubeVideoId: drill.youtubeVideoId || '',
        recommendedParameters: drill.recommendedParameters || { ...DEFAULT_RECOMMENDED_PARAMETERS },
        coachesNotes: drill.coachesNotes || '',
      });
    } else {
      setFormData(getDefaultDrillData());
    }
    setImageFile(null);
    setVideoFile(null);
    setUploadProgress({ image: 0, video: 0 });
    setUploading({ image: false, video: false });
    setError(null);
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

  const handleYouTubeChange = (url, videoId) => {
    setFormData((prev) => ({
      ...prev,
      youtubeUrl: url,
      youtubeVideoId: videoId,
      video: null, // Clear uploaded video when using YouTube
    }));
    setVideoFile(null);
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
        const created = await createMasterclassDrill({
          ...finalData,
          image: null,
          video: null,
        });
        drillId = created.id;
      }

      // Upload image if new file selected
      if (imageFile) {
        setUploading((prev) => ({ ...prev, image: true }));
        const imageUrl = await uploadMasterclassDrillImage(imageFile, drillId, (progress) => {
          setUploadProgress((prev) => ({ ...prev, image: progress }));
        });
        finalData.image = imageUrl;
        setUploading((prev) => ({ ...prev, image: false }));
      }

      // Upload video if new file selected (and not using YouTube)
      if (videoFile && !finalData.youtubeVideoId) {
        setUploading((prev) => ({ ...prev, video: true }));
        const videoUrl = await uploadMasterclassDrillVideo(videoFile, drillId, (progress) => {
          setUploadProgress((prev) => ({ ...prev, video: progress }));
        });
        finalData.video = videoUrl;
        setUploading((prev) => ({ ...prev, video: false }));
      }

      // Update or create
      if (isEditing) {
        await updateMasterclassDrill(drill.id, finalData);
      } else {
        // Update the created drill with file URLs
        await updateMasterclassDrill(drillId, finalData);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving masterclass drill:', err);
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
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Masterclass Drill' : 'Add New Masterclass Drill'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                This drill will only be available within masterclasses
              </p>
            </div>
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

            {/* Sport (read-only display) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sport
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {formData.sport}
              </div>
            </div>

            {/* Image Upload */}
            <ImageUploader
              value={formData.image}
              onChange={setImageFile}
              onClear={clearImage}
              uploading={uploading.image}
              progress={uploadProgress.image}
              label="Drill Image"
            />

            {/* Video Upload */}
            <VideoUploader
              value={formData.video}
              youtubeUrl={formData.youtubeUrl}
              onChange={setVideoFile}
              onYouTubeChange={handleYouTubeChange}
              onClear={clearVideo}
              uploading={uploading.video}
              progress={uploadProgress.video}
              label="Drill Video"
              allowYouTube={true}
            />

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
                    {AGE_GROUP_LABELS[age] || age}
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
    </div>
  );
}
