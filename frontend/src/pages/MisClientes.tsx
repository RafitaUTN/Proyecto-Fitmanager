import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useClientes } from '@/hooks/use-clientes'

export function MisClientes() {
  const usuario = useAuthStore((s) => s.usuario)
  const idUsuario = usuario?.id_usuario
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchText), 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchText])

  const baseFilter = idUsuario ? { id_entrenador: String(idUsuario) } : {}
  const queryFilter = debouncedSearch ? { q: debouncedSearch } : {}
  const { data: clientes, isLoading } = useClientes({ ...baseFilter, ...queryFilter })

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl text-foreground tracking-wider">MIS CLIENTES</h2>
      <p className="text-muted">Clientes asignados a mi entrenamiento</p>

      <div className="relative">
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Buscar por nombre, apellido o cédula..."
          className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>

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
              <tr><td colSpan={4} className="p-6 text-center text-muted">{debouncedSearch ? 'Sin resultados' : 'Sin clientes asignados'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
