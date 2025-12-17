/**
 * Material Classifier Service
 * 
 * AI-powered material classification with pluggable backends:
 * - Heuristic fallback (default, no API required)
 * - Gemini multimodal (future, via Cloud Function/Run)
 * 
 * Architecture:
 * - Frontend never calls AI APIs directly
 * - Backend endpoint placeholder for Gemini integration
 * - Classification quota enforcement (30 max for demo)
 * - Event logging for RL training pipeline
 */

import type { Listing, MaterialType } from '@/types';
import { logClassificationEvent } from './analyticsService';

// ============ CONFIGURATION ============

/**
 * Classification result interface
 */
export interface ClassificationResult {
  aiMaterialType: MaterialType;
  aiConfidence: number; // 0-1
  aiDescription: string; // Normalized description
  aiVersion: string; // e.g., "v0.1_heuristic" or "v0.2_gemini"
}

/**
 * Backend classification endpoint (placeholder for Cloud Function/Run)
 * This should be replaced with actual endpoint when Gemini integration is deployed
 */
const GEMINI_CLASSIFICATION_ENDPOINT = '/api/classify-material'; // Placeholder

/**
 * Maximum classifications allowed in demo (quota control)
 */
const MAX_DEMO_CLASSIFICATIONS = 30;

/**
 * Classification counter key in localStorage (for demo quota)
 */
const CLASSIFICATION_COUNT_KEY = 'resite_classification_count';

/**
 * Environment flag for Gemini usage (defaults to false)
 */
const USE_GEMINI = false; // Will be controlled via environment config

// ============ KEYWORD MAPPINGS FOR HEURISTIC CLASSIFICATION ============

const MATERIAL_KEYWORDS: Record<MaterialType, string[]> = {
  steel_beam: [
    'steel beam', 'i-beam', 'h-beam', 'structural steel', 'steel girder',
    'steel column', 'steel section', 'wide flange', 'universal beam',
    'ipe', 'heb', 'hea', 'steel profile', 'rolled steel'
  ],
  rebar: [
    'rebar', 'reinforcing bar', 'reinforcement bar', 'steel bar',
    'deformed bar', 'reinforcing steel', 'reinforcement steel',
    'tmt bar', 'tmt steel', 'rebars', 'steel rod', 'bar reinforcement'
  ],
  concrete: [
    'concrete', 'cement', 'ready mix', 'readymix', 'precast',
    'concrete block', 'concrete slab', 'concrete panel', 'rcc',
    'reinforced concrete', 'concrete pile', 'concrete element'
  ],
  aggregates: [
    'aggregate', 'gravel', 'sand', 'crushed stone', 'ballast',
    'crushed rock', 'stone chips', 'coarse aggregate', 'fine aggregate',
    'fill material', 'granular', 'roadbase', 'sub-base'
  ],
  timber: [
    'timber', 'wood', 'lumber', 'plywood', 'wooden beam',
    'wooden plank', 'hardwood', 'softwood', 'treated wood',
    'formwork timber', 'scaffolding wood', 'wooden pole'
  ],
};

/**
 * Normalized descriptions for each material type
 */
const MATERIAL_DESCRIPTIONS: Record<MaterialType, string> = {
  steel_beam: 'Structural steel beam suitable for load-bearing construction applications',
  rebar: 'Steel reinforcement bar for concrete reinforcement in construction',
  concrete: 'Concrete material or precast concrete elements for construction',
  aggregates: 'Aggregate material including gravel, sand, or crushed stone for construction',
  timber: 'Timber or wood material for construction, formwork, or structural use',
};

// ============ QUOTA MANAGEMENT ============

/**
 * Get current classification count
 */
