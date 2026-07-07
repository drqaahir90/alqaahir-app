import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Badge, Button, Card, Input } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { storageService } from "@/services/storage";
import { useAuthStore, useUIStore } from "@/stores";
import { getOrCreateFriendThread } from "@/services/friendChat";
import { pushNotification } from "@/services/notify";
import { playSound } from "@/utils/sound";
import { cn } from "@/utils/cn";
import type { AppUser, ChatAttachment, ChatMessage, ChatThread } from "@/types";

// Modern iOS-style emoji set
const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
  "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚",
  "😋", "😛", "😜", "🤪", "😝", "🤗", "🤭", "🤫", "🤔", "🤐",
  "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔",
  "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶",
  "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟",
  "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨",
  "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩",
  "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️",
  "👍", "👎", "👌", "🙏", "👏", "🙌", "🤝", "❤️", "🧡", "💛",
  "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞",
  "💓", "💗", "💖", "💘", "💝", "💯", "💢", "💥", "💫", "💦",
  "🔥", "🎉", "🎊", "🎁", "🩺", "💊", "💉", "🫀", "🫁", "🧠",
];

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const y = new Date(); y.setDate(now.getDate() - 1);
  const isYest = d.toDateString() === y.toDateString();
  const hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return hm;
  if (isYest) return `Yesterday · ${hm}`;
  return d.toLocaleDateString([], { day: "numeric", month: "short" }) + " · " + hm;
}

/**
 * Inline friend chat page — same professional UX as the Admin ↔ User chat.
 * Route: /friends/chat/:uid
 */
