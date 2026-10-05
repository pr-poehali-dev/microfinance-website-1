import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TERMS_SECTIONS } from "@/data/termsText";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="space-y-1 pl-1">
    {items.map((t, i) => (
      <li key={i} className="flex gap-2">
        {/^\d\./.test(t) ? null : <span className="text-emerald-600">•</span>}
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

export default function TermsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="text-emerald-950 text-xl">Условия</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pr-2 space-y-6 text-sm leading-relaxed text-emerald-950/80">
          {TERMS_SECTIONS.map((sec) => (
            <section key={sec.title} className="space-y-2">
              <h3 className="text-emerald-950 font-bold text-base">{sec.title}</h3>
              {sec.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
              {sec.list && <Bullets items={sec.list} />}
              {sec.subs?.map((s) => (
                <div key={s.title} className="space-y-1 pt-1">
                  <h4 className="text-emerald-950 font-semibold">{s.title}</h4>
                  <Bullets items={s.list} />
                </div>
              ))}
              {sec.afterList?.map((p, i) => <p key={i}>{p}</p>)}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
