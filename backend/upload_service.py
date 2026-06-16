import os
import uuid

from config import Config
from models import Document, db
from werkzeug.utils import secure_filename


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def save_upload(file_storage, hospital_id, patient_id, uploaded_by, lab_test_id=None, description=None):
    if not file_storage or not file_storage.filename:
        return None, "No file provided"
    if not allowed_file(file_storage.filename):
        return None, f"File type not allowed. Allowed: {', '.join(Config.ALLOWED_EXTENSIONS)}"
    if file_storage.content_length and file_storage.content_length > Config.MAX_CONTENT_LENGTH:
        return None, "File too large (max 16 MB)"

    ext = file_storage.filename.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = Config.UPLOAD_FOLDER
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, unique_name)
    file_storage.save(filepath)

    doc = Document(
        hospital_id=hospital_id,
        lab_test_id=lab_test_id,
        patient_id=patient_id,
        uploaded_by=uploaded_by,
        filename=unique_name,
        original_name=secure_filename(file_storage.filename) or file_storage.filename,
        content_type=file_storage.content_type or "application/octet-stream",
        file_size=os.path.getsize(filepath),
        description=description,
    )
    db.session.add(doc)
    db.session.commit()
    return doc, None


def get_document_path(doc):
    return os.path.join(Config.UPLOAD_FOLDER, doc.filename)
