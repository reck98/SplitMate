import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  clientUrl: process.env.CLIENT_URL || "http://localhost:4321",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || "",
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN || "",
  nodeEnv: process.env.NODE_ENV || "development",
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
};
