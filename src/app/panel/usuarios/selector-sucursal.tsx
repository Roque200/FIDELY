import { Campo, CLASE_INPUT } from "@/components/formulario";

export type OpcionSucursal = { id: string; nombre: string; activa: boolean };

type Props = {
  sucursales: OpcionSucursal[];
  valor: string;
};

// Lista de sucursales para asignar al barista. Las desactivadas solo
// aparecen si es la que ya tiene (para no perderla al guardar otra cosa).
export function SelectorSucursal({ sucursales, valor }: Props) {
  const opciones = sucursales.filter((s) => s.activa || s.id === valor);
  return (
    <Campo
      id="sucursal_id"
      etiqueta="Sucursal"
      ayuda={
        opciones.length === 0
          ? "Aún no tienes sucursales; puedes asignarla después."
          : "Donde trabaja; queda registrada en cada sello que dé."
      }
    >
      <select
        key={valor}
        id="sucursal_id"
        name="sucursal_id"
        defaultValue={valor}
        className={CLASE_INPUT}
      >
        <option value="">Sin sucursal</option>
        {opciones.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
            {s.activa ? "" : " (desactivada)"}
          </option>
        ))}
      </select>
    </Campo>
  );
}
