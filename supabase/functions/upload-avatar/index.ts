import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseDataUrl(input: string): { mime: string; bytes: Uint8Array } {
  // data:[<mediatype>][;base64],<data>
  if (input.startsWith('data:')) {
    const match = input.match(/^data:(.*?);base64,(.*)$/);
    if (!match) throw new Error('Invalid data URL');
    const mime = match[1] || 'application/octet-stream';
    const b64 = match[2];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return { mime, bytes };
  }
  // Assume plain base64 string, default to png
  const mime = 'image/png';
  const bytes = Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
  return { mime, bytes };
}

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'bin';
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { file, filename, folder, modelId } = await req.json();
    if (!file || typeof file !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing file (base64 or data URL)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { mime, bytes } = parseDataUrl(file);
    const ext = extFromMime(mime);
    const baseName = filename && typeof filename === 'string' && filename.trim().length > 0
      ? filename.replace(/[^a-zA-Z0-9_.-]/g, '_')
      : `${crypto.randomUUID()}.${ext}`;
    const dir = (folder || modelId || 'misc').toString().replace(/[^a-zA-Z0-9_\/-]/g, '_');
    const path = `${dir}/${baseName.endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`}`;

    // Limit ~5MB
    if (bytes.length > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large (max 5MB)' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const blob = new Blob([bytes.buffer], { type: mime });
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType: mime, upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);

    return new Response(
      JSON.stringify({ path, publicUrl: pub.publicUrl, mimeType: mime, size: bytes.length }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
