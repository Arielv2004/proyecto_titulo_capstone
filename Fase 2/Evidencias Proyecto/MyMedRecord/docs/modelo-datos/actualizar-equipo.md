# Actualización del equipo al modelo de 18 tablas

Esta entrega actualiza las copias del proyecto de Fase 2 y Fase 3. Elegir una sola copia como entorno de ejecución; ambas tienen el mismo backend y esquema para esta integración. No levantar simultáneamente sus Compose porque comparten contenedores y puertos.

## Antes de actualizar

1. Guardar el trabajo propio y obtener `main` desde el repositorio. Desde una rama `main` sin cambios pendientes, usar `git pull --ff-only origin main`.
2. Detener la API durante la actualización. PostgreSQL debe permanecer iniciado.
3. Respaldar la base y conservar el archivo `.env` de forma privada. Confirmar que `DB_NAME` apunta a la base que realmente utiliza la API. El Compose del repositorio crea `mymedrecord`; el nombre `mymedrecord_main` corresponde al entorno local del autor y no es obligatorio para el equipo.
4. Configurar `AES_SECRET_KEY` antes de la conversión. Debe contener exactamente 32 bytes UTF-8. Si ya existen datos cifrados, conservar la clave con que se cifraron; no reemplazarla. Para una base aún sin cifrar puede generarse una clave de 32 caracteres ASCII con:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('base64'))"
```

Guardar el resultado únicamente en el `.env` privado. La clave y el respaldo deben conservarse; perder la clave impide descifrar los registros. No subirlos al repositorio. Mantener también un `JWT_SECRET` privado configurado.

## Instalar y aplicar

Desde la carpeta del proyecto elegida:

```powershell
Set-Location .\backend-core
npm.cmd ci
npm.cmd run migrate
node scripts/encrypt-clinical-data.cjs
```

Detenerse si algún comando falla. No iniciar el nuevo backend antes de terminar la migración. Las migraciones son incrementales y la conversión es transaccional e idempotente: las filas ya cifradas no se vuelven a convertir. **No ejecutar `database/init.sql` ni eliminar el volumen Docker de una base existente.**

Los SQL crean las cuatro tablas `auth_sessions`, `privacy_acceptances`, `document_deletions` y `security_rate_limits`. También preparan los campos `encrypted_payload` en siete tablas existentes y retiran, si existe, `schema_migrations`, según la decisión de este proyecto. El ejecutor recorre todos los archivos ordenados sin conservar un registro persistente; futuras migraciones deben ser idempotentes y coordinarse con el equipo.

Para una instalación nueva con un volumen vacío, Docker utiliza el `init.sql` actualizado, que crea las 18 tablas. Ejecutar después los comandos anteriores para convertir los datos iniciales y comprobar que el esquema está preparado.

## Verificar e iniciar

Con Docker y el contenedor `mymedrecord_db` iniciados:

```powershell
npm.cmd run test:model
npm.cmd run dev
```

Las 19 pruebas específicas usan bases efímeras y PostgreSQL real; no reinicializan la base habitual. Si el usuario de `DB_USER` es un rol personalizado, debe existir en el contenedor y tener permisos para conectarse a las bases de prueba de su propiedad. Estas pruebas no comprueban disponibilidad de Gemini ni sustituyen las pruebas documentales con el proveedor real.

En pgAdmin, sobre la base utilizada por la API:

```sql
SELECT current_database(), count(*) AS tablas
FROM pg_tables
WHERE schemaname = 'public';
```

El resultado esperado es **18 tablas**. La vista `available_doctors` no cuenta como tabla. Iniciar frontend y servicio documental como de costumbre. Volver a iniciar sesión: las cookies anteriores sin sesión registrada dejan de aceptarse. Comprobar perfil, documentos, consulta compartida y QR con datos ficticios.

## Alcance

La entrega incluye las tablas, su integración en el backend, cifrado y lectura de campos clínicos, confirmación documental transaccional y documentación del modelo. Los cambios locales independientes de OCR/IA y frontend no forman parte de este commit. Las observaciones históricas de extracción con Gemini se mantienen documentadas y no se presentan como resueltas.
