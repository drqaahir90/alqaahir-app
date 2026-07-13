import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Badge, Button, Card, CardBody, EmptyState, Input, Modal, Select } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { useAuthStore, useUIStore } from "@/stores";
import { friendsService } from "@/services/friends";
import { challengesService } from "@/services/challenges";
import { seedSubjects } from "@/data/seed";
import { ChallengeResult } from "@/components/ChallengeResult";
import type { AppUser, Challenge, Difficulty, FriendRequest, Subject } from "@/types";
import { cn } from "@/utils/cn";
import { playSound } from "@/utils/sound";

type Tab = "friends" | "discover" | "requests" | "challenges";

export default function FriendsPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("friends");
  const [challengeWith, setChallengeWith] = useState<AppUser | null>(null);
  const openChat = (u: AppUser) => nav(`/friends/chat/${u.uid}`);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!me) return;
    (async () => setUsers(await dbService.list<AppUser>("users")))();
    const un1 = dbService.subscribe<FriendRequest>("friendRequests", (docs) =>
      setRequests(docs.filter((r) => r.fromId === me.uid || r.toId === me.uid))
    );
    const un2 = dbService.subscribe<Challenge>("challenges", (docs) =>
      setChallenges(docs.filter((c) => c.fromId === me.uid || c.toId === me.uid)
        .sort((a, b) => b.createdAt - a.createdAt))
    );
    const un3 = dbService.subscribe<any>("friendships", (docs) =>
      setFriendships(docs.filter((f) => f.userIds && f.userIds.includes(me.uid)))
    );
    return () => { un1(); un2(); un3(); };
  }, [me]);

  if (!me) return null;

  const friends = useMemo(() => {
    const friendshipUids = friendships.map((f) => f.userIds?.find((id: string) => id !== me.uid)).filter(Boolean);
    const combinedUids = Array.from(new Set([...(me.friends || []), ...friendshipUids]));
    return users.filter((u) => combinedUids.includes(u.uid));
  }, [users, friendships, me.friends, me.uid]);

  const pendingReceived = requests.filter((r) => r.toId === me.uid && r.status === "pending");
  const pendingSent = requests.filter((r) => r.fromId === me.uid && r.status === "pending");
  const activeChallenges = challenges.filter((c) => c.status === "pending" || c.status === "active");
  const completedChallenges = challenges.filter((c) => c.status === "completed");

  return (
    <div className="space-y-4 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">🤝 {t("friends.title")}</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {([
          ["friends", t("friends.tabList"), friends.length],
          ["discover", t("friends.tabDiscover"), 0],
          ["requests", t("friends.tabRequests"), pendingReceived.length + pendingSent.length],
          ["challenges", t("friends.tabChallenges"), activeChallenges.length],
        ] as const).map(([id, label, count]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px",
              tab === id
                ? "border-teal-500 text-teal-700 dark:text-teal-300"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            {label} {count > 0 && <Badge tone="teal" className="ms-1">{count}</Badge>}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        <FriendsList
          me={me} users={users} friends={friends} q={q} setQ={setQ}
          onMessage={openChat}
          onChallenge={(u) => setChallengeWith(u)}
        />
      )}
      {tab === "discover" && (
        <DiscoverPanel me={me} users={users} requests={requests}
          onMessage={openChat}
          onChallenge={(u) => setChallengeWith(u)} />
      )}
      {tab === "requests" && (
        <RequestsPanel me={me} received={pendingReceived} sent={pendingSent} />
      )}
      {tab === "challenges" && (
        <ChallengesPanel me={me} active={activeChallenges} completed={completedChallenges} />
      )}

      {/* Challenge modal */}
      {challengeWith && (
        <NewChallengeModal me={me} opponent={challengeWith} onClose={() => setChallengeWith(null)} />
      )}
    </div>
  );
}

