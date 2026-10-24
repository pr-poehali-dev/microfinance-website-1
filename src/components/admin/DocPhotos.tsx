import { useState } from "react";
import Icon from "@/components/ui/icon";

export interface DocPhoto {
  url?: string | null;
  label: string;
}

interface Props {
  photos: DocPhoto[];
  title?: string;
}

export default function DocPhotos({ photos, title = "Фото документов" }: Props) {
  const [zoom, setZoom] = useState("");
  const list = photos.filter((p) => p.url);
  if (list.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {list.map((ph) => (
          <div key={ph.label} style={{ width: 112, border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: 4, background: "#fff" }}>
            <button type="button" onClick={() => setZoom(ph.url!)} style={{ border: "none", padding: 0, background: "none", cursor: "zoom-in", display: "block" }}>
              <img src={ph.url!} alt={ph.label} style={{ width: 102, height: 96, objectFit: "cover", borderRadius: 8, display: "block" }} />
            </button>
            <div style={{ fontSize: 11, color: "rgba(2,44,34,0.6)", marginTop: 4 }}>{ph.label}</div>
          </div>
        ))}
      </div>

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
