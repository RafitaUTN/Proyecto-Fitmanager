import { useAuthStore } from '@/store/auth.store'
import { useClientes } from '@/hooks/use-clientes'

export function MisClientes() {
  const usuario = useAuthStore((s) => s.usuario)
  const idUsuario = usuario?.id_usuario

  const { data: clientes, isLoading } = useClientes(idUsuario ? { id_entrenador: String(idUsuario) } : {})

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl text-foreground tracking-wider">MIS CLIENTES</h2>
      <p className="text-muted">Clientes asignados a mi entrenamiento</p>

      <div className="bg-surface border border-border rounded-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr>
              <th className="text-left p-4 text-muted font-medium">Nombre</th>
              <th className="text-left p-4 text-muted font-medium">Cédula</th>
              <th className="text-left p-4 text-muted font-medium">Teléfono</th>
              <th className="text-left p-4 text-muted font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="p-6 text-center text-muted">Cargando...</td></tr>
            )}
            {clientes?.map((c) => (
              <tr key={c.id_cliente} className="border-t border-border">
                <td className="p-4 text-foreground">{c.nombre} {c.apellido}</td>
                <td className="p-4 text-muted">{c.cedula}</td>
                <td className="p-4 text-muted">{c.telefono || '-'}</td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${c.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {c.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
            {clientes?.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-muted">Sin clientes asignados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
