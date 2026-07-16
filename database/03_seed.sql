
-- 10.2 Script DML — Datos de prueba (Seed Data)
-- Sistema: FitManager Gym | Base de datos: PostgreSQL



-- GIMNASIO 

INSERT INTO gimnasio (nombre, correo, telefono, direccion) VALUES
  ('FitManager Gym Central',  'info@fitmanager.com',      '8888-8888', 'Alajuela, Costa Rica'),
  ('FitManager Gym Norte',    'norte@fitmanager.com',     '8888-9999', 'Heredia, Costa Rica'),
  ('FitManager Gym Sur',      'sur@fitmanager.com',       '8888-7777', 'Cartago, Costa Rica'),
  ('FitManager Gym Este',     'este@fitmanager.com',      '8888-6666', 'San José, Costa Rica'),
  ('FitManager Gym Liberia',  'liberia@fitmanager.com',   '8888-5555', 'Liberia, Guanacaste');


-- USUARIO (5 registros — administradores y entrenadores)

INSERT INTO usuario (id_gimnasio, nombre, apellido, correo, password_hash, rol) VALUES
  (1, 'Carlos',   'Ramírez',   'admin@fitmanager.com',       'hashed_pw_1', 'Administrador'),
  (1, 'Sofía',    'Vargas',    'svargas@fitmanager.com',     'hashed_pw_2', 'Entrenador'),
  (1, 'Diego',    'Mora',      'dmora@fitmanager.com',       'hashed_pw_3', 'Entrenador'),
  (2, 'Lucía',    'Jiménez',   'ljimenez@fitmanager.com',    'hashed_pw_4', 'Administrador'),
  (3, 'Andrés',   'Castro',    'acastro@fitmanager.com',     'hashed_pw_5', 'Recepción');


-- CLIENTE 

INSERT INTO cliente (id_gimnasio, nombre, apellido, cedula, telefono, correo, fecha_nacimiento) VALUES
  (1, 'Juan',     'Pérez',     '123456789', '88881111', 'juan@email.com',    '1998-04-15'),
  (1, 'María',    'González',  '234567890', '88882222', 'maria@email.com',   '2000-09-22'),
  (1, 'Luis',     'Solís',     '345678901', '88883333', 'luis@email.com',    '1995-01-30'),
  (1, 'Valeria',  'Rojas',     '456789012', '88884444', 'valeria@email.com', '2002-07-11'),
  (1, 'Andrés',   'Murillo',   '567890123', '88885555', 'andres@email.com',  '1990-12-05');


-- MEMBRESÍA 

INSERT INTO membresia (id_gimnasio, nombre, descripcion, precio, duracion_dias) VALUES
  (1, 'Básica',       'Acceso en horario regular',                    15.00,  30),
  (1, 'Premium',      'Acceso completo + clases grupales',            35.00,  30),
  (1, 'Trimestral',   'Acceso completo por 3 meses',                  90.00,  90),
  (1, 'Semestral',    'Acceso completo por 6 meses con descuento',   160.00, 180),
  (1, 'Anual',        'Acceso ilimitado por un año, mejor precio',   280.00, 365);


-- EJERCICIO (5 registros)

INSERT INTO ejercicio (nombre, grupo_muscular, descripcion) VALUES
  ('Press de banca',    'Pecho',        'Ejercicio de empuje horizontal con barra o mancuernas.'),
  ('Sentadilla',        'Piernas',      'Ejercicio compuesto de tren inferior con barra en espalda.'),
  ('Peso muerto',       'Espalda baja', 'Levantamiento de barra desde el suelo hasta posición erguida.'),
  ('Dominadas',         'Espalda',      'Jalón con peso corporal en barra fija, agarre prono.'),
  ('Press militar',     'Hombros',      'Empuje vertical sobre la cabeza con barra o mancuernas.');


-- RUTINA 

