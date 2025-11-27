"""HTTP client service."""
from typing import Any, Dict, Optional

import aiohttp


class HTTPClientService:
    """Service for making HTTP requests."""

    async def get(self, url: str, headers: Optional[Dict[str, str]] = None) -> bytes:
        """Make a GET request and return response content."""
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                response.raise_for_status()
                return await response.read()

    async def post(
        self,
        url: str,
        data: Any = None,
        json: Any = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Make a POST request and return JSON response."""
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data, json=json, headers=headers) as response:
                response.raise_for_status()
                return await response.json()
