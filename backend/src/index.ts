import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import fs from "fs";
import app from "./app.js";
import { db } from "./db/index.js";
import { config } from "./utils/config.js";

async function startServer() {
  try {
    const cwdMigrations = path.resolve(process.cwd(), "drizzle");
    const backendMigrations = path.resolve(process.cwd(), "backend", "drizzle");
    const folder = fs.existsSync(cwdMigrations)
      ? cwdMigrations
      : fs.existsSync(backendMigrations)
        ? backendMigrations
        : null;

    if (folder) {
      await migrate(db, { migrationsFolder: folder });
      console.log("[DB] Applied database migrations successfully.");
    }
  } catch (err) {
    console.error("[DB Migration Warning]", err);
  }

  app.listen(config.port, () => {
    console.log(`SplitMate backend running on port ${config.port}`);
  });
}

startServer();
