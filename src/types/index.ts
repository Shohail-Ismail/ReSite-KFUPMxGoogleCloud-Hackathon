import { Timestamp } from 'firebase/firestore';

// Enums for type safety
export type MaterialType = 'steel_beam' | 'rebar' | 'concrete' | 'aggregates' | 'timber';

export type ConditionType = 'unused' | 'slightly_used' | 'used';

export type QuantityUnit = 'tonnes' | 'm3' | 'linear_m' | 'bags';

export type ListingStatus = 'active' | 'reserved' | 'completed' | 'cancelled';

export type RequestStatus = 'open' | 'matched' | 'closed';

export type UrgencyLevel = 'low' | 'medium' | 'high';

export type UserRole = 'admin' | 'standard';

export type MatchStatus = 'suggested' | 'accepted' | 'rejected';

// Location interface
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

// Onboarding status
export type OnboardingStatus = 'pending' | 'completed' | 'rejected';

// User interface
export interface User {
  id: string;
  displayName: string;
  email: string;
  organisationId: string;
  role: UserRole;
  phone?: string;
  country?: string;
  // KYC-lite onboarding fields
  onboardingStatus: OnboardingStatus;
  idDocumentUrl?: string;
  onboardingCompletedAt?: Timestamp;
  // Trust & reputation fields
  trustScore?: number; // 0-5 rating
  totalRatings?: number;
  responseRate?: number; // 0-100 percentage
  avgResponseTime?: number; // in hours
  verifiedSeller?: boolean;
  verifiedBuyer?: boolean;
  completedTransactions?: number;
}

// User rating/review interface
export interface UserRating {
  id: string;
  ratedUserId: string;
  raterUserId: string;
  rating: number; // 1-5
  review?: string;
  transactionType: 'listing' | 'request';
  transactionId: string;
  createdAt: Timestamp;
}

// Organisation interface (future KYC-lite)
export interface Organisation {
  id: string;
  name: string;
  registrationNumber?: string;
  address: string;
  verified: boolean;
}

// Listing interface (surplus materials)
export interface Listing {
  id: string;
  organisationId: string;
  createdByUserId: string;
  materialType: MaterialType;
  title: string;
  description: string;
  quantityValue: number;
  quantityUnit: QuantityUnit;
  condition: ConditionType;
  location: Location;
  imageUrl?: string;
  status: ListingStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // AI classification fields
  aiMaterialType?: MaterialType;
  aiConfidence?: number; // 0-1
  aiDescription?: string;
  aiVersion?: string; // e.g., "v0.1_heuristic" or "v0.2_gemini"
  // Future fields (hooks for moderation)
  isFlagged?: boolean;
  flagReason?: string;
}

// Request interface (buyer needs)
export interface Request {
  id: string;
  organisationId: string;
  createdByUserId: string;
  materialType: MaterialType;
  title: string;
  description: string;
  quantityValue: number;
  quantityUnit: QuantityUnit;
  location: Location;
  urgency: UrgencyLevel;
  status: RequestStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Future fields (hooks for moderation)
  isFlagged?: boolean;
  flagReason?: string;
}

// Match interface (future AI matching)
export interface Match {
  id: string;
  requestId: string;
  listingId: string;
  score: number; // 0-1
  distanceKm: number;
  co2SavedKg: number;
  status: MatchStatus;
  createdAt: Timestamp;
}

// Form data types (without Firestore Timestamp)
export interface ListingFormData {
  materialType: MaterialType;
  title: string;
  description: string;
  quantityValue: number;
  quantityUnit: QuantityUnit;
  condition: ConditionType;
  location: Location;
  image?: File;
}

export interface RequestFormData {
  materialType: MaterialType;
  title: string;
  description: string;
  quantityValue: number;
  quantityUnit: QuantityUnit;
  location: Location;
  urgency: UrgencyLevel;
}
