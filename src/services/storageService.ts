/**
 * Firebase Storage Service
 * 
 * Handles image uploads for listings and ID documents.
 * Enforces size limits and file type validation.
 */

import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { storage } from '@/config/firebase';

const STORAGE_PATHS = {
  listingImages: 'listing-images',
  idDocuments: 'id-documents',
};

// Constants for ID document validation
const MAX_ID_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_ID_FILE_TYPES = ['image/jpeg', 'image/png'];
const MAX_TOTAL_ID_UPLOADS = 10;

// Constants for listing image validation
const MAX_LISTING_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_LISTING_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_TOTAL_LISTING_UPLOADS = 20; // Demo limit

/**
 * Validate listing image before upload
 */
function validateListingImage(file: File): void {
  if (!ALLOWED_LISTING_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed for listings');
  }
  
  if (file.size > MAX_LISTING_IMAGE_SIZE_BYTES) {
    throw new Error('Listing image must be less than 5MB');
  }
}

/**
 * Get the current count of listing images in storage
 * Used to enforce the demo limit of 20 total uploads
 */
export async function getListingImageCount(): Promise<number> {
  try {
    const listRef = ref(storage, STORAGE_PATHS.listingImages);
    const result = await listAll(listRef);
    return result.items.length;
  } catch (error) {
    // If folder doesn't exist yet, count is 0
    return 0;
  }
}

/**
 * Upload a listing image and return the download URL
 * Enforces 5MB size limit and 20 total image limit for demo
 */
export async function uploadListingImage(
  file: File,
  listingId: string
): Promise<string> {
  // Validate file
  validateListingImage(file);
  
  // Check global upload limit for demo
  const currentCount = await getListingImageCount();
  if (currentCount >= MAX_TOTAL_LISTING_UPLOADS) {
    throw new Error('Maximum listing image uploads reached for demo. Please contact support.');
  }
  
  const timestamp = Date.now();
  const fileName = `${listingId}_${timestamp}_${file.name}`;
  const storageRef = ref(storage, `${STORAGE_PATHS.listingImages}/${fileName}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
}

/**
 * Validate ID document file before upload
 */
function validateIdDocument(file: File): void {
  if (!ALLOWED_ID_FILE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG and PNG images are allowed for ID documents');
  }
  
  if (file.size > MAX_ID_FILE_SIZE_BYTES) {
    throw new Error('ID document must be less than 2MB');
  }
}

/**
 * Get the current count of ID documents in storage
 * Used to enforce the MVP limit of 10 total uploads
 */
export async function getIdDocumentCount(): Promise<number> {
  try {
    const listRef = ref(storage, STORAGE_PATHS.idDocuments);
    const result = await listAll(listRef);
    return result.items.length;
  } catch (error) {
    // If folder doesn't exist yet, count is 0
    return 0;
  }
}

/**
 * Upload an ID document for KYC-lite verification
 * Enforces frontend validation for file type and size
 * Also checks global upload limit for MVP
 */
export async function uploadIdDocument(
  file: File,
  userId: string
): Promise<string> {
  // Validate file
  validateIdDocument(file);
  
  // Check global upload limit
  const currentCount = await getIdDocumentCount();
  if (currentCount >= MAX_TOTAL_ID_UPLOADS) {
    throw new Error('Maximum ID document uploads reached for this MVP. Please contact support.');
  }
  
  const timestamp = Date.now();
  const extension = file.type === 'image/jpeg' ? 'jpg' : 'png';
  const fileName = `${userId}_${timestamp}.${extension}`;
  const storageRef = ref(storage, `${STORAGE_PATHS.idDocuments}/${fileName}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
}
