// lib/drillService.js
// CRUD operations for benchmark drills

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

const COLLECTION = 'benchmark_drills';

/**
 * Extract document ID from compound ID format
 * Handles IDs like "benchmark:abc123" -> "abc123"
 * Also handles plain IDs like "abc123" -> "abc123"
 * @param {string} id - Compound or plain ID
 * @returns {string} - Document ID
 */
function extractDocId(id) {
  if (!id) return id;
  // Check if ID has a prefix (e.g., "benchmark:", "team:", "user:")
  if (id.includes(':')) {
    return id.split(':')[1];
  }
  return id;
}

/**
 * Get all benchmark drills
 * @returns {Promise<Array>} - Array of drill objects with id
 */
export async function getAllBenchmarkDrills() {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching benchmark drills:', error);
    throw error;
  }
}

/**
 * Get a single benchmark drill by ID
 * @param {string} id - Drill document ID (can be compound like "benchmark:abc123" or plain "abc123")
 * @returns {Promise<Object|null>} - Drill object or null
 */
export async function getBenchmarkDrill(id) {
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
    console.error('Error fetching benchmark drill:', error);
    throw error;
  }
}

/**
 * Create a new benchmark drill
 * @param {Object} drillData - Drill data (without id)
 * @returns {Promise<Object>} - Created drill with id
 */
export async function createBenchmarkDrill(drillData) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...drillData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...drillData,
    };
  } catch (error) {
    console.error('Error creating benchmark drill:', error);
    throw error;
  }
}

/**
 * Update an existing benchmark drill
 * @param {string} id - Drill document ID (can be compound like "benchmark:abc123" or plain "abc123")
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated drill
 */
export async function updateBenchmarkDrill(id, updates) {
  const docId = extractDocId(id);
  try {
    const docRef = doc(db, COLLECTION, docId);

    // Remove id from updates if present
    const { id: _, ...updateData } = updates;

    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return {
      id: docId,
      ...updateData,
    };
  } catch (error) {
    console.error('Error updating benchmark drill:', error);
    throw error;
  }
}

/**
 * Delete a benchmark drill and its associated files
 * @param {string} id - Drill document ID (can be compound like "benchmark:abc123" or plain "abc123")
 */
export async function deleteBenchmarkDrill(id) {
  // Extract the actual document ID from compound format
  const docId = extractDocId(id);
  console.log('Deleting benchmark drill:', { originalId: id, docId });

  try {
    // Get the drill to find associated files
    const drill = await getBenchmarkDrill(docId);

    if (!drill) {
      throw new Error(`Drill not found with ID: ${docId}`);
    }

    // Delete associated files from Storage
    if (drill.image) {
      try {
        await deleteFileByUrl(drill.image);
        console.log('Deleted image:', drill.image);
      } catch (e) {
        console.warn('Failed to delete image:', e);
      }
    }
    if (drill.video) {
      try {
        await deleteFileByUrl(drill.video);
        console.log('Deleted video:', drill.video);
      } catch (e) {
        console.warn('Failed to delete video:', e);
      }
    }

    // Delete the document from Firestore
    await deleteDoc(doc(db, COLLECTION, docId));
    console.log('Drill document deleted successfully');
  } catch (error) {
    console.error('Error deleting benchmark drill:', error);
    throw error;
  }
}

/**
 * Duplicate a benchmark drill
 * @param {string} id - Drill document ID to duplicate
 * @returns {Promise<Object>} - New drill with id
 */
export async function duplicateBenchmarkDrill(id) {
  try {
    const original = await getBenchmarkDrill(id);

    if (!original) {
      throw new Error('Drill not found');
    }

    // Remove id and timestamps
    const { id: _, createdAt, updatedAt, ...drillData } = original;

    // Create copy with modified title
    return createBenchmarkDrill({
      ...drillData,
      title: `${drillData.title || 'Drill'} (Copy)`,
    });
  } catch (error) {
    console.error('Error duplicating benchmark drill:', error);
    throw error;
  }
}
