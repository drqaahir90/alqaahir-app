import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, CardBody, Modal, Select } from "@/components/ui";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import { useAuthStore, useUIStore } from "@/stores";
import { seedSubjects } from "@/data/seed";
import type { LabResult, LocalizedText, MCQOption, MediaAsset, OPDCase, QuizResult, Subject } from "@/types";
import { cn } from "@/utils/cn";
import { playSound } from "@/utils/sound";
import { useLearningSession } from "@/hooks/useLearningSession";
import { computeOpdXp, type XpBreakdown } from "@/services/xp";
import { XpBreakdownCard } from "@/components/XpBreakdown";

// Deterministic shuffle
function shuffle<T>(arr: T[], seed = 1): T[] {
  const a = [...arr];
  let m = a.length, i, s = seed;
  while (m) { s = (s * 9301 + 49297) % 233280; i = Math.floor((s / 233280) * m--); [a[m], a[i]] = [a[i], a[m]]; }
  return a;
}
function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function safeText(t: LocalizedText | undefined): boolean {
  return !!t && typeof t === "object" && !!(t.en || t.ar || t.so);
}

function buildDxOptions(c: OPDCase, allCases: OPDCase[]): { options: MCQOption[]; correctId: string } {
  if (c.diagnosisOptions && c.diagnosisCorrectId) return { options: c.diagnosisOptions, correctId: c.diagnosisCorrectId };
  const correct: MCQOption = { id: "correct", text: c.correctDiagnosis };
  const distractors: MCQOption[] = [];
  (c.differentials || []).forEach((d, i) => distractors.push({ id: `d${i}`, text: d }));
  const others = allCases.filter((x) => x.id !== c.id).map((x) => x.correctDiagnosis);
  while (distractors.length < 3 && others.length) { const p = others.shift(); if (p) distractors.push({ id: `o${distractors.length}`, text: p }); }
  const shuffled = shuffle([correct, ...distractors.slice(0, 3)], c.createdAt);
  const withIds = shuffled.map((o, i) => ({ ...o, id: String.fromCharCode(97 + i) }));
  const correctId = withIds.find((o) => o.text === c.correctDiagnosis)?.id || withIds[0].id;
  return { options: withIds, correctId };
}
function buildMgmtOptions(c: OPDCase, allCases: OPDCase[]): { options: MCQOption[]; correctId: string } {
  if (c.managementOptions && c.managementCorrectId) return { options: c.managementOptions, correctId: c.managementCorrectId };
  const correct: MCQOption = { id: "correct", text: c.correctManagement };
  const distractors: MCQOption[] = [];
  const others = allCases.filter((x) => x.id !== c.id).map((x) => x.correctManagement);
  while (distractors.length < 3 && others.length) { const p = others.shift(); if (p) distractors.push({ id: `o${distractors.length}`, text: p }); }
  const shuffled = shuffle([correct, ...distractors.slice(0, 3)], c.createdAt + 1);
  const withIds = shuffled.map((o, i) => ({ ...o, id: String.fromCharCode(97 + i) }));
  const correctId = withIds.find((o) => o.text === c.correctManagement)?.id || withIds[0].id;
  return { options: withIds, correctId };
}

type OPDStep = "info" | "assessment" | "dx" | "mgmt" | "result";
const STEP_ORDER: OPDStep[] = ["info", "assessment", "dx", "mgmt", "result"];

const COLOR_GUIDE_KEY = "medacad.opd.colorGuideSeen";

export default function OPDPage() {
  return (
    <ErrorBoundary label="OPD Simulator">
      <OPDPageInner />
    </ErrorBoundary>
  );
}

interface OPDSessionState {
  caseId: string;
  step: OPDStep;
  dxAns: string | null;
  mgmtAns: string | null;
}