function getClassificationCount(): number {
  try {
    const count = localStorage.getItem(CLASSIFICATION_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Increment classification count
 */
function incrementClassificationCount(): void {
  try {
    const current = getClassificationCount();
    localStorage.setItem(CLASSIFICATION_COUNT_KEY, String(current + 1));
  } catch {
    console.warn('[Classifier] Failed to update classification count');
  }
}

/**
 * Check if classification quota is exhausted
 */
export function isClassificationQuotaExhausted(): boolean {
  return getClassificationCount() >= MAX_DEMO_CLASSIFICATIONS;
}

/**
 * Get remaining classification quota
 */
export function getRemainingClassificationQuota(): number {
  return Math.max(0, MAX_DEMO_CLASSIFICATIONS - getClassificationCount());
}

// ============ HEURISTIC CLASSIFICATION ============

/**
 * Heuristic classification based on text matching
 * Used when Gemini is not available or for offline operation
 */
function classifyHeuristic(listing: Listing): ClassificationResult {
  const searchText = `${listing.title} ${listing.description}`.toLowerCase();
  
  let bestMatch: MaterialType = listing.materialType; // Fallback to user selection
  let bestScore = 0;
  let matchedKeywords: string[] = [];
  
  for (const [material, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
    let score = 0;
    const matched: string[] = [];
    
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        // Weight longer keywords higher (more specific)
        const weight = keyword.split(' ').length;
        score += weight;
        matched.push(keyword);
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = material as MaterialType;
      matchedKeywords = matched;
    }
  }
  
  // Calculate confidence based on keyword match quality
  // Max confidence 0.85 for heuristic (never 1.0 - that's for AI)
  let confidence: number;
  if (bestScore === 0) {
    // No keywords matched, use user selection with low confidence
    confidence = 0.3;
  } else if (matchedKeywords.length >= 3) {
    confidence = 0.85;
  } else if (matchedKeywords.length >= 2) {
    confidence = 0.7;
  } else {
    confidence = 0.5;
  }
  
  // If heuristic matches user selection, boost confidence slightly
  if (bestMatch === listing.materialType && bestScore > 0) {
    confidence = Math.min(0.9, confidence + 0.1);
  }
  
  return {
    aiMaterialType: bestMatch,
    aiConfidence: confidence,
    aiDescription: MATERIAL_DESCRIPTIONS[bestMatch],
    aiVersion: 'v0.1_heuristic',
  };
}

// ============ GEMINI CLASSIFICATION (PLACEHOLDER) ============

/**
 * Gemini multimodal classification via backend endpoint
 * This is a placeholder that will call Cloud Function/Run
 * 
 * IMPORTANT: Never call Gemini API directly from frontend
 * The backend handles API key management and rate limiting
 */
async function classifyWithGemini(listing: Listing): Promise<ClassificationResult> {
  // TODO: Implement actual Gemini call via Cloud Function
  // The backend endpoint should:
  // 1. Accept listing data (title, description, imageUrl)
  // 2. Call Gemini multimodal API with image + text
  // 3. Return structured classification result
  // 4. Handle API key securely (never exposed to frontend)
  
  console.log('[Classifier] Gemini classification requested - using placeholder');
  
  // Placeholder: Would make actual API call like:
  /*
  const response = await fetch(GEMINI_CLASSIFICATION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Auth headers would be added by Firebase if using Cloud Functions
    },
    body: JSON.stringify({
      listingId: listing.id,
      title: listing.title,
      description: listing.description,
      imageUrl: listing.imageUrl,
      userMaterialType: listing.materialType, // For validation
    }),
  });
  
  if (!response.ok) {
    throw new Error('Classification API failed');
  }
  
  const result = await response.json();
  return {
    aiMaterialType: result.materialType,
    aiConfidence: result.confidence,
    aiDescription: result.description,
    aiVersion: 'v0.2_gemini',
  };
  */
  
  // For now, fall back to heuristic with Gemini version marker
  const heuristicResult = classifyHeuristic(listing);
  return {
    ...heuristicResult,
    aiVersion: 'v0.1_gemini_placeholder',
  };
}

// ============ MAIN CLASSIFICATION FUNCTION ============

/**
 * Classify a listing's material type using AI
 * 
 * Flow:
 * 1. Check if already classified (skip if aiVersion exists)
 * 2. Check quota (demo limit)
 * 3. Use Gemini if enabled, else heuristic fallback
 * 4. Log classification event for RL
 * 5. Return result for persistence
 * 
 * @param listing - The listing to classify
 * @param forceReclassify - Force reclassification even if aiVersion exists
 * @returns Classification result or null if quota exhausted
 */
export async function classifyListing(
  listing: Listing,
  forceReclassify: boolean = false
): Promise<ClassificationResult | null> {
  // Skip if already classified (unless forced)
  if (listing.aiVersion && !forceReclassify) {
    console.log(`[Classifier] Listing ${listing.id} already classified (${listing.aiVersion})`);
    return null;
  }
  
  // Check quota
  if (isClassificationQuotaExhausted()) {
    console.warn('[Classifier] Classification quota exhausted');
    return null;
  }
  
  try {
    let result: ClassificationResult;
    
    if (USE_GEMINI) {
      result = await classifyWithGemini(listing);
    } else {
      result = classifyHeuristic(listing);
    }
    
    // Increment quota counter
    incrementClassificationCount();
    
    // Log classification event for RL pipeline
    await logClassificationEvent({
      listingId: listing.id,
      aiMaterialType: result.aiMaterialType,
      aiConfidence: result.aiConfidence,
      aiVersion: result.aiVersion,
      userMaterialType: listing.materialType,
    });
    
    console.log(`[Classifier] Classified listing ${listing.id}: ${result.aiMaterialType} (${Math.round(result.aiConfidence * 100)}% confidence)`);
    
    return result;
  } catch (error) {
    console.error('[Classifier] Classification failed:', error);
    // Don't throw - classification failure shouldn't block listing creation
    return null;
  }
}

/**
 * Check if a listing needs classification
 */
export function needsClassification(listing: Listing): boolean {
  return !listing.aiVersion;
}

/**
 * Get human-readable material type label
 */
export function getMaterialTypeLabel(materialType: MaterialType): string {
  const labels: Record<MaterialType, string> = {
    steel_beam: 'Steel Beam',
    rebar: 'Rebar',
    concrete: 'Concrete',
    aggregates: 'Aggregates',
    timber: 'Timber',
  };
  return labels[materialType] || materialType;
}
