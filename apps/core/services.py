# apps/core/services.py
import africastalking
from django.conf import settings
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging
import time
import re
from typing import List, Optional

logger = logging.getLogger(__name__)

def format_phone_number(phone: str) -> str:
    """
    Format phone numbers for Africa's Talking (e.g., 07... -> +2547...).
    """
    if not phone:
        return ""
    
    # Remove all non-digits
    clean_number = re.sub(r'\D', '', phone)
    
    # Handle Kenyan numbers starting with 07 or 01
    if clean_number.startswith('0') and len(clean_number) == 10:
        return f"+254{clean_number[1:]}"
    
    # If it already starts with 254 and has 12 digits, just add +
    if clean_number.startswith('254') and len(clean_number) == 12:
        return f"+{clean_number}"
        
    # If it starts with + just return as is
    if phone.startswith('+'):
        return phone
        
    return phone

class AfricasTalkingService:
    def __init__(self):
        self.username = getattr(settings, 'AFRICASTALKING_USERNAME', None)
        self.api_key = getattr(settings, 'AFRICASTALKING_API_KEY', None)
        self.sms = None
        
        if self.username and self.api_key:
            self._initialize_sdk(max_retries=5)
        else:
            logger.error("Africa's Talking credentials are not configured correctly.")

    def _initialize_sdk(self, max_retries=5):
        """Initializes the SDK with aggressive retry logic and exponential backoff."""
        for attempt in range(max_retries):
            try:
                # Clean prefix for safety though SDK theoretically handles it
                api_key = self.api_key.strip()
                africastalking.initialize(self.username, api_key)
                self.sms = africastalking.SMS
                logger.info(f"Africa's Talking SDK initialized successfully (Attempt {attempt + 1})")
                return True
            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 1.5  # 1.5s, 3s, 6s, 12s...
                    logger.warning(f"SDK Init failed (Attempt {attempt + 1}). Retrying in {wait_time}s... Error: {e}")
                    time.sleep(wait_time)
                else:
                    logger.error(f"SDK Init failed after {max_retries} attempts: {e}")
        return False

    def send_sms(self, recipient: str, message: str):
        """
        Sends an SMS with extremely robust retries for transient auth errors.
        """
        if not self.sms and not self._initialize_sdk(max_retries=3):
            logger.error("Cannot send SMS: SDK not initialized.")
            return None

        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = self.sms.send(message, [recipient])
                # Check for nested error in response even if request succeeded
                recipients = response.get('SMSMessageData', {}).get('Recipients', [])
                if recipients:
                    r_status = recipients[0].get('status')
                    if r_status != 'Success':
                        status_code = recipients[0].get('statusCode')
                        logger.warning(f"SMS Gateway Error ({status_code}): {r_status}")
                        # Return standardized fail structure if gateway rejected it
                        return {
                            'success': False,
                            'error': r_status,
                            'status_code': status_code,
                            'raw_response': response
                        }
                
                return {
                    'success': True,
                    'raw_response': response
                }
            except Exception as e:
                error_msg = str(e).lower()
                # If it's a transient authentication error, retry with backoff
                is_auth_error = "authentication" in error_msg or "invalid" in error_msg or "expired" in error_msg
                
                if is_auth_error and attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 2  # 2s, 4s, 8s, 16s...
                    logger.warning(f"SMS send auth error (Attempt {attempt + 1}). Re-initializing and retrying in {wait_time}s...")
                    self._initialize_sdk(max_retries=1) 
                    time.sleep(wait_time)
                    continue
                
                logger.error(f"Failed to send SMS after {attempt + 1} attempts. Error: {e}")
                return {
                    'success': False,
                    'error': str(e),
                    'raw_response': None
                }


class EmailService:
    """
    Service for sending emails with support for HTML templates, 
    plain text fallback, and bulk sending.
    """
    
    def __init__(self):
        self.from_email = settings.DEFAULT_FROM_EMAIL
    
    def send_email(
        self, 
        recipient: str, 
        subject: str, 
        message: str, 
        html_message: Optional[str] = None,
        fail_silently: bool = False
    ) -> bool:
        """
        Send an email to a single recipient.
        
        Args:
            recipient: Email address of the recipient
            subject: Email subject line
            message: Plain text message content
            html_message: Optional HTML version of the message
            fail_silently: If True, don't raise exceptions on errors
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        try:
            if html_message:
                # Send HTML email with plain text fallback
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=message,
                    from_email=self.from_email,
                    to=[recipient]
                )
                email.attach_alternative(html_message, "text/html")
                email.send()
            else:
                # Send plain text email
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=self.from_email,
                    recipient_list=[recipient],
                    fail_silently=fail_silently
                )
            
            logger.info(f"Email sent successfully to {recipient} with subject: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}. Error: {e}")
            if not fail_silently:
                raise
            return False
    
    def send_template_email(
        self,
        recipient: str,
        subject: str,
        template_name: str,
        context: dict,
        fail_silently: bool = False
    ) -> bool:
        """
        Send an email using a Django template.
        
        Args:
            recipient: Email address of the recipient
            subject: Email subject line
            template_name: Path to the HTML template (e.g., 'emails/reminder.html')
            context: Dictionary of context variables for the template
            fail_silently: If True, don't raise exceptions on errors
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        try:
            # Render HTML content
            html_message = render_to_string(template_name, context)
            
            # Create plain text version by stripping HTML tags
            plain_message = strip_tags(html_message)
            
            return self.send_email(
                recipient=recipient,
                subject=subject,
                message=plain_message,
                html_message=html_message,
                fail_silently=fail_silently
            )
            
        except Exception as e:
            logger.error(f"Failed to send template email to {recipient}. Error: {e}")
            if not fail_silently:
                raise
            return False
    
    def send_bulk_emails(
        self,
        recipients: List[str],
        subject: str,
        message: str,
        html_message: Optional[str] = None
    ) -> dict:
        """
        Send the same email to multiple recipients.
        
        Args:
            recipients: List of email addresses
            subject: Email subject line
            message: Plain text message content
            html_message: Optional HTML version of the message
            
        Returns:
            Dictionary with 'success', 'failed', and 'total' counts
        """
        results = {'success': 0, 'failed': 0, 'total': len(recipients)}
        
        for recipient in recipients:
            try:
                if self.send_email(recipient, subject, message, html_message, fail_silently=True):
                    results['success'] += 1
                else:
                    results['failed'] += 1
            except Exception as e:
                logger.error(f"Error sending bulk email to {recipient}: {e}")
                results['failed'] += 1
        
        logger.info(f"Bulk email sent: {results['success']}/{results['total']} successful")
        return results