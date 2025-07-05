"""
Courier client for sending email notifications.
"""
import logging
import os
from typing import Dict, List, Optional, Union

import courier
from courier.client import Courier
from django.conf import settings

logger = logging.getLogger(__name__)


class CourierClient:
    """
    Client for interacting with the Courier API.
    """
    def __init__(self, auth_token: Optional[str] = None, timeout: int = 60):
        """
        Initialize the Courier client.
        
        Args:
            auth_token: Courier authorization token. Defaults to COURIER_AUTH_TOKEN env var.
            timeout: Request timeout in seconds.
        """
        self.auth_token = auth_token or os.environ.get('COURIER_AUTH_TOKEN') or getattr(settings, 'COURIER_AUTH_TOKEN', None)
        if not self.auth_token:
            logger.warning("No Courier authorization token provided. Email notifications will not be sent.")
        
        self.timeout = timeout
        self.client = Courier(authorization_token=self.auth_token)
    
    def send_email(
        self, 
        email: str, 
        subject: str, 
        body: str, 
        data: Optional[Dict] = None,
        template_id: Optional[str] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict:
        """
        Send an email using Courier.
        
        Args:
            email: Recipient email address
            subject: Email subject
            body: Email body content
            data: Additional data for template variables
            template_id: Optional Courier template ID
            idempotency_key: Optional idempotency key for the request
            
        Returns:
            Response from Courier API
        """
        try:
            if not self.auth_token:
                logger.warning(f"Cannot send email to {email}: No Courier authorization token")
                return {"error": "No Courier authorization token"}
            
            # Prepare recipient data
            recipient_data = data or {}
            
            if template_id:
                # Use template-based message with Courier v6 API
                logger.info(f"Sending template email with template_id: {template_id}")
                message = courier.TemplateMessage(
                    template=template_id,
                    to=courier.UserRecipient(email=email),
                    data=recipient_data
                )
                
                response = self.client.send(
                    message=message,
                    idempotency_key=idempotency_key
                )
            else:
                # Use content-based message with Courier v6 API
                message = courier.ContentMessage(
                    to=courier.UserRecipient(email=email),
                    content=courier.ElementalContentSugar(
                        title=subject,
                        body=body
                    ),
                    data=recipient_data,
                    routing=courier.Routing(
                        method="single",
                        channels=["email"]
                    )
                )
                
                response = self.client.send(
                    message=message,
                    idempotency_key=idempotency_key
                )
            
            # Handle response from Courier v6 API
            request_id = response.request_id
            logger.info(f"Email sent to {email} with request ID: {request_id}")
            return {"request_id": request_id}
            
        except Exception as e:
            error_msg = str(e)
            # Try to extract more detailed error info
            if hasattr(e, 'response') and e.response:
                try:
                    error_details = e.response.json()
                    error_msg = f"{str(e)} - Details: {error_details}"
                except:
                    error_msg = f"{str(e)} - Status: {e.response.status_code}"
            
            logger.exception(f"Error sending email to {email}: {error_msg}")
            return {"error": error_msg}


# Create a singleton instance for easy import
courier_client = CourierClient()