import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ROWS: [string, string][] = [
  ["Получатель", "РЕБРОВ АЛЕКСАНДР СЕРГЕЕВИЧ"],
  ["Номер счета получателя", "40817810165377982899"],
  ["Банк получателя", "\"Газпромбанк\" (Акционерное общество)"],
  ["БИК", "044525823"],
  ["ИНН", "7744001497"],
  ["КПП", "997950001"],
  ["Корсчет", "30101810200000000823"],
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function RequisitesDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-emerald-950 text-xl">Реквизиты</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {ROWS.map(([label, value]) => (
            <div key={label} className="rounded-xl px-4 py-3" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <div className="text-emerald-950/50 text-xs mb-0.5">{label}</div>
              <div className="text-emerald-950 font-semibold text-sm break-words select-all">{value}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
