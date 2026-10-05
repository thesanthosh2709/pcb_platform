import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  // 1. Verify CRON_SECRET to prevent unauthorized public execution
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Initialize Supabase client
  // Using SUPABASE_SERVICE_ROLE_KEY is recommended for backend admin tasks to bypass RLS, falling back to anon key.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 3. Calculate timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const timeThreshold = twentyFourHoursAgo.toISOString();

    // 4. Query old records
    const { data: oldRequests, error: fetchError } = await supabase
      .from('component_requests')
      .select('id, file_url')
      .lt('created_at', timeThreshold);

    if (fetchError) throw fetchError;

    if (!oldRequests || oldRequests.length === 0) {
      return NextResponse.json({ message: 'No old requests to clean up.' }, { status: 200 });
    }

    const pathsToDelete: string[] = [];
    const idsToDelete: number[] = [];

    // 5. Extract file paths and IDs
    oldRequests.forEach((req) => {
      idsToDelete.push(req.id);
      if (req.file_url) {
        // Extract the physical file path by splitting the public URL
        const parts = req.file_url.split('/request_files/');
        if (parts.length > 1) {
          pathsToDelete.push(parts[1]);
        }
      }
    });

    // 6. Delete physical files from Supabase Storage
    if (pathsToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('request_files')
        .remove(pathsToDelete);
      
      if (storageError) {
        console.error("Error deleting from storage:", storageError);
      }
    }

    // 7. Delete rows from Postgres Database
    if (idsToDelete.length > 0) {
      const { error: dbError } = await supabase
        .from('component_requests')
        .delete()
        .in('id', idsToDelete);
        
      if (dbError) throw dbError;
    }

    return NextResponse.json({ 
      message: 'Cleanup successful', 
      deleted_count: idsToDelete.length,
      files_deleted: pathsToDelete.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('Cleanup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
