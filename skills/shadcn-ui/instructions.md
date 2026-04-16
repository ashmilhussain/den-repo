# shadcn/ui — Agent Instructions

---

## What is shadcn/ui

Components are **copied into your project** — you own and customize the code. Not an npm dependency. Built on Radix UI primitives (accessibility) + Tailwind CSS (styling).

---

## Project Setup

### New Next.js project

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint --app
cd my-app
npx shadcn@latest init
```

### New Vite project

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install -D tailwindcss @tailwindcss/vite
npx shadcn@latest init
```

### Existing project

```bash
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
npx shadcn@latest init
```

### Build & Run

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## CLI Reference

```bash
# Initialize shadcn in a project
npx shadcn@latest init
npx shadcn@latest init --defaults          # accept all defaults
npx shadcn@latest init --preset base-nova  # use a preset theme

# Add components
npx shadcn@latest add button
npx shadcn@latest add button card dialog form input select toast
npx shadcn@latest add --all                # add every component

# Preview before adding
npx shadcn@latest add button --dry-run     # see what files would be created
npx shadcn@latest add button --diff        # see exact code changes

# Search components
npx shadcn@latest search "sidebar"
npx shadcn@latest search @magicui "shimmer"

# Get component docs
npx shadcn@latest docs button
npx shadcn@latest docs dialog select form

# View component source
npx shadcn@latest view @shadcn/button

# Project info
npx shadcn@latest info
```

---

## Available Components

| Component | Install | Purpose |
|---|---|---|
| `button` | `npx shadcn@latest add button` | Action triggers — 6 variants (default, destructive, outline, secondary, ghost, link) |
| `input` | `npx shadcn@latest add input` | Text input field |
| `textarea` | `npx shadcn@latest add textarea` | Multi-line text input |
| `label` | `npx shadcn@latest add label` | Accessible form labels |
| `form` | `npx shadcn@latest add form` | React Hook Form + Zod integration |
| `card` | `npx shadcn@latest add card` | Container with Header, Title, Description, Content, Footer |
| `dialog` | `npx shadcn@latest add dialog` | Modal overlay (requires DialogTitle for accessibility) |
| `sheet` | `npx shadcn@latest add sheet` | Slide-over panel (top, right, bottom, left) |
| `select` | `npx shadcn@latest add select` | Dropdown — SelectItem must be inside SelectGroup |
| `checkbox` | `npx shadcn@latest add checkbox` | Toggle input |
| `radio-group` | `npx shadcn@latest add radio-group` | Exclusive option selection |
| `switch` | `npx shadcn@latest add switch` | On/off toggle |
| `toast` | `npx shadcn@latest add toast` | Notifications (add `<Toaster />` to root layout) |
| `table` | `npx shadcn@latest add table` | Data display with TanStack Table support |
| `tabs` | `npx shadcn@latest add tabs` | Content sections — TabsTrigger must be inside TabsList |
| `dropdown-menu` | `npx shadcn@latest add dropdown-menu` | Context actions |
| `popover` | `npx shadcn@latest add popover` | Floating content on click |
| `tooltip` | `npx shadcn@latest add tooltip` | Floating content on hover |
| `command` | `npx shadcn@latest add command` | Command palette / search |
| `avatar` | `npx shadcn@latest add avatar` | User image (always include AvatarFallback) |
| `badge` | `npx shadcn@latest add badge` | Status labels — use instead of custom styled spans |
| `separator` | `npx shadcn@latest add separator` | Divider — use instead of `<hr>` |
| `skeleton` | `npx shadcn@latest add skeleton` | Loading placeholder |
| `alert` | `npx shadcn@latest add alert` | Callout messages |
| `accordion` | `npx shadcn@latest add accordion` | Collapsible sections |
| `scroll-area` | `npx shadcn@latest add scroll-area` | Custom scrollable container |
| `sidebar` | `npx shadcn@latest add sidebar` | App navigation sidebar |
| `breadcrumb` | `npx shadcn@latest add breadcrumb` | Navigation trail |
| `pagination` | `npx shadcn@latest add pagination` | Page navigation |
| `chart` | `npx shadcn@latest add chart` | Recharts wrapper with theme integration |
| `progress` | `npx shadcn@latest add progress` | Progress indicator |
| `slider` | `npx shadcn@latest add slider` | Range input |
| `calendar` | `npx shadcn@latest add calendar` | Date picker calendar |
| `date-picker` | `npx shadcn@latest add date-picker` | Date selection with popover |
| `combobox` | `npx shadcn@latest add combobox` | Searchable select |
| `input-otp` | `npx shadcn@latest add input-otp` | OTP/PIN input |
| `resizable` | `npx shadcn@latest add resizable` | Resizable panels |

---

## Component Selection Guide

