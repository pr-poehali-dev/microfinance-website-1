import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const UPLOAD_URL = "https://functions.poehali.dev/45733e38-49ca-4566-9ae3-b5323aec9a63";
const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface Doc { id: number; title: string; comment: string; url: string; status: string; date: string; }

const PRESETS = ["Паспорт", "Прописка", "Селфи с паспортом", "СНИЛС", "Справка о доходах", "Другое"];

const toBase64 = (file: File): Promise<{ b64: string; ext: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (file.type === "application/pdf") {
        resolve({ b64: (reader.result as string).split(",")[1], ext: "pdf" });
        return;
      }
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1600;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve({ b64: canvas.toDataURL("image/webp", 0.75).split(",")[1], ext: "webp" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

const isPdf = (u: string) => u.toLowerCase().endsWith(".pdf");

export default function ClientDocsSection({ phone }: { phone: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState(PRESETS[0]);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hdrs = () => {
    const t = localStorage.getItem("token") || "";
    return { "Content-Type": "application/json", Authorization: `Bearer ${t}`, "X-Authorization": `Bearer ${t}` };
  };

  const load = useCallback(() => {
    fetch(`${LOANS_URL}?sub=my_docs`, { headers: hdrs() })
      .then((r) => r.json())
      .then((d) => setDocs(d.docs || []))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  function pick(list: FileList | null) {
    if (!list) return;
    setOk(false);
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 10));
    if (inputRef.current) inputRef.current.value = "";
  }

  async function send() {
    if (files.length === 0) { setError("Выберите хотя бы один файл"); return; }
    setSending(true); setError(""); setOk(false);
    try {
      const now = Date.now();
      const digits = phone.replace(/\D/g, "");
      const urls = await Promise.all(files.map(async (f, i) => {
        const { b64, ext } = await toBase64(f);
        const up = await fetch(UPLOAD_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: b64, filename: `${now}_${digits}_${i}.${ext}`, folder: "client-docs" }),
        });
        if (!up.ok) throw new Error("upload");
        return (await up.json()).url as string;
      }));
      const res = await fetch(`${LOANS_URL}?sub=doc_send`, {
        method: "POST", headers: hdrs(), body: JSON.stringify({ title, comment, urls }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "send");
      setFiles([]); setComment(""); setOk(true);
      load();
    } catch (e) {
      setError(e instanceof Error && e.message !== "upload" && e.message !== "send" ? e.message : "Не удалось отправить. Попробуйте ещё раз");
    }
    setSending(false);
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
      <h2 className="font-oswald text-2xl font-bold text-emerald-950 mb-1">Фото документов</h2>
      <p className="text-emerald-950/50 text-sm mb-4">
        Если нам чего-то не хватило для рассмотрения заявки, пришлите фото или скан документа. Мы получим его сразу.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setTitle(p)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style={title === p
              ? { background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#fff" }
              : { background: "rgba(16,185,129,0.08)", color: "#022c22", border: "1px solid rgba(16,185,129,0.25)" }}>
            {p}
          </button>
        ))}
      </div>

      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      <button type="button" onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl py-6 flex flex-col items-center gap-2 transition-colors hover:bg-emerald-50"
        style={{ border: "2px dashed rgba(16,185,129,0.45)", background: "rgba(16,185,129,0.04)" }}>
        <Icon name="Camera" size={26} className="text-emerald-600" />
        <span className="text-emerald-900 text-sm font-semibold">Сфотографировать или выбрать файлы</span>
        <span className="text-emerald-950/40 text-xs">Фото или PDF, до 10 файлов</span>
      </button>

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.06)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <Icon name={f.type === "application/pdf" ? "FileText" : "Image"} size={16} className="text-emerald-600 shrink-0" />
                <span className="text-emerald-950 text-sm truncate">{f.name}</span>
              </div>
              <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label="Убрать файл">
                <Icon name="X" size={16} className="text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Комментарий для администратора (необязательно)"
        className="w-full mt-3 rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.3)", color: "#022c22" }} />

      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      {ok && (
        <div className="mt-3 rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.35)" }}>
          <Icon name="CheckCircle2" size={18} className="text-emerald-600" />
          <span className="text-emerald-900 text-sm font-semibold">Документы отправлены администратору</span>
        </div>
      )}

      <button type="button" onClick={send} disabled={sending || files.length === 0}
        className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", boxShadow: "0 4px 20px rgba(16,185,129,0.3)" }}>
        {sending ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Send" size={18} />}
        {sending ? "Отправляем..." : "Отправить администратору"}
      </button>

      {docs.length > 0 && (
        <div className="mt-6">
          <div className="text-emerald-950 font-bold mb-2">Отправленные документы</div>
          <div className="space-y-1.5">
            {docs.map((d) => (
              <a key={d.id} href={d.url} target="_blank" rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-emerald-50 transition-colors"
                style={{ background: "rgba(16,185,129,0.05)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  {isPdf(d.url)
                    ? <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}><Icon name="FileText" size={18} className="text-red-500" /></div>
                    : <img src={d.url} alt={d.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-emerald-950 text-sm font-semibold truncate">{d.title}</div>
                    <div className="text-emerald-950/50 text-xs">{d.date}</div>
                  </div>
                </div>
                <span className="text-xs font-semibold shrink-0" style={{ color: d.status === "new" ? "#b45309" : "#15803d" }}>
                  {d.status === "new" ? "Отправлено" : "Просмотрено"}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
