# Microservicio de Autenticación (auth-ms)

Microservicio de autenticación para el sistema de votaciones construido con NestJS, Prisma y PostgreSQL. Este servicio maneja la autenticación de usuarios, registro y gestión de tokens JWT.

## Características

- **Registro de Usuarios**: Crear nuevas cuentas de usuario con email y contraseña
- **Autenticación de Usuarios**: Inicio de sesión con email y contraseña
- **Gestión de Tokens JWT**: Generar y validar tokens JWT
- **Acceso Basado en Roles**: Soporte para roles USER y ADMIN
- **Hash de Contraseñas**: Almacenamiento seguro de contraseñas usando bcrypt
- **Arquitectura de Microservicios**: Usa NATS para comunicación entre servicios
- **ORM de Base de Datos**: Prisma para operaciones de base de datos
- **Base de Datos**: PostgreSQL con soporte Docker

## Arquitectura

Este servicio es parte de una arquitectura de microservicios y se comunica con otros servicios a través de mensajería NATS. Proporciona servicios de autenticación al gateway cliente y otros microservicios.

### Patrones de Mensajes

- `auth_register`: Registrar un nuevo usuario
- `auth_login`: Autenticar un usuario y devolver token JWT

## Prerrequisitos

- Node.js (v18 o superior)
- Docker y Docker Compose
- PostgreSQL (o usar Docker Compose)
- Servidor NATS

## Variables de Entorno

Copia `.env.example` a `.env` y configura las siguientes variables:

```bash
# Configuración del Servidor
PORT=3003

# Configuración de Base de Datos
DATABASE_URL="postgresql://postgres:auth_password123@localhost:5435/auth_db?schema=public"

# Configuración JWT
JWT_SECRET="your_jwt_secret_key"  # Cambia esto por una cadena aleatoria segura

# Configuración NATS
NATS_SERVERS="nats://localhost:4222"
```

## Instalación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar la base de datos PostgreSQL**:
   ```bash
   docker-compose up -d
   ```

3. **Generar cliente de Prisma**:
   ```bash
   npx prisma generate
   ```

4. **Ejecutar migraciones de base de datos**:
   ```bash
   npx prisma db push
   ```

5. **Iniciar la aplicación**:
   ```bash
   # Modo desarrollo
   npm run start:dev
   
   # Modo producción
   npm run start:prod
   ```

## Esquema de Base de Datos

El servicio utiliza el siguiente esquema de base de datos:

### Tabla auth_users
- `id`: UUID (Clave Primaria)
- `email`: String (Único)
- `passwordHash`: String
- `role`: Enum (USER, ADMIN)
- `createdAt`: DateTime
- `updatedAt`: DateTime

## Endpoints de API (Patrones de Mensajes)

### Registrar Usuario
**Patrón**: `{ cmd: 'auth_register' }`

**Payload**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseñaSegura123"
}
```

**Respuesta**:
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "role": "USER",
  "createdAt": "2025-07-04T...",
  "updatedAt": "2025-07-04T..."
}
```

### Iniciar Sesión de Usuario
**Patrón**: `{ cmd: 'auth_login' }`

**Payload**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseñaSegura123"
}
```

**Respuesta**:
```json
{
  "access_token": "jwt_token_aqui",
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "role": "USER"
  }
}
```

## Scripts de Desarrollo

```bash
# Modo desarrollo con recarga automática
npm run start:dev

# Modo debug
npm run start:debug

# Construir la aplicación
npm run build

# Iniciar build de producción
npm run start:prod

# Formatear código
npm run format

# Lintear código
npm run lint

# Ejecutar pruebas unitarias
npm run test

# Ejecutar pruebas e2e
npm run test:e2e

# Ejecutar pruebas con cobertura
npm run test:cov
```

## Gestión de Base de Datos

```bash
# Generar cliente de Prisma
npx prisma generate

# Aplicar cambios de esquema a la base de datos
npx prisma db push

# Abrir Prisma Studio (GUI de base de datos)
npx prisma studio

# Resetear base de datos
npx prisma migrate reset
```

## Comandos de Docker

```bash
# Iniciar contenedor de base de datos
docker-compose up -d

# Detener contenedor de base de datos
docker-compose down

# Ver logs
docker-compose logs auth-db

# Acceder a shell de base de datos
docker exec -it auth_database psql -U postgres -d auth_db
```

## Características de Seguridad

- **Hash de Contraseñas**: Usa bcrypt para almacenamiento seguro de contraseñas
- **Tokens JWT**: Autenticación sin estado con expiración configurable
- **Validación de Entrada**: Validación de DTO usando class-validator
- **Variables de Entorno**: Datos sensibles almacenados en variables de entorno

## Manejo de Errores

El servicio incluye manejo integral de errores para:
- Credenciales inválidas
- Registro de email duplicado
- Errores de conexión a base de datos
- Errores de validación de token JWT
- Variables de entorno faltantes

## Pruebas

```bash
# Ejecutar todas las pruebas
npm run test

# Ejecutar pruebas en modo watch
npm run test:watch

# Ejecutar pruebas e2e
npm run test:e2e

# Generar reporte de cobertura de pruebas
npm run test:cov
```

## Monitoreo y Logging

El servicio incluye logging integrado para:
- Intentos de autenticación
- Eventos de registro
- Operaciones de base de datos
- Seguimiento de errores

## Contribución

1. Sigue el estilo de código y patrones existentes
2. Escribe pruebas para nuevas características
3. Actualiza la documentación al agregar nueva funcionalidad
4. Usa mensajes de commit convencionales

## Stack Tecnológico

- **Framework**: NestJS
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Autenticación**: JWT + bcrypt
- **Mensajería**: NATS
- **Validación**: class-validator
- **Testing**: Jest
- **Containerización**: Docker

## Servicios Relacionados

Este microservicio es parte de un sistema de votaciones más grande que incluye:
- **client-gateway**: API Gateway para peticiones externas
- **users-ms**: Microservicio de gestión de usuarios
- Otros microservicios relacionados con votaciones

## Licencia

Este proyecto tiene [licencia MIT](LICENSE).
