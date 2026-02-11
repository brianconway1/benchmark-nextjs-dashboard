// pages/MasterclassesPage.jsx
// Page for managing masterclasses

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import MasterclassCard from '../components/MasterclassCard';
import MasterclassModal from '../components/MasterclassModal';
import {
  getAllMasterclasses,
  deleteMasterclass,
  toggleMasterclassActive,
} from '../lib/masterclassService';

export default function MasterclassesPage({ onNavigateBack }) {
  const [masterclasses, setMasterclasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMasterclass, setEditingMasterclass] = useState(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load masterclasses
  const loadMasterclasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMasterclasses();
      setMasterclasses(data);
    } catch (err) {
      console.error('Error loading masterclasses:', err);
      setError('Failed to load masterclasses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMasterclasses();
  }, [loadMasterclasses]);

  // Filter masterclasses by search
  const filteredMasterclasses = masterclasses.filter((mc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      mc.title?.toLowerCase().includes(query) ||
      mc.description?.toLowerCase().includes(query) ||
      mc.sport?.toLowerCase().includes(query)
    );
  });

  // Handlers
  const handleAddNew = () => {
    setEditingMasterclass(null);
    setModalOpen(true);
  };

  const handleEdit = (masterclass) => {
    setEditingMasterclass(masterclass);
    setModalOpen(true);
  };

  const handleView = (masterclass) => {
    // Open in edit mode for viewing
    handleEdit(masterclass);
  };

  const handleToggleActive = async (masterclass) => {
    try {
      await toggleMasterclassActive(masterclass.id, !masterclass.isActive);
      loadMasterclasses();
    } catch (err) {
      console.error('Error toggling active status:', err);
      setError('Failed to update active status');
    }
  };

  const handleDeleteClick = (masterclass) => {
    setDeleteConfirm(masterclass);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await deleteMasterclass(deleteConfirm.id);
      setDeleteConfirm(null);
      loadMasterclasses();
    } catch (err) {
      console.error('Error deleting masterclass:', err);
      setError('Failed to delete masterclass');
    } finally {
      setDeleting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingMasterclass(null);
  };

  const handleSaved = () => {
    loadMasterclasses();
  };

  // Stats
  const activeCount = masterclasses.filter((mc) => mc.isActive).length;
  const inactiveCount = masterclasses.length - activeCount;

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
              <h1 className="text-xl font-semibold text-gray-900">
                Masterclasses
              </h1>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">
                  {masterclasses.length} total
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-green-600">{activeCount} active</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">{inactiveCount} inactive</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadMasterclasses}
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
                Add Masterclass
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search masterclasses..."
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
              ×
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading && masterclasses.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : filteredMasterclasses.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-2">
              {searchQuery
                ? 'No masterclasses match your search'
                : 'No masterclasses yet'}
            </div>
            {!searchQuery && (
              <button
                onClick={handleAddNew}
                className="text-blue-600 hover:text-blue-700"
              >
                Create your first masterclass
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMasterclasses.map((masterclass) => (
              <MasterclassCard
                key={masterclass.id}
                masterclass={masterclass}
                onClick={handleView}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Masterclass Modal */}
      <MasterclassModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        masterclass={editingMasterclass}
        onSaved={handleSaved}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !deleting && setDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Masterclass?
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{deleteConfirm.title || 'Untitled'}"?
              This will also delete the cover image and main video. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
