import { collection, addDoc, getDocs, doc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

/**
 * Delete image from Firebase Storage given a drill's image URL
 */
const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl || imageUrl === 'null' || imageUrl === 'Not set') {
    return;
  }

  try {
    let storagePath = imageUrl;

    if (imageUrl.includes('firebasestorage.googleapis.com')) {
      const match = imageUrl.match(/\/o\/(.+?)\?/);
      if (match) {
        storagePath = decodeURIComponent(match[1]);
      }
    }

    console.log(`🗑️ Deleting image from Storage: ${storagePath}`);
    const imageRef = ref(storage, storagePath);
    await deleteObject(imageRef);
    console.log(`✅ Deleted image: ${storagePath}`);
  } catch (error) {
    console.warn(`⚠️ Could not delete image from Storage:`, error);
  }
};

interface ImportOptions {
  to: 'club' | 'team' | 'benchmark';
  clubId?: string;
  teamId?: string;
}

interface DrillData {
  id?: string;
  title?: string;
  [key: string]: unknown;
}

/**
 * Import drills from JSON data to Firestore
 */
export const importDrillsFromJson = async (drillsJson: DrillData[], options: ImportOptions): Promise<DrillData[]> => {
  try {
    const { to, clubId, teamId } = options;

    if (!to || !(to === 'club' || to === 'team' || to === 'benchmark')) {
      throw new Error('Invalid "to" parameter. Must be "club", "team", or "benchmark"');
    }

    if (to === 'club' && !clubId) {
      throw new Error('clubId is required when to="club"');
    }

    if (to === 'team' && !teamId) {
      throw new Error('teamId is required when to="team"');
    }

    let collectionName: string;
    if (to === 'club') {
      collectionName = 'club_drills';
    } else if (to === 'team') {
      collectionName = 'team_drills';
    } else {
      collectionName = 'benchmark_drills';
    }

    console.log(`📤 Importing ${drillsJson.length} drills to ${collectionName}...`);

    const createdDrills = [];

    for (const drill of drillsJson) {
      try {
        const drillData: DrillData & { clubId?: string; teamId?: string; createdAt: unknown; updatedAt: unknown } = {
          ...drill,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (to === 'club') {
          drillData.clubId = clubId;
        } else if (to === 'team') {
          drillData.teamId = teamId;
        }

        const docRef = await addDoc(collection(db, collectionName), drillData);
        createdDrills.push({ id: docRef.id, ...drillData });
        console.log(`✅ Saved drill: ${drill.title || drill.id || 'Untitled'}`);
      } catch (error) {
        console.error(`❌ Failed to save drill:`, error);
      }
    }

    console.log(`✅ Imported ${createdDrills.length} drills to ${collectionName}`);
    return createdDrills;
  } catch (error) {
    console.error('❌ Error importing drills:', error);
    throw error;
  }
};

/**
 * Clear all benchmark drills
 */
export const clearBenchmarkDrills = async (): Promise<void> => {
  try {
    const snapshot = await getDocs(collection(db, 'benchmark_drills'));

    for (const drillDoc of snapshot.docs) {
      const drillData = drillDoc.data();
      if (drillData.image) {
        await deleteImageFromStorage(drillData.image);
      }
      await deleteDoc(doc(db, 'benchmark_drills', drillDoc.id));
    }

    console.log(`✅ Cleared ${snapshot.size} benchmark drills`);
  } catch (error) {
    console.error('❌ Error clearing benchmark drills:', error);
    throw error;
  }
};

/**
 * Clear all drills for a specific club
 */
export const clearClubDrills = async (clubId: string): Promise<void> => {
  try {
    const snapshot = await getDocs(query(collection(db, 'club_drills'), where('clubId', '==', clubId)));

    for (const drillDoc of snapshot.docs) {
      const drillData = drillDoc.data();
      if (drillData.image) {
        await deleteImageFromStorage(drillData.image);
      }
      await deleteDoc(doc(db, 'club_drills', drillDoc.id));
    }

    console.log(`✅ Cleared ${snapshot.size} club drills for club ${clubId}`);
  } catch (error) {
    console.error('❌ Error clearing club drills:', error);
    throw error;
  }
};

/**
 * Clear all drills for a specific team
 */
export const clearTeamDrills = async (teamId: string): Promise<void> => {
  try {
    const snapshot = await getDocs(query(collection(db, 'team_drills'), where('teamId', '==', teamId)));

    for (const drillDoc of snapshot.docs) {
      const drillData = drillDoc.data();
      if (drillData.image) {
        await deleteImageFromStorage(drillData.image);
      }
      await deleteDoc(doc(db, 'team_drills', drillDoc.id));
    }

    console.log(`✅ Cleared ${snapshot.size} team drills for team ${teamId}`);
  } catch (error) {
    console.error('❌ Error clearing team drills:', error);
    throw error;
  }
};

