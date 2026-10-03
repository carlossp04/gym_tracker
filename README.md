# Gym Tracker

Aplicación React/Vite para importar entrenamientos desde WhatsApp, consultar progreso y guardar un vault cifrado localmente o en Supabase.

Además del formulario manual y la importación desde WhatsApp, permite crear rutinas con varias sesiones. Una sesión iniciada desde plantilla genera sus series objetivo, permite registrar peso y repeticiones reales, marcar cada serie y guardar únicamente las completadas. Las plantillas y el entrenamiento activo forman parte del vault cifrado.

## Desarrollo

```bash
npm ci
npm run dev
```

Copia `.env.example` a `.env.local` para activar Supabase. Sin esas variables, la aplicación usa únicamente `localStorage`.

## Seguridad y almacenamiento remoto

El contenido del vault se cifra en el navegador con AES-GCM. La contraseña del vault no se envía a Supabase. El modo remoto requiere además una cuenta de Supabase Auth; son dos credenciales distintas.

El selector lectura/edición es únicamente una preferencia de interfaz. La autorización real procede de la cuenta propietaria y del desbloqueo criptográfico; no se incluye ninguna contraseña o hash de edición en el bundle.

Ejecuta `supabase-vaults.sql` en el editor SQL de Supabase. Después, habilita Email en **Authentication > Providers**. Las políticas RLS permiten que cada usuario autenticado acceda exclusivamente a sus propios vaults.

### Migración desde el esquema público anterior

El script elimina inmediatamente las políticas anónimas. Por seguridad, los vaults antiguos quedan sin propietario e inaccesibles hasta asignarlos manualmente:

```sql
select id, owner_id from public.vaults;

update public.vaults
set owner_id = '<UUID_DEL_USUARIO_EN_AUTH_USERS>'
where id = '<ID_DEL_VAULT>';
```

Comprueba primero el usuario correcto en **Authentication > Users**. No asignes un vault a una cuenta sin verificar su propietario. Cuando no queden filas antiguas sin propietario, refuerza la columna:

```sql
alter table public.vaults alter column owner_id set not null;
```

## Protección frente a conflictos

Cada vault tiene una `revision`. Las actualizaciones solo se aceptan si la revisión remota coincide con la que abrió el cliente. Si otro dispositivo guardó antes, la aplicación rechaza el cambio y exige volver a abrir el vault; así evita sobrescrituras silenciosas.

Antes de actualizar o borrar, un trigger copia automáticamente la versión cifrada anterior a `vault_history`. El historial solo puede leerlo el propietario autenticado y el cliente no tiene permisos para alterarlo.

## Comprobaciones

```bash
npm run lint
npm run build
```
