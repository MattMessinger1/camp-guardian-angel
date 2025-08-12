import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive",
  "Content-Type": "text/event-stream",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "session_id parameter required" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      console.log(`[STREAM-LOGS] Starting log stream for session ${sessionId}`);
      
      const encoder = new TextEncoder();
      
      // Send initial connection message
      const sendEvent = (data: any) => {
        const event = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(event));
      };

      sendEvent({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Log stream started for session ${sessionId}`
      });

      // Simulate prewarm activity logs
      let logCount = 0;
      const interval = setInterval(() => {
        logCount++;
        
        const logMessages = [
          `[RUN-PREWARM] Starting enhanced prewarm for session ${sessionId}`,
          `[RUN-PREWARM] Lock acquisition attempt...`,
          `[RUN-PREWARM] Lock acquired successfully`,
          `[RUN-PREWARM] Session "${sessionId}" timing analysis...`,
          `[TIME-SYNC] NTP sync successful - Skew: 12ms, Latency: 34ms`,
          `[RUN-PREWARM] DNS warming for provider domain...`,
          `[DNS-WARM] Warmed DNS for provider.example.com`,
          `[RUN-PREWARM] Pre-fetching provider form metadata...`,
          `[STRIPE-WARM] Stripe validation successful`,
          `[RUN-PREWARM] Exact timing: Sleeping 4250ms until T-5 seconds`,
          `[REGISTRATION-LOOP] Starting tight loop from T-5s to T+10s (max attempts: 50)`,
          `[ATTEMPT-1] T+0ms (skew-corrected, jitter: 67.3ms) - Attempting registrations`,
          `[ATTEMPT-2] T+100ms (skew-corrected, jitter: 23.8ms) - Attempting registrations`,
          `[SUCCESS] Registration ${crypto.randomUUID()} accepted at T+150ms (skew-corrected)`,
          `[BACKOFF] First success achieved, implementing backoff`,
          `[RUN-PREWARM] Payment capture initiated for registration`,
          `[REGISTRATION-LOOP] Completed: 1 successful, 0 failed, 2 attempts`,
          `[RUN-PREWARM] Lock released for session ${sessionId}`,
        ];

        if (logCount <= logMessages.length) {
          const levels = ['info', 'info', 'info', 'info', 'info', 'info', 'info', 'warn', 'info', 'info', 'info', 'info', 'info', 'info', 'info', 'info', 'info', 'info'];
          
          sendEvent({
            timestamp: new Date().toISOString(),
            level: levels[logCount - 1] || 'info',
            message: logMessages[logCount - 1]
          });
        } else {
          // Send periodic "waiting" messages
          sendEvent({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `[STREAM-LOGS] Monitoring session ${sessionId}... (${logCount - logMessages.length}s elapsed)`
          });
        }

        // Stop after 2 minutes of simulation
        if (logCount > 120) {
          clearInterval(interval);
          sendEvent({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '[STREAM-LOGS] Log simulation completed'
          });
          controller.close();
        }
      }, 1000); // Send a log every second

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        console.log(`[STREAM-LOGS] Client disconnected for session ${sessionId}`);
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: corsHeaders,
  });
});