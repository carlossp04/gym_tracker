# Gym Tracker

Aplicación React/Vite para importar entrenamientos desde WhatsApp, consultar progreso y guardar un vault cifrado localmente o en Supabase.

Además del formulario manual y la importación desde WhatsApp, permite crear rutinas con varias sesiones. Una sesión iniciada desde plantilla genera sus series objetivo, permite registrar peso y repeticiones reales, marcar cada serie y guardar únicamente las completadas. Las plantillas y el entrenamiento activo forman parte del vault cifrado.

La sección Rutinas incluye un importador asistido por IA. La aplicación genera directrices estrictas junto al texto original, valida la respuesta contra el schema `gym_tracker_routine_v1` y solo entonces permite añadirla al vault. No se envían datos directamente a ningún proveedor de IA desde la aplicación.

## Uso cotidiano

La aplicación se abre en **Hoy**, con acceso a registrar, iniciar o continuar una sesión. La navegación principal contiene Hoy, Rutinas, Historial y Progreso; en móvil permanece al pie de la pantalla. El calendario está dentro del historial y las comparativas dentro de progreso. Las copias de seguridad, la gestión de ejercicios y la exportación para IA están en Opciones.

Las series, los borradores de formularios y rutinas, y las preferencias se guardan automáticamente tras una breve pausa al editar. Los borradores forman parte del contenido cifrado. Espera a ver **Guardado** antes de cerrar; mientras hay cambios pendientes el navegador avisa al abandonar la página. Finalizar muestra una revisión y guarda únicamente las series completadas.

Si falla un guardado remoto, se conserva una copia cifrada pendiente en este navegador y se reintenta al recuperar la conexión o al pulsar Reintentar. Un dispositivo que ya abrió el espacio puede recuperar su copia local si la nube no está disponible, siempre que conserve la sesión de cuenta y pueda desbloquearla. Si otra pestaña o dispositivo ha cambiado la revisión, se detiene la edición: el aviso permite descargar los cambios locales antes de volver a abrir la versión guardada. No se realiza una mezcla automática entre versiones.

Los nuevos espacios empiezan vacíos; los datos de ejemplo se incluyen solo si se marca la opción correspondiente. Los espacios existentes conservan sus datos. La importación desde WhatsApp muestra registros detectados, posibles duplicados y líneas de series no reconocidas antes de guardar. Desde el historial se puede repetir una sesión o convertirla en una rutina; si hay repeticiones variables, la plantilla lo indica para revisarlas.

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
npm test
npm run build
```
