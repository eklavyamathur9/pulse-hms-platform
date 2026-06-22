import React, { useState } from 'react';
import { Activity, CheckCircle, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { apiFetch } from '../../lib/api';
import type { LabQueueEntry } from '../../types/api';

interface LabPanelProps {
  labQueue: LabQueueEntry[];
  labUploadForm: number | null;
  labResult: string;
  onLabUploadFormChange: (id: number) => void;
  onLabResultChange: (val: string) => void;
  onSubmitLabReport: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancelLabUpload: () => void;
}

export default function LabPanel({ labQueue, labUploadForm, labResult, onLabUploadFormChange, onLabResultChange, onSubmitLabReport, onCancelLabUpload }: LabPanelProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (testId: number, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lab_test_id', String(testId));
      const entry = labQueue.find((t: LabQueueEntry) => t.id === testId);
      if (entry?.patient_id) {
        formData.append('patient_id', String(entry.patient_id));
      }
      await apiFetch('/hospital/lab/upload', { method: 'POST', body: formData });
      onCancelLabUpload();
    } catch {
      // error handled silently; user can retry
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}><Activity color="var(--primary)" /> Laboratory Queue</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Process patient samples and upload test results.</p>

      {labUploadForm ? (
        <Card className="glass-panel mb-6" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3>Upload Results for Test #{labUploadForm}</h3>
          <form onSubmit={onSubmitLabReport} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <textarea required value={labResult} onChange={e => onLabResultChange(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)', minHeight: '100px' }} placeholder="Enter diagnostic results metrics here..."></textarea>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                <Upload size={18} />
                <span>Attach file (PDF, image, DOC)</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(labUploadForm, file);
                }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" variant="primary" disabled={uploading}><CheckCircle size={18} /> {uploading ? 'Uploading...' : 'Submit Text Report'}</Button>
              <Button type="button" variant="secondary" onClick={onCancelLabUpload} disabled={uploading}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card padding={false}>
        <table>
          <thead style={{ background: 'var(--bg-main)' }}>
            <tr>
              <th>ID</th><th>Patient</th><th>Test Required</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {labQueue.map((t: LabQueueEntry) => (
              <tr key={t.id}>
                <td>#{t.id}</td>
                <td style={{ fontWeight: 500 }}>{t.patient_name}</td>
                <td>{t.test_name}</td>
                <td>
                  <Button variant="primary" size="sm" onClick={() => onLabUploadFormChange(t.id)}>
                    Upload Findings
                  </Button>
                </td>
              </tr>
            ))}
            {labQueue.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No pending lab samples today.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
