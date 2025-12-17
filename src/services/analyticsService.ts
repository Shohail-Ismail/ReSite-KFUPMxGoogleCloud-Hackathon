/**
 * Analytics Service
 * 
 * Handles user event logging and match event logging for RL pipeline.
 * Events are stored in Firestore for future analysis and algorithm training.
 */

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

// ============ USER EVENTS ============

// Event types for RL algorithm pipeline
type UserEventType = 
  | 'onboarding_completed'
  | 'profile_updated'
  | 'id_uploaded'
  | 'listing_created'
  | 'request_created'
  | 'match_accepted'
  | 'match_rejected'
  | 'user_contacted'
  | 'user_rated'
  | 'contact_clicked';

interface UserEvent {
  userId: string;
  eventType: UserEventType;
  metadata?: Record<string, unknown>;
  timestamp: Timestamp;
}

const EVENTS_COLLECTION = 'user_events';
const MATCH_EVENTS_COLLECTION = 'match_events';

// Core logging function for user events
async function logUserEvent(
  userId: string,
  eventType: UserEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const event: UserEvent = {
      userId,
      eventType,
      metadata,
      timestamp: Timestamp.now(),
    };
    
    await addDoc(collection(db, EVENTS_COLLECTION), event);
    console.log(`[Analytics] Logged event: ${eventType} for user: ${userId}`);
  } catch (error) {
    // Silent fail for analytics - don't block user actions
    console.error('[Analytics] Failed to log event:', error);
  }
}

// Placeholder functions for RL pipeline
export async function logOnboardingCompleted(userId: string): Promise<void> {
  await logUserEvent(userId, 'onboarding_completed');
}

export async function logProfileUpdated(userId: string, changes?: Record<string, unknown>): Promise<void> {
  await logUserEvent(userId, 'profile_updated', changes);
}

export async function logIdUploaded(userId: string, fileType?: string): Promise<void> {
  await logUserEvent(userId, 'id_uploaded', { fileType });
}

export async function logListingCreated(userId: string, listingId: string): Promise<void> {
  await logUserEvent(userId, 'listing_created', { listingId });
}

export async function logRequestCreated(userId: string, requestId: string): Promise<void> {
  await logUserEvent(userId, 'request_created', { requestId });
}

export async function logMatchAccepted(userId: string, matchId: string): Promise<void> {
  await logUserEvent(userId, 'match_accepted', { matchId });
}

export async function logMatchRejected(userId: string, matchId: string): Promise<void> {
  await logUserEvent(userId, 'match_rejected', { matchId });
}

// ============ CONTACT & RATING EVENTS ============

/**
 * Log when a user clicks to contact another user
 */
export async function logContactClicked(
  userId: string,
  targetUserId: string,
  context: 'listing' | 'request',
  contextId: string
): Promise<void> {
  await logUserEvent(userId, 'contact_clicked', {
    targetUserId,
    context,
    contextId,
  });
}

/**
 * Log when a user is contacted (for response rate tracking)
 */
export async function logUserContacted(
  contactedUserId: string,
  contactingUserId: string,
  method: 'email' | 'phone',
  context: 'listing' | 'request',
  contextId: string
): Promise<void> {
  await logUserEvent(contactedUserId, 'user_contacted', {
    contactingUserId,
    method,
    context,
    contextId,
  });
}

/**
 * Log when a user rates another user
 */
export async function logUserRated(
  raterId: string,
  ratedUserId: string,
  rating: number,
  transactionType: 'listing' | 'request',
  transactionId: string
): Promise<void> {
  await logUserEvent(raterId, 'user_rated', {
    ratedUserId,
    rating,
    transactionType,
    transactionId,
  });
}

// ============ CLASSIFICATION EVENTS (RL-Ready Logging) ============

/**
 * Classification event data for RL algorithm training
 */
export interface ClassificationEventData {
  listingId: string;
  aiMaterialType: string;
  aiConfidence: number;
  aiVersion: string;
  userMaterialType?: string; // Original user selection for comparison
  metadata?: Record<string, unknown>;
}

const CLASSIFICATION_EVENTS_COLLECTION = 'classification_events';

interface ClassificationEvent extends ClassificationEventData {
  timestamp: Timestamp;
  eventId: string;
}

/**
 * Log a classification event for RL training pipeline
 * Called whenever a listing is classified by AI
 */
export async function logClassificationEvent(data: ClassificationEventData): Promise<string | null> {
  try {
    const eventId = `classification_${data.listingId}_${Date.now()}`;
    
    const event: ClassificationEvent = {
      ...data,
      eventId,
      timestamp: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, CLASSIFICATION_EVENTS_COLLECTION), event);
    console.log(`[Analytics] Logged classification event: ${eventId}`);
    
    return docRef.id;
  } catch (error) {
    // Silent fail for analytics - don't block classification
    console.error('[Analytics] Failed to log classification event:', error);
    return null;
  }
}

// ============ MATCH EVENTS (RL-Ready Logging) ============

/**
 * Match event data for RL algorithm training
 */
export interface MatchEventData {
  requestId: string;
  listingId: string;
  score: number;
  distanceKm?: number;
  co2SavedKg?: number;
  accepted?: boolean;
  rejected?: boolean;
  metadata?: Record<string, unknown>;
}

interface MatchEvent extends MatchEventData {
  timestamp: Timestamp;
  eventId: string;
}

/**
 * Log a match event for RL training pipeline
 * Called on every match attempt, acceptance, or rejection
 */
export async function logMatchEvent(data: MatchEventData): Promise<string | null> {
  try {
    const eventId = `match_${data.requestId}_${data.listingId}_${Date.now()}`;
    
    const event: MatchEvent = {
      ...data,
      eventId,
      timestamp: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, MATCH_EVENTS_COLLECTION), event);
    console.log(`[Analytics] Logged match event: ${eventId}`);
    
    return docRef.id;
  } catch (error) {
    // Silent fail for analytics - don't block matching
    console.error('[Analytics] Failed to log match event:', error);
    return null;
  }
}

/**
 * Log match acceptance for RL feedback
 */
export async function logMatchAcceptance(
  requestId: string,
  listingId: string,
  score: number,
  userId: string
): Promise<void> {
  await Promise.all([
    logMatchEvent({
      requestId,
      listingId,
      score,
      accepted: true,
    }),
    logMatchAccepted(userId, `${requestId}_${listingId}`),
  ]);
}

/**
 * Log match rejection for RL feedback
 */
export async function logMatchRejection(
  requestId: string,
  listingId: string,
  score: number,
  userId: string,
  reason?: string
): Promise<void> {
  await Promise.all([
    logMatchEvent({
      requestId,
      listingId,
      score,
      rejected: true,
      metadata: reason ? { reason } : undefined,
    }),
    logMatchRejected(userId, `${requestId}_${listingId}`),
  ]);
}
