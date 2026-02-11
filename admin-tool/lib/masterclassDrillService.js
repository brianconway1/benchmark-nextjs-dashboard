// lib/masterclassDrillService.js
// CRUD operations for masterclass drills (separate from benchmark drills)

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

const COLLECTION = 'masterclass_drills';

/**
 * Get all masterclass drills
 * @returns {Promise<Array>} - Array of drill objects with id
 */
export async function getAllMasterclassDrills() {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching masterclass drills:', error);
    throw error;
  }
}

/**
 * Get a single masterclass drill by ID
 * @param {string} id - Drill document ID
 * @returns {Promise<Object|null>} - Drill object or null
 */
export async function getMasterclassDrill(id) {
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
    console.error('Error fetching masterclass drill:', error);
    throw error;
  }
}

/**
 * Create a new masterclass drill
 * @param {Object} drillData - Drill data (without id)
 * @returns {Promise<Object>} - Created drill with id
 */
export async function createMasterclassDrill(drillData) {
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
    console.error('Error creating masterclass drill:', error);
    throw error;
  }
}

/**
 * Update an existing masterclass drill
 * @param {string} id - Drill document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated drill
 */
export async function updateMasterclassDrill(id, updates) {
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
    console.error('Error updating masterclass drill:', error);
    throw error;
  }
}

/**
 * Delete a masterclass drill and its associated files
 * @param {string} id - Drill document ID
 */
export async function deleteMasterclassDrill(id) {
  try {
    // Get the drill to find associated files
    const drill = await getMasterclassDrill(id);

    if (drill) {
      // Delete associated files
      if (drill.image) {
        await deleteFileByUrl(drill.image);
      }
      if (drill.video) {
        await deleteFileByUrl(drill.video);
      }
    }

    // Delete the document
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Error deleting masterclass drill:', error);
    throw error;
  }
}

/**
 * Duplicate a masterclass drill
 * @param {string} id - Drill document ID to duplicate
 * @returns {Promise<Object>} - New drill with id
 */
export async function duplicateMasterclassDrill(id) {
  try {
    const original = await getMasterclassDrill(id);

    if (!original) {
      throw new Error('Drill not found');
    }

    // Remove id and timestamps
    const { id: _, createdAt, updatedAt, ...drillData } = original;

    // Create copy with modified title
    return createMasterclassDrill({
      ...drillData,
      title: `${drillData.title || 'Drill'} (Copy)`,
    });
  } catch (error) {
    console.error('Error duplicating masterclass drill:', error);
    throw error;
  }
}
