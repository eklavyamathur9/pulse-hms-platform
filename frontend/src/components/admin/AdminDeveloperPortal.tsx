import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '../../stores/useNotificationStore';
import { apiFetch } from '../../lib/api';
import { useApiQuery } from '../../hooks/useApi';

interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  retry_count: number;
  created_at: string;
}

export default function AdminDeveloperPortal() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('api-keys');

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, idx: number) => {
    const dTabs = ['api-keys', 'webhooks', 'docs'];
    if (e.key === 'ArrowRight') { e.preventDefault(); const next = (idx + 1) % dTabs.length; setTab(dTabs[next]); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); const prev = (idx - 1 + dTabs.length) % dTabs.length; setTab(dTabs[prev]); }
  }, []);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>([]);

  const { data: apiKeys, isLoading: keysLoading } = useApiQuery<{ api_keys: ApiKey[] }>(
    'admin-api-keys',
    '/auth/admin/api-keys'
  );

  const { data: webhooks, isLoading: whLoading } = useApiQuery<{ webhooks: Webhook[] }>(
    'admin-webhooks',
    '/auth/admin/webhooks'
  );

  const handleCreateKey = useCallback(async () => {
    if (!keyName.trim()) return;
    const res = await apiFetch('/auth/admin/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: keyName }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKey(data.api_key.raw_key);
      setKeyName('');
      setShowCreateKey(false);
      notify.success('API key created');
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
    } else {
      const err = await res.json();
      notify.error(err.error || 'Failed to create API key');
    }
  }, [keyName, queryClient]);

  const handleToggleKey = useCallback(async (keyId: number, active: boolean) => {
    const res = await apiFetch(`/auth/admin/api-keys/${keyId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !active }),
    });
    if (res.ok) {
      notify.success(active ? 'API key deactivated' : 'API key activated');
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
    }
  }, [queryClient]);

  const handleDeleteKey = useCallback(async (keyId: number) => {
    const res = await apiFetch(`/auth/admin/api-keys/${keyId}`, { method: 'DELETE' });
    if (res.ok) {
      notify.success('API key deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
    }
  }, [queryClient]);

  const handleCreateWebhook = useCallback(async () => {
    if (!whName.trim() || !whUrl.trim() || whEvents.length === 0) return;
    const res = await apiFetch('/auth/admin/webhooks', {
      method: 'POST',
      body: JSON.stringify({ name: whName, url: whUrl, events: whEvents }),
    });
    if (res.ok) {
      const data = await res.json();
      notify.success(`Webhook created (secret: ${data.webhook.secret})`);
      setWhName('');
      setWhUrl('');
      setWhEvents([]);
      setShowCreateWebhook(false);
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] });
    } else {
      const err = await res.json();
      notify.error(err.error || 'Failed to create webhook');
    }
  }, [whName, whUrl, whEvents, queryClient]);

  const handleDeleteWebhook = useCallback(async (whId: number) => {
    const res = await apiFetch(`/auth/admin/webhooks/${whId}`, { method: 'DELETE' });
    if (res.ok) {
      notify.success('Webhook deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] });
    }
  }, [queryClient]);

  const availableEvents = [
    'appointment.created', 'appointment.updated', 'appointment.cancelled',
    'lab.requested', 'lab.completed', 'prescription.issued',
    'prescription.dispensed', 'payment.received', 'patient.registered', 'invoice.generated',
  ];

  const toggleEvent = (ev: string) => {
    setWhEvents(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--input-bg)',
    color: 'var(--text-color)',
    fontSize: '14px',
    marginBottom: '8px',
    boxSizing: 'border-box',
  };

  const btnStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    background: 'var(--primary)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid var(--border-color)',
  };

  return (
    <div>
      <div role="tablist" aria-label="Developer portal sections" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
        {['api-keys', 'webhooks', 'docs'].map((t, idx) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => handleTabKeyDown(e, idx)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: tab === t ? 700 : 400,
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            }}
          >
            {t === 'api-keys' ? 'API Keys' : t === 'webhooks' ? 'Webhooks' : 'API Docs'}
          </button>
        ))}
      </div>

      {tab === 'api-keys' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>API Keys</h3>
            <button onClick={() => { setShowCreateKey(true); setNewKey(null); }} style={btnStyle}>+ New Key</button>
          </div>

          {newKey && (
            <div style={{ ...cardStyle, background: 'var(--success-bg)', borderColor: 'var(--chart-2)' }}>
              <strong>API key created — copy it now. You won't see it again!</strong>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', padding: '8px', background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', marginTop: '8px', wordBreak: 'break-all' }}>
                {newKey}
              </div>
              <button onClick={() => setNewKey(null)} style={{ ...btnStyle, marginTop: '8px', background: 'var(--chart-2)' }}>Dismiss</button>
            </div>
          )}

          {showCreateKey && (
            <div style={{ ...cardStyle, marginBottom: '1rem' }}>
              <input
                placeholder="Key name (e.g. Production Integration)"
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCreateKey} style={btnStyle}>Create</button>
                <button onClick={() => setShowCreateKey(false)} style={{ ...btnStyle, background: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </div>
          )}

          {keysLoading && <p>Loading...</p>}
          {apiKeys?.api_keys?.map(k => (
            <div key={k.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{k.name}</strong>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    {k.key_prefix}...
                  </span>
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    background: k.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: k.is_active ? 'var(--status-active)' : 'var(--status-inactive)',
                  }}>
                    {k.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleToggleKey(k.id, k.is_active)} style={{ ...btnStyle, background: k.is_active ? 'var(--chart-3)' : 'var(--chart-2)' }}>
                    {k.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDeleteKey(k.id)} style={{ ...btnStyle, background: 'var(--chart-4)' }}>Delete</button>
                </div>
              </div>
              {k.last_used_at && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Last used: {new Date(k.last_used_at).toLocaleString()}</div>}
              {k.expires_at && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Expires: {new Date(k.expires_at).toLocaleDateString()}</div>}
            </div>
          ))}
          {apiKeys?.api_keys?.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No API keys yet. Create one to start integrating.</p>}
        </div>
      )}

      {tab === 'webhooks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Webhooks</h3>
            <button onClick={() => setShowCreateWebhook(true)} style={btnStyle}>+ New Webhook</button>
          </div>

          {showCreateWebhook && (
            <div style={cardStyle}>
              <input placeholder="Webhook name" value={whName} onChange={e => setWhName(e.target.value)} style={inputStyle} />
              <input placeholder="Callback URL (https://...)" value={whUrl} onChange={e => setWhUrl(e.target.value)} style={inputStyle} />
              <div style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Subscribe to events:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {availableEvents.map(ev => (
                  <label key={ev} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={whEvents.includes(ev)} onChange={() => toggleEvent(ev)} />
                    {ev}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCreateWebhook} style={btnStyle}>Create</button>
                <button onClick={() => setShowCreateWebhook(false)} style={{ ...btnStyle, background: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </div>
          )}

          {whLoading && <p>Loading...</p>}
          {webhooks?.webhooks?.map(w => (
            <div key={w.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{w.name}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>{w.url}</span>
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    background: w.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: w.is_active ? 'var(--status-active)' : 'var(--status-inactive)',
                  }}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button onClick={() => handleDeleteWebhook(w.id)} style={{ ...btnStyle, background: 'var(--chart-4)' }}>Delete</button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {w.events.map(ev => (
                  <span key={ev} style={{ padding: '2px 6px', borderRadius: '4px', background: 'var(--border-color)' }}>{ev}</span>
                ))}
              </div>
            </div>
          ))}
          {webhooks?.webhooks?.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No webhooks configured.</p>}
        </div>
      )}

      {tab === 'docs' && (
        <div style={cardStyle}>
          <h3>API Documentation</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Interactive Swagger documentation is available at:
          </p>
          <a
            href="/api/v1/docs/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--primary)', fontSize: '16px' }}
          >
            /api/v1/docs/
          </a>
          <h4 style={{ marginTop: '1rem' }}>Key Endpoints</h4>
          <ul style={{ lineHeight: 2, color: 'var(--text-muted)' }}>
            <li><code>POST /api/v1/auth/login</code> — Authenticate</li>
            <li><code>POST /api/v1/auth/admin/api-keys</code> — Create API key</li>
            <li><code>POST /api/v1/auth/admin/webhooks</code> — Create webhook</li>
            <li><code>POST /api/v1/hospital/fhir/observations</code> — Ingest FHIR lab data</li>
            <li><code>POST /api/v1/hospital/invoice/&lt;id&gt;/create-payment-intent</code> — Stripe payment</li>
          </ul>
        </div>
      )}
    </div>
  );
}
