/**
 * Friend Challenge service.
 *
 * Creates challenge documents in the `challenges` collection. Backward
 * compatible: nothing else in the app changes if this collection is empty.
 *
 * Workflow:
 *   sendChallenge → status "pending"
 *   acceptChallenge → status "active"
 *   declineChallenge → status "declined"
 *   submitResult → stores per-user result; once both submitted → status
 *                  "completed" and winner computed.
 */
import { dbService } from "@/services/db";
import type {
  AppUser, Challenge, ChallengeResult, ChatMessage, ChatThread, Difficulty, MCQ,
} from "@/types";
import { pushNotification } from "@/services/notify";
import { getOrCreateFriendThread } from "@/services/friendChat";

interface Spec {
  subjectId: string;    // "all" for any
  difficulty: Difficulty | "all";
  count: number;
  timerSeconds?: number;
  type?: import("@/types").ChallengeType;   // defaults to "mcq"
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function pickQuestionIds(spec: Spec): Promise<string[]> {
  const type = spec.type || "mcq";
  const n = Math.max(1, spec.count);

  async function pickFrom<T extends { id: string; subjectId: string; difficulty: import("@/types").Difficulty }>(
    coll: import("@/services/db").CollName,
    prefix: string | null,
  ): Promise<string[]> {
    const all = await dbService.list<T>(coll);
    const filtered = all.filter((x) =>
      (spec.subjectId === "all" || x.subjectId === spec.subjectId) &&
      (spec.difficulty === "all" || x.difficulty === spec.difficulty)
    );
    return shuffle(filtered).slice(0, n).map((x) => prefix ? `${prefix}:${x.id}` : x.id);
  }

  if (type === "mcq")   return pickFrom<MCQ>("mcqs", null);
  if (type === "case")  return pickFrom<import("@/types").CaseStudy>("caseStudies", null);
  if (type === "opd")   return pickFrom<import("@/types").OPDCase>("opdCases", null);

  // Mixed — split the count evenly, prefixed IDs
  const each = Math.max(1, Math.floor(n / 3));
  const [mcqIds, caseIds, opdIds] = await Promise.all([
    pickFrom<MCQ>("mcqs", "mcq"),
    pickFrom<import("@/types").CaseStudy>("caseStudies", "case"),
    pickFrom<import("@/types").OPDCase>("opdCases", "opd"),
  ]);
  return shuffle([...mcqIds.slice(0, each), ...caseIds.slice(0, each), ...opdIds.slice(0, each)]);
}

export const challengesService = {
  async send(from: AppUser, to: AppUser, spec: Spec): Promise<string | null> {
    const questionIds = await pickQuestionIds(spec);
    if (questionIds.length === 0) return null;

    const doc: Omit<Challenge, "id"> = {
      fromId: from.uid, fromName: from.username, fromPhoto: from.photoURL,
      toId: to.uid, toName: to.username, toPhoto: to.photoURL,
      subjectId: spec.subjectId,
      difficulty: spec.difficulty,
      count: questionIds.length,
      timerSeconds: spec.timerSeconds,
      questionIds,
      type: spec.type || "mcq",
      status: "pending",
      createdAt: Date.now(),
      results: {},
    };
    const id = await dbService.add("challenges", doc);

    await pushNotification({
      kind: "challenge_invite",
      audience: "personal",
      userId: to.uid,
      title: { en: "Challenge invitation", ar: "دعوة تحدٍ", so: "Casumaad tartan" },
      body: {
        en: `${from.username} invited you to a challenge.`,
        ar: `${from.username} دعاك إلى تحدٍ.`,
        so: `${from.username} wuxuu kuu casumay tartan.`,
      },
      link: "#/friends",
      senderId: from.uid,
      priority: "high",
      meta: { challengeId: id },
    });
    return id;
  },

  async accept(c: Challenge): Promise<void> {
    if (c.status !== "pending") return;
    await dbService.update<Challenge>("challenges", c.id, { status: "active" });
  },

  async decline(c: Challenge): Promise<void> {
    if (c.status !== "pending") return;
    await dbService.update<Challenge>("challenges", c.id, { status: "declined" });
    await pushNotification({
      kind: "challenge_result",
      audience: "personal",
      userId: c.fromId,
      title: { en: "Challenge declined", ar: "تم رفض التحدي", so: "Tartanka waa la diiday" },
      body: {
        en: `${c.toName} declined your challenge.`,
        ar: `${c.toName} رفض تحديك.`,
        so: `${c.toName} wuu diiday tartankaaga.`,
      },
      link: "#/friends",
      senderId: c.toId,
    });
  },

  async cancel(c: Challenge): Promise<void> {
    if (c.status !== "pending" && c.status !== "active") return;
    await dbService.update<Challenge>("challenges", c.id, { status: "canceled" });
  },

  async submitResult(c: Challenge, user: AppUser, result: ChallengeResult): Promise<Challenge> {
    // Merge results
    const results = { ...(c.results || {}), [user.uid]: result };
    const bothDone = !!results[c.fromId] && !!results[c.toId];

    let winnerId: string | undefined;
    let status: Challenge["status"] = c.status;

    if (bothDone) {
      const a = results[c.fromId]; const b = results[c.toId];
      if (a.score > b.score) winnerId = c.fromId;
      else if (b.score > a.score) winnerId = c.toId;
      else {
        // Tiebreak: faster completion
        if (a.durationSec < b.durationSec) winnerId = c.fromId;
        else if (b.durationSec < a.durationSec) winnerId = c.toId;
        // else undefined = tie
      }
      status = "completed";
    }

    const updated: Challenge = { ...c, results, winnerId, status };
    await dbService.update<Challenge>("challenges", c.id, { results, winnerId, status });

    if (bothDone) {
      const a = results[c.fromId]; const b = results[c.toId];
      const aAcc = Math.round((a.score / Math.max(a.total, 1)) * 100);
      const bAcc = Math.round((b.score / Math.max(b.total, 1)) * 100);

      // Notify both users
      for (const uid of [c.fromId, c.toId]) {
        const wins = winnerId === uid;
        const loses = winnerId && winnerId !== uid;
        const otherName = uid === c.fromId ? c.toName : c.fromName;
        const bodyEn = wins ? `You won the challenge against ${otherName}!` :
                       loses ? `${otherName} won the challenge.` :
                       `It's a tie with ${otherName}.`;
        const bodyAr = wins ? `لقد فزت بالتحدي أمام ${otherName}!` :
                       loses ? `${otherName} فاز بالتحدي.` :
                       `التعادل مع ${otherName}.`;
        const bodySo = wins ? `Waad ku guulaysatay tartanka la kulay ${otherName}!` :
                       loses ? `${otherName} ayaa ku guulaystay tartanka.` :
                       `Isku mid ayaad la tihiin ${otherName}.`;
        await pushNotification({
          kind: "challenge_result",
          audience: "personal",
          userId: uid,
          title: { en: "Challenge result", ar: "نتيجة التحدي", so: "Natiijada tartanka" },
          body: { en: bodyEn, ar: bodyAr, so: bodySo },
          link: "#/friends",
          senderId: uid === c.fromId ? c.toId : c.fromId,
          priority: "high",
          meta: { challengeId: c.id },
        });
      }

      // Post a summary message into the friend chat.
      try {
        const [uidA, uidB] = [c.fromId, c.toId];
        const thread = await getOrCreateFriendThread(uidA, uidB, [
          { uid: c.fromId, name: c.fromName, photo: c.fromPhoto },
          { uid: c.toId, name: c.toName, photo: c.toPhoto },
        ]);
        const resultLabel = winnerId
          ? (winnerId === c.fromId ? `Winner: ${c.fromName}` : `Winner: ${c.toName}`)
          : "Tie";
        const summary = `🏆 Challenge complete — ${resultLabel}. Score: ${a.score}/${a.total} (${aAcc}%) vs ${b.score}/${b.total} (${bAcc}%).`;
        const now = Date.now();
        const msg: Omit<ChatMessage, "id"> = {
          threadId: thread.id,
          senderId: "system",
          senderName: "Challenge",
          text: summary,
          status: "seen",
          seenBy: [uidA, uidB],
          createdAt: now,
        };
        await dbService.add("chatMessages", msg);
        await dbService.update<ChatThread>("chatThreads", thread.id, {
          lastMessage: summary, lastMessageAt: now, lastSenderId: "system",
        });
      } catch { /* chat write failure is non-fatal */ }
    }

    return updated;
  },
};
