"""
Temporal.io client configuration for Estuary.
"""
import os
import logging
from django.conf import settings
from temporalio.client import Client, TLSConfig

logger = logging.getLogger(__name__)

# Default namespace for Temporal workflows
DEFAULT_NAMESPACE = "estuary"


async def get_temporal_client():
    """
    Get a configured Temporal client.
    
    Returns:
        Client: A configured Temporal client
    """
    # Get Temporal server address from settings or environment
    temporal_host = getattr(settings, "TEMPORAL_HOST", os.environ.get("TEMPORAL_HOST", "localhost:7233"))
    temporal_namespace = getattr(settings, "TEMPORAL_NAMESPACE", os.environ.get("TEMPORAL_NAMESPACE", DEFAULT_NAMESPACE))
    
    # Check if TLS is enabled
    tls_enabled = getattr(settings, "TEMPORAL_TLS_ENABLED", os.environ.get("TEMPORAL_TLS_ENABLED", "false")).lower() == "true"
    tls_config = None
    
    if tls_enabled:
        # Get TLS configuration
        tls_cert_path = getattr(settings, "TEMPORAL_TLS_CERT", os.environ.get("TEMPORAL_TLS_CERT"))
        tls_key_path = getattr(settings, "TEMPORAL_TLS_KEY", os.environ.get("TEMPORAL_TLS_KEY"))
        
        if tls_cert_path and tls_key_path:
            tls_config = TLSConfig(
                client_cert=tls_cert_path,
                client_private_key=tls_key_path,
            )
        else:
            logger.warning("TLS is enabled but certificate or key is missing")
    
    # Create and return the client
    logger.info(f"Connecting to Temporal server at {temporal_host} with namespace {temporal_namespace}")
    client = await Client.connect(
        temporal_host,
        namespace=temporal_namespace,
        tls=tls_config,
    )
    
    return client


# Singleton client instance
_client_instance = None


async def get_client():
    """
    Get a singleton Temporal client instance.
    
    Returns:
        Client: A singleton Temporal client instance
    """
    global _client_instance
    if _client_instance is None:
        _client_instance = await get_temporal_client()
    return _client_instance
