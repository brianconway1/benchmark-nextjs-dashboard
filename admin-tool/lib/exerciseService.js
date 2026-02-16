// lib/exerciseService.js
// CRUD operations for benchmark exercises

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { deleteFileByUrl } from './storageService';

const COLLECTION = 'benchmark_exercises';

/**
 * Extract document ID from compound ID format
 * Handles IDs like "exercise:abc123" -> "abc123"
 * Also handles plain IDs like "abc123" -> "abc123"
 * @param {string} id - Compound or plain ID
 * @returns {string} - Document ID
 */
function extractDocId(id) {
  if (!id) return id;
  // Check if ID has a prefix (e.g., "exercise:", "benchmark:", etc.)
  if (id.includes(':')) {
    return id.split(':')[1];
  }
  return id;
}

/**
 * Get all benchmark exercises
 * @returns {Promise<Array>} - Array of exercise objects with id
 */
export async function getAllBenchmarkExercises() {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching benchmark exercises:', error);
    throw error;
  }
}

/**
 * Get a single benchmark exercise by ID
 * @param {string} id - Exercise document ID (can be compound like "exercise:abc123" or plain "abc123")
 * @returns {Promise<Object|null>} - Exercise object or null
 */
export async function getBenchmarkExercise(id) {
  const docId = extractDocId(id);
  try {
    const docRef = doc(db, COLLECTION, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching benchmark exercise:', error);
    throw error;
  }
}

/**
 * Create a new benchmark exercise
 * @param {Object} exerciseData - Exercise data (without id)
 * @returns {Promise<Object>} - Created exercise with id
 */
export async function createBenchmarkExercise(exerciseData) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...exerciseData,
      section: ['Gym'], // Always hardcode section to Gym
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...exerciseData,
    };
  } catch (error) {
    console.error('Error creating benchmark exercise:', error);
    throw error;
  }
}

/**
 * Update an existing benchmark exercise
 * @param {string} id - Exercise document ID (can be compound like "exercise:abc123" or plain "abc123")
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated exercise
 */
export async function updateBenchmarkExercise(id, updates) {
  const docId = extractDocId(id);
  try {
    const docRef = doc(db, COLLECTION, docId);

    // Remove id from updates if present
    const { id: _, ...updateData } = updates;

    // Ensure section is always Gym
    updateData.section = ['Gym'];

    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return {
      id: docId,
      ...updateData,
    };
  } catch (error) {
    console.error('Error updating benchmark exercise:', error);
    throw error;
  }
}

/**
 * Delete a benchmark exercise and its associated files
 * @param {string} id - Exercise document ID (can be compound like "exercise:abc123" or plain "abc123")
 */
export async function deleteBenchmarkExercise(id) {
  // Extract the actual document ID from compound format
  const docId = extractDocId(id);
  console.log('Deleting benchmark exercise:', { originalId: id, docId });

  try {
    // Get the exercise to find associated files
    const exercise = await getBenchmarkExercise(docId);

    if (!exercise) {
      throw new Error(`Exercise not found with ID: ${docId}`);
    }

    // Delete associated files from Storage
    if (exercise.image) {
      try {
        await deleteFileByUrl(exercise.image);
        console.log('Deleted image:', exercise.image);
      } catch (e) {
        console.warn('Failed to delete image:', e);
      }
    }
    if (exercise.video) {
      try {
        await deleteFileByUrl(exercise.video);
        console.log('Deleted video:', exercise.video);
      } catch (e) {
        console.warn('Failed to delete video:', e);
      }
    }
    if (exercise.videoThumbnail) {
      try {
        await deleteFileByUrl(exercise.videoThumbnail);
        console.log('Deleted video thumbnail:', exercise.videoThumbnail);
      } catch (e) {
        console.warn('Failed to delete video thumbnail:', e);
      }
    }

    // Delete the document from Firestore
    await deleteDoc(doc(db, COLLECTION, docId));
    console.log('Exercise document deleted successfully');
  } catch (error) {
    console.error('Error deleting benchmark exercise:', error);
    throw error;
  }
}

/**
 * Duplicate a benchmark exercise
 * @param {string} id - Exercise document ID to duplicate
 * @returns {Promise<Object>} - New exercise with id
 */
export async function duplicateBenchmarkExercise(id) {
  try {
    const original = await getBenchmarkExercise(id);

    if (!original) {
      throw new Error('Exercise not found');
    }

    // Remove id and timestamps
    const { id: _, createdAt, updatedAt, ...exerciseData } = original;

    // Create copy with modified title
    return createBenchmarkExercise({
      ...exerciseData,
      title: `${exerciseData.title || 'Exercise'} (Copy)`,
    });
  } catch (error) {
    console.error('Error duplicating benchmark exercise:', error);
    throw error;
  }
}
