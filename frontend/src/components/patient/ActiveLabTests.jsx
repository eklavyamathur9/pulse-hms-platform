import React from 'react';

export default function ActiveLabTests({ labTests, payForTest }) {
  const activeTests = labTests.filter(t => t.status !== 'Completed');
  if (activeTests.length === 0) return null;

  return (
    <div style={{ marginTop: 'var(--spacing-xl)' }}>
      <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Active Laboratory Needs</h2>
      {activeTests.map(test => (
        <div key={test.id} className="card"
          style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>{test.test_name}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Status: {test.status}
            </span>
          </div>
          {test.status === 'Pending Payment' && (
            <button className="btn btn-warning"
              style={{ background: 'var(--warning)', color: 'white' }}
              onClick={() => payForTest(test.id)}>
              Pay ₹50 Now
            </button>
          )}
          {test.status === 'Paid - Needs Sample' && (
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Please visit the Lab
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
