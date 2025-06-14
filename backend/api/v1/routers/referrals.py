"""
Referrals router
"""
from fastapi import APIRouter

router = APIRouter()

# TODO: Implement referral endpoints
@router.get("/")
async def list_referrals():
    """List referrals"""
    return {"message": "Referrals API - Coming soon"}