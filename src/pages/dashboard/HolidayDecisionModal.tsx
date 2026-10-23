import Icon from "@/components/ui/icon";
import { HolidayRequest } from "./creditHolidays";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface Props {
  items: HolidayRequest[];
  onClose: () => void;
}

export default function HolidayDecisionModal({ items, onClose }: Props) {
  const close = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      await fetch(`${LOANS_URL}?sub=holiday_seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
        body: "{}",
      }).catch(() => {});
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: "rgba(2,44,34,0.55)" }}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-5 bg-white space-y-3" style={{ boxShadow: "0 10px 60px rgba(0,0,0,0.3)" }}>
        <div className="font-oswald text-xl font-bold text-emerald-950">Кредитные каникулы</div>
        {items.map((h) => {
          const ok = h.status === "approved";
          return (
            <div key={h.id} className="rounded-2xl p-4 space-y-1.5"
              style={ok ? { background: "rgba(250,204,21,0.22)", border: "1px solid rgba(234,179,8,0.6)" } : { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)" }}>
              <div className="flex items-center gap-2 font-bold" style={{ color: ok ? "#854d0e" : "#b91c1c" }}>
                <Icon name={ok ? "Umbrella" : "XCircle"} size={18} />
                {ok ? "Каникулы одобрены" : "В каникулах отказано"}
              </div>
              {ok && h.untilDate && <div className="text-sm text-emerald-950/80">Действуют до <b>{h.untilDate}</b>. Просрочки в это время нет, проценты продолжают начисляться. Оплатить можно в любой момент.</div>}
              {!ok && <div className="text-sm text-emerald-950/80">Причина: {h.adminComment || "не указана"}</div>}
              {ok && h.adminComment && <div className="text-sm text-emerald-950/70">Комментарий: {h.adminComment}</div>}
            </div>
          );
        })}
        <button onClick={close} className="w-full btn-neon text-white font-semibold py-3 rounded-xl">Понятно</button>
      </div>
    </div>
  );
}
