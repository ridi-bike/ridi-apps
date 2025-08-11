import { createUserTestemailAddrress, getOtpCode } from "../../support/util";

const timestamp = Date.now();

const loginWithOtpNewUser = () => {
  const baseUrl = Cypress.env("CYPRESS_RIDI_APP_URL");
  const tag = `user-${Date.now()}`;
  const email = createUserTestemailAddrress(tag);
  cy.visit(baseUrl);
  cy.contains("a", "Sign in").click();
  cy.contains("Continue with Email")
    .click()
    .then(() => cy.wait(2000));
  cy.contains("Email address")
    .parent()
    .within(() => {
      cy.get('input[aria-label="input"]').type(email);
    })
    .then(() => cy.wait(2000));
  cy.contains("button", "Send Code").click();
  cy.wrap(getOtpCode(tag, timestamp), { timeout: 60 * 1000 }).then(
    (otpCode) => {
      if (typeof otpCode !== "string") {
        throw new Error("expected string");
      }
      cy.contains("Enter verification code")
        .parent()
        .within(() => {
          cy.get('input[aria-label="input"]').type(otpCode);
        });
      cy.contains("button", "Verify Code").click();
    },
  );
};
describe("Billing and account management", () => {
  it("new user without subscription sees plans and can navigate to checkout URL", () => {
    loginWithOtpNewUser();
    const baseUrl = Cypress.env("CYPRESS_RIDI_APP_URL");
    cy.on("window:unload", (e) => {
      console.log("unload", e);
    });
    cy.visit(baseUrl);
    cy.get("main").click();
    cy.wait(3000);

    cy.get("a[aria-label='Profile']").last().click();
    cy.wait(3000);

    cy.contains("button", "Available").click({ force: true });
    cy.wait(2000);

    cy.intercept({
      method: "GET",
      url: "*stripe*",
    }).as("stripeAssets");

    cy.contains("div:has(button)", "Yearly").within(() =>
      cy.contains("button", "Choose").click(),
    );
    cy.wait(3000);
    cy.get("@stripeAssets.all").its("length").should("be.greaterThan", 0);
  });
});
