import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PerfilCliente } from '@/components/PerfilCliente'
import { TransferRequestModal, type TransferRequestData } from '@/components/TransferRequestModal'
import { tryParseClienteActivoError } from '@/lib/transferencia-error'
import { QueryKeys } from '@/lib/query-keys'
import { useClientes, useCrearCliente, useActualizarCliente, useEliminarCliente } from '@/hooks/use-clientes'

const clienteSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  apellido: z.string().min(1, 'Requerido'),
  cedula: z.string().min(1, 'Requerido'),
  telefono: z.string().optional(),
  correo: z.string().email('Correo inválido'),
  fecha_nacimiento: z.string().optional(),
})

type ClienteForm = z.infer<typeof clienteSchema>

export function Clientes() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdmin = usuario?.rol === 'Administrador'
  const [modalOpen, setModalOpen] = useState<'crear' | 'editar' | null>(null)
  const [editing, setEditing] = useState<{ id_cliente: number } | null>(null)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [tab, setTab] = useState<'lista' | 'perfil'>('lista')
  const [perfilClienteId, setPerfilClienteId] = useState<number | null>(null)
  const [transferData, setTransferData] = useState<TransferRequestData | null>(null)
  const puedeVerPerfil = esAdmin || usuario?.rol === 'Recepcionista'
  const queryClient = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchText), 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchText])

  const { data: clientes, isLoading } = useClientes(debouncedSearch ? { q: debouncedSearch } : undefined)
  const crearMutation = useCrearCliente(() => cerrarModal())
  const actualizarMutation = useActualizarCliente(() => cerrarModal())
  const eliminarMutation = useEliminarCliente()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
  })

  function cerrarModal() {
    setModalOpen(null)
    setEditing(null)
    setError('')
    reset()
  }

  async function onSubmit(data: ClienteForm) {
    setError('')
    const clienteData = {
      nombre: data.nombre,
      apellido: data.apellido,
      cedula: data.cedula,
      telefono: data.telefono || undefined,
      correo: data.correo,
      fecha_nacimiento: data.fecha_nacimiento || undefined,
    }

    if (editing) {
      actualizarMutation.mutate(
        { id: editing.id_cliente, data: clienteData },
        { onError: (err: Error) => { setError(err.message) } },
      )
    } else {
      crearMutation.mutate(clienteData, {
        onError: (err: any) => {
          const parsed = tryParseClienteActivoError(err)
          if (parsed) {
            setTransferData(parsed)
            return
          }
          setError(err.message)
        },
      })
    }
  }

  function abrirCrear() {
    reset({ nombre: '', apellido: '', cedula: '', telefono: '', correo: '', fecha_nacimiento: '' })
    setEditing(null)
    setError('')
    setModalOpen('crear')
  }

  function abrirEditar(c: { id_cliente: number; nombre: string; apellido: string; cedula: string; telefono: string | null; correo: string; fecha_nacimiento: string | null }) {
    setEditing(c)
    setError('')
    reset({
      nombre: c.nombre,
      apellido: c.apellido,
      cedula: c.cedula,
      telefono: c.telefono || '',
      correo: c.correo,
      fecha_nacimiento: c.fecha_nacimiento ? c.fecha_nacimiento.slice(0, 10) : '',
    })
    setModalOpen('editar')
  }

  function toggleEstado(c: { id_cliente: number; estado: boolean }) {
    actualizarMutation.mutate({ id: c.id_cliente, data: { estado: !c.estado } })
  }

  function confirmarEliminar() {
    if (confirmDeleteId !== null) {
      eliminarMutation.mutate(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">CLIENTES</h2>
        <div className="flex gap-3">
          <Button onClick={abrirCrear}>Nuevo Cliente</Button>
        </div>
      </div>

      {puedeVerPerfil && (
        <div className="flex gap-1 border-b border-border">
          <button onClick={() => setTab('lista')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer bg-transparent ${tab === 'lista' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}>
            Lista
          </button>
          <button onClick={() => setTab('perfil')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer bg-transparent ${tab === 'perfil' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}>
            Perfil
          </button>
        </div>
      )}

      {tab === 'lista' && (
      <>
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

      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2 rounded-button">{error}</div>}

      <div className="bg-surface border border-border rounded-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr>
              <th className="text-left p-4 text-muted font-medium">Nombre</th>
              <th className="text-left p-4 text-muted font-medium">Cédula</th>
              <th className="text-left p-4 text-muted font-medium">Correo</th>
              <th className="text-left p-4 text-muted font-medium">Teléfono</th>
              <th className="text-left p-4 text-muted font-medium">Estado</th>
              <th className="text-left p-4 text-muted font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">Cargando...</td></tr>
            )}
            {clientes?.map((c) => (
              <tr key={c.id_cliente} className="border-t border-border">
                <td className="p-4 text-foreground">{c.nombre} {c.apellido}</td>
                <td className="p-4 text-muted">{c.cedula}</td>
                <td className="p-4 text-muted">{c.correo}</td>
                <td className="p-4 text-muted">{c.telefono || '-'}</td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${c.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {c.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 space-x-3">
                  <button onClick={() => abrirEditar(c)} className="text-primary hover:underline text-xs font-medium">Editar</button>
                  {puedeVerPerfil && (
                    <button onClick={() => { setPerfilClienteId(c.id_cliente); setTab('perfil') }} className="text-muted hover:text-primary hover:underline text-xs font-medium">
                      Perfil
                    </button>
                  )}
                  <button onClick={() => toggleEstado(c)}
                    className={`hover:underline text-xs font-medium ${c.estado ? 'text-destructive' : 'text-secondary'}`}>
                    {c.estado ? 'Desactivar' : 'Activar'}
                  </button>
                  {esAdmin && (
                    <button onClick={() => setConfirmDeleteId(c.id_cliente)} className="text-destructive hover:underline text-xs font-medium">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {clientes?.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">{debouncedSearch ? 'Sin resultados' : 'Sin clientes registrados'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={cerrarModal}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-lg shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">{editing ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}</h3>
              <button onClick={cerrarModal} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>
            {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2 rounded-button">{error}</div>}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Nombre</label>
                  <Input {...register('nombre')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Apellido</label>
                  <Input {...register('apellido')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Cédula</label>
                  <Input {...register('cedula')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Teléfono</label>
                  <Input {...register('telefono')} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Correo</label>
                <Input type="email" {...register('correo')} />
                {errors.correo && <p className="text-destructive text-xs mt-1">{errors.correo.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Fecha de Nacimiento</label>
                <Input type="date" {...register('fecha_nacimiento')} />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting || crearMutation.isPending || actualizarMutation.isPending} className="flex-1">
                  {editing ? 'Actualizar' : 'Guardar'}
                </Button>
                <Button type="button" variant="outline" onClick={cerrarModal}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmDeleteId(null)}
        title="Eliminar cliente"
        description="¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminarMutation.isPending}
      />
      </>
      )}

      {tab === 'perfil' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Cliente</label>
            <select
              value={perfilClienteId ?? ''}
              onChange={(e) => setPerfilClienteId(e.target.value ? Number(e.target.value) : null)}
              className="w-full sm:w-80 rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecciona un cliente...</option>
              {clientes?.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido} — {c.cedula}</option>
              ))}
            </select>
          </div>
          {perfilClienteId !== null && <PerfilCliente id={perfilClienteId} />}
        </div>
      )}

      <TransferRequestModal
        open={transferData !== null}
        data={transferData}
        onCancel={() => setTransferData(null)}
        onSuccess={() => {
          setTransferData(null)
          queryClient.invalidateQueries({ queryKey: QueryKeys.notificaciones() })
          queryClient.invalidateQueries({ queryKey: QueryKeys.notificacionesContar() })
        }}
      />

    </div>
  )
}
