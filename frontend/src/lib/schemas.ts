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
