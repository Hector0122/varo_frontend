# Varo Frontend

Aplicación móvil de seguimiento financiero personal. Construida con React Native.

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | React Native | 0.85.3 |
| Navegación | React Navigation (Native Stack + Bottom Tabs) | 7.x |
| Estado Server | TanStack Query | 5.x |
| Formularios | React Hook Form | 7.x |
| HTTP | Axios | 1.x |
| Auth | AsyncStorage + JWT interceptors | - |
| Theming | React Context + useColorScheme | - |
| Image Picker | react-native-image-picker | - |

## Características

- **Autenticación** — Login, registro, refresh token automático
- **Dashboard** — Resumen de ingresos, gastos, ahorro neto, meta principal + forecast
- **Movimientos** — Lista, crear, editar, eliminar
- **Scan de tickets** — Usa Groq Vision para extraer datos de tickets/comprobantes
- **Metas** — Crear, editar, eliminar, asignar porcentaje de ahorro
- **Detalle de Meta** — Progreso, forecast widget, tendencia, agregar ahorro
- **Categorías** — CRUD de categorías personalizadas
- **Perfil** — Logout, toggle tema
- **Theming** — Soporte light/dark mode con sistema de colores centralizado

## Estructura

```
src/
  components/      — Componentes reutilizables
  screens/          — Pantallas de la app
  navigation/       — Configuración de navegación
  hooks/           — Custom hooks (useAuth)
  services/        — API client, auth service
  theme/           — ThemeContext, colors
  types/           — TypeScript interfaces
```

## Configuración

```bash
# Variables de entorno (.env)
API_BASE_URL=http://TU_IP:3000   # IP de tu máquina para dispositivo físico
```

El script `scripts/generate-config.js` lee `.env` y genera `src/config.ts` automáticamente.

## Desarrollo

```bash
# Instalar dependencias
npm install

# Generar config desde .env
node scripts/generate-config.js

# Iniciar Metro
npm start

# Android (emulador o dispositivo)
npm run android

# iOS (solo macOS)
cd ios && bundle exec pod install && cd ..
npm run ios
```

## Notas Técnicas

- **No usar react-native-dotenv** — Problemas con Metro. Usar `scripts/generate-config.js` en su lugar.
- **Auth state** — React Context (no hook local) para que el estado sea observable por todo el árbol.
- **API interceptors** — JWT automático + refresh token en 401.
- **Scan de tickets** — Requiere permisos de cámara/galería en AndroidManifest.xml

## Licencia

MIT
