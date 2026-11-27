import { Coffee } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-900 text-amber-50">
        <Coffee className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="text-xl font-semibold tracking-tight text-stone-900">
        Fidely
      </span>
    </div>
  );
}
