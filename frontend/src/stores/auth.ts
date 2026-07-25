import { atom } from "nanostores";

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  name: string;
  avatar: string | null;
  upi_id: string | null;
  is_profile_complete: boolean;
}

export const $user = atom<User | null>(null);
export const $isLoading = atom<boolean>(true);
export const $authError = atom<string | null>(null);

export function setUser(user: User | null): void {
  $user.set(user);
  $isLoading.set(false);
  $authError.set(null);
}

export function setAuthError(error: string): void {
  $authError.set(error);
  $isLoading.set(false);
}

export function clearAuth(): void {
  $user.set(null);
  $isLoading.set(false);
  $authError.set(null);
}
