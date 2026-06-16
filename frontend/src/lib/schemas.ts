import { z } from 'zod';

export const hospitalRegistrationSchema = z.object({
  hospital_name: z.string().min(2, 'Hospital name must be at least 2 characters'),
  subdomain: z.string().min(3, 'Subdomain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
  admin_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  plan: z.string().optional(),
});

export type HospitalRegistrationData = z.infer<typeof hospitalRegistrationSchema>;

export const bookingSchema = z.object({
  doctor_id: z.number({ required_error: 'Doctor is required' }),
  date: z.string().min(1, 'Date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  time: z.string().min(1, 'Time is required').regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  symptoms: z.string().max(500, 'Symptoms must be under 500 characters').optional(),
});

export type BookingData = z.infer<typeof bookingSchema>;

export const vitalsSchema = z.object({
  bp_systolic: z.number({ required_error: 'Systolic BP is required' }).min(60, 'Too low').max(300, 'Too high'),
  bp_diastolic: z.number({ required_error: 'Diastolic BP is required' }).min(30, 'Too low').max(200, 'Too high'),
  heart_rate: z.number({ required_error: 'Heart rate is required' }).min(20, 'Too low').max(300, 'Too high'),
  temperature: z.number({ required_error: 'Temperature is required' }).min(90, 'Too low').max(110, 'Too high'),
  weight: z.number({ required_error: 'Weight is required' }).min(1, 'Too low').max(500, 'Too high'),
  notes: z.string().max(500).optional(),
});

export type VitalsData = z.infer<typeof vitalsSchema>;

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact: z.string().min(10, 'Contact must be at least 10 digits').optional().or(z.literal('')),
  age: z.number().min(0, 'Age must be positive').max(150, 'Age must be under 150').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().max(500).optional(),
});

export type ProfileData = z.infer<typeof profileSchema>;
