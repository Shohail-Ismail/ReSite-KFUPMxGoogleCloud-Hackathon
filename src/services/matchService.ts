/**
 * Matching Service
 * 
 * Implements intelligent matching between requests and listings
 * with modular scoring, distance calculation, and CO2 savings estimation.
 * 
 * Features:
 * - Pluggable scoring function (ready for AI/RL replacement)
 * - Configurable weights (no hard-coded values)
 * - Score breakdown for UI transparency
 * - CO2 impact calculation
 * 
 * Future enhancements:
 * - Gemini multimodal API for material classification
 * - Vertex AI for embeddings-based similarity
 * - Cloud Functions/Cloud Run for serverless execution
 */

import type { Request, Listing, Match, MaterialType, ConditionType, UrgencyLevel } from '@/types';
import { getAllActiveListings, getListing } from './firestoreService';
import { calculateDistanceHaversine, getBatchDistances } from './mapsService';
import { logMatchEvent } from './analyticsService';
import { Timestamp } from 'firebase/firestore';

// ============ CONFIGURATION ============

/**
 * Scoring weights configuration - easily adjustable for tuning
 * Weights should sum to approximately 1.0
 */
export interface ScoringWeights {
  materialMatch: number;
  quantityFit: number;
  distance: number;
  condition: number;
  urgency: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  materialMatch: 0.40, // 40% - material must match
  quantityFit: 0.25,   // 25% - quantity compatibility
  distance: 0.20,      // 20% - proximity bonus
  condition: 0.10,     // 10% - condition quality
  urgency: 0.05,       // 5%  - urgency priority
};

/**
 * Condition scores - higher is better
 */
const CONDITION_SCORES: Record<ConditionType, number> = {
  unused: 1.0,
  slightly_used: 0.8,
  used: 0.5,
};

/**
 * Urgency bonus scores
 */
const URGENCY_SCORES: Record<UrgencyLevel, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.2,
};

/**
 * Embodied carbon data (kg CO2 per tonne) - industry averages
 * Source: ICE Database, World Steel Association
 */
const EMBODIED_CARBON_KG_PER_TONNE: Record<MaterialType, number> = {
  steel_beam: 1850,  // Primary steel production
  rebar: 1720,       // Reinforcement steel
  concrete: 130,     // Ready-mix concrete
  aggregates: 5,     // Crushed stone/gravel
  timber: -900,      // Negative = carbon sequestration (sustainably sourced)
};

/**
 * Transport emissions (kg CO2 per tonne per km)
 */
const TRANSPORT_EMISSIONS_KG_PER_TONNE_KM = 0.062; // Heavy truck average

/**
 * Reuse factor - percentage of embodied carbon saved through reuse
 */
const REUSE_CARBON_SAVINGS_FACTOR = 0.85; // 85% savings vs new production

/**
 * Maximum distance for matching (km)
 */
const MAX_MATCH_DISTANCE_KM = 200;

/**
 * Distance at which score starts dropping significantly (km)
 */
const OPTIMAL_DISTANCE_KM = 100;

// ============ SCORE BREAKDOWN ============

/**
 * Detailed score breakdown for UI transparency
 */
export interface ScoreBreakdown {
  materialMatch: number;
  quantityFit: number;
  distance: number;
  condition: number;
  urgency: number;
  totalScore: number;
  reasoning: string[];
}

// ============ SCORING FUNCTIONS ============

/**
 * Calculate quantity compatibility score (0-1)
 */
function calculateQuantityScore(requestQty: number, listingQty: number): number {
  // If listing has more than request needs, good match
  if (listingQty >= requestQty) {
    // Penalize if listing has way more than needed (less efficient)
    const ratio = requestQty / listingQty;
    return Math.max(0.5, ratio); // At least 0.5 if listing covers need
  }
  // If listing has less, score based on how much it covers
  return listingQty / requestQty;
}

/**
 * Calculate distance score (0-1) - closer is better
 */
function calculateDistanceScore(distanceKm: number): number {
  if (distanceKm <= 0) return 1;
  if (distanceKm >= MAX_MATCH_DISTANCE_KM) return 0;
  
  // Linear decay from 1 to 0 over optimal distance
  if (distanceKm <= OPTIMAL_DISTANCE_KM) {
    return 1 - (distanceKm / OPTIMAL_DISTANCE_KM) * 0.5; // 1.0 to 0.5
  }
  
  // Faster decay after optimal distance
  const remaining = (distanceKm - OPTIMAL_DISTANCE_KM) / (MAX_MATCH_DISTANCE_KM - OPTIMAL_DISTANCE_KM);
  return 0.5 * (1 - remaining); // 0.5 to 0
}

