"""
Email Utilities
Handles MJML compilation, template rendering, and email sending via Resend.
"""
import os
from typing import Dict, Any, Optional
from django.template import Context, Template
from django.template.loader import render_to_string
from django.conf import settings
import logging

try:
    import mjml
except ImportError:
    mjml = None

logger = logging.getLogger(__name__)


class MJMLCompiler:
    """Compiles MJML templates to HTML"""

    @staticmethod
    def compile(mjml_content: str) -> str:
        """
        Compile MJML to HTML using the mjml Python package.

        Args:
            mjml_content: MJML template string

        Returns:
            Compiled HTML string

        Raises:
            RuntimeError: If MJML compilation fails
        """
        if mjml is None:
            logger.error("MJML package not installed. Install with: pip install mjml")
            raise RuntimeError("MJML package not installed. Install with: pip install mjml")

        try:
            # Compile MJML to HTML using Python package
            result = mjml.mjml_to_html(mjml_content)

            if result.get('errors'):
                errors = result['errors']
                logger.error(f"MJML compilation errors: {errors}")
                raise RuntimeError(f"MJML compilation errors: {errors}")

            return result['html']

        except Exception as e:
            logger.error(f"Error compiling MJML: {str(e)}")
            raise


class EmailRenderer:
    """Renders email templates with context"""

    @staticmethod
    def render_mjml(template_path: str, context: Dict[str, Any]) -> str:
        """
        Render MJML template with Django context.

        Args:
            template_path: Path to MJML template relative to templates/emails/
            context: Dictionary of context variables

        Returns:
            Rendered MJML string
        """
        full_path = f"emails/{template_path}"

        try:
            # Render Django template (MJML with Django template tags)
            mjml_content = render_to_string(full_path, context)
            return mjml_content
        except Exception as e:
            logger.error(f"Error rendering template {full_path}: {str(e)}")
            raise

    @staticmethod
    def render_email(template_path: str, context: Dict[str, Any]) -> str:
        """
        Render and compile email template to HTML.

        Args:
            template_path: Path to MJML template
            context: Dictionary of context variables

        Returns:
            Compiled HTML email
        """
        from .constants import build_url, URL_PATHS

        # Add default context variables
        default_context = {
            'WEBSITE_URL': settings.WEBSITE_URL,
            'SUPPORT_EMAIL': settings.SUPPORT_EMAIL,
            'LOGO_URL': settings.EMAIL_LOGO_URL,
            'YEAR': __import__('datetime').datetime.now().year,
            'build_url': build_url,  # URL builder function
            'URL_PATHS': URL_PATHS,  # All URL path constants
        }

        # Merge with provided context
        full_context = {**default_context, **context}

        # Render MJML template
        mjml_content = EmailRenderer.render_mjml(template_path, full_context)

        # Compile to HTML
        html_content = MJMLCompiler.compile(mjml_content)

        return html_content


def format_currency(cents: int) -> str:
    """Format cents as currency string"""
    dollars = cents / 100
    return f"${dollars:,.2f}"


def format_datetime(dt) -> str:
    """Format datetime for emails"""
    if not dt:
        return ""
    return dt.strftime("%B %d, %Y at %I:%M %p")


def format_date(d) -> str:
    """Format date for emails"""
    if not d:
        return ""
    return d.strftime("%B %d, %Y")


def format_time(t) -> str:
    """Format time for emails"""
    if not t:
        return ""
    return t.strftime("%I:%M %p")


def get_duration_text(minutes: int) -> str:
    """Convert minutes to readable duration"""
    if minutes < 60:
        return f"{minutes} minutes"
    hours = minutes // 60
    remaining_mins = minutes % 60
    if remaining_mins == 0:
        return f"{hours} hour{'s' if hours > 1 else ''}"
    return f"{hours} hour{'s' if hours > 1 else ''} {remaining_mins} minutes"
