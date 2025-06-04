"""
Courier client for sending email notifications.
"""
import logging
import os
from typing import Dict, List, Optional, Union

import courier
from courier.client import Courier, AsyncCourier
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
        self.client = Courier(authorization_token=self.auth_token, timeout=self.timeout)
        self.async_client = AsyncCourier(authorization_token=self.auth_token, timeout=self.timeout)
    
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
                # Use template-based message
                response = self.client.send(
                    message=courier.TemplateMessage(
                        template=template_id,
                        to=courier.UserRecipient(
                            email=email,
                            data=recipient_data
                        )
                    ),
                    idempotency_key=idempotency_key
                )
            else:
                # Use content-based message
                response = self.client.send(
                    message=courier.ContentMessage(
                        to=courier.UserRecipient(
                            email=email,
                            data=recipient_data
                        ),
                        content=courier.ElementalContentSugar(
                            title=subject,
                            body=body,
                        ),
                        routing=courier.Routing(method="all", channels=["email"]),
                    ),
                    idempotency_key=idempotency_key
                )
            
            logger.info(f"Email sent to {email} with request ID: {response.request_id}")
            return {"request_id": response.request_id}
            
        except courier.core.ApiError as e:
            logger.error(f"Error sending email to {email}: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.exception(f"Unexpected error sending email to {email}: {str(e)}")
            return {"error": str(e)}
    
    async def send_email_async(
        self, 
        email: str, 
        subject: str, 
        body: str, 
        data: Optional[Dict] = None,
        template_id: Optional[str] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict:
        """
        Send an email using Courier asynchronously.
        
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
                # Use template-based message
                response = await self.async_client.send(
                    message=courier.TemplateMessage(
                        template=template_id,
                        to=courier.UserRecipient(
                            email=email,
                            data=recipient_data
                        )
                    ),
                    idempotency_key=idempotency_key
                )
            else:
                # Use content-based message
                response = await self.async_client.send(
                    message=courier.ContentMessage(
                        to=courier.UserRecipient(
                            email=email,
                            data=recipient_data
                        ),
                        content=courier.ElementalContentSugar(
                            title=subject,
                            body=body,
                        ),
                        routing=courier.Routing(method="all", channels=["email"]),
                    ),
                    idempotency_key=idempotency_key
                )
            
            logger.info(f"Email sent asynchronously to {email} with request ID: {response.request_id}")
            return {"request_id": response.request_id}
            
        except courier.core.ApiError as e:
            logger.error(f"Error sending email asynchronously to {email}: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            logger.exception(f"Unexpected error sending email asynchronously to {email}: {str(e)}")
            return {"error": str(e)}


# Create a singleton instance for easy import
courier_client = CourierClient()
