import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface PatientProfileProps {
  profileForm: any;
  setProfileForm: (f: any) => void;
  profileSaving: boolean;
  saveProfile: (e: React.FormEvent) => void;
}

export default function PatientProfile({ profileForm, setProfileForm, profileSaving, saveProfile }: PatientProfileProps): React.ReactElement {
  return (
    <>
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>
        <UserIcon color="var(--primary)" /> Profile Settings
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>
        Update your clinical demographics to ensure accurate prescriptions.
      </p>

      <Card className="glass-panel" padding={false}>
        <form onSubmit={saveProfile}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem' }}>

          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Full Name" value={profileForm.name}
              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
          </div>

          <div>
            <Input label="Age" type="number" value={profileForm.age}
              onChange={e => setProfileForm({ ...profileForm, age: e.target.value })} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Gender</label>
            <select value={profileForm.gender}
              onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'var(--bg-surface)' }}>
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <Input label="Blood Type" value={profileForm.blood_type} placeholder="e.g. O+, A-"
              onChange={e => setProfileForm({ ...profileForm, blood_type: e.target.value })} />
          </div>

          <div>
            <Input label="Mobile Contact" value={profileForm.contact}
              onChange={e => setProfileForm({ ...profileForm, contact: e.target.value })} />
          </div>

          <div>
            <Input label="Height (cm/in)" value={profileForm.height} placeholder="e.g. 175cm"
              onChange={e => setProfileForm({ ...profileForm, height: e.target.value })} />
          </div>

          <div>
            <Input label="Weight Baseline (kg/lbs)" value={profileForm.weight_baseline} placeholder="e.g. 70kg"
              onChange={e => setProfileForm({ ...profileForm, weight_baseline: e.target.value })} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Medical Allergies</label>
            <textarea value={profileForm.allergies}
              placeholder="List any drug or food allergies here..."
              onChange={e => setProfileForm({ ...profileForm, allergies: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)', minHeight: '80px' }} />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <Button type="submit" variant="primary" size="lg" loading={profileSaving} className="w-full">
              Update Health Profile
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
