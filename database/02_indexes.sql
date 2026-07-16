CREATE INDEX idx_usuario_gimnasio
ON usuario(id_gimnasio);

CREATE INDEX idx_cliente_gimnasio
ON cliente(id_gimnasio);

CREATE INDEX idx_cliente_correo
ON cliente(correo);

CREATE INDEX idx_cliente_cedula
ON cliente(cedula);

CREATE INDEX idx_pago_cliente
ON pago(id_cliente);

CREATE INDEX idx_pago_fecha
ON pago(fecha_pago);

CREATE INDEX idx_asistencia_cliente
ON asistencia(id_cliente);

CREATE INDEX idx_asistencia_ingreso
ON asistencia(fecha_hora_ingreso);

CREATE INDEX idx_rutina_entrenador
ON rutina(id_entrenador);

CREATE INDEX idx_cliente_rutina_cliente
ON cliente_rutina(id_cliente);

CREATE INDEX idx_cliente_membresia_cliente
ON cliente_membresia(id_cliente);

CREATE INDEX idx_cliente_membresia_estado
ON cliente_membresia(estado);