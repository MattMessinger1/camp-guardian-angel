import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ezvwyfqtyanwnoyymhav.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Readiness Integration Tests', () => {
  let supabase: any;
  
  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  });

  test('requirement discovery prioritizes confirmed over research', async () => {
    // Test the discovery hierarchy: confirmed > research > defaults
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';
    
    // Insert confirmed requirements
    await supabase.from('session_requirements').insert({
      session_id: sessionId,
      deposit_amount_cents: 25000,
      status: 'confirmed',
      confidence_score: 1.0,
    });
    
    // Insert user research with different values
    await supabase.from('user_requirement_research').insert({
      session_id: sessionId,
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      deposit_amount_cents: 15000,
      status: 'accepted',
      confidence_rating: 4,
    });
    
    // Call discovery function
    const { data } = await supabase.functions.invoke('discover-session-requirements', {
      body: { session_id: sessionId }
    });
    
    // Should prioritize confirmed requirements
    expect(data.requirements.deposit_amount_cents).toBe(25000);
    expect(data.requirements.confidence_score).toBe(1.0);
    
    // Cleanup
    await supabase.from('session_requirements').delete().eq('session_id', sessionId);
    await supabase.from('user_requirement_research').delete().eq('session_id', sessionId);
  });

  test('auto-accepts high confidence research submissions', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174002';
    const userId = '123e4567-e89b-12d3-a456-426614174003';
    
    // Submit high confidence research
    const { data } = await supabase.functions.invoke('submit-requirement-research', {
      body: {
        session_id: sessionId,
        deposit_amount_cents: 18000,
        deposit_required: true,
        child_fields: ['name', 'dob', 'allergies'],
        parent_fields: ['email', 'phone'],
        documents: ['waiver', 'medical_form'],
        confidence_rating: 5,
        research_notes: 'Called camp directly, very confident in requirements'
      },
      headers: {
        Authorization: `Bearer ${userId}` // Mock auth
      }
    });
    
    expect(data.status).toBe('accepted');
    expect(data.message).toContain('auto-accepted');
    
    // Verify it was accepted in database
    const { data: research } = await supabase
      .from('user_requirement_research')
      .select('status')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();
    
    expect(research.status).toBe('accepted');
    
    // Cleanup
    await supabase.from('user_requirement_research').delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);
  });

  test('marks low confidence research for review', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174004';
    const userId = '123e4567-e89b-12d3-a456-426614174005';
    
    // Submit low confidence research
    const { data } = await supabase.functions.invoke('submit-requirement-research', {
      body: {
        session_id: sessionId,
        deposit_amount_cents: 12000,
        deposit_required: false,
        child_fields: ['name'],
        parent_fields: ['email'],
        documents: [],
        confidence_rating: 2,
        research_notes: 'Could not find clear information online'
      },
      headers: {
        Authorization: `Bearer ${userId}`
      }
    });
    
    expect(data.status).toBe('pending');
    expect(data.message).toContain('review');
    
    // Verify status in database
    const { data: research } = await supabase
      .from('user_requirement_research')
      .select('status')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();
    
    expect(research.status).toBe('pending');
    
    // Cleanup
    await supabase.from('user_requirement_research').delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);
  });

  test('updates user readiness tracking correctly', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174006';
    const userId = '123e4567-e89b-12d3-a456-426614174007';
    
    // Submit research
    await supabase.functions.invoke('submit-requirement-research', {
      body: {
        session_id: sessionId,
        deposit_amount_cents: 20000,
        confidence_rating: 4,
      },
      headers: {
        Authorization: `Bearer ${userId}`
      }
    });
    
    // Check readiness tracking was updated
    const { data: readiness } = await supabase
      .from('user_session_readiness')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();
    
    expect(readiness).toBeTruthy();
    expect(readiness.requirements_researched).toBe(true);
    expect(readiness.status).toBe('in_progress');
    expect(readiness.last_activity_at).toBeTruthy();
    
    // Cleanup
    await supabase.from('user_requirement_research').delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);
    await supabase.from('user_session_readiness').delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);
  });

  test('suggests research for sessions close to opening', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174008';
    
    // Create session opening in 10 days
    await supabase.from('sessions').insert({
      id: sessionId,
      title: 'Test Camp',
      open_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      camp_id: '123e4567-e89b-12d3-a456-426614174000',
      provider_id: '123e4567-e89b-12d3-a456-426614174001',
    });
    
    // Call discovery
    const { data } = await supabase.functions.invoke('discover-session-requirements', {
      body: { session_id: sessionId }
    });
    
    expect(data.daysUntilSignup).toBe(10);
    expect(data.suggestUserResearch).toBe(true); // Within 14 days
    
    // Cleanup
    await supabase.from('sessions').delete().eq('id', sessionId);
  });

  test('validates research submission data', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174009';
    const userId = '123e4567-e89b-12d3-a456-426614174010';
    
    // Submit invalid research (missing required fields)
    const { error } = await supabase.functions.invoke('submit-requirement-research', {
      body: {
        session_id: sessionId,
        // Missing deposit_amount_cents and confidence_rating
      },
      headers: {
        Authorization: `Bearer ${userId}`
      }
    });
    
    expect(error).toBeTruthy();
    expect(error.message).toContain('validation');
  });

  test('prevents research for non-existent sessions', async () => {
    const nonExistentSessionId = '123e4567-e89b-12d3-a456-999999999';
    const userId = '123e4567-e89b-12d3-a456-426614174011';
    
    const { error } = await supabase.functions.invoke('submit-requirement-research', {
      body: {
        session_id: nonExistentSessionId,
        deposit_amount_cents: 15000,
        confidence_rating: 3,
      },
      headers: {
        Authorization: `Bearer ${userId}`
      }
    });
    
    expect(error).toBeTruthy();
    expect(error.message).toContain('Session not found');
  });
});