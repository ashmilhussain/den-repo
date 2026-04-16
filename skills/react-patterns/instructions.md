# React Patterns — Agent Instructions

---

## Creating a React App

Use Vite (preferred over CRA):

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
```

For plain JavaScript (no TypeScript):
```bash
npm create vite@latest my-app -- --template react
```

---

## Project Structure

```
my-app/
├── public/                  # Static assets served as-is (favicon, robots.txt)
├── src/
│   ├── assets/              # Images, fonts, SVGs imported by components
│   ├── components/          # Reusable UI components
│   │   └── Button/
│   │       ├── Button.tsx
│   │       └── Button.module.css
│   ├── pages/               # Route-level components (one per route)
│   ├── hooks/               # Custom hooks (useXxx.ts)
│   ├── context/             # React context providers
│   ├── lib/                 # Third-party wrappers, API clients
│   ├── utils/               # Pure utility functions
│   ├── types/               # Shared TypeScript types/interfaces
│   ├── App.tsx              # Root component, router setup
│   └── main.tsx             # Entry point — ReactDOM.createRoot
├── index.html               # HTML shell (Vite entry)
├── vite.config.ts           # Vite config (aliases, plugins, SSR options)
├── tsconfig.json            # TypeScript config
├── tsconfig.node.json       # TypeScript config for Vite/Node tooling
└── package.json
```

### Major Files Explained

| File | Purpose |
|---|---|
| `src/main.tsx` | App bootstrap — mounts `<App />` into `#root`, wraps with providers |
| `src/App.tsx` | Router, global layout, top-level context providers |
| `index.html` | Single HTML shell; Vite injects the bundle here |
| `vite.config.ts` | Aliases (`@/` → `src/`), plugins (e.g. `@vitejs/plugin-react`), SSR config |
| `tsconfig.json` | Path aliases must match `vite.config.ts` |
| `package.json` | Scripts (`dev`, `build`, `preview`), dependencies |

---

## Building the App

**Always build before running in production mode.**

```bash
npm run build
```

- Output lands in `dist/`
- Vite bundles, tree-shakes, and minifies
- TypeScript errors will fail the build — fix them before deploying

For SSR projects, build both client and server:
```bash
npm run build          # or the project-specific build:client + build:server scripts
```

Check `vite.config.ts` for any custom `build.outDir` or SSR entry config.

---

## Running the App

### Development (hot-reload)
```bash
npm run dev
```
Starts at `http://localhost:5173` by default.

### Preview built output (production-like, locally)
```bash
npm run build   # build first
npm run preview
```
Starts at `http://localhost:4173`. Always do this before deploying to catch SSR/hydration issues.

### Production (Node SSR server)
```bash
npm run build
node dist/server/index.js   # path depends on project setup
```

---

## Preferred Component Structure

```tsx
// 1. Imports
// 2. Types/interfaces
// 3. Constants (outside component)
// 4. Component function
//   - hooks at the top
//   - derived values
//   - event handlers
//   - return JSX
// 5. Sub-components in the same file if small, else extract
```

---

## State Management Hierarchy

1. Local `useState` — UI-only state (open/closed, hover, form fields)
2. `useReducer` — complex local state with multiple sub-values
3. React Query — server state (fetching, caching, mutation)
4. Context — sparingly, for truly global UI state (theme, auth)

---

## Performance

- `useMemo` only when the computation is actually expensive (profiled)
- `useCallback` only when passing functions to memoized children
- `React.memo` on pure components that render often with stable props
- Prefer CSS transitions over JS-driven animations
