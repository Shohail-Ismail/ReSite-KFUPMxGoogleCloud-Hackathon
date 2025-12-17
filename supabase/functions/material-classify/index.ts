import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Material types for classification
const MATERIAL_TYPES = ['steel_beam', 'rebar', 'concrete', 'aggregates', 'timber'] as const;
type MaterialType = typeof MATERIAL_TYPES[number];

// Material descriptions for normalized output
const MATERIAL_DESCRIPTIONS: Record<MaterialType, string> = {
  steel_beam: 'Structural steel beam suitable for load-bearing construction applications',
  rebar: 'Steel reinforcement bar for concrete reinforcement in construction',
  concrete: 'Concrete material or precast concrete elements for construction',
  aggregates: 'Aggregate material including gravel, sand, or crushed stone for construction',
  timber: 'Timber or wood material for construction, formwork, or structural use',
};

interface ClassificationRequest {
  listingId: string;
  title: string;
  description: string;
  imageUrl?: string;
  userMaterialType: MaterialType;
}

interface ClassificationResult {
  aiMaterialType: MaterialType;
  aiConfidence: number;
  aiDescription: string;
  aiVersion: string;
  embedding?: number[];
}

/**
 * Get Google Cloud access token from service account key
 */
async function getGoogleAccessToken(serviceAccountKey: string): Promise<string> {
  const keyData = JSON.parse(serviceAccountKey);
  
  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: keyData.private_key_id
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: keyData.client_email,
    sub: keyData.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  };
  
  // Base64URL encode
  const base64url = (obj: unknown) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  
  const unsignedToken = `${base64url(header)}.${base64url(payload)}`;
  
  // Sign with RSA-SHA256
  const privateKey = keyData.private_key;
  const encoder = new TextEncoder();
  const data = encoder.encode(unsignedToken);
  
  // Import the private key
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const signedJwt = `${unsignedToken}.${signatureBase64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`
  });
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('Token exchange failed:', error);
    throw new Error('Failed to get Google access token');
  }
  
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Fetch image and convert to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    return { data: base64, mimeType: contentType };
  } catch (error) {
    console.error('Failed to fetch image:', error);
    return null;
  }
}

/**
 * Call Vertex AI Gemini multimodal API
 */
async function classifyWithVertexAI(
  accessToken: string,
  projectId: string,
  title: string,
  description: string,
  userMaterialType: string,
  imageUrl?: string
): Promise<{ materialType: MaterialType; confidence: number; reasoning: string }> {
  
  const location = 'us-central1';
  const model = 'gemini-1.5-flash-001';
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
  
  // Build the prompt
  const systemPrompt = `You are an expert construction materials classifier. Classify materials into exactly one of these 5 categories:
- steel_beam: Structural steel beams, I-beams, H-beams, steel columns
- rebar: Reinforcing bars, reinforcement steel, deformed bars
- concrete: Concrete, precast concrete, concrete blocks, cement products
- aggregates: Gravel, sand, crushed stone, ballast
- timber: Wood, lumber, plywood, wooden beams

Respond with ONLY valid JSON: {"material_type": "<category>", "confidence": <0-1>, "reasoning": "<brief explanation>"}`;

  const userPrompt = `Classify this construction material:
Title: ${title}
Description: ${description}
User-selected: ${userMaterialType}
${imageUrl ? 'An image is provided.' : 'No image.'}`;

  // Build request parts
  const parts: any[] = [{ text: systemPrompt + '\n\n' + userPrompt }];
  
  // Add image if available
  if (imageUrl) {
    const imageData = await fetchImageAsBase64(imageUrl);
    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.data
        }
      });
    }
  }
  
  const requestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 256,
    }
  };
  
  console.log('[VertexAI] Calling Gemini...');
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Vertex AI error:', response.status, error);
    throw new Error(`Vertex AI failed: ${response.status}`);
  }
  
  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  console.log('[VertexAI] Response:', responseText);
  
  // Parse JSON response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON in Vertex AI response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  return {
    materialType: MATERIAL_TYPES.includes(parsed.material_type) 
      ? parsed.material_type 
      : userMaterialType as MaterialType,
    confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
    reasoning: parsed.reasoning || 'Classification completed'
  };
}

/**
 * Insert event into BigQuery
 */
