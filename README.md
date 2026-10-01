# TeamTrack

TeamTrack es un gestor de trabajo para el equipo, parecido a Azure DevOps o Jira. Sirve para registrar épicas, historias de usuario, tareas y bugs, organizarlos en sprints, asignarlos y dejar constancia de lo que se sube a GitHub. Además guarda un **historial automático de todos los cambios**.

- **Tecnología:** React + Vite (JavaScript) con Supabase (PostgreSQL, autenticación, almacenamiento y tiempo real).
- **Integraciones:** ninguna. La app no se conecta a GitHub. Los enlaces de commits y PR se registran a mano en los comentarios.
- **Proyectos:** uno solo por ahora.

---

## 1. Tipos de ítem

| Tipo | Código | Para qué se usa | Puede colgar de |
|---|---|---|---|
| **Épica** | EP | Un objetivo grande que toma varios sprints. Por ejemplo: "Módulo de pagos". Agrupa historias. | Nada (siempre es raíz) |
| **Historia de usuario** | HU | Una funcionalidad vista desde el usuario: *"Como cajero quiero reimprimir un recibo para entregarlo al cliente"*. Debe caber en un sprint. | Una épica |
| **Tarea** | TK | El trabajo técnico concreto para completar una historia. Por ejemplo: "Crear endpoint /recibos/:id". | Una historia o una épica |
| **Bug** | BG | Un defecto: algo que funcionaba o debía funcionar y no lo hace. | Una historia o una épica |

**Jerarquía:** Épica → Historia de usuario → Tarea / Bug

La base de datos impide relaciones inválidas. Por ejemplo, no deja poner una historia debajo de otra historia, ni darle padre a una épica. Tampoco se puede cambiar el tipo de un ítem que ya tiene hijos.

Una tarea o un bug pueden existir sin padre. Esos ítems aparecen en la vista Jerarquía bajo "Sin épica".

## 2. Campos de cada ítem

| Campo | Obligatorio | Aplica a | Descripción |
|---|---|---|---|
| Título | Sí | Todos | Resumen corto y claro |
| Tipo | Sí | Todos | Épica, Historia, Tarea o Bug |
| Estado | Sí | Todos | Ver sección 3 |
| Prioridad | Sí | Todos | **Crítica** (bloquea al equipo o a producción), **Alta**, **Media** (por defecto), **Baja** |
| Severidad | No | Solo bugs | Impacto del defecto: **Bloqueante** (no se puede usar el sistema), **Mayor** (falla una función importante), **Menor** (hay un camino alterno), **Trivial** (estético) |
| Asignado a | No | Todos | Integrante responsable |
| Descripción | No | Todos | Detalle del trabajo. En un bug conviene poner los pasos para reproducirlo, el resultado esperado y el resultado actual |
| Criterios de aceptación | No | Épicas e historias | Condiciones para dar la historia por terminada. Se sugiere el formato *Dado que… / Cuando… / Entonces…* |
| Story points | No | Todos | Esfuerzo relativo (1, 2, 3, 5, 8, 13…). Con ellos se mide el avance del sprint |
| Estimación (horas) | No | Todos | Horas estimadas, útil en tareas |
| Fecha límite | No | Todos | Si pasa la fecha y el ítem sigue abierto, se marca en rojo |
| Etiquetas | No | Todos | Palabras separadas por coma (`frontend, login`). Se pueden buscar |
| Padre | No | Todos menos épicas | Ítem del que depende (ver jerarquía) |
| Sprint | No | Todos | Sin sprint, el ítem queda en el **Backlog** |

Además, la app llena estos campos sola: creado por, fecha de creación, última actualización, fecha de cierre y motivo de cancelación.

## 3. Estados

```
Pendiente → En progreso → En revisión → QA → Cerrada
                    (desde cualquiera) → Cancelada (exige motivo)
```

| Estado | Significado |
|---|---|
| **Pendiente** | Nadie ha empezado |
| **En progreso** | Alguien está trabajando en el ítem |
| **En revisión** | Código terminado, esperando revisión o aprobación del PR |
| **QA** | En pruebas funcionales |
| **Cerrada** | Terminada y verificada. Se guarda la fecha de cierre |
| **Cancelada** | No se hará. **Exige motivo** y se puede reabrir |

