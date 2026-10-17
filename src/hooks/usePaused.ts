import { useEffect, useState } from "react";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

export default function usePaused(): boolean | null {
  const [paused, setPaused] = useState<boolean | null>(null);
  useEffect(() => {
    fetch(`${ADMIN_URL}?sub=pause_status`)
      .then((r) => r.json())
      .then((d) => setPaused(!!d.paused))
      .catch(() => setPaused(false));
  }, []);
  return paused;
}