async function insertIntoBigQuery(
  accessToken: string,
  projectId: string,
  event: {
    listingId: string;
    materialTypeUser: string;
    aiMaterialType: string;
    aiConfidence: number;
    aiDescription: string;
    aiVersion: string;
    imageUrl?: string;
    title: string;
    description: string;
    embedding?: number[];
  }
): Promise<void> {
  const dataset = 'resite_mvp';
  const table = 'material_ai_events';
  const endpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${dataset}/tables/${table}/insertAll`;
  
  const rows = [{
    insertId: crypto.randomUUID(),
    json: {
      listing_id: event.listingId,
      material_type_user: event.materialTypeUser,
      ai_material_type: event.aiMaterialType,
      ai_confidence: event.aiConfidence,
      ai_description: event.aiDescription,
      ai_version: event.aiVersion,
      image_url: event.imageUrl || null,
      title: event.title,
      description: event.description,
      embedding: event.embedding || [],
      timestamp: new Date().toISOString(),
    }
  }];
  
  console.log('[BigQuery] Inserting event...');
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('BigQuery insert error:', response.status, error);
    // Don't throw - BigQuery failure shouldn't block classification
  } else {
    const result = await response.json();
    if (result.insertErrors) {
      console.error('BigQuery insert errors:', result.insertErrors);
    } else {
      console.log('[BigQuery] Event inserted successfully');
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_PROJECT_ID = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
    const GOOGLE_SERVICE_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GOOGLE_PROJECT_ID || !GOOGLE_SERVICE_KEY) {
      console.error('[Config] Google Cloud credentials not configured');
      throw new Error('CONFIG_MISSING');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Config] Supabase configuration missing');
      throw new Error('CONFIG_MISSING');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check quota before processing
    const { data: quotaData, error: quotaError } = await supabase
      .from('ai_classification_quota')
      .select('count, max_count')
      .eq('id', 'global')
      .single();

    if (quotaError) {
      console.error('[Quota] Check error:', quotaError);
      throw new Error('QUOTA_CHECK_FAILED');
    }

    if (quotaData.count >= quotaData.max_count) {
      console.log('[Quota] Classification quota exhausted:', quotaData);
      return new Response(JSON.stringify({ 
        error: 'Service quota exceeded. Please try again later.',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ClassificationRequest = await req.json();
    const { listingId, title, description, imageUrl, userMaterialType } = body;

    console.log(`[Classifier] Processing listing ${listingId}: "${title}"`);

    // Get Google access token
    const accessToken = await getGoogleAccessToken(GOOGLE_SERVICE_KEY);
    
    // Call Vertex AI Gemini
    const vertexResult = await classifyWithVertexAI(
      accessToken,
      GOOGLE_PROJECT_ID,
      title,
      description,
      userMaterialType,
      imageUrl
    );

    const result: ClassificationResult = {
      aiMaterialType: vertexResult.materialType,
      aiConfidence: vertexResult.confidence,
      aiDescription: MATERIAL_DESCRIPTIONS[vertexResult.materialType],
      aiVersion: 'v1.0_vertex_gemini_multimodal',
    };

    console.log('[Classifier] Classification result:', result);

    // Increment quota counter
    const { error: updateError } = await supabase
      .from('ai_classification_quota')
      .update({ 
        count: quotaData.count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'global');

    if (updateError) {
      console.error('[Quota] Failed to update:', updateError);
    }

    // Also insert into local Supabase table (backup/fallback)
    const { error: insertError } = await supabase
      .from('material_ai_events')
      .insert({
        listing_id: listingId,
        material_type_user: userMaterialType,
        ai_material_type: result.aiMaterialType,
        ai_confidence: result.aiConfidence,
        ai_description: result.aiDescription,
        ai_version: result.aiVersion,
        image_url: imageUrl || null,
        title,
        description,
        embedding: null,
      });

    if (insertError) {
      console.error('[Supabase] Failed to insert:', insertError);
    }

    // Insert into BigQuery (async, don't block response)
    insertIntoBigQuery(accessToken, GOOGLE_PROJECT_ID, {
      listingId,
      materialTypeUser: userMaterialType,
      aiMaterialType: result.aiMaterialType,
      aiConfidence: result.aiConfidence,
      aiDescription: result.aiDescription,
      aiVersion: result.aiVersion,
      imageUrl,
      title,
      description,
    }).catch(err => console.error('[BigQuery] Insert failed:', err));

    // Return result with quota info
    const remaining = quotaData.max_count - quotaData.count - 1;
    
    return new Response(JSON.stringify({ 
      ...result,
      remaining,
      max: quotaData.max_count
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Log detailed error server-side only
    console.error('[Classification Error]', error);
    
    // Map internal errors to generic user-facing messages
    const errorMessage = error instanceof Error ? error.message : 'UNKNOWN';
    const genericMessages: Record<string, string> = {
      'CONFIG_MISSING': 'Service temporarily unavailable',
      'QUOTA_CHECK_FAILED': 'Service temporarily unavailable',
      'Failed to get Google access token': 'Service temporarily unavailable',
    };
    
    const userMessage = genericMessages[errorMessage] || 'Classification request failed';
    
    return new Response(JSON.stringify({ 
      error: userMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});