'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'How much time does running a Vision Velocity event take?',
    answer:
      "Most charities report that a Vision Velocity event takes about 4-6 hours of their team's time on the day itself. We handle all the supply ordering, logistics and coordination. Your team just shows up and executes.",
  },
  {
    question: "What's included in the delivery?",
    answer:
      'Each package includes all supplies needed for your chosen event type (sausage sizzle, catering menu, etc.), including food items, serving utensils, napkins, condiments, setup instructions and contact support throughout the day.',
  },
  {
    question: 'Can we choose our own Bunnings location?',
    answer:
      "Yes. We have partnerships with Bunnings stores across Australia. When you sign up, you can choose from the locations we work with. If you have a preferred location in mind, let us know — we're always expanding our network.",
  },
  {
    question: 'What happens if our event needs to be rescheduled or cancelled?',
    answer:
      'You can reschedule or cancel your event up to 7 days before the delivery date with a full refund. For cancellations within 7 days, contact our support team to discuss options.',
  },
  {
    question: 'Is setup and breakdown included in the timeframe?',
    answer:
      'Setup typically takes 30-45 minutes in the morning. Breakdown takes about 1-2 hours after the event. We can also provide volunteer coordination support for these tasks.',
  },
  {
    question: 'How do we track funds raised and generate reports?',
    answer:
      'Your Vision Velocity dashboard tracks revenue, attendance and other key metrics from your events. You can download reports anytime for your records or to share with stakeholders.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-white px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-12 text-center text-2xl font-bold text-navy sm:mb-16 sm:text-3xl lg:text-4xl">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="rounded-card border border-grey">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-navy transition-colors hover:bg-grey/20"
              >
                <span>{faq.question}</span>
                <span className={`transform transition-transform ${openIndex === index ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {openIndex === index && (
                <div className="border-t border-grey bg-grey/10 px-6 py-4">
                  <p className="text-sm text-charcoal/70 sm:text-base">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
