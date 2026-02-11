// lib/masterclassService.js
// CRUD operations for masterclasses

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

const COLLECTION = 'masterclasses';

/**
 * Get all masterclasses
 * @returns {Promise<Array>} - Array of masterclass objects with id
 */
export async function getAllMasterclasses() {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching masterclasses:', error);
    throw error;
  }
}

/**
 * Get a single masterclass by ID
 * @param {string} id - Masterclass document ID
 * @returns {Promise<Object|null>} - Masterclass object or null
 */
export async function getMasterclass(id) {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching masterclass:', error);
    throw error;
  }
}

/**
 * Create a new masterclass
 * @param {Object} masterclassData - Masterclass data (without id)
 * @returns {Promise<Object>} - Created masterclass with id
 */
export async function createMasterclass(masterclassData) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...masterclassData,
      drillIds: masterclassData.drillIds || [],
      isActive: masterclassData.isActive !== false, // Default to true
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...masterclassData,
    };
  } catch (error) {
    console.error('Error creating masterclass:', error);
    throw error;
  }
}

/**
 * Update an existing masterclass
 * @param {string} id - Masterclass document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated masterclass
 */
export async function updateMasterclass(id, updates) {
  try {
    const docRef = doc(db, COLLECTION, id);

    // Remove id from updates if present
    const { id: _, ...updateData } = updates;

    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return {
      id,
      ...updateData,
    };
  } catch (error) {
    console.error('Error updating masterclass:', error);
    throw error;
  }
}

/**
 * Delete a masterclass and its associated files
 * @param {string} id - Masterclass document ID
 */
export async function deleteMasterclass(id) {
  try {
    // Get the masterclass to find associated files
    const masterclass = await getMasterclass(id);

    if (masterclass) {
      // Delete associated files
      if (masterclass.coachImage) {
        await deleteFileByUrl(masterclass.coachImage);
      }
      if (masterclass.videoUrl) {
        await deleteFileByUrl(masterclass.videoUrl);
      }
    }

    // Delete the document
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Error deleting masterclass:', error);
    throw error;
  }
}

/**
 * Add a drill to a masterclass
 * @param {string} masterclassId - Masterclass document ID
 * @param {string} drillId - Drill ID to add
 * @returns {Promise<void>}
 */
export async function addDrillToMasterclass(masterclassId, drillId) {
  try {
    const masterclass = await getMasterclass(masterclassId);

    if (!masterclass) {
      throw new Error('Masterclass not found');
    }

    const drillIds = masterclass.drillIds || [];

    // Check if drill already exists
    if (drillIds.includes(drillId)) {
      throw new Error('Drill already in masterclass');
    }

    await updateMasterclass(masterclassId, {
      drillIds: [...drillIds, drillId],
    });
  } catch (error) {
    console.error('Error adding drill to masterclass:', error);
    throw error;
  }
}

/**
 * Remove a drill from a masterclass
 * @param {string} masterclassId - Masterclass document ID
 * @param {string} drillId - Drill ID to remove
 * @returns {Promise<void>}
 */
export async function removeDrillFromMasterclass(masterclassId, drillId) {
  try {
    const masterclass = await getMasterclass(masterclassId);

    if (!masterclass) {
      throw new Error('Masterclass not found');
    }

    const drillIds = (masterclass.drillIds || []).filter((id) => id !== drillId);

    await updateMasterclass(masterclassId, {
      drillIds,
    });
  } catch (error) {
    console.error('Error removing drill from masterclass:', error);
    throw error;
  }
}

/**
 * Reorder drills in a masterclass
 * @param {string} masterclassId - Masterclass document ID
 * @param {Array} newDrillIds - Array of drill IDs in new order
 * @returns {Promise<void>}
 */
export async function reorderMasterclassDrills(masterclassId, newDrillIds) {
  try {
    await updateMasterclass(masterclassId, { drillIds: newDrillIds });
  } catch (error) {
    console.error('Error reordering masterclass drills:', error);
    throw error;
  }
}

/**
 * Toggle masterclass active status
 * @param {string} id - Masterclass document ID
 * @param {boolean} isActive - New active status
 * @returns {Promise<void>}
 */
export async function toggleMasterclassActive(id, isActive) {
  try {
    await updateMasterclass(id, { isActive });
  } catch (error) {
    console.error('Error toggling masterclass active status:', error);
    throw error;
  }
}
