/**
 * AI Classifier Service
 * 
 * Real Gemini multimodal classification via edge function.
 * Replaces the placeholder classifierService with actual AI integration.
 * 
 * Features:
 * - Gemini multimodal (image + text) classification
 * - Server-side quota enforcement (25 calls max)
 * - Event logging for analytics/RL pipeline
 * - Cost-safe with hard caps
 */

import { supabase } from '@/integrations/supabase/client';
import type { Listing, MaterialType } from '@/types';

// ============ TYPES ============

export interface AIClassificationResult {
  aiMaterialType: MaterialType;
  aiConfidence: number;
  aiDescription: string;
  aiVersion: string;
  remaining?: number;
  max?: number;
}

export interface QuotaInfo {
  remaining: number;
  max: number;
  exhausted: boolean;
}

// ============ QUOTA CHECK ============

/**
 * Check remaining AI classification quota
 */
export async function getAIQuotaInfo(): Promise<QuotaInfo> {
  try {
    const { data, error } = await supabase
      .from('ai_classification_quota')
      .select('count, max_count')
      .eq('id', 'global')
      .single();

    if (error) {
      console.error('[AIClassifier] Quota check error:', error);
      return { remaining: 0, max: 25, exhausted: true };
    }

    return {
      remaining: Math.max(0, data.max_count - data.count),
      max: data.max_count,
      exhausted: data.count >= data.max_count,
    };
  } catch (error) {
    console.error('[AIClassifier] Quota check failed:', error);
    return { remaining: 0, max: 25, exhausted: true };
  }
}

// ============ CLASSIFICATION ============

/**
 * Classify a listing using Gemini multimodal AI
 * 
 * @param listing - The listing to classify
 * @returns Classification result or null if quota exhausted
 */
export async function classifyWithAI(listing: Listing): Promise<AIClassificationResult | null> {
  try {
    console.log(`[AIClassifier] Classifying listing ${listing.id}`);

    const { data, error } = await supabase.functions.invoke('material-classify', {
      body: {
        listingId: listing.id,
        title: listing.title,
        description: listing.description,
        imageUrl: listing.imageUrl,
        userMaterialType: listing.materialType,
      },
    });

    if (error) {
      console.error('[AIClassifier] Edge function error:', error);
      return null;
    }

    if (data.error) {
      console.error('[AIClassifier] Classification error:', data.error);
      return null;
    }

    console.log('[AIClassifier] Classification successful:', data);

    return {
      aiMaterialType: data.aiMaterialType as MaterialType,
      aiConfidence: data.aiConfidence,
      aiDescription: data.aiDescription,
      aiVersion: data.aiVersion,
      remaining: data.remaining,
      max: data.max,
    };
  } catch (error) {
    console.error('[AIClassifier] Classification failed:', error);
    return null;
  }
}

/**
 * Check if a listing needs AI classification
 */
export function needsAIClassification(listing: Listing): boolean {
  return !listing.aiVersion || !listing.aiVersion.includes('gemini');
}

// ============ ANALYTICS QUERIES ============

/**
 * Get AI classification events for analytics
 * (Equivalent to BigQuery query)
 */
export async function getClassificationEvents(limit: number = 100) {
  try {
    const { data, error } = await supabase
      .from('material_ai_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AIClassifier] Failed to fetch events:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('[AIClassifier] Events query failed:', error);
    return [];
  }
}

/**
 * Get classification accuracy metrics
 * (Compares user selection vs AI classification)
 */
export async function getClassificationAccuracy() {
  try {
    const { data, error } = await supabase
      .from('material_ai_events')
      .select('material_type_user, ai_material_type, ai_confidence');

    if (error) {
      console.error('[AIClassifier] Failed to fetch accuracy data:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return { totalEvents: 0, matchRate: 0, avgConfidence: 0 };
    }

    const matches = data.filter(e => e.material_type_user === e.ai_material_type).length;
    const avgConfidence = data.reduce((sum, e) => sum + e.ai_confidence, 0) / data.length;

    return {
      totalEvents: data.length,
      matchRate: matches / data.length,
      avgConfidence,
    };
  } catch (error) {
    console.error('[AIClassifier] Accuracy calculation failed:', error);
    return null;
  }
}