El flujo no es rígido. Un ítem puede regresar de QA a En progreso si se encuentra un problema, y ese cambio queda en el historial.

## 4. Cancelar o eliminar

- **Cancelar:** el ítem se conserva con estado Cancelada y el motivo es obligatorio. Úsalo para lo que ya no se va a hacer. Se puede reabrir.
- **Eliminar definitivamente:** úsalo solo para ítems **creados por error**. También pide motivo. Se borran el ítem, sus comentarios y sus adjuntos. Sus hijos no se borran: quedan sin padre. En el historial queda quién lo eliminó, cuándo, el motivo y una **copia completa de los datos** del ítem.

La eliminación solo puede hacerse con el botón *Eliminar*, que llama a la función `delete_work_item`. Un `DELETE` directo a la tabla no borra nada.

## 5. Historial

Lo generan triggers de la base de datos, así que se registra aunque alguien use la API directamente. **Nadie puede editarlo ni borrarlo.** Registra:

- Creación de ítems
- Cambios de estado, asignado, prioridad, severidad, sprint, padre, título, descripción, criterios, puntos, horas, fecha y etiquetas (valor anterior → valor nuevo)
- Cancelaciones con su motivo, y reaperturas
- Comentarios, incluidos los datos de GitHub
- Adjuntos agregados y quitados
- Eliminaciones con su motivo y la copia de los datos

Cada ítem tiene su propio historial en la pestaña *Historial*. La vista **Historial** muestra todo el proyecto y se puede filtrar por persona, acción, texto y fechas.

## 6. Comentarios y GitHub

Cada comentario tiene **texto libre** y, si hace falta, datos de GitHub: **repositorio**, **rama**, **enlace del commit** y **enlace del PR**. Los enlaces se muestran como botones que abren GitHub.

Los comentarios no se editan ni se borran, porque forman parte del historial.

## 7. Adjuntos

Sirven para capturas de pantalla y otros archivos de hasta 10 MB. Hay tres formas de subirlos:

- Arrastrar el archivo a la pestaña *Adjuntos*
- Hacer clic en la zona de carga y elegir el archivo
- **Pegar una captura con Ctrl+V**

Las imágenes se ven en miniatura y se amplían al hacer clic. Los archivos quedan en Supabase Storage, en el bucket `adjuntos`.

## 8. Sprints

- Un sprint pasa por tres estados: **Planificado → Activo → Cerrado**. Solo puede haber **un sprint activo** a la vez.
- Al **cerrar** un sprint, la app pregunta a dónde mover los ítems que no se terminaron: al Backlog o a otro sprint planificado.
- Cada sprint muestra su avance: ítems, puntos cerrados sobre el total y porcentaje.
- Los ítems se asignan a un sprint desde el formulario del ítem, o en grupo desde la vista **Backlog**: marcas varios con la casilla y eliges *Mover a sprint…*.

## 9. Vistas

| Vista | Qué muestra |
|---|---|
| **Tablero** | Kanban por estado, con arrastrar y soltar. Por defecto muestra el sprint activo. Soltar un ítem en *Cancelada* pide el motivo |
| **Backlog** | Lista con filtros (texto, tipo, estado, prioridad, persona, sprint), orden por columna y acciones en grupo (mover a sprint, asignar) |
| **Jerarquía** | Árbol Épica → Historia → Tarea/Bug con el % de avance de cada rama |
| **Mis tareas** | Ítems abiertos de la persona que inició sesión, o de cualquier integrante, con conteo de vencidos |
| **Sprints** | Crear, iniciar, cerrar y ver el avance de cada sprint |
| **Historial** | Registro de cambios de todo el proyecto, con filtros |
| **Equipo** | Integrantes, carga de trabajo, agregar, renombrar, quitar o reactivar |

Los cambios se ven **en tiempo real**: si otro integrante mueve una tarea, tu pantalla se actualiza sin recargar.

## 10. Usuarios y permisos

