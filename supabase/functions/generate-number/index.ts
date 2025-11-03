import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  user_id: string;
  nama: string;
  lokasi: string;
  departemen: string;
  jenis_surat: string;
  deskripsi: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client with optional auth for anonymous users
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? {
        global: {
          headers: { Authorization: authHeader },
        },
      } : {}
    );

    const body: RequestBody = await req.json();
    const { user_id, nama, lokasi, departemen, jenis_surat, deskripsi } = body;

    // Get location abbreviation
    const { data: locationData } = await supabaseClient
      .from('locations')
      .select('singkatan')
      .eq('nama', lokasi)
      .single();

    // Get department abbreviation
    const { data: departmentData } = await supabaseClient
      .from('departments')
      .select('singkatan')
      .eq('nama', departemen)
      .single();

    // Get document type abbreviation
    const { data: docTypeData } = await supabaseClient
      .from('document_types')
      .select('singkatan')
      .eq('nama', jenis_surat)
      .single();

    if (!locationData || !departmentData || !docTypeData) {
      throw new Error('Invalid master data');
    }

    const locationAbbr = locationData.singkatan;
    const deptAbbr = departmentData.singkatan;
    const docTypeAbbr = docTypeData.singkatan;

    // Get current date info
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Convert month to Roman numerals
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[month - 1];

    // Calculate next number
    let nextNumber = 1;
    
    // Special logic for BDS department
    if (deptAbbr === 'BDS') {
      // Count ALL documents in BDS department for current month/year
      const { count } = await supabaseClient
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('departemen', departemen)
        .gte('created_at', `${year}-${month.toString().padStart(2, '0')}-01`)
        .lt('created_at', month === 12 ? `${year + 1}-01-01` : `${year}-${(month + 1).toString().padStart(2, '0')}-01`);
      
      nextNumber = (count || 0) + 1;
    } else {
      // Count only same document type for other departments
      const { count } = await supabaseClient
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('departemen', departemen)
        .eq('jenis_surat', jenis_surat)
        .eq('lokasi', lokasi)
        .gte('created_at', `${year}-${month.toString().padStart(2, '0')}-01`)
        .lt('created_at', month === 12 ? `${year + 1}-01-01` : `${year}-${(month + 1).toString().padStart(2, '0')}-01`);
      
      nextNumber = (count || 0) + 1;
    }

    // Format number as 3 digits
    const formattedNumber = nextNumber.toString().padStart(3, '0');

    // Generate final number: 001/PI-BPN/OPS/L/I/2025
    const generatedNumber = `${formattedNumber}/PI-${locationAbbr}/${deptAbbr}/${docTypeAbbr}/${romanMonth}/${year}`;

    // Save to database
    const { error: insertError } = await supabaseClient
      .from('documents')
      .insert({
        user_id,
        nama,
        nomor_surat: generatedNumber,
        jenis_surat,
        deskripsi,
        lokasi,
        departemen,
      });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ number: generatedNumber }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating number:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