/**
 * Pluggable scoring function - can be replaced with AI/RL model
 */
export type ScoringFunction = (
  request: Request,
  listing: Listing,
  distanceKm: number,
  weights: ScoringWeights
) => ScoreBreakdown;

/**
 * Default scoring function with full breakdown
 * Uses aiMaterialType when available, falls back to user-selected materialType
 */
export const defaultScoringFunction: ScoringFunction = (
  request,
  listing,
  distanceKm,
  weights
): ScoreBreakdown => {
  const reasoning: string[] = [];
  
  // Prefer AI-classified material type if available
  const listingMaterial = listing.aiMaterialType || listing.materialType;
  const isAIClassified = !!listing.aiMaterialType;
  
  // Material match - must be exact
  const materialMatch = request.materialType === listingMaterial ? 1 : 0;
  if (materialMatch === 0) {
    return {
      materialMatch: 0,
      quantityFit: 0,
      distance: 0,
      condition: 0,
      urgency: 0,
      totalScore: 0,
      reasoning: ['Material types do not match'],
    };
  }
  
  // Add AI classification info to reasoning if available
  if (isAIClassified && listing.aiConfidence) {
    reasoning.push(`Material: ${listingMaterial} (AI verified: ${Math.round(listing.aiConfidence * 100)}%)`);
  } else {
    reasoning.push(`Material match: ${listingMaterial}`);
  }
  
  // Add AI description to reasoning if available (for explainability)
  if (listing.aiDescription) {
    reasoning.push(`AI: ${listing.aiDescription}`);
  }
  
  // Quantity fit
  const quantityFit = calculateQuantityScore(request.quantityValue, listing.quantityValue);
  if (listing.quantityValue >= request.quantityValue) {
    reasoning.push(`Quantity: Listing covers ${Math.round(quantityFit * 100)}% efficiently`);
  } else {
    reasoning.push(`Quantity: Listing covers ${Math.round(quantityFit * 100)}% of request`);
  }
  
  // Distance
  const distance = calculateDistanceScore(distanceKm);
  reasoning.push(`Distance: ${distanceKm.toFixed(1)} km (${Math.round(distance * 100)}% score)`);
  
  // Condition
  const condition = CONDITION_SCORES[listing.condition] || 0.5;
  reasoning.push(`Condition: ${listing.condition} (${Math.round(condition * 100)}%)`);
  
  // Urgency
  const urgency = URGENCY_SCORES[request.urgency] || 0.5;
  if (request.urgency === 'high') {
    reasoning.push('High urgency request - prioritized');
  }
  
  // Calculate weighted total
  const totalScore = Math.min(1, 
    weights.materialMatch * materialMatch +
    weights.quantityFit * quantityFit +
    weights.distance * distance +
    weights.condition * condition +
    weights.urgency * urgency
  );
  
  return {
    materialMatch,
    quantityFit,
    distance,
    condition,
    urgency,
    totalScore: Math.round(totalScore * 100) / 100,
    reasoning,
  };
};

// Current scoring function - can be swapped for AI/RL implementation
let currentScoringFunction: ScoringFunction = defaultScoringFunction;

/**
 * Set a custom scoring function (for AI/RL integration)
 */
export function setScoringFunction(fn: ScoringFunction): void {
  currentScoringFunction = fn;
}

/**
 * Reset to default scoring function
 */
export function resetScoringFunction(): void {
  currentScoringFunction = defaultScoringFunction;
}

// ============ CO2 CALCULATIONS ============

/**
 * Convert quantity to tonnes for CO2 calculation
 */
function convertToTonnes(value: number, unit: string, materialType: MaterialType): number {
  switch (unit) {
    case 'tonnes':
      return value;
    case 'm3':
      // Approximate density conversion
      const densities: Record<MaterialType, number> = {
        steel_beam: 7.85,   // tonnes per m3
        rebar: 7.85,
        concrete: 2.4,
        aggregates: 1.6,
        timber: 0.6,
      };
      return value * densities[materialType];
    case 'linear_m':
      // Approximate for linear materials (steel beams, rebar)
      const linearWeights: Record<MaterialType, number> = {
        steel_beam: 0.025,  // tonnes per linear meter (average I-beam)
        rebar: 0.008,       // tonnes per linear meter (avg 12mm rebar)
        concrete: 0.1,
        aggregates: 0.05,
        timber: 0.015,
      };
      return value * linearWeights[materialType];
    case 'bags':
      // Cement bags = 50kg
      return value * 0.05;
    default:
      return value;
  }
}

