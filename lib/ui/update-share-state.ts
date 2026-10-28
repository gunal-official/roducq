import type { ShareLink } from "../types/share";

/** Presentation only: sharing and access continue to be enforced by the server. */
export type UpdateShareState = "none" | "active" | "revoked";

export function getUpdateShareState(
  link: Pick<ShareLink, "revoked_at"> | null
): UpdateShareState {
  if (link === null) return "none";
  return link.revoked_at === null ? "active" : "revoked";
}

export const UPDATE_SHARE_PRESENTATION: Record<
  UpdateShareState,
  { chip: string; value: string; hint: string }
> = {
  none: {
    chip: "No public link",
    value: "No link",
    hint: "No public link has been created.",
  },
  active: {
    chip: "Public link live",
    value: "Live",
    hint: "Anyone with the link can view the latest saved update.",
  },
  revoked: {
    chip: "Public link revoked",
    value: "Revoked",
    hint: "This link no longer works.",
  },
};
