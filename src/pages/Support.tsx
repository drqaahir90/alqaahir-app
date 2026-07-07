import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { storageService } from "@/services/storage";
import { useAuthStore, useUIStore } from "@/stores";
import { playSound } from "@/utils/sound";
import { cn } from "@/utils/cn";
import type { AppUser, ChatAttachment, ChatMessage, ChatThread } from "@/types";

const EMOJIS = ["👍", "❤️", "😀", "😂", "🙏", "😢", "😮", "🎉", "🔥", "🩺", "💊", "📋"];

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yest = new Date(); yest.setDate(now.getDate() - 1);
  const isYest = d.toDateString() === yest.toDateString();
  const hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return hm;
  if (isYest) return `Yesterday · ${hm}`;
  return d.toLocaleDateString([], { day: "numeric", month: "short" }) + " · " + hm;
}

export default function SupportPage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const isAdmin = user?.role === "admin";
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Subscribe to threads
  useEffect(() => {
    if (!user) return;
    return dbService.subscribe<ChatThread>("chatThreads" as never, (docs) => {
      const list = isAdmin ? docs : docs.filter((th) => th.userId === user.uid);
      list.sort((a, b) => (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt));
      setThreads(list);
      // Auto-select for regular user their own thread; admin picks manually
      if (!isAdmin && list.length && !activeId) setActiveId(list[0].id);
    });
     
  }, [user, isAdmin]);

  const active = threads.find((t) => t.id === activeId) || null;

  async function startNewThread() {
    if (!user) return;
    const now = Date.now();
    const id = await dbService.add<Omit<ChatThread, "id">>("chatThreads" as never, {
      userId: user.uid,
      username: user.username,
      userPhoto: user.photoURL,
      subject: t("chat.newChat"),
      lastMessageAt: now,
      createdAt: now,
      status: "open",
      unreadByAdmin: 0,
      unreadByUser: 0,
    });
    setActiveId(id);
    showToast(t("chat.newChat"), "success");
  }

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">💬 {t("chat.title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {isAdmin ? "Reply to user conversations." : t("chat.startPrompt")}
        </p>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-3 h-[calc(100vh-16rem)] min-h-[500px]">
        {/* Threads list */}
        <Card className="overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{t("chat.threads")}</div>
            {!isAdmin && (
              <Button size="sm" onClick={startNewThread}>+ {t("chat.newChat")}</Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {isAdmin ? "No conversations yet." : t("chat.startPrompt")}
                {!isAdmin && (
                  <div className="mt-3"><Button onClick={startNewThread}>+ {t("chat.newChat")}</Button></div>
                )}
              </div>
            ) : threads.map((th) => {
              const unread = isAdmin ? (th.unreadByAdmin || 0) : (th.unreadByUser || 0);
              return (
                <button key={th.id} onClick={() => setActiveId(th.id)}
                  className={cn(
                    "w-full text-start p-3 border-b border-slate-100 dark:border-slate-800 transition",
                    activeId === th.id ? "bg-teal-50 dark:bg-teal-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={th.username} src={th.userPhoto} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                          {isAdmin ? th.username : t("chat.admin")}
                        </div>
                        <div className="text-[10px] text-slate-400 shrink-0">
                          {th.lastMessageAt ? formatTime(th.lastMessageAt) : ""}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {th.lastMessage || t("chat.startPrompt")}
                      </div>
                    </div>
                    {unread > 0 && <Badge tone="teal">{unread}</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Chat area */}
        <Card className="overflow-hidden flex flex-col">
          {active ? (
            <ChatView thread={active} me={user} isAdmin={!!isAdmin} />
          ) : (
            <div className="flex-1 grid place-items-center p-6">
              <EmptyState icon="💬" title={t("chat.selectThread")} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─────────── Chat View ───────────
function ChatView({ thread, me, isAdmin }: { thread: ChatThread; me: AppUser; isAdmin: boolean }) {
  const { t } = useI18n();
  const showToast = useUIStore((s) => s.showToast);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastCountRef = useRef(0);

  // Subscribe to messages
  useEffect(() => {
    return dbService.subscribe<ChatMessage>("chatMessages" as never, (docs) => {
      const list = docs
        .filter((m) => m.threadId === thread.id && !(m.deletedFor || []).includes(me.uid) && !m.deletedForAll)
        .sort((a, b) => a.createdAt - b.createdAt);
      // Play sound on new incoming
      if (list.length > lastCountRef.current && lastCountRef.current > 0) {
        const last = list[list.length - 1];
        if (last.senderId !== me.uid) playSound("message");
      }
      lastCountRef.current = list.length;
      setMessages(list);
    });
     
  }, [thread.id, me.uid]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Mark incoming messages as seen and clear unread counter
  useEffect(() => {
    const toMark = messages.filter((m) => m.senderId !== me.uid && !(m.seenBy || []).includes(me.uid));
    if (toMark.length > 0) {
      Promise.all(toMark.map((m) => dbService.update<ChatMessage>("chatMessages" as never, m.id, {
        status: "seen", seenBy: Array.from(new Set([...(m.seenBy || []), me.uid])),
      }))).catch(() => {});
    }
    // Reset the unread counter of THIS side
    const patch = isAdmin ? { unreadByAdmin: 0 } : { unreadByUser: 0 };
    if ((isAdmin ? thread.unreadByAdmin : thread.unreadByUser) || 0) {
      dbService.update<ChatThread>("chatThreads" as never, thread.id, patch).catch(() => {});
    }
     
  }, [messages, me.uid, isAdmin, thread.id]);

  // Typing indicator: current typing peer if updated in last 3s
  const peerTyping = useMemo(() => {
    if (!thread.typingBy || !thread.typingAt) return false;
    if (thread.typingBy === me.uid) return false;
    return Date.now() - thread.typingAt < 3000;
  }, [thread.typingBy, thread.typingAt, me.uid]);

  // Push typing state
  const typingSentAt = useRef(0);
  function notifyTyping() {
    const now = Date.now();
    if (now - typingSentAt.current < 1500) return;
    typingSentAt.current = now;
    dbService.update<ChatThread>("chatThreads" as never, thread.id, { typingBy: me.uid, typingAt: now }).catch(() => {});
  }

  async function send() {
    const t = text.trim();
    if (!t && !uploading) return;
    setText(""); setReplyTo(null); setEmojiOpen(false);
    const now = Date.now();
    const msg: Omit<ChatMessage, "id"> = {
      threadId: thread.id,
      senderId: me.uid,
      senderName: me.username,
      senderPhoto: me.photoURL,
      text: t,
      status: "sent",
      seenBy: [me.uid],
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text.slice(0, 80), senderName: replyTo.senderName } : undefined,
      createdAt: now,
    };
    await dbService.add("chatMessages" as never, msg);
    // Update thread meta & increment unread for the *other* side
    const bump = isAdmin
      ? { unreadByUser: (thread.unreadByUser || 0) + 1 }
      : { unreadByAdmin: (thread.unreadByAdmin || 0) + 1 };
    await dbService.update<ChatThread>("chatThreads" as never, thread.id, {
      lastMessage: t || "📎",
      lastMessageAt: now,
      lastSenderId: me.uid,
      ...bump,
    });
    // simulate delivered after slight delay (Firestore will push seen from other client)
    setTimeout(() => {
      dbService.list<ChatMessage>("chatMessages" as never).then((all) => {
        const created = all.find((x) => x.senderId === me.uid && x.createdAt === now);
        if (created && created.status === "sent") {
          dbService.update("chatMessages" as never, created.id, { status: "delivered" }).catch(() => {});
        }
      });
    }, 300);
  }

  async function pickFile(files: FileList | null) {
    if (!files || !files[0] || !me) return;
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
        threadId: thread.id,
        senderId: me.uid,
        senderName: me.username,
        senderPhoto: me.photoURL,
        text: "",
        attachments: [att],
        status: "sent",
        seenBy: [me.uid],
        createdAt: now,
      };
      await dbService.add("chatMessages" as never, msg);
      const bump = isAdmin
        ? { unreadByUser: (thread.unreadByUser || 0) + 1 }
        : { unreadByAdmin: (thread.unreadByAdmin || 0) + 1 };
      await dbService.update<ChatThread>("chatThreads" as never, thread.id, {
        lastMessage: att.isImage ? "📷 " + t("chat.image") : "📎 " + t("chat.file"),
        lastMessageAt: now, lastSenderId: me.uid, ...bump,
      });
    } catch {
      showToast(t("common.uploadFailed"), "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteMsg(m: ChatMessage) {
    if (m.senderId !== me.uid) return;
    await dbService.update<ChatMessage>("chatMessages" as never, m.id, { deletedForAll: true });
  }

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <Avatar name={thread.username} src={thread.userPhoto} size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {isAdmin ? thread.username : t("chat.admin")}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {peerTyping ? (
              <span className="text-teal-600 dark:text-teal-400 animate-typing">
                {t("chat.typing")}<span>.</span><span>.</span><span>.</span>
              </span>
            ) : thread.status === "open" ? "Online" : "Closed"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-slate-400 pt-10">{t("chat.sayHiEmoji")}</div>
        ) : messages.map((m, i) => {
          const mine = m.senderId === me.uid;
          const prev = messages[i - 1];
          const showAvatar = !prev || prev.senderId !== m.senderId;
          return (
            <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
              {!mine && (
                <div className="w-8 shrink-0">
                  {showAvatar && <Avatar name={m.senderName} src={m.senderPhoto} size={32} />}
                </div>
              )}
              <div className={cn("max-w-[75%] group")}>
                {m.replyTo && (
                  <div className={cn("text-xs px-3 py-1.5 rounded-t-xl border-s-2",
                    mine ? "bg-teal-100/60 dark:bg-teal-900/30 border-teal-500 text-teal-800 dark:text-teal-200"
                         : "bg-slate-200 dark:bg-slate-800 border-slate-400 text-slate-600 dark:text-slate-300")}>
                    <div className="font-semibold text-[10px] uppercase">{m.replyTo.senderName}</div>
                    <div className="truncate">{m.replyTo.text}</div>
                  </div>
                )}
                <div className={cn("relative px-3 py-2 rounded-2xl shadow-sm",
                  mine
                    ? "bg-teal-600 text-white bubble-me"
                    : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 bubble-them border border-slate-200 dark:border-slate-700",
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
                  <div className={cn("flex items-center gap-1 text-[10px] mt-1 opacity-80",
                    mine ? "justify-end text-teal-100" : "justify-end text-slate-500 dark:text-slate-400")}>
                    <span>{formatTime(m.createdAt)}</span>
                    {mine && (
                      <span>
                        {m.status === "seen" ? "✓✓" : m.status === "delivered" ? "✓✓" : "✓"}
                        <span className={cn("ms-0.5", m.status === "seen" && "text-sky-300")}>
                          {m.status === "seen" ? "" : ""}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Action buttons on hover */}
                  <div className={cn("absolute -top-3 opacity-0 group-hover:opacity-100 transition flex gap-1",
                    mine ? "start-0" : "end-0")}>
                    <button onClick={() => setReplyTo(m)}
                      className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs shadow" title={t("chat.replyTo")}>↩</button>
                    {mine && (
                      <button onClick={() => deleteMsg(m)}
                        className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 text-xs shadow" title={t("chat.deleteMsg")}>🗑</button>
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
          <button onClick={() => setReplyTo(null)} className="text-slate-500 dark:text-slate-400">×</button>
        </div>
      )}

      {/* Emoji picker */}
      {emojiOpen && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900 flex flex-wrap gap-1">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => { setText((t) => t + e); setEmojiOpen(false); }}
              className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1">{e}</button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-2 flex items-end gap-2 bg-white dark:bg-slate-900">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-10 w-10 grid place-items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          title={t("chat.attach")}
          disabled={uploading}
        >{uploading ? "⏳" : "📎"}</button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => pickFile(e.target.files)} />
        <button
          onClick={() => setEmojiOpen((o) => !o)}
          className="h-10 w-10 grid place-items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          title={t("chat.emoji")}
        >😀</button>
        <Input
          value={text}
          onChange={(e) => { setText(e.target.value); notifyTyping(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
          }}
          placeholder={t("chat.placeholder")}
          className="!py-2.5"
        />
        <Button onClick={send} disabled={!text.trim() && !uploading} className="!px-4 shrink-0">
          ➤
        </Button>
      </div>
    </>
  );
}
