import admin from "firebase-admin";
import { config } from "./config.js";

let app: admin.app.App | null = null;

function getFirebaseApp(): admin.app.App {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
  }
  return app;
}

export function getAuth(): admin.auth.Auth {
  return getFirebaseApp().auth();
}
