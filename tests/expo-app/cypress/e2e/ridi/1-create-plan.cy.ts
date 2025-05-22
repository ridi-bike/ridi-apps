describe("ridi basic", () => {
  beforeEach(() => {
    cy.visit("http://127.0.0.1:8081/");
  });

  it("create round trip", () => {
    cy.get(".r-WebkitOverflowScrolling-150rngu").click();
    cy.get(".border-black > .css-text-146c3p1").click();
    cy.get(".maplibregl-canvas").click();
    cy.get(".maplibregl-interactive > .maplibregl-canvas").click();
    cy.get(".py-3 > .css-text-146c3p1").click();
    cy.get(".text-center").click();
    cy.get(
      ".css-view-175oi2r:nth-child(1) > .css-view-175oi2r > .css-view-175oi2r > .css-view-175oi2r:nth-child(2) > .css-view-175oi2r > .css-view-175oi2r:nth-child(4)",
    ).click();
    cy.get(
      ".css-view-175oi2r:nth-child(2) > .css-view-175oi2r > .css-view-175oi2r > .css-view-175oi2r > .css-view-175oi2r > .css-view-175oi2r:nth-child(4)",
    ).click();
    cy.get(
      ".css-view-175oi2r:nth-child(1) > .css-view-175oi2r:nth-child(1) > .css-view-175oi2r:nth-child(2) > .css-text-146c3p1:nth-child(2)",
    ).click();
  });

  it("open generated route", () => {
    cy.get(".r-WebkitOverflowScrolling-150rngu").click();
    cy.get(".mb-4 > .css-view-175oi2r:nth-child(2)").click();
    cy.get(
      ".css-text-146c3p1:nth-child(1) > .css-view-175oi2r > .css-view-175oi2r:nth-child(2) > .css-view-175oi2r:nth-child(1)",
    ).click();
  });
});
