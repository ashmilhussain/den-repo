Preferred component structure:

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

State management hierarchy:
1. Local `useState` — for UI-only state (open/closed, hover, form fields)
2. `useReducer` — for complex local state with multiple sub-values
3. React Query — for server state (fetching, caching, mutation)
4. Context — sparingly, for truly global UI state (theme, auth)

Performance:
- `useMemo` only when the computation is actually expensive (profiled)
- `useCallback` only when passing functions to memoized children
- `React.memo` on pure components that render often with stable props
- Prefer CSS transitions over JS-driven animations
