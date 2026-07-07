/**
 * Friend chat helpers.
 *
 * Reuses the existing `chatThreads` / `chatMessages` collections. Friend
 * threads are distinguished with `kind: "friend"` and store a
 * `participantIds` array. The legacy support-thread fields (`userId`,
 * `username`, `userPhoto`) are also populated so existing chat rendering
 * continues to work.
 */
import { dbService } from "@/services/db";
import type { ChatThread } from "@/types";

function pairId(a: string, b: string): string {
  return `friend__${[a, b].sort().join("__")}`;
}

export async function getOrCreateFriendThread(
  aId: string,
  bId: string,
  participants: Array<{ uid: string; name: string; photo?: string }>,
): Promise<ChatThread> {
  const id = pairId(aId, bId);
  const existing = await dbService.get<ChatThread>("chatThreads", id);
  if (existing) return existing;

  // participants[0] = "user" side; the "other" is the peer.
  const a = participants.find((p) => p.uid === aId)!;
  const b = participants.find((p) => p.uid === bId)!;
  const doc: ChatThread = {
    id,
    kind: "friend",
    participantIds: [aId, bId],
    participants: [a, b],
    userId: aId,               // legacy field: initiator
    username: a.name,
    userPhoto: a.photo,
    subject: `${a.name} ↔ ${b.name}`,
    createdAt: Date.now(),
    status: "open",
    unread: { [aId]: 0, [bId]: 0 },
  };
  await dbService.set("chatThreads", id, doc);
  return doc;
}
