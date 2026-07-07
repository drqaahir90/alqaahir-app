import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Card, CardBody, EmptyState, Input, Select } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { seedSubjects } from "@/data/seed";
import type { CaseStudy, Difficulty, EducationArticle, MCQ, OPDCase, Subject } from "@/types";

type Res = { type: "mcq" | "case" | "opd" | "article"; id: string; title: string; sub: string; meta: string };

export default function SearchPage() {
  const { t, tr } = useI18n();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [type, setType] = useState<"all" | Res["type"]>("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [subject, setSubject] = useState<string>(params.get("subject") || "all");
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [opd, setOpd] = useState<OPDCase[]>([]);
  const [arts, setArts] = useState<EducationArticle[]>([]);
  const [subs, setSubs] = useState<Subject[]>(seedSubjects);

  useEffect(() => {
    (async () => {
      await dbService.init();
      setMcqs(await dbService.list("mcqs"));
      setCases(await dbService.list("caseStudies"));
      setOpd(await dbService.list("opdCases"));
      setArts(await dbService.list("educationArticles"));
      const s = await dbService.list<Subject>("subjects"); if (s.length) setSubs(s);
    })();
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(params);
    if (q) p.set("q", q); else p.delete("q");
    if (subject !== "all") p.set("subject", subject); else p.delete("subject");
    setParams(p, { replace: true });
     
  }, [q, subject]);

  const results = useMemo<Res[]>(() => {
    const s = q.trim().toLowerCase();
    const items: Res[] = [];
    const matchSub = (x: { subjectId: string }) => subject === "all" || x.subjectId === subject;
    const matchDif = (x: { difficulty: Difficulty }) => difficulty === "all" || x.difficulty === difficulty;
    const match = (txt: string) => !s || txt.toLowerCase().includes(s);

    if (type === "all" || type === "mcq") {
      for (const m of mcqs) {
        if (matchSub(m) && matchDif(m) && (match(tr(m.question)) || match(tr(m.explanation)))) {
          items.push({ type: "mcq", id: m.id, title: tr(m.question), sub: t(`common.${m.difficulty}`), meta: tr(subs.find((x) => x.id === m.subjectId)?.name) });
        }
      }
    }
    if (type === "all" || type === "case") {
      for (const c of cases) {
        if (matchSub(c) && matchDif(c) && (match(tr(c.title)) || match(tr(c.summary)))) {
          items.push({ type: "case", id: c.id, title: tr(c.title), sub: tr(c.summary), meta: tr(subs.find((x) => x.id === c.subjectId)?.name) });
        }
      }
    }
    if (type === "all" || type === "opd") {
      for (const o of opd) {
        // Neutral title first, but only search chief complaint (never the diagnosis)
        const displayTitle = tr(o.title) || tr(o.chiefComplaint);
        if (matchSub(o) && matchDif(o) && (match(tr(o.chiefComplaint)) || match(displayTitle))) {
          items.push({ type: "opd", id: o.id, title: displayTitle, sub: tr(o.chiefComplaint), meta: tr(subs.find((x) => x.id === o.subjectId)?.name) });
        }
      }
    }
    if (type === "all" || type === "article") {
      for (const a of arts) {
        const okSub = subject === "all" || a.category === subject;
        if (okSub && (match(tr(a.title)) || match(tr(a.body)))) {
          items.push({ type: "article", id: a.id, title: tr(a.title), sub: tr(a.body).slice(0, 140), meta: tr(subs.find((x) => x.id === a.category)?.name) || a.category });
        }
      }
    }
    return items;
  }, [q, type, difficulty, subject, mcqs, cases, opd, arts, subs, tr, t]);

  return (
    <div className="space-y-5 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">🔍 {t("search.title")}</h1>
      </header>
      <Card>
        <CardBody className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-4"><Input placeholder={t("search.placeholder")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value as Res["type"] | "all")}>
            <option value="all">{t("common.all")}</option>
            <option value="mcq">MCQ</option>
            <option value="case">Case</option>
            <option value="opd">OPD</option>
            <option value="article">Article</option>
          </Select>
          <Select label={t("common.difficulty")} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}>
            <option value="all">{t("common.all")}</option>
            <option value="easy">{t("common.easy")}</option>
            <option value="medium">{t("common.medium")}</option>
            <option value="hard">{t("common.hard")}</option>
          </Select>
          <Select label={t("common.subject")} value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="all">{t("common.all")}</option>
            {subs.map((s) => <option key={s.id} value={s.id}>{tr(s.name)}</option>)}
          </Select>
        </CardBody>
      </Card>

      <div className="text-sm text-slate-500 dark:text-slate-400">{results.length} results</div>
      <div className="space-y-2">
        {results.length === 0 ? <EmptyState title={t("search.noResults")} icon="🔎" /> :
          results.map((r) => (
            <Card key={`${r.type}_${r.id}`} className="hover:shadow-sm">
              <CardBody>
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={r.type === "mcq" ? "teal" : r.type === "case" ? "blue" : r.type === "opd" ? "red" : "amber"}>{r.type.toUpperCase()}</Badge>
                  <Badge tone="gray">{r.meta}</Badge>
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{r.title}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{r.sub}</div>
              </CardBody>
            </Card>
          ))}
      </div>
    </div>
  );
}
