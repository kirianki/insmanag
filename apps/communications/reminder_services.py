# apps/communications/reminder_services.py

from django.utils import timezone
from datetime import timedelta
from django.template.loader import render_to_string
from django.template import Context, Template
from django.utils.html import strip_tags
from typing import Optional, Dict, Any
import re
import logging

from apps.core.services import AfricasTalkingService, EmailService, format_phone_number
from apps.customers.models import Customer
from apps.accounts.models import User
from apps.policies.models import Policy
from .reminder_models import ReminderTemplate, ReminderLog, ReminderType

logger = logging.getLogger(__name__)


class ReminderService:
    """
    Business logic for sending reminders to customers and agents.
    Handles template rendering, duplicate detection, and logging.
    """
    
    def __init__(self):
        self.sms_service = AfricasTalkingService()
        self.email_service = EmailService()
    
    def render_template(self, template_string: str, context: Dict[str, Any]) -> str:
        """
        Render a template string using Django's Template engine.
        
        Args:
            template_string: Template string with {{placeholders}}
            context: Dictionary of placeholder values
            
        Returns:
            Rendered string
        """
        if not template_string:
            return ""
        try:
            t = Template(template_string)
            c = Context(context)
            return t.render(c)
        except Exception as e:
            logger.error(f"Error rendering string template: {e}")
            # Fallback to simple replacement if engine fails for any reason
            rendered = template_string
            for key, value in context.items():
                placeholder = f"{{{{{key}}}}}"
                rendered = rendered.replace(placeholder, str(value or ""))
            return rendered
    
    def get_customer_context(
        self, 
        customer: Customer, 
        policy: Optional[Policy] = None,
        **extra
    ) -> Dict[str, Any]:
        """
        Build context dictionary for customer reminder templates.
        
        Args:
            customer: Customer instance
            policy: Optional Policy instance
            **extra: Additional context variables
            
        Returns:
            Dictionary of template variables
        """
        context = {
            'customer_name': customer.first_name or "Valued Customer",
            'customer_full_name': f"{customer.first_name} {customer.last_name}" if customer.first_name else "Valued Customer",
            'customer_number': customer.customer_number or "N/A",
            # Defaults for policy fields to prevent rendering errors
            'policy_number': 'N/A',
            'policy_type': 'N/A',
            'premium_amount': '0.00',
            'installment_amount': '0.00',
            'vehicle_reg': '',
            'vehicle_info': '',
            'policy_end_date': 'N/A',
            'policy_start_date': 'N/A',
            'next_due_date': 'N/A',
            'days_until_due': '0',
            'days_overdue': '0',
            'days_until_expiry': '0',
            # Global payment details
            'paybill_number': '4106641',
            'account_name': 'M/VEHICLE REG. NO / POLICY NO',
            'agency_name': 'SALENE INSURANCE AGENCY',
        }
        
        if policy:
            reg_no = policy.vehicle_registration_number
            context.update({
                'policy_number': policy.policy_number,
                'policy_type': policy.policy_type.name if policy.policy_type else 'N/A',
                'premium_amount': f"{policy.premium_amount:,.2f}",
                'vehicle_reg': reg_no or '',
                'vehicle_info': f" (Reg: {reg_no})" if reg_no else "",
                'policy_end_date': policy.policy_end_date.strftime('%d-%b-%Y') if policy.policy_end_date else 'N/A',
                'policy_start_date': policy.policy_start_date.strftime('%d-%b-%Y') if policy.policy_start_date else 'N/A',
            })
            
            if policy.next_due_date:
                context['next_due_date'] = policy.next_due_date.strftime('%d-%b-%Y')
                today = timezone.now().date()
                diff = (policy.next_due_date - today).days
                context['days_until_due'] = str(abs(diff)) if diff >= 0 else "0"
                context['days_overdue'] = str(abs(diff)) if diff < 0 else "0"
            
            # Additional helpers for common template needs
            if policy.policy_end_date:
                expiry_diff = (policy.policy_end_date - timezone.now().date()).days
                context['days_until_expiry'] = str(max(expiry_diff, 0))
            
            context['installment_amount'] = f"{policy.balance_due:,.2f}"
        
        context.update(extra)
        return context
    
    def get_agent_context(
        self,
        agent: User,
        **extra
    ) -> Dict[str, Any]:
        """
        Build context dictionary for agent reminder templates.
        """
        context = {
            'agent_name': agent.first_name,
            'agent_full_name': agent.get_full_name(),
            'agent_email': agent.email,
        }
        context.update(extra)
        return context
    
    def check_if_already_sent(
        self,
        reminder_type: str,
        customer: Optional[Customer] = None,
        agent: Optional[User] = None,
        policy: Optional[Policy] = None,
        hours: int = 24
    ) -> bool:
        """
        Check if a similar reminder was already sent recently to prevent duplicates.
        
        Args:
            reminder_type: Type of reminder
            customer: Customer recipient (mutually exclusive with agent)
            agent: Agent recipient (mutually exclusive with customer)
            policy: Optional policy reference
            hours: Time window to check (default 24 hours)
            
        Returns:
            True if reminder was already sent, False otherwise
        """
        cutoff = timezone.now() - timedelta(hours=hours)
        
        query = ReminderLog.objects.filter(
            reminder_type=reminder_type,
            created_at__gte=cutoff,
            status__in=[ReminderLog.Status.SENT, ReminderLog.Status.DELIVERED]
        )
        
        if customer:
            query = query.filter(customer=customer)
        if agent:
            query = query.filter(agent=agent)
        if policy:
            query = query.filter(policy=policy)
        
        return query.exists()
    
    def send_customer_reminder(
        self,
        reminder_type: str,
        customer: Customer,
        policy: Optional[Policy] = None,
        send_sms: bool = True,
        send_email: bool = True,
        force: bool = False,
        **extra_context
    ) -> ReminderLog:
        """
        Send a reminder to a customer via SMS and/or Email.
        
        Args:
            reminder_type: Type of reminder from ReminderType choices
            customer: Customer to send reminder to
            policy: Optional policy reference
            send_sms: Whether to send SMS
            send_email: Whether to send email
            force: Skip duplicate check if True
            **extra_context: Additional template variables
            
        Returns:
            ReminderLog instance
        """
        # Check for duplicates unless forced
        if not force and self.check_if_already_sent(
            reminder_type=reminder_type,
            customer=customer,
            policy=policy
        ):
            logger.info(f"Skipping duplicate reminder: {reminder_type} for customer {customer.id}")
            return None
        
        # Get template
        template = ReminderTemplate.objects.filter(
            reminder_type=reminder_type,
            is_active=True
        ).first()
        
        if not template:
            logger.warning(f"No active template found for reminder type: {reminder_type}")
            return None
        
        # Build context
        context = self.get_customer_context(customer, policy, **extra_context)
        
        # Render templates
        sms_content = self.render_template(template.sms_template, context) if template.sms_template else ""
        
        # Email rendering: Check if body is a template path or raw text
        email_subject = self.render_template(template.email_subject_template, context) if template.email_subject_template else ""
        
        is_html_template = template.email_body_template.endswith('.html')
        if is_html_template:
            try:
                email_content = render_to_string(template.email_body_template, context)
            except Exception as e:
                logger.error(f"Error rendering HTML template {template.email_body_template}: {e}")
                email_content = template.email_body_template # Fallback
        else:
            email_content = self.render_template(template.email_body_template, context) if template.email_body_template else ""
        
        # Determine channel
        if send_sms and send_email:
            channel = ReminderLog.Channel.BOTH
        elif send_sms:
            channel = ReminderLog.Channel.SMS
        elif send_email:
            channel = ReminderLog.Channel.EMAIL
        else:
            logger.warning("Neither SMS nor Email enabled for reminder")
            return None
        
        # Create log entry
        log = ReminderLog.objects.create(
            reminder_type=reminder_type,
            recipient_type=ReminderLog.RecipientType.CUSTOMER,
            customer=customer,
            policy=policy,
            channel=channel,
            sms_content=sms_content,
            email_subject=email_subject,
            email_content=email_content,
            status=ReminderLog.Status.QUEUED
        )
        
        # Send SMS
        if send_sms and sms_content and customer.phone:
            try:
                formatted_phone = format_phone_number(customer.phone)
                result = self.sms_service.send_sms(formatted_phone, sms_content)
                
                log.delivery_status['sms'] = result.get('raw_response', 'sent')
                
                if not result.get('success'):
                    log.status = ReminderLog.Status.FAILED
                    log.error_message = f"SMS Failed: {result.get('error')}"
                    logger.warning(f"SMS failed to customer {customer.id}: {log.error_message}")
                else:
                    logger.info(f"SMS sent successfully to customer {customer.id}: {reminder_type}")
                    
            except Exception as e:
                log.status = ReminderLog.Status.FAILED
                log.error_message = f"SMS Exception: {str(e)}"
                log.delivery_status['sms_error'] = str(e)
                logger.error(f"Failed to send SMS to customer {customer.id}: {e}")
        
        # Send Email
        if send_email and email_content and customer.email:
            try:
                # If HTML template, send as HTML with stripped plain-text version
                if is_html_template:
                    plain_message = strip_tags(email_content)
                    success = self.email_service.send_email(
                        recipient=customer.email,
                        subject=email_subject,
                        message=plain_message,
                        html_message=email_content,
                        fail_silently=False
                    )
                else:
                    success = self.email_service.send_email(
                        recipient=customer.email,
                        subject=email_subject,
                        message=email_content,
                        fail_silently=False
                    )
                log.delivery_status['email'] = 'sent' if success else 'failed'
                logger.info(f"Email sent to customer {customer.id}: {reminder_type}")
            except Exception as e:
                log.delivery_status['email_error'] = str(e)
                logger.error(f"Failed to send email to customer {customer.id}: {e}")
        
        # Update log status (if not already set to FAILED by SMS/Email logic)
        if log.status != ReminderLog.Status.FAILED:
            log.status = ReminderLog.Status.SENT
            
        log.sent_at = timezone.now()
        log.save()
        
        return log
    
    def send_agent_reminder(
        self,
        reminder_type: str,
        agent: User,
        policy: Optional[Policy] = None,
        send_sms: bool = True,
        send_email: bool = True,
        force: bool = False,
        **extra_context
    ) -> ReminderLog:
        """
        Send a reminder to an agent via SMS and/or Email.
        
        Args:
            reminder_type: Type of reminder from ReminderType choices
            agent: Agent (User) to send reminder to
            policy: Optional policy reference
            send_sms: Whether to send SMS
            send_email: Whether to send email
            force: Skip duplicate check if True
            **extra_context: Additional template variables
            
        Returns:
            ReminderLog instance
        """
        # Check for duplicates unless forced
        if not force and self.check_if_already_sent(
            reminder_type=reminder_type,
            agent=agent,
            policy=policy,
            hours=12  # Shorter window for agent reminders
        ):
            logger.info(f"Skipping duplicate reminder: {reminder_type} for agent {agent.id}")
            return None
        
        # Get template
        template = ReminderTemplate.objects.filter(
            reminder_type=reminder_type,
            is_active=True
        ).first()
        
        if not template:
            logger.warning(f"No active template found for reminder type: {reminder_type}")
            return None
        
        # Build context
        context = self.get_agent_context(agent, **extra_context)
        
        # Render templates
        sms_content = self.render_template(template.sms_template, context) if template.sms_template else ""
        
        # Email rendering: Check if body is a template path or raw text
        email_subject = self.render_template(template.email_subject_template, context) if template.email_subject_template else ""
        
        is_html_template = template.email_body_template.endswith('.html')
        if is_html_template:
            try:
                email_content = render_to_string(template.email_body_template, context)
            except Exception as e:
                logger.error(f"Error rendering HTML template {template.email_body_template}: {e}")
                email_content = template.email_body_template # Fallback
        else:
            email_content = self.render_template(template.email_body_template, context) if template.email_body_template else ""
        
        # Determine channel
        if send_sms and send_email:
            channel = ReminderLog.Channel.BOTH
        elif send_sms:
            channel = ReminderLog.Channel.SMS
        elif send_email:
            channel = ReminderLog.Channel.EMAIL
        else:
            logger.warning("Neither SMS nor Email enabled for reminder")
            return None
        
        # Create log entry
        log = ReminderLog.objects.create(
            reminder_type=reminder_type,
            recipient_type=ReminderLog.RecipientType.AGENT,
            agent=agent,
            policy=policy,
            channel=channel,
            sms_content=sms_content,
            email_subject=email_subject,
            email_content=email_content,
            status=ReminderLog.Status.QUEUED
        )
        
        # Send SMS
        if send_sms and sms_content:
            agent_phone = getattr(agent.profile, 'phone_number', None)
            if agent_phone:
                try:
                    formatted_phone = format_phone_number(agent_phone)
                    result = self.sms_service.send_sms(formatted_phone, sms_content)
                    
                    log.delivery_status['sms'] = result.get('raw_response', 'sent')
                    
                    if not result.get('success'):
                        log.status = ReminderLog.Status.FAILED
                        log.error_message = f"SMS Failed: {result.get('error')}"
                        logger.warning(f"SMS failed to agent {agent.id}: {log.error_message}")
                    else:
                        logger.info(f"SMS sent successfully to agent {agent.id}: {reminder_type}")
                        
                except Exception as e:
                    log.status = ReminderLog.Status.FAILED
                    log.error_message = f"SMS Exception: {str(e)}"
                    log.delivery_status['sms_error'] = str(e)
                    logger.error(f"Failed to send SMS to agent {agent.id}: {e}")
            else:
                logger.warning(f"Agent {agent.id} has no phone number in profile. Skipping SMS.")
        
        # Send Email
        if send_email and email_content and agent.email:
            try:
                # If HTML template, send as HTML with stripped plain-text version
                if is_html_template:
                    plain_message = strip_tags(email_content)
                    success = self.email_service.send_email(
                        recipient=agent.email,
                        subject=email_subject,
                        message=plain_message,
                        html_message=email_content,
                        fail_silently=False
                    )
                else:
                    success = self.email_service.send_email(
                        recipient=agent.email,
                        subject=email_subject,
                        message=email_content,
                        fail_silently=False
                    )
                log.delivery_status['email'] = 'sent' if success else 'failed'
                logger.info(f"Email sent to agent {agent.id}: {reminder_type}")
            except Exception as e:
                log.delivery_status['email_error'] = str(e)
                logger.error(f"Failed to send email to agent {agent.id}: {e}")
        
        # Update log status (if not already set to FAILED by SMS/Email logic)
        if log.status != ReminderLog.Status.FAILED:
            log.status = ReminderLog.Status.SENT
            
        log.sent_at = timezone.now()
        log.save()
        
        return log
