export function Testimonial() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-card bg-grey/30 p-8 text-center sm:p-12">
          <p className="mb-6 text-lg italic text-charcoal/80 sm:text-xl">
            &ldquo;Vision Velocity took all the stress out of our fundraiser. We just showed up, ran the event, and
            raised more than we ever thought possible.&rdquo;
          </p>
          <div className="border-t border-grey pt-6">
            <p className="font-semibold text-navy">Sarah Thompson</p>
            <p className="text-sm text-charcoal/70">Local Youth Sports Club</p>
            <p className="text-sm text-charcoal/70">Raised $3,500 in one weekend</p>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-charcoal/70 sm:text-sm">
          *Testimonial from the Vision Velocity pilot program. Real customer results will be showcased here.
        </p>
      </div>
    </section>
  );
}
