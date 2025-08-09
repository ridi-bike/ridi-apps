describe("ridi basic", () => {
  it("start-finish, dualsport, search, ok, ok", () => {
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
  it("round-trip, map select, touring, back, ok", () => {
    cy.visit(Cypress.env("RIDI_APP_URL"));

    cy.get("button").contains("Try it out").click();
    cy.wait(2000);

    cy.get("button").contains("Round Trip").click();
    cy.wait(2000);

    cy.get("button[aria-label*='Touring']").click();
    cy.get("button").contains("Overview").click({ force: true });
    cy.wait(2000);

    cy.get("#map-coords-selector").click();
    cy.get("button").contains("Set Start/Finish").click();
    cy.wait(2000);

    cy.get("button[aria-label*='Go back']").filter(":visible").click();
    cy.wait(3000);

    cy.get("#bearing-slider").click(); // should click in the middle
    cy.wait(2000);

    cy.get("#distance-slider").click(); // should click in the middle
    cy.wait(2000);

    cy.get("button").contains("OK").click();
    cy.wait(2 * 60 * 1000);

    cy.contains("div", "200km").should("be.visible");
    cy.contains("div", "S (").should("be.visible");

    cy.get("a").contains("Road Type Breakdown").click();
    cy.wait(2000);

    cy.get("button").contains("Download Route GPX").click();
    cy.get("button").contains("Login").should("be.visible");

  it("point search", () => {
    cy.visit(Cypress.env("RIDI_APP_URL"));

    cy.get("button").contains("Try it out").click();
    cy.wait(2000);

    cy.get("button").contains("Round Trip").click();
    cy.get("button[aria-label*='Touring']").click();

    cy.get("button").contains("Trip details").click({ force: true });
    cy.wait(2000);

    cy.get("a[aria-label*='Search']").click();
    cy.get("input[placeholder*='Search coordinates']").type("raunas iela");
    cy.get("button[aria-label*='Start Search']").click();
    cy.wait(2000);

    cy.get("button").contains("Show all on map").click();
    cy.wait(2000);

    cy.get("button:has(#search-point)").last().click();
    cy.wait(2000);

    cy.get("button").contains("Set Start/Finish").click();
    cy.wait(2000);

    cy.get("button:has(#start)").last().click();
    cy.wait(2000);
    cy.get("button").contains("Clear Point").click();
    cy.wait(2000);

    cy.get("button:has(#search-point)").first().click({ force: true });
    cy.wait(2000);
    cy.get("button").contains("Set Start/Finish").click();
    cy.wait(2000);
    cy.get("button").contains("OK").click();
    cy.wait(2000);

    cy.contains("button", "Round Trip").should("have.class", "bg-[#FF5937]");
    cy.get("button[aria-label*='Touring']").should(
      "have.class",
      "bg-[#FF5937]",
    );
    cy.contains("button", "Trip details").should("contain.text", "Raunas iela");
  });
  it("regions", () => {
    cy.visit(Cypress.env("RIDI_APP_URL"));

    cy.get("button").contains("Try it out").click();
    cy.wait(2000);

    cy.get("button").contains("Trip details").click({ force: true });
    cy.wait(2000);

    cy.get("a[aria-label*='Search']").click();
    cy.get("input[placeholder*='Search coordinates']").type("moscow");
    cy.get("button[aria-label*='Start Search']").click();
    cy.wait(2000);

    cy.get("button").contains("Moscow").click();
    cy.wait(2000);

    cy.get("button").contains("Set Finish").click();
    cy.wait(4000);

    cy.contains("div", "Journey start or finish in unsupported region").should(
      "be.visible",
    );
    cy.contains("button", "OK").should("be.disabled");

    cy.get("button:has(#finish)").last().click();
    cy.wait(2000);
    cy.get("button").contains("Clear Point").click();
    cy.wait(2000);

    cy.get("a[aria-label*='Search']").click();
    cy.get("input[placeholder*='Search coordinates']").type("riga");
    cy.get("button[aria-label*='Start Search']").click();
    cy.wait(2000);

    cy.get("button").contains("Riga").click();
    cy.wait(2000);

    cy.get("button").contains("Set Finish").click();
    cy.wait(2000);

    cy.get("a[aria-label*='Search']").click();
    cy.get("input[placeholder*='Search coordinates']").type("athens");
    cy.get("button[aria-label*='Start Search']").click();
    cy.wait(2000);

    cy.get("button").contains("Athens").click();
    cy.wait(2000);

    cy.get("button").contains("Set Start").click();
    cy.wait(6000);

    cy.contains(
      "div",
      "Journey start and finish is in different regions",
    ).should("be.visible");
    cy.contains("button", "OK").should("be.disabled");
  });
  it("center mode", () => {
    cy.visit(Cypress.env("RIDI_APP_URL"));

    cy.get("button").contains("Try it out").click();
    cy.wait(2000);

    cy.get("button").contains("Trip details").click({ force: true });
    cy.wait(2000);

    cy.get("button[aria-label*='Enable Map Center Point']").click();
    cy.get("button:has(#center)").click();
    cy.get("button").contains("Set Finish").click();

    cy.get("#map-coords-selector")
      .trigger("mousedown", 100, 100, { force: true })
      .wait(200)
      .trigger("mousemove", 500, 500, { force: true })
      .wait(200)
      .trigger("mouseup", { force: true });

    cy.get("button:has(#center)").click();
    cy.get("button").contains("Set Start").click();

    cy.get("button:has(#finish)").last().click();
    cy.wait(2000);
    cy.get("button").contains("Clear Point").click();
    cy.wait(2000);

    cy.get("button:has(#start)").last().click();
    cy.wait(2000);
    cy.get("button").contains("Clear Point").click();
    cy.wait(2000);
  });
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
  it("rules", () => {
    cy.visit(Cypress.env("RIDI_APP_URL"));

    cy.get("button").contains("Try it out").click();
    cy.wait(4000);

    cy.get("button").contains("Round Trip").click();
    cy.wait(2000);

    cy.get("button[aria-label*='Rule Set Overview']").click();
    cy.wait(2000);

    cy.contains("div:has(button)", "All surfaces").within(() => {
      cy.get("button.bg-\\[\\#FF5937\\]").should("be.visible");
    });

    cy.get("button[aria-label*='Go back']").filter(":visible").click();
    cy.wait(3000);

    cy.get("button[aria-label*='Adv']").should("have.class", "bg-[#FF5937]");

    cy.get("button[aria-label*='Dualsport']").click();
    cy.get("button[aria-label*='Rule Set Overview']").click();
    cy.wait(2000);

    cy.contains("div", "Prefer Unpaved")
      .get("button")
      .should("have.class", "bg-[#FF5937]");

    cy.contains("div:has(button)", "All surfaces").within(() => {
      cy.get("button[aria-label='Open options']").click({ force: true });
    });

    cy.contains("button", "Duplicate").click();
    cy.wait(2000);

    cy.contains("div:has(button)", "Copy of All surfaces").within(() => {
      cy.get("button[aria-label='Open options']").click({ force: true });
    });
    cy.contains("button", "Edit").click();
    cy.get("button[aria-label='Toggle group Large Roads'").click({
      force: true,
    });
    cy.get("div[aria-label='Priority for group Medium Roads'").within(() => {
      cy.get("div").click({ multiple: true, force: true });
    });
    cy.get("button[aria-label='Expand group Small Roads'").click({
      force: true,
    });
    cy.get("button[aria-label='Toggle tag tertiary'").click({
      force: true,
    });
    cy.get("div[aria-label='Priority for tag unclassified'").within(() => {
      cy.get("div").click({ multiple: true, force: true });
    });
    cy.get("input[placeholder='Rule set name...']")
      .clear({ force: true })
      .type("Custom rules", {
        force: true,
      });
    cy.wait(2000);

    cy.contains("button", "Save").click();

    cy.contains("div:has(button)", "Custom rules").within(() => {
      cy.get("button[aria-label='Open options']").click({ force: true });
    });
    cy.contains("button", "Edit").click();

    cy.get("button[aria-label='Toggle group Large Roads'").should(
      "not.have.class",
      "bg-[#FF5937]",
    );
    cy.get("button[aria-label='Reset group Small Roads'").should("be.visible");
    cy.get("input[placeholder='Rule set name...']").should(
      "have.value",
      "Custom rules",
    );
    cy.get("button[aria-label*='Go back']").filter(":visible").click();
    cy.wait(3000);

    cy.contains("div:has(button)", "Custom rules").within(() => {
      cy.get("button[aria-label*='Select rule set']").click();
    });
    cy.wait(3000);

    cy.contains("button", "Round Trip").should("have.class", "bg-[#FF5937]");

    cy.get("button[aria-label*='Rule Set Overview']").should(
      "have.class",
      "bg-[#FF5937]",
    );

    cy.get("button[aria-label*='Rule Set Overview']").click();
    cy.wait(2000);

    cy.contains("div:has(button)", "Custom rules").within(() => {
      cy.get("button[aria-label='Open options']").click({ force: true });
    });
    cy.contains("button", "Delete").click();
    cy.contains("button.bg-\\[\\#FF5937\\]", "Delete").click();
    cy.wait(2000);

    cy.contains("div:has(button)", "All surfaces").within(() => {
      cy.get("button.bg-\\[\\#FF5937\\]").should("be.visible");
    });
    cy.get("button[aria-label*='Go back']").filter(":visible").click();
    cy.wait(3000);
    cy.get("button[aria-label*='Adv']").should("have.class", "bg-[#FF5937]");
  });
});
