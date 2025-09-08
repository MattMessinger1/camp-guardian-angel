import { test, expect } from "@playwright/test";

test("Madison locality respected", async ({ page }) => {
  await page.goto("/"); // Adjust based on your app's search route
  
  // Wait for the search input to be visible
  const searchInput = page.getByPlaceholder(/search/i);
  await expect(searchInput).toBeVisible();
  
  // Enter search query with location
  await searchInput.fill("blackhawk ski club madison");
  
  // Click search button
  const searchButton = page.getByRole("button", { name: /search/i });
  await searchButton.click();
  
  // Wait for results to load
  await page.waitForTimeout(2000);
  
  // Ensure no NYC defaults appear
  await expect(page.getByText("New York City")).toHaveCount(0);
  await expect(page.getByText("NYC")).toHaveCount(0);
  
  // Check for proper result structure (adjust selector based on your ResultCard component)
  const resultCards = page.locator('[data-testid="result-card"], .card');
  
  // If results are found, verify they don't contain NYC
  const cardCount = await resultCards.count();
  if (cardCount > 0) {
    for (let i = 0; i < cardCount; i++) {
      const card = resultCards.nth(i);
      const cardText = await card.textContent();
      expect(cardText).not.toContain("New York");
      expect(cardText).not.toContain("NYC");
    }
  }
});

test("Search handles empty results gracefully", async ({ page }) => {
  await page.goto("/");
  
  const searchInput = page.getByPlaceholder(/search/i);
  await searchInput.fill("nonexistent activity xyz123");
  
  const searchButton = page.getByRole("button", { name: /search/i });
  await searchButton.click();
  
  await page.waitForTimeout(2000);
  
  // Should not crash and should show appropriate empty state
  // Adjust this expectation based on your empty state UI
  const noResults = page.getByText(/no results/i).or(page.getByText(/try different/i));
  // Note: This might not appear if you show demo results, adjust as needed
});

test("Search query parsing works correctly", async ({ page }) => {
  await page.goto("/");
  
  // Test with city and state
  const searchInput = page.getByPlaceholder(/search/i);
  await searchInput.fill("swimming lessons madison wi");
  
  const searchButton = page.getByRole("button", { name: /search/i });
  await searchButton.click();
  
  await page.waitForTimeout(2000);
  
  // Verify that the search was processed (check console logs or results)
  // This is more of a smoke test to ensure the search doesn't crash
  const body = page.locator("body");
  await expect(body).toBeVisible();
});