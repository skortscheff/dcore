const KC_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost/auth";
const KC_REALM = process.env.NEXT_PUBLIC_KC_REALM ?? "dcore";
const KC_CLIENT = process.env.NEXT_PUBLIC_KC_CLIENT ?? "dcore-frontend";
const TOKEN_URL = `${KC_URL}/realms/${KC_REALM}/protocol/openid-connect/token`;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface JWTPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  roles?: string[];
  exp: number;
}

export async function passwordLogin(username: string, password: string): Promise<AuthTokens> {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: KC_CLIENT,
    username,
    password,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as JWTPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  return Date.now() / 1000 >= payload.exp - 30;
}
