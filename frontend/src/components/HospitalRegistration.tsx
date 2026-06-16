import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Activity, ArrowRight, CheckCircle } from 'lucide-react';
import { notify } from '../stores/useNotificationStore';
import { apiFetch } from '../lib/api';
import { hospitalRegistrationSchema, type HospitalRegistrationData } from '../lib/schemas';
import './HospitalRegistration.css';

export default function HospitalRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPlan = searchParams.get('plan') || 'trial';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [subdomainTouched, setSubdomainTouched] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<HospitalRegistrationData>({
    resolver: zodResolver(hospitalRegistrationSchema),
    defaultValues: { hospital_name: '', subdomain: '', admin_name: '', email: '', password: '', plan: initialPlan },
  });

  const watchedSubdomain = watch('subdomain');

  const handleHospitalNameChange = (value: string) => {
    if (!subdomainTouched) {
      setValue('subdomain', value.toLowerCase().replace(/[^a-z0-9]/g, ''), { shouldValidate: true });
    }
  };

  const handleSubdomainChange = () => {
    setSubdomainTouched(true);
  };

  const onSubmit = async (data: HospitalRegistrationData) => {
    setLoading(true);
    try {
      const response = await apiFetch('/auth/register-hospital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await response.json();
      if (response.ok) {
        notify.success('Hospital registered successfully! Redirecting...');
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        notify.error(resData.error || 'Registration failed');
      }
    } catch (err) {
      notify.error('Server error. Please try again.');
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
          <p>Your hospital workspace <strong>{watchedSubdomain}.pulsehms.com</strong> has been provisioned.</p>
          <p className="text-sm text-gray-500 mt-4">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  const nameField = register('hospital_name');
  const subdomainField = register('subdomain');

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

          <form onSubmit={handleSubmit(onSubmit)} className="signup-form">
            <div className="form-group">
              <label>Hospital/Clinic Name</label>
              <input
                type="text"
                {...nameField}
                onChange={(e) => { nameField.onChange(e); handleHospitalNameChange(e.target.value); }}
                placeholder="e.g. City General Hospital"
              />
              {errors.hospital_name && <p className="field-error">{errors.hospital_name.message}</p>}
            </div>

            <div className="form-group">
              <label>Workspace URL</label>
              <div className="input-group">
                <input
                  type="text"
                  {...subdomainField}
                  onChange={(e) => { subdomainField.onChange(e); handleSubdomainChange(); }}
                  placeholder="citygeneral"
                  className="subdomain-input"
                />
                <span className="domain-suffix">.pulsehms.com</span>
              </div>
              {errors.subdomain && <p className="field-error">{errors.subdomain.message}</p>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Admin Full Name</label>
                <input
                  type="text"
                  {...register('admin_name')}
                  placeholder="Jane Doe"
                />
                {errors.admin_name && <p className="field-error">{errors.admin_name.message}</p>}
              </div>
            </div>

            <div className="form-group">
              <label>Admin Email</label>
              <input
                type="email"
                {...register('email')}
                placeholder="jane@citygeneral.com"
              />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label>Admin Password</label>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
              />
              {errors.password && <p className="field-error">{errors.password.message}</p>}
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
