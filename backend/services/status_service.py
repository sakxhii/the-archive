from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Global status store (simple in-memory for demo, use Redis/DB for prod)
# Key: request_id, Value: status_message
status_store = {}

async def update_status(request_id: str, message: str):
    """Updates the status for a given request ID."""
    try:
        if request_id:
            status_store[request_id] = message
            # Keep store small (optional cleanup logic could go here)
            logger.info(f"Status Update [{request_id}]: {message}")
    except Exception as e:
        logger.error(f"Error updating status: {e}")

@router.get("/status-stream/{request_id}")
async def status_stream(request_id: str):
    """
    Streams status updates for a specific request ID using Server-Sent Events (SSE).
    """
    async def event_generator():
        last_message = ""
        # Timeout after 60 seconds to prevent infinite connections
        for _ in range(600): 
            current_message = status_store.get(request_id, "Initializing...")
            
            if current_message != last_message:
                yield f"data: {json.dumps({'status': current_message})}\n\n"
                last_message = current_message
            
            if current_message == "Complete" or current_message.startswith("Error"):
                yield f"data: {json.dumps({'status': current_message})}\n\n"
                break
                
            await asyncio.sleep(0.1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
