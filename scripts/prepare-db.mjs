import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

if (!databaseUrl.startsWith("file:")) {
  console.log(`DATABASE_URL uses a server database, skipping SQLite bootstrap: ${databaseUrl}`);
  process.exit(0);
}

const relativePath = databaseUrl.replace(/^file:/, "");
const dbFile = resolve(process.cwd(), relativePath);
const dbDir = dirname(dbFile);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

if (!existsSync(dbFile)) {
  const file = openSync(dbFile, "w");
  closeSync(file);
  console.log(`Created SQLite file at ${dbFile}`);
} else {
  console.log(`SQLite file already exists at ${dbFile}`);
}
