from flask import g
from flask_socketio import emit

from audit import log_action
from models import Prescription, db
from hospital_routes import create_invoice_for_appointment
from services import (
    require_socket_roles,
    socket_payload,
    tenant_appointment,
    tenant_prescription,
    tenant_room,
)


def register(socketio):
    @socketio.on('action_prescribe_meds')
    def handle_prescribe_meds(data):
        ctx = require_socket_roles('doctor', 'admin')
        if not ctx:
            return
        data = socket_payload(data)
        if data is None:
            return
        if not data.get('appointmentId') or not data.get('medication_details'):
            emit('action_error', {'error': 'appointmentId and medication_details are required'})
            return
        appt_id = data.get('appointmentId')
        appt = tenant_appointment(appt_id, ctx['hospital_id'])
        if appt:
            if ctx['role'] == 'doctor' and appt.doctor_id != ctx['user_id']:
                emit('auth_error', {'error': 'Doctors can only prescribe for their own appointments'})
                return
            prescription = Prescription(
                hospital_id=appt.hospital_id,
                appointment_id=appt.id,
                patient_id=appt.patient_id,
                doctor_id=appt.doctor_id,
                medication=data.get('medication_details')
            )
            db.session.add(prescription)
            followup = data.get('followup_days')
            if followup:
                appt.followup_days = int(followup)
            appt.status = 'Completed'
            db.session.commit()

            try:
                create_invoice_for_appointment(appt)
            except Exception:
                pass

            log_action(
                hospital_id=ctx['hospital_id'],
                user_id=ctx['user_id'],
                action='prescribe_meds',
                resource_type='prescription',
                resource_id=prescription.id,
                details={'appointment_id': appt.id},
                ip_address=getattr(g, 'ip_address', None),
            )

            emit('queue_updated', {'id': appt.id, 'status': 'Completed'}, room=tenant_room(ctx['hospital_id']))

    @socketio.on('action_dispense_meds')
    def handle_dispense_meds(data):
        ctx = require_socket_roles('staff', 'admin')
        if not ctx:
            return
        data = socket_payload(data)
        if data is None:
            return
        rx_id = data.get('prescriptionId')
        rx = tenant_prescription(rx_id, ctx['hospital_id'])
        if rx:
            rx.status = 'Dispensed'
            db.session.commit()
            log_action(
                hospital_id=ctx['hospital_id'],
                user_id=ctx['user_id'],
                action='dispense_meds',
                resource_type='prescription',
                resource_id=rx.id,
                ip_address=getattr(g, 'ip_address', None),
            )
            emit('queue_updated', {'rx_id': rx.id, 'action': 'dispensed'}, room=tenant_room(ctx['hospital_id']))
