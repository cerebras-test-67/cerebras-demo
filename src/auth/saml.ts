// SAML 2.0 single sign-on for enterprise accounts. Tested with Okta.
// Each company has one SSO connection: the IdP's entity id, SSO URL and signing cert.
import { db } from "../platform/db";
import { createSession } from "./session";
import { verifySignedAssertion, buildAuthnRequest } from "../platform/samlCore";

export type SsoConnection = {
  companyId: string;
  domain: string;
  idpEntityId: string;
  idpSsoUrl: string;
  idpCertificate: string;
  enabled: boolean;
};

const SP_ENTITY_ID = "https://app.fieldstonehq.com/saml/metadata";
const ACS_URL = "https://app.fieldstonehq.com/saml/acs";

/** Where to send the browser to start a login for this company. */
export function loginRedirect(conn: SsoConnection, relayState: string) {
  const request = buildAuthnRequest({ issuer: SP_ENTITY_ID, acsUrl: ACS_URL, destination: conn.idpSsoUrl });
  const params = new URLSearchParams({ SAMLRequest: request, RelayState: relayState });
  return `${conn.idpSsoUrl}?${params}`;
}

/** Handle the IdP's POST to our ACS endpoint and start a session. */
export async function handleAcs(samlResponse: string) {
  const assertion = verifySignedAssertion(samlResponse, { audience: SP_ENTITY_ID, recipient: ACS_URL });
  const email = assertion.nameId.toLowerCase();
  const conn = await db.ssoConnections.findByDomain(email.split("@")[1]);
  if (!conn?.enabled || conn.idpEntityId !== assertion.issuer) throw new Error("sso_not_configured");
  const user = await db.users.findByEmail(email);
  if (!user || user.companyId !== conn.companyId) throw new Error("user_not_provisioned");
  return createSession(user.id);
}

// TODO(marcus): SP-initiated logout, and a friendly page for user_not_provisioned.
