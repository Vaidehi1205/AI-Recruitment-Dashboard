"""Email service for sending communications to candidates."""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from .config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Handle email sending to candidates."""
    
    @staticmethod
    def send_email(
        recipient_email: str,
        recipient_name: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
    ) -> dict:
        """
        Send email to candidate.
        
        Args:
            recipient_email: Candidate's email address
            recipient_name: Candidate's name
            subject: Email subject line
            body: Plain text email body
            html_body: Optional HTML email body
            
        Returns:
            dict with success status and message
        """
        try:
            if not settings.smtp_user or not settings.smtp_password:
                logger.error("Email service not configured. SMTP credentials missing.")
                return {
                    "success": False,
                    "message": "Email service not configured. Set SMTP_USER and SMTP_PASSWORD in .env"
                }
            if not settings.sender_email:
                logger.error("Email service not configured. Sender email missing.")
                return {
                    "success": False,
                    "message": "Email service not configured. Set SENDER_EMAIL in .env"
                }
            
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.sender_name} <{settings.sender_email}>"
            msg["To"] = recipient_email
            
            # Attach plain text version
            msg.attach(MIMEText(body, "plain"))
            
            # Attach HTML version if provided
            if html_body:
                msg.attach(MIMEText(html_body, "html"))
            
            # Send email
            logger.info(f"Attempting to send email to {recipient_email} via {settings.smtp_server}:{settings.smtp_port}")
            # Use SSL if SMTP port is the implicit SSL port (465), otherwise use STARTTLS
            if settings.smtp_port == 465:
                with smtplib.SMTP_SSL(settings.smtp_server, settings.smtp_port, timeout=10) as server:
                    server.login(settings.smtp_user, settings.smtp_password)
                    server.sendmail(settings.sender_email, [recipient_email], msg.as_string())
            else:
                with smtplib.SMTP(settings.smtp_server, settings.smtp_port, timeout=10) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(settings.smtp_user, settings.smtp_password)
                    server.sendmail(settings.sender_email, [recipient_email], msg.as_string())
            
            logger.info(f"Email sent successfully to {recipient_email}")
            return {
                "success": True,
                "message": f"Email sent successfully to {recipient_email}"
            }
            
        except smtplib.SMTPAuthenticationError as e:
            logger.exception("SMTP authentication failed")
            return {
                "success": False,
                "message": "SMTP authentication failed. Check SMTP_USER and SMTP_PASSWORD."
            }
        except smtplib.SMTPException as e:
            logger.exception("SMTP error occurred")
            return {
                "success": False,
                "message": f"SMTP error: {str(e)}"
            }
        except Exception as e:
            logger.exception("Unexpected error sending email")
            return {
                "success": False,
                "message": f"Error sending email: {str(e)}"
            }
    
    @staticmethod
    def get_procedure_email_template(candidate_name: str, job_title: Optional[str] = None) -> dict:
        """Get template for procedure/call scheduled email."""
        job_text = f" for the {job_title} position" if job_title else ""
        
        subject = f"Next Steps in Your Application{' - ' + job_title if job_title else ''}"
        
        body = f"""Dear {candidate_name},

Thank you for your interest and your excellent resume{job_text}!

We are impressed with your profile and would like to move forward with the next steps in our hiring process. We will be scheduling a call with you soon to discuss the opportunity further.

A member of our team will reach out to you shortly with available time slots for a brief discussion.

We look forward to speaking with you!

Best regards,
Recruitment Team"""
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear <strong>{candidate_name}</strong>,</p>
                
                <p>Thank you for your interest and your excellent resume{job_text}!</p>
                
                <p>We are impressed with your profile and would like to move forward with the next steps in our hiring process. We will be scheduling a call with you soon to discuss the opportunity further.</p>
                
                <p>A member of our team will reach out to you shortly with available time slots for a brief discussion.</p>
                
                <p>We look forward to speaking with you!</p>
                
                <p>Best regards,<br/>
                <strong>Recruitment Team</strong></p>
            </body>
        </html>
        """
        
        return {
            "subject": subject,
            "body": body,
            "html_body": html_body
        }
    
    @staticmethod
    def get_rejection_email_template(candidate_name: str, job_title: Optional[str] = None) -> dict:
        """Get template for rejection email."""
        job_text = f" for the {job_title} position" if job_title else ""
        
        subject = f"Application Status{' - ' + job_title if job_title else ''}"
        
        body = f"""Dear {candidate_name},

Thank you for applying{job_text} and for taking the time to submit your application.

After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs. We appreciate your interest in our organization and encourage you to apply for future positions that may be a better fit for your background.

We wish you the best of luck in your career!

Best regards,
Recruitment Team"""
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear <strong>{candidate_name}</strong>,</p>
                
                <p>Thank you for applying{job_text} and for taking the time to submit your application.</p>
                
                <p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs. We appreciate your interest in our organization and encourage you to apply for future positions that may be a better fit for your background.</p>
                
                <p>We wish you the best of luck in your career!</p>
                
                <p>Best regards,<br/>
                <strong>Recruitment Team</strong></p>
            </body>
        </html>
        """
        
        return {
            "subject": subject,
            "body": body,
            "html_body": html_body
        }
    
    @staticmethod
    def get_custom_email_template() -> dict:
        """Get template for custom email composition."""
        return {
            "subject": "",
            "body": "",
            "html_body": ""
        }
