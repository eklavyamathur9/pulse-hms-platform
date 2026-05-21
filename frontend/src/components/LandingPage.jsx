import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Shield, Users, Clock, ArrowRight } from 'lucide-react';
import './LandingPage.css'; // We'll create this or use Tailwind if they had it, but standard CSS is used here

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="logo-container">
          <Activity className="logo-icon text-blue-600" size={32} />
          <span className="logo-text">Pulse HMS</span>
        </div>
        <div className="nav-links">
          <button className="btn-ghost" onClick={() => navigate('/login')}>Login</button>
          <button className="btn-primary" onClick={() => navigate('/register-hospital')}>Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            The Modern Operating System for <span className="text-gradient">Hospitals</span>
          </h1>
          <p className="hero-subtitle">
            Manage your entire clinic—from patient registration to billing—on a single, secure, and blazing-fast platform. Built for modern healthcare providers.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary btn-large" onClick={() => navigate('/register-hospital')}>
              Start Your Free Trial <ArrowRight size={20} />
            </button>
            <button className="btn-outline btn-large" onClick={() => navigate('/login')}>
              Patient Portal Login
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Everything you need to run your clinic</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper"><Users size={28} /></div>
            <h3>Patient Management</h3>
            <p>Seamlessly track patient history, vitals, and demographics in one secure place.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper"><Clock size={28} /></div>
            <h3>Real-time Queues</h3>
            <p>Live tracking of patient flow from arrival to vitals to consultation using websockets.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper"><Activity size={28} /></div>
            <h3>Lab & Pharmacy</h3>
            <p>Integrated workflows for ordering tests, uploading results, and dispensing medication.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper"><Shield size={28} /></div>
            <h3>Secure & Compliant</h3>
            <p>Multi-tenant architecture ensuring complete data isolation and privacy for your hospital.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <h2 className="section-title">Simple, Transparent Pricing</h2>
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Starter Clinic</h3>
            <div className="price"><span>$</span>49<span className="period">/mo</span></div>
            <ul className="pricing-features">
              <li>Up to 3 Doctors</li>
              <li>Basic Analytics</li>
              <li>Patient Portal</li>
              <li>Standard Support</li>
            </ul>
            <button className="btn-outline w-full" onClick={() => navigate('/register-hospital?plan=starter')}>Choose Starter</button>
          </div>
          <div className="pricing-card popular">
            <div className="popular-badge">Most Popular</div>
            <h3>Growing Hospital</h3>
            <div className="price"><span>$</span>149<span className="period">/mo</span></div>
            <ul className="pricing-features">
              <li>Up to 15 Doctors</li>
              <li>Advanced Analytics</li>
              <li>Custom Subdomain</li>
              <li>Priority 24/7 Support</li>
            </ul>
            <button className="btn-primary w-full" onClick={() => navigate('/register-hospital?plan=pro')}>Choose Pro</button>
          </div>
          <div className="pricing-card">
            <h3>Enterprise Network</h3>
            <div className="price"><span>$</span>499<span className="period">/mo</span></div>
            <ul className="pricing-features">
              <li>Unlimited Doctors</li>
              <li>Multiple Locations</li>
              <li>API Access</li>
              <li>Dedicated Account Manager</li>
            </ul>
            <button className="btn-outline w-full" onClick={() => navigate('/register-hospital?plan=enterprise')}>Contact Sales</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Pulse HMS Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
