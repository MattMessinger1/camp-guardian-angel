describe('Ready to Signup Workflow', () => {
  it('complete e2e flow', () => {
    // Step 1: Homepage
    cy.visit('/')
    cy.get('body').should('be.visible')
    
    // Step 2: Session page  
    cy.visit('/sessions/555555555501')
    cy.get('body').should('be.visible')
    
    // Step 3: Signup flow
    cy.visit('/signup?sessionId=555555555501')
    cy.get('body').should('be.visible')
    
    // Step 4: Confirmation
    cy.visit('/sessions/555555555501/confirmation')
    cy.get('body').should('be.visible')
    
    // Step 5: Account history
    cy.visit('/account/history')
    cy.get('body').should('be.visible')
  })
})