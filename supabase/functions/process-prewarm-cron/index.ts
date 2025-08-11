import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all due prewarm jobs (prewarm_at <= now AND status='scheduled')
    const { data: dueJobs, error: fetchError } = await supabase
      .from('prewarm_jobs')
      .select('id, session_id')
      .lte('prewarm_at', new Date().toISOString())
      .eq('status', 'scheduled')

    if (fetchError) {
      console.error('Error fetching due prewarm jobs:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch due jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!dueJobs || dueJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No due prewarm jobs found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${dueJobs.length} due prewarm jobs`)

    // Process each due job
    const results = await Promise.allSettled(
      dueJobs.map(async (job) => {
        // Mark job as running
        const { error: updateError } = await supabase
          .from('prewarm_jobs')
          .update({ status: 'running', updated_at: new Date().toISOString() })
          .eq('id', job.id)

        if (updateError) {
          console.error(`Error updating job ${job.id} to running:`, updateError)
          throw updateError
        }

        // Invoke runPrewarm function
        try {
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/run-prewarm`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ session_id: job.session_id }),
            }
          )

          if (!response.ok) {
            throw new Error(`runPrewarm failed with status ${response.status}`)
          }

          // Mark job as completed
          await supabase
            .from('prewarm_jobs')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', job.id)

          return { job_id: job.id, session_id: job.session_id, status: 'completed' }
        } catch (error) {
          console.error(`Error running prewarm for job ${job.id}:`, error)
          
          // Mark job as failed
          await supabase
            .from('prewarm_jobs')
            .update({ 
              status: 'failed', 
              error_message: error.message,
              updated_at: new Date().toISOString() 
            })
            .eq('id', job.id)

          throw error
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`Prewarm processing complete: ${successful} successful, ${failed} failed`)

    return new Response(
      JSON.stringify({ 
        message: 'Prewarm cron processing complete',
        total: dueJobs.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message })
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-prewarm-cron function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})