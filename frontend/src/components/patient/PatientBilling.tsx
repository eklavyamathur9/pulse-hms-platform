import React from 'react';
import { downloadInvoicePDF } from '../../lib/pdf';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { apiFetch } from '../../lib/api';
import type { User } from '../../context/AuthContext';
import type { PatientInvoice } from '../../types/api';

type NotifyFn = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
};

interface PatientBillingProps {
  invoices: PatientInvoice[];
  fetchInvoices: () => void;
  user: User;
  notify: NotifyFn;
  apiFetch: typeof apiFetch;
}

export default function PatientBilling({ invoices, fetchInvoices, user, notify, apiFetch }: PatientBillingProps): React.ReactElement {
  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>Billing & Invoices</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>
        View and pay your invoices for consultations, labs, and pharmacy.
      </p>

      {invoices.length === 0 ? (
        <Card className="text-center">No invoices yet.</Card>
      ) : (
        <Card padding={false}>
          <table>
            <thead style={{ background: 'var(--bg-main)' }}>
              <tr>
                <th>Invoice</th><th>Doctor</th><th>Date</th>
                <th>Consultation</th><th>Lab</th><th>Total</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: PatientInvoice) => (
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
                      <Button variant="primary" size="sm"
                        onClick={async () => {
                          try {
                            const res = await apiFetch(`/hospital/invoice/${inv.id}/pay`, { method: 'PUT' });
                            if (res.ok) { notify.success('Invoice paid!'); fetchInvoices(); }
                          } catch (e) { notify.error('Payment failed.'); }
                        }}>
                        Pay Now
                      </Button>
                    )}
                    {inv.status === 'Paid' && (
                      <Button variant="secondary" size="sm"
                        onClick={() => downloadInvoicePDF(inv, user.name)}>
                        Download PDF
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
