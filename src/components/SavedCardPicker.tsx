import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface SavedCard { id: number; label: string; value: string; isCard: boolean }

interface Props {
  value: string;
  onPick: (value: string) => void;
}

export default function SavedCardPicker({ value, onPick }: Props) {
  const [cards, setCards] = useState<SavedCard[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${LOANS_URL}?sub=saved_cards`, {
      headers: { Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.cards) setCards(d.cards); })
      .catch(() => null);
  }, []);

  if (cards.length === 0) return null;

  const norm = (v: string) => v.replace(/\D/g, "");

  return (
    <div className="mb-2">
      <div className="text-emerald-950/50 text-xs mb-1.5">Выберите сохранённую карту или введите новую</div>
      <div className="flex flex-wrap gap-2">
        {cards.map((c) => {
          const on = norm(c.value) === norm(value);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.value)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${on ? "btn-neon text-white" : "glass text-emerald-950/80"}`}
            >
              <Icon name={c.isCard ? "CreditCard" : "Smartphone"} size={16} />
              <span className="font-mono">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
