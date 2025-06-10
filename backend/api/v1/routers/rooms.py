"""
Rooms router
"""
from fastapi import APIRouter

router = APIRouter()

# TODO: Implement room endpoints
@router.get("/")
async def list_rooms():
    """List rooms"""
    return {"message": "Rooms API - Coming soon"}