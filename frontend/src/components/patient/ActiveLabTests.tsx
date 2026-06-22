import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { PatientLabTest } from '../../types/api';

interface ActiveLabTestsProps {
  labTests: PatientLabTest[];
  payForTest: (testId: number) => void;
}

export default function ActiveLabTests({ labTests, payForTest }: ActiveLabTestsProps): React.ReactElement | null {
  const activeTests = labTests.filter((t: PatientLabTest) => t.status !== 'Completed');
  if (activeTests.length === 0) return null;

  return (
    <div style={{ marginTop: 'var(--spacing-xl)' }}>
      <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Active Laboratory Needs</h2>
      {activeTests.map((test: PatientLabTest) => (
        <Card key={test.id} className="mb-4" padding={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>{test.test_name}</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Status: {test.status}
              </span>
            </div>
            {test.status === 'Pending Payment' && (
              <Button variant="danger"
                onClick={() => payForTest(test.id)}>
                Pay ₹50 Now
              </Button>
            )}
            {test.status === 'Paid - Needs Sample' && (
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Please visit the Lab
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
