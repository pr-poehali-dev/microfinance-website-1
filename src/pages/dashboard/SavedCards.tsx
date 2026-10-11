import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface SavedCard { id: number; label: string; value: string; isCard: boolean; source: string }

const headers = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
  "X-Authorization": `Bearer ${token}`,
});

const formatInput = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 19);
  return d.length > 11 ? d.replace(/(.{4})/g, "$1 ").trim() : d;
};

export default function SavedCards() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    fetch(`${LOANS_URL}?sub=saved_cards`, { headers: headers(token) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.cards) setCards(d.cards); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const remove = async (id: number) => {
    if (!window.confirm("Удалить эту карту из списка?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
    await fetch(`${LOANS_URL}?sub=card_delete`, {
      method: "POST", headers: headers(token), body: JSON.stringify({ id }),
    }).catch(() => null);
    load();
  };

  const save = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    setError("");
    const r = await fetch(`${LOANS_URL}?sub=card_add`, {
      method: "POST", headers: headers(token), body: JSON.stringify({ cardNumber: value }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => null) : null;
    setSaving(false);
    if (r && r.ok) { setValue(""); setAdding(false); load(); }
    else setError(d?.error || "Не удалось сохранить карту");
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-oswald text-lg font-bold text-emerald-950">Мои карты для выплат</h3>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="btn-neon text-white font-semibold text-sm px-4 py-2 rounded-xl inline-flex items-center gap-2">
            <Icon name="Plus" size={16} />Добавить новую карту
          </button>
        )}
      </div>

      {adding && (
        <div className="glass rounded-2xl p-4 mb-3 space-y-3">
          <input
            value={value}
            onChange={(e) => setValue(formatInput(e.target.value))}
            placeholder="Номер карты или телефон СБП"
            inputMode="numeric"
            className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-white border border-emerald-900/20 outline-none focus:border-emerald-500"
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !value}
              className="btn-neon text-white font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50">
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
            <button onClick={() => { setAdding(false); setValue(""); setError(""); }}
              className="text-emerald-950/60 font-semibold text-sm px-4 py-2.5 rounded-xl glass">
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-6 text-center text-emerald-950/50 text-sm">Загружаем карты...</div>
      ) : cards.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-emerald-950/50 text-sm">
          Карт пока нет. Карта, которую вы укажете при оформлении займа, появится здесь автоматически.
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((c) => (
            <div key={c.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.15)" }}>
                <Icon name={c.isCard ? "CreditCard" : "Smartphone"} size={20} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-emerald-950 font-semibold font-mono tracking-wide">{c.label}</div>
                <div className="text-emerald-950/50 text-xs">
                  {c.isCard ? "Банковская карта" : "СБП"}{c.source === "loan" ? " · указана при оформлении займа" : " · добавлена вами"}
                </div>
              </div>
              <button onClick={() => remove(c.id)} aria-label="Удалить карту"
                className="shrink-0 p-2 rounded-lg text-red-500/70 hover:text-red-600 hover:bg-red-500/10 transition-colors">
                <Icon name="Trash2" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
