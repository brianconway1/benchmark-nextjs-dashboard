// components/MasterclassCard.jsx
// Card component for displaying a masterclass

import React from 'react';
import { Play, Edit, Trash2, Eye, EyeOff, Video, BookOpen } from 'lucide-react';

export default function MasterclassCard({
  masterclass,
  onClick,
  onEdit,
  onDelete,
  onToggleActive,
  className = '',
}) {
  const {
    title,
    description,
    coachImage,
    videoUrl,
    drillIds,
    sport,
    coachName,
    isActive,
    order,
  } = masterclass;

  const drillCount = drillIds?.length || 0;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow ${className}`}
    >
      {/* Coach Image */}
      <div
        className="relative h-48 bg-gray-100 cursor-pointer"
        onClick={() => onClick?.(masterclass)}
      >
        {coachImage ? (
          <img
            src={coachImage}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-600">
            <BookOpen size={48} className="text-white/80" />
          </div>
        )}

        {/* Status badge */}
        <div
          className={`absolute top-2 right-2 text-xs px-2 py-1 rounded flex items-center gap-1 ${
            isActive
              ? 'bg-green-500 text-white'
              : 'bg-gray-500 text-white'
          }`}
        >
          {isActive ? (
            <>
              <Eye size={12} />
              Active
            </>
          ) : (
            <>
              <EyeOff size={12} />
              Inactive
            </>
          )}
        </div>

        {/* Sport badge */}
        {sport && (
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {sport}
          </div>
        )}

        {/* Video indicator */}
        {videoUrl && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Video size={12} />
            Has Video
          </div>
        )}

        {/* Order badge */}
        {typeof order === 'number' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Order: {order}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="font-semibold text-gray-900 line-clamp-1 cursor-pointer hover:text-blue-600"
          onClick={() => onClick?.(masterclass)}
        >
          {title || 'Untitled Masterclass'}
        </h3>

        {coachName && (
          <p className="text-sm text-gray-500 mt-0.5">Coach: {coachName}</p>
        )}

        {description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
        )}

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            <BookOpen size={12} />
            {drillCount} drill{drillCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(masterclass);
            }}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive?.(masterclass);
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm rounded-lg transition-colors ${
              isActive
                ? 'text-orange-600 hover:bg-orange-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
          >
            {isActive ? (
              <>
                <EyeOff size={14} />
                Deactivate
              </>
            ) : (
              <>
                <Eye size={14} />
                Activate
              </>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(masterclass);
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
