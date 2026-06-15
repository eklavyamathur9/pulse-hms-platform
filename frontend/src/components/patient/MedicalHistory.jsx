import React from 'react';
import { FileText } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { downloadPrescriptionPDF } from '../../lib/pdf';

export default function MedicalHistory({
  historyAppointments, allDoctors, doctors,
  prescriptions, labTests, user, notify,
  ratingStars, setRatingStars,
  ratingComment, setRatingComment,
  ratedAppointments, setRatedAppointments,
  onBrowseDoctors
}) {
  const completedLabs = labTests.filter(t => t.status === 'Completed');

  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>
        <FileText color="var(--primary)" /> Medical History Vault
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>
        All your past diagnostics, doctor visits, and e-prescriptions.
      </p>

      {historyAppointments.length === 0 && prescriptions.length === 0 && completedLabs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>No history found.</div>
      )}

      {historyAppointments.filter(a => a.followup_days && a.followup_days > 0).map(a => {
        const doctor = allDoctors.find(d => d.id === a.doctor_id);
        return (
          <div key={`fu-${a.id}`} className="card" style={{
            marginBottom: '1rem', borderLeft: '4px solid var(--warning)',
            background: 'var(--warning-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <strong style={{ color: 'var(--warning)' }}>Follow-up Recommended</strong>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                {doctor ? doctor.name : 'Your doctor'} recommends a follow-up visit within{' '}
                <strong>{a.followup_days} days</strong>.
              </p>
            </div>
            <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}
              onClick={onBrowseDoctors}>
              Book Follow-up
            </button>
          </div>
        );
      })}

      {historyAppointments.filter(a => a.status === 'Completed' && !ratedAppointments.includes(a.id)).map(a => {
        const doctor = doctors.find(d => d.id === a.doctor_id);
        return (
          <div key={`rate-${a.id}`} className="card glass-panel"
            style={{ marginBottom: '1rem', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
              Rate your visit #{a.id} {doctor ? `with ${doctor.name}` : ''}
            </h3>
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} onClick={() => setRatingStars(star)}
                  style={{ cursor: 'pointer', fontSize: '1.8rem', color: star <= ratingStars ? '#f59e0b' : '#e2e8f0', transition: 'color 0.15s' }}>
                  ★
                </span>
              ))}
            </div>
            <input type="text" placeholder="Optional feedback..." value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '0.75rem' }} />
            <button className="btn btn-primary" disabled={ratingStars === 0}
              onClick={async () => {
                try {
                  const res = await apiFetch('/hospital/rating', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      appointment_id: a.id, patient_id: user.id,
                      doctor_id: a.doctor_id, stars: ratingStars, comment: ratingComment
                    })
                  });
                  if (res.ok) {
                    notify.success('Thank you for your feedback!');
                    setRatedAppointments(prev => [...prev, a.id]);
                    setRatingStars(0);
                    setRatingComment('');
                  } else {
                    const err = await res.json();
                    notify.info(err.error || 'Rating already submitted.');
                    setRatedAppointments(prev => [...prev, a.id]);
                  }
                } catch (e) {
                  notify.error('Failed to submit rating.');
                }
              }}>
              Submit Rating
            </button>
          </div>
        );
      })}

      {prescriptions.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.3rem' }}>E-Prescriptions</h2>
          {prescriptions.map(rx => (
            <div key={rx.id} className="card glass-panel"
              style={{ marginBottom: '1rem', borderLeft: '4px solid var(--success)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Prescription ID: #{rx.id} | Issued: {new Date(rx.issued_at).toLocaleDateString()}
                </span>
                <p style={{
                  marginTop: '0.5rem', fontSize: '1.05rem', whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace', background: 'var(--bg-main)',
                  padding: '1rem', borderRadius: '4px'
                }}>
                  {rx.medication_details}
                </p>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: '1px dashed #ccc', paddingTop: '1rem'
              }}>
                <div style={{ color: 'var(--primary)' }}>
                  <small>Digitally Signed by</small><br />
                  <strong>{rx.digital_signature}</strong>
                </div>
                <div>
                  <button className="btn btn-secondary"
                    onClick={() => downloadPrescriptionPDF(rx, user.name)}>
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {completedLabs.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.3rem' }}>Completed Lab Reports</h2>
          {completedLabs.map(test => (
            <div key={test.id} className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-dark)' }}>{test.test_name}</h3>
              <div style={{
                background: 'var(--success-bg)', color: 'var(--success)',
                padding: '1rem', marginTop: '1rem', borderRadius: '4px'
              }}>
                <strong>Result:</strong><br />
                {test.result_text}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
