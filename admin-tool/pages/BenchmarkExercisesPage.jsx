// pages/BenchmarkExercisesPage.jsx
// Page for managing benchmark exercises

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, Loader2, ArrowLeft, Dumbbell } from 'lucide-react';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseModal from '../components/ExerciseModal';
import {
  getAllBenchmarkExercises,
  deleteBenchmarkExercise,
  duplicateBenchmarkExercise,
} from '../lib/exerciseService';

export default function BenchmarkExercisesPage({ onNavigateBack }) {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Load exercises
  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllBenchmarkExercises();
      setExercises(data);
    } catch (err) {
      console.error('Error loading exercises:', err);
      setError('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Filter exercises by search
  const filteredExercises = exercises.filter((exercise) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exercise.title?.toLowerCase().includes(query) ||
      exercise.description?.toLowerCase().includes(query) ||
      exercise.sport?.toLowerCase().includes(query) ||
      (Array.isArray(exercise.category) && exercise.category.some((c) => c.toLowerCase().includes(query)))
    );
  });

  // Handlers
  const handleAddNew = () => {
    setEditingExercise(null);
    setModalOpen(true);
  };

  const handleEdit = (exercise) => {
    setEditingExercise(exercise);
    setModalOpen(true);
  };

  const handleView = (exercise) => {
    // Open in edit mode for viewing
    handleEdit(exercise);
  };

  const handleDuplicate = async (exercise) => {
    try {
      await duplicateBenchmarkExercise(exercise.id);
      loadExercises();
    } catch (err) {
      console.error('Error duplicating exercise:', err);
      setError('Failed to duplicate exercise');
    }
  };

  const handleDeleteClick = async (exercise) => {
    // Use native confirm to bypass React rendering issues
    const confirmed = window.confirm(`Delete "${exercise.title || 'Untitled'}"?\n\nThis action cannot be undone.`);

    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteBenchmarkExercise(exercise.id);
      loadExercises();
    } catch (err) {
      console.error('Error deleting exercise:', err);
      setError('Failed to delete exercise: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingExercise(null);
  };

  const handleSaved = () => {
    loadExercises();
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
                <Dumbbell size={24} className="text-purple-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Benchmark Exercises
                </h1>
              </div>
              <span className="text-sm text-gray-500">
                ({filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadExercises}
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
                Add Exercise
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
            placeholder="Search exercises..."
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
        {loading && exercises.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-2">
              {searchQuery ? 'No exercises match your search' : 'No exercises yet'}
            </div>
            {!searchQuery && (
              <button
                onClick={handleAddNew}
                className="text-blue-600 hover:text-blue-700"
              >
                Add your first exercise
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onClick={handleView}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Exercise Modal */}
      <ExerciseModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        exercise={editingExercise}
        onSaved={handleSaved}
      />
    </div>
  );
}
