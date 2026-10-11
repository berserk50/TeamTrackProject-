-- =====================================================================
--  TeamTrack — reinicio del tablero para el proyecto "Trámites Migratorios"
--  Repo del proyecto: https://github.com/Death272004/Tr-mites-Migratorios
--  Fuente del backlog: Documentacion/05-backlog-siete-sprints.md
--
--  BORRA todos los ítems, comentarios, adjuntos, historial, avisos y sprints
--  (los miembros se conservan) y carga 10 épicas, 36 historias y 169 tareas.
--  La numeración vuelve a empezar en TT-1.
--
--  Archivo generado: no editar a mano. Ejecutar completo en
--  Supabase > SQL Editor > New query > Run. Es una sola transacción.
-- =====================================================================
begin;

-- Sin avisos durante la carga (nadie recibe 205 notificaciones de asignación)
set local teamtrack.sin_avisos = 'on';

truncate table notifications, item_watchers, comments, attachments, history, work_items, sprints
  restart identity;

-- Los cinco miembros deben existir antes de asignar
do $$
declare
  p text;
begin
  foreach p in array array['Edgar%', 'Jonhatan%', 'Richard%', 'Kennet%', 'Vivian%'] loop
    if (select count(*) from members where full_name ilike p) <> 1 then
      raise exception 'Se esperaba exactamente un miembro que coincida con %', p;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Sprints (una semana cada uno)
-- ---------------------------------------------------------------------
insert into sprints (name, goal, start_date, end_date, status) values
  ('Sprint 1 · Portal del cliente, marco legal y fuentes simuladas', 'disponer del portal completo (P-01…P-27) navegable y con diseño terminado, iniciar el módulo interno (I-01…I-18) o dejarlo listo para el arranque del Sprint 2, y contar con un backend con los contratos de API definidos, las fuentes de verificación simuladas operativas y el marco legal y la matriz de fuentes de verificación documentados.', '2026-09-21', '2026-09-27', 'activo'),
  ('Sprint 2 · Entorno, modelo de datos y autenticación', 'construir el entorno reproducible, el modelo de datos persistente y la autenticación/autorización reales, sustituyendo el login simulado del Sprint 1. Nota: si la HU-05 (módulo interno I-01…I-18) se desplazó del Sprint 1, se completa al inicio de este sprint (fase E/F) antes que las HU-10…HU-14, quedando registrada en el *Registro de cambios del backlog* (§5.1).', '2026-09-28', '2026-10-04', 'planificado'),
  ('Sprint 3 · Expedientes, documentos, consentimiento y ARCO', 'conectar las pantallas de expedientes y documentos con el backend real, cerrando el flujo principal del solicitante y del funcionario, y dejar registrado el consentimiento informado y los derechos ARCO del cliente conforme a la Ley 81 de 2019 y al Decreto Ejecutivo 285 de 2021.', '2026-10-05', '2026-10-11', 'planificado'),
  ('Sprint 4 · Estados, revisión y auditoría', 'garantizar que cada expediente avance solo mediante transiciones válidas y que toda operación crítica quede registrada y sea consultable.', '2026-10-12', '2026-10-18', 'planificado'),
  ('Sprint 5 · Verificación documental y adaptadores', 'demostrar la verificación documental controlada del expediente en modo manual asistido (con responsable humano que registra fuente, fecha y resultado) y en modo simulado con las fuentes del Sprint 1: adaptadores, orquestación de verificaciones, manejo de errores y trazabilidad. La capa de adaptadores queda preparada para una futura automatización sujeta a convenio, sin rehacer el sistema.', '2026-10-19', '2026-10-25', 'planificado'),
  ('Sprint 6 · Seguridad, rendimiento y usabilidad', 'verificar la calidad del producto completo, detectar y corregir vulnerabilidades, cuellos de botella y problemas de uso antes de la aceptación.', '2026-10-26', '2026-11-01', 'planificado'),
  ('Sprint 7 · Aceptación, documentación y entrega', 'cerrar el alcance acordado, validar cada historia, dejar documentación reproducible y presentar el producto.', '2026-11-02', '2026-11-08', 'planificado');

-- ---------------------------------------------------------------------
-- Épicas
-- ---------------------------------------------------------------------
insert into work_items (type, title, description, priority, tags) values
  ('epica', 'EP-01 · Análisis, arquitectura y contratos', 'Definir requisitos, alcance, arquitectura, contratos de API y reglas del sistema.', 'critica', array['EP-01']),
  ('epica', 'EP-02 · Infraestructura y persistencia', 'Preparar el entorno reproducible, base de datos y migraciones.', 'critica', array['EP-02']),
  ('epica', 'EP-03 · Autenticación y control de acceso', 'Proteger el sistema y separar permisos por rol.', 'critica', array['EP-03']),
  ('epica', 'EP-04 · Gestión de expedientes y documentos', 'Registrar, consultar y organizar los expedientes migratorios.', 'critica', array['EP-04']),
  ('epica', 'EP-05 · Flujo de estados y revisión', 'Controlar el ciclo de vida del expediente y las decisiones autorizadas.', 'critica', array['EP-05']),
  ('epica', 'EP-06 · Verificación documental y fuentes externas', 'Definir qué fuentes de verificación aplica el despacho, simularlas para la demostración y normalizar resultados.', 'critica', array['EP-06']),
  ('epica', 'EP-07 · Auditoría, seguridad y privacidad', 'Registrar operaciones y aplicar controles de protección de datos: consentimiento informado, minimización, finalidad y derechos ARCO.', 'critica', array['EP-07']),
  ('epica', 'EP-08 · Pruebas, usabilidad y rendimiento', 'Verificar calidad funcional, seguridad y rendimiento.', 'alta', array['EP-08']),
  ('epica', 'EP-09 · Entrega y documentación', 'Preparar manuales, evidencias y demostración final.', 'alta', array['EP-09']),
  ('epica', 'EP-10 · Frontend y experiencia de usuario', 'Construir todas las pantallas funcionales, la navegación y los estados de interfaz.', 'critica', array['EP-10']);

