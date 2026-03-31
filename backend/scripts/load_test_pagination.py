#!/usr/bin/env python3
"""
Load testing script for cursor-based pagination.
Simulates sequential pagination requests and measures performance.
"""
import asyncio
import time
import statistics
from typing import Any
import httpx


BASE_URL = "http://localhost:8000/api"
LIMIT = 20
TOTAL_PAGES = 10


async def make_request(client: httpx.AsyncClient, cursor: str | None) -> tuple[dict | None, float]:
    params = {
        "sort_by": "newest",
        "limit": str(LIMIT),
    }
    if cursor:
        params["cursor"] = cursor

    start = time.perf_counter()
    try:
        response = await client.get(f"{BASE_URL}/problems/paginated", params=params)
        response.raise_for_status()
        elapsed = time.perf_counter() - start
        return response.json(), elapsed
    except Exception as e:
        elapsed = time.perf_counter() - start
        print(f"Request failed: {e}")
        return None, elapsed


async def run_sequential_pagination_test() -> dict[str, Any]:
    response_times: list[float] = []
    all_problems: list[dict] = []
    cursor = None
    has_next = True

    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"Starting sequential pagination test...")
        print(f"Target: {TOTAL_PAGES} pages with {LIMIT} items each\n")

        for page in range(1, TOTAL_PAGES + 1):
            data, elapsed = await make_request(client, cursor)
            
            if data is None:
                print(f"Page {page}: FAILED")
                break

            response_times.append(elapsed)
            all_problems.extend(data.get("items", []))
            cursor = data.get("next_cursor")
            has_next = data.get("has_next", False)

            status = "✓" if has_next else "✓ (last)"
            print(f"Page {page}: {len(data.get('items', []))} items, cursor={'yes' if cursor else 'no'} {status} ({elapsed*1000:.1f}ms)")

            if not has_next:
                print(f"\nReached end of dataset at page {page}")
                break

            await asyncio.sleep(0.1)

    return {
        "total_pages": len(response_times),
        "total_items": len(all_problems),
        "response_times_ms": [t * 1000 for t in response_times],
        "avg_response_ms": statistics.mean(response_times) * 1000 if response_times else 0,
        "p95_response_ms": (
            sorted(response_times)[int(len(response_times) * 0.95)] * 1000
            if len(response_times) >= 20 else
            (max(response_times) * 1000 if response_times else 0)
        ),
        "min_response_ms": min(response_times) * 1000 if response_times else 0,
        "max_response_ms": max(response_times) * 1000 if response_times else 0,
    }


async def run_concurrent_pagination_test(num_concurrent: int = 5) -> dict[str, Any]:
    response_times: list[float] = []

    async def single_request(client: httpx.AsyncClient):
        return await make_request(client, None)

    print(f"\nTesting concurrent pagination ({num_concurrent} simultaneous requests)...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        start = time.perf_counter()
        
        tasks = [single_request(client) for _ in range(num_concurrent)]
        results = await asyncio.gather(*tasks)
        
        total_elapsed = time.perf_counter() - start

        for data, elapsed in results:
            if data:
                response_times.append(elapsed)

    print(f"Completed {len(response_times)} requests in {total_elapsed*1000:.1f}ms")

    return {
        "concurrent_requests": num_concurrent,
        "total_elapsed_ms": total_elapsed * 1000,
        "avg_response_ms": statistics.mean(response_times) * 1000 if response_times else 0,
    }


async def main():
    print("=" * 60)
    print("Cursor-Based Pagination Load Test")
    print("=" * 60)

    results = {}

    sequential_results = await run_sequential_pagination_test()
    results["sequential"] = sequential_results

    print("\n" + "-" * 40)
    print("Sequential Test Results:")
    print(f"  Total pages: {sequential_results['total_pages']}")
    print(f"  Total items: {sequential_results['total_items']}")
    print(f"  Avg response: {sequential_results['avg_response_ms']:.1f}ms")
    print(f"  Min response: {sequential_results['min_response_ms']:.1f}ms")
    print(f"  Max response: {sequential_results['max_response_ms']:.1f}ms")
    print(f"  P95 response: {sequential_results['p95_response_ms']:.1f}ms")

    if sequential_results['p95_response_ms'] < 200:
        print("\n✓ PASSED: P95 response time < 200ms")
    else:
        print("\n✗ FAILED: P95 response time >= 200ms")

    concurrent_results = await run_concurrent_pagination_test()
    results["concurrent"] = concurrent_results

    print("\n" + "-" * 40)
    print("Concurrent Test Results:")
    print(f"  Concurrent requests: {concurrent_results['concurrent_requests']}")
    print(f"  Total time: {concurrent_results['total_elapsed_ms']:.1f}ms")
    print(f"  Avg response: {concurrent_results['avg_response_ms']:.1f}ms")

    print("\n" + "=" * 60)
    print("Test Complete")
    print("=" * 60)

    return results


if __name__ == "__main__":
    asyncio.run(main())