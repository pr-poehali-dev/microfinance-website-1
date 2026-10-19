import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const CONTRACT_URL = "https://functions.poehali.dev/9cdc3bea-1348-49df-a7a3-4aeef6088ff3";

interface Cert {
  id: number;
  number: string;
  kind: string;
  title: string;
  amount: number;
  repaidAt: string;
  issuedAt: string;
  url: string;
}

const KIND: Record<string, string> = {
  loan: "Займ",
  carloan: "Займ под залог авто",
  shoploan: "Займ на покупки",
  card: "Лимит по карте",
};

export default function DebtCertificatesSection() {
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(CONTRACT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ certificates: true }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.items || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
      <h2 className="font-oswald text-2xl font-bold text-emerald-950 mb-1">Справка об отсутствии задолженности</h2>
      <p className="text-emerald-950/60 text-sm mb-4">
        Справка формируется автоматически, когда вы полностью погасили займ или задолженность по карте.
      </p>
      {loading ? (
        <p className="text-emerald-950/50 text-sm">Проверяем ваши займы...</p>
      ) : failed ? (
        <p className="text-red-600 text-sm">Не удалось загрузить справки. Обновите страницу.</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl px-4 py-5 text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px dashed rgba(16,185,129,0.35)" }}>
          <Icon name="FileCheck" size={32} className="text-emerald-600 mx-auto mb-2" />
          <p className="text-emerald-950 font-semibold">Справок пока нет</p>
          <p className="text-emerald-950/60 text-sm mt-1">Как только вы полностью погасите займ или лимит по карте, справка появится здесь.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <a
              key={c.id}
              href={c.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-emerald-950 hover:border-emerald-500 transition-colors"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <Icon name="FileCheck" size={20} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold">{KIND[c.kind] || "Займ"} · {c.title}</div>
                <div className="text-xs text-emerald-950/60">
                  Справка {c.number}
                  {c.repaidAt ? ` · погашено ${c.repaidAt}` : ""}
                </div>
              </div>
              <Icon name="Download" size={16} className="ml-auto text-emerald-600 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