- **Integrantes:** todos tienen el mismo rol y pueden crear, editar, cancelar, eliminar, comentar y gestionar sprints y equipo.
- **Solo pueden registrarse los correos que están en la tabla `members`.** Si alguien más intenta crear una cuenta, el registro falla.
- **Visitante:** desde la pantalla de inicio se entra con *Entrar como visitante*. Puede ver todo en **solo lectura**, pero no ve los correos del equipo.
- **Quitar a un integrante** lo marca como inactivo. Pierde permiso de edición y ya no aparece para asignar, pero su historial se conserva.
- Todo esto lo aplica la base de datos con **Row Level Security (RLS)**, no solo la interfaz. Por eso no importa que la clave pública de Supabase sea visible en el navegador.

Equipo inicial: Edgar Rosario, Kennet Karter, Richard Rodriguez, Vivian Paris y Jonhatan (Jonas).

---

## 11. Instalación

### a) Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → *New project*.
2. Abre `supabase/schema.sql` y, **al final del archivo**, cambia los correos `@cambiar.com` por los reales de cada integrante, en minúsculas.
3. En Supabase ve a *SQL Editor* → *New query*, pega **todo** el archivo y pulsa *Run*.
4. Después ejecuta igual `supabase/notificaciones.sql` (notificaciones, menciones con @ y botón Seguir).

> **Cargas masivas sin notificaciones:** si ejecutas un script que crea o reasigna muchos ítems (por ejemplo `supabase/tareas_presentacion.sql`), pon esta línea al inicio del script para que no se envíe un aviso por cada tarea:
>
> ```sql
> set teamtrack.sin_avisos = 'on';
> ```
>
> Solo afecta a esa sesión del SQL Editor; la app sigue notificando normalmente.

### b) Configurar la autenticación

En *Authentication* → *URL Configuration*, pon en **Site URL** la dirección donde quedará la app. Mientras pruebas en local, usa `http://localhost:5173`.

Para la confirmación de correo tienes dos opciones:

- **Recomendado para un equipo pequeño:** en *Authentication* → *Sign In / Providers* → *Email*, desactiva **Confirm email**. Así cada integrante crea su contraseña y entra de inmediato.
- Si la dejas activada, cada persona debe confirmar su correo antes de entrar.

Si prefieres crear tú las cuentas, ve a *Authentication* → *Users* → *Add user*, marca *Auto Confirm User* y asigna una contraseña temporal. El correo debe estar en `members`.

### c) Ejecutar en tu computadora

Necesitas Node.js 18 o superior.

```bash
cp .env.example .env      # en Windows: copy .env.example .env
# Edita .env con Project URL y anon public key (Supabase > Project Settings > API)
npm install
npm run dev               # abre http://localhost:5173
```

Cada integrante entra por primera vez con **"Primera vez (crear contraseña)"**, usando su correo registrado.

### d) Publicar gratis (Vercel o Netlify)

1. Sube el proyecto a un repositorio de GitHub. El archivo `.env` **no** se sube porque está en `.gitignore`.
2. En Vercel o Netlify, importa el repositorio. Configuración: framework **Vite**, build `npm run build`, carpeta `dist`.
3. Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Copia la URL publicada en *Site URL* de Supabase (paso b).

> **Nota:** en el plan gratuito de Supabase, el proyecto se pausa tras 7 días sin actividad. Se reactiva desde el panel.

## 12. Estructura del proyecto

```
supabase/schema.sql        Base de datos: tablas, reglas, historial, permisos, storage
supabase/notificaciones.sql Notificaciones, menciones (@) y seguidores (se ejecuta después de schema.sql)
src/lib/supabase.js        Cliente de Supabase y mensajes de error
src/lib/constants.js       Tipos, estados, prioridades, colores y formatos
src/lib/store.jsx          Estado global, carga de datos y tiempo real
src/components/            Login, modal del ítem (detalles, comentarios, adjuntos, historial), tarjetas, filtros
src/views/                 Tablero, Backlog, Jerarquía, Mis tareas, Sprints, Historial, Equipo
```

## 13. Tablas de la base de datos

| Tabla | Contenido |
|---|---|
| `members` | Integrantes (nombre, correo, activo, vínculo con su cuenta) |
| `sprints` | Nombre, objetivo, fechas, estado |
| `work_items` | Épicas, historias, tareas y bugs con todos sus campos |
| `comments` | Comentarios y datos de GitHub |
| `attachments` | Metadatos de los archivos (el archivo físico está en Storage) |
| `history` | Registro de cambios (solo lo escriben los triggers) |
