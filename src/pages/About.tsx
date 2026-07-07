import { useEffect, useState } from "react";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dbService } from "@/services/db";
import type { AboutBlock, AboutSettings } from "@/types";

/**
 * Public About Us page — /about
 *
 * Renders published About blocks in order, followed by contact info and
 * social links. Content is fully managed from Admin → About Us Manager.
 */
export default function AboutPage() {
  const { t, tr } = useI18n();
  const [blocks, setBlocks] = useState<AboutBlock[]>([]);
  const [settings, setSettings] = useState<AboutSettings | null>(null);

  useEffect(() => {
    (async () => {
      const list = await dbService.list<AboutBlock>("aboutBlocks");
      setBlocks(list.filter((b) => b.published !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      const s = await dbService.get<AboutSettings & { id: string }>("aboutSettings", "main");
      setSettings(s);
    })();
  }, []);

  const hasContact = settings?.contactEmail || settings?.contactPhone || settings?.contactAddress || settings?.contactWebsite;
  const hasSocial = settings?.facebook || settings?.twitter || settings?.instagram || settings?.linkedin || settings?.youtube || settings?.whatsapp;

  if (blocks.length === 0 && !settings) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <EmptyState title={t("about.empty")} icon="ℹ️" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <header className="text-center py-6">
        {settings?.orgLogo && (
          <img src={settings.orgLogo} alt="" className="mx-auto h-20 object-contain mb-3"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        )}
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {settings?.orgName ? tr(settings.orgName) : t("about.title")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t("about.subtitle")}</p>
      </header>

      {/* Blocks */}
      {blocks.map((b) => <BlockView key={b.id} block={b} />)}

      {/* Fallback contact from settings if no contact block */}
      {hasContact && !blocks.some((b) => b.type === "contact") && settings && (
        <ContactCard
          title={t("about.contact")}
          email={settings.contactEmail} phone={settings.contactPhone}
          website={settings.contactWebsite} address={settings.contactAddress}
        />
      )}

      {/* Fallback social from settings if no social block */}
      {hasSocial && !blocks.some((b) => b.type === "social") && settings && (
        <SocialCard title={t("about.social")} s={settings} />
      )}
    </div>
  );
}

function BlockView({ block }: { block: AboutBlock }) {
  const { tr } = useI18n();
  switch (block.type) {
    case "hero":
      return (
        <Card className="overflow-hidden">
          {block.imageUrl && (
            <img src={block.imageUrl} alt="" className="w-full max-h-64 object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          )}
          <CardBody className="text-center">
            {block.title && <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tr(block.title)}</h2>}
            {block.body && <p className="mt-2 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{tr(block.body)}</p>}
          </CardBody>
        </Card>
      );
    case "mission":
    case "vision":
    case "section":
      return (
        <Card>
          <CardBody>
            {block.title && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {block.type === "mission" ? "🎯" : block.type === "vision" ? "👁️" : "📄"}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{tr(block.title)}</h2>
              </div>
            )}
            {block.imageUrl && (
              <img src={block.imageUrl} alt="" className="w-full max-h-56 object-cover rounded-xl mb-3"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            )}
            {block.body && <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{tr(block.body)}</p>}
          </CardBody>
        </Card>
      );
    case "contact":
      return (
        <ContactCard
          title={block.title ? tr(block.title) : "Contact"}
          email={block.contactEmail} phone={block.contactPhone}
          website={block.contactWebsite} address={block.contactAddress}
        />
      );
    case "social":
      return <SocialCard title={block.title ? tr(block.title) : "Follow us"} s={block} />;
    default:
      return null;
  }
}

function ContactCard({ title, email, phone, website, address }: {
  title: string; email?: string; phone?: string; website?: string;
  address?: import("@/types").LocalizedText;
}) {
  const { t, tr } = useI18n();
  return (
    <Card>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
        📞 {title}
      </div>
      <CardBody className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
        {email && <div><span className="text-slate-500 dark:text-slate-400 me-2">{t("about.email")}:</span><a href={`mailto:${email}`} className="text-teal-700 dark:text-teal-400 hover:underline">{email}</a></div>}
        {phone && <div><span className="text-slate-500 dark:text-slate-400 me-2">{t("about.phone")}:</span><a href={`tel:${phone}`} className="hover:underline">{phone}</a></div>}
        {website && <div><span className="text-slate-500 dark:text-slate-400 me-2">{t("about.website")}:</span><a href={website} target="_blank" rel="noreferrer" className="text-teal-700 dark:text-teal-400 hover:underline">{website}</a></div>}
        {address && <div><span className="text-slate-500 dark:text-slate-400 me-2">{t("about.address")}:</span>{tr(address)}</div>}
      </CardBody>
    </Card>
  );
}

function SocialCard({ title, s }: { title: string; s: { facebook?: string; twitter?: string; instagram?: string; linkedin?: string; youtube?: string; whatsapp?: string } }) {
  const items: Array<{ url: string; label: string; icon: string }> = [];
  if (s.facebook)  items.push({ url: s.facebook,  label: "Facebook",  icon: "📘" });
  if (s.twitter)   items.push({ url: s.twitter,   label: "Twitter",   icon: "🐦" });
  if (s.instagram) items.push({ url: s.instagram, label: "Instagram", icon: "📸" });
  if (s.linkedin)  items.push({ url: s.linkedin,  label: "LinkedIn",  icon: "💼" });
  if (s.youtube)   items.push({ url: s.youtube,   label: "YouTube",   icon: "▶️" });
  if (s.whatsapp)  items.push({ url: `https://wa.me/${s.whatsapp.replace(/[^0-9]/g, "")}`, label: "WhatsApp", icon: "💬" });
  if (items.length === 0) return null;
  return (
    <Card>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
        🌐 {title}
      </div>
      <CardBody className="flex flex-wrap gap-2">
        {items.map((it) => (
          <a key={it.label} href={it.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm text-slate-800 dark:text-slate-200">
            <span>{it.icon}</span>{it.label}
          </a>
        ))}
      </CardBody>
    </Card>
  );
}

void Badge; // Suppress unused import warning
