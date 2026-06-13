from flask_socketio import emit

from models import Vitals, db
from services import (
    require_socket_roles,
    socket_payload,
    tenant_appointment,
    tenant_room,
)


def register(socketio):
    @socketio.on('action_submit_vitals')
    def handle_submit_vitals(data):
        ctx = require_socket_roles('staff', 'admin')
        if not ctx:
            return
        data = socket_payload(data)
        if data is None:
            return
        appt_id = data.get('appointmentId')
        appt = tenant_appointment(appt_id, ctx['hospital_id'])
        if appt:
            vitals = Vitals(
                hospital_id=appt.hospital_id,
                appointment_id=appt.id,
                patient_id=appt.patient_id,
                weight=data.get('weight'),
                heart_rate=data.get('hr'),
                blood_pressure=data.get('bp'),
                temperature=data.get('temp')
            )
            db.session.add(vitals)
            appt.status = 'Vitals_Taken'
            db.session.commit()
            emit('queue_updated', {'id': appt.id, 'status': 'Vitals_Taken'}, room=tenant_room(ctx['hospital_id']))
