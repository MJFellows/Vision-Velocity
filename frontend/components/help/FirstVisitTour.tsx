'use client';

/** A short welcome tour shown the first time someone signs in (per browser). Replay from Help. */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

export interface TourStep {
  title: string;
  body: string;
}

export function tourKey(area: 'admin' | 'charity') {
  return `vv_tour_done_${area}`;
}

export function FirstVisitTour({ area, steps }: { area: 'admin' | 'charity'; steps: TourStep[] }) {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    const show = () => setStep(0);
    window.addEventListener(`vv-replay-tour-${area}`, show);
    let seen = true;
    try {
      seen = window.localStorage.getItem(tourKey(area)) === 'yes';
    } catch {
      seen = true;
    }
    const timer = seen ? null : setTimeout(show, 600);
    return () => {
      window.removeEventListener(`vv-replay-tour-${area}`, show);
      if (timer) clearTimeout(timer);
    };
  }, [area]);

  const finish = () => {
    try {
      window.localStorage.setItem(tourKey(area), 'yes');
    } catch {
      // ignore
    }
    setStep(null);
  };

  if (step === null) return null;
  const s = steps[step];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div role="dialog" aria-label="Welcome tour" className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
        <p className="mb-1 text-xs font-semibold uppercase text-charcoal/70">
          Welcome tour · {step + 1} of {steps.length}
        </p>
        <h2 className="mb-2 text-lg font-semibold text-navy">{s.title}</h2>
        <p className="mb-6 text-sm text-charcoal/80">{s.body}</p>
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="text-sm text-charcoal/70 underline" onClick={finish}>
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button type="button" onClick={() => (step + 1 < steps.length ? setStep(step + 1) : finish())}>
              {step + 1 < steps.length ? 'Next' : 'Finish'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ADMIN_TOUR: TourStep[] = [
  { title: 'Welcome to Vision Velocity', body: 'This short tour shows where things are. You can replay it any time from Help.' },
  { title: 'Your dashboard', body: 'Home shows what needs attention today — new charities to approve, event requests, events with something missing and results still to enter.' },
  { title: 'The menu', body: 'On a computer the menu is on the left. On a phone, use the bar at the bottom: Home, Events, Charities and More.' },
  { title: 'Search and help', body: 'The search box at the top finds any charity, event, store or supplier. The ? button explains the page you are on.' },
  { title: 'Tell us what is confusing', body: 'Use the Feedback button to tell us what you were trying to do. It helps us make the site easier for everyone.' },
];

export const CHARITY_TOUR: TourStep[] = [
  { title: 'Welcome', body: 'This is your charity area on the Vision Velocity website. Here is a quick look around.' },
  { title: 'Home', body: 'Home shows what happens next and anything waiting for you.' },
  { title: 'Events and orders', body: 'My events lists your sausage sizzles — request a new one there. My orders shows what has been ordered for you.' },
  { title: 'Help is always there', body: 'Press ? on any page for help, or use Contact us to send us a message.' },
];
