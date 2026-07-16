
-- FITMANAGER - ESQUEMA PRINCIPAL
-- PostgreSQL 17


CREATE TABLE gimnasio (
    id_gimnasio BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    direccion TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuario (
    id_usuario BIGSERIAL PRIMARY KEY,
    id_gimnasio BIGINT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol VARCHAR(30) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_gimnasio
        FOREIGN KEY (id_gimnasio)
        REFERENCES gimnasio(id_gimnasio),

    CONSTRAINT chk_usuario_rol
        CHECK (rol IN ('Administrador','Recepcionista','Entrenador'))
);

CREATE TABLE cliente (
    id_cliente BIGSERIAL PRIMARY KEY,
    id_gimnasio BIGINT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    correo VARCHAR(150) NOT NULL UNIQUE,
    fecha_nacimiento DATE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_cliente_gimnasio
        FOREIGN KEY (id_gimnasio)
        REFERENCES gimnasio(id_gimnasio)
);

CREATE TABLE membresia (
    id_membresia BIGSERIAL PRIMARY KEY,
    id_gimnasio BIGINT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
    duracion_dias INTEGER NOT NULL CHECK (duracion_dias > 0),
    estado BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_membresia_gimnasio
        FOREIGN KEY (id_gimnasio)
        REFERENCES gimnasio(id_gimnasio)
);

CREATE TABLE cliente_membresia (
    id_cliente_membresia BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL,
    id_membresia BIGINT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) NOT NULL,

    CONSTRAINT fk_cm_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente),

    CONSTRAINT fk_cm_membresia
        FOREIGN KEY (id_membresia)
        REFERENCES membresia(id_membresia),

    CONSTRAINT chk_cm_estado
        CHECK (estado IN ('Activa','Vencida','Suspendida'))
);

CREATE TABLE pago (
    id_pago BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL,
    id_cliente_membresia BIGINT NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    metodo_pago VARCHAR(20) NOT NULL,
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL,

    CONSTRAINT fk_pago_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente),

    CONSTRAINT fk_pago_membresia
        FOREIGN KEY (id_cliente_membresia)
        REFERENCES cliente_membresia(id_cliente_membresia),

    CONSTRAINT chk_pago_metodo
        CHECK (metodo_pago IN ('Efectivo','Tarjeta','SINPE')),

    CONSTRAINT chk_pago_estado
        CHECK (estado IN ('Pendiente','Pagado','Anulado'))
);

CREATE TABLE asistencia (
    id_asistencia BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL,
    fecha_hora_ingreso TIMESTAMP NOT NULL,
    fecha_hora_salida TIMESTAMP,

    CONSTRAINT fk_asistencia_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente)
);

CREATE TABLE rutina (
    id_rutina BIGSERIAL PRIMARY KEY,
    id_entrenador BIGINT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_rutina_entrenador
        FOREIGN KEY (id_entrenador)
        REFERENCES usuario(id_usuario)
);

CREATE TABLE ejercicio (
    id_ejercicio BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    grupo_muscular VARCHAR(50) NOT NULL,
    descripcion TEXT
);

CREATE TABLE rutina_ejercicio (
    id_rutina BIGINT NOT NULL,
    id_ejercicio BIGINT NOT NULL,
    series INTEGER NOT NULL,
    repeticiones INTEGER NOT NULL,
    peso_sugerido DECIMAL(6,2),

    PRIMARY KEY (id_rutina, id_ejercicio),

    CONSTRAINT fk_re_rutina
        FOREIGN KEY (id_rutina)
        REFERENCES rutina(id_rutina),

    CONSTRAINT fk_re_ejercicio
        FOREIGN KEY (id_ejercicio)
        REFERENCES ejercicio(id_ejercicio)
);

CREATE TABLE cliente_rutina (
    id_cliente_rutina BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL,
    id_rutina BIGINT NOT NULL,
    fecha_asignacion DATE NOT NULL,
    estado VARCHAR(20) NOT NULL,

    CONSTRAINT fk_cr_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente),

    CONSTRAINT fk_cr_rutina
        FOREIGN KEY (id_rutina)
        REFERENCES rutina(id_rutina)
);

CREATE TABLE notificacion (
    id_notificacion BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leida BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_notificacion_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente)
);