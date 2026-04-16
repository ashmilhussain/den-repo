# Tailwind CSS — Agent Instructions

---

## Installation & Setup

### New project (Vite + React)

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install -D tailwindcss @tailwindcss/vite
```

Add the Vite plugin:

```ts
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

Import Tailwind in your CSS entry point:

```css
/* src/index.css */
@import "tailwindcss";
```

### New project (Next.js)

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint --app
cd my-app
```

Next.js with `--tailwind` flag sets up Tailwind automatically.

### Build & Run

```bash
# Development (hot-reload)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Tailwind v4 — CSS-First Configuration

Tailwind v4 replaces `tailwind.config.ts` with native CSS `@theme` blocks.

### Theme setup (app.css or index.css)

```css
@import "tailwindcss";

@theme {
  /* Colors — use OKLCH for perceptual uniformity */
  --color-background: oklch(100% 0 0);
  --color-foreground: oklch(14.5% 0.025 264);
  --color-primary: oklch(55% 0.25 260);
  --color-primary-foreground: oklch(100% 0 0);
  --color-secondary: oklch(96% 0.01 264);
  --color-secondary-foreground: oklch(14.5% 0.025 264);
  --color-muted: oklch(96% 0.01 264);
  --color-muted-foreground: oklch(55% 0.02 264);
  --color-accent: oklch(96% 0.01 264);
  --color-accent-foreground: oklch(14.5% 0.025 264);
  --color-destructive: oklch(55% 0.2 25);
  --color-border: oklch(90% 0.01 264);
  --color-ring: oklch(55% 0.25 260);

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Animations */
  --animate-fade-in: fade-in 0.2s ease-out;
  --animate-slide-in: slide-in 0.2s ease-out;

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
}

/* Dark mode via class strategy */
@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}
```

### v3 → v4 Migration Reference

| Tailwind v3 | Tailwind v4 |
|---|---|
| `tailwind.config.ts` | `@theme` block in CSS |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `darkMode: "class"` | `@custom-variant dark (&:where(.dark, .dark *))` |
| `theme.extend.colors` | `@theme { --color-*: value }` |
| External animation plugins | Native `@keyframes` in `@theme` |
| `content: ["./src/**/*.tsx"]` | Auto content detection (no config needed) |

---

## Design Token Hierarchy

Tokens flow through three levels:

1. **Brand tokens** — raw values (`oklch(45% 0.2 260)`)
2. **Semantic tokens** — purpose-based (`--color-primary`, `--color-destructive`)
3. **Component tokens** — specific usage (`bg-primary`, `text-muted-foreground`)

Always use semantic tokens in components. Never hardcode raw color values.

```tsx
// ✅ Correct — uses semantic tokens
<div className="bg-background text-foreground border-border">

// ❌ Wrong — hardcoded colors
<div className="bg-white text-gray-900 border-gray-200">
```

---

## Utility Function — `cn()`

Always use `cn()` for conditional and merged class names:

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Install dependencies:

```bash
npm install clsx tailwind-merge
```

Usage:

```tsx
<button className={cn(
  "rounded-md px-4 py-2 font-medium",
  variant === "primary" && "bg-primary text-primary-foreground",
  variant === "outline" && "border border-border bg-transparent",
  disabled && "opacity-50 cursor-not-allowed"
)}>
```

---

## Styling Rules

### Use semantic color tokens

```tsx
// ✅ Uses theme tokens
<p className="text-muted-foreground">Secondary text</p>

// ❌ Manual dark mode override
<p className="text-gray-500 dark:text-gray-400">Secondary text</p>
```

### Use `gap-*` instead of `space-*`

```tsx
// ✅ Correct
<div className="flex flex-col gap-4">

// ❌ Avoid
<div className="flex flex-col space-y-4">
```

### Use `size-*` for equal width/height

```tsx
// ✅ Shorthand
<div className="size-10">

// ❌ Verbose
<div className="h-10 w-10">
```

### Use `truncate` shorthand

```tsx
// ✅ Shorthand
<p className="truncate">

// ❌ Manual
<p className="overflow-hidden text-ellipsis whitespace-nowrap">
```

### Avoid arbitrary values when possible

```tsx
// ✅ Use theme values
<div className="p-4 rounded-lg">

// ⚠️ Only when no token exists
<div className="h-[calc(100vh-64px)]">
```

### Never override z-index on overlay components

Overlay components (dialogs, sheets, dropdowns, popovers) manage their own stacking. Don't add `z-*` classes to them.

---

## Responsive Design

Mobile-first approach — base styles apply to all screens, add breakpoints to scale up:

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <Card />
  <Card />
  <Card />
</div>
```

### Breakpoints

| Prefix | Min-width | Typical use |
|---|---|---|
| `sm:` | 640px | Large phones / small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large screens |

### Container pattern

```tsx
<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

---

## Dark Mode

Use the class-based strategy with `next-themes` (Next.js) or a custom toggle:

```bash
npm install next-themes
```

```tsx
// app/providers.tsx
"use client";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

Toggle component:

```tsx
"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

---

## Performance Tips

- Prefer CSS transitions/animations over JS-driven alternatives
- Use `will-change-transform` only when measured jank exists — remove after
- Avoid deeply nested `group-*` and `peer-*` selectors (hurts readability)
- Tailwind v4 automatically tree-shakes unused styles — no manual purge config needed
- Keep utility strings readable — extract to `cn()` calls or CVA variants when they exceed ~6 classes

---

## CVA — Component Variants

Use `class-variance-authority` for typed, reusable variant maps:

```bash
npm install class-variance-authority
```

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```