export default function FriendChatPage() {
  const { t } = useI18n();
  const { uid } = useParams();
  const nav = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const me = useAuthStore((s) => s.user);
  const [peer, setPeer] = useState<AppUser | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const typingSentAt = useRef(0);
  const lastCountRef = useRef(0);

  // Load peer + thread
  useEffect(() => {
    if (!uid || !me) return;
    (async () => {
      const p = await dbService.get<AppUser>("users", uid);
      if (!p) { nav("/friends", { replace: true }); return; }
      setPeer(p);
      const th = await getOrCreateFriendThread(me.uid, p.uid, [
        { uid: me.uid, name: me.username, photo: me.photoURL },
        { uid: p.uid, name: p.username, photo: p.photoURL },
      ]);
      setThread(th);
    })();
  }, [uid, me, nav]);

  // Subscribe to thread updates (typing indicator + online)
  useEffect(() => {
    if (!thread) return;
    return dbService.subscribe<ChatThread>("chatThreads", (docs) => {
      const t = docs.find((x) => x.id === thread.id);
      if (t) setThread(t);
    });
  }, [thread?.id]);

  // Update my lastActiveAt every 30 s while on this page (for online status).
  useEffect(() => {
    if (!me) return;
    const bump = () => dbService.update("users", me.uid, { lastActiveAt: Date.now() }).catch(() => {});
    bump();
    const iv = setInterval(bump, 30_000);
    return () => clearInterval(iv);
  }, [me]);

  // Subscribe to messages
  useEffect(() => {
    if (!thread || !me) return;
    return dbService.subscribe<ChatMessage>("chatMessages", (docs) => {
      const list = docs
        .filter((m) => m.threadId === thread.id && !(m.deletedFor || []).includes(me.uid) && !m.deletedForAll)
        .sort((a, b) => a.createdAt - b.createdAt);
      // Play sound when a new incoming message arrives
      if (list.length > lastCountRef.current && lastCountRef.current > 0) {
        const last = list[list.length - 1];
        if (last && last.senderId !== me.uid && last.senderId !== "system") playSound("message");
      }
      lastCountRef.current = list.length;
      setMessages(list);
    });
  }, [thread?.id, me]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Mark peer messages as seen + reset unread counter
  useEffect(() => {
    if (!thread || !me) return;
    const toMark = messages.filter((m) => m.senderId !== me.uid && m.senderId !== "system" && !(m.seenBy || []).includes(me.uid));
    if (toMark.length > 0) {
      Promise.all(toMark.map((m) => dbService.update<ChatMessage>("chatMessages", m.id, {
        status: "seen", seenBy: Array.from(new Set([...(m.seenBy || []), me.uid])),
      }))).catch(() => {});
    }
    if ((thread.unread?.[me.uid] || 0) > 0) {
      dbService.update<ChatThread>("chatThreads", thread.id, {
        unread: { ...(thread.unread || {}), [me.uid]: 0 },
      }).catch(() => {});
    }
  }, [messages, me, thread]);

  const peerTyping = useMemo(() => {
    if (!thread?.typingBy || !thread.typingAt || !peer) return false;
    return thread.typingBy === peer.uid && Date.now() - thread.typingAt < 3000;
  }, [thread?.typingBy, thread?.typingAt, peer]);

  const peerOnline = useMemo(() => {
    if (!peer?.lastActiveAt) return "offline" as const;
    const diff = Date.now() - peer.lastActiveAt;
    if (diff < 2 * 60_000) return "now" as const;
    if (diff < 15 * 60_000) return "recently" as const;
    return "offline" as const;
  }, [peer?.lastActiveAt]);

  function notifyTyping() {
    if (!thread || !me) return;
    const now = Date.now();
    if (now - typingSentAt.current < 1500) return;
    typingSentAt.current = now;
    dbService.update<ChatThread>("chatThreads", thread.id, { typingBy: me.uid, typingAt: now }).catch(() => {});
  }

  async function send() {
    if (!thread || !me || !peer) return;
    const body = text.trim();
    if (!body && !uploading) return;
    setText(""); setReplyTo(null); setEmojiOpen(false);
    const now = Date.now();
    const msg: Omit<ChatMessage, "id"> = {
      threadId: thread.id, senderId: me.uid,
      senderName: me.username, senderPhoto: me.photoURL,
      text: body, status: "sent", seenBy: [me.uid],
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text.slice(0, 80), senderName: replyTo.senderName } : undefined,
      createdAt: now,
    };
    await dbService.add("chatMessages", msg);
    await dbService.update<ChatThread>("chatThreads", thread.id, {
      lastMessage: body || "📎", lastMessageAt: now, lastSenderId: me.uid,
      unread: { ...(thread.unread || {}), [peer.uid]: (thread.unread?.[peer.uid] || 0) + 1 },
    });
    // Auto-upgrade to delivered shortly after
    setTimeout(() => {
      dbService.list<ChatMessage>("chatMessages").then((all) => {
        const created = all.find((x) => x.senderId === me.uid && x.createdAt === now);
        if (created && created.status === "sent") {
          dbService.update("chatMessages", created.id, { status: "delivered" }).catch(() => {});
        }
      });
    }, 300);
    // Push notification to peer
    void pushNotification({
      kind: "message", audience: "personal", userId: peer.uid,
      title: { en: "New message", ar: "رسالة جديدة", so: "Fariin cusub" },
      body: {
        en: `${me.username}: ${body || "📎"}`,
        ar: `${me.username}: ${body || "📎"}`,
        so: `${me.username}: ${body || "📎"}`,
      },
      link: `#/friends/chat/${me.uid}`,
      senderId: me.uid,
    });
  }

  async function pickFile(files: FileList | null) {
    if (!files || !files[0] || !me || !thread || !peer) return;
    setUploading(true);
    try {
      const f = files[0];
      const url = await storageService.uploadChatAttachment(thread.id, f);
      const att: ChatAttachment = {
        url, name: f.name, type: f.type, size: f.size,
        isImage: f.type.startsWith("image/"),
      };
      const now = Date.now();
      const msg: Omit<ChatMessage, "id"> = {
        threadId: thread.id, senderId: me.uid,
        senderName: me.username, senderPhoto: me.photoURL,
        text: "", attachments: [att], status: "sent", seenBy: [me.uid], createdAt: now,
      };
      await dbService.add("chatMessages", msg);
      await dbService.update<ChatThread>("chatThreads", thread.id, {
        lastMessage: att.isImage ? "📷 " + t("chat.image") : "📎 " + t("chat.file"),
        lastMessageAt: now, lastSenderId: me.uid,
        unread: { ...(thread.unread || {}), [peer.uid]: (thread.unread?.[peer.uid] || 0) + 1 },
      });
    } catch { showToast(t("chat.uploadFailed"), "error"); }
    finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deleteMsg(m: ChatMessage) {
    if (m.senderId !== me?.uid) return;
    await dbService.update<ChatMessage>("chatMessages", m.id, { deletedForAll: true });
  }

  const filtered = q.trim() ? messages.filter((m) => m.text.toLowerCase().includes(q.toLowerCase())) : messages;

  if (!me || !peer) {
    return <div className="text-center py-10 text-slate-500 dark:text-slate-400">{t("common.loading")}</div>;
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <Card className="overflow-hidden flex flex-col h-[calc(100vh-9rem)] min-h-[500px]">
        {/* Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <button onClick={() => nav("/friends")}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flip-rtl"
            aria-label={t("common.back")}>←</button>
          <button onClick={() => nav(`/u/${peer.uid}`)}>
            <Avatar name={peer.username} src={peer.photoURL} size={40} />
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={() => nav(`/u/${peer.uid}`)} className="text-start block">
              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{peer.username}</div>
              <div className="text-xs">
                {peerTyping ? (
                  <span className="text-teal-600 dark:text-teal-400 animate-typing">
                    {t("chat.someoneTyping")}<span>.</span><span>.</span><span>.</span>
                  </span>
                ) : (
                  <span className={cn(
                    peerOnline === "now"      ? "text-emerald-600 dark:text-emerald-400" :
                    peerOnline === "recently" ? "text-amber-600 dark:text-amber-400"     :
                                                "text-slate-500 dark:text-slate-400"
                  )}>
                    {peerOnline === "now" && `● ${t("chat.online.now")}`}
                    {peerOnline === "recently" && `● ${t("chat.online.recently")}`}
                    {peerOnline === "offline" && `○ ${t("chat.online.offline")}`}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("chat.searchMessages")} className="!py-1.5 text-sm" />
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
          {filtered.length === 0 ? (
            <div className="text-center text-sm text-slate-400 pt-10">{t("chat.sayHiEmoji")}</div>
          ) : filtered.map((m, i) => {
            const mine = m.senderId === me.uid;
            const system = m.senderId === "system";
            if (system) {
              return (
                <div key={m.id} className="text-center text-xs text-slate-500 dark:text-slate-400 py-1 px-3 bg-slate-100/60 dark:bg-slate-800/60 rounded-full mx-auto max-w-max">
                  {m.text}
                </div>
              );
            }
            const prev = filtered[i - 1];
            const showAvatar = !prev || prev.senderId !== m.senderId || prev.senderId === "system";
            return (
              <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && (
                  <div className="w-8 shrink-0">
                    {showAvatar && <Avatar name={m.senderName} src={m.senderPhoto} size={32} />}
                  </div>
                )}
                <div className="max-w-[75%] group">
                  {m.replyTo && (
                    <div className={cn("text-xs px-3 py-1.5 rounded-t-xl border-s-2",
                      mine ? "bg-teal-100/60 dark:bg-teal-900/30 border-teal-500 text-teal-800 dark:text-teal-200"
                           : "bg-slate-200 dark:bg-slate-800 border-slate-400 text-slate-600 dark:text-slate-300"
                    )}>
                      <div className="font-semibold text-[10px] uppercase">{m.replyTo.senderName}</div>
                      <div className="truncate">{m.replyTo.text}</div>
                    </div>
                  )}
                  <div className={cn("relative px-3 py-2 rounded-2xl shadow-sm",
                    mine
                      ? "bg-teal-600 text-white bubble-me"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 bubble-them border border-slate-200 dark:border-slate-700"
                  )}>
                    {m.attachments?.map((a, ai) => (
                      <div key={ai} className="mb-1">
                        {a.isImage ? (
                          <a href={a.url} target="_blank" rel="noreferrer">
                            <img src={a.url} alt={a.name} className="rounded-lg max-h-64 object-cover" />
                          </a>
                        ) : (
                          <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline">
                            📎 {a.name}
                          </a>
                        )}
                      </div>
                    ))}
                    {m.text && <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>}
                    <div className={cn("flex items-center gap-1 text-[10px] mt-1",
                      mine ? "justify-end text-teal-100" : "justify-end text-slate-500 dark:text-slate-400"
                    )}>
                      <span>{formatTime(m.createdAt)}</span>
                      {mine && (
                        <span className={cn(m.status === "seen" && "text-sky-300")}>
                          {m.status === "seen" ? "✓✓" : m.status === "delivered" ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                    <div className={cn("absolute -top-3 opacity-0 group-hover:opacity-100 transition flex gap-1",
                      mine ? "start-0" : "end-0"
                    )}>
                      <button onClick={() => setReplyTo(m)}
                        className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs shadow"
                        title={t("chat.replyTo")}>↩</button>
                      {mine && (
                        <button onClick={() => deleteMsg(m)}
                          className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 text-xs shadow"
                          title={t("chat.deleteMsg")}>🗑</button>
                      )}
                    </div>
                  </div>
                </div>
                {mine && (
                  <div className="w-8 shrink-0">
                    {showAvatar && <Avatar name={me.username} src={me.photoURL} size={32} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reply-to bar */}
        {replyTo && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60">
            <span className="text-lg">↩</span>
            <div className="flex-1 min-w-0 text-xs">
              <div className="text-teal-700 dark:text-teal-300 font-semibold">{t("chat.replyTo")} {replyTo.senderName}</div>
              <div className="truncate text-slate-600 dark:text-slate-400">{replyTo.text || "📎"}</div>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-slate-500 dark:text-slate-400" aria-label={t("common.close")}>×</button>
          </div>
        )}

        {/* Emoji picker */}
        {emojiOpen && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900 max-h-52 overflow-y-auto">
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map((e) => (
                <button key={e}
                  onClick={() => { setText((t) => t + e); }}
                  className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1">{e}</button>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-2 flex items-end gap-2 bg-white dark:bg-slate-900">
          <button onClick={() => fileRef.current?.click()}
            className="h-10 w-10 grid place-items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title={t("chat.attach")} disabled={uploading}>
            {uploading ? "⏳" : "📎"}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => pickFile(e.target.files)} />
          <button onClick={() => setEmojiOpen((o) => !o)}
            className="h-10 w-10 grid place-items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title={t("chat.emojiPicker")}>😀</button>
          <Input value={text}
            onChange={(e) => { setText(e.target.value); notifyTyping(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder={t("chat.placeholder")}
            className="!py-2.5" />
          <Button onClick={send} disabled={!text.trim() && !uploading} className="!px-4 shrink-0">➤</Button>
        </div>
      </Card>
    </div>
  );
}

// Suppress unused import warning
void Badge;