// ─── Discover panel: suggested / recent / top learners ────
function DiscoverPanel({
  me, users, requests, onMessage, onChallenge,
}: {
  me: AppUser; users: AppUser[]; requests: import("@/types").FriendRequest[];
  onMessage: (u: AppUser) => void; onChallenge: (u: AppUser) => void;
}) {
  const { t } = useI18n();
  const nav = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const [q, setQ] = useState("");

  const myFriends = new Set(me.friends || []);
  const pendingSet = new Set(
    requests
      .filter((r) => r.status === "pending" && (r.fromId === me.uid || r.toId === me.uid))
      .flatMap((r) => [r.fromId, r.toId])
  );

  const isSelf = (u: AppUser) => u.uid === me.uid;

  // Search results
  const searchResults = q.trim()
    ? users.filter((u) => !isSelf(u) &&
        (u.username.toLowerCase().includes(q.toLowerCase()) ||
         u.email.toLowerCase().includes(q.toLowerCase()))).slice(0, 20)
    : [];

  // Suggested: same country, otherwise random pool of non-friends.
  const others = users.filter((u) => !isSelf(u) && !myFriends.has(u.uid));
  const suggested = (() => {
    const sameCountry = others.filter((u) => u.country && u.country === me.country);
    const pool = sameCountry.length ? sameCountry : others;
    return pool.slice(0, 8);
  })();

  // Recent: sorted by createdAt desc.
  const recent = [...others].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

  // Top learners: sorted by XP desc.
  const top = [...others].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 8);

  async function sendRequest(u: AppUser) {
    await friendsService.sendRequest(me, u.uid);
    showToast(t("friends.requestSent"), "success");
    playSound("achievement");
  }

  function UserRow({ u }: { u: AppUser }) {
    const isFriend = myFriends.has(u.uid);
    const isPending = pendingSet.has(u.uid);
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
        <button onClick={() => nav(`/u/${u.uid}`)}>
          <Avatar name={u.username} src={u.photoURL} size={40} />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => nav(`/u/${u.uid}`)}
            className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate text-start block hover:text-teal-600 dark:hover:text-teal-400">
            {u.username}
          </button>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {u.country ? `📍 ${u.country} · ` : ""}⚡ {u.xp || 0} · 🔥 {u.streak || 0}
            {u.isDemo && <Badge tone="violet" className="ms-1">{t("admin.demo.badge")}</Badge>}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {isFriend ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onMessage(u)}>💬</Button>
              <Button size="sm" onClick={() => onChallenge(u)}>🎯</Button>
            </>
          ) : isPending ? (
            <Badge tone="amber">⏳</Badge>
          ) : (
            <Button size="sm" onClick={() => sendRequest(u)}>+ {t("friends.addFriend")}</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => nav(`/u/${u.uid}`)}>{t("friends.profile")}</Button>
        </div>
      </div>
    );
  }

  function Section({ title, list }: { title: string; list: AppUser[] }) {
    if (list.length === 0) return null;
    return (
      <Card>
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-semibold text-sm text-slate-600 dark:text-slate-400">
          {title}
        </div>
        <CardBody className="space-y-2">
          {list.map((u) => <UserRow key={u.uid} u={u} />)}
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardBody>
          <Input placeholder={t("friends.searchUsers")} value={q} onChange={(e) => setQ(e.target.value)} />
        </CardBody>
      </Card>

      {q.trim() ? (
        searchResults.length === 0 ? (
          <EmptyState title={t("search.noResults")} icon="🔎" />
        ) : (
          <Section title={`${t("common.search")} (${searchResults.length})`} list={searchResults} />
        )
      ) : (
        <>
          {suggested.length === 0 && recent.length === 0 && top.length === 0 && (
            <EmptyState title={t("friends.noSuggestions")} icon="🤝" />
          )}
          <Section title={`✨ ${t("friends.suggested")}`} list={suggested} />
          <Section title={`🏆 ${t("friends.topLearners")}`} list={top} />
          <Section title={`🆕 ${t("friends.recent")}`} list={recent} />
        </>
      )}
    </div>
  );
}

