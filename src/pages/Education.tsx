import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody, EmptyState, Input, Modal } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { useAuthStore, useUIStore } from "@/stores";
import { seedSubjects } from "@/data/seed";
import type { EducationArticle, Subject } from "@/types";

export default function EducationPage() {
  const { t, tr } = useI18n();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const [items, setItems] = useState<EducationArticle[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(seedSubjects);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<EducationArticle | null>(null);
  const [, setRerender] = useState(0);

  useEffect(() => {
    (async () => {
      await dbService.init();
      const all = await dbService.orderedList<EducationArticle>("educationArticles");
      // Only show published articles to users (or those with no status = published by default).
      setItems(all.filter((a) => !a.status || a.status === "published"));
      const subs = await dbService.list<Subject>("subjects"); if (subs.length) setSubjects(subs);
    })();
  }, []);

  const featured = useMemo(() => items.filter((a) => a.featured).slice(0, 3), [items]);
  const filtered = useMemo(() => items.filter((a) => {
    const okCat = cat === "all" || a.category === cat;
    if (!okCat) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return [tr(a.title), tr(a.body)].some((x) => x.toLowerCase().includes(s));
  }), [items, q, cat, tr]);

  const bookmarked = new Set(user?.bookmarks || []);
  async function toggleBm(id: string) {
    if (!user) return;
    const list = new Set(user.bookmarks || []);
    if (list.has(id)) { list.delete(id); showToast(t("common.removedBookmark")); }
    else { list.add(id); showToast("Bookmarked", "success"); }
    await dbService.update("users", user.uid, { bookmarks: Array.from(list) });
    user.bookmarks = Array.from(list);
    setRerender((n) => n + 1);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">📚 {t("edu.title")}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{filtered.length} / {items.length}</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Input placeholder={t("search.placeholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 outline-none focus:border-teal-500">
          <option value="all">{t("common.all")}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{tr(s.name)}</option>)}
        </select>
      </div>

      {featured.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">★ Featured</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {featured.map((a) => (
              <Card key={a.id} className="hover:shadow-md transition cursor-pointer" >
                {a.imageUrl && <img src={a.imageUrl} alt="" className="h-32 w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />}
                <CardBody>
                  <Badge tone="violet" className="mb-2">★ Featured</Badge>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">{tr(a.title)}</h3>
                  <Button size="sm" onClick={() => setOpen(a)} className="mt-2">{t("edu.readMore")} →</Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.length === 0 ? <div className="md:col-span-2"><EmptyState title={t("common.emptyState")} icon="📚" /></div> :
          filtered.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition">
              {a.imageUrl && <img src={a.imageUrl} alt="" className="h-40 w-full object-cover rounded-t-2xl" onError={(e) => (e.currentTarget.style.display = "none")} />}
              <CardBody>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Badge tone="teal">{tr(subjects.find((s) => s.id === a.category)?.name) || a.category}</Badge>
                    {a.featured && <Badge tone="violet">★</Badge>}
                  </div>
                  <button onClick={() => toggleBm(a.id)} className="text-xl" aria-label="Bookmark">
                    {bookmarked.has(a.id) ? "🔖" : "📑"}
                  </button>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{tr(a.title)}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{tr(a.summary) || tr(a.body)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                  <Button size="sm" variant="outline" onClick={() => setOpen(a)}>{t("edu.readMore")} →</Button>
                </div>
              </CardBody>
            </Card>
          ))}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? tr(open.title) : ""} size="lg">
        {open && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone="teal">{tr(subjects.find((s) => s.id === open.category)?.name) || open.category}</Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(open.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{tr(open.body)}</p>
            {open.references && open.references.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{t("common.reference")}</div>
                <ul className="list-disc ps-5 text-sm text-slate-600 dark:text-slate-400">
                  {open.references.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {user && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => toggleBm(open.id)}>
                  {bookmarked.has(open.id) ? `🔖 ${t("edu.bookmarked")}` : `📑 ${t("edu.bookmark")}`}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
