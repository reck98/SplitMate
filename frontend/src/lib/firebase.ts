import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Persist auth across browser restarts (IndexedDB)
setPersistence(auth, browserLocalPersistence).catch(() => {});

let cachedToken: string | null = null;

let authInitResolve: ((user: User | null) => void) | null = null;
export const authInit: Promise<User | null> = new Promise((resolve) => {
  authInitResolve = resolve;
});

// Keep token cache current — fires on initial load, token refresh, and sign in/out
onIdTokenChanged(auth, async (user) => {
  if (user) {
    try {
      cachedToken = await user.getIdToken();
    } catch {
      cachedToken = null;
    }
  } else {
    cachedToken = null;
  }
});

// Signal when auth state is known for the first time
onAuthStateChanged(auth, (user) => {
  if (authInitResolve) {
    authInitResolve(user);
    authInitResolve = null;
  }
});

export async function signInWithGoogle(): Promise<string> {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();
  cachedToken = token;
  return token;
}

export async function getFirebaseToken(
  forceRefresh = false,
): Promise<string | null> {
  const currentUser = auth.currentUser || (await authInit);
  if (currentUser) {
    try {
      cachedToken = await currentUser.getIdToken(forceRefresh);
      return cachedToken;
    } catch {
      cachedToken = null;
    }
  }
  return cachedToken;
}
