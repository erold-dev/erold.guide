---
title: Never Block the Async Event Loop
slug: never-block-async
framework: fastapi
category: async-patterns
version: "1.0.0"
description: Never use blocking operations in async endpoints. Blocking calls like time.sleep(), requests.get(), or synchronous database queries will block the entire event loop.
tags:
  - async
  - performance
  - concurrency
  - best-practices
minVersion: "0.100.0"
deprecated: false
author: erold-team
contributors: []
createdAt: "2025-01-01T00:00:00Z"
updatedAt: "2025-01-01T00:00:00Z"
relatedGuidelines:
  - asyncio-to-thread
  - async-database-patterns
prerequisites: []
difficulty: intermediate
estimatedReadTime: 7
---

# Never Block the Async Event Loop

FastAPI uses asyncio for handling concurrent requests. When you block the event loop, **all other requests wait**.

## Understanding the Problem

```python
# DANGEROUS: Blocks the entire event loop!
import time
import requests

@app.get("/bad-endpoint")
async def bad_endpoint():
    # This blocks ALL concurrent requests for 5 seconds!
    time.sleep(5)

    # This also blocks - requests is synchronous
    response = requests.get("https://api.example.com/data")

    return {"data": response.json()}
```

When this endpoint is called:
- All other async endpoints stop processing
- The server becomes unresponsive
- Throughput drops dramatically

## Common Blocking Operations

| Blocking (Don't Use) | Non-Blocking Alternative |
|---------------------|-------------------------|
| `time.sleep()` | `asyncio.sleep()` |
| `requests.get()` | `httpx.AsyncClient()` |
| `psycopg2` | `asyncpg` |
| `redis-py` (sync) | `aioredis` |
| `open().read()` | `aiofiles` |
| `subprocess.run()` | `asyncio.create_subprocess_exec()` |

## Solution 1: Use Async Libraries

```python
import asyncio
import httpx
from fastapi import FastAPI

app = FastAPI()

@app.get("/async-endpoint")
async def async_endpoint():
    # Non-blocking sleep
    await asyncio.sleep(1)

    # Non-blocking HTTP request
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")

    return {"data": response.json()}
```

## Solution 2: Use asyncio.to_thread() for Sync Libraries

When you must use a synchronous library:

```python
import asyncio
from PIL import Image  # Synchronous library

@app.post("/process-image")
async def process_image(file: UploadFile):
    contents = await file.read()

    # Run CPU-bound sync operation in thread pool
    processed = await asyncio.to_thread(
        process_with_pillow,
        contents
    )

    return {"processed": True}

def process_with_pillow(image_bytes: bytes) -> bytes:
    # This runs in a separate thread, not blocking event loop
    img = Image.open(io.BytesIO(image_bytes))
    img = img.resize((800, 600))
    output = io.BytesIO()
    img.save(output, format='PNG')
    return output.getvalue()
```

## Solution 3: Use run_in_threadpool for Dependencies

```python
from fastapi.concurrency import run_in_threadpool
import hashlib

def expensive_hash(data: str) -> str:
    # CPU-intensive operation
    for _ in range(100000):
        data = hashlib.sha256(data.encode()).hexdigest()
    return data

@app.post("/hash")
async def hash_data(data: str):
    # Run in thread pool to avoid blocking
    result = await run_in_threadpool(expensive_hash, data)
    return {"hash": result}
```

## Database Example

```python
# BAD: Synchronous database driver
import psycopg2

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    conn = psycopg2.connect(DATABASE_URL)  # Blocks!
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))  # Blocks!
    return cur.fetchone()
```

```python
# GOOD: Async database driver
import asyncpg

@app.on_event("startup")
async def startup():
    app.state.pool = await asyncpg.create_pool(DATABASE_URL)

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE id = $1",
            user_id
        )
    return dict(row)
```

## When to Use Sync vs Async Endpoints

```python
# Use async for I/O-bound operations
@app.get("/fetch-data")
async def fetch_data():
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
    return response.json()

# Use sync (no async) for CPU-bound that's already threaded
@app.get("/cpu-bound")
def cpu_bound():  # Note: no async!
    # FastAPI automatically runs this in a thread pool
    result = heavy_computation()
    return {"result": result}
```

## Testing for Blocking

```python
import asyncio
import time

async def test_not_blocking():
    """Test that endpoint doesn't block event loop."""
    start = time.time()

    # Run 10 requests concurrently
    async with httpx.AsyncClient() as client:
        tasks = [
            client.get("http://localhost:8000/endpoint")
            for _ in range(10)
        ]
        responses = await asyncio.gather(*tasks)

    duration = time.time() - start

    # If endpoint takes 1s and we're blocking,
    # 10 requests = 10s. Concurrent = ~1s
    assert duration < 2.0, "Endpoint is blocking!"
```

## Summary

| Scenario | Solution |
|----------|----------|
| HTTP requests | `httpx.AsyncClient` |
| Database queries | `asyncpg`, `aiomysql`, async SQLAlchemy |
| File I/O | `aiofiles` |
| Sleep/delays | `asyncio.sleep()` |
| CPU-bound work | `asyncio.to_thread()` or sync endpoint |
| Legacy sync library | `run_in_threadpool()` |
