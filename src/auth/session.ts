// Sign-in and sessions for the dispatch web app.
import { randomBytes } from "node:crypto";
import { db } from "../platform/db";
import { mailer } from "../platform/mailer";

const SESSION_DAYS = 14;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.sessions.insert({ token, userId, expiresAt });
  return { token, expiresAt };
}

export async function sendMagicLink(email: string) {
  const user = await db.users.findByEmail(email);
  if (!user) return; // same response either way
  const token = randomBytes(24).toString("base64url");
  await db.magicLinks.insert({ token, userId: user.id, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
  await mailer.send(email, "Your Fieldstone sign-in link", `https://app.fieldstonehq.com/login/${token}`);
}

/** Companies with SAML turned on sign in through their identity provider instead. */
export async function signInMethod(email: string): Promise<"password" | "saml"> {
  const domain = email.split("@")[1]?.toLowerCase();
  const sso = domain ? await db.ssoConnections.findByDomain(domain) : undefined;
  return sso?.enabled ? "saml" : "password";
}

export async function endSession(token: string) {
  await db.sessions.delete({ token });
}
