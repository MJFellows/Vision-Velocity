const benefits = [
  {
    title: 'No logistics hassle',
    description:
      'No need to coordinate suppliers, arrange deliveries, or handle the operational details. We manage everything.',
  },
  {
    title: 'Proven locations',
    description:
      'Our Bunnings partnerships are established and ready — the best, most accessible venues for high-traffic fundraising.',
  },
  {
    title: 'Professional support',
    description: 'Get dedicated support from our team before, during and after your event.',
  },
];

export function Benefits() {
  return (
    <section className="bg-grey/30 px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center text-2xl font-bold text-navy sm:mb-16 sm:text-3xl lg:text-4xl">
          Why choose Vision Velocity
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="rounded-card bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="mb-2 text-lg font-semibold text-navy">{benefit.title}</h3>
              <p className="text-sm text-charcoal/70 sm:text-base">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
