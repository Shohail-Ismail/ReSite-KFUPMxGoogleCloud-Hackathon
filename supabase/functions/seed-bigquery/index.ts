import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Test data for seeding - realistic Riyadh construction materials
const SEED_DATA = [
  {
    listing_id: 'seed-001',
    material_type_user: 'steel_beam',
    ai_material_type: 'steel_beam',
    ai_confidence: 0.95,
    title: 'Surplus I-Beams from Warehouse Project',
    description: 'High-quality structural steel I-beams, 200mm x 100mm, 6m length. Left over from industrial warehouse construction.',
  },
  {
    listing_id: 'seed-002',
    material_type_user: 'steel_beam',
    ai_material_type: 'rebar',
    ai_confidence: 0.72,
    title: 'Steel Materials - Mixed Lot',
    description: 'Various steel materials including some reinforcement bars. User categorized as beams but AI detected rebar.',
  },
  {
    listing_id: 'seed-003',
    material_type_user: 'rebar',
    ai_material_type: 'rebar',
    ai_confidence: 0.98,
    title: 'Deformed Steel Bars 12mm',
    description: 'Grade 60 deformed reinforcement bars, 12mm diameter, 12m lengths. 500 pieces available.',
  },
  {
    listing_id: 'seed-004',
    material_type_user: 'concrete',
    ai_material_type: 'concrete',
    ai_confidence: 0.91,
    title: 'Precast Concrete Panels',
    description: 'Precast reinforced concrete wall panels, 3m x 2m x 150mm. From cancelled residential project.',
  },
  {
    listing_id: 'seed-005',
    material_type_user: 'aggregates',
    ai_material_type: 'aggregates',
    ai_confidence: 0.88,
    title: 'Washed Gravel 20mm',
    description: 'Clean washed gravel, 20mm size, suitable for concrete mixing. 50 tonnes available.',
  },
  {
    listing_id: 'seed-006',
    material_type_user: 'timber',
    ai_material_type: 'timber',
    ai_confidence: 0.94,
    title: 'Formwork Plywood Sheets',
    description: 'Used formwork plywood, 18mm thickness, good condition. 200 sheets available.',
  },
  {
    listing_id: 'seed-007',
    material_type_user: 'concrete',
    ai_material_type: 'aggregates',
    ai_confidence: 0.65,
    title: 'Crushed Concrete Rubble',
    description: 'Recycled crushed concrete suitable for backfill. AI classified as aggregates due to crushed nature.',
  },
  {
    listing_id: 'seed-008',
    material_type_user: 'steel_beam',
    ai_material_type: 'steel_beam',
    ai_confidence: 0.97,
    title: 'H-Beams 300x300mm',
    description: 'Heavy structural H-beams, 300x300mm profile, 8m length. From bridge construction project.',
  },
  {
    listing_id: 'seed-009',
    material_type_user: 'rebar',
    ai_material_type: 'rebar',
    ai_confidence: 0.89,
    title: 'Spiral Reinforcement',
    description: 'Spiral column reinforcement, 8mm wire, various diameters. Surplus from high-rise foundation.',
  },
  {
    listing_id: 'seed-010',
    material_type_user: 'timber',
    ai_material_type: 'timber',
    ai_confidence: 0.86,
    title: 'Pine Lumber 4x4',
    description: 'Treated pine lumber, 100x100mm, 3m lengths. Originally for scaffolding support.',
  },
  {
    listing_id: 'seed-011',
    material_type_user: 'aggregates',
    ai_material_type: 'aggregates',
    ai_confidence: 0.92,
    title: 'Fine Sand for Plastering',
    description: 'Washed fine sand, suitable for plastering and mortar. 30 cubic meters available.',
  },
  {
    listing_id: 'seed-012',
    material_type_user: 'concrete',
    ai_material_type: 'concrete',
    ai_confidence: 0.79,
    title: 'Concrete Blocks 20cm',
    description: 'Hollow concrete blocks, 200x200x400mm. Minor cosmetic damage but structurally sound.',
  },
  {
    listing_id: 'seed-013',
    material_type_user: 'steel_beam',
    ai_material_type: 'steel_beam',
    ai_confidence: 0.93,
    title: 'Steel Columns C-Channel',
    description: 'C-channel steel columns, 150mm, 4m lengths. From modular building project.',
  },
  {
    listing_id: 'seed-014',
    material_type_user: 'timber',
    ai_material_type: 'concrete',
    ai_confidence: 0.58,
    title: 'Mixed Building Materials',
    description: 'Mixed lot including timber shuttering with concrete residue. AI detected primarily concrete.',
  },
  {
    listing_id: 'seed-015',
    material_type_user: 'rebar',
    ai_material_type: 'rebar',
    ai_confidence: 0.96,
    title: 'Rebar Mesh Sheets',
    description: 'Welded rebar mesh, 6mm bars, 2.4m x 6m sheets. For slab reinforcement.',
  },
];

