import { useEffect, useState } from "react";
import { useServices } from "../services";

/** Raw URL immediately, swapped for the locally cached data URL once resolved. */
export function useCachedImage(url: string | undefined): string | undefined {
  const services = useServices();
  const [src, setSrc] = useState(url);

  useEffect(() => {
    setSrc(url);
    if (!url) return;
    let cancelled = false;
    services.resolveImage(url).then((resolved) => {
      if (!cancelled) setSrc(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [services, url]);

  return src;
}
