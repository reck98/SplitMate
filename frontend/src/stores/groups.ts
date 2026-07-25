import { atom } from "nanostores";

export interface GroupSummary {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  member_count: number;
}

export const $groups = atom<GroupSummary[]>([]);
export const $groupsLoading = atom<boolean>(false);

export function setGroups(groups: GroupSummary[]): void {
  $groups.set(groups);
  $groupsLoading.set(false);
}