const MATERIAL_DESCRIPTIONS: Record<string, string> = {
  steel_beam: 'Structural steel beam suitable for load-bearing construction applications',
  rebar: 'Steel reinforcement bar for concrete reinforcement in construction',
  concrete: 'Concrete material or precast concrete elements for construction',
  aggregates: 'Aggregate material including gravel, sand, or crushed stone for construction',
  timber: 'Timber or wood material for construction, formwork, or structural use',
};

/**
 * Get Google Cloud access token from service account key
 */
async function getGoogleAccessToken(serviceAccountKey: string): Promise<string> {
  const keyData = JSON.parse(serviceAccountKey);
  
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
  
  const base64url = (obj: unknown) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  
  const unsignedToken = `${base64url(header)}.${base64url(payload)}`;
  
  const privateKey = keyData.private_key;
  const encoder = new TextEncoder();
  const data = encoder.encode(unsignedToken);
  
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
 * Insert batch of rows into BigQuery
 */
async function insertBatchIntoBigQuery(
  accessToken: string,
  projectId: string,
  rows: any[]
): Promise<{ success: boolean; insertedCount: number; errors: any[] }> {
  const dataset = 'resite_mvp';
  const table = 'material_ai_events';
  const endpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${dataset}/tables/${table}/insertAll`;
  
  const formattedRows = rows.map((row, index) => ({
    insertId: `seed-${Date.now()}-${index}`,
    json: {
      listing_id: row.listing_id,
      material_type_user: row.material_type_user,
      ai_material_type: row.ai_material_type,
      ai_confidence: row.ai_confidence,
      ai_description: MATERIAL_DESCRIPTIONS[row.ai_material_type] || 'Construction material',
      ai_version: 'v1.0_seed_data',
      image_url: null,
      title: row.title,
      description: row.description,
      embedding: [],
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random time in last 7 days
    }
  }));
  
  console.log(`[BigQuery] Inserting ${formattedRows.length} seed rows...`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows: formattedRows }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('BigQuery insert error:', response.status, error);
    return { success: false, insertedCount: 0, errors: [error] };
  }
  
  const result = await response.json();
  
  if (result.insertErrors && result.insertErrors.length > 0) {
    console.error('BigQuery insert errors:', result.insertErrors);
    return { 
      success: false, 
      insertedCount: formattedRows.length - result.insertErrors.length,
      errors: result.insertErrors 
    };
  }
  
  console.log('[BigQuery] Seed data inserted successfully');
  return { success: true, insertedCount: formattedRows.length, errors: [] };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_PROJECT_ID = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
    const GOOGLE_SERVICE_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');

    if (!GOOGLE_PROJECT_ID || !GOOGLE_SERVICE_KEY) {
      throw new Error('Google Cloud credentials not configured. Set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_SERVICE_ACCOUNT_KEY.');
    }

    console.log('[Seed] Getting Google access token...');
    const accessToken = await getGoogleAccessToken(GOOGLE_SERVICE_KEY);
    
    console.log('[Seed] Inserting seed data into BigQuery...');
    const result = await insertBatchIntoBigQuery(accessToken, GOOGLE_PROJECT_ID, SEED_DATA);
    
    return new Response(JSON.stringify({
      message: result.success ? 'Seed data inserted successfully' : 'Seed data insertion had errors',
      insertedCount: result.insertedCount,
      totalRecords: SEED_DATA.length,
      errors: result.errors.length > 0 ? result.errors : undefined,
      lookerStudioInstructions: {
        step1: 'Go to https://lookerstudio.google.com/',
        step2: 'Click Create → Data source → BigQuery',
        step3: `Navigate to: ${GOOGLE_PROJECT_ID} → resite_mvp → material_ai_events`,
        step4: 'Click Connect, then Create Report',
        suggestedCharts: [
          'Pie chart: ai_material_type distribution',
          'Time series: timestamp by day',
          'Table: material_type_user vs ai_material_type (confusion matrix)',
          'Histogram: ai_confidence distribution'
        ]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Seed error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Seed failed',
      troubleshooting: [
        'Ensure GOOGLE_CLOUD_PROJECT_ID secret is set',
        'Ensure GOOGLE_SERVICE_ACCOUNT_KEY secret contains valid JSON',
        'Ensure BigQuery dataset "resite_mvp" exists in your project',
        'Ensure table "material_ai_events" exists with correct schema',
        'Service account needs BigQuery Data Editor + Job User roles'
      ]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
