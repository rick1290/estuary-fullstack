"""
Community router
"""
from fastapi import APIRouter

router = APIRouter()

# TODO: Implement community endpoints
@router.get("/")
async def list_community_posts():
    """List community posts"""
    return {"message": "Community API - Coming soon"}