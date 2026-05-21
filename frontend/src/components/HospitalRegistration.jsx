import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { apiFetch } from '../lib/api';
import './HospitalRegistration.css';

export default function HospitalRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const initialPlan = searchParams.get('plan') || 'trial';

  const [formData, setFormData] = useState({
    hospital_name: '',
    subdomain: '',
    admin_name: '',
    email: '',
    password: '',
    plan: initialPlan
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Auto-generate subdomain from hospital name if empty or manually typing
    if (name === 'hospital_name' && !formData.subdomain_touched) {
      setFormData({
        ...formData,
        hospital_name: value,
        subdomain: value.toLowerCase().replace(/[^a-z0-9]/g, '')
      });
    } else {
      setFormData({ 
        ...formData, 
        [name]: value,
        ...(name === 'subdomain' ? { subdomain_touched: true } : {}) 
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiFetch('/auth/register-hospital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (response.ok) {
        showNotification('Hospital registered successfully! Redirecting...', 'success');
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        showNotification(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      showNotification('Server error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="registration-container success-state">
        <div className="success-card">
          <CheckCircle size={64} className="text-green-500 mb-4" />
          <h2>Welcome to Pulse HMS!</h2>
          <p>Your hospital workspace <strong>{formData.subdomain}.pulsehms.com</strong> has been provisioned.</p>
          <p className="text-sm text-gray-500 mt-4">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-container">
      <div className="registration-sidebar">
        <div className="logo-container mb-8">
          <Activity className="logo-icon text-white" size={32} />
          <span className="logo-text text-white">Pulse HMS</span>
        </div>
        <h1 className="sidebar-title">Transform your clinic's operations today.</h1>
        <ul className="sidebar-benefits">
          <li><CheckCircle size={20} /> Provision your workspace in seconds</li>
          <li><CheckCircle size={20} /> Secure, multi-tenant architecture</li>
          <li><CheckCircle size={20} /> Free 14-day trial, no credit card required</li>
        </ul>
      </div>

      <div className="registration-form-container">
        <div className="form-wrapper">
          <h2 className="form-title">Create your workspace</h2>
          <p className="form-subtitle">Let's get your hospital set up.</p>

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label>Hospital/Clinic Name</label>
              <input 
                type="text" 
                name="hospital_name" 
                value={formData.hospital_name} 
                onChange={handleChange} 
                required 
                placeholder="e.g. City General Hospital" 
              />
            </div>

            <div className="form-group">
              <label>Workspace URL</label>
              <div className="input-group">
                <input 
                  type="text" 
                  name="subdomain" 
                  value={formData.subdomain} 
                  onChange={handleChange} 
                  required 
                  placeholder="citygeneral" 
                  className="subdomain-input"
                />
                <span className="domain-suffix">.pulsehms.com</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Admin Full Name</label>
                <input 
                  type="text" 
                  name="admin_name" 
                  value={formData.admin_name} 
                  onChange={handleChange} 
                  required 
                  placeholder="Jane Doe" 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Admin Email</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                placeholder="jane@citygeneral.com" 
              />
            </div>

            <div className="form-group">
              <label>Admin Password</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                placeholder="••••••••" 
                minLength={8}
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Provisioning Workspace...' : (
                <>Create Workspace <ArrowRight size={18} /></>
              )}
            </button>
          </form>
          <p className="login-link">
            Already have a workspace? <a href="/login">Log in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
