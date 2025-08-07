describe("ridi basic", () => {
  // it("start-finish, dualsport, search, ok, ok", () => {
  //   cy.visit(Cypress.env("RIDI_APP_URL"));
  //
  //   cy.get("button").contains("Try it out").click();
  //   cy.wait(2000);
  //   cy.get("button[aria-label*='Dualsport']").click();
  //   cy.get("button").contains("Trip details").click({ force: true });
  //   cy.wait(2000);
  //
  //   cy.get("a[aria-label*='Search']").click();
  //   cy.get("input[placeholder*='Search coordinates']").type("sigulda");
  //   cy.get("button[aria-label*='Start Search']").click();
  //   cy.wait(2000);
  //   cy.get("button").contains("Sigulda").click();
  //   cy.get("button").contains("Set Start").click();
  //   cy.wait(2000);
  //
  //   cy.get("a[aria-label*='Search']").click();
  //   cy.get("input[placeholder*='Search coordinates']").type("cēsis");
  //   cy.get("button[aria-label*='Start Search']").click();
  //   cy.wait(2000);
  //   cy.get("button").contains("Cēsis").click();
  //   cy.get("button").contains("Set Finish").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("OK").click();
  //   cy.get("button").contains("OK").click();
  //   cy.wait(2 * 60 * 1000);
  //
  //   cy.get("a").contains("Road Type Breakdown").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Download Route GPX").click();
  //   cy.get("button").contains("Login").should("be.visible");
  // });
  // it("round-trip, map select, touring, back, ok", () => {
  //   cy.visit(Cypress.env("RIDI_APP_URL"));
  //
  //   cy.get("button").contains("Try it out").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Round Trip").click();
  //   cy.wait(2000);
  //
  //   cy.get("button[aria-label*='Touring']").click();
  //   cy.get("button").contains("Overview").click({ force: true });
  //   cy.wait(2000);
  //
  //   cy.get("#map-coords-selector").click();
  //   cy.get("button").contains("Set Start/Finish").click();
  //   cy.wait(2000);
  //
  //   cy.get("button[aria-label*='Go back']").last().click();
  //   cy.wait(2000);
  //
  //   cy.get("#bearing-slider").click(); // should click in the middle
  //   cy.wait(2000);
  //
  //   cy.get("#distance-slider").click(); // should click in the middle
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("OK").click();
  //   cy.wait(2 * 60 * 1000);
  //
  //   cy.contains("div", "200km").should("be.visible");
  //   cy.contains("div", "S (").should("be.visible");
  //
  //   cy.get("a").contains("Road Type Breakdown").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Download Route GPX").click();
  //   cy.get("button").contains("Login").should("be.visible");

  // it("point search", () => {
  //   cy.visit(Cypress.env("RIDI_APP_URL"));
  //
  //   cy.get("button").contains("Try it out").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Round Trip").click();
  //   cy.get("button[aria-label*='Touring']").click();
  //
  //   cy.get("button").contains("Trip details").click({ force: true });
  //   cy.wait(2000);
  //
  //   cy.get("a[aria-label*='Search']").click();
  //   cy.get("input[placeholder*='Search coordinates']").type("raunas iela");
  //   cy.get("button[aria-label*='Start Search']").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Show all on map").click();
  //   cy.wait(2000);
  //
  //   cy.get("button:has(#search-point)").last().click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Set Start/Finish").click();
  //   cy.wait(2000);
  //
  //   cy.get("button:has(#start)").last().click();
  //   cy.wait(2000);
  //   cy.get("button").contains("Clear Point").click();
  //   cy.wait(2000);
  //
  //   cy.get("button:has(#search-point)").first().click({ force: true });
  //   cy.wait(2000);
  //   cy.get("button").contains("Set Start/Finish").click();
  //   cy.wait(2000);
  //   cy.get("button").contains("OK").click();
  //   cy.wait(2000);
  //
  //   cy.contains("button", "Round Trip").should("have.class", "bg-[#FF5937]");
  //   cy.get("button[aria-label*='Touring']").should(
  //     "have.class",
  //     "bg-[#FF5937]",
  //   );
  //   cy.contains("button", "Trip details").should("contain.text", "Raunas iela");
  // });
  // it("regions", () => {
  //   cy.visit(Cypress.env("RIDI_APP_URL"));
  //
  //   cy.get("button").contains("Try it out").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Trip details").click({ force: true });
  //   cy.wait(2000);
  //
  //   cy.get("a[aria-label*='Search']").click();
  //   cy.get("input[placeholder*='Search coordinates']").type("moscow");
  //   cy.get("button[aria-label*='Start Search']").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Moscow").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Set Finish").click();
  //   cy.wait(4000);
  //
  //   cy.contains("div", "Journey start or finish in unsupported region").should(
  //     "be.visible",
  //   );
  //   cy.contains("button", "OK").should("be.disabled");
  //
  //   cy.get("button:has(#finish)").last().click();
  //   cy.wait(2000);
  //   cy.get("button").contains("Clear Point").click();
  //   cy.wait(2000);
  //
  //   cy.get("a[aria-label*='Search']").click();
  //   cy.get("input[placeholder*='Search coordinates']").type("riga");
  //   cy.get("button[aria-label*='Start Search']").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Riga").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Set Finish").click();
  //   cy.wait(2000);
  //
  //   cy.get("a[aria-label*='Search']").click();
  //   cy.get("input[placeholder*='Search coordinates']").type("athens");
  //   cy.get("button[aria-label*='Start Search']").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Athens").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Set Start").click();
  //   cy.wait(6000);
  //
  //   cy.contains(
  //     "div",
  //     "Journey start and finish is in different regions",
  //   ).should("be.visible");
  //   cy.contains("button", "OK").should("be.disabled");
  // });
  // it("center mode", () => {
  //   cy.visit(Cypress.env("RIDI_APP_URL"));
  //
  //   cy.get("button").contains("Try it out").click();
  //   cy.wait(2000);
  //
  //   cy.get("button").contains("Trip details").click({ force: true });
  //   cy.wait(2000);
  //
  //   cy.get("button[aria-label*='Enable Map Center Point']").click();
  //   cy.get("button:has(#center)").click();
  //   cy.get("button").contains("Set Finish").click();
  //
  //   cy.get("#map-coords-selector")
  //     .trigger("mousedown", 100, 100, { force: true })
  //     .wait(200)
  //     .trigger("mousemove", 500, 500, { force: true })
  //     .wait(200)
  //     .trigger("mouseup", { force: true });
  //
  //   cy.get("button:has(#center)").click();
  //   cy.get("button").contains("Set Start").click();
  //
  //   cy.get("button:has(#finish)").last().click();
  //   cy.wait(2000);
  //   cy.get("button").contains("Clear Point").click();
  //   cy.wait(2000);
  //
  //   cy.get("button:has(#start)").last().click();
  //   cy.wait(2000);
  //   cy.get("button").contains("Clear Point").click();
  //   cy.wait(2000);
  // });
  it("hint", () => {
    cy.visit(Cypress.env("RIDI_APP_URL"));

    cy.get("button").contains("Try it out").click();
    cy.wait(2000);

    cy.get("button").contains("Trip details").click({ force: true });
    cy.wait(2000);

    cy.get("#map-coords-selector").click();
    cy.get("button").contains("Cancel").click();
    cy.wait(2000);
    cy.get("#map-coords-selector").click();
    cy.get("button").contains("Cancel").click();
    cy.wait(2000);
    cy.get("#map-coords-selector").click();
    cy.get("button").contains("Cancel").click();
    cy.wait(2000);
    cy.get("#map-coords-selector").click();
    cy.get("button").contains("Cancel").click();
    cy.wait(2000);
    cy.get("#map-coords-selector").click();
    cy.get("button").contains("Cancel").click();
    cy.wait(2000);
    cy.get("#map-coords-selector").click();
    cy.get("button").contains("Cancel").click();
    cy.wait(2000);

    cy.contains("div", "Try using map center selector").should("be.visible");
  });
});
