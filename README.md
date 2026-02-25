# Scheduler — Planificador de Horaris

Resumen breve

- Scheduler es una aplicación de planificación de turnos y gestión de plantilla, privada y offline-first, pensada para gestión de personal por áreas, perfiles, plantillas y ausencias.

Objetivos

- Interfaz de escritorio instalable (Electron) que funciona sin conexión.
- Almacenamiento local SQL (SQLite) para persistencia y consulta eficiente.
- Autenticación local (hash de contraseñas) y opcional cifrado del fichero de datos.
- Páginas principales: Dashboard, Calendario, Plantilla, Ausencias, Configuración.

Características clave (resumen)

- Dashboard: fecha actual, 4 tarjetas de resumen, aviso de ausencias sin cobertura, bloque de formación por área.
- Calendario: vistas General / Por Área / Ausencias; vista Semana / Mes; navegación (prev/next/hoy); leyendas para turnos y áreas; tabla por perfil/trabajador/días.
- Plantilla: CRUD de trabajadores con datos de contrato, perfiles fijos y habilidades adicionales.
- Ausencias: crear ausencias, mostrar sin cobertura primero con sugerencias, gestionar coberturas.
- Configuración: definir áreas (nombre + color), crear perfiles por área (nombre, turno, horario, días de la semana).

Propuesta de tech stack (recomendado)

- Runtime y UI: Electron + React + TypeScript + Vite (renderer) — rápido para desarrollo y builds.
- Estilado: TailwindCSS o CSS Modules (opcional) para UI consistente.
- Base de datos local: SQLite con `better-sqlite3` (bindings nativos, síncrono y con buen rendimiento). Alternativa: `sqlite3` o un ORM ligero (TypeORM) si se desea capa de abstracción.
- Autenticación: `bcrypt` para hash de contraseñas; almacenar usuarios en la DB local. Considerar cifrar la DB (SQLCipher) para mayor seguridad.
- Empaquetado / distribución: `electron-builder` para crear instaladores multiplataforma.
- Contenerización dev: Dockerfile / docker-compose para entorno de desarrollo (instalar dependencias, correr tests, builds reproducibles).

Razones de la elección

- Electron+React+TypeScript: amplia comunidad, permitiendo una UI de calidad y builds instalables.
- SQLite: motor ligero, archivo único que facilita copia de seguridad y offline.
- `better-sqlite3`: sencillo de usar desde Node y con buen rendimiento en entornos locales.

Seguridad y privacidad

- La app será privada por diseño y funcionará offline.
- Guardar contraseñas con `bcrypt` y ofrecer opción de cifrar el fichero DB (recomendado para producción).

Estructura y flujo de datos (alto nivel)

- UI <-> Servicio local (Electron main) <-> Capa DB (SQLite).
- El proceso `main` de Electron expone un API IPC segura para operaciones CRUD; la lógica crítica (auth, DB) se ejecuta en `main`.

Plan de implementación (etapas)

1. Preparar repo: `package.json`, TypeScript, ESLint/Prettier, `electron-builder` config.
2. Scaffold: Electron + React + Vite template en TypeScript.
3. Capa persistencia: inicializar SQLite y escribir migraciones/seed básico (áreas, turnos, perfiles de ejemplo).
4. Auth local: registrar / iniciar sesión (bcrypt). Sesión mantenida en memoria del proceso main.
5. Pages básicas: Dashboard, Calendario (esqueleto), Plantilla, Ausencias, Configuración (UI inicial).
6. Implementar la lógica de calendario y reglas para asignación automática (algoritmo de generación basado en perfiles fijos y suplencias).
7. Mejoras: búsquedas, filtros por área, arrastrar/soltar en calendario, edición rápida in-place.
8. Tests unitarios y de integración, empaquetado con `electron-builder`.

Scripts sugeridos (desarrollo)

```
# instalar dependencias
npm install

# correr dev (renderer + electron)
npm run dev

# build
npm run build

# empaquetar (electron-builder)
npm run dist
```

Docker / desarrollo reproducible

