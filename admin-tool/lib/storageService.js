// lib/storageService.js
// Firebase Storage upload utilities - no file size limits for super admin

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a file to Firebase Storage with progress tracking
 * @param {File} file - The file to upload
 * @param {string} path - Storage path (e.g., 'benchmark_drills/abc123/image.jpg')
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - Download URL
 */
export async function uploadFile(file, path, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Upload a drill image
 * @param {File} file - Image file
 * @param {string} drillId - Drill document ID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} - Download URL
 */
export async function uploadDrillImage(file, drillId, onProgress = () => {}) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `benchmark_drills/${drillId}/image.${ext}`;
  return uploadFile(file, path, onProgress);
}

/**
 * Upload a drill video
 * @param {File} file - Video file
 * @param {string} drillId - Drill document ID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} - Download URL
 */
export async function uploadDrillVideo(file, drillId, onProgress = () => {}) {
  const ext = file.name.split('.').pop() || 'mp4';
  const path = `benchmark_drills/${drillId}/video.${ext}`;
  return uploadFile(file, path, onProgress);
}

/**
 * Upload a masterclass drill image
 * @param {File} file - Image file
 * @param {string} drillId - Masterclass drill document ID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} - Download URL
 */
export async function uploadMasterclassDrillImage(file, drillId, onProgress = () => {}) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `masterclass_drills/${drillId}/image.${ext}`;
  return uploadFile(file, path, onProgress);
}

/**
 * Upload a masterclass drill video
 * @param {File} file - Video file
 * @param {string} drillId - Masterclass drill document ID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} - Download URL
 */
export async function uploadMasterclassDrillVideo(file, drillId, onProgress = () => {}) {
  const ext = file.name.split('.').pop() || 'mp4';
  const path = `masterclass_drills/${drillId}/video.${ext}`;
  return uploadFile(file, path, onProgress);
}

/**
 * Upload a masterclass cover image
 * @param {File} file - Image file
 * @param {string} masterclassId - Masterclass document ID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} - Download URL
 */
export async function uploadMasterclassCover(file, masterclassId, onProgress = () => {}) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `masterclasses/${masterclassId}/cover.${ext}`;
  return uploadFile(file, path, onProgress);
}

/**
 * Upload a masterclass main video
 * @param {File} file - Video file
 * @param {string} masterclassId - Masterclass document ID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} - Download URL
 */
export async function uploadMasterclassVideo(file, masterclassId, onProgress = () => {}) {
  const ext = file.name.split('.').pop() || 'mp4';
  const path = `masterclasses/${masterclassId}/main-video.${ext}`;
  return uploadFile(file, path, onProgress);
}

/**
 * Delete a file from Firebase Storage
 * @param {string} url - The download URL of the file to delete
 */
export async function deleteFileByUrl(url) {
  if (!url || !url.includes('firebase')) return;

  try {
    // Extract the path from the URL
    const decodedUrl = decodeURIComponent(url);
    const pathMatch = decodedUrl.match(/\/o\/(.+?)\?/);
    if (pathMatch && pathMatch[1]) {
      const path = pathMatch[1];
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
    }
  } catch (error) {
    console.warn('Failed to delete file:', error);
    // Don't throw - file might already be deleted
  }
}

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
export function extractYouTubeVideoId(url) {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get YouTube thumbnail URL
 * @param {string} videoId - YouTube video ID
 * @returns {string} - Thumbnail URL
 */
export function getYouTubeThumbnail(videoId) {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
