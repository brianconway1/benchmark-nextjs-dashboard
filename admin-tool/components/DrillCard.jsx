// components/DrillCard.jsx
// Card component for displaying a benchmark drill

import React from 'react';
import { Play, Edit, Trash2, Copy, Clock, Tag, Target } from 'lucide-react';
import { getYouTubeThumbnail } from '../lib/storageService';

export default function DrillCard({
  drill,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  className = '',
}) {
  const {
    title,
    description,
    image,
    youtubeVideoId,
    section,
    skillFocus,
    duration,
    recommendedParameters,
    sport,
    ageGroups,
  } = drill;

  // Get display image
  const displayImage = image || (youtubeVideoId ? getYouTubeThumbnail(youtubeVideoId) : null);

  // Get duration display
  const getDurationDisplay = () => {
    if (recommendedParameters?.parameterMode === 'duration') {
      const mins = recommendedParameters.parameters?.durationMinutes;
      if (mins) return `${mins} mins`;
    }
    if (duration) return duration;
    return null;
  };

  // Format array fields
  const formatArray = (arr) => {
    if (!arr) return null;
    if (Array.isArray(arr)) return arr.join(', ');
    return String(arr);
  };

  const durationDisplay = getDurationDisplay();
  const sectionDisplay = formatArray(section);
  const skillFocusDisplay = formatArray(skillFocus);
  const ageGroupsDisplay = formatArray(ageGroups);

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow ${className}`}
    >
      {/* Image/Thumbnail */}
      <div
        className="relative h-40 bg-gray-100 cursor-pointer"
        onClick={() => onClick?.(drill)}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <Play size={32} className="mx-auto mb-2" />
              <span className="text-sm">No media</span>
            </div>
          </div>
        )}

        {/* YouTube badge */}
        {youtubeVideoId && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Play size={12} fill="white" />
            YouTube
          </div>
        )}

        {/* Sport badge */}
        {sport && (
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {sport}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="font-semibold text-gray-900 line-clamp-1 cursor-pointer hover:text-blue-600"
          onClick={() => onClick?.(drill)}
        >
          {title || 'Untitled Drill'}
        </h3>

        {description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
        )}

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap gap-2">
          {durationDisplay && (
            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              <Clock size={12} />
              {durationDisplay}
            </span>
          )}
          {sectionDisplay && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              <Tag size={12} />
              {sectionDisplay}
            </span>
          )}
          {skillFocusDisplay && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded max-w-[150px] truncate">
              <Target size={12} />
              {skillFocusDisplay}
            </span>
          )}
        </div>

        {/* Age groups */}
        {ageGroupsDisplay && (
          <div className="mt-2 text-xs text-gray-500">
            Ages: {ageGroupsDisplay}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(drill);
            }}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate?.(drill);
            }}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Copy size={14} />
            Duplicate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(drill);
            }}
            className="flex items-center justify-center gap-1 py-2 px-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