/**
 * Calculate CO2 savings from material reuse
 */
export function calculateCO2Savings(
  listing: Listing,
  distanceKm: number
): number {
  const tonnes = convertToTonnes(
    listing.quantityValue, 
    listing.quantityUnit, 
    listing.materialType
  );
  
  // CO2 saved by not producing new material
  const embodiedCarbon = EMBODIED_CARBON_KG_PER_TONNE[listing.materialType];
  const productionSavings = tonnes * Math.abs(embodiedCarbon) * REUSE_CARBON_SAVINGS_FACTOR;
  
  // CO2 emitted by transport
  const transportEmissions = tonnes * distanceKm * TRANSPORT_EMISSIONS_KG_PER_TONNE_KM;
  
  // Net savings
  const netSavings = productionSavings - transportEmissions;
  
  // Return in kg, minimum 0
  return Math.max(0, Math.round(netSavings));
}

// ============ MATCH RESULT TYPES ============

/**
 * Extended match with score breakdown
 */
export interface MatchResult extends Match {
  breakdown: ScoreBreakdown;
}

/**
 * Match with full listing details for display
 */
export interface MatchWithListing extends MatchResult {
  listing?: Listing;
}

// ============ CORE MATCHING LOGIC ============

/**
 * Find matches for a request from all active listings
 * Uses batch Haversine for distance to avoid expensive API calls
 */
export async function findMatchesForRequest(
  request: Request,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  minScore: number = 0.3
): Promise<MatchResult[]> {
  // Get all active listings
  const allListings = await getAllActiveListings();
  
  // Filter out same organisation
  // Use aiMaterialType if available, otherwise fall back to user-selected materialType
  const candidateListings = allListings.filter(listing => {
    if (listing.organisationId === request.organisationId) return false;
    
    // Prefer AI-classified material type for matching
    const listingMaterial = listing.aiMaterialType || listing.materialType;
    return listingMaterial === request.materialType;
  });
  
  if (candidateListings.length === 0) {
    return [];
  }
  
  // Batch calculate distances using Haversine (no API calls)
  const destinations = candidateListings.map(l => l.location);
  const distances = getBatchDistances(request.location, destinations);
  
  // Score each candidate
  const matches: MatchResult[] = [];
  
  for (let i = 0; i < candidateListings.length; i++) {
    const listing = candidateListings[i];
    const { distanceKm } = distances[i];
    
    // Skip if too far
    if (distanceKm > MAX_MATCH_DISTANCE_KM) {
      continue;
    }
    
    // Calculate score with breakdown
    const breakdown = currentScoringFunction(request, listing, distanceKm, weights);
    
    // Skip low-quality matches
    if (breakdown.totalScore < minScore) {
      continue;
    }
    
    // Calculate CO2 savings
    const co2SavedKg = calculateCO2Savings(listing, distanceKm);
    
    const match: MatchResult = {
      id: `match_${request.id}_${listing.id}`,
      requestId: request.id,
      listingId: listing.id,
      score: breakdown.totalScore,
      distanceKm: Math.round(distanceKm * 10) / 10,
      co2SavedKg,
      status: 'suggested',
      createdAt: Timestamp.now(),
      breakdown,
    };
    
    matches.push(match);
    
    // Log match event for RL pipeline
    await logMatchEvent({
      requestId: request.id,
      listingId: listing.id,
      score: breakdown.totalScore,
      distanceKm,
      co2SavedKg,
    });
  }
  
  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  
  // Return top 10 matches
  return matches.slice(0, 10);
}

/**
 * Get matches with full listing details for display
 */
export async function getMatchesWithListings(
  request: Request,
  weights?: ScoringWeights
): Promise<MatchWithListing[]> {
  const matches = await findMatchesForRequest(request, weights);
  const allListings = await getAllActiveListings();
  
  const listingMap = new Map(allListings.map(l => [l.id, l]));
  
  return matches.map(match => ({
    ...match,
    listing: listingMap.get(match.listingId),
  }));
}

/**
 * Get a single match with listing detail (for match acceptance flow)
 */
export async function getMatchWithListing(
  matchResult: MatchResult
): Promise<MatchWithListing> {
  const listing = await getListing(matchResult.listingId);
  return {
    ...matchResult,
    listing: listing || undefined,
  };
}
