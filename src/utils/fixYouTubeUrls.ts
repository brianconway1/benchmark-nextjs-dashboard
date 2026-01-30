import { collection, getDocs, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { extractYouTubeId } from './bulkUpload';

interface FixResults {
  total: number;
  fixed: number;
}

export interface YouTubeFixResults {
  benchmark_drills: FixResults;
  club_drills: FixResults;
  team_drills: FixResults;
}

/**
 * Fix YouTube URLs and extract video IDs for all drills
 */
export const fixAllYouTubeUrls = async (): Promise<YouTubeFixResults> => {
  const results: YouTubeFixResults = {
    benchmark_drills: { total: 0, fixed: 0 },
    club_drills: { total: 0, fixed: 0 },
    team_drills: { total: 0, fixed: 0 },
  };

  // Fix benchmark drills
  try {
    const benchmarkSnapshot = await getDocs(collection(db, 'benchmark_drills'));
    results.benchmark_drills.total = benchmarkSnapshot.size;

    for (const drillDoc of benchmarkSnapshot.docs) {
      const drillData = drillDoc.data();
      let needsUpdate = false;
      const updates: Record<string, unknown> = {};

      // Fix YouTube URL
      if (drillData.youtubeUrl && drillData.youtubeUrl.startsWith('@')) {
        updates.youtubeUrl = drillData.youtubeUrl.replace(/^@/, '');
        needsUpdate = true;
      }

      // Extract and add YouTube video ID if missing
      const youtubeUrl = updates.youtubeUrl || drillData.youtubeUrl;
      if (youtubeUrl && !drillData.youtubeVideoId) {
        const videoId = extractYouTubeId(youtubeUrl);
        if (videoId) {
          updates.youtubeVideoId = videoId;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await updateDoc(doc(db, 'benchmark_drills', drillDoc.id), updates);
        results.benchmark_drills.fixed++;
      }
    }
  } catch (error) {
    console.error('Error fixing benchmark drills:', error);
  }

  // Fix club drills
  try {
    const clubSnapshot = await getDocs(collection(db, 'club_drills'));
    results.club_drills.total = clubSnapshot.size;

    for (const drillDoc of clubSnapshot.docs) {
      const drillData = drillDoc.data();
      let needsUpdate = false;
      const updates: Record<string, unknown> = {};

      if (drillData.youtubeUrl && drillData.youtubeUrl.startsWith('@')) {
        updates.youtubeUrl = drillData.youtubeUrl.replace(/^@/, '');
        needsUpdate = true;
      }

      const youtubeUrl = updates.youtubeUrl || drillData.youtubeUrl;
      if (youtubeUrl && !drillData.youtubeVideoId) {
        const videoId = extractYouTubeId(youtubeUrl);
        if (videoId) {
          updates.youtubeVideoId = videoId;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await updateDoc(doc(db, 'club_drills', drillDoc.id), updates);
        results.club_drills.fixed++;
      }
    }
  } catch (error) {
    console.error('Error fixing club drills:', error);
  }

  // Fix team drills
  try {
    const teamSnapshot = await getDocs(collection(db, 'team_drills'));
    results.team_drills.total = teamSnapshot.size;

    for (const drillDoc of teamSnapshot.docs) {
      const drillData = drillDoc.data();
      let needsUpdate = false;
      const updates: Record<string, unknown> = {};

      if (drillData.youtubeUrl && drillData.youtubeUrl.startsWith('@')) {
        updates.youtubeUrl = drillData.youtubeUrl.replace(/^@/, '');
        needsUpdate = true;
      }

      const youtubeUrl = updates.youtubeUrl || drillData.youtubeUrl;
      if (youtubeUrl && !drillData.youtubeVideoId) {
        const videoId = extractYouTubeId(youtubeUrl);
        if (videoId) {
          updates.youtubeVideoId = videoId;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await updateDoc(doc(db, 'team_drills', drillDoc.id), updates);
        results.team_drills.fixed++;
      }
    }
  } catch (error) {
    console.error('Error fixing team drills:', error);
  }

  return results;
};

