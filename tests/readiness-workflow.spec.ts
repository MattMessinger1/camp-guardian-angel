import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ezvwyfqtyanwnoyymhav.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI';

test.describe('Readiness Workflow', () => {
  let supabase: any;
  let testUser: any;
  let testSession: any;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Create test user
    const { data: authData } = await supabase.auth.signUp({
      email: `readiness-test-${Date.now()}@test.com`,
      password: 'test123456',
    });
    testUser = authData.user;

    // Create test session
    const { data: sessionData } = await supabase
      .from('sessions')
      .insert({
        title: 'Test Summer Camp',
        open_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        camp_id: '123e4567-e89b-12d3-a456-426614174000',
        provider_id: '123e4567-e89b-12d3-a456-426614174001',
      })
      .select()
      .single();
    testSession = sessionData;
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (testSession) {
      await supabase.from('sessions').delete().eq('id', testSession.id);
    }
    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.id);
    }
  });

  test('displays session readiness card with needs setup status', async ({ page }) => {
    await page.goto('/sessions');
    
    // Should show readiness card for upcoming session
    await expect(page.getByTestId('session-readiness-card')).toBeVisible();
    await expect(page.getByText('Setup Required')).toBeVisible();
    await expect(page.getByText('Research Required')).toBeVisible();
  });

  test('opens requirement research modal and submits research', async ({ page }) => {
    await page.goto('/sessions');
    
    // Click research requirements button
    await page.click('[data-testid="research-requirements-btn"]');
    
    // Modal should open
    await expect(page.getByTestId('requirement-research-modal')).toBeVisible();
    await expect(page.getByText('Research Session Requirements')).toBeVisible();
    
    // Fill out research form
    await page.fill('[data-testid="deposit-amount"]', '150');
    await page.selectOption('[data-testid="deposit-required"]', 'yes');
    
    // Add required fields
    await page.click('[data-testid="add-child-field"]');
    await page.fill('[data-testid="child-field-0"]', 'Full Name');
    await page.click('[data-testid="add-parent-field"]');
    await page.fill('[data-testid="parent-field-0"]', 'Emergency Contact');
    
    // Add documents
    await page.click('[data-testid="add-document"]');
    await page.fill('[data-testid="document-0"]', 'Medical Waiver');
    
    // Set confidence level
    await page.selectOption('[data-testid="confidence-level"]', '4');
    
    // Submit research
    await page.click('[data-testid="submit-research"]');
    
    // Should show success message
    await expect(page.getByText('Research submitted successfully')).toBeVisible();
    
    // Modal should close
    await expect(page.getByTestId('requirement-research-modal')).not.toBeVisible();
  });

  test('shows in progress status after research submission', async ({ page }) => {
    await page.goto('/sessions');
    
    // Should now show in progress status
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Under Review')).toBeVisible();
  });

  test('shows ready for signup status after high confidence research', async ({ page }) => {
    // Submit high confidence research
    await page.goto('/sessions');
    await page.click('[data-testid="research-requirements-btn"]');
    
    await page.fill('[data-testid="deposit-amount"]', '200');
    await page.selectOption('[data-testid="confidence-level"]', '5'); // Very confident
    await page.click('[data-testid="submit-research"]');
    
    // Should auto-accept and show ready status
    await expect(page.getByText('Ready for Signup')).toBeVisible();
    await expect(page.getByText('All Set!')).toBeVisible();
    await expect(page.getByTestId('complete-prep-btn')).toBeVisible();
  });

  test('prevents duplicate research submissions', async ({ page }) => {
    await page.goto('/sessions');
    
    // Try to research again
    await page.click('[data-testid="research-requirements-btn"]');
    
    // Should show existing research instead of blank form
    await expect(page.getByText('Previous Research')).toBeVisible();
    await expect(page.getByDisplayValue('200')).toBeVisible(); // Previous deposit amount
  });

  test('shows urgency indicators for sessions close to opening', async ({ page }) => {
    // Create session opening tomorrow
    const { data: urgentSession } = await supabase
      .from('sessions')
      .insert({
        title: 'Urgent Test Camp',
        open_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        camp_id: '123e4567-e89b-12d3-a456-426614174000',
        provider_id: '123e4567-e89b-12d3-a456-426614174001',
      })
      .select()
      .single();

    await page.goto('/sessions');
    
    // Should show urgency styling
    await expect(page.getByText('Opens Tomorrow')).toBeVisible();
    await expect(page.locator('[data-urgency="high"]')).toBeVisible();
    
    // Cleanup
    await supabase.from('sessions').delete().eq('id', urgentSession.id);
  });

  test('tracks readiness progress correctly', async ({ page }) => {
    await page.goto('/sessions');
    
    // Should show progress indicators
    await expect(page.getByTestId('readiness-progress')).toBeVisible();
    await expect(page.getByText('2 of 3 complete')).toBeVisible(); // Research + verification done
    
    // Progress bar should reflect completion
    const progressBar = page.getByTestId('progress-bar');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '67'); // 2/3 = 67%
  });

  test('displays requirement preview correctly', async ({ page }) => {
    await page.goto('/sessions');
    
    // Should show requirement preview based on research
    await expect(page.getByText('$200 deposit')).toBeVisible();
    await expect(page.getByText('Medical Waiver')).toBeVisible();
    await expect(page.getByText('Emergency Contact')).toBeVisible();
    await expect(page.getByText('Full Name')).toBeVisible();
  });
});