import { atom } from "nanostores";

export const $pollInterval = atom<number>(5000);
export const $isPolling = atom<boolean>(false);
export const $lastDataHash = atom<string | null>(null);
export const $unchangedCount = atom<number>(0);

export function resetPollInterval(): void {
  $pollInterval.set(3000);
  $unchangedCount.set(0);
}

export function increasePollInterval(): void {
  const count = $unchangedCount.get() + 1;
  $unchangedCount.set(count);

  if (count >= 3) {
    $pollInterval.set(15000);
  }
}

export function startPolling(): void {
  $isPolling.set(true);
  resetPollInterval();
}

export function stopPolling(): void {
  $isPolling.set(false);
  resetPollInterval();
}
