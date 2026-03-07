---
name: React & Next.js App Router Best Practices
description: An intensive guide for handling React Server Components, hydration issues, client/server boundaries, state management, UI frameworks like Tailwind and shadcn, and routing paradigms in Next.js.
---

# React & Next.js App Router Best Practices

## 1. Navigating Server and Client Boundaries (`"use client"`)
### The Golden Rule
*   **Default everything to Server Components.** Render as much layout, data fetching, and boilerplate on the server as possible.
*   **Only use `"use client"` when you fundamentally require it.** 
    *   You need interactive hooks (`useState`, `useEffect`, `useReducer`, `useRef`).
    *   You need browser APIs (`window`, `document`, `localStorage`).
    *   You need event listeners (`onClick`, `onChange`).

### Hydration Nightmares
**Hydration Mismatches** occur when the HTML rendered on the server differs from the initial HTML rendered by the client. React expects them to be pixel-perfect copies before subsequent renders.
*   **Common Culprits:** Using date/time functions like `Date.now()`, using `Math.random()`, or rendering components based on the `window` object (e.g., `typeof window !== 'undefined'`).
*   **Resolution Pattern:** Defer browser-dependent logic until *after* the initial render via `useEffect` and an `isMounted` state check.

```tsx
// ❌ Anti-pattern (Hydration Error)
const time = Date.now();
return <div>{time}</div>;

// ✅ Correct Pattern (Wait for mount to manipulate DOM)
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null; // Or skeleton
return <div>{Date.now()}</div>;
```

## 2. Server Actions instead of API Routes
In Next.js App Router, prefer Server Actions alongside `useTransition` for mutations rather than building explicit `/api/route` handers and doing large `fetch()` calls. 

```tsx
// server-actions.ts
"use server";
import { revalidatePath } from 'next/cache';

export async function submitData(formData: FormData) {
  const data = formData.get("name");
  // Database mutation...
  revalidatePath('/dashboard');
  return { success: true };
}
```

## 3. Dealing with Shadcn & Tailwind Over-Engineering
When working with Shadcn UI and sophisticated generic table components (e.g., TanStack Table):
*   Do not drill raw server responses straight into generalized client components. Transform database output into the specific shape the client component needs via a `useMemo` map, or transform it within the Server Component before passing it as props.
*   Keep logic out of the columns array. If an action needs dynamic state or a dialog trigger, build a smaller proxy component (like `<RowActions row={row} />`) rather than rendering inline anonymous components directly into the cells.

## 4. ESLint Errors are Signals, Not Annoyances
*   If ESLint complains about `avoid calling setState() directly within an effect`, there is likely a much cleaner layout implementation.
*   Whenever you see `eslint-disable-next-line`: Stop. Only use this if you know absolutely, without a doubt, a rule is erroneously flagging standard library code. 

## 5. UI/UX "Wows" Checklist
*   **Never allow generic scrollbars.** Inject `hide-scrollbar` utilities. Look professional.
*   **Stateful Animations**. Add micro-animations using Tailwinds `transition-all duration-300 ease-in-out` on buttons, hover cards, and route transitions.
*   **Data Density**. Avoid modal popups whenever possible to streamline workflows. Instead, use split-pane layouts, expanders, inline editing capabilities, and hover states. 
*   **Keyboard First:** If developing an admin-panel or internal tools, build CMD/CTRL keyboard listeners into robust client components to facilitate extremely fast navigations.