- Se puede crear un contenedor Node para instalar dependencias, ejecutar linters y construir artefactos. Para correr la app en modo GUI se recomienda trabajar fuera del contenedor o usar X11/Forwarding según plataforma.

Decisiones abiertas (elige una)

- a) ORM o queries directas con `better-sqlite3`?
- b) ¿Usamos TailwindCSS o CSS tradicional/component-based styles?
- c) ¿Queréis cifrado de DB desde el inicio (SQLCipher) o dejarlo opcional?

Cómo procedo ahora

- Confirma las decisiones de tech stack y preparo el scaffold inicial: `package.json`, plantilla de Electron+React+TypeScript, Dockerfile de dev, y esquema DB inicial.

Si querés que documente más el modelo de datos o el algoritmo de asignación automática, lo desarrollo y lo añado al repo.

Empaquetado y distribución

- Para crear un instalador local tras construir la app ejecutar:

```
npm install --production=false
npm run dist
```

Esto ejecutará `vite build` (renderer), `tsc` (compila el `main`) y luego `electron-builder` para generar instaladores en `dist` per platform.

Notas sobre Windows (desarrollo local)

- En Windows puedes correr la app en modo dev con:

```powershell
npm install
npm run dev
```

Notas sobre empaquetado multiplataforma

- La configuración de `electron-builder` genera instaladores para Windows (NSIS), macOS (DMG) y Linux (AppImage + deb) si se ejecuta en la plataforma correspondiente. Para crear instaladores Windows desde Linux/macOS necesitarás configurar herramientas de cross-compilation o usar runners Windows en CI.
- Antes de empaquetar reemplaza los iconos de `build/icon.png`, `build/icon.ico` y `build/icon.icns` con imágenes reales.

CI y firmados

- El pipeline de CI genera artefactos `dist/**`. Para firmar instaladores en Windows/macOS se requiere configurar secretos de firma y pasos adicionales en la CI.

Firmado de instaladores (resumen)

Windows (code signing)

- Registra un certificado de firma de código en un proveedor (p.ej. DigiCert, Sectigo) y exporta un archivo `.pfx` con contraseña.
- En el runner (CI) guarda el `.pfx` como un secreto (o sube a secure storage) y configura variables de entorno: `SIGNING_KEY` (base64 of .pfx) y `SIGNING_KEY_PASSWORD`.
- En el flujo de GitHub Actions añade un paso para descargar el `.pfx` desde `SIGNING_KEY` and run `signtool` (Windows runner) or use `electron-builder` sign options. Ejemplo conceptual:

```yaml
- name: Setup signing cert
	run: echo "$SIGNING_KEY" | base64 --decode > signing.pfx
- name: Sign installer (Windows)
	run: |
		signtool sign /fd SHA256 /a /f signing.pfx /p "$SIGNING_KEY_PASSWORD" dist/YourInstaller.exe
	shell: bash
```

macOS (codesign + notarization)

- Obtén certificados Developer ID Application and Installer from Apple and store them in CI secrets.
- Configure `electron-builder` to use your Apple Team ID and identity; you can use `electron-builder`'s `macSign`/`notarize` settings and set `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables (CSC_LINK is a base64 PKCS12 file or downloadable url protected by token).
- Notarization requires Apple API key or username/password in the CI secrets; see `electron-builder` docs.

CI secrets (suggested)

- `SIGNING_KEY` - base64 encoded PFX (Windows)
- `SIGNING_KEY_PASSWORD` - password for PFX
- `CSC_LINK` - base64 encoded macOS signing key or URL
- `CSC_KEY_PASSWORD` - password for macOS key
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` or Apple API key variables if using notarization

Security note

- Store signing material securely (GitHub Secrets or a secure vault). Restrict access and rotate keys periodically.

Tutorial en la app

- La primera vez que abras la app, tras crear el administrador, verás un pequeño tutorial en el `Dashboard` con pasos: crear áreas, crear perfils, añadir treballadors i crear absències. Puedes marcarlo como visto para no mostrarlo de nuevo.
