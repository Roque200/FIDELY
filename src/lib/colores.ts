// Mezcla dos colores #RRGGBB: t=0 da el primero, t=1 el segundo
export function mezclarColores(a: string, b: string, t: number) {
  const ca = hexARgb(a);
  const cb = hexARgb(b);
  if (!ca || !cb) return a;
  const mezcla = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${mezcla.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function hexARgb(hex: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : null;
}
