import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

import { useClientes, useCrearCliente, useActualizarCliente, useEliminarCliente } from '@/hooks/use-clientes'

const clienteSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  cedula: z.string().min(1),
  telefono: z.string().optional(),
  correo: z.string().email(),
  fecha_nacimiento: z.string().optional(),
})

type ClienteForm = z.infer<typeof clienteSchema>

export function Clientes() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdmin = usuario?.rol === 'Administrador'
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<{ id_cliente: number } | null>(null)
  const [error, setError] = useState('')

  const { data: clientes, isLoading } = useClientes()
  const crearMutation = useCrearCliente(() => { reset(); setShowForm(false); setEditing(null) })
  const actualizarMutation = useActualizarCliente(() => { reset(); setShowForm(false); setEditing(null) })
  const eliminarMutation = useEliminarCliente()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
  })

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
        {
          onError: (err: Error) => {
            setError(err.message)
          },
        },
      )
    } else {
      crearMutation.mutate(clienteData, {
        onError: (err: Error) => {
          setError(err.message)
        },
      })
    }
  }

  function editar(c: { id_cliente: number; nombre: string; apellido: string; cedula: string; telefono: string | null; correo: string; fecha_nacimiento: string | null }) {
    setEditing(c)
    setShowForm(true)
    reset({
      nombre: c.nombre,
      apellido: c.apellido,
      cedula: c.cedula,
      telefono: c.telefono || '',
      correo: c.correo,
      fecha_nacimiento: c.fecha_nacimiento ? c.fecha_nacimiento.slice(0, 10) : '',
    })
  }

  function toggleEstado(c: { id_cliente: number; estado: boolean }) {
    actualizarMutation.mutate({ id: c.id_cliente, data: { estado: !c.estado } })
  }

  function eliminar(id: number) {
    if (!window.confirm('¿Eliminar este cliente?')) return
    eliminarMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">CLIENTES</h2>
        <Button onClick={() => { setShowForm(!showForm); setEditing(null); reset() }}>
          {showForm ? 'Cancelar' : 'Nuevo Cliente'}
        </Button>
      </div>

      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2 rounded-button">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-surface border border-border rounded-card p-6 space-y-4">
          <h3 className="font-heading text-xl text-foreground tracking-wider">{editing ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}</h3>
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
          <Button type="submit" disabled={isSubmitting || crearMutation.isPending || actualizarMutation.isPending}>
            {editing ? 'Actualizar' : 'Guardar'}
          </Button>
        </form>
      )}

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
                  <button onClick={() => editar(c)} className="text-primary hover:underline text-xs font-medium">Editar</button>
                  <button onClick={() => toggleEstado(c)}
                    className={`hover:underline text-xs font-medium ${c.estado ? 'text-destructive' : 'text-secondary'}`}>
                    {c.estado ? 'Desactivar' : 'Activar'}
                  </button>
                  {esAdmin && (
                    <button onClick={() => eliminar(c.id_cliente)} className="text-destructive hover:underline text-xs font-medium">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {clientes?.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">Sin clientes registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