| Need | Use |
|---|---|
| Button / action | `Button` with variant prop |
| Form inputs | Input, Select, Combobox, Switch, Checkbox, RadioGroup, Textarea, Slider |
| Form with validation | `Form` + React Hook Form + Zod |
| Toggle 2–5 options | `ToggleGroup` + `ToggleGroupItem` |
| Data display | Table, Card, Badge, Avatar |
| Navigation | Sidebar, NavigationMenu, Breadcrumb, Tabs, Pagination |
| Modal overlay | `Dialog` (centered) or `Sheet` (slide-over) or `Drawer` (bottom) |
| Confirmation | `AlertDialog` |
| Feedback | Toast (sonner), Alert, Progress, Skeleton |
| Command palette | `Command` inside `Dialog` |
| Charts | `Chart` (wraps Recharts) |
| Layout sections | Card, Separator, Resizable, ScrollArea, Accordion, Collapsible |
| Menus | DropdownMenu, ContextMenu, Menubar |
| Tooltips / info | Tooltip (hover), HoverCard, Popover (click) |

---

## Code Patterns

### Basic Button

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Save</Button>
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="outline" disabled>Loading...</Button>
<Button variant="ghost" size="icon">
  <Settings className="size-4" />
</Button>
```

### Form with Zod Validation

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: FormValues) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="password"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Sign in</Button>
      </form>
    </Form>
  );
}
```

### Dialog

```tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Edit Profile</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here.
      </DialogDescription>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button type="submit">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Sheet (Slide-over)

```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Navigation</SheetTitle>
    </SheetHeader>
    {/* Content */}
  </SheetContent>
</Sheet>
```

### Toast Notifications

```tsx
// 1. Add <Toaster /> to root layout (once)
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

// 2. Use in any component
import { useToast } from "@/components/ui/use-toast";

const { toast } = useToast();

toast({ title: "Saved", description: "Your changes have been saved." });
toast({ variant: "destructive", title: "Error", description: "Something went wrong." });
```

### Card Composition

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Project Settings</CardTitle>
    <CardDescription>Manage your project configuration.</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Form fields */}
  </CardContent>
  <CardFooter className="flex justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Data Table

```tsx
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
}

const columns: ColumnDef<Task>[] = [
  { accessorKey: "title", header: "Title" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "done" ? "default" : "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button variant="ghost" size="sm">Edit</Button>
    ),
  },
];

<DataTable columns={columns} data={tasks} />
```

### Chart (Recharts)

```tsx
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  visitors: { label: "Visitors", color: "var(--chart-1)" },
} satisfies ChartConfig;

<ChartContainer config={chartConfig} className="min-h-[200px] w-full">
  <BarChart data={data}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" />
    <Bar dataKey="visitors" fill="var(--color-visitors)" radius={4} />
    <ChartTooltip content={<ChartTooltipContent />} />
  </BarChart>
</ChartContainer>
```

---

## Composition Rules

### Always use full component composition

```tsx
// ✅ Full Card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>{/* content */}</CardContent>
  <CardFooter>{/* actions */}</CardFooter>
</Card>

// ❌ Incomplete
<Card>
  <h2>Title</h2>
  <p>Content</p>
</Card>
```

### Items inside their Group

```tsx
// ✅ Correct
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectItem value="a">Option A</SelectItem>
      <SelectItem value="b">Option B</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>

// ✅ TabsTrigger inside TabsList
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Accessibility requirements

- `Dialog` and `Sheet` **must** have a `DialogTitle` / `SheetTitle`
- `Avatar` **must** include `AvatarFallback`
- Forms use `FormLabel` + `FormMessage` for screen reader support
- Use `asChild` on triggers when wrapping custom elements

### Use existing components over custom markup

| Instead of... | Use |
|---|---|
| `<hr>` | `<Separator />` |
| styled `<span>` for status | `<Badge />` |
| custom loading div | `<Skeleton />` |
| custom callout div | `<Alert />` |
| manual toast system | `useToast()` + `<Toaster />` |

---

## Styling Rules

- Use `className` for layout only (padding, margin, width) — never override component colors
- Use `cn()` for conditional classes
- Use `gap-*` not `space-*` for flex/grid spacing
- Use `size-*` when width and height are equal
- Never add `z-index` to overlay components (Dialog, Sheet, Popover, DropdownMenu)
- Use semantic tokens (`bg-background`, `text-muted-foreground`), never manual dark mode overrides
- Don't add `className` to DS components except `h-*`/`w-*` on `DialogContent` and `Popover`

---

## Theming with CSS Variables

Configure in `globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --border: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... remaining dark tokens */
  }
}
```

---

## Updating Components

When upstream shadcn/ui updates a component:

```bash
# 1. Preview what would change
npx shadcn@latest add button --dry-run

# 2. See the diff
npx shadcn@latest add button --diff

# 3. Apply update (overwrites your file)
npx shadcn@latest add button --overwrite
```

**Never use `--overwrite` without checking `--diff` first** — it replaces your customizations.

---

## Client Components (Next.js App Router)

Any component using hooks, event handlers, or browser APIs needs the `"use client"` directive:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Counter() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>{count}</Button>;
}
```

Server Components can import and render shadcn components that don't use client-side features (Card, Badge, Separator, etc.).

---

## Path Aliases

Ensure `@` alias is configured:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

For Vite, also add to `vite.config.ts`:

```ts
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```
