/**
 * Friend system service.
 */
import { dbService } from "@/services/db";
import type { AppUser, FriendRequest } from "@/types";
import { pushNotification } from "@/services/notify";

async function loadUser(uid: string): Promise<AppUser | null> {
  return await dbService.get<AppUser>("users", uid);
}

function pairId(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export const friendsService = {
  async sendRequest(from: AppUser, toId: string): Promise<void> {
    if (from.uid === toId) return;
    const to = await loadUser(toId);
    if (!to) return;
    if ((from.friends || []).includes(toId)) return;
    
    const existing = await dbService.list<FriendRequest>("friendRequests");
    const dup = existing.find((r) => r.status === "pending" && (
      (r.fromId === from.uid && r.toId === toId) ||
      (r.fromId === toId && r.toId === from.uid)
    ));
    if (dup) return;

    const req: Omit<FriendRequest, "id"> = {
      fromId: from.uid, fromName: from.username, fromPhoto: from.photoURL,
      toId, toName: to.username, toPhoto: to.photoURL,
      status: "pending", createdAt: Date.now(),
    };
    await dbService.add("friendRequests", req);

    await pushNotification({
      kind: "friend_request",
      audience: "personal",
      userId: toId,
      title: { en: "New friend request", ar: "طلب صداقة جديد", so: "Codsi saaxiibnimo cusub" },
      body: {
        en: `${from.username} sent you a friend request.`,
        ar: `${from.username} أرسل لك طلب صداقة.`,
        so: `${from.username} wuxuu kuu diray codsi saaxiibnimo.`,
      },
      link: "#/friends",
      senderId: from.uid,
    });
  },

  async accept(req: FriendRequest, me: AppUser): Promise<void> {
    if (req.toId !== me.uid || req.status !== "pending") return;
    await dbService.update<FriendRequest>("friendRequests", req.id, {
      status: "accepted", respondedAt: Date.now(),
    });
    
    const fid = pairId(req.fromId, req.toId);
    await dbService.set("friendships", fid, {
      id: fid, userIds: [req.fromId, req.toId], createdAt: Date.now(),
    });
    
    const other = await loadUser(req.fromId);
    if (other) {
      const oFriends = Array.from(new Set([...(other.friends || []), me.uid]));
      await dbService.update<AppUser>("users", other.uid, { friends: oFriends });
    }
    const myFriends = Array.from(new Set([...(me.friends || []), req.fromId]));
    await dbService.update<AppUser>("users", me.uid, { friends: myFriends });

    await pushNotification({
      kind: "friend_accept",
      audience: "personal",
      userId: req.fromId,
      title: { en: "Friend request accepted", ar: "تم قبول طلب الصداقة", so: "Codsigii saaxiibnimo waa la aqbalay" },
      body: {
        en: `You are now friends with ${me.username}.`,
        ar: `أنت الآن صديق لـ ${me.username}.`,
        so: `Hadda waxaad tahay saaxiib la ah ${me.username}.`,
      },
      link: "#/friends",
      senderId: me.uid,
    });
  },

  async decline(req: FriendRequest): Promise<void> {
    if (req.status !== "pending") return;
    await dbService.update<FriendRequest>("friendRequests", req.id, {
      status: "declined", respondedAt: Date.now(),
    });
  },

  async cancel(req: FriendRequest): Promise<void> {
    if (req.status !== "pending") return;
    await dbService.update<FriendRequest>("friendRequests", req.id, {
      status: "canceled", respondedAt: Date.now(),
    });
  },

  async removeFriend(me: AppUser, otherId: string): Promise<void> {
    const other = await loadUser(otherId);
    if (other) {
      await dbService.update<AppUser>("users", other.uid, {
        friends: (other.friends || []).filter((u) => u !== me.uid),
      });
    }
    await dbService.update<AppUser>("users", me.uid, {
      friends: (me.friends || []).filter((u) => u !== otherId),
    });
    const fid = pairId(me.uid, otherId);
    await dbService.remove("friendships", fid);
  },

  pairId,
};

