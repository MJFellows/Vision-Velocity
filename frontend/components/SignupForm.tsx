'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { api, ApiRequestError } from '@/lib/api';

// Field names and validation mirror the backend's signupCharitySchema
// (04-development/backend/app/api/public/charities/signup/route.ts)
// exactly, including using `location` (not `address`) to match the
// deployed `charities` table.
const step1Schema = z.object({
  charity_name: z.string().min(2, 'Charity name must be at least 2 characters').max(100),
  abn: z.string().regex(/^(\d{11})?$/, 'ABN must be 11 digits').optional().or(z.literal('')),
  cause_description: z.string().max(200, 'Description must not exceed 200 characters').optional().or(z.literal('')),
});

const step2Schema = z.object({
  contact_name: z.string().min(2, 'Contact name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^[\d\s\-+()]{10,}$/, 'Please enter a valid phone number'),
  location: z.string().max(200, 'Address must not exceed 200 characters').optional().or(z.literal('')),
});

const step3Schema = z.object({
  event_date: z.string().refine((date) => {
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  }, 'Event date must be in the future'),
  bunnings_store_id: z.string().uuid('Please select a Bunnings location'),
  expected_attendees: z
    .string()
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, 'Must be a valid number'),
  special_requirements: z.string().max(500, 'Special requirements must not exceed 500 characters').optional().or(z.literal('')),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

interface BunningsStore {
  id: string;
  location: string;
}

interface SignupResponse {
  success: boolean;
  message: string;
  charityId: string;
}

export function SignupForm({ bunningsStores }: { bunningsStores: BunningsStore[] }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    charity_name: '',
    abn: '',
    cause_description: '',
    contact_name: '',
    email: '',
    phone: '',
    location: '',
    event_date: '',
    bunnings_store_id: '',
    expected_attendees: '',
    special_requirements: '',
  });

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    mode: 'onBlur',
    defaultValues: formData,
  });
  const step2Form = useForm<Step2Data>({ resolver: zodResolver(step2Schema), mode: 'onBlur', defaultValues: formData });
  const step3Form = useForm<Step3Data>({ resolver: zodResolver(step3Schema), mode: 'onBlur', defaultValues: formData });

  const onStep1Next = (data: Step1Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const onStep2Next = (data: Step2Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const onStep3Next = (data: Step3Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(4);
  };

  const submitSignup = async () => {
    setIsLoading(true);
    setServerError(null);
    try {
      const result = await api.post<SignupResponse>(
        '/api/public/charities/signup',
        {
          charity_name: formData.charity_name,
          abn: formData.abn || undefined,
          cause_description: formData.cause_description || undefined,
          contact_name: formData.contact_name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location || undefined,
          event_date: formData.event_date,
          bunnings_store_id: formData.bunnings_store_id,
          expected_attendees: Number(formData.expected_attendees),
          special_requirements: formData.special_requirements || undefined,
        },
        true
      );
      router.push(`/charity/signup/success?charityId=${result.charityId}`);
    } catch (error) {
      setServerError(error instanceof ApiRequestError ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => setCurrentStep((s) => Math.max(1, s - 1));

  if (currentStep === 1) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-navy">Tell us about your charity</h2>
          <p className="mt-2 text-charcoal/60">Step 1 of 4</p>
        </div>
        <form onSubmit={step1Form.handleSubmit(onStep1Next)} className="space-y-4">
          <Input
            label="Charity name"
            placeholder="e.g. Local Youth Sports Club"
            error={step1Form.formState.errors.charity_name?.message}
            {...step1Form.register('charity_name')}
          />
          <Input
            label="ABN (Australian Business Number) — optional"
            placeholder="e.g. 12345678901"
            error={step1Form.formState.errors.abn?.message}
            {...step1Form.register('abn')}
          />
          <Input
            label="Tell us your cause — optional"
            placeholder="e.g. We help underprivileged youth access sports training"
            error={step1Form.formState.errors.cause_description?.message}
            {...step1Form.register('cause_description')}
          />
          <Button type="submit" className="w-full">
            Next
          </Button>
        </form>
      </Card>
    );
  }

  if (currentStep === 2) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-navy">Your contact details</h2>
          <p className="mt-2 text-charcoal/60">Step 2 of 4</p>
        </div>
        <form onSubmit={step2Form.handleSubmit(onStep2Next)} className="space-y-4">
          <Input
            label="Contact person name"
            placeholder="e.g. Sarah Johnson"
            error={step2Form.formState.errors.contact_name?.message}
            {...step2Form.register('contact_name')}
          />
          <Input
            label="Email address"
            type="email"
            placeholder="e.g. sarah@charity.org"
            error={step2Form.formState.errors.email?.message}
            {...step2Form.register('email')}
          />
          <Input
            label="Phone number"
            type="tel"
            placeholder="e.g. (02) 1234 5678"
            error={step2Form.formState.errors.phone?.message}
            {...step2Form.register('phone')}
          />
          <Input
            label="Address — optional"
            placeholder="e.g. 123 Main Street, Sydney NSW 2000"
            error={step2Form.formState.errors.location?.message}
            {...step2Form.register('location')}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Next
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (currentStep === 3) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-navy">Plan your first event</h2>
          <p className="mt-2 text-charcoal/60">Step 3 of 4</p>
        </div>
        <form onSubmit={step3Form.handleSubmit(onStep3Next)} className="space-y-4">
          <Input
            label="Event date"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            error={step3Form.formState.errors.event_date?.message}
            {...step3Form.register('event_date')}
          />
          <Select
            label="Preferred Bunnings location"
            placeholder="Select a Bunnings location…"
            options={bunningsStores.map((store) => ({ value: store.id, label: store.location }))}
            error={step3Form.formState.errors.bunnings_store_id?.message}
            {...step3Form.register('bunnings_store_id')}
          />
          <Input
            label="Expected number of attendees"
            type="number"
            placeholder="e.g. 50"
            min={1}
            max={500}
            error={step3Form.formState.errors.expected_attendees?.message}
            {...step3Form.register('expected_attendees')}
          />
          <Input
            label="Special requirements or notes — optional"
            placeholder="e.g. vegetarian sausages, allergy considerations"
            error={step3Form.formState.errors.special_requirements?.message}
            {...step3Form.register('special_requirements')}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Next
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-navy">Confirm your details</h2>
        <p className="mt-2 text-charcoal/60">Step 4 of 4</p>
      </div>

      {serverError && <div className="mb-4 rounded-card bg-red-50 p-4 text-sm text-red-700">{serverError}</div>}

      <dl className="mb-6 space-y-3 rounded-card bg-grey/20 p-4 text-sm">
        <div className="flex justify-between"><dt className="text-charcoal/60">Charity name</dt><dd className="font-medium">{formData.charity_name}</dd></div>
        <div className="flex justify-between"><dt className="text-charcoal/60">Contact name</dt><dd className="font-medium">{formData.contact_name}</dd></div>
        <div className="flex justify-between"><dt className="text-charcoal/60">Email</dt><dd className="font-medium">{formData.email}</dd></div>
        <div className="flex justify-between"><dt className="text-charcoal/60">Phone</dt><dd className="font-medium">{formData.phone}</dd></div>
        <div className="flex justify-between"><dt className="text-charcoal/60">First event date</dt><dd className="font-medium">{formData.event_date ? new Date(formData.event_date).toLocaleDateString('en-AU') : '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-charcoal/60">Expected attendees</dt><dd className="font-medium">{formData.expected_attendees}</dd></div>
      </dl>

      <p className="mb-6 text-sm text-charcoal/60">
        By submitting this form, you agree to let Vision Velocity review your application. We&apos;ll email you
        within 24 hours.
      </p>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => setCurrentStep(3)} className="flex-1" disabled={isLoading}>
          Back
        </Button>
        <Button type="button" onClick={submitSignup} disabled={isLoading} className="flex-1">
          {isLoading ? 'Submitting…' : 'Submit application'}
        </Button>
      </div>
    </Card>
  );
}
