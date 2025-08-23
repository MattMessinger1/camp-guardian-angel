describe('Homepage', () => {
  it('loads correctly', () => {
    cy.visit('/')
    cy.get('body').should('be.visible')
    cy.title().should('contain', 'CampRush')
  })

  it('has search functionality', () => {
    cy.visit('/')
    cy.get('input[placeholder*="Activity"]').should('be.visible')
    cy.contains('Reserve my spot').should('be.visible')
  })
})