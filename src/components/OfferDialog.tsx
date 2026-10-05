import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OFFER_BLOCKS, OFFER_TITLE } from "@/data/offerText";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function OfferDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="text-emerald-950 text-xl">{OFFER_TITLE}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pr-2 space-y-3 text-sm leading-relaxed text-emerald-950/80">
          {OFFER_BLOCKS.map(([type, text], i) => {
            if (type === "h") return <h3 key={i} className="text-emerald-950 font-bold text-base pt-3">{text}</h3>;
            if (type === "sh") return <h4 key={i} className="text-emerald-950 font-semibold pt-2">{text}</h4>;
            if (type === "b") return <p key={i} className="pl-5">— {text}</p>;
            return <p key={i}>{text}</p>;
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
