import React from 'react';
import { FileText } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { downloadPrescriptionPDF } from '../../lib/pdf';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface MedicalHistoryProps {
  historyAppointments: any[];
  allDoctors: any[];
  doctors: any[];
  prescriptions: any[];
  labTests: any[];
  user: any;
  notify: any;
  ratingStars: number;
  setRatingStars: (n: number) => void;
  ratingComment: string;
  setRatingComment: (s: string) => void;
  ratedAppointments: number[];
  setRatedAppointments: React.Dispatch<React.SetStateAction<number[]>>;
  onBrowseDoctors: () => void;
}

export default function MedicalHistory({
  historyAppointments, allDoctors, doctors,
  prescriptions, labTests, user, notify,
  ratingStars, setRatingStars,
  ratingComment, setRatingComment,
  ratedAppointments, setRatedAppointments,
  onBrowseDoctors
}: MedicalHistoryProps): React.ReactElement {
  const completedLabs = labTests.filter((t: any) => t.status === 'Completed');

  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>
        <FileText color="var(--primary)" /> Medical History Vault
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>
        All your past diagnostics, doctor visits, and e-prescriptions.
      </p>

      {historyAppointments.length === 0 && prescriptions.length === 0 && completedLabs.length === 0 && (
        <Card className="text-center">No history found.</Card>
      )}

      {historyAppointments.filter((a: any) => a.followup_days && a.followup_days > 0).map(a => {
        const doctor = allDoctors.find((d: any) => d.id === a.doctor_id);
        return (
          <Card key={`fu-${a.id}`}
            className="mb-4 border-l-4"
            style={{ borderLeftColor: 'var(--warning)', background: 'var(--warning-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: 'var(--warning)' }}>Follow-up Recommended</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)' }}>
                  {doctor ? doctor.name : 'Your doctor'} recommends a follow-up visit within{' '}
                  <strong>{a.followup_days} days</strong>.
                </p>
              </div>
              <Button variant="primary" onClick={onBrowseDoctors}>
                Book Follow-up
              </Button>
            </div>
          </Card>
        );
      })}

      {historyAppointments.filter((a: any) => a.status === 'Completed' && !ratedAppointments.includes(a.id)).map(a => {
        const doctor = doctors.find((d: any) => d.id === a.doctor_id);
        return (
          <Card key={`rate-${a.id}`} className="glass-panel" padding={false}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                Rate your visit #{a.id} {doctor ? `with ${doctor.name}` : ''}
              </h3>
              <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} onClick={() => setRatingStars(star)}
                    style={{ cursor: 'pointer', fontSize: '1.8rem', color: star <= ratingStars ? 'var(--warning)' : 'var(--border-color)', transition: 'color 0.15s' }}>
                    ★
                  </span>
                ))}
              </div>
              <Input placeholder="Optional feedback..." value={ratingComment}
                onChange={e => setRatingComment(e.target.value)} className="mb-3" />
              <Button variant="primary" disabled={ratingStars === 0}
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
                    setRatedAppointments((prev: number[]) => [...prev, a.id]);
                    setRatingStars(0);
                    setRatingComment('');
                  } else {
                    const err = await res.json();
                    notify.info(err.error || 'Rating already submitted.');
                    setRatedAppointments((prev: number[]) => [...prev, a.id]);
                  }
                } catch (e) {
                  notify.error('Failed to submit rating.');
                }
              }}>
              Submit Rating
            </Button>
            </div>
          </Card>
        );
      })}

      {prescriptions.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.3rem' }}>E-Prescriptions</h2>
          {prescriptions.map((rx: any) => (
            <Card key={rx.id} className="glass-panel mb-4"
              style={{ borderLeft: '4px solid var(--success)' }}>
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
                borderTop: '1px dashed var(--input-border)', paddingTop: '1rem'
              }}>
                <div style={{ color: 'var(--primary)' }}>
                  <small>Digitally Signed by</small><br />
                  <strong>{rx.digital_signature}</strong>
                </div>
                <div>
                  <Button variant="secondary"
                    onClick={() => downloadPrescriptionPDF(rx, user.name)}>
                    Download PDF
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {completedLabs.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.3rem' }}>Completed Lab Reports</h2>
          {completedLabs.map((test: any) => (
            <Card key={test.id} className="mb-4">
              <h3 style={{ margin: 0, color: 'var(--text-dark)' }}>{test.test_name}</h3>
              <div style={{
                background: 'var(--success-bg)', color: 'var(--success)',
                padding: '1rem', marginTop: '1rem', borderRadius: '4px'
              }}>
                <strong>Result:</strong><br />
                {test.result_text}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
