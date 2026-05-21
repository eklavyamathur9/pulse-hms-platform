import React, { useState, useEffect } from 'react';
import { Activity, Building, Users, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function SuperAdminDashboard() {
  const [hospitals, setHospitals] = useState([]);
  const [stats, setStats] = useState({ total_hospitals: 0, active_hospitals: 0, mrr: 0 });
  const { showNotification } = useNotification();

  useEffect(() => {
    // In a full implementation, we would fetch from /api/superadmin/hospitals
    // Mocking for MVP based on models.py structure
    const fetchHospitals = async () => {
      try {
        // Mock data for demo
        setHospitals([
          { id: 1, name: 'Pulse Care General', subdomain: 'pulsecare', plan: 'pro', is_active: true, created_at: '2026-05-15' },
          { id: 2, name: 'City Clinic', subdomain: 'cityclinic', plan: 'basic', is_active: true, created_at: '2026-05-14' },
          { id: 3, name: 'Metro Health', subdomain: 'metro', plan: 'trial', is_active: false, created_at: '2026-05-10' }
        ]);
        setStats({ total_hospitals: 3, active_hospitals: 2, mrr: 198 });
      } catch (err) {
        showNotification('Failed to load hospitals', 'error');
      }
    };
    fetchHospitals();
  }, [showNotification]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <Activity size={32} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">SaaS Super Admin Platform</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 rounded-lg text-blue-600"><Building size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Hospitals</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total_hospitals}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-green-50 rounded-lg text-green-600"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Tenants</p>
            <p className="text-2xl font-bold text-gray-800">{stats.active_hospitals}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-purple-50 rounded-lg text-purple-600"><CreditCard size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Estimated MRR</p>
            <p className="text-2xl font-bold text-gray-800">${stats.mrr}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Registered Hospitals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm">
                <th className="p-4 font-medium">Hospital Name</th>
                <th className="p-4 font-medium">Subdomain URL</th>
                <th className="p-4 font-medium">Subscription Plan</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Joined Date</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map(h => (
                <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4 font-medium text-gray-800">{h.name}</td>
                  <td className="p-4 text-blue-600">
                    <a href={`http://${h.subdomain}.pulsehms.com`} target="_blank" rel="noreferrer">
                      {h.subdomain}.pulsehms.com
                    </a>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider
                      ${h.plan === 'pro' ? 'bg-purple-100 text-purple-700' : 
                        h.plan === 'basic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {h.plan}
                    </span>
                  </td>
                  <td className="p-4">
                    {h.is_active ? (
                      <span className="flex items-center gap-1 text-sm text-green-600 font-medium"><CheckCircle size={16} /> Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-red-500 font-medium"><XCircle size={16} /> Suspended</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{h.created_at}</td>
                  <td className="p-4">
                    <button className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
