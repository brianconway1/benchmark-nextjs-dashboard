// pages/MasterclassDrillsPage.jsx
// Page for managing masterclass drills (separate from benchmark drills)

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, Loader2, ArrowLeft, Star } from 'lucide-react';
import DrillCard from '../components/DrillCard';
import MasterclassDrillModal from '../components/MasterclassDrillModal';
import {
  getAllMasterclassDrills,
  deleteMasterclassDrill,
  duplicateMasterclassDrill,
} from '../lib/masterclassDrillService';

export default function MasterclassDrillsPage({ onNavigateBack }) {
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Load drills
  const loadDrills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMasterclassDrills();
      setDrills(data);
    } catch (err) {
      console.error('Error loading masterclass drills:', err);
      setError('Failed to load drills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrills();
  }, [loadDrills]);

  // Filter drills by search
  const filteredDrills = drills.filter((drill) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      drill.title?.toLowerCase().includes(query) ||
      drill.description?.toLowerCase().includes(query) ||
      drill.sport?.toLowerCase().includes(query) ||
      (Array.isArray(drill.section) && drill.section.some((s) => s.toLowerCase().includes(query))) ||
      (Array.isArray(drill.skillFocus) && drill.skillFocus.some((s) => s.toLowerCase().includes(query)))
    );
  });

  // Handlers
  const handleAddNew = () => {
    setEditingDrill(null);
    setModalOpen(true);
  };

  const handleEdit = (drill) => {
    setEditingDrill(drill);
    setModalOpen(true);
  };

  const handleView = (drill) => {
    // Open in edit mode for viewing
    handleEdit(drill);
  };

  const handleDuplicate = async (drill) => {
    try {
      await duplicateMasterclassDrill(drill.id);
      loadDrills();
    } catch (err) {
      console.error('Error duplicating drill:', err);
      setError('Failed to duplicate drill');
    }
  };

  const handleDeleteClick = async (drill) => {
    // Use native confirm to bypass React rendering issues
    const confirmed = window.confirm(`Delete "${drill.title || 'Untitled'}"?\n\nThis action cannot be undone and will remove it from any masterclasses using it.`);

    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteMasterclassDrill(drill.id);
      loadDrills();
    } catch (err) {
      console.error('Error deleting drill:', err);
      setError('Failed to delete drill: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingDrill(null);
  };

  const handleSaved = () => {
    loadDrills();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {onNavigateBack && (
                <button
                  onClick={onNavigateBack}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Star size={20} className="text-yellow-500" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Masterclass Drills
                </h1>
              </div>
              <span className="text-sm text-gray-500">
                ({filteredDrills.length} drill{filteredDrills.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDrills}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus size={18} />
                Add Drill
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Star size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-800">Premium Content</h3>
              <p className="text-sm text-yellow-700 mt-1">
                These drills are exclusive to masterclasses and won't appear in the main drill library.
                Users can copy them to their personal library after viewing a masterclass.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search masterclass drills..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading && drills.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : filteredDrills.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-2">
              {searchQuery ? 'No drills match your search' : 'No masterclass drills yet'}
            </div>
            {!searchQuery && (
              <button
                onClick={handleAddNew}
                className="text-blue-600 hover:text-blue-700"
              >
                Add your first masterclass drill
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDrills.map((drill) => (
              <DrillCard
                key={drill.id}
                drill={drill}
                onClick={handleView}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drill Modal */}
      <MasterclassDrillModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        drill={editingDrill}
        onSaved={handleSaved}
      />

          </div>
  );
}
