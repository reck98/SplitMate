import { atom } from "nanostores";

export interface GroupSummary {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  member_count: number;
}

const GROUPS_CACHE_KEY = "splitmate_groups_cache";
const GROUP_DETAIL_CACHE_PREFIX = "splitmate_group_detail_";

export const $groups = atom<GroupSummary[]>([]);
export const $groupsLoading = atom<boolean>(false);

export function setGroups(groups: GroupSummary[]): void {
  $groups.set(groups);
  $groupsLoading.set(false);
  saveGroupsCache(groups);
}

export function saveGroupsCache(groups: GroupSummary[]): void {
  try {
    localStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(groups));
  } catch {}
}

export function loadGroupsCache(): GroupSummary[] {
  try {
    const data = localStorage.getItem(GROUPS_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveGroupDetailCache(groupId: string, data: any): void {
  try {
    localStorage.setItem(
      `${GROUP_DETAIL_CACHE_PREFIX}${groupId}`,
      JSON.stringify(data),
    );
  } catch {}
}

export function loadGroupDetailCache(groupId: string): any | null {
  try {
    const data = localStorage.getItem(`${GROUP_DETAIL_CACHE_PREFIX}${groupId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
