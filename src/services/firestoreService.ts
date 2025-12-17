/**
 * Firestore Service Layer
 * 
 * This service abstracts all Firestore operations.
 * Future: Can be replaced with Cloud Functions/Cloud Run API calls
 * without changing UI components.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type {
  User,
  Organisation,
  Listing,
  Request,
  Match,
  ListingFormData,
  RequestFormData,
  MaterialType,
  UserRating,
} from '@/types';

// Collection names
const COLLECTIONS = {
  users: 'users',
  organisations: 'organisations',
  listings: 'listings',
  requests: 'requests',
  matches: 'matches',
  userRatings: 'user_ratings',
};

// ============ USER OPERATIONS ============

export async function createUser(userId: string, userData: Omit<User, 'id'>): Promise<void> {
  const userRef = doc(db, COLLECTIONS.users, userId);
  await updateDoc(userRef, userData as DocumentData);
}

export async function getUser(userId: string): Promise<User | null> {
  const userRef = doc(db, COLLECTIONS.users, userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() } as User;
  }
  return null;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  const userRef = doc(db, COLLECTIONS.users, userId);
  await updateDoc(userRef, updates as DocumentData);
}

// ============ USER RATING OPERATIONS ============

export async function createUserRating(
  ratingData: Omit<UserRating, 'id' | 'createdAt'>
): Promise<string> {
  const rating = {
    ...ratingData,
    createdAt: Timestamp.now(),
  };
  
  const ratingRef = await addDoc(collection(db, COLLECTIONS.userRatings), rating);
  
  // Update the rated user's trust score
  await recalculateUserTrustScore(ratingData.ratedUserId);
  
  return ratingRef.id;
}

export async function getUserRatings(userId: string): Promise<UserRating[]> {
  const q = query(
    collection(db, COLLECTIONS.userRatings),
    where('ratedUserId', '==', userId)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as UserRating[];
}

async function recalculateUserTrustScore(userId: string): Promise<void> {
  const ratings = await getUserRatings(userId);
  
  if (ratings.length === 0) return;
  
  const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  
  await updateUser(userId, {
    trustScore: Math.round(avgRating * 10) / 10,
    totalRatings: ratings.length,
  });
}

// ============ ORGANISATION OPERATIONS ============

export async function createOrganisation(orgData: Omit<Organisation, 'id'>): Promise<string> {
  const orgRef = await addDoc(collection(db, COLLECTIONS.organisations), orgData);
  return orgRef.id;
}

export async function getOrganisation(orgId: string): Promise<Organisation | null> {
  const orgRef = doc(db, COLLECTIONS.organisations, orgId);
  const orgSnap = await getDoc(orgRef);
  
  if (orgSnap.exists()) {
    return { id: orgSnap.id, ...orgSnap.data() } as Organisation;
  }
  return null;
}

export async function updateOrganisation(orgId: string, updates: Partial<Organisation>): Promise<void> {
  const orgRef = doc(db, COLLECTIONS.organisations, orgId);
  await updateDoc(orgRef, updates as DocumentData);
}

export async function getAllOrganisations(): Promise<Organisation[]> {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.organisations));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Organisation[];
}

// ============ LISTING OPERATIONS ============

export interface AIClassificationFields {
  aiMaterialType?: MaterialType;
  aiConfidence?: number;
  aiDescription?: string;
  aiVersion?: string;
}

export async function createListing(
  listingData: ListingFormData,
  organisationId: string,
  userId: string,
  imageUrl?: string,
  aiFields?: AIClassificationFields
): Promise<string> {
  const now = Timestamp.now();
  
  const listing = {
    ...listingData,
    organisationId,
    createdByUserId: userId,
    imageUrl: imageUrl || null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    // AI classification fields (if provided)
    ...(aiFields || {}),
  };
  
  const listingRef = await addDoc(collection(db, COLLECTIONS.listings), listing);
  return listingRef.id;
}

/**
 * Update listing with AI classification fields
 */
export async function updateListingAIFields(
  listingId: string, 
  aiFields: AIClassificationFields
): Promise<void> {
  const listingRef = doc(db, COLLECTIONS.listings, listingId);
  await updateDoc(listingRef, {
    ...aiFields,
    updatedAt: Timestamp.now()
  } as DocumentData);
}

export async function getListing(listingId: string): Promise<Listing | null> {
  const listingRef = doc(db, COLLECTIONS.listings, listingId);
  const listingSnap = await getDoc(listingRef);
  
  if (listingSnap.exists()) {
    return { id: listingSnap.id, ...listingSnap.data() } as Listing;
  }
  return null;
}

