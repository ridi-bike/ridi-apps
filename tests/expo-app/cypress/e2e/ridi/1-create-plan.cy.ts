describe("ridi basic", () => {
  it("create start-finish logged out", () => {
    cy.visit(Cypress.env("RIDI_APP_URL"));

    cy.get("button").contains("Try it out").click();
    cy.wait(2000);
    cy.get("button[aria-label*='Dualsport']").click();
    cy.get("button").contains("Trip details").click({ force: true });
    cy.wait(2000);

    cy.get("a[aria-label*='Search']").click();
    cy.get("input[placeholder*='Search coordinates']").type("sigulda");
    cy.get("button[aria-label*='Start Search']").click();
    cy.wait(2000);
    cy.get("button").contains("Sigulda").click();
    cy.get("button").contains("Set Start").click();
    cy.wait(2000);

    cy.get("a[aria-label*='Search']").click();
    cy.get("input[placeholder*='Search coordinates']").type("cēsis");
    cy.get("button[aria-label*='Start Search']").click();
    cy.wait(2000);
    cy.get("button").contains("Cēsis").click();
    cy.get("button").contains("Set Finish").click();
    cy.wait(2000);

    cy.get("button").contains("OK").click();
    cy.get("button").contains("OK").click();
    cy.wait(2 * 60 * 1000);

    cy.get("a").contains("Road Type Breakdown").click();
    cy.wait(2000);

    cy.get("button").contains("Download Route GPX").click();
    cy.get("button").contains("Login").should("be.visible");
  });
});
