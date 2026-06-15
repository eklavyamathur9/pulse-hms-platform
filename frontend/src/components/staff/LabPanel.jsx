import { Activity, CheckCircle } from 'lucide-react';

export default function LabPanel({ labQueue, labUploadForm, labResult, onLabUploadFormChange, onLabResultChange, onSubmitLabReport, onCancelLabUpload }) {
  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}><Activity color="var(--primary)" /> Laboratory Queue</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Process patient samples and upload test results.</p>

      {labUploadForm ? (
        <div className="card glass-panel" style={{ borderLeft: '4px solid var(--primary)', marginBottom: 'var(--spacing-xl)' }}>
          <h3>Upload Results for Test #{labUploadForm}</h3>
          <form onSubmit={onSubmitLabReport} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <textarea required value={labResult} onChange={e => onLabResultChange(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px' }} placeholder="Enter diagnostic results metrics here..."></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary"><CheckCircle size={18} /> Upload Report</button>
              <button type="button" className="btn btn-secondary" onClick={onCancelLabUpload}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead style={{ background: 'var(--bg-main)' }}>
            <tr>
              <th>ID</th><th>Patient</th><th>Test Required</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {labQueue.map(t => (
              <tr key={t.id}>
                <td>#{t.id}</td>
                <td style={{ fontWeight: 500 }}>{t.patient_name}</td>
                <td>{t.test_name}</td>
                <td>
                  <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => onLabUploadFormChange(t.id)}>
                    Upload Findings
                  </button>
                </td>
              </tr>
            ))}
            {labQueue.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No pending lab samples today.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
