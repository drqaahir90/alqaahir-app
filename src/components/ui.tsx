import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useEffect } from "react";
import { cn } from "@/utils/cn";
import { playSound } from "@/utils/sound";

// ─────────── Button ───────────
type BtnVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
type BtnSize = "sm" | "md" | "lg";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: BtnSize; loading?: boolean; icon?: ReactNode;
}
export function Button({ variant = "primary", size = "md", className, loading, icon, children, disabled, onClick, ...rest }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98]";
  const variants: Record<BtnVariant, string> = {
    primary:   "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500 shadow-sm",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-slate-300",
    ghost:     "bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
    outline:   "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800",
    danger:    "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
    success:   "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
  };
  const sizes: Record<BtnSize, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      onClick={(e) => { if (!disabled && !loading) playSound("click"); onClick?.(e); }}
      {...rest}
    >
      {loading ? (<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>) : icon}
      {children}
    </button>
  );
}

// ─────────── Card ───────────
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/70 dark:border-slate-800", className)}>{children}</div>;
}
export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}
export function CardHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-200/70 dark:border-slate-800">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

// ─────────── Input / Textarea / Select ───────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string; }
export function Input({ label, hint, error, className, ...rest }: InputProps) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>}
      <input {...rest} className={cn(
        "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition",
        error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20",
        className,
      )} />
      {error ? <span className="text-xs text-rose-600 dark:text-rose-400 mt-1 block">{error}</span> : hint ? <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">{hint}</span> : null}
    </label>
  );
}
interface TAProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string; }
export function Textarea({ label, error, className, ...rest }: TAProps) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>}
      <textarea {...rest} className={cn(
        "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition font-mono text-sm",
        error && "border-rose-400 focus:border-rose-500", className,
      )} />
      {error && <span className="text-xs text-rose-600 dark:text-rose-400 mt-1 block">{error}</span>}
    </label>
  );
}
interface SelProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; }
export function Select({ label, className, children, ...rest }: SelProps) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>}
      <select {...rest} className={cn("w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition", className)}>
        {children}
      </select>
    </label>
  );
}

// ─────────── Badge ───────────
type BadgeTone = "gray" | "green" | "red" | "amber" | "blue" | "violet" | "teal";
export function Badge({ children, tone = "gray", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  const tones: Record<BadgeTone, string> = {
    gray: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  };
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", tones[tone], className)}>{children}</span>;
}

// ─────────── Modal ───────────
export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up", sizes[size])}>
        {title && <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"><h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3><button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 text-2xl leading-none">×</button></div>}
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ─────────── EmptyState ───────────
export function EmptyState({ icon = "📭", title, subtitle, action }: { icon?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─────────── Stat ───────────
export function Stat({ label, value, icon, tone = "teal" }: { label: string; value: string | number; icon?: ReactNode; tone?: BadgeTone }) {
  const toneMap: Record<BadgeTone, string> = {
    teal: "from-teal-500 to-emerald-500",
    blue: "from-sky-500 to-indigo-500",
    violet: "from-violet-500 to-fuchsia-500",
    amber: "from-amber-500 to-orange-500",
    green: "from-green-500 to-emerald-500",
    red: "from-rose-500 to-red-500",
    gray: "from-slate-500 to-slate-700",
  };
  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        <div className={cn("h-11 w-11 rounded-xl text-white flex items-center justify-center bg-gradient-to-br shadow-sm shrink-0", toneMap[tone])}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</div>
        </div>
      </div>
    </Card>
  );
}

// ─────────── Skeleton ───────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse-soft bg-slate-200 dark:bg-slate-800 rounded-lg", className)} />;
}

// ─────────── Avatar ───────────
export function Avatar({
  name, src, size = 40, className,
}: { name?: string; src?: string; size?: number; className?: string }) {
  const initials = (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || "").join("") || "?";
  const dim = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        style={dim}
        className={cn("rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shrink-0", className)}
        onError={(e) => { (e.currentTarget.style.display = "none"); }}
      />
    );
  }
  return (
    <div
      style={{ ...dim, fontSize: size * 0.36 }}
      className={cn(
        "rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 grid place-items-center text-white font-bold uppercase select-none shrink-0",
        className,
      )}
    >{initials}</div>
  );
}

// ─────────── Toast host ───────────
import { useUIStore } from "@/stores";
export function ToastHost() {
  const toast = useUIStore((s) => s.toast);
  if (!toast) return null;
  const styles = {
    info: "bg-slate-900 text-white",
    success: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
  };
  return (
    <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-slide-up">
      <div className={cn("px-4 py-2 rounded-full shadow-lg text-sm font-medium", styles[toast.kind])}>{toast.msg}</div>
    </div>
  );
}