function OPDPageInner() {
  const { t, tr } = useI18n();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const [items, setItems] = useState<OPDCase[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(seedSubjects);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [current, setCurrent] = useState<OPDCase | null>(null);
  const [step, setStep] = useState<OPDStep>("info");
  const [dxAns, setDxAns] = useState<string | null>(null);
  const [mgmtAns, setMgmtAns] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [xpBreakdown, setXpBreakdown] = useState<XpBreakdown | null>(null);
  const [previousXp, setPreviousXp] = useState<number>(user?.xp || 0);

  // Resume support — one active OPD session per user
  const sessionKey = `opd:${user?.uid || "anon"}`;
  const { resumed, scheduleSave, clear: clearSession } = useLearningSession<OPDSessionState>({
    id: sessionKey, kind: "opd", userId: user?.uid || "anon",
  });
  const hydratedRef = useRef(false);

  // Hydrate once items are loaded
  useEffect(() => {
    if (hydratedRef.current || !resumed || items.length === 0) return;
    const c = items.find((x) => x.id === resumed.caseId);
    if (c) {
      setCurrent(c);
      setStep(resumed.step);
      setDxAns(resumed.dxAns);
      setMgmtAns(resumed.mgmtAns);
    }
    hydratedRef.current = true;
  }, [resumed, items]);

  // Persist on any change (only when a case is active and not yet at result)
  useEffect(() => {
    if (!current || step === "result") return;
    scheduleSave({ caseId: current.id, step, dxAns, mgmtAns });
  }, [current, step, dxAns, mgmtAns, scheduleSave]);

  // Clear session when the result step is submitted
  useEffect(() => {
    if (step === "result" && saved) void clearSession();
  }, [step, saved, clearSession]);

  useEffect(() => {
    (async () => {
      await dbService.init();
      const list = await dbService.list<OPDCase>("opdCases");
      setItems(list);
      const subs = await dbService.list<Subject>("subjects"); if (subs.length) setSubjects(subs);
    })();
  }, []);

  // Group cases by specialty for the browser view
  const bySpecialty = useMemo(() => {
    const map = new Map<string, OPDCase[]>();
    for (const c of items) {
      const key = c.subjectId || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [items]);

  const filteredList = useMemo(() => {
    return selectedSubject === "all" ? items : items.filter((c) => c.subjectId === selectedSubject);
  }, [items, selectedSubject]);

  function generateFrom(list: OPDCase[]) {
    if (!list.length) return;
    // Show the color guide the first time
    const seen = localStorage.getItem(COLOR_GUIDE_KEY);
    if (!seen) {
      setGuideOpen(true);
      localStorage.setItem(COLOR_GUIDE_KEY, "1");
    }
    setCurrent(pickRandom(list));
    setStep("info"); setDxAns(null); setMgmtAns(null); setSaved(false);
  }

  function openCase(c: OPDCase) {
    const seen = localStorage.getItem(COLOR_GUIDE_KEY);
    if (!seen) { setGuideOpen(true); localStorage.setItem(COLOR_GUIDE_KEY, "1"); }
    setCurrent(c); setStep("info"); setDxAns(null); setMgmtAns(null); setSaved(false);
  }

  const dxData = useMemo(() => current ? buildDxOptions(current, items) : null, [current, items]);
  const mgmtData = useMemo(() => current ? buildMgmtOptions(current, items) : null, [current, items]);

  useEffect(() => {
    if (!current || !user || step !== "result" || saved || !dxData || !mgmtData) return;
    (async () => {
      const dxCorrect = dxAns === dxData.correctId ? 1 : 0;
      const mgmtCorrect = mgmtAns === mgmtData.correctId ? 1 : 0;
      const score = dxCorrect + mgmtCorrect;
      const bd = computeOpdXp({
        dxCorrect: dxCorrect === 1, mgmtCorrect: mgmtCorrect === 1,
        difficulty: current.difficulty, streakDays: user.streak || 0,
      });
      setPreviousXp(user.xp || 0);
      setXpBreakdown(bd);
      await dbService.add<Omit<QuizResult, "id">>("quizResults", {
        userId: user.uid, username: user.username, type: "opd",
        refIds: [current.id], score, total: 2, durationSec: 0, createdAt: Date.now(),
        subjectId: current.subjectId, difficulty: current.difficulty,
      });
      await dbService.update("users", user.uid, { xp: (user.xp || 0) + bd.total });
      showToast(`+${bd.total} XP`, "success");
      playSound("opdComplete");
      setSaved(true);
    })();
     
  }, [step, current, user, dxData, mgmtData, dxAns, mgmtAns, saved]);

  // ─── Case active view ──────────────────────────────
  if (current) {
    const subjName = tr(subjects.find((s) => s.id === current.subjectId)?.name);
    const stepIdx = STEP_ORDER.indexOf(step);
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
        <ColorGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge tone="teal">🩺 OPD</Badge>
              <Badge tone="blue">{subjName || current.subjectId}</Badge>
              <Badge tone={current.difficulty === "easy" ? "green" : current.difficulty === "medium" ? "amber" : "red"}>{t(`common.${current.difficulty}`)}</Badge>
              <button onClick={() => setGuideOpen(true)} className="text-xs text-teal-700 dark:text-teal-400 hover:underline">🎨 Color guide</button>
            </div>
            {safeText(current.title) && (
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{tr(current.title)}</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCurrent(null)}>← Back</Button>
            <Button size="sm" onClick={() => generateFrom(filteredList)}>🔄 {t("opd.newPatient")}</Button>
          </div>
        </div>

        <Stepper current={stepIdx} labels={[t("opd.step.info"), t("opd.step.assessment"), t("opd.step.dx"), t("opd.step.mgmt"), t("opd.step.result")]} />

        {step === "info"       && <InfoStep       c={current} onNext={() => setStep("assessment")} />}
        {step === "assessment" && <AssessmentStep c={current} onPrev={() => setStep("info")} onNext={() => setStep("dx")} />}
        {step === "dx" && dxData && (
          <MCQStep title={t("opd.selectDiagnosis")} options={dxData.options} value={dxAns} onChange={setDxAns}
                   onPrev={() => setStep("assessment")} onNext={() => setStep("mgmt")} nextLabel={t("opd.next")} />
        )}
        {step === "mgmt" && mgmtData && (
          <MCQStep title={t("opd.selectManagement")} options={mgmtData.options} value={mgmtAns} onChange={setMgmtAns}
                   onPrev={() => setStep("dx")} onNext={() => setStep("result")} nextLabel={t("opd.evaluate")} submitVariant />
        )}
        {step === "result" && dxData && mgmtData && (
          <>
            <ResultStep c={current} dxData={dxData} dxAns={dxAns} mgmtData={mgmtData} mgmtAns={mgmtAns}
                        onRetry={() => { setStep("info"); setDxAns(null); setMgmtAns(null); setSaved(false); setXpBreakdown(null); }}
                        onNew={() => { generateFrom(filteredList); setXpBreakdown(null); }} />
            {xpBreakdown && <XpBreakdownCard breakdown={xpBreakdown} previousXp={previousXp} />}
          </>
        )}
      </div>
    );
  }

  // ─── Specialty browser ──────────────────────────────
  const specialties = subjects.filter((s) => bySpecialty.has(s.id));
  return (
    <div className="space-y-5 animate-fade-in">
      <ColorGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">🩺 {t("opd.title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Organized by clinical specialty. Choose a specialty or open a case to begin.
        </p>
      </header>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <Select label={t("opd.filterSpecialty")} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
          <option value="all">All specialties ({items.length})</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>{tr(s.name)} ({bySpecialty.get(s.id)?.length || 0})</option>
          ))}
        </Select>
        <Button variant="outline" onClick={() => setGuideOpen(true)}>🎨 Color guide</Button>
        <Button size="lg" onClick={() => generateFrom(filteredList)} disabled={!filteredList.length}>🎲 {t("opd.generate")}</Button>
      </div>

      {/* Specialty groups */}
      {selectedSubject === "all" ? (
        <div className="space-y-4">
          {specialties.length === 0 && <Card><CardBody className="text-center py-8 text-slate-500">No OPD cases available.</CardBody></Card>}
          {specialties.map((s) => {
            const cases = bySpecialty.get(s.id) || [];
            return (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="text-lg">{s.icon}</span>
                    {tr(s.name)}
                    <Badge tone="gray">{cases.length}</Badge>
                  </h2>
                  <Button size="sm" variant="ghost" onClick={() => generateFrom(cases)}>🎲 Random</Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cases.map((c) => <CaseCard key={c.id} c={c} onOpen={() => openCase(c)} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredList.map((c) => <CaseCard key={c.id} c={c} onOpen={() => openCase(c)} />)}
          {filteredList.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Card><CardBody className="text-center py-8 text-slate-500">{t("opd.noCasesSpec")}</CardBody></Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Case card in the browser ───
function CaseCard({ c, onOpen }: { c: OPDCase; onOpen: () => void }) {
  const { t, tr } = useI18n();
  const title = safeText(c.title) ? tr(c.title) : tr(c.chiefComplaint);
  return (
    <Card className="hover:shadow-md transition cursor-pointer" >
      <CardBody className="flex flex-col h-full" >
        <div className="flex items-start gap-2 mb-2">
          <Badge tone={c.difficulty === "easy" ? "green" : c.difficulty === "medium" ? "amber" : "red"}>{t(`common.${c.difficulty}`)}</Badge>
          {(c.labs?.length || c.imaging?.length) && <Badge tone="blue">🧪 Rich</Badge>}
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{tr(c.chiefComplaint)}</p>
        <div className="mt-auto pt-3">
          <Button size="sm" className="w-full" onClick={onOpen}>▶ {t("cases.start")}</Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Stepper ───
function Stepper({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className={cn("h-7 w-7 rounded-full grid place-items-center text-xs font-bold",
            i < current ? "bg-emerald-500 text-white" :
            i === current ? "bg-teal-600 text-white ring-4 ring-teal-500/20" :
            "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
          )}>{i < current ? "✓" : i + 1}</div>
          <span className={cn("text-xs sm:text-sm hidden sm:inline", i === current ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}>{l}</span>
          {i < labels.length - 1 && <div className={cn("w-4 sm:w-8 h-0.5", i < current ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")} />}
        </div>
      ))}
    </div>
  );
}

// ─── Info step (rich profile + history) ───
function InfoStep({ c, onNext }: { c: OPDCase; onNext: () => void }) {
  const { t, tr } = useI18n();
  const profile = c.patientProfile;

  const sections: { title: string; icon: string; text?: LocalizedText }[] = [
    { title: t("opd.chiefComplaint"), icon: "📢", text: c.chiefComplaint },
    { title: "History of Present Illness", icon: "📖", text: c.historyPresentIllness || c.history },
    { title: "Past Medical History", icon: "📋", text: c.pastMedical },
    { title: "Past Surgical History", icon: "🔪", text: c.pastSurgical },
    { title: "Medications", icon: "💊", text: c.medications },
    { title: "Allergies", icon: "⚠️", text: c.allergies },
    { title: "Family History", icon: "👨‍👩‍👧", text: c.familyHistory },
    { title: "Social History", icon: "🚬", text: c.socialHistory },
    { title: "Risk Factors", icon: "⚡", text: c.riskFactors },
    { title: "Review of Systems", icon: "🩺", text: c.reviewOfSystems },
  ];

  return (
    <>
      {profile && (
        <Card>
          <CardBody className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {profile.age !== undefined && <div><span className="text-slate-500 dark:text-slate-400">Age:</span> <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.age}</span></div>}
            {profile.sex && <div><span className="text-slate-500 dark:text-slate-400">Sex:</span> <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.sex === "M" ? "Male" : "Female"}</span></div>}
            {safeText(profile.occupation) && <div><span className="text-slate-500 dark:text-slate-400">Occupation:</span> <span className="font-semibold text-slate-800 dark:text-slate-100">{tr(profile.occupation)}</span></div>}
            {safeText(profile.ethnicity) && <div><span className="text-slate-500 dark:text-slate-400">Ethnicity:</span> <span className="font-semibold text-slate-800 dark:text-slate-100">{tr(profile.ethnicity)}</span></div>}
          </CardBody>
        </Card>
      )}

      {sections.filter((s) => safeText(s.text)).map((s) => (
        <Card key={s.title}>
          <CardBody>
            <div className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>{s.icon}</span> {s.title}
            </div>
            <p className="mt-1 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{tr(s.text)}</p>
          </CardBody>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button size="lg" onClick={onNext}>{t("opd.next")} →</Button>
      </div>
    </>
  );
}

// ─── Vital sign color coding ───
type VColor = "green" | "amber" | "orange" | "red";
function vitalTone(kind: "hr" | "rr" | "temp" | "spo2" | "bp", value: number | string): VColor {
  if (kind === "hr")   { const v = Number(value); if (v < 40 || v > 140) return "red"; if (v < 50 || v > 120) return "orange"; if (v < 60 || v > 100) return "amber"; return "green"; }
  if (kind === "rr")   { const v = Number(value); if (v < 8 || v > 30) return "red"; if (v > 24) return "orange"; if (v > 20 || v < 12) return "amber"; return "green"; }
  if (kind === "temp") { const v = Number(value); if (v >= 39.5 || v < 35) return "red"; if (v >= 38.5) return "orange"; if (v >= 37.5) return "amber"; return "green"; }
  if (kind === "spo2") { const v = Number(value); if (v < 90) return "red"; if (v < 93) return "orange"; if (v < 95) return "amber"; return "green"; }
  if (kind === "bp") { const s = String(value); const sys = Number(s.split("/")[0]); if (!isFinite(sys)) return "green"; if (sys >= 180 || sys < 90) return "red"; if (sys >= 160 || sys < 100) return "orange"; if (sys >= 140) return "amber"; return "green"; }
  return "green";
}


// ─── Assessment step (rich exam + labs + imaging) ───
function AssessmentStep({ c, onPrev, onNext }: { c: OPDCase; onPrev: () => void; onNext: () => void }) {
  const { t, tr } = useI18n();
  const [showLegend, setShowLegend] = useState(false);
  const hrT = vitalTone("hr", c.vitals.hr);
  const rrT = vitalTone("rr", c.vitals.rr);
  const tpT = vitalTone("temp", c.vitals.temp);
  const spT = vitalTone("spo2", c.vitals.spo2);
  const bpT = vitalTone("bp", c.vitals.bp);

  const sections: { title: string; icon: string; text?: LocalizedText }[] = [
    { title: "General Examination", icon: "👤", text: c.generalExam },
    { title: "Systemic Examination", icon: "🔍", text: c.systemicExam || c.examFindings },
    { title: "Positive Findings", icon: "✅", text: c.positiveFindings },
    { title: "Negative Findings", icon: "❌", text: c.negativeFindings },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t("opd.vitals")}</h3>
        <button onClick={() => setShowLegend((v) => !v)} className="text-xs text-teal-700 dark:text-teal-400 hover:underline">
          {showLegend ? "Hide" : "Show"} color legend
        </button>
      </div>
      {showLegend && <InlineColorLegend />}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <TonedStat label={t("opd.hr")}   value={c.vitals.hr}         icon="❤️"  tone={hrT} />
        <TonedStat label={t("opd.bp")}   value={c.vitals.bp}         icon="🩸"  tone={bpT} />
        <TonedStat label={t("opd.rr")}   value={c.vitals.rr}         icon="🌬️" tone={rrT} />
        <TonedStat label={t("opd.temp")} value={`${c.vitals.temp}°`} icon="🌡️" tone={tpT} />
        <TonedStat label={t("opd.spo2")} value={`${c.vitals.spo2}%`} icon="💨"  tone={spT} />
      </div>

      {sections.filter((s) => safeText(s.text)).map((s) => (
        <Card key={s.title}>
          <CardBody>
            <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>{s.icon}</span> {s.title}
            </div>
            <p className="mt-1 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{tr(s.text)}</p>
          </CardBody>
        </Card>
      ))}

      {c.labs && c.labs.length > 0 && <LabsTable labs={c.labs} />}
      {c.ecg && <MediaCard title="🫀 ECG" asset={c.ecg} />}
      {c.imaging && c.imaging.length > 0 && (
        <div className="space-y-2">
          {c.imaging.map((m, i) => <MediaCard key={i} title={m.type ? `📷 ${m.type.toUpperCase()}` : "📷 Imaging"} asset={m} />)}
        </div>
      )}
      {c.clinicalImages && c.clinicalImages.length > 0 && (
        <div className="space-y-2">
          {c.clinicalImages.map((m, i) => <MediaCard key={i} title="🏥 Clinical image" asset={m} />)}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onPrev}>← {t("common.previous")}</Button>
        <Button size="lg" onClick={onNext}>{t("opd.next")} →</Button>
      </div>
    </>
  );
}

function TonedStat({ label, value, icon, tone }: { label: string; value: string | number; icon: string; tone: VColor }) {
  const color = { green: "from-emerald-500 to-green-600", amber: "from-amber-500 to-yellow-500", orange: "from-orange-500 to-orange-600", red: "from-rose-500 to-red-600" }[tone];
  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div className={cn("h-11 w-11 rounded-xl text-white grid place-items-center bg-gradient-to-br shadow-sm shrink-0", color)}>{icon}</div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">{label}</div>
        </div>
      </div>
    </Card>
  );
}

// ─── Labs table ───
function LabsTable({ labs }: { labs: LabResult[] }) {
  const flagColor: Record<string, string> = {
    normal: "text-emerald-600 dark:text-emerald-400",
    low:    "text-sky-600 dark:text-sky-400",
    high:   "text-amber-600 dark:text-amber-400",
    critical: "text-rose-600 dark:text-rose-400",
  };
  return (
    <Card>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100">🧪 Laboratory Results</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 text-start">Test</th>
              <th className="px-3 py-2 text-start">Value</th>
              <th className="px-3 py-2 text-start">Ref</th>
              <th className="px-3 py-2 text-start">Flag</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-300">
            {labs.map((l, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{l.name}</td>
                <td className="px-3 py-2">{l.value} <span className="text-slate-500">{l.unit || ""}</span></td>
                <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{l.ref || "—"}</td>
                <td className={cn("px-3 py-2 text-xs font-semibold uppercase", flagColor[l.flag || "normal"])}>{l.flag || "normal"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Media card (imaging, ECG, clinical photo) ───
function MediaCard({ title, asset }: { title: string; asset: MediaAsset }) {
  const { t, tr } = useI18n();
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-2">{title}</div>
        {asset.url ? (
          <img src={asset.url} alt={safeText(asset.title) ? tr(asset.title) : title} className="rounded-xl w-full max-h-80 object-contain bg-slate-100 dark:bg-slate-800" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="text-sm text-slate-500 dark:text-slate-400">{t("opd.noImage")}</div>
        )}
        {safeText(asset.caption) && <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{tr(asset.caption)}</div>}
      </CardBody>
    </Card>
  );
}

// ─── MCQ step ───
function MCQStep({ title, options, value, onChange, onPrev, onNext, nextLabel, submitVariant }: {
  title: string; options: MCQOption[]; value: string | null; onChange: (id: string) => void;
  onPrev: () => void; onNext: () => void; nextLabel: string; submitVariant?: boolean;
}) {
  const { t, tr } = useI18n();
  return (
    <Card>
      <CardBody>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg mb-4">{title}</h3>
        <div className="space-y-2">
          {options.map((o) => {
            const isSel = value === o.id;
            return (
              <button key={o.id} onClick={() => onChange(o.id)}
                className={cn("w-full text-start px-4 py-3 rounded-xl border-2 transition-all",
                  isSel ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-slate-900 dark:text-teal-100"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/40 dark:hover:bg-teal-900/20")}>
                <div className="flex items-center gap-3">
                  <span className={cn("h-6 w-6 rounded-full border-2 grid place-items-center text-xs font-bold shrink-0",
                    isSel ? "border-teal-500 bg-teal-500 text-white" : "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400")}>{o.id.toUpperCase()}</span>
                  <span className="flex-1 text-sm sm:text-base">{tr(o.text)}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" onClick={onPrev}>← {t("common.previous")}</Button>
          <Button size="lg" variant={submitVariant ? "success" : "primary"} disabled={!value} onClick={onNext}>
            {nextLabel}{!submitVariant && " →"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Result step ───
function ResultStep({ c, dxData, dxAns, mgmtData, mgmtAns, onRetry, onNew }: {
  c: OPDCase; dxData: { options: MCQOption[]; correctId: string }; dxAns: string | null;
  mgmtData: { options: MCQOption[]; correctId: string }; mgmtAns: string | null;
  onRetry: () => void; onNew: () => void;
}) {
  const { t, tr } = useI18n();
  const dxRight = dxAns === dxData.correctId;
  const mgmtRight = mgmtAns === mgmtData.correctId;
  const score = (dxRight ? 1 : 0) + (mgmtRight ? 1 : 0);
  const pct = Math.round((score / 2) * 100);

  useEffect(() => { playSound(score === 2 ? "achievement" : score === 1 ? "correct" : "wrong");  }, []);

  return (
    <>
      <Card>
        <CardBody className="text-center py-8">
          <div className="text-6xl mb-2">{score === 2 ? "🏆" : score === 1 ? "👍" : "📚"}</div>
          <div className="text-4xl font-bold text-teal-600 dark:text-teal-400">{pct}%</div>
          <div className="text-slate-500 dark:text-slate-400 mt-1">{score} / 2</div>
        </CardBody>
      </Card>
      <ResultRow label={t("opd.diagnosis")} userChoice={dxData.options.find((o) => o.id === dxAns)} correct={dxData.options.find((o) => o.id === dxData.correctId)} isRight={dxRight} />
      <ResultRow label={t("opd.management")} userChoice={mgmtData.options.find((o) => o.id === mgmtAns)} correct={mgmtData.options.find((o) => o.id === mgmtData.correctId)} isRight={mgmtRight} />

      {safeText(c.explanation) && (
        <Card><CardBody>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">💡 {t("common.explanation")}</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{tr(c.explanation)}</p>
        </CardBody></Card>
      )}
      {c.learningPoints && c.learningPoints.length > 0 && (
        <Card><CardBody>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">🎓 Learning points</h3>
          <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300 list-disc ps-5">
            {c.learningPoints.map((lp, i) => <li key={i}>{tr(lp)}</li>)}
          </ul>
        </CardBody></Card>
      )}
      {safeText(c.followUp) && (
        <Card><CardBody>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">📅 Follow-up</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">{tr(c.followUp)}</p>
        </CardBody></Card>
      )}
      {c.differentials && c.differentials.length > 0 && (
        <Card><CardBody>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">🔎 {t("opd.differential")}</h3>
          <div className="flex flex-wrap gap-1.5">{c.differentials.map((d, i) => <Badge key={i} tone="gray">{tr(d)}</Badge>)}</div>
        </CardBody></Card>
      )}
      {c.references && c.references.length > 0 && (
        <Card><CardBody>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">📖 References</h3>
          <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc ps-5">{c.references.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </CardBody></Card>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onRetry}>{t("common.retry")}</Button>
        <Button onClick={onNew}>{t("opd.newPatient")} →</Button>
      </div>
    </>
  );
}

function ResultRow({ label, userChoice, correct, isRight }: { label: string; userChoice?: MCQOption; correct?: MCQOption; isRight: boolean }) {
  const { t, tr } = useI18n();
  return (
    <Card><CardBody>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">{label}</div>
        <Badge tone={isRight ? "green" : "red"}>{isRight ? "✓ " + t("common.correct") : "✕ " + t("common.incorrect")}</Badge>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className={cn("px-3 py-2 rounded-lg border", isRight
          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
          : "border-rose-400 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200")}>
          <span className="text-xs font-semibold uppercase me-2 opacity-70">Your answer:</span>
          {userChoice ? tr(userChoice.text) : "—"}
        </div>
        {!isRight && correct && (
          <div className="px-3 py-2 rounded-lg border border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
            <span className="text-xs font-semibold uppercase me-2 opacity-70">Correct:</span>
            {tr(correct.text)}
          </div>
        )}
      </div>
    </CardBody></Card>
  );
}

// ─── Color guide modal + inline legend ───
function ColorGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={`🎨 ${t("opd.colorGuide.title")}`} size="md">
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">{t("opd.colorGuide.intro")}</p>
        <ColorRow color="green"  label={t("opd.legend.normal")}   desc={t("opd.colorGuide.green")} />
        <ColorRow color="amber"  label={t("opd.legend.mild")}     desc={t("opd.colorGuide.yellow")} />
        <ColorRow color="orange" label={t("opd.legend.moderate")} desc={t("opd.colorGuide.orange")} />
        <ColorRow color="red"    label={t("opd.legend.critical")} desc={t("opd.colorGuide.red")} />
        <div className="pt-2 flex justify-end">
          <Button onClick={onClose}>{t("opd.colorGuide.ack")}</Button>
        </div>
      </div>
    </Modal>
  );
}
function InlineColorLegend() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 animate-fade-in">
      <ColorRow color="green"  label="Normal"   compact />
      <ColorRow color="amber"  label="Mild"     compact />
      <ColorRow color="orange" label="Moderate" compact />
      <ColorRow color="red"    label="Critical" compact />
    </div>
  );
}
function ColorRow({ color, label, desc, compact }: { color: VColor; label: string; desc?: string; compact?: boolean }) {
  const bg = { green: "bg-emerald-500", amber: "bg-amber-500", orange: "bg-orange-500", red: "bg-rose-500" }[color];
  return (
    <div className={cn("flex items-center gap-3 rounded-xl p-2", compact ? "bg-slate-50 dark:bg-slate-800/60" : "border border-slate-200 dark:border-slate-800")}>
      <span className={cn("h-6 w-6 rounded-full", bg)} />
      <div>
        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">{label}</div>
        {desc && <div className="text-xs text-slate-500 dark:text-slate-400">{desc}</div>}
      </div>
    </div>
  );
}
