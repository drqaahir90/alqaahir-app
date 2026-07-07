/**
 * Public user profile page — /u/:uid
 *
 * Shows a read-only view of any user's public profile: avatar, country,
 * XP, streak, quiz stats, friend count, and quick actions:
 *   • Add friend / Cancel request / Accept request / Already friends
 *   • Message (opens the friend chat inline)
 *   • Challenge (opens the new-challenge modal)
 *
 * Never exposes private data (email, whatsapp, moderation history).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Badge, Button, Card, CardBody, EmptyState } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { useAuthStore, useUIStore } from "@/stores";
import { friendsService } from "@/services/friends";
import { isProtectedAdmin } from "@/services/auth";
import type { AppUser, FriendRequest, QuizResult } from "@/types";

export default function UserProfilePage() {
  const { t } = useI18n();
  const { uid } = useParams();
  const nav = useNavigate();
  const me = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const [user, setUser] = useState<AppUser | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const u = await dbService.get<AppUser>("users", uid);
      setUser(u);
      const r = await dbService.list<QuizResult>("quizResults");
      setResults(r.filter((x) => x.userId === uid).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10));
      const reqs = await dbService.list<FriendRequest>("friendRequests");
      setRequests(reqs);
      setLoading(false);
    })();
  }, [uid]);

  const status = useMemo(() => {
    if (!me || !user) return "none";
    if (me.uid === user.uid) return "self";
    if ((me.friends || []).includes(user.uid)) return "friends";
    const sent = requests.find((r) => r.status === "pending" && r.fromId === me.uid && r.toId === user.uid);
    if (sent) return "sent";
    const received = requests.find((r) => r.status === "pending" && r.fromId === user.uid && r.toId === me.uid);
    if (received) return "received";
    return "none";
  }, [me, user, requests]);

  async function sendRequest() {
    if (!me || !user) return;
    await friendsService.sendRequest(me, user.uid);
    showToast(t("friends.requestSent"), "success");
    // Refresh
    const reqs = await dbService.list<FriendRequest>("friendRequests");
    setRequests(reqs);
  }

  async function acceptRequest() {
    if (!me || !user) return;
    const req = requests.find((r) => r.status === "pending" && r.fromId === user.uid && r.toId === me.uid);
    if (!req) return;
    await friendsService.accept(req, me);
    showToast(t("common.saved"), "success");
    const reqs = await dbService.list<FriendRequest>("friendRequests");
    setRequests(reqs);
  }

  if (loading) {
    return <div className="text-center py-10 text-slate-500 dark:text-slate-400">{t("common.loading")}</div>;
  }
  if (!user) {
    return <EmptyState title={t("profile.public.notFound")} icon="👤" />;
  }

  const totalQ = results.reduce((n, r) => n + r.total, 0);
  const totalC = results.reduce((n, r) => n + r.score, 0);
  const acc = totalQ ? Math.round((totalC / totalQ) * 100) : 0;
  const isOnline = user.lastActiveAt && Date.now() - user.lastActiveAt < 5 * 60 * 1000;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <button onClick={() => nav(-1)} className="text-sm text-teal-700 dark:text-teal-400 hover:underline">
        ← {t("common.back")}
      </button>

      <Card>
        <CardBody className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative">
            <Avatar name={user.username} src={user.photoURL} size={96} />
            {isOnline && (
              <span className="absolute bottom-0 end-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user.username}</h1>
              {isProtectedAdmin(user) && <Badge tone="amber">👑 {t("admin.users.protectedBadge")}</Badge>}
              {user.role === "admin" && !isProtectedAdmin(user) && <Badge tone="violet">{user.role}</Badge>}
              {user.featured && <Badge tone="amber">★</Badge>}
              {user.isDemo && <Badge tone="violet">{t("admin.demo.badge")}</Badge>}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {user.country && <span className="me-2">📍 {user.country}</span>}
              {isOnline ? <span className="text-emerald-600 dark:text-emerald-400">● {t("friends.online")}</span> :
                user.lastActiveAt && <span>{t("friends.lastSeen")}: {new Date(user.lastActiveAt).toLocaleDateString()}</span>}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {t("profile.public.member")}: {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
          {me && status !== "self" && (
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              {status === "friends" && <Badge tone="green">✓ {t("friends.alreadyFriends")}</Badge>}
              {status === "sent" && <Badge tone="amber">⏳ {t("friends.requestPending")}</Badge>}
              {status === "received" && (
                <Button size="sm" variant="success" onClick={acceptRequest}>✓ {t("friends.accept")}</Button>
              )}
              {status === "none" && (
                <Button size="sm" onClick={sendRequest}>+ {t("friends.addFriend")}</Button>
              )}
              {status === "friends" && (
                <Button size="sm" variant="outline" onClick={() => nav("/friends")}>💬 {t("friends.message")}</Button>
              )}
              {status === "friends" && (
                <Button size="sm" onClick={() => nav("/friends")}>🎯 {t("friends.challenge")}</Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardBody className="text-center py-4">
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{user.xp || 0}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">XP</div>
        </CardBody></Card>
        <Card><CardBody className="text-center py-4">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">🔥 {user.streak || 0}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("leaderboard.streak")}</div>
        </CardBody></Card>
        <Card><CardBody className="text-center py-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{results.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("leaderboard.quizzes")}</div>
        </CardBody></Card>
        <Card><CardBody className="text-center py-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{acc}%</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("leaderboard.accuracy")}</div>
        </CardBody></Card>
      </div>

      {results.length > 0 && (
        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
            {t("profile.public.recentActivity")}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.slice(0, 8).map((r) => (
              <div key={r.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <Badge tone={r.type === "mcq" ? "teal" : r.type === "case" ? "blue" : r.type === "opd" ? "violet" : "amber"}>{r.type.toUpperCase()}</Badge>
                  <span className="ms-2 text-slate-600 dark:text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">
                  {r.score}/{r.total} · {Math.round(r.score / Math.max(r.total, 1) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
