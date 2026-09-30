const steps = [
  {
    number: 1,
    title: 'Sign up your charity',
    description: 'Tell us about your organisation and choose your first fundraising event date.',
  },
  {
    number: 2,
    title: 'Choose a date & Bunnings location',
    description: 'Pick an event date and select from our network of partner locations.',
  },
  {
    number: 3,
    title: 'We deliver everything Saturday morning',
    description: 'Everything arrives ready to go. Run your event. We handle the rest.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center text-2xl font-bold text-navy sm:mb-16 sm:text-3xl lg:text-4xl">
          How it works — 3 simple steps
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-white sm:h-16 sm:w-16 sm:text-xl">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-navy sm:text-xl">{step.title}</h3>
              <p className="text-sm text-charcoal/70 sm:text-base">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
