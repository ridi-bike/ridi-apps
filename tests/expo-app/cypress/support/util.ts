import axios from "axios";
export function createUserTestemailAddrress(tag: string) {
  const ns = Cypress.env("CYPRESS_TESTMAIL_NAMESPACE");
  if (!ns) {
    throw new Error("missing testemail namespace");
  }
  const domain = Cypress.env("CYPRESS_TESTMAIL_DOMAIN");
  if (!domain) {
    throw new Error("missing testemail domain");
  }
  const email = `${ns}.${tag}@${domain}`;
  return email;
}

type TestmailResponse = {
  result: "success" | "failure";
  message: null;
  count: number;
  limit: number;
  offset: number;
  emails: {
    date: number;
    envelope_to: string;
    subject: string;
    to_parsed: {
      address: string;
      name: string;
    }[];
    namespace: string;
    tag: string;
    text: string;
    from_parsed: [
      {
        address: string;
        name: string;
      },
    ];
    timestamp: number;
  }[];
};
export async function getOtpCode(
  tag: string,
  timetampFrom: number,
): Promise<string> {
  const apikey = Cypress.env("CYPRESS_TESTMAIL_API_KEY");

  if (!apikey) {
    throw new Error("missing testemail apiKey");
  }
  const namespace = Cypress.env("CYPRESS_TESTMAIL_NAMESPACE");
  if (!namespace) {
    throw new Error("missing testemail namespace");
  }

  const resp = await axios.get("https://api.testmail.app/api/json", {
    params: {
      apikey,
      tag,
      namespace,
      livequery: "true",
      timestamp_from: timetampFrom,
    },
  });
  const data = resp.data as TestmailResponse;
  const email = data.emails[0];
  const text = email?.text;
  const match = text?.match(/\b(\d{6})\b/);
  const code = match?.[1];
  if (code) {
    return code;
  }
  throw new Error("Live query failed, did not find OTP code");
}
