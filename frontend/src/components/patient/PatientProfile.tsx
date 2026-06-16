import React from 'react';
import { User as UserIcon } from 'lucide-react';

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

      <form onSubmit={saveProfile} className="card glass-panel"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Full Name</label>
          <input type="text" value={profileForm.name}
            onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Age</label>
          <input type="number" value={profileForm.age}
            onChange={e => setProfileForm({ ...profileForm, age: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} />
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
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Blood Type</label>
          <input type="text" value={profileForm.blood_type} placeholder="e.g. O+, A-"
            onChange={e => setProfileForm({ ...profileForm, blood_type: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Mobile Contact</label>
          <input type="text" value={profileForm.contact}
            onChange={e => setProfileForm({ ...profileForm, contact: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Height (cm/in)</label>
          <input type="text" value={profileForm.height} placeholder="e.g. 175cm"
            onChange={e => setProfileForm({ ...profileForm, height: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Weight Baseline (kg/lbs)</label>
          <input type="text" value={profileForm.weight_baseline} placeholder="e.g. 70kg"
            onChange={e => setProfileForm({ ...profileForm, weight_baseline: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)' }} />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Medical Allergies</label>
          <textarea value={profileForm.allergies}
            placeholder="List any drug or food allergies here..."
            onChange={e => setProfileForm({ ...profileForm, allergies: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--input-border)', minHeight: '80px' }} />
        </div>

        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
          <button type="submit" disabled={profileSaving} className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
            {profileSaving ? 'Saving...' : 'Update Health Profile'}
          </button>
        </div>
      </form>
    </>
  );
}
