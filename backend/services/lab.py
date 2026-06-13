from flask_socketio import emit

from models import LabTest, db
from services import (
    require_socket_roles,
    socket_payload,
    tenant_appointment,
    tenant_lab_test,
    tenant_room,
)


def register(socketio):
    @socketio.on('action_prescribe_test')
    def handle_prescribe_test(data):
        ctx = require_socket_roles('doctor', 'admin')
        if not ctx:
            return
        data = socket_payload(data)
        if data is None:
            return
        if not data.get('appointmentId') or not data.get('test_name'):
            emit('action_error', {'error': 'appointmentId and test_name are required'})
            return
        appt_id = data.get('appointmentId')
        appt = tenant_appointment(appt_id, ctx['hospital_id'])
        if appt:
            if ctx['role'] == 'doctor' and appt.doctor_id != ctx['user_id']:
                emit('auth_error', {'error': 'Doctors can only order tests for their own appointments'})
                return
            lab_test = LabTest(
                hospital_id=appt.hospital_id,
                appointment_id=appt.id,
                patient_id=appt.patient_id,
                test_name=data.get('test_name'),
                status='Pending Payment'
            )
            db.session.add(lab_test)
            appt.status = 'Lab_Pending'
            db.session.commit()
            emit('queue_updated', {'id': appt.id, 'status': 'Lab_Pending'}, room=tenant_room(ctx['hospital_id']))

    @socketio.on('action_pay_test')
    def handle_pay_test(data):
        ctx = require_socket_roles('patient', 'staff', 'admin')
        if not ctx:
            return
        data = socket_payload(data)
        if data is None:
            return
        test_id = data.get('testId')
        lab_test = tenant_lab_test(test_id, ctx['hospital_id'])
        if lab_test:
            if ctx['role'] == 'patient' and lab_test.patient_id != ctx['user_id']:
                emit('auth_error', {'error': 'Patients can only pay their own lab tests'})
                return
            lab_test.status = 'Paid - Needs Sample'
            db.session.commit()
            emit('queue_updated', {'id': lab_test.appointment_id, 'status': 'Paid'}, room=tenant_room(ctx['hospital_id']))

    @socketio.on('action_upload_test_report')
    def handle_upload_test_report(data):
        ctx = require_socket_roles('staff', 'admin')
        if not ctx:
            return
        data = socket_payload(data)
        if data is None:
            return
        test_id = data.get('testId')
        lab_test = tenant_lab_test(test_id, ctx['hospital_id'])
        if lab_test:
            lab_test.status = 'Completed'
            lab_test.result_text = data.get('result_text')

            appt = tenant_appointment(lab_test.appointment_id, ctx['hospital_id'])
            if appt:
                appt.status = 'Consult_Pending_Review'

            db.session.commit()
            emit('queue_updated', {'id': lab_test.appointment_id, 'status': 'Consult_Pending_Review'}, room=tenant_room(ctx['hospital_id']))
