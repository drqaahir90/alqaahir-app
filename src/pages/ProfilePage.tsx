import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarPickerModal, Badge, Button, Card, CardBody, EmptyState, Input, Select, Stat } from "@/components/ui";
import { LANGS, useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { storageService } from "@/services/storage";
import { useAuthStore, useUIStore } from "@/stores";
import type { EducationArticle, Lang, QuizResult } from "@/types";
import { useTheme, type ThemeMode } from "@/theme";
import { isSoundEnabled, setSoundEnabled, getSfxVolume, setSfxVolume } from "@/utils/sound";
import { useMusic } from "@/audio/MusicProvider";
import { ContinueLearning } from "@/components/profile/ContinueLearning";
import { Achievements } from "@/components/profile/Achievements";
import { LearningStats } from "@/components/profile/LearningStats";
import { currentPermission, getPrefs, notifCategories, requestPermission, setPrefs, type NotifCategory } from "@/services/notifications";
import { cn } from "@/utils/cn";

export default function ProfilePage() {
  const { t, tr, setLang } = useI18n();
  const nav = useNavigate();
  const { mode, setMode } = useTheme();
  const music = useMusic();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useUIStore((s) => s.showToast);

  const [username, setUsername] = useState(user?.username || "");
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || "");
  const [lang, setLng] = useState<Lang>(user?.language || "en");
  const [results, setResults] = useState<QuizResult[]>([]);
  const [bookmarks, setBookmarks] = useState<EducationArticle[]>([]);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const rs = await dbService.list<QuizResult>("quizResults");
      setResults(rs.filter((r) => r.userId === user.uid).sort((a, b) => b.createdAt - a.createdAt));
      const arts = await dbService.list<EducationArticle>("educationArticles");
      setBookmarks(arts.filter((a) => (user.bookmarks || []).includes(a.id)));
    })();
  }, [user]);

  if (!user) return null;

  return (
    <>
      <div className="space-y-5 animate-fade-in">
        <header className="flex items-center gap-4 flex-wrap">
          <Avatar name={user.username} src={user.photoURL} size={80} />
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <Button variant="danger" onClick={async () => { await logout(); nav("/auth"); }}>Logout</Button>
        </header>

        <ContinueLearning userId={user.uid} />
        <Achievements user={user} results={results} />
      </div>

      <AvatarPickerModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onSelect={async (url) => { 
            await dbService.update("users", user.uid, { photoURL: url });
            setUser({ ...user, photoURL: url });
            setAvatarModalOpen(false);
        }}
      />
    </>
  );
}
;
    showToast(t("common.saved"), "success");
  }

  async function onSelectAvatar(url: string) {
    if (!user) return;
    setUploading(true);
    try {
      await dbService.update("users", user.uid, { photoURL: url });
      setUser({ ...user, photoURL: url });
      showToast(t("common.saved"), "success");
    } catch {
      showToast(t("chat.uploadFailed"), "error");
    } finally {
      setUploading(false);
    }
  }

  async function onPickPhoto(files: FileList | null) {
    if (!files || !files[0] || !user) return;
    setUploading(true);
    try {
      const url = await storageService.uploadAvatar(user.uid, files[0]);
      await dbService.update("users", user.uid, { photoURL: url });
      setUser({ ...user, photoURL: url });
      showToast(t("common.saved"), "success");
    } catch {
      showToast(t("chat.uploadFailed"), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!user?.photoURL) return;
    try { await storageService.remove(user.photoURL); } catch { /* ignore */ }
    await dbService.update("users", user.uid, { photoURL: "" });
    setUser({ ...user, photoURL: "" });
    showToast(t("common.saved"), "success");
  }

  async function doLogout() {
    if (!confirm(t("profile.logoutConfirm"))) return;
    try { dbService.clearCache(); } catch { /* ignore */ }
    await logout();
    showToast(t("auth.loggedOut"), "success");
    nav("/auth", { replace: true });
  }

  async function deleteResult(id: string) {
    if (!confirm(t("profile.deleteResultConfirm"))) return;
    await dbService.remove("quizResults", id);
    setResults((rs) => rs.filter((r) => r.id !== id));
    showToast(t("common.saved"), "success");
  }
  async function clearHistory() {
    if (!confirm(t("profile.clearHistoryConfirm"))) return;
    for (const r of results) await dbService.remove("quizResults", r.id);
    setResults([]);
    showToast(t("profile.historyCleared"), "success");
  }

  async function enablePush() {
    const perm = await requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      const p = { ...notifPrefs, enabled: true };
      setNotifPrefsState(p);
      setPrefs(p);
      showToast(t("notif.push.enabled"), "success");
    }
  }
  function toggleCategory(id: NotifCategory) {
    const p = { ...notifPrefs, categories: { ...notifPrefs.categories, [id]: !notifPrefs.categories[id] } };
    setNotifPrefsState(p);
    setPrefs(p);
    showToast(t("notif.savedPrefs"), "success");
  }
  function togglePushMaster() {
    if (!notifPrefs.enabled && notifPerm !== "granted") { void enablePush(); return; }
    const p = { ...notifPrefs, enabled: !notifPrefs.enabled };
    setNotifPrefsState(p);
    setPrefs(p);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header with avatar */}
      <header className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Avatar name={user.username} src={user.photoURL} size={80} />
          <button
            onClick={() => setAvatarModalOpen(true)}
            disabled={uploading}
            className="absolute bottom-0 end-0 h-8 w-8 rounded-full bg-teal-600 hover:bg-teal-700 text-white grid place-items-center shadow-lg border-2 border-white dark:border-slate-900"
            title={t("profile.changePhoto")}
          >
            {uploading ? "⏳" : "📷"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickPhoto(e.target.files)} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user.username}</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
            <span>{user.email}</span>
            <Badge tone={user.role === "admin" ? "violet" : "gray"}>{user.role}</Badge>
          </div>
          
          {/* New dual buttons for Avatar & Local Upload */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setAvatarModalOpen(true)}>
              👨‍⚕️ Avatar
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              🖼️ Upload
            </Button>
            {user.photoURL && (
              <Button size="sm" variant="ghost" onClick={removePhoto}>
                🗑 {t("profile.removePhoto") || "Remove"}
              </Button>
            )}
          </div>
        </div>
        {/* Prominent Logout */}
        <Button variant="danger" onClick={doLogout} icon={<span>⎋</span>}>
          {t("profile.logout")}
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="XP" value={user.xp || 0} icon={<span>⚡</span>} tone="teal" />
        <Stat label={t("leaderboard.quizzes")} value={results.length} icon={<span>📝</span>} tone="blue" />
        <Stat label={t("leaderboard.accuracy")} value={`${acc}%`} icon={<span>🎯</span>} tone="green" />
        <Stat label={t("profile.bookmarks")} value={bookmarks.length} icon={<span>🔖</span>} tone="amber" />
      </div>

      {/* Continue learning + achievements + stats */}
      <ContinueLearning userId={user.uid} />
      <Achievements user={user} results={results} />
      <LearningStats results={results} />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Edit profile */}
        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
            {t("profile.editProfile")}
          </div>
          <CardBody className="space-y-3">
            <Input label={t("auth.username")} value={username} onChange={(e) => setUsername(e.target.value)} />
            <Input label={t("auth.whatsapp")} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            <Select label={t("profile.language")} value={lang} onChange={(e) => setLng(e.target.value as Lang)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </Select>
            <div className="flex justify-end"><Button onClick={save}>{t("common.save")}</Button></div>
          </CardBody>
        </Card>

        {/* Appearance + sound + music */}
        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
            {t("theme.appearance")}
          </div>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t("theme.appearance")}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={cn("px-3 py-2 rounded-xl border-2 text-sm font-medium transition",
                      mode === m
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300"
                    )}
                  >
                    <div className="text-xl mb-0.5">{m === "light" ? "☀️" : m === "dark" ? "🌙" : "💻"}</div>
                    {t(`theme.${m}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t("sound.title")}</label>
              <button
                onClick={() => { const nv = !soundOn; setSoundEnabled(nv); setSoundOn(nv); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-300"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-xl">{soundOn ? "🔊" : "🔇"}</span>
                  <span className="text-slate-700 dark:text-slate-300">{soundOn ? t("sound.enabled") : t("sound.disabled")}</span>
                </span>
                <span className={cn("h-6 w-11 rounded-full relative transition", soundOn ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700")}>
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", soundOn ? "start-5" : "start-0.5")} />
                </span>
              </button>
              {soundOn && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t("sound.sfxVolume")}</span>
                  <input type="range" min={0} max={100} value={Math.round(sfxVol * 100)}
                    onChange={(e) => { const v = Number(e.target.value) / 100; setSfxVol(v); setSfxVolume(v); }}
                    className="flex-1 accent-teal-600" />
                  <span className="text-xs text-slate-500 w-8 text-end">{Math.round(sfxVol * 100)}</span>
                </div>
              )}
            </div>

            {/* User music */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">🎵 {t("music.title")}</label>
              <button
                onClick={() => music.setEnabled(!music.enabled)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-300"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-xl">🎵</span>
                  <span className="text-slate-700 dark:text-slate-300">{music.enabled ? t("music.enabled") : t("music.disabled")}</span>
                </span>
                <span className={cn("h-6 w-11 rounded-full relative transition", music.enabled ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700")}>
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", music.enabled ? "start-5" : "start-0.5")} />
                </span>
              </button>
              {music.enabled && (
                <div className="mt-2 space-y-2">
                  <Button size="sm" variant="outline" onClick={() => musicFileRef.current?.click()}>➕ {t("music.addFiles")}</Button>
                  <input ref={musicFileRef} type="file" accept="audio/*" multiple className="hidden"
                    onChange={(e) => { void music.addFiles(e.target.files || new FileList()); if (musicFileRef.current) musicFileRef.current.value = ""; }} />
                  {music.tracks.length > 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {music.tracks.length} {t("music.playlist").toLowerCase()} · {t("music.emptyPrompt")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Notifications preferences */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
          🔔 {t("notif.push.title")}
        </div>
        <CardBody className="space-y-3">
          {notifPerm === "denied" ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-sm">
              ⚠️ {t("notif.push.blocked")}
            </div>
          ) : (
            <button
              onClick={togglePushMaster}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-300"
            >
              <span className="flex items-center gap-2 text-sm">
                <span className="text-xl">🔔</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {notifPrefs.enabled ? t("notif.push.enabled") : t("notif.push.enable")}
                </span>
              </span>
              <span className={cn("h-6 w-11 rounded-full relative transition", notifPrefs.enabled ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700")}>
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", notifPrefs.enabled ? "start-5" : "start-0.5")} />
              </span>
            </button>
          )}

          {notifPrefs.enabled && (
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t("notif.categories")}</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {notifCategories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <input type="checkbox" checked={notifPrefs.categories[c.id]} onChange={() => toggleCategory(c.id)} />
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{t(`notif.cat.${c.id}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Bookmarks */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
          🔖 {t("profile.bookmarks")}
        </div>
        <CardBody>
          {bookmarks.length === 0 ? <EmptyState title={t("common.emptyState")} icon="🔖" /> :
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {bookmarks.map((a) => (
                <li key={a.id} className="py-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{tr(a.title)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{tr(a.body)}</div>
                </li>
              ))}
            </ul>}
        </CardBody>
      </Card>

      {/* History */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between gap-2">
          <span>📊 {t("profile.history")}</span>
          {results.length > 0 && (
            <Button size="sm" variant="outline" onClick={clearHistory}>
              🗑 {t("profile.clearHistory")}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-start">{t("common.date")}</th>
                <th className="px-4 py-2 text-start">{t("profile.type")}</th>
                <th className="px-4 py-2">{t("common.score")}</th>
                <th className="px-4 py-2">%</th>
                <th className="px-4 py-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">{t("common.emptyState")}</td></tr> :
                results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <td className="px-4 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2"><Badge tone={r.type === "mcq" ? "teal" : r.type === "case" ? "blue" : "violet"}>{r.type.toUpperCase()}</Badge></td>
                    <td className="px-4 py-2 text-center">{r.score}/{r.total}</td>
                    <td className="px-4 py-2 text-center font-semibold text-teal-700 dark:text-teal-400">{Math.round((r.score / Math.max(r.total, 1)) * 100)}%</td>
                    <td className="px-4 py-2 text-center">
                      <Button size="sm" variant="ghost" onClick={() => deleteResult(r.id)}>🗑</Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bottom logout for mobile — duplicate for prominence */}
      <div className="lg:hidden">
        <Button variant="danger" className="w-full" size="lg" onClick={doLogout}>
          ⎋ {t("profile.logout")}
        </Button>
      </div>

      {/* Avatar Selection Modal */}
      <AvatarPickerModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onSelect={onSelectAvatar}
      />
    </div>
  );
}
