import { useState } from "react";
import Icon from "@/components/ui/icon";

import { compressImage } from "./compressImage";

export interface DocPhoto {
  url?: string | null;
  label: string;
  field?: string;
}

interface Props {
  photos: DocPhoto[];
  title?: string;
  onReplace?: (field: string, base64: string) => Promise<boolean>;
}

export default function DocPhotos({ photos, title = "Фото документов", onReplace }: Props) {
  const [zoom, setZoom] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const list = onReplace ? photos : photos.filter((p) => p.url);
  if (list.length === 0) return null;

  const replace = async (ph: DocPhoto, file: File | undefined) => {
    if (!file || !onReplace || !ph.field) return;
    setBusy(ph.label); setErr("");
    try {
      const ok = await onReplace(ph.field, await compressImage(file));
      if (!ok) setErr("Не удалось загрузить фото");
    } catch {
      setErr("Не удалось загрузить фото");
    }
    setBusy("");
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {list.map((ph) => (
          <div key={ph.label} style={{ width: 112, border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: 4, background: "#fff" }}>
            {ph.url ? (
              <button type="button" onClick={() => setZoom(ph.url!)} style={{ border: "none", padding: 0, background: "none", cursor: "zoom-in", display: "block" }}>
                <img src={ph.url} alt={ph.label} style={{ width: 102, height: 96, objectFit: "cover", borderRadius: 8, display: "block" }} />
              </button>
            ) : (
              <div style={{ width: 102, height: 96, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "rgba(2,44,34,0.35)", background: "rgba(16,185,129,0.05)", borderRadius: 8 }}>
                нет фото
              </div>
            )}
            <div style={{ fontSize: 11, color: "rgba(2,44,34,0.6)", margin: "4px 0" }}>{ph.label}</div>
            {onReplace && ph.field && (
              <label style={{ display: "block", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#047857", background: "rgba(16,185,129,0.1)", borderRadius: 6, padding: "5px 0", cursor: "pointer" }}>
                {busy === ph.label ? "Загрузка..." : ph.url ? "Заменить" : "Загрузить"}
                <input type="file" accept="image/*" style={{ display: "none" }} disabled={!!busy}
                  onChange={(e) => { replace(ph, e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            )}
          </div>
        ))}
      </div>
      {err && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{err}</div>}

      {zoom && (
        <div onClick={() => setZoom("")}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <button type="button" style={{ position: "absolute", top: 16, right: 16, color: "white", background: "none", border: "none", cursor: "pointer" }}>
            <Icon name="X" size={28} />
          </button>
          <img src={zoom} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12 }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
