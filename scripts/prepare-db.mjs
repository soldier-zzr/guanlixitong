import { existsSync, mkdirSync, openSync, closeSync } from "node:fs";
import { resolve } from "node:path";

const prismaDir = resolve(process.cwd(), "prisma");
const dbFile = resolve(prismaDir, "dev.db");

if (!existsSync(prismaDir)) {
  mkdirSync(prismaDir, { recursive: true });
}

if (!existsSync(dbFile)) {
  const file = openSync(dbFile, "w");
  closeSync(file);
  console.log(`Created SQLite file at ${dbFile}`);
} else {
  console.log(`SQLite file already exists at ${dbFile}`);
}
