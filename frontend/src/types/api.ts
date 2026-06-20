export interface User {
  id: number;
  name: string;
  role: string;
  hospital_id: number;
  email?: string;
  contact?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  height?: string;
  weight_baseline?: string;
  allergies?: string;
  specialization?: string;
  is_available?: boolean;
  is_active?: boolean;
}

export interface AdminAnalytics {
  users: { patients: number; doctors: number; staff: number };
  appointments: { total: number; active: number; completed: number; cancelled: number };
  lab_tests: { total: number; completed: number; pending_payment: number };
  prescriptions: { total: number; dispensed: number; pending_dispense: number };
  revenue: number;
  status_breakdown: Array<{ name: string; value: number }>;
  avg_rating: number;
  total_ratings: number;
}

export interface AdminUser {
  id: number;
  name: string;
  role: string;
  email?: string;
  contact?: string;
  specialization?: string;
  is_available?: boolean;
  is_active?: boolean;
}

export interface AdminSearchResults {
  users: Array<{
    id: number; name: string; role: string; email?: string;
    contact?: string; is_active: boolean;
  }>;
  appointments: Array<{
    id: number; patient_name: string; doctor_name: string;
    date: string; time: string; status: string;
  }>;
}

export interface QueueEntry {
  id: number; patient_name: string; doctor_name: string;
  date: string; time: string; status: string; pain_level?: number; symptoms?: string;
}

export interface DoctorQueueEntry {
  id: number; patient_id: number; patient_name: string; patient_age: number | "N/A";
  patient_height: string | "N/A"; patient_weight_baseline: string | "N/A";
  patient_allergies: string; symptoms?: string; pain_level?: number;
  date: string; time: string; status: string;
  vitals: { weight?: string; hr?: string; bp?: string; temp?: string } | null;
  lab_tests: Array<{ test_name: string; status: string; result_text?: string }>;
}

export interface DoctorStats {
  patients_today: number;
  revenue: number;
  rating: number;
}

export interface LabQueueEntry {
  id: number; patient_name: string; test_name: string;
  status: string; ordered_at: string;
}

export interface PharmacyQueueEntry {
  id: number; patient_name: string; doctor_name: string;
  medication: string; status: string; created_at: string;
}

export interface PatientAppointment {
  id: number; doctor_id: number; date: string; time: string;
  status: string; symptoms?: string; pain_level?: number; followup_days?: number;
}

export interface PatientLabTest {
  id: number; test_name: string; status: string; result_text?: string;
}

export interface PatientPrescription {
  id: number; appointment_id: number; medication_details: string;
  digital_signature: string; issued_at: string;
}

export interface PatientInvoice {
  id: number; appointment_id: number; doctor_name: string; date: string;
  consultation_fee: number; lab_charges: number; pharmacy_charges: number;
  total: number; status: 'Unpaid' | 'Paid'; created_at: string;
}

export interface DoctorInfo {
  id: number; name: string; specialization: string; qualification?: string;
  experience_years?: number; consultation_fee?: number; is_available?: boolean;
  bio?: string; avg_rating?: number; rating_count?: number;
}

export interface SuperAdminStats {
  hospitals: { total: number; active: number; inactive: number };
  users: { total: number; patient: number; doctor: number; staff: number; admin: number; superadmin: number };
  appointments: { total: number };
  revenue: { total: number; total_invoices: number; paid_invoices: number };
}

export interface SuperAdminHospital {
  id: number; name: string; subdomain: string; plan: 'trial' | 'basic' | 'pro' | 'enterprise';
  is_active: boolean; feature_flags?: Record<string, boolean>;
  created_at?: string;
  stats: {
    doctors: number; patients: number; staff: number; total_users: number;
    appointments: number; paid_invoices: number; revenue: number;
  };
}

export interface SuperAdminUser {
  id: number; role: string; name: string; email?: string; contact?: string;
  specialization?: string; is_available?: boolean; is_active?: boolean;
}

export interface PatientProfileForm {
  name?: string;
  contact?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  height?: string;
  weight_baseline?: string;
  allergies?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  contact?: string;
  password: string;
  role: string;
  specialization?: string;
}

export interface UpdateHospitalPayload {
  name?: string;
  subdomain?: string;
  plan?: string;
  is_active?: boolean;
}
