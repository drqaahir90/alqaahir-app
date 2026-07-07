/**
 * Small wrapper that writes a Firestore notification AND fires an OS/browser
 * notification when the current user is the recipient. Keeps a consistent
 * interface across the app (friends, challenges, chat, admin broadcasts).
 */
import { dbService } from "@/services/db";
import type { LocalizedText, NotifKind, Notification, NotificationPriority } from "@/types";
import { showNotification } from "@/services/notifications";

export type NotifCategoryUiMap = Extract<NotifKind, "announcement" | "personal" | "reminder" | "achievement">;

function mapToUiCategory(kind: NotifKind | undefined): "announcement" | "personal" | "reminder" | "achievement" {
  switch (kind) {
    case "friend_request":
    case "friend_accept":
    case "message":
    case "personal":
      return "personal";
    case "challenge_invite":
    case "challenge_result":
    case "achievement":
      return "achievement";
    case "reminder":
      return "reminder";
    default:
      return "announcement";
  }
}

interface PushArgs {
  kind: NotifKind;
  audience?: Notification["audience"];
  userId?: string;
  userIds?: string[];
  title: LocalizedText;
  body: LocalizedText;
  link?: string;
  priority?: NotificationPriority;
  imageUrl?: string;
  senderId?: string;
  meta?: Record<string, unknown>;
}

export async function pushNotification(args: PushArgs): Promise<string> {
  const notif: Omit<Notification, "id"> = {
    audience: args.audience || (args.userId ? "personal" : "broadcast"),
    userId: args.userId,
    userIds: args.userIds,
    title: args.title,
    body: args.body,
    link: args.link,
    priority: args.priority || "normal",
    imageUrl: args.imageUrl,
    senderId: args.senderId,
    kind: args.kind,
    meta: args.meta,
    createdAt: Date.now(),
    readBy: [],
  };
  const id = await dbService.add("notifications", notif);

  // Also try to raise a real OS notification for the current tab if the
  // recipient is the currently signed-in user.
  try {
    const raw = localStorage.getItem("medacad.currentUid");
    const meUid = raw || "";
    const targets = args.audience === "broadcast" ? [] : (args.userId ? [args.userId] : (args.userIds || []));
    if (targets.length === 0 || targets.includes(meUid)) {
      const lang = (localStorage.getItem("medacad.lang") || "en") as "en" | "ar" | "so";
      void showNotification({
        title: args.title[lang] || args.title.en,
        body: args.body[lang] || args.body.en,
        category: mapToUiCategory(args.kind),
        url: args.link || "#/notifications",
        tag: id,
      });
    }
  } catch { /* ignore */ }

  return id;
}