INSERT INTO rutina (id_entrenador, nombre, descripcion) VALUES
  (2, 'Rutina Inicial A',   'Rutina full-body para principiantes, 3 días/semana.'),
  (2, 'Fuerza 5x5',         'Programa de fuerza basado en 5 series de 5 repeticiones.'),
  (3, 'Hipertrofia Upper',  'Rutina de volumen para tren superior, 4 días/semana.'),
  (3, 'Cardio y Tonificación', 'Combinación de ejercicios aeróbicos y de resistencia.'),
  (2, 'Rutina Funcional',   'Ejercicios funcionales con peso corporal y kettlebells.');


-- TABLAS PUENTE y RELACIONES



-- CLIENTE_MEMBRESÍA 

INSERT INTO cliente_membresia (id_cliente, id_membresia, fecha_inicio, fecha_fin, estado) VALUES
  (1, 2, '2026-06-01', '2026-06-30', 'Activa'),
  (2, 1, '2026-05-15', '2026-06-14', 'Activa'),
  (3, 3, '2026-04-01', '2026-06-29', 'Activa'),
  (4, 2, '2026-03-01', '2026-03-31', 'Vencida'),
  (5, 5, '2026-01-01', '2026-12-31', 'Activa');


-- PAGO 

INSERT INTO pago (id_cliente, id_cliente_membresia, monto, metodo_pago, estado) VALUES
  (1, 1, 35.00,  'SINPE',        'Completado'),
  (2, 2, 15.00,  'Efectivo',     'Completado'),
  (3, 3, 90.00,  'Tarjeta',      'Completado'),
  (4, 4, 35.00,  'Transferencia','Completado'),
  (5, 5, 280.00, 'Tarjeta',      'Completado');

-- ASISTENCIA 

INSERT INTO asistencia (id_cliente, fecha_hora_ingreso, fecha_hora_salida) VALUES
  (1, '2026-06-01 06:30:00', '2026-06-01 08:00:00'),
  (2, '2026-06-01 07:00:00', '2026-06-01 08:30:00'),
  (3, '2026-06-02 17:00:00', '2026-06-02 18:45:00'),
  (4, '2026-06-02 18:00:00', NULL),
  (5, '2026-06-03 05:45:00', '2026-06-03 07:15:00');


-- RUTINA_EJERCICIO — tabla puente compuesta 

INSERT INTO rutina_ejercicio (id_rutina, id_ejercicio, series, repeticiones, peso_sugerido) VALUES
  (1, 1, 3, 12, 20.00),
  (1, 2, 3, 15, NULL),
  (2, 1, 5,  5, 60.00),
  (2, 3, 5,  5, 80.00),
  (3, 4, 4,  8, NULL);


-- CLIENTE_RUTINA — tabla puente 

INSERT INTO cliente_rutina (id_cliente, id_rutina, fecha_asignacion, estado) VALUES
  (1, 1, '2026-06-01', 'Activa'),
  (2, 1, '2026-05-15', 'Activa'),
  (3, 2, '2026-04-01', 'Activa'),
  (4, 3, '2026-03-01', 'Completada'),
  (5, 5, '2026-01-10', 'Activa');


-- NOTIFICACIÓN (5 registros)

INSERT INTO notificacion (id_cliente, titulo, mensaje, leida) VALUES
  (1, 'Bienvenido a FitManager',      'Tu membresía Premium ha sido activada correctamente.',         true),
  (2, 'Membresía próxima a vencer',   'Tu membresía Básica vence el 14 de junio. ¡Renuévala!',       false),
  (3, 'Rutina asignada',              'Tu entrenador te ha asignado el programa Fuerza 5x5.',         true),
  (4, 'Pago confirmado',              'Se confirmó tu pago de ₡35.00 con tarjeta el 01/03/2026.',     false),
  (5, 'Recordatorio de entrenamiento','Llevas 3 días sin visitar el gimnasio. ¡Te esperamos!',        false);