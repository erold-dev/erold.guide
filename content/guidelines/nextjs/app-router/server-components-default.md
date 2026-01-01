---
title: Default to Server Components
slug: server-components-default
framework: nextjs
category: app-router
version: "1.0.0"
description: Use Server Components by default in Next.js App Router. Only add 'use client' when you need interactivity, browser APIs, or React hooks.
tags:
  - server-components
  - performance
  - rendering
  - best-practices
minVersion: "13.0.0"
deprecated: false
author: erold-team
contributors: []
createdAt: "2025-01-01T00:00:00Z"
updatedAt: "2025-01-01T00:00:00Z"
relatedGuidelines:
  - client-components-boundaries
  - data-fetching-patterns
prerequisites: []
difficulty: beginner
estimatedReadTime: 5
---

# Default to Server Components

In Next.js App Router, all components are **Server Components by default**. This is intentional and provides significant performance benefits.

## Why Server Components?

Server Components offer several advantages:

1. **Reduced JavaScript bundle** - Server Component code never ships to the browser
2. **Direct backend access** - Query databases, access file system, call internal APIs
3. **Better security** - Sensitive logic and tokens stay on the server
4. **Improved performance** - Less JavaScript to parse, compile, and execute

## When to Use Client Components

Only add `"use client"` when you need:

- **Event handlers** - `onClick`, `onChange`, `onSubmit`
- **React hooks** - `useState`, `useEffect`, `useContext`
- **Browser APIs** - `localStorage`, `window`, `navigator`
- **Third-party libraries** - That depend on browser APIs

## Code Example

```tsx
// app/products/page.tsx - Server Component (default)
// No "use client" needed
import { getProducts } from '@/lib/db';
import { ProductCard } from '@/components/ProductCard';

export default async function ProductsPage() {
  // Direct database access - runs on server
  const products = await getProducts();

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

```tsx
// components/AddToCartButton.tsx - Client Component
"use client";

import { useState } from 'react';

export function AddToCartButton({ productId }: { productId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await addToCart(productId);
    setIsLoading(false);
  };

  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isLoading ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

## Anti-patterns to Avoid

```tsx
// BAD: Don't add "use client" just because you're unsure
"use client"; // Unnecessary!

export function StaticHeader() {
  return <h1>Welcome to our store</h1>;
}
```

```tsx
// BAD: Don't make the whole page a Client Component
"use client"; // Moves everything to client!

export default function ProductsPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products').then(/* ... */);
  }, []);

  // Now you need an API route, lose streaming, increase bundle size
}
```

## Best Practice: Push Client Boundaries Down

Keep `"use client"` as low in the component tree as possible:

```tsx
// app/products/[id]/page.tsx - Server Component
import { getProduct } from '@/lib/db';
import { ProductDetails } from '@/components/ProductDetails';
import { AddToCartButton } from '@/components/AddToCartButton';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);

  return (
    <div>
      {/* Server Component - no JS shipped */}
      <ProductDetails product={product} />

      {/* Client Component - only this ships JS */}
      <AddToCartButton productId={product.id} />
    </div>
  );
}
```

## Summary

| Scenario | Component Type |
|----------|---------------|
| Fetching data | Server |
| Static content | Server |
| SEO-critical content | Server |
| Interactive buttons | Client |
| Form inputs | Client |
| Animations with state | Client |
