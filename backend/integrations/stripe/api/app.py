"""
FastAPI application configuration for Stripe integration.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .endpoints import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle.
    """
    # Startup
    logger.info("Starting Stripe FastAPI app")
    yield
    # Shutdown
    logger.info("Shutting down Stripe FastAPI app")


# Create FastAPI app
app = FastAPI(
    title="Estuary Stripe Checkout API",
    description="FastAPI-based checkout system for Estuary",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/stripe/docs",
    redoc_url="/stripe/redoc",
    openapi_url="/stripe/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Handle uncaught exceptions globally.
    """
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "details": str(exc) if hasattr(request.app.state, 'debug') and request.app.state.debug else None
        }
    )


# Include routers
app.include_router(router)


# Health check endpoint
@app.get("/stripe/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "stripe-checkout",
        "version": "1.0.0"
    }


# Django integration helpers
def get_django_user(request: Request):
    """
    Extract Django user from request.
    This is used when FastAPI is mounted within Django.
    """
    # Check if this is a Django request wrapper
    if hasattr(request, '_request'):
        django_request = request._request
        if hasattr(django_request, 'user') and django_request.user.is_authenticated:
            return django_request.user
    
    # Check direct user attribute
    if hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
        
    return None


# Middleware to inject Django user into FastAPI request
@app.middleware("http")
async def inject_django_user(request: Request, call_next):
    """
    Middleware to inject Django user into FastAPI request state.
    """
    # Try to get Django user
    django_user = get_django_user(request)
    if django_user:
        request.state.user = django_user
    
    response = await call_next(request)
    return response