import io
import logging
import os

from celery_app import celery
from config import Config

logger = logging.getLogger(__name__)


def _get_flask_app():
    """Create a minimal Flask app for task execution context."""
    from flask import Flask
    from models import db

    app = Flask(__name__)
    app.config.from_object(Config)
    Config.validate()
    db.init_app(app)
    return app


@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_invoice_pdf(self, invoice_id, hospital_id):
    from models import Document, Invoice, User, db

    app = _get_flask_app()
    with app.app_context():
        Config.validate()
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice:
            logger.warning("Invoice %s not found, skipping", invoice_id)
            return

        patient = db.session.get(User, invoice.patient_id)
        patient_name = patient.name if patient else "Unknown"

        try:
            pdf_buf = _render_invoice_pdf(invoice, patient_name)
            pdf_dir = os.path.join(Config.UPLOAD_FOLDER, "invoices")
            os.makedirs(pdf_dir, exist_ok=True)
            filename = f"invoice_{invoice_id}.pdf"
            filepath = os.path.join(pdf_dir, filename)
            with open(filepath, "wb") as f:
                f.write(pdf_buf.getvalue())

            doc = Document(
                hospital_id=hospital_id,
                patient_id=invoice.patient_id,
                uploaded_by=0,
                filename=filename,
                original_name=f"Invoice_{invoice_id}.pdf",
                content_type="application/pdf",
                file_size=os.path.getsize(filepath),
                description=f"Auto-generated invoice PDF for #{invoice_id}",
            )
            db.session.add(doc)
            db.session.commit()
            logger.info("Invoice PDF generated: %s (doc_id=%s)", filepath, doc.id)
        except Exception as exc:
            logger.error("Failed PDF for invoice %s: %s", invoice_id, exc)
            raise self.retry(exc=exc)


def _render_invoice_pdf(invoice, patient_name):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except ImportError:
        logger.info("reportlab missing, saving text invoice")
        content = (
            f"Invoice #{invoice.id}\n"
            f"Patient: {patient_name}\n"
            f"Consultation: ${invoice.consultation_fee:.2f}\n"
            f"Lab: ${invoice.lab_charges:.2f}\n"
            f"Pharmacy: ${invoice.pharmacy_charges:.2f}\n"
            f"Total: ${invoice.total:.2f}\n"
            f"Status: {invoice.status}\n"
            f"Date: {invoice.created_at}\n"
        )
        buf = io.BytesIO()
        buf.write(content.encode("utf-8"))
        buf.seek(0)
        return buf

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 800, f"Invoice #{invoice.id}")
    c.setFont("Helvetica", 12)
    y = 770
    for label, val in [
        ("Patient", patient_name),
        ("Consultation Fee", f"${invoice.consultation_fee:.2f}"),
        ("Lab Charges", f"${invoice.lab_charges:.2f}"),
        ("Pharmacy Charges", f"${invoice.pharmacy_charges:.2f}"),
        ("Total", f"${invoice.total:.2f}"),
        ("Status", invoice.status),
        ("Date", str(invoice.created_at)),
    ]:
        c.drawString(50, y, f"{label}: {val}")
        y -= 20
    c.showPage()
    c.save()
    buf.seek(0)
    return buf


@celery.task
def send_notification(notification_type, recipient_id, payload=None):
    logger.info(
        "Notification queued: type=%s recipient=%s payload=%s",
        notification_type,
        recipient_id,
        payload,
    )
    return {"sent": True, "type": notification_type, "recipient": recipient_id}
