import React from 'react';
import { downloadInvoicePDF } from '../../lib/pdf';

interface PatientBillingProps {
  invoices: any[];
  fetchInvoices: () => void;
  user: any;
  notify: any;
  apiFetch: any;
}

export default function PatientBilling({ invoices, fetchInvoices, user, notify, apiFetch }: PatientBillingProps): React.ReactElement {
  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>Billing & Invoices</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>
        View and pay your invoices for consultations, labs, and pharmacy.
      </p>

      {invoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>No invoices yet.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead style={{ background: 'var(--bg-main)' }}>
              <tr>
                <th>Invoice</th><th>Doctor</th><th>Date</th>
                <th>Consultation</th><th>Lab</th><th>Total</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>#{inv.id}</td>
                  <td>{inv.doctor_name}</td>
                  <td>{inv.date}</td>
                  <td>₹{inv.consultation_fee}</td>
                  <td>₹{inv.lab_charges}</td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{inv.total}</td>
                  <td>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                      background: inv.status === 'Paid' ? 'var(--success-bg)' : 'var(--warning-bg)',
                      color: inv.status === 'Paid' ? 'var(--success)' : 'var(--warning)'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    {inv.status === 'Unpaid' && (
                      <button className="btn btn-primary"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={async () => {
                          try {
                            const res = await apiFetch(`/hospital/invoice/${inv.id}/pay`, { method: 'PUT' });
                            if (res.ok) { notify.success('Invoice paid!'); fetchInvoices(); }
                          } catch (e) { notify.error('Payment failed.'); }
                        }}>
                        Pay Now
                      </button>
                    )}
                    {inv.status === 'Paid' && (
                      <button className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => downloadInvoicePDF(inv, user.name)}>
                        Download PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
