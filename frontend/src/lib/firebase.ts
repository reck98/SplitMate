import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;
let tokenInit = false;

function initTokenCache(): void {
  if (tokenInit) return;
  tokenInit = true;
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        cachedToken = await user.getIdToken();
      } catch {
        cachedToken = null;
      }
    } else {
      cachedToken = null;
    }
    tokenPromise = null;
  });
}

initTokenCache();

export async function signInWithGoogle(): Promise<string> {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();
  cachedToken = token;
  return token;
}

export function getFirebaseToken(): Promise<string | null> {
  if (cachedToken) {
    return Promise.resolve(cachedToken);
  }

  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (!user) {
        cachedToken = null;
        resolve(null);
      } else {
        user.getIdToken().then((token) => {
          cachedToken = token;
          resolve(token);
        }).catch(() => {
          cachedToken = null;
          resolve(null);
        });
      }
    });
  });

  return tokenPromise;
}
