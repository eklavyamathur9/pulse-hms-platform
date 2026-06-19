import logging
from dataclasses import dataclass

from config import Config

logger = logging.getLogger(__name__)


@dataclass
class NotificationResult:
    success: bool
    provider: str
    message_id: str | None = None
    error: str | None = None


def send_sms(to: str, message: str) -> NotificationResult:
    account_sid = Config.TWILIO_ACCOUNT_SID
    auth_token = Config.TWILIO_AUTH_TOKEN
    from_number = Config.TWILIO_FROM_NUMBER

    if not account_sid or not auth_token or not from_number:
        logger.info("Twilio not configured — SMS not sent to %s: %s", to, message)
        return NotificationResult(success=False, provider="twilio", error="Not configured")

    try:
        from twilio.rest import Client

        client = Client(account_sid, auth_token)
        msg = client.messages.create(body=message, from_=from_number, to=to)
        logger.info("SMS sent to %s (sid=%s)", to, msg.sid)
        return NotificationResult(success=True, provider="twilio", message_id=msg.sid)
    except Exception as e:
        logger.error("Twilio SMS failed to %s: %s", to, e)
        return NotificationResult(success=False, provider="twilio", error=str(e))


def send_email(to: str, subject: str, body: str, html: str | None = None) -> NotificationResult:
    api_key = Config.SENDGRID_API_KEY
    from_email = Config.SENDGRID_FROM_EMAIL

    if not api_key or not from_email:
        logger.info("SendGrid not configured — email not sent to %s: %s", to, subject)
        return NotificationResult(success=False, provider="sendgrid", error="Not configured")

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        mail = Mail(
            from_email=from_email,
            to_emails=to,
            subject=subject,
            plain_text_content=body,
            html_content=html,
        )
        sg = SendGridAPIClient(api_key)
        response = sg.send(mail)
        logger.info("Email sent to %s (status=%s)", to, response.status_code)
        return NotificationResult(success=True, provider="sendgrid", message_id=str(response.status_code))
    except Exception as e:
        logger.error("SendGrid email failed to %s: %s", to, e)
        return NotificationResult(success=False, provider="sendgrid", error=str(e))