export async function getListingsByOrganisation(organisationId: string): Promise<Listing[]> {
  const q = query(
    collection(db, COLLECTIONS.listings),
    where('organisationId', '==', organisationId)
  );
  
  const querySnapshot = await getDocs(q);
  const listings = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Listing[];
  
  // Sort client-side to avoid requiring composite index
  return listings.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function getAllActiveListings(): Promise<Listing[]> {
  const q = query(
    collection(db, COLLECTIONS.listings),
    where('status', '==', 'active')
  );
  
  const querySnapshot = await getDocs(q);
  const listings = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Listing[];
  
  // Sort client-side to avoid requiring composite index
  return listings.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function getListingsByMaterial(materialType: MaterialType): Promise<Listing[]> {
  const q = query(
    collection(db, COLLECTIONS.listings),
    where('materialType', '==', materialType),
    where('status', '==', 'active')
  );
  
  const querySnapshot = await getDocs(q);
  const listings = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Listing[];
  
  // Sort client-side to avoid requiring composite index
  return listings.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

/**
 * Alias for getListingsByMaterial for consistency with service naming
 */
export const queryListingsByMaterialType = getListingsByMaterial;

/**
 * Get all listings (for admin purposes)
 */
export async function getAllListings(): Promise<Listing[]> {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.listings));
  const listings = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Listing[];
  
  return listings.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

/**
 * Get all requests (for admin purposes)
 */
export async function getAllRequests(): Promise<Request[]> {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.requests));
  const requests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Request[];
  
  return requests.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function updateListing(listingId: string, updates: Partial<Listing>): Promise<void> {
  const listingRef = doc(db, COLLECTIONS.listings, listingId);
  await updateDoc(listingRef, {
    ...updates,
    updatedAt: Timestamp.now()
  } as DocumentData);
}

// ============ REQUEST OPERATIONS ============

export async function createRequest(
  requestData: RequestFormData,
  organisationId: string,
  userId: string
): Promise<string> {
  const now = Timestamp.now();
  
  const request = {
    ...requestData,
    organisationId,
    createdByUserId: userId,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
  
  const requestRef = await addDoc(collection(db, COLLECTIONS.requests), request);
  return requestRef.id;
}

export async function getRequest(requestId: string): Promise<Request | null> {
  const requestRef = doc(db, COLLECTIONS.requests, requestId);
  const requestSnap = await getDoc(requestRef);
  
  if (requestSnap.exists()) {
    return { id: requestSnap.id, ...requestSnap.data() } as Request;
  }
  return null;
}

export async function getRequestsByOrganisation(organisationId: string): Promise<Request[]> {
  const q = query(
    collection(db, COLLECTIONS.requests),
    where('organisationId', '==', organisationId)
  );
  
  const querySnapshot = await getDocs(q);
  const requests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Request[];
  
  // Sort client-side to avoid requiring composite index
  return requests.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function getAllOpenRequests(): Promise<Request[]> {
  const q = query(
    collection(db, COLLECTIONS.requests),
    where('status', '==', 'open')
  );
  
  const querySnapshot = await getDocs(q);
  const requests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Request[];
  
  // Sort client-side to avoid requiring composite index
  return requests.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function getRequestsByMaterial(materialType: MaterialType): Promise<Request[]> {
  const q = query(
    collection(db, COLLECTIONS.requests),
    where('materialType', '==', materialType),
    where('status', '==', 'open')
  );
  
  const querySnapshot = await getDocs(q);
  const requests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Request[];
  
  // Sort client-side to avoid requiring composite index
  return requests.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function updateRequest(requestId: string, updates: Partial<Request>): Promise<void> {
  const requestRef = doc(db, COLLECTIONS.requests, requestId);
  await updateDoc(requestRef, {
    ...updates,
    updatedAt: Timestamp.now()
  } as DocumentData);
}

// ============ MATCH OPERATIONS (Future Implementation) ============

/**
 * TODO: Implement AI-powered matching logic
 * This will be called from Cloud Functions/Cloud Run
 * For now, this is a placeholder
 */
export async function createMatch(matchData: Omit<Match, 'id'>): Promise<string> {
  const matchRef = await addDoc(collection(db, COLLECTIONS.matches), matchData);
  return matchRef.id;
}

export async function getMatchesForRequest(requestId: string): Promise<Match[]> {
  const q = query(
    collection(db, COLLECTIONS.matches),
    where('requestId', '==', requestId)
  );
  
  const querySnapshot = await getDocs(q);
  const matches = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Match[];
  
  // Sort client-side to avoid requiring composite index
  return matches.sort((a, b) => (b.score || 0) - (a.score || 0));
}
