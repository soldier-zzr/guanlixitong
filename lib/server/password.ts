import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash?: string | null) {
  if (!passwordHash) {
    return false;
  }

  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const target = Buffer.from(storedHash, "hex");

  return candidate.length === target.length && timingSafeEqual(candidate, target);
}
