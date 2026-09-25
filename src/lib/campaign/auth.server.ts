// Sessão administrativa: cookie HttpOnly assinado com HMAC-SHA256.
// Senha definida em ADMIN_PASSWORD (variável de ambiente do servidor).
import process from "node:process";

import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE = "ck_admin";
const SESSION_HOURS = 12;

function secret() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD não configurada no servidor.");
  }
  return process.env.ADMIN_SESSION_SECRET || `culto-kids::${password}`;
}

const enc = new TextEncoder();

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function checkPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // compara os hashes para não vazar o tamanho da senha
  return safeEqual(await hmac(`pw:${password}`), await hmac(`pw:${expected}`));
}

export async function startSession() {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const value = `${expires}.${await hmac(`session:${expires}`)}`;
  setCookie(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export function endSession() {
  deleteCookie(COOKIE, { path: "/" });
}

export async function isAdmin() {
  if (!isAdminConfigured()) return false;
  const raw = getCookie(COOKIE);
  if (!raw) return false;
  const [expires, sig] = raw.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  return safeEqual(sig, await hmac(`session:${expires}`));
}

export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("UNAUTHORIZED");
  }
}
