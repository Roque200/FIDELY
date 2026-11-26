export function PantallaCarga() {
  return (
    <div className="flex flex-1 items-center justify-center bg-stone-50">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-amber-900"
        aria-label="Cargando"
      />
    </div>
  );
}
