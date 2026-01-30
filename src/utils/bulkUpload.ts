import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Extract YouTube video ID from various URL formats
 */
export const extractYouTubeId = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const cleanUrl = url.replace(/^@/, '').trim();

    // Pattern 1: youtu.be/VIDEO_ID
    let match = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    // Pattern 2: youtube.com/watch?v=VIDEO_ID
    match = cleanUrl.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    // Pattern 3: youtube.com/shorts/VIDEO_ID
    match = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    // Pattern 4: youtube.com/embed/VIDEO_ID
    match = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    // Pattern 5: youtube.com/v/VIDEO_ID
    match = cleanUrl.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    return null;
  } catch (error) {
    console.warn('Failed to extract YouTube ID:', error);
    return null;
  }
};

/**
 * Upload an image file to Firebase Storage for bulk upload
 */
export const uploadImageForBulkUpload = async (imageFile: File, ownerId: string): Promise<string> => {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${imageFile.name}`;
    const storagePath = `drills/bulk_upload/${ownerId}/${fileName}`;

    const storageRef = ref(storage, storagePath);

    console.log(`📤 Uploading image to: ${storagePath}`);
    console.log(`📦 File size: ${(imageFile.size / 1024).toFixed(2)}KB`);

    await uploadBytes(storageRef, imageFile);

    const downloadURL = await getDownloadURL(storageRef);
    console.log(`✅ Image uploaded successfully: ${downloadURL}`);

    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
};

/**
 * Find matching image for a drill by ID patterns
 */
export const findImageForDrill = (
  drillId: string,
  imageFileName: string | null | undefined,
  imageFiles: File[]
): File | null => {
  if (!imageFiles || imageFiles.length === 0) {
    return null;
  }

  const patterns = [
    `drill_${drillId}.png`,
    `drill_${drillId}.jpg`,
    `drill_${drillId}.jpeg`,
    `${drillId}.png`,
    `${drillId}.jpg`,
    `${drillId}.jpeg`,
  ];

  if (imageFileName) {
    const exactMatch = imageFiles.find((file) => file.name === imageFileName);
    if (exactMatch) {
      return exactMatch;
    }
  }

  for (const pattern of patterns) {
    const match = imageFiles.find((file) => file.name.toLowerCase() === pattern.toLowerCase());
    if (match) {
      return match;
    }
  }

  return null;
};

/**
 * Process raw drill data for upload to Firestore
 */
interface DrillInput {
  youtubeUrl?: string;
  videoUrl?: string;
  [key: string]: unknown;
}

export const processDrillForUpload = (drill: DrillInput, teamId: string | null): Record<string, unknown> => {
  const rawYouTubeUrl = drill.youtubeUrl || drill.videoUrl;
  const cleanYouTubeUrl = rawYouTubeUrl ? rawYouTubeUrl.replace(/^@/, '').trim() : null;
  const youtubeVideoId = extractYouTubeId(cleanYouTubeUrl);

  return {
    id: drill.id,
    title: drill.title || 'Untitled Drill',
    description: drill.description || drill.Description || '',
    progressions: drill.Progressions || drill.progressions || '',
    duration: drill.duration || drill['Recommended Duration'] || 'TBC',
    groupSize: drill.groupSize || drill['Group Size'] || '',
    spaceRequired: drill.spaceRequired || drill['Min Space R'] || drill['Min Space Required'] || 'TBC',
    section: drill.section || drill['Recommend section'] || 'TBC',
    intensity: drill.intensity || 'Medium',
    sport: drill.Sport || drill.sport || '',
    ageGroups: Array.isArray(drill.ageGroups)
      ? drill.ageGroups
      : typeof drill.ageGroups === 'string'
      ? drill.ageGroups.split(',').map((s: string) => s.trim())
      : [],
    skillFocus: Array.isArray(drill.skillFocus)
      ? drill.skillFocus
      : typeof drill.skillFocus === 'string'
      ? drill.skillFocus.split(',').map((s: string) => s.trim())
      : [],
    notes: drill.notes || drill.coachesNotes || drill['coachesNote Column 1'] || '',
    youtubeUrl: cleanYouTubeUrl,
    youtubeVideoId: youtubeVideoId,
    imageFileName: drill.imageFileName || '',
    teamId: teamId || null,
    uploadedAt: new Date(),
    uploadedVia: 'bulk_upload',
  };
};