// ─── Friends list & user search ────────────────────────────
function FriendsList({
  me, users, friends, q, setQ, onMessage, onChallenge,
}: {
  me: AppUser; users: AppUser[]; friends: AppUser[]; q: string;
  setQ: (v: string) => void;
  onMessage: (u: AppUser) => void; onChallenge: (u: AppUser) => void;
}) {
  const { t } = useI18n();
  const nav = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const searchResults = q.trim()
    ? users.filter((u) => u.uid !== me.uid &&
        (u.username.toLowerCase().includes(q.toLowerCase()) ||
         u.email.toLowerCase().includes(q.toLowerCase())))
        .filter((u) => !(me.friends || []).includes(u.uid))
        .slice(0, 10)
    : [];

  async function sendRequest(u: AppUser) {
    await friendsService.sendRequest(me, u.uid);
    showToast(t("friends.requestSent"), "success");
    playSound("achievement");
  }
  async function remove(u: AppUser) {
    if (!confirm(t("friends.removeConfirm").replace("{name}", u.username))) return;
    await friendsService.removeFriend(me, u.uid);
    showToast(t("common.saved"), "success");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-2">
          <Input placeholder={t("friends.searchUsers")} value={q} onChange={(e) => setQ(e.target.value)} />
          {searchResults.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-200 dark:divide-slate-700">
              {searchResults.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 p-2">
                  <Avatar name={u.username} src={u.photoURL} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {u.username}
                      {u.isDemo && <Badge tone="violet" className="ms-2">{t("admin.demo.badge")}</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                  </div>
                  <Button size="sm" onClick={() => sendRequest(u)}>+ {t("friends.addFriend")}</Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {friends.length === 0 ? (
        <EmptyState title={t("friends.noFriends")} icon="🤝" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {friends.map((f) => (
            <Card key={f.uid}>
              <CardBody className="flex items-center gap-3">
                <button onClick={() => nav(`/u/${f.uid}`)}>
                  <Avatar name={f.username} src={f.photoURL} size={44} />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => nav(`/u/${f.uid}`)}
                    className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400">
                    {f.username}
                    {f.isDemo && <Badge tone="violet">{t("admin.demo.badge")}</Badge>}
                  </button>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {f.country ? `📍 ${f.country} · ` : ""}⚡ {f.xp || 0} XP · 🔥 {f.streak || 0}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="outline" onClick={() => onMessage(f)}>💬 {t("friends.message")}</Button>
                  <Button size="sm" onClick={() => onChallenge(f)}>🎯 {t("friends.challenge")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(f)}>🗑</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Friend requests ──────────────────────────────────────
function RequestsPanel({ me, received, sent }: { me: AppUser; received: FriendRequest[]; sent: FriendRequest[]; }) {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);

  async function accept(r: FriendRequest) {
    await friendsService.accept(r, me);
    showToast(t("common.saved"), "success");
    playSound("achievement");
  }
  async function decline(r: FriendRequest) {
    await friendsService.decline(r);
    showToast(t("common.saved"), "success");
  }
  async function cancel(r: FriendRequest) {
    await friendsService.cancel(r);
    showToast(t("common.saved"), "success");
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold">
          📥 {t("friends.received")} <Badge tone="gray">{received.length}</Badge>
        </div>
        <CardBody>
          {received.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">{t("friends.noReceived")}</div>
          ) : (
            <div className="space-y-2">
              {received.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <Avatar name={r.fromName} src={r.fromPhoto} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{r.fromName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Button size="sm" variant="success" onClick={() => accept(r)}>✓ {t("friends.accept")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => decline(r)}>{t("friends.decline")}</Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold">
          📤 {t("friends.sent")} <Badge tone="gray">{sent.length}</Badge>
        </div>
        <CardBody>
          {sent.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">{t("friends.noSent")}</div>
          ) : (
            <div className="space-y-2">
              {sent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <Avatar name={r.toName} src={r.toPhoto} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{r.toName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400"><Badge tone="amber">{t("friends.pending")}</Badge></div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => cancel(r)}>{t("common.cancel")}</Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Challenges panel ──────────────────────────────────────
function ChallengesPanel({ me, active, completed }: { me: AppUser; active: Challenge[]; completed: Challenge[]; }) {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const [runChallenge, setRunChallenge] = useState<Challenge | null>(null);
  const [viewResult, setViewResult] = useState<Challenge | null>(null);

  async function accept(c: Challenge) {
    await challengesService.accept(c);
    showToast(t("common.saved"), "success");
  }
  async function decline(c: Challenge) {
    await challengesService.decline(c);
    showToast(t("challenge.declined"), "success");
  }
  async function cancel(c: Challenge) {
    await challengesService.cancel(c);
    showToast(t("challenge.cancelled"), "success");
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold">
          ⚡ {t("challenge.title")} <Badge tone="gray">{active.length}</Badge>
        </div>
        <CardBody>
          {active.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">{t("friends.noChallenges")}</div>
          ) : (
            <div className="space-y-2">
              {active.map((c) => {
                const isFromMe = c.fromId === me.uid;
                const opponentName = isFromMe ? c.toName : c.fromName;
                const opponentPhoto = isFromMe ? c.toPhoto : c.fromPhoto;
                const iSubmitted = !!c.results?.[me.uid];
                const opponentSubmitted = !!c.results?.[isFromMe ? c.toId : c.fromId];
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex-wrap">
                    <Avatar name={opponentName} src={opponentPhoto} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {isFromMe ? t("challenge.against") : t("challenge.by")} <strong>{opponentName}</strong>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {c.subjectId} · {c.difficulty} · {c.count} Q
                        {c.status === "pending" && !isFromMe && <Badge tone="amber" className="ms-2">{t("challenge.invitation")}</Badge>}
                        {c.status === "active" && iSubmitted && !opponentSubmitted && <Badge tone="blue" className="ms-2">{t("challenge.awaitingOpponent")}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {c.status === "pending" && !isFromMe && (
                        <>
                          <Button size="sm" variant="success" onClick={() => accept(c)}>✓ {t("common.accept")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => decline(c)}>{t("common.decline")}</Button>
                        </>
                      )}
                      {c.status === "pending" && isFromMe && (
                        <Button size="sm" variant="ghost" onClick={() => cancel(c)}>{t("challenge.cancel")}</Button>
                      )}
                      {c.status === "active" && !iSubmitted && (
                        <Button size="sm" onClick={() => setRunChallenge(c)}>▶ {t("challenge.play")}</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold">
          🏆 {t("challenge.history")} <Badge tone="gray">{completed.length}</Badge>
        </div>
        <CardBody>
          {completed.length === 0 ? <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-3">{t("common.emptyState")}</div> :
            <div className="space-y-2">
              {completed.slice(0, 20).map((c) => {
                const isFromMe = c.fromId === me.uid;
                const opponentName = isFromMe ? c.toName : c.fromName;
                const opponentPhoto = isFromMe ? c.toPhoto : c.fromPhoto;
                const won = c.winnerId === me.uid;
                const tie = !c.winnerId;
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <Avatar name={opponentName} src={opponentPhoto} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {t("challenge.against")} {opponentName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString()} · {c.count} Q
                      </div>
                    </div>
                    <Badge tone={tie ? "gray" : won ? "green" : "red"}>
                      {tie ? t("challenge.tie") : won ? "🏆 " + t("challenge.winner") : t("challenge.loser")}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => setViewResult(c)}>👁</Button>
                  </div>
                );
              })}
            </div>}
        </CardBody>
      </Card>

      {runChallenge && (
        <ChallengeRunner
          me={me} challenge={runChallenge}
          onDone={() => setRunChallenge(null)}
        />
      )}
      {viewResult && (
        <ChallengeResultModal c={viewResult} me={me} onClose={() => setViewResult(null)} />
      )}
    </div>
  );
}

// ─── New challenge modal ─────────────────────────────────
function NewChallengeModal({ me, opponent, onClose }: { me: AppUser; opponent: AppUser; onClose: () => void }) {
  const { t, tr } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const [subjectId, setSubjectId] = useState("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [count, setCount] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [subjects, setSubjects] = useState<Subject[]>(seedSubjects);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => { const s = await dbService.list<Subject>("subjects"); if (s.length) setSubjects(s); })();
  }, []);

  async function send() {
    setSending(true);
    const id = await challengesService.send(me, opponent, { subjectId, difficulty, count, timerSeconds });
    setSending(false);
    if (!id) { showToast(t("challenge.notReady"), "error"); return; }
    showToast(t("common.saved"), "success");
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`${t("challenge.new")} · ${opponent.username}`} size="md">
      <div className="space-y-3">
        <Select label={t("challenge.specialty")} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="all">{t("opd.specialtiesAll")}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{tr(s.name)}</option>)}
        </Select>
        <Select label={t("challenge.difficulty")} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}>
          <option value="all">{t("common.all")}</option>
          <option value="easy">{t("common.easy")}</option>
          <option value="medium">{t("common.medium")}</option>
          <option value="hard">{t("common.hard")}</option>
        </Select>
        <Select label={t("challenge.count")} value={count} onChange={(e) => setCount(Number(e.target.value))}>
          {[3, 5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <Input label={t("challenge.timer")} type="number" value={timerSeconds} onChange={(e) => setTimerSeconds(Math.max(10, Number(e.target.value)))} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={send} loading={sending}>{t("challenge.send")}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Challenge runner (uses MCQ questions) ──────────────
function ChallengeRunner({ me, challenge, onDone }: { me: AppUser; challenge: Challenge; onDone: () => void }) {
  const { t, tr } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const [questions, setQuestions] = useState<Array<{ id: string; question: import("@/types").LocalizedText; options: import("@/types").MCQOption[]; correctOptionId: string; explanation: import("@/types").LocalizedText; }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [start] = useState(Date.now());

  useEffect(() => {
    (async () => {
      const all = await dbService.list<{ id: string; question: import("@/types").LocalizedText; options: import("@/types").MCQOption[]; correctOptionId: string; explanation: import("@/types").LocalizedText; }>("mcqs");
      const set = challenge.questionIds
        .map((id) => all.find((q) => q.id === id))
        .filter(Boolean) as typeof questions;
      setQuestions(set);
    })();
  }, [challenge.questionIds]);

  if (!questions.length) {
    return <Modal open onClose={onDone} title={t("common.loading")} size="md"><div className="text-center py-6 text-slate-500">{t("common.loading")}</div></Modal>;
  }
  const q = questions[idx];

  async function finish() {
    const score = questions.reduce((s, qq) => s + (answers[qq.id] === qq.correctOptionId ? 1 : 0), 0);
    const durationSec = Math.round((Date.now() - start) / 1000);
    await challengesService.submitResult(challenge, me, { score, total: questions.length, durationSec, completedAt: Date.now() });
    await dbService.update("users", me.uid, { xp: (me.xp || 0) + score * 10 });
    showToast(`+${score * 10} XP`, "success");
    playSound(score === questions.length ? "achievement" : "levelComplete");
    onDone();
  }

  return (
    <Modal open onClose={onDone} title={`⚡ ${t("challenge.title")} ${idx + 1}/${questions.length}`} size="lg">
      <div className="space-y-3">
        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
        <div className="font-semibold text-slate-900 dark:text-slate-100">{tr(q.question)}</div>
        <div className="space-y-2">
          {q.options.map((o) => {
            const sel = answers[q.id] === o.id;
            return (
              <button key={o.id}
                onClick={() => setAnswers({ ...answers, [q.id]: o.id })}
                className={cn("w-full text-start px-3 py-2 rounded-xl border-2 transition",
                  sel ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-slate-900 dark:text-teal-100"
                      : "border-slate-200 dark:border-slate-700 hover:border-teal-300 text-slate-800 dark:text-slate-200")}
              >
                <span className="font-bold me-2">{o.id.toUpperCase()}.</span>{tr(o.text)}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← {t("common.previous")}</Button>
          {idx + 1 < questions.length ? (
            <Button disabled={!answers[q.id]} onClick={() => setIdx(idx + 1)}>{t("common.next")} →</Button>
          ) : (
            <Button variant="success" disabled={Object.keys(answers).length < questions.length} onClick={finish}>{t("common.finish")}</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Challenge result modal ─────────────────────────────
function ChallengeResultModal({ c, me, onClose }: { c: Challenge; me: AppUser; onClose: () => void }) {
  const { t } = useI18n();
  const isFromMe = c.fromId === me.uid;
  const myRes = c.results?.[me.uid];
  const opponentId = isFromMe ? c.toId : c.fromId;
  const opRes = c.results?.[opponentId];
  const opponentName = isFromMe ? c.toName : c.fromName;
  const won = c.winnerId === me.uid;
  const tie = !c.winnerId;
  return (
    <Modal open onClose={onClose} title={`${t("challenge.result")} · ${opponentName}`} size="md">
      <div className="space-y-3">
        <div className="text-center">
          <div className="text-4xl mb-1">{tie ? "🤝" : won ? "🏆" : "🥈"}</div>
          <Badge tone={tie ? "gray" : won ? "green" : "red"}>
            {tie ? t("challenge.tie") : won ? t("challenge.winner") : t("challenge.loser")}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("chat.you")}</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{myRes?.score ?? 0}/{myRes?.total ?? c.count}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{myRes ? Math.round(myRes.score / Math.max(myRes.total, 1) * 100) : 0}% · {myRes?.durationSec || 0}s</div>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">{opponentName}</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{opRes?.score ?? 0}/{opRes?.total ?? c.count}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{opRes ? Math.round(opRes.score / Math.max(opRes.total, 1) * 100) : 0}% · {opRes?.durationSec || 0}s</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

