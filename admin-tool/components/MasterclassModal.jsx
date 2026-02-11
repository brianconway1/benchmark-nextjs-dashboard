// components/MasterclassModal.jsx
// Modal for creating/editing masterclasses

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Plus, Trash2, GripVertical, Search, Camera } from 'lucide-react';
import ImageUploader from './ImageUploader';
import VideoUploader from './VideoUploader';
import ThumbnailPicker from './ThumbnailPicker';
import { SPORTS, getDefaultMasterclassData } from '../constants/drillOptions';
import { createMasterclass, updateMasterclass } from '../lib/masterclassService';
import { getAllBenchmarkDrills } from '../lib/drillService';
import { uploadMasterclassCover, uploadMasterclassVideo } from '../lib/storageService';
import { generateVideoThumbnail } from '../lib/videoCompression';

export default function MasterclassModal({
  isOpen,
  onClose,
  masterclass = null, // If provided, we're editing
  onSaved, // Callback after save
}) {
  const isEditing = !!masterclass?.id;

  const [formData, setFormData] = useState(getDefaultMasterclassData());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // File upload state
  const [coverFile, setCoverFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ cover: 0, video: 0 });
  const [uploading, setUploading] = useState({ cover: false, video: false });

  // Thumbnail state
  const [showThumbnailPicker, setShowThumbnailPicker] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);

  // Drill selection state
  const [availableDrills, setAvailableDrills] = useState([]);
  const [loadingDrills, setLoadingDrills] = useState(false);
  const [drillSearchQuery, setDrillSearchQuery] = useState('');
  const [showDrillPicker, setShowDrillPicker] = useState(false);

  // Load available drills
  useEffect(() => {
    if (isOpen) {
      loadDrills();
    }
  }, [isOpen]);

  const loadDrills = async () => {
    setLoadingDrills(true);
    try {
      const drills = await getAllBenchmarkDrills();
      setAvailableDrills(drills);
    } catch (err) {
      console.error('Error loading benchmark drills:', err);
    } finally {
      setLoadingDrills(false);
    }
  };

  // Initialize form when masterclass changes
  useEffect(() => {
    if (masterclass) {
      setFormData({
        title: masterclass.title || '',
        description: masterclass.description || '',
        videoUrl: masterclass.videoUrl || null,
        coachName: masterclass.coachName || '',
        coachImage: masterclass.coachImage || null,
        drillIds: masterclass.drillIds || [],
        sport: masterclass.sport || '',
        isActive: masterclass.isActive !== false,
        order: masterclass.order || 0,
      });
    } else {
      setFormData(getDefaultMasterclassData());
    }
    setCoverFile(null);
    setVideoFile(null);
    setUploadProgress({ cover: 0, video: 0 });
    setUploading({ cover: false, video: false });
    setError(null);
    setDrillSearchQuery('');
    setShowDrillPicker(false);
    setShowThumbnailPicker(false);
    setGeneratingThumbnail(false);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(null);
  }, [masterclass, isOpen]);

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

  const clearCover = () => {
    setFormData((prev) => ({ ...prev, coachImage: null }));
    setCoverFile(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
  };

  const clearVideo = () => {
    setFormData((prev) => ({ ...prev, videoUrl: null }));
    setVideoFile(null);
  };

  // Handle video selection with auto thumbnail generation
  const handleVideoChange = async (file) => {
    setVideoFile(file);

    // Auto-generate thumbnail for coach image if none set
    if (file && !formData.coachImage && !coverFile) {
      try {
        setGeneratingThumbnail(true);
        const thumbnail = await generateVideoThumbnail(file);
        setCoverFile(thumbnail);
        const previewUrl = URL.createObjectURL(thumbnail);
        setThumbnailPreview(previewUrl);
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
      } finally {
        setGeneratingThumbnail(false);
      }
    }
  };

  // Drill management
  const addDrill = (drillId) => {
    const current = formData.drillIds || [];
    if (current.includes(drillId)) return;

    updateField('drillIds', [...current, drillId]);
    setShowDrillPicker(false);
    setDrillSearchQuery('');
  };

  const removeDrill = (drillId) => {
    const current = formData.drillIds || [];
    updateField('drillIds', current.filter((id) => id !== drillId));
  };

  const moveDrill = (fromIndex, toIndex) => {
    const current = [...(formData.drillIds || [])];
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    updateField('drillIds', current);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      let finalData = { ...formData };

      // Create or get masterclass ID for file uploads
      let masterclassId = masterclass?.id;

      if (!masterclassId) {
        // Create the masterclass first to get an ID
        const created = await createMasterclass({
          ...finalData,
          coachImage: null,
          videoUrl: null,
        });
        masterclassId = created.id;
      }

      // Upload coach image if new file selected
      if (coverFile) {
        setUploading((prev) => ({ ...prev, cover: true }));
        const coverUrl = await uploadMasterclassCover(coverFile, masterclassId, (progress) => {
          setUploadProgress((prev) => ({ ...prev, cover: progress }));
        });
        finalData.coachImage = coverUrl;
        setUploading((prev) => ({ ...prev, cover: false }));
      }

      // Upload main video if new file selected
      if (videoFile) {
        setUploading((prev) => ({ ...prev, video: true }));
        const videoUrlUploaded = await uploadMasterclassVideo(videoFile, masterclassId, (progress) => {
          setUploadProgress((prev) => ({ ...prev, video: progress }));
        });
        finalData.videoUrl = videoUrlUploaded;
        setUploading((prev) => ({ ...prev, video: false }));
      }

      // Update or create
      if (isEditing) {
        await updateMasterclass(masterclass.id, finalData);
      } else {
        // Update the created masterclass with file URLs
        await updateMasterclass(masterclassId, finalData);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving masterclass:', err);
      setError(err.message || 'Failed to save masterclass');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isUploading = uploading.cover || uploading.video;

  // Get drill details for display
  const getDrillDetails = (drillId) => {
    return availableDrills.find((d) => d.id === drillId);
  };

  // Filter drills for picker
  const filteredDrills = availableDrills.filter((drill) => {
    const query = drillSearchQuery.toLowerCase();
    if (!query) return true;
    return (
      drill.title?.toLowerCase().includes(query) ||
      drill.description?.toLowerCase().includes(query)
    );
  });

  // Get drills not already added
  const availableForPicker = filteredDrills.filter(
    (drill) => !formData.drillIds?.includes(drill.id)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={!saving ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start justify-center p-4 pt-10">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Masterclass' : 'Add New Masterclass'}
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
                placeholder="Enter masterclass title"
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
                placeholder="Enter masterclass description"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              />
            </div>

            {/* Coach Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coach Name
              </label>
              <input
                type="text"
                value={formData.coachName}
                onChange={(e) => updateField('coachName', e.target.value)}
                placeholder="e.g., Tommy Walsh"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Sport */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sport
              </label>
              <input
                type="text"
                value={formData.sport}
                onChange={(e) => updateField('sport', e.target.value)}
                placeholder="e.g., Hurling (comma-separated if multiple)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={formData.order || 0}
                onChange={(e) => updateField('order', parseInt(e.target.value) || 0)}
                placeholder="Lower number = shows first"
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Lower number = shows first</p>
            </div>

            {/* Coach Image Upload */}
            <ImageUploader
              value={formData.coachImage}
              externalPreview={thumbnailPreview}
              onChange={setCoverFile}
              onClear={clearCover}
              uploading={uploading.cover}
              progress={uploadProgress.cover}
              label="Coach Photo"
              helperText={thumbnailPreview && !formData.coachImage ? 'Auto-generated from video' : null}
            />

            {/* Main Video Upload */}
            <VideoUploader
              value={formData.videoUrl}
              onChange={handleVideoChange}
              onClear={clearVideo}
              uploading={uploading.video}
              progress={uploadProgress.video}
              label="Main Masterclass Video"
              allowYouTube={false}
              enableCompression={false}
            />
            {generatingThumbnail && (
              <p className="text-xs text-purple-600 flex items-center gap-1 -mt-1">
                <Loader2 size={12} className="animate-spin" />
                Generating thumbnail from video...
              </p>
            )}
            {/* Pick Thumbnail Button */}
            {(videoFile || formData.videoUrl) && (
              <button
                type="button"
                onClick={() => setShowThumbnailPicker(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 -mt-1"
              >
                <Camera size={14} />
                Pick coach photo from video
              </button>
            )}

            {/* Drills Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Drills ({formData.drillIds?.length || 0})
                </label>
                <button
                  type="button"
                  onClick={() => setShowDrillPicker(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus size={16} />
                  Add Drill
                </button>
              </div>

              {/* Drill List */}
              {formData.drillIds?.length > 0 ? (
                <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                  {formData.drillIds.map((drillId, index) => {
                    const drill = getDrillDetails(drillId);
                    return (
                      <div
                        key={drillId}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <GripVertical
                          size={18}
                          className="text-gray-400 cursor-grab"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {drill?.title || 'Unknown Drill'}
                          </div>
                          {drill?.section && (
                            <div className="text-xs text-gray-500">
                              {Array.isArray(drill.section)
                                ? drill.section.join(', ')
                                : drill.section}
                            </div>
                          )}
                          {drill?.isMasterclassDrill && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                              Masterclass Drill
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveDrill(index, index - 1)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              ↑
                            </button>
                          )}
                          {index < formData.drillIds.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveDrill(index, index + 1)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              ↓
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeDrill(drillId)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  No drills added yet. Click "Add Drill" to select benchmark drills.
                </div>
              )}

              {/* Drill Picker Modal */}
              {showDrillPicker && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                  <div
                    className="fixed inset-0 bg-black/30"
                    onClick={() => setShowDrillPicker(false)}
                  />
                  <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Select Drill</h3>
                        <button
                          onClick={() => setShowDrillPicker(false)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="relative">
                        <Search
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          value={drillSearchQuery}
                          onChange={(e) => setDrillSearchQuery(e.target.value)}
                          placeholder="Search drills..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {loadingDrills ? (
                        <div className="text-center py-8 text-gray-500">
                          Loading drills...
                        </div>
                      ) : availableForPicker.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {drillSearchQuery
                            ? 'No drills match your search'
                            : 'All drills have been added'}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {availableForPicker.map((drill) => (
                            <button
                              key={drill.id}
                              onClick={() => addDrill(drill.id)}
                              className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <div className="font-medium text-gray-900">
                                {drill.title || 'Untitled'}
                              </div>
                              {drill.section && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {Array.isArray(drill.section)
                                    ? drill.section.join(', ')
                                    : drill.section}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active (visible to users)
              </label>
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
                  {isEditing ? 'Update Masterclass' : 'Create Masterclass'}
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
          videoUrl={formData.videoUrl}
          onCapture={(thumbnailFile) => {
            setCoverFile(thumbnailFile);
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
