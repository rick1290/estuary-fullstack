"""
Main FastAPI application for Estuary Marketplace API
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "estuary.settings")
django.setup()

from api.v1.routers import (
    auth,
    bookings,
    services,
    practitioners,
    payments,
    locations,
    rooms,
    media,
    notifications,
    messaging,
    reviews,
    referrals,
    users,
    community,
    availability,
    search,
    analytics,
    streams,
    practitioner_subscriptions,
    stripe_webhooks,
    schema,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown"""
    # Startup
    print("Starting up Estuary API...")
    yield
    # Shutdown
    print("Shutting down Estuary API...")


# Create FastAPI app
app = FastAPI(
    title="Estuary Marketplace API",
    description="API for wellness practitioner marketplace",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Check if the API is running"""
    return {"status": "healthy", "service": "estuary-api"}


# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["Bookings"])
app.include_router(services.router, prefix="/api/v1/services", tags=["Services"])
app.include_router(practitioners.router, prefix="/api/v1/practitioners", tags=["Practitioners"])
app.include_router(availability.router, prefix="/api/v1/practitioners", tags=["Availability"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(stripe_webhooks.router, prefix="/api/v1/payments", tags=["Webhooks"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(rooms.router, prefix="/api/v1/rooms", tags=["Rooms"])
app.include_router(media.router, prefix="/api/v1/media", tags=["Media"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(messaging.router, prefix="/api/v1/messaging", tags=["Messaging"])
app.include_router(reviews.router, prefix="/api/v1/reviews", tags=["Reviews"])
app.include_router(referrals.router, prefix="/api/v1/referrals", tags=["Referrals"])
app.include_router(community.router, prefix="/api/v1/community", tags=["Community"])
app.include_router(search.router, prefix="/api/v1", tags=["Search & Discovery"])
app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])
app.include_router(streams.router, prefix="/api/v1/streams", tags=["Streams"])
app.include_router(practitioner_subscriptions.router, prefix="/api/v1/practitioner-subscriptions", tags=["Practitioner Subscriptions"])
app.include_router(schema.router, prefix="/api/v1", tags=["Schema"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle all uncaught exceptions"""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)