-- ---------------------------------------------------------------------
-- Historias de usuario (asignadas al rol principal)
-- ---------------------------------------------------------------------
insert into work_items (type, title, description, acceptance_criteria, status, priority, story_points, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('historia', 'HU-01 · Andamiaje del frontend y diseño base', 'Como desarrollador frontend, quiero contar con la estructura base del cliente (layout, navegación, estilos y componentes reutilizables) para que todas las pantallas se construyan sobre un patrón consistente y reutilizable.

Responsable: FE.

Pruebas asociadas: navegación básica y bloqueo de rutas por rol (caso base previo a CP-01/CP-03).', '1. Existe una estructura de carpetas del frontend documentada en el repositorio (vistas, componentes, servicios, estilos, utilidades).
2. El layout incluye encabezado, menú de navegación según rol, área de contenido y pie, y se adapta a escritorio y tablet.
3. La navegación entre las 45 pantallas del inventario oficial (portal P-01…P-27 e interno I-01…I-18, §5.5) funciona sin recargas completas, usa enrutado con hash y respeta el rol activo (un rol no ve enlaces de otros roles).
4. Están implementadas las vistas globales: el login (P-01) y las cuatro vistas de error (403, 404, 500 y error técnico), junto con los modales de confirmación y avisos, estos últimos como componentes globales sin ID de pantalla (§5.5), reutilizables desde cualquier pantalla.
5. Existe una biblioteca mínima de componentes: botones, campos de formulario, tablas, tarjetas de estado, modales, avisos (éxito/error/carga) y paginación.
6. La paleta de colores, tipografía y espaciados están definidos en un único archivo de variables y documentados en `README` del frontend.
7. El frontend se ejecuta con un comando único documentado y no contiene credenciales ni secretos.', 'en_revision', 'critica', 5, '2026-09-27', array['HU-01', 'EP-10', 'FE'], (select id from work_items where title like 'EP-10 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('historia', 'HU-02 · Pantallas de acceso y cuenta (P-01…P-05)', 'Como usuario, quiero registrarme, verificar mi identidad, iniciar sesión, recuperar mi contraseña y gestionar mi perfil para acceder al portal de forma segura.

Responsable: FE.

Pruebas asociadas: CP-01, CP-02.', '1. La pantalla P-01 (inicio de sesión) valida campos obligatorios, formato de correo y muestra/oculta la contraseña.
2. El intento fallido muestra un mensaje genérico que no revela si el usuario existe (compatible con CP-02).
3. Existe bloqueo visual tras intentos repetidos, con contador y mensaje claro.
4. La pantalla P-02 (registro de cuenta) solicita los datos obligatorios, incluye la autorización de tratamiento de datos (Ley 81) y envía código de verificación.
5. La pantalla P-03 (verificación de identidad) consume un OTP simulado (código de 6 dígitos con expiración y número de intentos) sin depender de un proveedor externo.
6. La pantalla P-04 (recuperación de contraseña) solicita correo y muestra confirmación neutra sin revelar existencia de cuentas.
7. La pantalla P-05 (mi perfil) permite actualizar datos de contacto y cambiar la contraseña con verificación de la actual y política de complejidad.
8. Tras iniciar sesión, el menú y la ruta inicial cambian según el rol (portal del cliente o módulo interno del despacho: recepción, analista, resolutor/director, notificador, administrador, auditoría).
9. Cerrar sesión limpia el estado local y redirige a P-01 (`/login`).', 'en_revision', 'critica', 3, '2026-09-27', array['HU-02', 'EP-10', 'FE'], (select id from work_items where title like 'EP-10 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('historia', 'HU-03 · Módulo de solicitante (P-06…P-18)', 'Como solicitante, quiero iniciar, completar y enviar mis solicitudes y documentos desde pantallas claras para evitar viajes repetidos y entregas duplicadas de documentación.

Responsable: FE.

Pruebas asociadas: CP-03, CP-05, CP-12 (interfaz).', '1. P-07 permite seleccionar el tipo de trámite y P-08 registra la titularidad o la representación (poder notariado, parentesco o carácter jurídico), validando los campos obligatorios antes de entrar al asistente.
2. El asistente P-09…P-16 (pasos 1–8) valida campos obligatorios en cada paso, permite avanzar y retroceder sin perder datos y muestra el progreso; P-14 (paso 6) centraliza la carga de requisitos y documentos.
3. P-15 (paso 7, pagos y tasas) funciona con captura simulada de pago y sin pasarela real, y queda marcada como POR CONFIRMAR (§8 del documento de pantallas).
4. P-17 resume y envía la solicitud generando el número de expediente, y P-18 permite reservar la cita presencial, también marcada como POR CONFIRMAR (§8 del documento de pantallas).
5. P-06 (mis trámites) muestra el listado de solicitudes del usuario con filtros por estado y fecha, paginación y estados vacíos/carga/error.
6. P-14 permite adjuntar documentos con selección de tipo documental, validación de formato y tamaño en cliente, barra de progreso y resultado del alta; muestra los documentos ya registrados con estado de revisión y deshabilita la descarga cuando el usuario no tiene permiso.
7. Todas las pantallas del módulo funcionan con datos ficticios locales y tienen implementados los estados de error y de operación en curso.
8. Los mensajes de error explican la causa en lenguaje no técnico y sugieren la acción siguiente.', 'en_revision', 'critica', 8, '2026-09-27', array['HU-03', 'EP-10', 'FE'], (select id from work_items where title like 'EP-10 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('historia', 'HU-04 · Seguimiento del solicitante (P-19…P-27)', 'Como solicitante, quiero consultar el estado de mis solicitudes, atender observaciones, recibir resultados y usar los servicios en línea para seguir mi trámite sin acudir a la ventanilla.

Responsable: FE.

Pruebas asociadas: CP-04, CP-06, CP-07, CP-08, CP-09.', '1. P-19 muestra identificador, tipo de trámite, estado actual con línea de tiempo de avance, fechas clave y responsable asignado.
2. P-20 lista observaciones y notificaciones con fecha, tipo y estado de lectura, sin exponer datos confidenciales en el texto, y permite responder.
3. P-21 (subsanación) admite corregir documentos o datos observados dentro del plazo, con la misma validación de tipo/tamaño que P-14.
4. P-22 muestra los resultados (resoluciones, carné digital y certificados) descargables, con la descarga deshabilitada cuando el usuario no tiene permiso.
5. P-23 lista el historial de pagos con fecha, concepto, monto y estado.
6. P-24 (edictos y citaciones) y P-25 (certificaciones en línea) están navegables pero marcadas como POR CONFIRMAR (§8 del documento de pantallas).
7. P-26 (naturalización) presenta el flujo específico y P-27 (ayuda y FAQ) resuelve dudas y peticiones; ambas son navegables y coherentes con el diseño base.
8. Todas las pantallas del módulo funcionan con datos ficticios locales, tienen implementados los estados de error y de operación en curso, y sus mensajes explican la causa en lenguaje no técnico.', 'pendiente', 'critica', 8, '2026-09-27', array['HU-04', 'EP-10', 'FE'], (select id from work_items where title like 'EP-10 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('historia', 'HU-05 · Módulo interno del despacho (I-01…I-18)', 'Como personal del despacho (recepción, analista, resolutor/director, notificador, administrador y auditoría), quiero contar con las pantallas del módulo interno para recibir, analizar, resolver, notificar y auditar expedientes sin salir del sistema.

Responsable: FE.

Nota de capacidad: esta HU se ejecuta al inicio del Sprint 2 (fase E/F) si la capacidad del Sprint 1 no alcanza; el PO registra el desplazamiento en el *Registro de cambios del backlog* (§5.1).

Pruebas asociadas: CP-09, CP-12.', '1. I-01 exige credenciales institucionales y segundo factor (MFA simulado) para analistas, resolutores y administradores, y registra estación/IP.
2. I-02 (tablero) muestra indicadores operativos y I-03 (bandeja de recepción) lista citas y turnos con filtros, estados de llegada y paginación.
3. I-04 permite verificar completitud con checklist (identidad, pagos, sello, RUEX) y I-05 permite asignar analista con confirmación de la acción sensible.
4. I-06 (análisis con checklist) e I-07 (panel de verificación interoperable) muestran cada verificación con su estado propio (pendiente, en atención manual o enviada, respondida, sin resultado, error técnico, reintento), distinguiendo visualmente el error técnico de un resultado negativo (compatible con CP-07).
5. I-07 ofrece la acción "reintentar" solo cuando el estado lo permite, y avisa que la operación es idempotente (compatible con CP-08).
6. I-08 (observaciones), I-09 (edictos), I-10 (resolución), I-11 (notificación), I-12 (entrega en ventanilla) e I-13 (archivados y reactivación) presentan solo las acciones autorizadas para el rol, exigen motivo en la resolución y piden confirmación antes de enviar.
7. I-14 (catálogos), I-15 (usuarios, roles y permisos) e I-16 (bitácora de auditoría) están restringidos a sus roles; la bitácora permite filtrar por fecha, actor, operación y recurso, con paginación y exportación a CSV.
8. I-17 (reportes y tiempos por etapa) e I-18 (salud de interoperabilidad) muestran indicadores, intentos fallidos y errores técnicos diferenciados de los resultados de verificación; ninguna pantalla del módulo muestra datos de expedientes a usuarios sin permiso (compatible con CP-03 y CP-09).', 'pendiente', 'alta', 5, '2026-09-27', array['HU-05', 'EP-10', 'FE'], (select id from work_items where title like 'EP-10 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('historia', 'HU-06 · Estudio del marco legal y fuentes de verificación', 'Como líder técnico del despacho, quiero determinar qué puede verificar la plataforma legalmente hoy y con qué base, para construir el producto sobre verificaciones trazables, consentimiento informado y minimización de datos (Ley 81 de 2019 y Decreto Ejecutivo 285 de 2021).

Responsables: LT (principal) con PO.

Entregable: `07-marco-legal-y-matriz-fuentes-verificacion.md` (marco legal y matriz de fuentes de verificación, en `Documentacion/`).', '1. Existe una Matriz de fuentes de verificación con una fila por fuente (Tribunal Electoral/Registro Civil, Registro Público, CSS, SNM, documentos aportados por el cliente) y con las columnas obligatorias: fuente → tipo (`PÚBLICA` / `AUTORIZADA` por el titular) → qué se guarda (solo resultado: fuente, fecha, resultado, responsable) → base legal.
2. Queda mapeado qué puede verificar el despacho legalmente hoy: fuentes públicas (cédula del TE, Registro Público) y documentos aportados por el cliente u obtenidos por el despacho con consentimiento o autorización del titular.
3. Queda confirmado y documentado que no hay convenios ni APIs disponibles, y se deja trazado el camino futuro de automatización (convenio con la institución, p. ej. vía AIG) sin rehacer el sistema.
4. Está definido el modelo de consentimiento informado y de tratamiento de datos sensibles (consentimiento expreso), con validación jurídica, e incluye finalidad, alcance, vigencia y revocación (ver HU-18b).
5. La matriz registra para cada fuente: canal de consulta (fuente pública, documento autorizado, futuro convenio), responsable, requisitos legales (Ley 81 de 2019, Decreto 285 de 2021, competencia institucional), dependencia (`NINGUNA`, `AUTORIZACIÓN DEL TITULAR`, `CONVENIO PENDIENTE`) y estado (`VERIFICABLE HOY`, `REQUIERE AUTORIZACIÓN`, `PENDIENTE DE CONVENIO`, `NO APLICABLE`).
6. Se documenta la conclusión operativa: qué mocks se requieren, qué contrato mínimo deben cumplir para reflejar la verificación futura y que el modo de producción es la verificación manual asistida.
7. El estudio no asume ni declara acceso automático a datos institucionales; toda integración automatizada futura queda marcada como pendiente de convenio.
8. El resultado se revisa con el PO (y con asesoría jurídica del despacho) y se enlaza desde la documentación del proyecto.', 'pendiente', 'critica', 5, '2026-09-27', array['HU-06', 'EP-01', 'LT', 'PO'], (select id from work_items where title like 'EP-01 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('historia', 'HU-07 · Contratos de API (OpenAPI) del producto', 'Como equipo técnico, quiero definir los contratos de la API antes de implementarlos para que frontend y backend trabajen en paralelo sobre un acuerdo verificable.

Responsables: LT (principal) con BE.

Entregable: `docs/openapi.yaml` + registro de cambios.', '1. Existe un archivo `openapi.yaml` con al menos: autenticación, expedientes, documentos, estados, verificaciones, consentimiento, auditoría y las fuentes de verificación simuladas (mocks).
2. Cada operación documenta método, ruta, parámetros, cuerpo, respuestas (2xx, 4xx, 5xx) y control de autorización asociado.
3. Los nombres, códigos de estado y errores coinciden con las reglas del Documento 3 (400, 401, 403, 404, 409, 5xx).
4. El contrato incluye los headers de escenario (`X-Scenario`) de las fuentes simuladas.
5. El archivo valida sin errores con un linter de OpenAPI y se versiona en Git.
6. Se acuerda el procedimiento de cambios: toda modificación se registra en el changelog del contrato antes de implementarse.', 'en_revision', 'critica', 3, '2026-09-27', array['HU-07', 'EP-01', 'LT', 'BE'], (select id from work_items where title like 'EP-01 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('historia', 'HU-08 · Fuentes de verificación simuladas (modo manual asistido)', 'Como equipo de desarrollo, quiero exponer fuentes de verificación simuladas de TE, CSS, Registro Público y SNM (mocks) para construir y probar el flujo completo y para que el frontend conecte, sin depender de integraciones reales.

Responsable: BE.

Nota de alcance (RC-02): el modo de producción es la verificación manual asistida: el abogado o analista del despacho registra el resultado de la verificación con fuente, fecha y responsable. Los mocks de esta historia existen (a) para demostrar el flujo extremo a extremo y (b) para representar las futuras integraciones automatizadas con las instituciones, que solo se activarán cuando exista convenio; hasta entonces no hay transferencia automática de datos.

Pruebas asociadas: CP-06, CP-07.', '1. Están implementados y responden los cuatro endpoints de la sección 5.6 (`/api/mock/*`) con datos ficticios coherentes y sin datos personales reales.
2. Cada mock soporta el header `X-Scenario` con, como mínimo, `OK`, `SIN_RESULTADO`, `ERROR_TECNICO`, `TIMEOUT`, `RATE_LIMIT` y `DATOS_INCOMPLETOS`.
3. Las respuestas cumplen el contrato `openapi.yaml` (validado por pruebas de contrato).
4. Los mocks incluyen latencia simulada configurable para poder probar tiempos de espera.
5. Existe un conjunto de datos ficticios maestro (personas, afiliaciones, registros) con identificadores usados por las pantallas de demostración.
6. Los mocks son reemplazables: la capa de integración del producto apunta a una interfaz, no a los mocks directamente (requisito de sustitución por una futura integración autorizada y convenida).
7. El endpoint de SNM simulado devuelve coherencia con los expedientes creados en la plataforma (o explica su desfase en la respuesta).
8. Queda documentado y probado que el registro manual asistido del resultado (fuente, fecha, responsable) produce la misma entidad de verificación que el modo simulado, de modo que la interfaz no cambia al alternar de modo.', 'pendiente', 'critica', 8, '2026-09-27', array['HU-08', 'EP-06', 'BE'], (select id from work_items where title like 'EP-06 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-09 · Integración del frontend con los mocks y estados de interfaz', 'Como usuario, quiero que las pantallas se alimenten de las APIs ficticias y muestren correctamente carga, éxito, vacío y error para verificar el flujo real antes de construir la lógica de negocio.

Responsables: FE (principal) con BE.

Pruebas asociadas: CP-06, CP-07, CP-11 (recorrido base).', '1. Existe un único módulo de servicios HTTP en el frontend (llamadas centralizadas, manejo de token, manejo de errores).
2. Cada pantalla implementa y muestra los cuatro estados: carga, éxito, vacío y error con reintento.
3. I-07 (panel de verificación interoperable) y el bloque de estado de P-19 pueden mostrar los escenarios `OK`, `SIN_RESULTADO`, `ERROR_TECNICO` y `TIMEOUT` usando los mocks, manteniendo la distinción visual entre error técnico y resultado negativo.
4. Los errores HTTP se traducen a mensajes de usuario según el código (401, 403, 404, 409, 5xx) sin filtrar detalles técnicos.
5. El flujo completo navegable con mocks funciona: P-01 (login) → P-07…P-17 (crear solicitud) → P-14 (adjuntar documentos) → P-19 (ver estado) → I-07 (ver verificaciones simuladas).
6. No hay llamadas a endpoints inexistentes ni errores de consola en el recorrido principal.
7. Los fixtures locales comparten el mismo esquema JSON que los mocks del HU-08, de modo que conectar es cambiar la fuente de datos sin reescribir pantallas.', 'pendiente', 'critica', 5, '2026-09-27', array['HU-09', 'EP-10', 'FE', 'BE'], (select id from work_items where title like 'EP-10 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('historia', 'HU-10 · Entorno reproducible', 'Como desarrollador, quiero levantar backend, base de datos y frontend con un solo comando para eliminar diferencias entre entornos y facilitar las pruebas.

Responsables: LT (principal) con BE.

Pruebas asociadas: verificación de instalación limpia (previa a CP-10, entorno).', '1. `docker compose up` levanta backend, PostgreSQL y frontend sin pasos manuales adicionales.
2. El proyecto Java compila y arranca con el comando documentado en el `README` raíz.
3. Las migraciones del esquema se ejecutan automáticamente al arrancar (Flyway o Liquibase) y son reproducibles desde cero.
4. La configuración usa variables de entorno; existe un archivo `.env.example` sin secretos reales.
5. El repositorio contiene `.gitignore` adecuado (secretos, `target/`, node_modules, volúmenes) y no expone credenciales en el historial.
6. Un integrante nuevo del equipo sigue el `README` y consigue el entorno funcionando en menos de 30 minutos.', 'en_revision', 'critica', 5, '2026-10-04', array['HU-10', 'EP-02', 'LT', 'BE'], (select id from work_items where title like 'EP-02 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('historia', 'HU-11 · Modelo de datos e infraestructura de persistencia', 'Como equipo técnico, quiero implementar el modelo de datos con integridad y restricciones para que toda la aplicación se apoye en datos consistentes.

Responsable: BE.

Pruebas asociadas: pruebas de integración de la sección 4.2.', '1. Están implementadas las entidades del Documento 3.4: Usuario, Rol, Expediente, Documento, Verificación y resultado de verificación, Consentimiento informado, Solicitud ARCO, Historial de estados, Evento de auditoría, Notificación.
2. Las relaciones usan claves primarias y foráneas con restricciones de integridad (no nulos, unicidad, eliminación restringida donde aplique).
3. Los repositorios o mappers están separados de los servicios de negocio.
4. Existen datos semilla (seed) para roles, tipos de trámite, tipos documentales y usuarios de demostración por rol.
5. Las consultas de listado por titularidad y estado están probadas con índices adecuados.
6. Ningún dato personal devuelto por una fuente de verificación se almacena cuando basta con el resultado mínimo (fuente, fecha, resultado, responsable); no se conservan copias institucionales (regla de minimización del Documento 3.4, ver HU-25).', 'pendiente', 'critica', 8, '2026-10-04', array['HU-11', 'EP-02', 'BE'], (select id from work_items where title like 'EP-02 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-12 · Autenticación real', 'Como usuario, quiero autenticarme con credenciales reales protegidas para acceder al sistema de forma segura.

Responsable: BE.

Pruebas asociadas: CP-01, CP-02.', '1. `POST /api/auth/login` valida credenciales y devuelve token (o sesión) con expiración definida.
2. Las contraseñas se almacenan con hash adaptativo (BCrypt/Argon2) y nunca en texto plano ni en logs.
3. Existe límite de intentos con bloqueo temporal y mensaje genérico de fallo (compatible con CP-02).
4. El cierre de sesión invalida el token o la sesión (compatible con la limpieza del cliente).
5. El cambio de contraseña exige la contraseña actual y aplica la política de complejidad.
6. Los endpoints protegidos rechazan peticiones sin credenciales con `401` (compatible con CP-01/CP-02).
7. Los secretos de configuración viven fuera del código fuente.', 'pendiente', 'critica', 8, '2026-10-04', array['HU-12', 'EP-03', 'BE'], (select id from work_items where title like 'EP-03 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-13 · Autorización por roles aplicada a los endpoints', 'Como responsable de seguridad, quiero que cada endpoint verifique rol y titularidad para impedir accesos indebidos entre expedientes.

Responsable: BE.

Pruebas asociadas: CP-01, CP-03, CP-09, CP-12.', '1. Están definidos los roles: `SOLICITANTE`, `FUNCIONARIO`, `SUPERVISOR`, `AUDITOR`, `ADMIN`.
2. Cada endpoint tiene una regla de autorización documentada y aplicada en el backend (no solo en la interfaz).
3. Un solicitante solo accede a sus propios expedientes; consultar un expediente ajeno devuelve `404` o `403` sin filtrar datos (compatible con CP-03).
4. Un administrador técnico no obtiene permisos de lectura o decisión de expedientes por defecto.
5. Existen pruebas automatizadas de acceso permitido y denegado por rol y endpoint (matriz de autorización).
6. Los permisos denegados generan evento de auditoría.', 'pendiente', 'critica', 8, '2026-10-04', array['HU-13', 'EP-03', 'BE'], (select id from work_items where title like 'EP-03 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-14 · Manejo de errores y respuestas HTTP coherentes', 'Como consumidor de la API, quiero respuestas HTTP y mensajes de error consistentes y seguros para manejar fallos sin exponer información sensible.

Responsable: BE.

Pruebas asociadas: CP-02, CP-07, CP-11.', '1. Existe un manejador global de excepciones que produce un cuerpo de error uniforme (código, mensaje seguro, trazabilidad interna).
2. Se aplican: `400` entrada inválida, `401` no autenticado, `403` sin permiso, `404` inexistente o no revelable, `409` conflicto de estado, `5xx` fallo interno.
3. Los mensajes no incluyen datos personales, pilas de trazas ni detalles de esquema.
4. Los errores de integración técnica se distinguen de los resultados de validación en el modelo y en la respuesta.
5. Cada error interno deja correlación (ID) que aparece en la respuesta y en los logs para diagnóstico.', 'pendiente', 'alta', 5, '2026-10-04', array['HU-14', 'EP-02', 'BE'], (select id from work_items where title like 'EP-02 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-15 · Registro de expediente', 'Como solicitante, quiero registrar una solicitud migratoria que quede asociada a mi cuenta para iniciar el seguimiento de mi caso dentro del producto.

Responsables: BE (principal) con FE.

Pruebas asociadas: CP-03, CP-05 (validación de entrada).', '1. `POST /api/expedientes` crea el expediente con identificador único, solicitante autenticado, tipo de trámite, fecha de creación y estado inicial `BORRADOR` o `PRESENTADO` según la regla acordada.
2. Los campos obligatorios y el tipo de trámite se validan en el servidor (no solo en el cliente), devolviendo `400` con detalle de campo.
3. Un usuario no puede crear expedientes a nombre de otro (compatible con CP-03).
4. El asistente P-09…P-16 con el envío P-17 consume el endpoint real y muestra éxito/error con el identificador generado.
5. Existen pruebas de creación exitosa, datos inválidos y tentativa de asociación indebida.
6. Cada creación genera evento de auditoría.', 'pendiente', 'critica', 8, '2026-10-11', array['HU-15', 'EP-04', 'BE', 'FE'], (select id from work_items where title like 'EP-04 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-16 · Consulta y seguimiento con filtrado por titularidad', 'Como solicitante y funcionario, quiero consultar mis expedientes y su detalle con los permisos que me corresponden para seguir el avance sin exponer información ajena.

Responsables: BE (principal) con FE.

Pruebas asociadas: CP-03, CP-09.', '1. `GET /api/expedientes` devuelve solo los expedientes accesibles al usuario según rol y titularidad, con filtros por estado, tipo y fecha, y paginación.
2. `GET /api/expedientes/{id}` verifica acceso; un id ajeno responde `404`/`403` sin datos (compatible con CP-03).
3. `GET /api/expedientes/{id}/historial` exige permiso específico de lectura.
4. Las pantallas P-06, P-19, I-03/I-02 e I-06 consumen estos endpoints y mantienen los estados de carga/vacío/error.
5. El rendimiento de listado es aceptable con 1.000 expedientes de prueba (sin N+1 consultas).
6. Las consultas sensibles quedan registradas en auditoría.', 'pendiente', 'critica', 5, '2026-10-11', array['HU-16', 'EP-04', 'BE', 'FE'], (select id from work_items where title like 'EP-04 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-17 · Gestión documental protegida', 'Como solicitante, quiero adjuntar y consultar documentos con validación de tipo, tamaño y permisos para evitar entregas repetidas y accesos indebidos a archivos.

Responsables: BE (principal) con FE.

Pruebas asociadas: CP-05, CP-12.', '1. `POST /api/expedientes/{id}/documentos` acepta archivos validando tipo MIME, tamaño máximo y firma/contenido, rechazando con mensaje seguro (compatible con CP-05).
2. Los metadatos quedan en PostgreSQL y el archivo en almacenamiento protegido; la referencia al archivo no es un enlace público.
3. La descarga exige autorización y está registrada en auditoría (compatible con CP-12).
4. Cada documento queda vinculado al expediente correcto y muestra estado de revisión.
5. El frontend P-14 (paso 6) muestra progreso, éxito y error, e impide el envío de archivos no permitidos.
6. Existen pruebas de archivo válido, tipo no permitido, tamaño excedido y descarga no autorizada.
7. La duplicación se previene: subir un documento tipo ya válido genera aviso de duplicado.', 'pendiente', 'critica', 8, '2026-10-11', array['HU-17', 'EP-04', 'BE', 'FE'], (select id from work_items where title like 'EP-04 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-18 · Notificaciones del expediente', 'Como solicitante, quiero recibir avisos sobre cambios relevantes de mi expediente para actuar a tiempo cuando algo depende de mí.

Responsables: BE (principal) con FE.

Pruebas asociadas: CP-09 (visibilidad), verificación de no exposición de datos.', '1. El servicio de notificaciones es desacoplado: se emite desde los servicios de negocio sin acoplar la lógica.
2. Se generan notificaciones como mínimo ante: cambio a `PENDIENTE DE DOCUMENTOS`, observación del funcionario, resultado de verificación y decisión final.
3. El mensaje no contiene datos confidenciales ni información personal innecesaria.
4. P-20 lista las observaciones y notificaciones del usuario con fecha, tipo y estado de lectura.
5. Marcar como leída actualiza el estado y no duplica eventos.
6. Existen pruebas de generación, contenido seguro y marcado de lectura.', 'pendiente', 'alta', 5, '2026-10-11', array['HU-18', 'EP-04', 'BE', 'FE'], (select id from work_items where title like 'EP-04 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-18b · Consentimiento informado de tratamiento de datos', 'Como bufete de abogados (responsable del tratamiento), quiero registrar el consentimiento informado del cliente antes de tratar sus datos para cumplir con la Ley 81 de 2019 y el Decreto Ejecutivo 285 de 2021 y poder acreditarlo ante una revisión.

Responsables: BE (principal) con FE.

Nota de alcance (RC-02): las pantallas nuevas se habilitan dentro del inventario de 45 pantallas (sección de consentimiento en P-05 *Mi perfil* y bloque de consentimiento en el módulo interno), sin añadir IDs al inventario.

Pruebas asociadas: CP-09 (trazabilidad), CP-11 (no exposición de datos), verificación de limitación del tratamiento.', '1. `POST /api/consentimientos` registra el consentimiento con: titular, responsable (despacho), finalidad, alcance de los datos, base legal, fecha, vigencia y estado (`VIGENTE` o `REVOCADO`).
2. Sin un consentimiento vigente, el sistema limita el tratamiento de los datos del cliente a lo estrictamente contractual (minimización y finalidad): no se usan para otras finalidades ni se comparten.
3. Los datos sensibles exigen consentimiento expreso y quedan marcados como tales; sin él, no se tratan y la operación se rechaza con mensaje claro.
4. El cliente puede ver y revocar su consentimiento desde el portal (P-05): la revocación deja el consentimiento en `REVOCADO`, conserva la evidencia histórica y notifica al despacho.
5. El módulo interno muestra el estado del consentimiento por cliente y por expediente antes de tratar datos o adjuntar documentos sensibles.
6. Todo alta, consulta y revocación genera evento de auditoría con actor, fecha, finalidad, alcance y resultado.
7. Existen pruebas de: alta correcta, tratamiento sin consentimiento vigente (limitado), datos sensibles sin consentimiento expreso (bloqueado), revocación y auditoría.', 'pendiente', 'critica', 5, '2026-10-11', array['HU-18b', 'EP-07', 'BE', 'FE'], (select id from work_items where title like 'EP-07 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-18c · Derechos ARCO desde el portal del cliente', 'Como cliente del despacho, quiero ejercer mis derechos de acceso, rectificación, cancelación y oposición (ARCO) desde el portal para controlar mis datos personales conforme a la Ley 81 de 2019.

Responsables: BE (principal) con FE.

Pruebas asociadas: CP-03 (titularidad), CP-09 (visibilidad), CP-11 (no exposición de datos).', '1. El portal permite crear una solicitud ARCO con tipo (`ACCESO`, `RECTIFICACIÓN`, `CANCELACIÓN`, `OPPOSICIÓN`), descripción/motivo, fecha de creación y estado inicial `RECIBIDA`.
2. La solicitud queda registrada con tipo, fecha y estado, y el cliente solo puede consultar las suyas (titularidad, compatible con CP-03), con historial de estados `RECIBIDA → EN_ATENCION → ATENDIDA` o `RECHAZADA` (con motivo).
3. El despacho recibe la solicitud en el módulo interno (bandeja de atención), con responsable y plazo de atención; el vencimiento se marca con la alerta `FUERA_DE_PLAZO` sobre la solicitud, sin alterar su estado de atención.
4. Las notificaciones asociadas no exponen datos personales del contenido: solo identificador de la solicitud, tipo, estado y fecha.
5. Toda solicitud y cada cambio de estado generan evento de auditoría (actor, fecha, tipo, estado, resultado).
6. Existen pruebas de registro, consulta por titularidad, cambio de estado, control de plazo y no exposición de datos en notificaciones.', 'pendiente', 'alta', 5, '2026-10-11', array['HU-18c', 'EP-07', 'BE', 'FE'], (select id from work_items where title like 'EP-07 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-19 · Máquina de estados y endpoint de transición', 'Como funcionario autorizado, quiero cambiar el estado de un expediente según las reglas del trámite para mantener un proceso consistente y verificable.

Responsable: BE.

Pruebas asociadas: CP-04, CP-09.', '1. `PATCH /api/expedientes/{id}/estado` aplica la matriz de transiciones permitidas por tipo de trámite.
2. Las transiciones se validan en el backend; una transición no permitida responde `409` o `403` y conserva el estado original (compatible con CP-04).
3. No se permite llegar a estados finales (`APROBADO`/`DENEGADO`) sin que se cumplan los controles previos: verificaciones respondidas y requisitos obligatorios completos.
4. Todo cambio registra estado anterior, nuevo, autor, fecha y motivo en el historial.
5. Las transiciones concurrentes sobre el mismo expediente no producen pérdida de actualización (control de versión optimista o bloqueo).
6. Los estados implementados incluyen como mínimo: `BORRADOR`, `PRESENTADO`, `EN_REVISION`, `PENDIENTE_DOCUMENTOS`, `EN_VALIDACION`, `LISTO_DECISION`, `APROBADO`, `DENEGADO`, más los complementarios (`OBSERVADO`, `CANCELADO`, `CERRADO`) si el PO los habilita.
7. Existen pruebas de transiciones válidas, inválidas, concurrentes y de bloqueo por requisitos faltantes.', 'pendiente', 'critica', 8, '2026-10-18', array['HU-19', 'EP-05', 'BE'], (select id from work_items where title like 'EP-05 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-20 · Observaciones y solicitudes de corrección', 'Como funcionario, quiero registrar observaciones para indicar al solicitante qué debe corregir para reducir idas y vueltas.

Responsables: BE (principal) con FE.

Pruebas asociadas: CP-09, CP-04.', '1. Las observaciones se vinculan al expediente, registran autor, fecha y texto obligatorio.
2. Un funcionario solo registra observaciones en expedientes de su ámbito.
3. El solicitante consulta únicamente las observaciones de sus expedientes.
4. Una observación no equivale a decisión final ni cambia de estado automáticamente.
5. I-08 y P-20 muestran el hilo de observaciones y la respuesta del solicitante.
6. Cada registro genera evento de auditoría.', 'pendiente', 'alta', 5, '2026-10-18', array['HU-20', 'EP-05', 'BE', 'FE'], (select id from work_items where title like 'EP-05 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-21 · Historial de estados visible', 'Como solicitante y funcionario, quiero ver la trazabilidad de cambios del expediente para entender quién hizo qué y cuándo.

Responsables: BE (principal) con FE.

Pruebas asociadas: CP-09.', '1. `GET /api/expedientes/{id}/historial` devuelve los eventos en orden con autor, fecha, estado anterior/nuevo y motivo.
2. El acceso exige permiso específico; los eventos no autorizados no se filtran ni se revelan (compatible con CP-09).
3. P-19 y I-06 muestran la línea de tiempo con formato claro.
4. El historial no expone datos sensibles innecesarios (por ejemplo, no muestra documentos completos ni notas internas restringidas).
5. Pruebas de lectura autorizada y denegada en verde.', 'pendiente', 'critica', 5, '2026-10-18', array['HU-21', 'EP-05', 'BE', 'FE'], (select id from work_items where title like 'EP-05 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-22 · Auditoría de operaciones', 'Como auditor autorizado, quiero consultar los eventos críticos del sistema para verificar quién realizó cada operación y cuándo.

Responsables: BE (principal) con FE.

Pruebas asociadas: CP-09, CP-11, indicador de trazabilidad (100 %).', '1. Quedan registrados como mínimo: inicio y cierre de sesión, creación y cambio de estado de expedientes, carga y descarga de documentos, registro y consulta de verificaciones (manual asistido o simuladas), eventos de consentimiento y solicitudes ARCO, y operaciones administrativas.
2. Cada evento contiene actor, operación, recurso, fecha, resultado y datos técnicos de correlación.
3. Los registros están protegidos: solo el rol auditor los consulta y no pueden modificarse desde la API.
4. Los logs no contienen contraseñas, tokens ni datos personales innecesarios (compatible con CP-11).
5. I-16 permite filtrar por fecha, actor, operación y recurso con paginación y exportación CSV.
6. Existe prueba de integridad: las operaciones críticas esperadas aparecen registradas (meta: 100 %).', 'pendiente', 'critica', 8, '2026-10-18', array['HU-22', 'EP-07', 'BE', 'FE'], (select id from work_items where title like 'EP-07 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-23 · Adaptadores de fuentes de verificación', 'Como sistema, quiero acceder a las fuentes de verificación mediante adaptadores independientes para poder sustituir una fuente simulada por una futura integración autorizada y convenida (p. ej. vía AIG) sin tocar la lógica del expediente, y para registrar hoy las verificaciones en modo manual asistido.

Responsable: BE.

Pruebas asociadas: CP-06, CP-07.', '1. Existe una interfaz (puerto) por fuente de verificación: `TePort`, `CssPort`, `RegistroPublicoPort`, con implementación sobre los mocks del Sprint 1 y una implementación de registro manual asistido (responsable humano).
2. Cada adaptador traduce la respuesta o el registro manual a un formato normalizado compartido (fuente, resultado, referencia, fecha, responsable, estado técnico).
3. La lógica de negocio del expediente no importa clases de los mocks ni conoce rutas concretas (desacoplamiento verificable en el código).
4. Cada adaptador tiene configuración de timeout y reintentos por fuente, que solo aplica al modo simulado.
5. Existen pruebas de contrato por adaptador: respuesta válida, sin resultado, error técnico y timeout (compatible con CP-06 y CP-07), más una prueba del registro manual asistido.
6. Está documentado cómo sustituir el modo simulado por una futura integración automática autorizada y convenida (requisitos, configuración y contratos), dejando constancia de que hoy no existe convenio ni API disponible.', 'pendiente', 'critica', 8, '2026-10-25', array['HU-23', 'EP-06', 'BE'], (select id from work_items where title like 'EP-06 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-24 · Orquestación de verificaciones con reintentos e idempotencia', 'Como analista del despacho, quiero que el sistema determine qué verificaciones documentales aplican y gestione su registro y sus fallos sin duplicar operaciones para confiar en los resultados y no repetir trabajo.

Responsable: BE.

Pruebas asociadas: CP-06, CP-07, CP-08.', '1. El backend determina qué verificaciones aplican según el tipo de trámite y las crea como entidades con estados propios: `PENDIENTE`, `EN_ATENCION` (manual asistido), `ENVIADA` (modo simulado), `RESPONDIDA`, `SIN_RESULTADO`, `ERROR_TECNICO`, `REINTENTO_PROGRAMADO`.
2. Cada verificación puede crearse en modo manual asistido (con responsable humano que registra fuente, fecha y resultado) o en modo simulado (fuentes simuladas del Sprint 1); el modo queda registrado en la entidad.
3. Los estados de la verificación son independientes del estado del expediente.
4. Un error técnico jamás se convierte en resultado negativo ni dispara aprobación/denegación (compatible con CP-07).
5. Los reintentos son limitados, programados y usan idempotencia: una petición repetida no crea operaciones duplicadas (compatible con CP-08); el reintento solo aplica al modo simulado.
6. Cada verificación guarda fuente, finalidad, fecha, responsable, referencia de correlación, estado técnico y resultado mínimo.
7. Existen pruebas de indisponibilidad, timeout, respuesta inválida, idempotencia y registro manual asistido con responsable.', 'pendiente', 'critica', 8, '2026-10-25', array['HU-24', 'EP-06', 'BE'], (select id from work_items where title like 'EP-06 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-25 · Minimización y trazabilidad de verificaciones', 'Como responsable de protección de datos del despacho, quiero limitar los datos que se envían o se registran y dejar la finalidad de cada verificación para reducir la exposición de información personal (Ley 81 de 2019 y Decreto 285 de 2021).

Responsables: BE (principal) con LT.

Pruebas asociadas: CP-11, indicador de trazabilidad.', '1. Existe una matriz de fuentes y finalidad (fuente → finalidad → base legal → responsable → qué se guarda) derivada del marco legal del Sprint 1 (HU-06).
2. Antes de emitir o registrar una verificación se valida permiso y finalidad; sin ellos, la verificación no se realiza.
3. Las solicitudes o registros contienen únicamente los campos autorizados en la matriz.
4. Las respuestas se guardan con el resultado mínimo (fuente, fecha, resultado, responsable); no se almacenan copias de la información institucional ni bloques completos de datos personales.
5. Los registros de integración y los logs no incluyen datos personales innecesarios.
6. Pruebas que verifican el contenido efectivo de la petición o del registro manual y la trazabilidad completa de la verificación.', 'pendiente', 'critica', 5, '2026-10-25', array['HU-25', 'EP-07', 'BE', 'LT'], (select id from work_items where title like 'EP-07 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('historia', 'HU-26 · Panel de verificaciones conectado en el flujo real', 'Como analista del despacho y cliente, quiero ver el estado real de las verificaciones en el expediente para saber qué falta y cuándo se puede decidir.

Responsables: FE (principal) con BE.

Pruebas asociadas: CP-06, CP-07, CP-08.', '1. `POST` y `GET /api/expedientes/{id}/validaciones` quedan conectados a I-07 y al bloque correspondiente de P-19.
2. La UI muestra cada verificación con su fuente, modo (manual asistido o simulado), fecha, responsable, estado técnico y resultado cuando exista.
3. El error técnico se distingue visualmente del resultado negativo (color, icono y texto explicativo) — compatible con CP-07.
4. La acción de reintento aparece solo en estados permitidos y muestra el resultado del reintento (compatible con CP-08).
5. El cliente ve el estado agregado sin exponer detalles internos innecesarios.
6. Recorrido completo de demostración: expediente → verificaciones (manual asistido y simuladas) → decisión del responsable.', 'pendiente', 'critica', 8, '2026-10-25', array['HU-26', 'EP-06', 'FE', 'BE'], (select id from work_items where title like 'EP-06 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('historia', 'HU-27 · Pruebas automatizadas', 'Como equipo, quiero contar con una suite automatizada ejecutable en un comando para detectar regresiones antes de cada entrega.

Responsables: QA (principal) con BE.

Pruebas asociadas: CP-01…CP-09, CP-12.', '1. Existen pruebas unitarias (JUnit/Mockito) de reglas de negocio, transiciones y verificaciones, con los casos críticos cubiertos.
2. Existen pruebas de API que verifican contratos, códigos de estado y errores de la sección 3.6.
3. Existen pruebas de integración con base de datos y mocks en contenedor (Docker).
4. La suite completa se ejecuta con un comando documentado y termina en menos de 10 minutos.
5. La cobertura de los módulos críticos (estados, autorización, verificaciones) es al menos del 70 %, medida y reportada.
6. Las pruebas no dependen de datos externos ni de la red pública.', 'pendiente', 'critica', 8, '2026-11-01', array['HU-27', 'EP-08', 'QA', 'BE'], (select id from work_items where title like 'EP-08 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('historia', 'HU-28 · Validación de seguridad con OWASP ZAP', 'Como responsable de seguridad, quiero analizar la aplicación y corregir hallazgos para entregar sin vulnerabilidades críticas o altas.

Responsables: QA (principal) con BE.

Pruebas asociadas: CP-11, CP-03, CP-12.', '1. Se ejecuta un escaneo activo y pasivo de OWASP ZAP sobre el entorno de pruebas con la sesión autenticada por rol.
2. Se revisan cabeceras de seguridad, control de acceso, validación de entradas, manejo de errores, sesiones y endpoints REST.
3. Cada hallazgo tiene ID, severidad, responsable, estado y fecha de corrección.
4. Se corrigen todas las vulnerabilidades críticas y altas, y se repite el escaneo tras las correcciones (compatible con CP-11).
5. Se verifica que las respuestas, errores y logs no expongan datos personales.
6. Se emite un informe de seguridad con riesgos residuales y recomendaciones.', 'pendiente', 'critica', 8, '2026-11-01', array['HU-28', 'EP-08', 'QA', 'BE'], (select id from work_items where title like 'EP-08 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('historia', 'HU-29 · Pruebas de rendimiento con JMeter', 'Como responsable de QA, quiero medir el comportamiento bajo carga para detectar cuellos de botella antes de la entrega.

Responsables: QA (principal) con BE.

Pruebas asociadas: CP-10.', '1. Existe un escenario de carga documentado: equipo, usuarios concurrentes, duración, datos y operaciones.
2. Se registran como mínimo: tiempo medio, P95, solicitudes/segundo, % de errores HTTP, CPU/memoria y latencia de los mocks.
3. El P95 de las operaciones principales se compara con el umbral acordado (referencia: ≤ 2 s bajo carga de referencia).
4. Se prueba la indisponibilidad de una dependencia y se verifica que el sistema la maneje sin caída.
5. Las incidencias de rendimiento tienen plan de corrección con responsable.
6. Se emite un informe con métricas, conclusiones y umbrales confirmados.', 'pendiente', 'alta', 8, '2026-11-01', array['HU-29', 'EP-08', 'QA', 'BE'], (select id from work_items where title like 'EP-08 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('historia', 'HU-30 · Evaluación de usabilidad y mejoras de interfaz', 'Como usuario, quiero completar las tareas principales sin ayuda para que el producto sea comprensible y eficiente.

Responsables: FE (principal) con QA.

Pruebas asociadas: indicador de usabilidad del Documento 2.', '1. Existen tareas de evaluación definidas con el PO: crear expediente, adjuntar documento, consultar estado, revisar y decidir.
2. Se realizan sesiones con usuarios de prueba (mínimo 5) registrando tiempo, errores y dificultades.
3. Meta: al menos el 90 % de las tareas críticas se completan sin asistencia en el escenario evaluado.
4. Los formularios explican campos obligatorios y errores con mensajes claros.
5. Se corrigen los problemas prioritarios identificados y se repiten las tareas críticas.
6. Se verifica uso en escritorio y tablet, y coherencia de mensajes entre pantallas.', 'pendiente', 'alta', 6, '2026-11-01', array['HU-30', 'EP-08', 'FE', 'QA'], (select id from work_items where title like 'EP-08 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('historia', 'HU-31 · Pruebas de aceptación y regresión', 'Como Product Owner, quiero verificar cada historia y las funciones críticas para aceptar una versión que cumpla el alcance acordado.

Responsables: PO (principal) con QA.

Pruebas asociadas: CP-01…CP-12 (regresión integral).', '1. Existe la lista de historias del proyecto con su estado y su criterio de aceptación asociado.
2. Se ejecutan los escenarios de aceptación acordados con el PO para cada historia cerrada.
3. Todas las pruebas críticas del plan de pruebas (CP-01…CP-12) pasan con evidencia.
4. Se ejecuta una regresión completa tras las últimas correcciones.
5. Las limitaciones y errores conocidos quedan documentados con severidad y justificación.
6. El PO registra la aceptación o el bloqueo de cada historia, y la aceptación final queda documentada.', 'pendiente', 'critica', 8, '2026-11-08', array['HU-31', 'EP-08', 'PO', 'QA'], (select id from work_items where title like 'EP-08 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('historia', 'HU-32 · Documentación técnica y de usuario', 'Como integrante del equipo, quiero documentación clara para instalar, ejecutar, probar y comprender el sistema para que la entrega sea sostenible y auditable.

Responsables: DOC (principal) con LT.

Pruebas asociadas: verificación de documentación (revisión del PO).', '1. Guía de instalación y ejecución paso a paso verificada en una máquina nueva.
2. API documentada en OpenAPI actualizada al estado final del código.
3. Documentación de roles, estados, módulos, reglas de negocio y limitaciones del producto.
4. Diagramas actualizados: arquitectura lógica, modelo de datos, flujo de verificación documental.
5. Manuales: técnico (para mantenimiento) y de usuario (por rol) con capturas.
6. Resultados de pruebas: informes de seguridad, rendimiento y usabilidad consolidados.
7. Registro de decisiones técnicas y del marco legal y la matriz de fuentes de verificación.', 'pendiente', 'alta', 5, '2026-11-08', array['HU-32', 'EP-09', 'DOC', 'LT'], (select id from work_items where title like 'EP-09 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('historia', 'HU-33 · Instalación limpia y empaquetado de la entrega', 'Como evaluador, quiero instalar el proyecto desde cero siguiendo la documentación para comprobar que la entrega es reproducible.

Responsables: LT (principal) con BE.

Pruebas asociadas: verificación de instalación limpia.', '1. `git clone` + `docker compose up` levanta el sistema completo en una máquina limpia siguiendo solo el `README`.
2. Los datos semilla cargan correctamente y permiten entrar con los usuarios de demostración de cada rol.
3. No hay secretos, rutas absolutas ni dependencias locales no documentadas.
4. El recorrido principal de demostración funciona en la instalación limpia.
5. Se genera una etiqueta (tag) de versión en Git con el estado de la entrega.
6. Se documentan los pasos de verificación de la instalación limpia como evidencia.', 'pendiente', 'critica', 5, '2026-11-08', array['HU-33', 'EP-09', 'LT', 'BE'], (select id from work_items where title like 'EP-09 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('historia', 'HU-34 · Demostración y evaluación final', 'Como equipo de proyecto, quiero demostrar el producto y presentar los resultados frente a los objetivos para cerrar la entrega con evidencias.

Responsables: PO (principal) con equipo.

Pruebas asociadas: validación de indicadores del Documento 2.', '1. Existe un escenario de demostración con datos ficticios preparado (cliente, despacho, verificaciones con distintos escenarios).
2. Se demuestra el flujo completo: login → creación de expediente → documentos → consentimiento → verificaciones (manual asistido y simuladas) → observación → decisión → notificación → derechos ARCO.
3. Se presentan las métricas del plan de acción medidas en el producto y en el despacho, sin afirmar resultados no medidos sobre el proceso migratorio oficial (los plazos oficiales, del orden de 3–8 meses, son referencia externa del proceso, no meta del producto).
4. Se exponen explícitamente las limitaciones: verificación en modo manual asistido, ausencia de convenios y APIs con instituciones (la integración automática es evolución futura sujeta a convenio), alcance del MVP y datos de demostración ficticios.
5. El Product Owner valida los entregables finales y firma (o registra) la aceptación de la entrega.
6. La presentación final y el informe de resultados quedan en el repositorio.', 'pendiente', 'alta', 6, '2026-11-08', array['HU-34', 'EP-09', 'PO', 'equipo'], (select id from work_items where title like 'EP-09 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%'));

-- ---------------------------------------------------------------------
-- Tareas (cuelgan de su historia; mismo sprint y prioridad)
-- ---------------------------------------------------------------------
-- HU-01
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-01.1 · Crear la estructura de carpetas del frontend (alineada al inventario P-01…P-27 e I-01…I-18) y el archivo de…', 'Crear la estructura de carpetas del frontend (alineada al inventario P-01…P-27 e I-01…I-18) y el archivo de variables de diseño (colores, tipografía, espaciados).

Responsable: FE.', 'en_revision', 'critica', 3, '2026-09-27', array['HU-01', 'FE'], (select id from work_items where title like 'HU-01 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-01.2 · Implementar el layout base: encabezado, menú lateral/top por rol, área de contenido y pie.', 'Implementar el layout base: encabezado, menú lateral/top por rol, área de contenido y pie.

Responsable: FE.', 'en_revision', 'critica', 5, '2026-09-27', array['HU-01', 'FE'], (select id from work_items where title like 'HU-01 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-01.3 · Implementar el enrutado con hash y la protección de rutas por rol (redirect a P-01 o a la vista de error…', 'Implementar el enrutado con hash y la protección de rutas por rol (redirect a P-01 o a la vista de error 403), incluyendo las vistas globales: login (P-01) y errores (403, 404, 500 y error técnico).

Responsable: FE.', 'en_revision', 'critica', 4, '2026-09-27', array['HU-01', 'FE'], (select id from work_items where title like 'HU-01 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-01.4 · Desarrollar la biblioteca de componentes reutilizables (botones, inputs, tablas, modales de confirmación…', 'Desarrollar la biblioteca de componentes reutilizables (botones, inputs, tablas, modales de confirmación, avisos, paginación).

Responsable: FE.', 'en_revision', 'critica', 8, '2026-09-27', array['HU-01', 'FE'], (select id from work_items where title like 'HU-01 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-01.5 · Documentar el diseño base, las convenciones y la correspondencia rutas ↔ IDs del inventario en el README del…', 'Documentar el diseño base, las convenciones y la correspondencia rutas ↔ IDs del inventario en el `README` del frontend.

Responsables: DOC (principal) con FE.', 'en_revision', 'critica', 2, '2026-09-27', array['HU-01', 'DOC', 'FE'], (select id from work_items where title like 'HU-01 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Richard%'));
-- HU-02
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-02.1 · Construir la pantalla P-01 con validaciones de formulario en cliente.', 'Construir la pantalla P-01 con validaciones de formulario en cliente.

Responsable: FE.', 'en_revision', 'critica', 4, '2026-09-27', array['HU-02', 'FE'], (select id from work_items where title like 'HU-02 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-02.2 · Construir las pantallas P-02 (registro), P-03 (OTP simulado), P-04 (recuperación de contraseña) y P-05 (mi…', 'Construir las pantallas P-02 (registro), P-03 (OTP simulado), P-04 (recuperación de contraseña) y P-05 (mi perfil) con sus estados de carga, éxito y error.

Responsable: FE.', 'en_revision', 'critica', 4, '2026-09-27', array['HU-02', 'FE'], (select id from work_items where title like 'HU-02 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-02.3 · Implementar el gestor de sesión en el cliente (almacenamiento del token, expiración, cierre de sesión).', 'Implementar el gestor de sesión en el cliente (almacenamiento del token, expiración, cierre de sesión).

Responsable: FE.', 'en_revision', 'critica', 4, '2026-09-27', array['HU-02', 'FE'], (select id from work_items where title like 'HU-02 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-02.4 · Adaptar el layout y el menú al rol autenticado y a los cambios de rol.', 'Adaptar el layout y el menú al rol autenticado y a los cambios de rol.

Responsable: FE.', 'en_revision', 'critica', 3, '2026-09-27', array['HU-02', 'FE'], (select id from work_items where title like 'HU-02 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%'));
-- HU-03
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-03.1 · Construir el asistente P-09…P-16 (pasos 1–8) y P-17 (resumen y envío) con validaciones por paso y revisión…', 'Construir el asistente P-09…P-16 (pasos 1–8) y P-17 (resumen y envío) con validaciones por paso y revisión final.

Responsable: FE.', 'en_revision', 'critica', 8, '2026-09-27', array['HU-03', 'FE'], (select id from work_items where title like 'HU-03 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-03.2 · Construir P-06 (mis trámites) con filtros, paginación y estados vacío/carga/error.', 'Construir P-06 (mis trámites) con filtros, paginación y estados vacío/carga/error.

Responsable: FE.', 'en_revision', 'critica', 5, '2026-09-27', array['HU-03', 'FE'], (select id from work_items where title like 'HU-03 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-03.3 · Construir P-07 (selección de trámite) y P-08 (titularidad y representación) como puerta de entrada al…', 'Construir P-07 (selección de trámite) y P-08 (titularidad y representación) como puerta de entrada al asistente.

Responsable: FE.', 'en_revision', 'critica', 6, '2026-09-27', array['HU-03', 'FE'], (select id from work_items where title like 'HU-03 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-03.4 · Construir P-14 (paso 6: carga de documentos) con validación de tipo/tamaño y listado de documentos.', 'Construir P-14 (paso 6: carga de documentos) con validación de tipo/tamaño y listado de documentos.

Responsable: FE.', 'en_revision', 'critica', 8, '2026-09-27', array['HU-03', 'FE'], (select id from work_items where title like 'HU-03 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-03.5 · Construir P-15 (pagos, captura simulada) y P-18 (reserva de cita), ambas marcadas POR CONFIRMAR según el §8…', 'Construir P-15 (pagos, captura simulada) y P-18 (reserva de cita), ambas marcadas POR CONFIRMAR según el §8 del documento de pantallas.

Responsable: FE.', 'en_revision', 'critica', 3, '2026-09-27', array['HU-03', 'FE'], (select id from work_items where title like 'HU-03 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-03.6 · Definir los datos ficticios de demostración del solicitante (fixtures) y su fuente única.', 'Definir los datos ficticios de demostración del solicitante (fixtures) y su fuente única.

Responsable: FE.', 'pendiente', 'critica', 2, '2026-09-27', array['HU-03', 'FE'], (select id from work_items where title like 'HU-03 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%'));
-- HU-04
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-04.1 · Construir P-19 con línea de tiempo de estados, bloque de fechas y responsable.', 'Construir P-19 con línea de tiempo de estados, bloque de fechas y responsable.

Responsable: FE.', 'pendiente', 'critica', 6, '2026-09-27', array['HU-04', 'FE'], (select id from work_items where title like 'HU-04 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-04.2 · Construir P-20 (observaciones y notificaciones) reutilizando el componente de detalle y con hilo de…', 'Construir P-20 (observaciones y notificaciones) reutilizando el componente de detalle y con hilo de comentarios.

Responsable: FE.', 'pendiente', 'critica', 5, '2026-09-27', array['HU-04', 'FE'], (select id from work_items where title like 'HU-04 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-04.3 · Construir P-21 (subsanación) y P-22 (resultados: resoluciones, carné digital y certificados).', 'Construir P-21 (subsanación) y P-22 (resultados: resoluciones, carné digital y certificados).

Responsable: FE.', 'pendiente', 'critica', 6, '2026-09-27', array['HU-04', 'FE'], (select id from work_items where title like 'HU-04 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-04.4 · Construir P-23 (historial de pagos) y P-24 (edictos y citaciones, POR CONFIRMAR).', 'Construir P-23 (historial de pagos) y P-24 (edictos y citaciones, POR CONFIRMAR).

Responsable: FE.', 'pendiente', 'critica', 5, '2026-09-27', array['HU-04', 'FE'], (select id from work_items where title like 'HU-04 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-04.5 · Construir P-25 (certificaciones en línea, POR CONFIRMAR), P-26 (naturalización) y P-27 (ayuda y FAQ).', 'Construir P-25 (certificaciones en línea, POR CONFIRMAR), P-26 (naturalización) y P-27 (ayuda y FAQ).

Responsable: FE.', 'pendiente', 'critica', 6, '2026-09-27', array['HU-04', 'FE'], (select id from work_items where title like 'HU-04 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%'));
-- HU-05
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-05.1 · Construir I-01 (login institucional con MFA simulado) e I-02 (tablero) con indicadores.', 'Construir I-01 (login institucional con MFA simulado) e I-02 (tablero) con indicadores.

Responsable: FE.', 'pendiente', 'alta', 6, '2026-09-27', array['HU-05', 'FE'], (select id from work_items where title like 'HU-05 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-05.2 · Construir I-03 (bandeja de recepción), I-04 (recepción y completitud) e I-05 (asignación de analista).', 'Construir I-03 (bandeja de recepción), I-04 (recepción y completitud) e I-05 (asignación de analista).

Responsable: FE.', 'pendiente', 'alta', 5, '2026-09-27', array['HU-05', 'FE'], (select id from work_items where title like 'HU-05 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-05.3 · Construir I-06 (análisis con checklist) e I-07 (panel de verificación interoperable) con estados de…', 'Construir I-06 (análisis con checklist) e I-07 (panel de verificación interoperable) con estados de verificación y reintento.

Responsable: FE.', 'pendiente', 'alta', 6, '2026-09-27', array['HU-05', 'FE'], (select id from work_items where title like 'HU-05 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-05.4 · Construir I-08 a I-13 (observaciones, edictos, resolución, notificación, entrega y archivados) con acciones…', 'Construir I-08 a I-13 (observaciones, edictos, resolución, notificación, entrega y archivados) con acciones por rol.

Responsable: FE.', 'pendiente', 'alta', 4, '2026-09-27', array['HU-05', 'FE'], (select id from work_items where title like 'HU-05 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-05.5 · Construir I-14 a I-18 (catálogos, usuarios/roles/permisos, bitácora, reportes y salud de interoperabilidad).', 'Construir I-14 a I-18 (catálogos, usuarios/roles/permisos, bitácora, reportes y salud de interoperabilidad).

Responsable: FE.', 'pendiente', 'alta', 4, '2026-09-27', array['HU-05', 'FE'], (select id from work_items where title like 'HU-05 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%'));
-- HU-06
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-06.1 · Definir la plantilla de la matriz de fuentes de verificación y sus columnas obligatorias (fuente, tipo, qué…', 'Definir la plantilla de la matriz de fuentes de verificación y sus columnas obligatorias (fuente, tipo, qué se guarda, base legal).

Responsable: LT.', 'pendiente', 'critica', 2, '2026-09-27', array['HU-06', 'LT'], (select id from work_items where title like 'HU-06 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-06.2 · Mapear qué puede verificar el despacho hoy: fuentes públicas (cédula TE, Registro Público, consultas SNM) y…', 'Mapear qué puede verificar el despacho hoy: fuentes públicas (cédula TE, Registro Público, consultas SNM) y documentos aportados u obtenidos con consentimiento o autorización del titular.

Responsable: LT.', 'pendiente', 'critica', 8, '2026-09-27', array['HU-06', 'LT'], (select id from work_items where title like 'HU-06 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-06.3 · Confirmar la inexistencia de convenios o APIs disponibles, documentar el camino futuro (AIG) y registrar las…', 'Confirmar la inexistencia de convenios o APIs disponibles, documentar el camino futuro (AIG) y registrar las restricciones legales por fuente (finalidad, base legal, minimización).

Responsables: LT (principal) con PO.', 'pendiente', 'critica', 4, '2026-09-27', array['HU-06', 'LT', 'PO'], (select id from work_items where title like 'HU-06 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-06.4 · Definir el modelo de consentimiento informado y de tratamiento de datos sensibles con validación jurídica, y…', 'Definir el modelo de consentimiento informado y de tratamiento de datos sensibles con validación jurídica, y derivar de la matriz los contratos y escenarios de las fuentes simuladas.

Responsables: LT (principal) con BE.', 'pendiente', 'critica', 3, '2026-09-27', array['HU-06', 'LT', 'BE'], (select id from work_items where title like 'HU-06 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-06.5 · Socializar resultados con el PO y publicar el marco legal y la matriz en la documentación.', 'Socializar resultados con el PO y publicar el marco legal y la matriz en la documentación.

Responsables: LT (principal) con DOC.', 'pendiente', 'critica', 2, '2026-09-27', array['HU-06', 'LT', 'DOC'], (select id from work_items where title like 'HU-06 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Kennet%'));
-- HU-07
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-07.1 · Definir esquemas de datos compartidos (Expediente, Documento, Validación, Evento de auditoría, Error).', 'Definir esquemas de datos compartidos (Expediente, Documento, Validación, Evento de auditoría, Error).

Responsable: LT.', 'en_revision', 'critica', 4, '2026-09-27', array['HU-07', 'LT'], (select id from work_items where title like 'HU-07 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-07.2 · Escribir las operaciones de autenticación, expedientes y documentos.', 'Escribir las operaciones de autenticación, expedientes y documentos.

Responsable: BE.', 'en_revision', 'critica', 4, '2026-09-27', array['HU-07', 'BE'], (select id from work_items where title like 'HU-07 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-07.3 · Escribir las operaciones de estados, verificaciones, consentimiento, auditoría y mocks.', 'Escribir las operaciones de estados, verificaciones, consentimiento, auditoría y mocks.

Responsable: BE.', 'en_revision', 'critica', 4, '2026-09-27', array['HU-07', 'BE'], (select id from work_items where title like 'HU-07 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-07.4 · Validar el archivo con linter, corregir y versionar.', 'Validar el archivo con linter, corregir y versionar.

Responsable: BE.', 'en_revision', 'critica', 2, '2026-09-27', array['HU-07', 'BE'], (select id from work_items where title like 'HU-07 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%'));
-- HU-08
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-08.1 · Definir el modelo de datos ficticios maestro y su fuente única (fixture versionada).', 'Definir el modelo de datos ficticios maestro y su fuente única (fixture versionada).

Responsable: BE.', 'pendiente', 'critica', 4, '2026-09-27', array['HU-08', 'BE'], (select id from work_items where title like 'HU-08 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-08.2 · Implementar el mock del TE con sus escenarios.', 'Implementar el mock del TE con sus escenarios.

Responsable: BE.', 'pendiente', 'critica', 6, '2026-09-27', array['HU-08', 'BE'], (select id from work_items where title like 'HU-08 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-08.3 · Implementar el mock de la CSS con sus escenarios.', 'Implementar el mock de la CSS con sus escenarios.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-09-27', array['HU-08', 'BE'], (select id from work_items where title like 'HU-08 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-08.4 · Implementar el mock del Registro Público con sus escenarios.', 'Implementar el mock del Registro Público con sus escenarios.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-09-27', array['HU-08', 'BE'], (select id from work_items where title like 'HU-08 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-08.5 · Implementar el mock del SNM y la lógica de escenarios y latencia simulada.', 'Implementar el mock del SNM y la lógica de escenarios y latencia simulada.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-09-27', array['HU-08', 'BE'], (select id from work_items where title like 'HU-08 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-08.6 · Escribir pruebas de contrato de cada mock contra openapi.yaml.', 'Escribir pruebas de contrato de cada mock contra `openapi.yaml`.

Responsables: BE (principal) con QA.', 'pendiente', 'critica', 5, '2026-09-27', array['HU-08', 'BE', 'QA'], (select id from work_items where title like 'HU-08 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-08.7 · Documentar el uso de los mocks y de X-Scenario para el equipo, dejando explícito que el modo de producción es…', 'Documentar el uso de los mocks y de `X-Scenario` para el equipo, dejando explícito que el modo de producción es la verificación manual asistida y que los mocks representan futuras integraciones sujetas a convenio.

Responsable: DOC.', 'pendiente', 'critica', 2, '2026-09-27', array['HU-08', 'DOC'], (select id from work_items where title like 'HU-08 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Richard%'));
-- HU-09
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-09.1 · Implementar el módulo de servicios HTTP con manejo centralizado de errores y token.', 'Implementar el módulo de servicios HTTP con manejo centralizado de errores y token.

Responsable: FE.', 'pendiente', 'critica', 5, '2026-09-27', array['HU-09', 'FE'], (select id from work_items where title like 'HU-09 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-09.2 · Sustituir los fixtures locales por llamadas a los mocks en las pantallas del solicitante.', 'Sustituir los fixtures locales por llamadas a los mocks en las pantallas del solicitante.

Responsable: FE.', 'pendiente', 'critica', 6, '2026-09-27', array['HU-09', 'FE'], (select id from work_items where title like 'HU-09 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-09.3 · Sustituir los fixtures locales por llamadas a los mocks en las pantallas del módulo interno (I-01…I-18).', 'Sustituir los fixtures locales por llamadas a los mocks en las pantallas del módulo interno (I-01…I-18).

Responsable: FE.', 'pendiente', 'critica', 6, '2026-09-27', array['HU-09', 'FE'], (select id from work_items where title like 'HU-09 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-09.4 · Implementar el selector de escenarios en la UI de demostración para forzar errores de los mocks.', 'Implementar el selector de escenarios en la UI de demostración para forzar errores de los mocks.

Responsable: FE.', 'pendiente', 'critica', 3, '2026-09-27', array['HU-09', 'FE'], (select id from work_items where title like 'HU-09 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-09.5 · Recorrer el flujo completo y corregir incidencias (errores de consola, estados faltantes).', 'Recorrer el flujo completo y corregir incidencias (errores de consola, estados faltantes).

Responsables: FE (principal) con QA.', 'pendiente', 'critica', 4, '2026-09-27', array['HU-09', 'FE', 'QA'], (select id from work_items where title like 'HU-09 ·%'), (select id from sprints where name like 'Sprint 1 ·%'), (select id from members where full_name ilike 'Jonhatan%'));
-- HU-10
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-10.1 · Inicializar el repositorio con estructura backend/frontend/docs y convenciones de ramas.', 'Inicializar el repositorio con estructura backend/frontend/docs y convenciones de ramas.

Responsable: LT.', 'en_revision', 'critica', 3, '2026-10-04', array['HU-10', 'LT'], (select id from work_items where title like 'HU-10 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-10.2 · Configurar Spring Boot con perfiles (local, test) y dependencias base — backend en Java (herramienta…', 'Configurar Spring Boot con perfiles (`local`, `test`) y dependencias base — backend en Java (herramienta obligatoria).

Responsable: BE.', 'en_revision', 'critica', 4, '2026-10-04', array['HU-10', 'BE'], (select id from work_items where title like 'HU-10 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-10.3 · Configurar PostgreSQL y guiones/migraciones del esquema inicial.', 'Configurar PostgreSQL y guiones/migraciones del esquema inicial.

Responsable: BE.', 'en_revision', 'critica', 6, '2026-10-04', array['HU-10', 'BE'], (select id from work_items where title like 'HU-10 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-10.4 · Crear los Dockerfile y el docker-compose.yml (backend, db, frontend) con healthchecks — Docker (herramienta…', 'Crear los `Dockerfile` y el `docker-compose.yml` (backend, db, frontend) con healthchecks — Docker (herramienta obligatoria).

Responsables: BE (principal) con FE.', 'en_revision', 'critica', 6, '2026-10-04', array['HU-10', 'BE', 'FE'], (select id from work_items where title like 'HU-10 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-10.5 · Crear .env.example, .gitignore y redactar la guía de instalación rápida.', 'Crear `.env.example`, `.gitignore` y redactar la guía de instalación rápida.

Responsables: DOC (principal) con LT.', 'en_revision', 'critica', 3, '2026-10-04', array['HU-10', 'DOC', 'LT'], (select id from work_items where title like 'HU-10 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-10.6 · Verificar arranque limpio en una máquina nueva y registrar evidencia.', 'Verificar arranque limpio en una máquina nueva y registrar evidencia.

Responsable: QA.', 'pendiente', 'critica', 2, '2026-10-04', array['HU-10', 'QA'], (select id from work_items where title like 'HU-10 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-11
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-11.1 · Implementar entidades y relaciones de usuarios, roles y permisos.', 'Implementar entidades y relaciones de usuarios, roles y permisos.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-04', array['HU-11', 'BE'], (select id from work_items where title like 'HU-11 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-11.2 · Implementar entidades de expediente, documento e historial de estados.', 'Implementar entidades de expediente, documento e historial de estados.

Responsable: BE.', 'pendiente', 'critica', 6, '2026-10-04', array['HU-11', 'BE'], (select id from work_items where title like 'HU-11 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-11.3 · Implementar entidades de verificación y resultado de verificación (resultado mínimo), consentimiento…', 'Implementar entidades de verificación y resultado de verificación (resultado mínimo), consentimiento informado, solicitud ARCO y evento de auditoría.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-04', array['HU-11', 'BE'], (select id from work_items where title like 'HU-11 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-11.4 · Escribir migraciones y datos semilla por tipo de trámite.', 'Escribir migraciones y datos semilla por tipo de trámite.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-04', array['HU-11', 'BE'], (select id from work_items where title like 'HU-11 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-11.5 · Escribir pruebas de integridad y consultas de listado.', 'Escribir pruebas de integridad y consultas de listado.

Responsables: BE (principal) con QA.', 'pendiente', 'critica', 5, '2026-10-04', array['HU-11', 'BE', 'QA'], (select id from work_items where title like 'HU-11 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%'));
-- HU-12
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-12.1 · Implementar entidades de usuario y hash de contraseñas con política de complejidad.', 'Implementar entidades de usuario y hash de contraseñas con política de complejidad.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-04', array['HU-12', 'BE'], (select id from work_items where title like 'HU-12 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-12.2 · Implementar POST /api/auth/login, emisión de token/sesión y expiración.', 'Implementar `POST /api/auth/login`, emisión de token/sesión y expiración.

Responsable: BE.', 'pendiente', 'critica', 6, '2026-10-04', array['HU-12', 'BE'], (select id from work_items where title like 'HU-12 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-12.3 · Implementar límite de intentos, bloqueo temporal y mensajes genéricos.', 'Implementar límite de intentos, bloqueo temporal y mensajes genéricos.

Responsable: BE.', 'pendiente', 'critica', 4, '2026-10-04', array['HU-12', 'BE'], (select id from work_items where title like 'HU-12 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-12.4 · Implementar cierre de sesión y cambio de contraseña.', 'Implementar cierre de sesión y cambio de contraseña.

Responsable: BE.', 'pendiente', 'critica', 4, '2026-10-04', array['HU-12', 'BE'], (select id from work_items where title like 'HU-12 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-12.5 · Conectar las pantallas de acceso y cuenta (P-01, P-02, P-04 y P-05) al backend real.', 'Conectar las pantallas de acceso y cuenta (P-01, P-02, P-04 y P-05) al backend real.

Responsable: FE.', 'pendiente', 'critica', 5, '2026-10-04', array['HU-12', 'FE'], (select id from work_items where title like 'HU-12 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-12.6 · Escribir pruebas de autenticación (positivas y negativas).', 'Escribir pruebas de autenticación (positivas y negativas).

Responsables: BE (principal) con QA.', 'pendiente', 'critica', 5, '2026-10-04', array['HU-12', 'BE', 'QA'], (select id from work_items where title like 'HU-12 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%'));
-- HU-13
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-13.1 · Definir la matriz rol × endpoint × operación y documentarla.', 'Definir la matriz rol × endpoint × operación y documentarla.

Responsables: LT (principal) con BE.', 'pendiente', 'critica', 4, '2026-10-04', array['HU-13', 'LT', 'BE'], (select id from work_items where title like 'HU-13 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-13.2 · Implementar el mecanismo de autorización (anotaciones/filtros) y la verificación de titularidad.', 'Implementar el mecanismo de autorización (anotaciones/filtros) y la verificación de titularidad.

Responsable: BE.', 'pendiente', 'critica', 8, '2026-10-04', array['HU-13', 'BE'], (select id from work_items where title like 'HU-13 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-13.3 · Proteger todos los endpoints de la versión 1 según la matriz.', 'Proteger todos los endpoints de la versión 1 según la matriz.

Responsable: BE.', 'pendiente', 'critica', 6, '2026-10-04', array['HU-13', 'BE'], (select id from work_items where title like 'HU-13 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-13.4 · Escribir la suite de pruebas de autorización (permitido/denegado por rol).', 'Escribir la suite de pruebas de autorización (permitido/denegado por rol).

Responsables: QA (principal) con BE.', 'pendiente', 'critica', 8, '2026-10-04', array['HU-13', 'QA', 'BE'], (select id from work_items where title like 'HU-13 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-13.5 · Ajustar el frontend para mostrar/ocultar acciones según permisos reales.', 'Ajustar el frontend para mostrar/ocultar acciones según permisos reales.

Responsable: FE.', 'pendiente', 'critica', 4, '2026-10-04', array['HU-13', 'FE'], (select id from work_items where title like 'HU-13 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Jonhatan%'));
-- HU-14
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-14.1 · Definir el estándar de cuerpo de error y documentarlo en OpenAPI.', 'Definir el estándar de cuerpo de error y documentarlo en OpenAPI.

Responsable: LT.', 'pendiente', 'alta', 3, '2026-10-04', array['HU-14', 'LT'], (select id from work_items where title like 'HU-14 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-14.2 · Implementar el manejador global de excepciones con mapeo de códigos.', 'Implementar el manejador global de excepciones con mapeo de códigos.

Responsable: BE.', 'pendiente', 'alta', 6, '2026-10-04', array['HU-14', 'BE'], (select id from work_items where title like 'HU-14 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-14.3 · Aplicar el manejo de errores en servicios y adaptadores (timeouts, reintentos).', 'Aplicar el manejo de errores en servicios y adaptadores (timeouts, reintentos).

Responsable: BE.', 'pendiente', 'alta', 6, '2026-10-04', array['HU-14', 'BE'], (select id from work_items where title like 'HU-14 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-14.4 · Escribir pruebas de cada código de error y revisión de no exposición de datos.', 'Escribir pruebas de cada código de error y revisión de no exposición de datos.

Responsable: QA.', 'pendiente', 'alta', 5, '2026-10-04', array['HU-14', 'QA'], (select id from work_items where title like 'HU-14 ·%'), (select id from sprints where name like 'Sprint 2 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-15
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-15.1 · Implementar servicio y endpoint de creación con validaciones de dominio.', 'Implementar servicio y endpoint de creación con validaciones de dominio.

Responsable: BE.', 'pendiente', 'critica', 6, '2026-10-11', array['HU-15', 'BE'], (select id from work_items where title like 'HU-15 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-15.2 · Implementar la obtención del tipo de trámite y sus requisitos desde catálogos.', 'Implementar la obtención del tipo de trámite y sus requisitos desde catálogos.

Responsable: BE.', 'pendiente', 'critica', 4, '2026-10-11', array['HU-15', 'BE'], (select id from work_items where title like 'HU-15 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-15.3 · Conectar el asistente P-09…P-16 y el envío P-17 al endpoint, incluyendo manejo de errores de validación campo…', 'Conectar el asistente P-09…P-16 y el envío P-17 al endpoint, incluyendo manejo de errores de validación campo a campo.

Responsable: FE.', 'pendiente', 'critica', 6, '2026-10-11', array['HU-15', 'FE'], (select id from work_items where title like 'HU-15 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-15.4 · Emitir evento de auditoría en la creación.', 'Emitir evento de auditoría en la creación.

Responsable: BE.', 'pendiente', 'critica', 3, '2026-10-11', array['HU-15', 'BE'], (select id from work_items where title like 'HU-15 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-15.5 · Escribir pruebas de creación, validación y autorización.', 'Escribir pruebas de creación, validación y autorización.

Responsables: BE (principal) con QA.', 'pendiente', 'critica', 6, '2026-10-11', array['HU-15', 'BE', 'QA'], (select id from work_items where title like 'HU-15 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%'));
-- HU-16
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-16.1 · Implementar listado con filtros, paginación y proyección mínima de datos.', 'Implementar listado con filtros, paginación y proyección mínima de datos.

Responsable: BE.', 'pendiente', 'critica', 6, '2026-10-11', array['HU-16', 'BE'], (select id from work_items where title like 'HU-16 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-16.2 · Implementar detalle e historial con verificación de acceso.', 'Implementar detalle e historial con verificación de acceso.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-11', array['HU-16', 'BE'], (select id from work_items where title like 'HU-16 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-16.3 · Conectar P-06, P-19, I-03/I-02 e I-06 a los endpoints reales.', 'Conectar P-06, P-19, I-03/I-02 e I-06 a los endpoints reales.

Responsable: FE.', 'pendiente', 'critica', 6, '2026-10-11', array['HU-16', 'FE'], (select id from work_items where title like 'HU-16 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-16.4 · Escribir pruebas de titularidad, paginación y rendimiento básico del listado.', 'Escribir pruebas de titularidad, paginación y rendimiento básico del listado.

Responsables: QA (principal) con BE.', 'pendiente', 'critica', 5, '2026-10-11', array['HU-16', 'QA', 'BE'], (select id from work_items where title like 'HU-16 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-17
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-17.1 · Definir catálogo de tipos documentales permitidos, límites y reglas por trámite.', 'Definir catálogo de tipos documentales permitidos, límites y reglas por trámite.

Responsables: BE (principal) con PO.', 'pendiente', 'critica', 4, '2026-10-11', array['HU-17', 'BE', 'PO'], (select id from work_items where title like 'HU-17 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-17.2 · Implementar carga con validación de MIME, tamaño e integridad.', 'Implementar carga con validación de MIME, tamaño e integridad.

Responsable: BE.', 'pendiente', 'critica', 8, '2026-10-11', array['HU-17', 'BE'], (select id from work_items where title like 'HU-17 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-17.3 · Implementar descarga protegida con verificación de permiso y auditoría.', 'Implementar descarga protegida con verificación de permiso y auditoría.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-11', array['HU-17', 'BE'], (select id from work_items where title like 'HU-17 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-17.4 · Conectar P-14 al backend con progreso y manejo de errores.', 'Conectar P-14 al backend con progreso y manejo de errores.

Responsable: FE.', 'pendiente', 'critica', 6, '2026-10-11', array['HU-17', 'FE'], (select id from work_items where title like 'HU-17 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-17.5 · Escribir pruebas de carga, rechazo, descarga y permisos.', 'Escribir pruebas de carga, rechazo, descarga y permisos.

Responsables: QA (principal) con BE.', 'pendiente', 'critica', 6, '2026-10-11', array['HU-17', 'QA', 'BE'], (select id from work_items where title like 'HU-17 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-18
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-18.1 · Implementar entidad, endpoint y evento de notificaciones.', 'Implementar entidad, endpoint y evento de notificaciones.

Responsable: BE.', 'pendiente', 'alta', 6, '2026-10-11', array['HU-18', 'BE'], (select id from work_items where title like 'HU-18 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-18.2 · Definir plantillas de mensajes por tipo de evento sin datos sensibles.', 'Definir plantillas de mensajes por tipo de evento sin datos sensibles.

Responsables: PO (principal) con BE.', 'pendiente', 'alta', 4, '2026-10-11', array['HU-18', 'PO', 'BE'], (select id from work_items where title like 'HU-18 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-18.3 · Conectar P-20 al backend con marcado de leídas.', 'Conectar P-20 al backend con marcado de leídas.

Responsable: FE.', 'pendiente', 'alta', 4, '2026-10-11', array['HU-18', 'FE'], (select id from work_items where title like 'HU-18 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-18.4 · Escribir pruebas de generación y de contenido seguro.', 'Escribir pruebas de generación y de contenido seguro.

Responsable: QA.', 'pendiente', 'alta', 4, '2026-10-11', array['HU-18', 'QA'], (select id from work_items where title like 'HU-18 ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-18b
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-18b.1 · Implementar la entidad de consentimiento (titular, responsable, finalidad, alcance, base legal, fecha…', 'Implementar la entidad de consentimiento (titular, responsable, finalidad, alcance, base legal, fecha, vigencia, estado) y su endpoint con validaciones.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-11', array['HU-18b', 'BE'], (select id from work_items where title like 'HU-18b ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-18b.2 · Implementar la regla de limitación del tratamiento sin consentimiento vigente y la exigencia de…', 'Implementar la regla de limitación del tratamiento sin consentimiento vigente y la exigencia de consentimiento expreso para datos sensibles.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-11', array['HU-18b', 'BE'], (select id from work_items where title like 'HU-18b ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-18b.3 · Construir en el portal del cliente (P-05) la consulta y la revocación del consentimiento, con confirmación de…', 'Construir en el portal del cliente (P-05) la consulta y la revocación del consentimiento, con confirmación de la acción sensible.

Responsable: FE.', 'pendiente', 'critica', 4, '2026-10-11', array['HU-18b', 'FE'], (select id from work_items where title like 'HU-18b ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-18b.4 · Construir el bloque de consentimiento en el módulo interno (recepción y analista) con estado por cliente y…', 'Construir el bloque de consentimiento en el módulo interno (recepción y analista) con estado por cliente y expediente.

Responsable: FE.', 'pendiente', 'critica', 3, '2026-10-11', array['HU-18b', 'FE'], (select id from work_items where title like 'HU-18b ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-18b.5 · Escribir pruebas de alta, revocación, limitación del tratamiento y auditoría.', 'Escribir pruebas de alta, revocación, limitación del tratamiento y auditoría.

Responsables: QA (principal) con BE.', 'pendiente', 'critica', 4, '2026-10-11', array['HU-18b', 'QA', 'BE'], (select id from work_items where title like 'HU-18b ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-18c
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-18c.1 · Implementar la entidad de solicitud ARCO (tipo, fecha, estado, plazo, responsable) y sus endpoints con…', 'Implementar la entidad de solicitud ARCO (tipo, fecha, estado, plazo, responsable) y sus endpoints con permisos por titularidad.

Responsable: BE.', 'pendiente', 'alta', 5, '2026-10-11', array['HU-18c', 'BE'], (select id from work_items where title like 'HU-18c ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-18c.2 · Construir en el portal del cliente la pantalla de creación y seguimiento de la solicitud ARCO.', 'Construir en el portal del cliente la pantalla de creación y seguimiento de la solicitud ARCO.

Responsable: FE.', 'pendiente', 'alta', 4, '2026-10-11', array['HU-18c', 'FE'], (select id from work_items where title like 'HU-18c ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-18c.3 · Construir la bandeja del despacho (recepción/analista) con asignación, plazos y alerta de vencimiento.', 'Construir la bandeja del despacho (recepción/analista) con asignación, plazos y alerta de vencimiento.

Responsable: FE.', 'pendiente', 'alta', 4, '2026-10-11', array['HU-18c', 'FE'], (select id from work_items where title like 'HU-18c ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-18c.4 · Definir plantillas de notificación sin datos personales y registrar la auditoría de cada evento.', 'Definir plantillas de notificación sin datos personales y registrar la auditoría de cada evento.

Responsables: PO (principal) con BE.', 'pendiente', 'alta', 3, '2026-10-11', array['HU-18c', 'PO', 'BE'], (select id from work_items where title like 'HU-18c ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-18c.5 · Escribir pruebas de registro, titularidad, plazos, auditoría y no exposición de datos.', 'Escribir pruebas de registro, titularidad, plazos, auditoría y no exposición de datos.

Responsables: QA (principal) con BE.', 'pendiente', 'alta', 4, '2026-10-11', array['HU-18c', 'QA', 'BE'], (select id from work_items where title like 'HU-18c ·%'), (select id from sprints where name like 'Sprint 3 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-19
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-19.1 · Definir con el PO la matriz de transiciones por tipo de trámite.', 'Definir con el PO la matriz de transiciones por tipo de trámite.

Responsables: PO (principal) con LT.', 'pendiente', 'critica', 4, '2026-10-18', array['HU-19', 'PO', 'LT'], (select id from work_items where title like 'HU-19 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-19.2 · Implementar el servicio de dominio de transiciones con validación de prerrequisitos.', 'Implementar el servicio de dominio de transiciones con validación de prerrequisitos.

Responsable: BE.', 'pendiente', 'critica', 8, '2026-10-18', array['HU-19', 'BE'], (select id from work_items where title like 'HU-19 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-19.3 · Implementar el endpoint con control de concurrencia y motivo obligatorio.', 'Implementar el endpoint con control de concurrencia y motivo obligatorio.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-18', array['HU-19', 'BE'], (select id from work_items where title like 'HU-19 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-19.4 · Conectar I-10 (y I-04) al backend con transiciones dinámicas y confirmaciones.', 'Conectar I-10 (y I-04) al backend con transiciones dinámicas y confirmaciones.

Responsable: FE.', 'pendiente', 'critica', 5, '2026-10-18', array['HU-19', 'FE'], (select id from work_items where title like 'HU-19 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-19.5 · Escribir pruebas de transiciones válidas, inválidas, concurrentes y de bloqueo.', 'Escribir pruebas de transiciones válidas, inválidas, concurrentes y de bloqueo.

Responsables: QA (principal) con BE.', 'pendiente', 'critica', 8, '2026-10-18', array['HU-19', 'QA', 'BE'], (select id from work_items where title like 'HU-19 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-20
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-20.1 · Implementar entidad, endpoints y permisos de observaciones.', 'Implementar entidad, endpoints y permisos de observaciones.

Responsable: BE.', 'pendiente', 'alta', 6, '2026-10-18', array['HU-20', 'BE'], (select id from work_items where title like 'HU-20 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-20.2 · Conectar I-08 y el bloque de observaciones de P-20.', 'Conectar I-08 y el bloque de observaciones de P-20.

Responsable: FE.', 'pendiente', 'alta', 5, '2026-10-18', array['HU-20', 'FE'], (select id from work_items where title like 'HU-20 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-20.3 · Escribir pruebas de permisos y registro con auditoría.', 'Escribir pruebas de permisos y registro con auditoría.

Responsable: QA.', 'pendiente', 'alta', 4, '2026-10-18', array['HU-20', 'QA'], (select id from work_items where title like 'HU-20 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-21
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-21.1 · Implementar el endpoint de historial con proyección por rol.', 'Implementar el endpoint de historial con proyección por rol.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-18', array['HU-21', 'BE'], (select id from work_items where title like 'HU-21 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-21.2 · Construir el componente de línea de tiempo y conectarlo a P-19/I-06.', 'Construir el componente de línea de tiempo y conectarlo a P-19/I-06.

Responsable: FE.', 'pendiente', 'critica', 5, '2026-10-18', array['HU-21', 'FE'], (select id from work_items where title like 'HU-21 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-21.3 · Escribir pruebas de autorización del historial.', 'Escribir pruebas de autorización del historial.

Responsable: QA.', 'pendiente', 'critica', 3, '2026-10-18', array['HU-21', 'QA'], (select id from work_items where title like 'HU-21 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-22
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-22.1 · Diseñar el modelo de eventos de auditoría y su política de retención.', 'Diseñar el modelo de eventos de auditoría y su política de retención.

Responsables: LT (principal) con BE.', 'pendiente', 'critica', 4, '2026-10-18', array['HU-22', 'LT', 'BE'], (select id from work_items where title like 'HU-22 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-22.2 · Instrumentar los servicios críticos con registro de eventos (sin bloquear la operación principal).', 'Instrumentar los servicios críticos con registro de eventos (sin bloquear la operación principal).

Responsable: BE.', 'pendiente', 'critica', 8, '2026-10-18', array['HU-22', 'BE'], (select id from work_items where title like 'HU-22 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-22.3 · Implementar el endpoint de consulta con filtros, paginación y exportación, protegido por rol.', 'Implementar el endpoint de consulta con filtros, paginación y exportación, protegido por rol.

Responsable: BE.', 'pendiente', 'critica', 6, '2026-10-18', array['HU-22', 'BE'], (select id from work_items where title like 'HU-22 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-22.4 · Conectar I-16 y verificar la exportación CSV.', 'Conectar I-16 y verificar la exportación CSV.

Responsable: FE.', 'pendiente', 'critica', 4, '2026-10-18', array['HU-22', 'FE'], (select id from work_items where title like 'HU-22 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-22.5 · Escribir pruebas de cobertura de eventos críticos y de no exposición de datos en logs.', 'Escribir pruebas de cobertura de eventos críticos y de no exposición de datos en logs.

Responsables: QA (principal) con BE.', 'pendiente', 'critica', 6, '2026-10-18', array['HU-22', 'QA', 'BE'], (select id from work_items where title like 'HU-22 ·%'), (select id from sprints where name like 'Sprint 4 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-23
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-23.1 · Definir la interfaz común de adaptador y el DTO de respuesta normalizada.', 'Definir la interfaz común de adaptador y el DTO de respuesta normalizada.

Responsable: LT.', 'pendiente', 'critica', 4, '2026-10-25', array['HU-23', 'LT'], (select id from work_items where title like 'HU-23 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-23.2 · Implementar el adaptador del TE sobre su mock, con timeout y traducción.', 'Implementar el adaptador del TE sobre su mock, con timeout y traducción.

Responsable: BE.', 'pendiente', 'critica', 6, '2026-10-25', array['HU-23', 'BE'], (select id from work_items where title like 'HU-23 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-23.3 · Implementar el adaptador de la CSS sobre su mock.', 'Implementar el adaptador de la CSS sobre su mock.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-25', array['HU-23', 'BE'], (select id from work_items where title like 'HU-23 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-23.4 · Implementar el adaptador del Registro Público sobre su mock.', 'Implementar el adaptador del Registro Público sobre su mock.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-25', array['HU-23', 'BE'], (select id from work_items where title like 'HU-23 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-23.5 · Escribir pruebas de contrato por adaptador (4 escenarios c/u) y del registro manual asistido.', 'Escribir pruebas de contrato por adaptador (4 escenarios c/u) y del registro manual asistido.

Responsables: QA (principal) con BE.', 'pendiente', 'critica', 6, '2026-10-25', array['HU-23', 'QA', 'BE'], (select id from work_items where title like 'HU-23 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-23.6 · Documentar el procedimiento de sustitución por una futura integración automática sujeta a convenio.', 'Documentar el procedimiento de sustitución por una futura integración automática sujeta a convenio.

Responsables: DOC (principal) con LT.', 'pendiente', 'critica', 3, '2026-10-25', array['HU-23', 'DOC', 'LT'], (select id from work_items where title like 'HU-23 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Richard%'));
-- HU-24
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-24.1 · Implementar entidad y estados de verificación con transiciones propias y registro del modo (manual asistido o…', 'Implementar entidad y estados de verificación con transiciones propias y registro del modo (manual asistido o simulado).

Responsable: BE.', 'pendiente', 'critica', 6, '2026-10-25', array['HU-24', 'BE'], (select id from work_items where title like 'HU-24 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-24.2 · Implementar el orquestador: determina las verificaciones necesarias y las crea en modo manual asistido (con…', 'Implementar el orquestador: determina las verificaciones necesarias y las crea en modo manual asistido (con responsable humano) o simulado.

Responsable: BE.', 'pendiente', 'critica', 8, '2026-10-25', array['HU-24', 'BE'], (select id from work_items where title like 'HU-24 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-24.3 · Implementar timeout, reintentos limitados con backoff y claves de idempotencia (modo simulado).', 'Implementar timeout, reintentos limitados con backoff y claves de idempotencia (modo simulado).

Responsable: BE.', 'pendiente', 'critica', 8, '2026-10-25', array['HU-24', 'BE'], (select id from work_items where title like 'HU-24 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-24.4 · Escribir pruebas de caída de la fuente simulada, timeout, duplicación, recuperación y registro manual.', 'Escribir pruebas de caída de la fuente simulada, timeout, duplicación, recuperación y registro manual.

Responsables: QA (principal) con BE.', 'pendiente', 'critica', 6, '2026-10-25', array['HU-24', 'QA', 'BE'], (select id from work_items where title like 'HU-24 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-25
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-25.1 · Formalizar la matriz de fuentes y finalidad (fuente → finalidad → base legal → responsable → qué se guarda).', 'Formalizar la matriz de fuentes y finalidad (fuente → finalidad → base legal → responsable → qué se guarda).

Responsables: LT (principal) con PO.', 'pendiente', 'critica', 4, '2026-10-25', array['HU-25', 'LT', 'PO'], (select id from work_items where title like 'HU-25 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-25.2 · Implementar la validación de permiso y finalidad previa a emitir o registrar la verificación.', 'Implementar la validación de permiso y finalidad previa a emitir o registrar la verificación.

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-25', array['HU-25', 'BE'], (select id from work_items where title like 'HU-25 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-25.3 · Aplicar minimización en el armado de peticiones y en el almacenamiento de resultados (sin copias…', 'Aplicar minimización en el armado de peticiones y en el almacenamiento de resultados (sin copias institucionales).

Responsable: BE.', 'pendiente', 'critica', 5, '2026-10-25', array['HU-25', 'BE'], (select id from work_items where title like 'HU-25 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-25.4 · Verificar con pruebas la trazabilidad y el contenido mínimo de logs.', 'Verificar con pruebas la trazabilidad y el contenido mínimo de logs.

Responsable: QA.', 'pendiente', 'critica', 4, '2026-10-25', array['HU-25', 'QA'], (select id from work_items where title like 'HU-25 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-26
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-26.1 · Conectar I-07 a los endpoints de verificaciones (/api/expedientes/{id}/validaciones) con recarga y refresco.', 'Conectar I-07 a los endpoints de verificaciones (`/api/expedientes/{id}/validaciones`) con recarga y refresco.

Responsable: FE.', 'pendiente', 'critica', 6, '2026-10-25', array['HU-26', 'FE'], (select id from work_items where title like 'HU-26 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-26.2 · Implementar la distinción error técnico vs. resultado negativo y el botón de reintento.', 'Implementar la distinción error técnico vs. resultado negativo y el botón de reintento.

Responsable: FE.', 'pendiente', 'critica', 5, '2026-10-25', array['HU-26', 'FE'], (select id from work_items where title like 'HU-26 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-26.3 · Mostrar el bloque de verificaciones en P-19 con nivel de detalle por rol.', 'Mostrar el bloque de verificaciones en P-19 con nivel de detalle por rol.

Responsable: FE.', 'pendiente', 'critica', 5, '2026-10-25', array['HU-26', 'FE'], (select id from work_items where title like 'HU-26 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-26.4 · Ejecutar el recorrido completo con escenarios forzados (X-Scenario) y con registro manual, y corregir…', 'Ejecutar el recorrido completo con escenarios forzados (`X-Scenario`) y con registro manual, y corregir incidencias.

Responsables: FE (principal) con QA.', 'pendiente', 'critica', 6, '2026-10-25', array['HU-26', 'FE', 'QA'], (select id from work_items where title like 'HU-26 ·%'), (select id from sprints where name like 'Sprint 5 ·%'), (select id from members where full_name ilike 'Jonhatan%'));
-- HU-27
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-27.1 · Completar pruebas unitarias de dominio (estados, verificaciones, permisos).', 'Completar pruebas unitarias de dominio (estados, verificaciones, permisos).

Responsable: BE.', 'pendiente', 'critica', 8, '2026-11-01', array['HU-27', 'BE'], (select id from work_items where title like 'HU-27 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-27.2 · Completar pruebas de API de todos los endpoints con sus códigos esperados.', 'Completar pruebas de API de todos los endpoints con sus códigos esperados.

Responsables: QA (principal) con BE.', 'pendiente', 'critica', 8, '2026-11-01', array['HU-27', 'QA', 'BE'], (select id from work_items where title like 'HU-27 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-27.3 · Completar pruebas de integración con contenedores (DB + mocks).', 'Completar pruebas de integración con contenedores (DB + mocks).

Responsable: QA.', 'pendiente', 'critica', 8, '2026-11-01', array['HU-27', 'QA'], (select id from work_items where title like 'HU-27 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-27.4 · Integrar la ejecución de la suite en CI (Git) con reporte de cobertura.', 'Integrar la ejecución de la suite en CI (Git) con reporte de cobertura.

Responsable: LT.', 'pendiente', 'critica', 5, '2026-11-01', array['HU-27', 'LT'], (select id from work_items where title like 'HU-27 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Kennet%'));
-- HU-28
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-28.1 · Preparar el entorno de análisis (datos, sesiones por rol, blacklist de acciones destructivas).', 'Preparar el entorno de análisis (datos, sesiones por rol, blacklist de acciones destructivas).

Responsable: QA.', 'pendiente', 'critica', 4, '2026-11-01', array['HU-28', 'QA'], (select id from work_items where title like 'HU-28 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-28.2 · Ejecutar escaneo automatizado con OWASP ZAP (herramienta obligatoria) y pruebas manuales (IDOR, BOLA…', 'Ejecutar escaneo automatizado con OWASP ZAP (herramienta obligatoria) y pruebas manuales (IDOR, BOLA, inyección, XSS, CSRF).

Responsable: QA.', 'pendiente', 'critica', 8, '2026-11-01', array['HU-28', 'QA'], (select id from work_items where title like 'HU-28 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-28.3 · Documentar y priorizar hallazgos en el registro de incidencias.', 'Documentar y priorizar hallazgos en el registro de incidencias.

Responsable: QA.', 'pendiente', 'critica', 4, '2026-11-01', array['HU-28', 'QA'], (select id from work_items where title like 'HU-28 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-28.4 · Corregir hallazgos críticos/altos en backend y frontend.', 'Corregir hallazgos críticos/altos en backend y frontend.

Responsables: BE (principal) con FE.', 'pendiente', 'critica', 12, '2026-11-01', array['HU-28', 'BE', 'FE'], (select id from work_items where title like 'HU-28 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-28.5 · Repetir escaneo, verificar y emitir el informe final.', 'Repetir escaneo, verificar y emitir el informe final.

Responsable: QA.', 'pendiente', 'critica', 4, '2026-11-01', array['HU-28', 'QA'], (select id from work_items where title like 'HU-28 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-29
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-29.1 · Definir y documentar escenarios y perfiles de carga.', 'Definir y documentar escenarios y perfiles de carga.

Responsables: QA (principal) con PO.', 'pendiente', 'alta', 4, '2026-11-01', array['HU-29', 'QA', 'PO'], (select id from work_items where title like 'HU-29 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-29.2 · Preparar scripts y datos de Apache JMeter (herramienta obligatoria): login, listado, creación, documentos…', 'Preparar scripts y datos de Apache JMeter (herramienta obligatoria): login, listado, creación, documentos, verificaciones.

Responsable: QA.', 'pendiente', 'alta', 8, '2026-11-01', array['HU-29', 'QA'], (select id from work_items where title like 'HU-29 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-29.3 · Ejecutar las pruebas de carga con Apache JMeter y recopilar métricas en el entorno de pruebas.', 'Ejecutar las pruebas de carga con Apache JMeter y recopilar métricas en el entorno de pruebas.

Responsable: QA.', 'pendiente', 'alta', 6, '2026-11-01', array['HU-29', 'QA'], (select id from work_items where title like 'HU-29 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-29.4 · Analizar cuellos de botella y corregir los prioritarios (índices, consultas, caché).', 'Analizar cuellos de botella y corregir los prioritarios (índices, consultas, caché).

Responsable: BE.', 'pendiente', 'alta', 10, '2026-11-01', array['HU-29', 'BE'], (select id from work_items where title like 'HU-29 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-29.5 · Repetir la medición y emitir el informe de rendimiento.', 'Repetir la medición y emitir el informe de rendimiento.

Responsable: QA.', 'pendiente', 'alta', 4, '2026-11-01', array['HU-29', 'QA'], (select id from work_items where title like 'HU-29 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-30
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-30.1 · Definir guion y tareas de evaluación con criterios de éxito.', 'Definir guion y tareas de evaluación con criterios de éxito.

Responsables: PO (principal) con QA.', 'pendiente', 'alta', 3, '2026-11-01', array['HU-30', 'PO', 'QA'], (select id from work_items where title like 'HU-30 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-30.2 · Ejecutar sesiones con usuarios de prueba y registrar métricas.', 'Ejecutar sesiones con usuarios de prueba y registrar métricas.

Responsable: QA.', 'pendiente', 'alta', 8, '2026-11-01', array['HU-30', 'QA'], (select id from work_items where title like 'HU-30 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-30.3 · Clasificar dificultades y priorizar correcciones con el PO.', 'Clasificar dificultades y priorizar correcciones con el PO.

Responsables: PO (principal) con FE.', 'pendiente', 'alta', 4, '2026-11-01', array['HU-30', 'PO', 'FE'], (select id from work_items where title like 'HU-30 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-30.4 · Corregir pantallas prioritarias y repetir las tareas críticas.', 'Corregir pantallas prioritarias y repetir las tareas críticas.

Responsable: FE.', 'pendiente', 'alta', 8, '2026-11-01', array['HU-30', 'FE'], (select id from work_items where title like 'HU-30 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Jonhatan%')),
  ('tarea', 'TASK-30.5 · Documentar el informe de usabilidad con evidencias.', 'Documentar el informe de usabilidad con evidencias.

Responsables: DOC (principal) con QA.', 'pendiente', 'alta', 3, '2026-11-01', array['HU-30', 'DOC', 'QA'], (select id from work_items where title like 'HU-30 ·%'), (select id from sprints where name like 'Sprint 6 ·%'), (select id from members where full_name ilike 'Richard%'));
-- HU-31
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-31.1 · Consolidar la lista de casos de aceptación por historia.', 'Consolidar la lista de casos de aceptación por historia.

Responsables: PO (principal) con QA.', 'pendiente', 'critica', 4, '2026-11-08', array['HU-31', 'PO', 'QA'], (select id from work_items where title like 'HU-31 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-31.2 · Ejecutar las pruebas de aceptación de extremo a extremo con evidencia.', 'Ejecutar las pruebas de aceptación de extremo a extremo con evidencia.

Responsable: QA.', 'pendiente', 'critica', 10, '2026-11-08', array['HU-31', 'QA'], (select id from work_items where title like 'HU-31 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-31.3 · Ejecutar la regresión completa y verificar las correcciones.', 'Ejecutar la regresión completa y verificar las correcciones.

Responsable: QA.', 'pendiente', 'critica', 6, '2026-11-08', array['HU-31', 'QA'], (select id from work_items where title like 'HU-31 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-31.4 · Registrar aceptaciones, bloqueos y errores conocidos.', 'Registrar aceptaciones, bloqueos y errores conocidos.

Responsable: PO.', 'pendiente', 'critica', 4, '2026-11-08', array['HU-31', 'PO'], (select id from work_items where title like 'HU-31 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%'));
-- HU-32
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-32.1 · Redactar el manual técnico (arquitectura, entorno, base de datos, despliegue).', 'Redactar el manual técnico (arquitectura, entorno, base de datos, despliegue).

Responsables: DOC (principal) con LT.', 'pendiente', 'alta', 8, '2026-11-08', array['HU-32', 'DOC', 'LT'], (select id from work_items where title like 'HU-32 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-32.2 · Redactar el manual de usuario por rol con capturas actualizadas.', 'Redactar el manual de usuario por rol con capturas actualizadas.

Responsables: DOC (principal) con FE.', 'pendiente', 'alta', 8, '2026-11-08', array['HU-32', 'DOC', 'FE'], (select id from work_items where title like 'HU-32 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-32.3 · Actualizar openapi.yaml, diagramas y modelo de datos al estado final.', 'Actualizar `openapi.yaml`, diagramas y modelo de datos al estado final.

Responsables: BE (principal) con LT.', 'pendiente', 'alta', 5, '2026-11-08', array['HU-32', 'BE', 'LT'], (select id from work_items where title like 'HU-32 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-32.4 · Consolidar informes de pruebas, marco legal y matriz de fuentes de verificación, y registro de decisiones.', 'Consolidar informes de pruebas, marco legal y matriz de fuentes de verificación, y registro de decisiones.

Responsables: DOC (principal) con QA.', 'pendiente', 'alta', 5, '2026-11-08', array['HU-32', 'DOC', 'QA'], (select id from work_items where title like 'HU-32 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%'));
-- HU-33
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-33.1 · Realizar instalación limpia en máquina nueva y registrar incidencias.', 'Realizar instalación limpia en máquina nueva y registrar incidencias.

Responsable: QA.', 'pendiente', 'critica', 4, '2026-11-08', array['HU-33', 'QA'], (select id from work_items where title like 'HU-33 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Vivian%')),
  ('tarea', 'TASK-33.2 · Corregir hallazgos de empaquetado (configuración, rutas, semillas).', 'Corregir hallazgos de empaquetado (configuración, rutas, semillas).

Responsables: BE (principal) con FE.', 'pendiente', 'critica', 6, '2026-11-08', array['HU-33', 'BE', 'FE'], (select id from work_items where title like 'HU-33 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Edgar%')),
  ('tarea', 'TASK-33.3 · Etiquetar la versión final y preparar el paquete de entrega (código + docs).', 'Etiquetar la versión final y preparar el paquete de entrega (código + docs).

Responsable: LT.', 'pendiente', 'critica', 3, '2026-11-08', array['HU-33', 'LT'], (select id from work_items where title like 'HU-33 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Kennet%')),
  ('tarea', 'TASK-33.4 · Verificar de nuevo la instalación tras las correcciones.', 'Verificar de nuevo la instalación tras las correcciones.

Responsable: QA.', 'pendiente', 'critica', 3, '2026-11-08', array['HU-33', 'QA'], (select id from work_items where title like 'HU-33 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Vivian%'));
-- HU-34
insert into work_items (type, title, description, status, priority, estimate_hours, due_date, tags, parent_id, sprint_id, assignee_id) values
  ('tarea', 'TASK-34.1 · Preparar datos ficticios y guion del escenario de demostración.', 'Preparar datos ficticios y guion del escenario de demostración.

Responsables: PO (principal) con BE.', 'pendiente', 'alta', 5, '2026-11-08', array['HU-34', 'PO', 'BE'], (select id from work_items where title like 'HU-34 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-34.2 · Ensayar la demostración completa y corregir detalles.', 'Ensayar la demostración completa y corregir detalles.

Responsable: Equipo.', 'pendiente', 'alta', 4, '2026-11-08', array['HU-34', 'Equipo'], (select id from work_items where title like 'HU-34 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-34.3 · Elaborar el informe de resultados, métricas, limitaciones y recomendaciones.', 'Elaborar el informe de resultados, métricas, limitaciones y recomendaciones.

Responsables: DOC (principal) con PO.', 'pendiente', 'alta', 8, '2026-11-08', array['HU-34', 'DOC', 'PO'], (select id from work_items where title like 'HU-34 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%')),
  ('tarea', 'TASK-34.4 · Preparar y ejecutar la presentación final; registrar la aceptación.', 'Preparar y ejecutar la presentación final; registrar la aceptación.

Responsable: PO.', 'pendiente', 'alta', 5, '2026-11-08', array['HU-34', 'PO'], (select id from work_items where title like 'HU-34 ·%'), (select id from sprints where name like 'Sprint 7 ·%'), (select id from members where full_name ilike 'Richard%'));

-- ---------------------------------------------------------------------
-- Avance ya subido al repositorio (historias En revisión)
-- ---------------------------------------------------------------------
insert into comments (item_id, author_id, body, repository, branch, commit_url) values
  ((select id from work_items where title like 'HU-01 ·%'), (select id from members where full_name ilike 'Edgar%'), 'Carga inicial del tablero: trabajo de Jonas ya subido al repositorio, pendiente de revisión. Fase A lista: layout, enrutado hash con protección por rol, componentes reutilizables y README del frontend.', 'Death272004/Tr-mites-Migratorios', 'Frontend', 'https://github.com/Death272004/Tr-mites-Migratorios/commit/95f295796d183e5da21098b7a3899ab0f09af8d7'),
  ((select id from work_items where title like 'HU-02 ·%'), (select id from members where full_name ilike 'Edgar%'), 'Carga inicial del tablero: trabajo de Jonas ya subido al repositorio, pendiente de revisión. P-01 a P-05 construidas (login, registro, OTP simulado, recuperación, perfil) y gestor de sesión.', 'Death272004/Tr-mites-Migratorios', 'Frontend', 'https://github.com/Death272004/Tr-mites-Migratorios/commit/6b0ec161fcb67a9e8cb557f3c986f1498f60bd50'),
  ((select id from work_items where title like 'HU-03 ·%'), (select id from members where full_name ilike 'Edgar%'), 'Carga inicial del tablero: trabajo de Jonas ya subido al repositorio, pendiente de revisión. P-06 a P-18 construidas (bandeja, selección de trámite, titularidad, asistente de 8 pasos, resumen y cita). Falta revisar los fixtures del solicitante (TASK-03.6).', 'Death272004/Tr-mites-Migratorios', 'Frontend', 'https://github.com/Death272004/Tr-mites-Migratorios/commit/af3a0b9bde41cdbe1bed45ac058199c6654ec6fa'),
  ((select id from work_items where title like 'HU-07 ·%'), (select id from members where full_name ilike 'Edgar%'), 'Carga inicial del tablero: trabajo de Edgar ya subido al repositorio, pendiente de revisión. openapi.yaml v0.1.0 y CHANGELOG-api.md en Backend/docs.', 'Death272004/Tr-mites-Migratorios', 'feature/hu-07-openapi', 'https://github.com/Death272004/Tr-mites-Migratorios/commit/a9122b9436ed599bb9e84b95621096647e93d75b'),
  ((select id from work_items where title like 'HU-10 ·%'), (select id from members where full_name ilike 'Edgar%'), 'Carga inicial del tablero: trabajo de Edgar ya subido al repositorio, pendiente de revisión. Spring Boot con perfiles, PostgreSQL + migración Flyway V1, Dockerfile, docker-compose, .env.example y README. Falta la verificación de arranque limpio de QA (TASK-10.6).', 'Death272004/Tr-mites-Migratorios', 'feature/hu-10-entorno', 'https://github.com/Death272004/Tr-mites-Migratorios/commit/96b7f3ebd1fd669fc84bc2dadebdb4790a28b23f');

-- Los comentarios de carga no dejan seguidores ni avisos
truncate table notifications, item_watchers;

-- Comprobación: 10 épicas, 36 historias, 169 tareas, todas las historias y tareas asignadas
do $$
declare
  n_ep int; n_hu int; n_tk int; n_sin int;
begin
  select count(*) filter (where type = 'epica'), count(*) filter (where type = 'historia'),
         count(*) filter (where type = 'tarea'),
         count(*) filter (where type <> 'epica' and (assignee_id is null or parent_id is null or sprint_id is null))
    into n_ep, n_hu, n_tk, n_sin from work_items;
  if n_ep <> 10 or n_hu <> 36 or n_tk <> 169 or n_sin <> 0 then
    raise exception 'Carga incompleta: % épicas, % historias, % tareas, % sin asignar/padre/sprint', n_ep, n_hu, n_tk, n_sin;
  end if;
end $$;

commit;
