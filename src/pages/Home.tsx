import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Card, CardBody, Stat, Badge, Button } from "@/components/ui";
import { useI18n } from "@/i18n";
import { useAuthStore } from "@/stores";
import { dbService } from "@/services/db";
import type { CaseStudy, EducationArticle, LeaderboardEntry, MCQ, OPDCase, QuizResult, Subject } from "@/types";
import { seedSubjects } from "@/data/seed";

export default function Home() {
  const { t, tr, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [opd, setOpd] = useState<OPDCase[]>([]);
  const [articles, setArticles] = useState<EducationArticle[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(seedSubjects);
  const [top, setTop] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    (async () => {
      await dbService.init();
      setMcqs(await dbService.list("mcqs"));
      setCases(await dbService.list("caseStudies"));
      setOpd(await dbService.list("opdCases"));
      setArticles(await dbService.orderedList("educationArticles"));
      const subs = await dbService.list<Subject>("subjects");
      if (subs.length) setSubjects(subs);

      const users = await dbService.list<{ uid: string; username: string; photoURL?: string; xp?: number }>("users");
      const results = await dbService.list<QuizResult>("quizResults");
      const map = new Map<string, LeaderboardEntry>();
      for (const u of users) map.set(u.uid, { userId: u.uid, username: u.username, photoURL: u.photoURL, xp: u.xp || 0, quizzes: 0, accuracy: 0 });
      const acc: Record<string, { total: number; correct: number; count: number }> = {};
      for (const r of results) {
        const a = acc[r.userId] ||= { total: 0, correct: 0, count: 0 };
        a.total += r.total; a.correct += r.score; a.count += 1;
      }
      for (const [uid, a] of Object.entries(acc)) {
        const e = map.get(uid) || { userId: uid, username: uid, xp: 0, quizzes: 0, accuracy: 0 };
        e.quizzes = a.count; e.accuracy = a.total ? Math.round((a.correct / a.total) * 100) : 0;
        map.set(uid, e);
      }
      setTop(Array.from(map.values()).sort((a, b) => b.xp - a.xp).slice(0, 5));
    })();
  }, [lang]);

  const modules = [
    { to: "/mcq",         icon: "❓",  title: t("nav.mcq"),         color: "from-teal-500 to-emerald-500",  count: mcqs.length,     label: t("home.stats.mcqs") },
    { to: "/cases",       icon: "📋",  title: t("nav.cases"),       color: "from-blue-500 to-indigo-500",   count: cases.length,    label: t("home.stats.cases") },
    { to: "/opd",         icon: "🩺",  title: t("nav.opd"),         color: "from-rose-500 to-red-500",      count: opd.length,      label: t("home.stats.opd") },
    { to: "/education",   icon: "📚",  title: t("nav.education"),   color: "from-amber-500 to-orange-500",  count: articles.length, label: t("nav.education") },
    { to: "/leaderboard", icon: "🏆",  title: t("nav.leaderboard"), color: "from-yellow-500 to-amber-500",  count: top.length,      label: t("nav.leaderboard") },
    { to: "/friends",     icon: "🤝",  title: t("nav.friends"),     color: "from-violet-500 to-fuchsia-500", count: 0,              label: t("nav.friends") },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 dark:from-teal-800 dark:via-emerald-800 dark:to-teal-900 text-white p-6 sm:p-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative max-w-2xl">
          <Badge tone="teal" className="bg-white/20 !text-white border border-white/20 mb-3">🩺 {t("appNameLong")}</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{t("tagline")}</h1>
          <p className="mt-2 text-teal-100 text-lg">{t("taglineFull")}</p>
          <p className="mt-3 text-teal-50 text-sm max-w-lg">{t("home.hero.sub")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/mcq"><Button size="lg" className="!bg-white !text-teal-700 hover:!bg-teal-50">{t("home.hero.cta")} →</Button></Link>
            <Link to="/opd"><Button size="lg" variant="ghost" className="!text-white hover:!bg-white/10">{t("nav.opd")}</Button></Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t("home.stats.mcqs")} value={mcqs.length} icon={<span>❓</span>} tone="teal" />
        <Stat label={t("home.stats.cases")} value={cases.length} icon={<span>📋</span>} tone="blue" />
        <Stat label={t("home.stats.opd")} value={opd.length} icon={<span>🩺</span>} tone="red" />
        <Stat label={t("home.stats.users")} value={Math.max(top.length, user ? 1 : 0)} icon={<span>👥</span>} tone="violet" />
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">{t("home.modules")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {modules.map((m) => (
            <Link to={m.to} key={m.to} className="group">
              <Card className="hover:shadow-md transition overflow-hidden h-full">
                <div className={`h-20 bg-gradient-to-br ${m.color} p-3 text-white flex items-start justify-between`}>
                  <span className="text-2xl">{m.icon}</span>
                  <span className="text-lg font-bold opacity-70 group-hover:opacity-100 flip-rtl">→</span>
                </div>
                <CardBody className="!p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.label}</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{m.title}</div>
                  {m.count > 0 && <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{m.count}</div>}
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">{t("common.subject")}</h2>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <Link key={s.id} to={`/search?subject=${s.id}`} className={`px-3 py-2 rounded-xl text-sm font-medium hover:shadow-sm transition ${s.color || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
              <span className="me-1.5">{s.icon}</span>{tr(s.name)}
            </Link>
          ))}
        </div>
      </div>

      {/* Two column: recent articles + leaderboard */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t("edu.title")}</h3>
            <Link to="/education" className="text-sm text-teal-700 dark:text-teal-400 hover:underline">{t("common.viewAll")}</Link>
          </div>
          <div className="p-2">
            {articles.slice(0, 4).map((a) => (
              <Link key={a.id} to="/education" className="block p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{new Date(a.createdAt).toLocaleDateString()}</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{tr(a.title)}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{tr(a.body)}</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">🏆 {t("home.leaderboardTop")}</h3>
            <Link to="/leaderboard" className="text-sm text-teal-700 dark:text-teal-400 hover:underline">{t("common.viewAll")}</Link>
          </div>
          <div className="p-2 space-y-1">
            {top.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400 p-3 text-center">{t("common.emptyState")}</div>}
            {top.map((e, i) => (
              <div key={e.userId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" : i === 1 ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" : "bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400"}`}>
                  {i + 1}
                </div>
                <Avatar name={e.username} src={e.photoURL} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{e.username}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{e.xp} XP · {e.accuracy}%</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
