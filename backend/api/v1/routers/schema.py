"""
Combined OpenAPI schema endpoint
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import httpx
import asyncio

router = APIRouter()


@router.get("/combined-openapi.json", include_in_schema=False)
async def get_combined_openapi():
    """
    Get combined OpenAPI schema from both FastAPI and DRF.
    This merges both schemas into a single document.
    """
    # Get FastAPI schema (from current app)
    from api.main import app
    fastapi_schema = app.openapi()
    
    # Get DRF schema
    try:
        async with httpx.AsyncClient() as client:
            # Call DRF schema endpoint
            response = await client.get("http://localhost:8000/api/v1/drf/schema/")
            if response.status_code == 200:
                drf_schema = response.json()
                
                # Merge paths
                for path, methods in drf_schema.get("paths", {}).items():
                    # Prefix DRF paths if needed
                    if not path.startswith("/api/v1/drf"):
                        path = f"/api/v1/drf{path}"
                    
                    # Add to FastAPI schema
                    if path not in fastapi_schema["paths"]:
                        fastapi_schema["paths"][path] = {}
                    
                    # Merge methods
                    for method, spec in methods.items():
                        # Tag DRF endpoints
                        if "tags" not in spec:
                            spec["tags"] = []
                        spec["tags"].append("DRF")
                        
                        fastapi_schema["paths"][path][method] = spec
                
                # Merge components/schemas
                if "components" in drf_schema and "schemas" in drf_schema["components"]:
                    if "components" not in fastapi_schema:
                        fastapi_schema["components"] = {"schemas": {}}
                    
                    for schema_name, schema in drf_schema["components"]["schemas"].items():
                        # Prefix DRF schemas to avoid conflicts
                        prefixed_name = f"DRF_{schema_name}"
                        fastapi_schema["components"]["schemas"][prefixed_name] = schema
                        
                        # Update references in paths
                        for path in fastapi_schema["paths"].values():
                            for method in path.values():
                                if "requestBody" in method:
                                    update_refs(method["requestBody"], schema_name, prefixed_name)
                                if "responses" in method:
                                    update_refs(method["responses"], schema_name, prefixed_name)
                
    except Exception as e:
        # If DRF schema is not available, just return FastAPI schema
        print(f"Could not fetch DRF schema: {e}")
    
    # Update title and description
    fastapi_schema["info"]["title"] = "Estuary API (Combined)"
    fastapi_schema["info"]["description"] = "Combined FastAPI and Django REST Framework endpoints"
    
    return JSONResponse(content=fastapi_schema)


def update_refs(obj, old_name, new_name):
    """Recursively update $ref values in schema."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == "$ref" and value.endswith(f"/{old_name}"):
                obj[key] = value.replace(f"/{old_name}", f"/{new_name}")
            else:
                update_refs(value, old_name, new_name)
    elif isinstance(obj, list):
        for item in obj:
            update_refs(item, old_name, new_name)