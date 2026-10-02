/**
 * All help text in one place: the Help Centre guides, the "?" panel for each
 * page and the glossary. Edit the wording here; both the Help Centre and the
 * page panels read from this file, so they always agree.
 */

export interface HelpGuide {
  slug: string;
  audience: 'admin' | 'charity' | 'bunnings';
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
  related?: string[];
}

export interface PageHelp {
  title: string;
  purpose: string;
  tasks: string[];
  guides: string[];
}

export const GUIDES: HelpGuide[] = [
  // ---------------- Admin guides ----------------
  {
    slug: 'invoices',
    audience: 'admin',
    title: 'Invoices',
    summary: 'How invoices are issued, sent, paid and corrected.',
    steps: [
      'First, a founder fills in Invoices → Invoice settings: ABN, address, payment instructions and how many days the charity has to pay. Invoices cannot be issued until the ABN and payment instructions are filled in.',
      'When you set an order to Confirmed, the site issues the invoice (numbered VV-001001 onwards) and emails it, with the order summary, to the charity. You can choose "Confirm without emailing" instead.',
      'You can also press Issue invoice on the order page at any time.',
      'When the money arrives, open the order and press Mark as paid.',
      'To correct a mistake, press Void invoice and give a reason, then Issue invoice again. The new invoice has a new number; the voided one stays on record.',
      'Invoices → filter "Overdue" shows unpaid invoices past their due date. They also appear under Needs attention and in the daily summary email.',
    ],
    tips: [
      'Vision Velocity is not registered for GST, so documents are titled "Invoice" (not "Tax invoice") and say no GST has been charged.',
      'An invoice keeps the price and details it was issued with, even if the order or settings change later.',
    ],
    related: ['create-order', 'automatic-emails'],
  },
  {
    slug: 'automatic-emails',
    audience: 'admin',
    title: 'Emails the site sends by itself',
    summary: 'Order emails to charities and the founders\' morning summary.',
    steps: [
      'Order received: when you create an order (with "Email the charity" ticked), the charity is emailed the order summary.',
      'Order confirmed: the first time an order is set to Confirmed, the charity is emailed its invoice and the order summary.',
      'Founders\' daily summary: each morning between 7 and 8 am (Brisbane time) every active founder is emailed what is in Needs attention. If nothing needs attention, no email is sent.',
      'Each order page lists its automatic emails under Invoice → Automatic emails, including any that failed or were not sent (for example because the charity has no email address).',
    ],
  },
  {
    slug: 'bunnings-officers',
    audience: 'admin',
    title: 'Give a Bunnings Activities Officer access',
    summary: 'Let a store\'s Activities Officer see the events at their store.',
    steps: [
      'Open Bunnings stores and the store. Make sure the Activities Officer\'s name and email are filled in.',
      'Press Email sign-in link. The officer receives a link that works once and lasts 7 days.',
      'They see upcoming and recent events at their store (no prices), can print run sheets and can correct their own contact details. You are emailed if they change them.',
      'Officers can ask for a new link themselves from the Bunnings sign-in page, using the email address on file.',
    ],
  },
  {
    slug: 'getting-started',
    audience: 'admin',
    title: 'Getting started: the order of things',
    summary: 'How a sausage sizzle moves through the site, from a new charity to the results.',
    steps: [
      'A charity signs up on the public site. It appears under Charities as "Awaiting approval", and on the dashboard under Needs attention.',
      'Approve the charity. They get an approval email and a "Set up your sign-in" email for the charity area.',
      'Create the event (Events → Add event), or confirm an event the charity has requested.',
      'On the event, find supplier stores near the Bunnings store and mark them Possible, Confirmed or Declined.',
      'Record the packages the event will use, and the staff and shift numbers.',
      'Create the order for the charity (Orders → + New order) once at least one package is active.',
      'Send the run sheet to the volunteers and the order summary to the charity (Print, Download PDF or Email on each record).',
      'After the event, enter the results — or let the charity enter them from their own area.',
    ],
    related: ['approve-charity', 'plan-event', 'set-up-packages', 'create-order', 'print-email'],
  },
  {
    slug: 'approve-charity',
    audience: 'admin',
    title: 'Approve a new charity',
    summary: 'Turn a new sign-up into an approved charity with its own sign-in.',
    steps: [
      'Open Charities, or click the charity under Needs attention on the dashboard.',
      'Check the details, then press Approve and confirm.',
      'The charity is emailed to say it has been approved, and its contact receives a "Set up your sign-in" email.',
      'Under Sign-in access on the charity page you can resend the set-up email, add another person or switch someone\'s access off.',
    ],
    tips: ['If the charity says the email never arrived, ask them to check their junk folder, then use Resend set-up email.'],
    related: ['charity-access'],
  },
  {
    slug: 'charity-access',
    audience: 'admin',
    title: 'Manage a charity\'s sign-in access',
    summary: 'Who can sign in for a charity, and how to add or remove people.',
    steps: [
      'Open the charity and scroll to Sign-in access.',
      'Add person: enter their name and email. They receive a set-up email and can choose a password.',
      'Switch off: removes that person\'s access straight away. Switch on again at any time.',
      'The main contact can also add people themselves from the charity area (Profile → People).',
    ],
    tips: ['A charity can only see its own events, orders and details — never other charities, supplier pricing or your internal notes.'],
  },
  {
    slug: 'plan-event',
    audience: 'admin',
    title: 'Plan an event and find suppliers',
    summary: 'Create an event, add the details and line up supplier stores near the Bunnings store.',
    steps: [
      'Events → Add event. Choose the date, Bunnings store, charity and status. Fill in the event details you know (name, estimated hotdogs, staff, shifts, inside or outside, packages).',
      'Save. On the event page, use "Suppliers in the store\'s postcode" or search by name or postcode to find supplier stores.',
      'Add a store, then set it to Possible, Confirmed or Declined as you hear back.',
      'The checklist at the top of the event shows what is still missing.',
    ],
    tips: ['Requests from charities arrive with the status "Requested by charity". Open the event and press Confirm request when you have agreed it.'],
    related: ['print-email', 'event-results'],
  },
  {
    slug: 'event-results',
    audience: 'admin',
    title: 'Record the results of an event',
    summary: 'Enter hotdogs sold, number of sales and the value of sales.',
    steps: [
      'Open the event and press Edit.',
      'Under "Results (after the event)" enter hotdogs sold, number of sales and value of sales in dollars.',
      'Set the status to Completed and save.',
    ],
    tips: ['Charities can enter their own results from their area. Events with no results appear under Needs attention on the dashboard.'],
  },
  {
    slug: 'set-up-packages',
    audience: 'admin',
    title: 'Set up components and packages',
    summary: 'Components are the items; packages are what charities order.',
    steps: [
      'Components → Add a component: name, pack size, quantity and unit, storage, target buy cost and sell price. Click Edit on it to add a photo.',
      'Packages → Add a package: name, description and base price. Leave Active unticked until it is ready.',
      'Press Contents on the package to list its components and quantities. The page shows the package\'s target cost and sell value.',
      'Tick Active when ready. Active packages appear on the order and event forms — and on the public landing page.',
    ],
  },
  {
    slug: 'create-order',
    audience: 'admin',
    title: 'Create and change an order',
    summary: 'Record what a charity has ordered, then keep it up to date.',
    steps: [
      'Orders → + New order. Choose the charity and package; the price fills in from the package and can be changed.',
      'Enter the event date, delivery address, contact and phone, and any special requests. Press Create order.',
      'To change it later, open the order and press Edit. Use the status list for quick changes (Pending → Confirmed → Scheduled → Delivered).',
    ],
    tips: ['You need at least one active package before you can create an order.'],
    related: ['print-email'],
  },
  {
    slug: 'print-email',
    audience: 'admin',
    title: 'Print, download or email a record',
    summary: 'Order summaries and event run sheets can be printed, saved as PDF or emailed.',
    steps: [
      'Open the order or event. Under "Print, download or email" choose an option.',
      'Print opens the document so you can print it; Download PDF saves it.',
      'Email: type the recipient\'s address, add a note if you like, tick "Send me a copy" if you want one, and press Send.',
      'Run sheets leave prices out unless you tick "Include prices". Order summaries are labelled "not a tax invoice".',
      'Every email sent is listed under the buttons, with who sent it and when.',
    ],
    tips: ['Lists (events, orders, charities) have a Download spreadsheet button. Events have Add to calendar.'],
  },
  {
    slug: 'find-anything',
    audience: 'admin',
    title: 'Find anything quickly',
    summary: 'The search box at the top of every page searches the whole site.',
    steps: [
      'Type at least two letters: a charity name, a contact, a store, a suburb, a postcode, an event name, a package or a component.',
      'Choose a result to open it. Recently viewed records are listed on the dashboard.',
    ],
  },
  {
    slug: 'reset-password',
    audience: 'admin',
    title: 'Reset your password',
    summary: 'If you have forgotten your password.',
    steps: [
      'On the sign-in page press Forgot password? and enter your email address.',
      'Open the newest email and press the link. It works once and expires after an hour.',
      'Choose a new password (at least 8 characters, with an uppercase letter and a number) and sign in.',
    ],
  },
  {
    slug: 'usage-and-privacy',
    audience: 'admin',
    title: 'What the site records about how it is used',
    summary: 'Usage recording helps us put the most-used buttons in the easiest places.',
    steps: [
      'For signed-in admins and charities the site records which pages are opened and which buttons are pressed, the type of user, and whether a phone, tablet or computer was used.',
      'It records whether a form was submitted or left unfinished — never what was typed into it.',
      'Searches that found nothing are recorded so we can add what people expected to find.',
      'Public visits are counted in total only: page, referring website and device type, with no visitor identifiers or cookies.',
      'Detailed records are deleted after 12 months. The summary is on the Site usage page.',
    ],
  },
  // ---------------- Charity guides ----------------
  {
    slug: 'charity-start',
    audience: 'charity',
    title: 'Welcome to your charity area',
    summary: 'What you can do here.',
    steps: [
      'Home shows what happens next and anything waiting for you.',
      'My events lists your upcoming and past sausage sizzles. Request a new one with Request an event.',
      'My orders shows what has been ordered for your events, with an order summary you can print or email.',
      'Profile keeps your contact details up to date. Your main contact can add other people, such as your treasurer.',
    ],
    related: ['charity-request-event', 'charity-results', 'charity-print-email'],
  },
  {
    slug: 'charity-request-event',
    audience: 'charity',
    title: 'Request an event',
    summary: 'Ask Vision Velocity to arrange a sausage sizzle.',
    steps: [
      'My events → Request an event.',
      'Choose your preferred date and Bunnings store. Add other dates that would suit and any message.',
      'Press Send request. It shows as "Requested by charity" until Vision Velocity confirms it with you.',
    ],
  },
  {
    slug: 'charity-results',
    audience: 'charity',
    title: 'Enter your results after the event',
    summary: 'Tell us how the day went.',
    steps: [
      'Open the event from My events (from the event day onwards).',
      'Under Results, enter hotdogs sold, number of sales and the total value of sales in dollars.',
      'Press Save results. You can correct them later if needed.',
    ],
  },
  {
    slug: 'charity-print-email',
    audience: 'charity',
    title: 'Print or email your records',
    summary: 'Keep a copy or pass it to your volunteers or committee.',
    steps: [
      'Open an event for its run sheet, or an order for its order summary.',
      'Choose Print, Download PDF or Email. To email, type the address, add a note if you like and press Send.',
      'Order summaries are not invoices. Your invoice is emailed when the order is confirmed and is also on the order page.',
    ],
  },
  {
    slug: 'charity-invoices',
    audience: 'charity',
    title: 'Your invoices',
    summary: 'When invoices arrive and how to pay.',
    steps: [
      'When Vision Velocity confirms your order, you are emailed the invoice and the order summary.',
      'You can also open the order under My orders and press Print or Download PDF under Invoice.',
      'Payment details and the due date are on the invoice. Please quote the invoice number when you pay.',
    ],
    tips: ['Vision Velocity is not registered for GST, so no GST is charged on its invoices.'],
  },
  {
    slug: 'charity-sign-in',
    audience: 'charity',
    title: 'Signing in',
    summary: 'Password, or a link emailed to you.',
    steps: [
      'Go to the charity sign-in page and enter your email and password.',
      'No password, or forgotten it? Choose "Email me a sign-in link" or "Forgot password?". Use the newest email; links work once and expire after an hour.',
    ],
  },
  // ---------------- Bunnings Activities Officer guides ----------------
  {
    slug: 'ao-start',
    audience: 'bunnings',
    title: 'What this area is for',
    summary: 'See the charity sausage sizzles at your store.',
    steps: [
      'Events at my store lists the sausage sizzles Vision Velocity is arranging at your store, with the charity, its contact person and phone, the stall location and the number of volunteers.',
      'Events that are still only being discussed with the charity are not shown until they are planned.',
      'The last six months of events are listed underneath.',
    ],
    related: ['ao-run-sheet', 'ao-details'],
  },
  {
    slug: 'ao-run-sheet',
    audience: 'bunnings',
    title: 'Print a run sheet',
    summary: 'Everything about the day on one page.',
    steps: [
      'On Events at my store, find the event and press Print run sheet or Download PDF.',
      'Add to calendar puts the event in your phone or Outlook calendar.',
    ],
  },
  {
    slug: 'ao-details',
    audience: 'bunnings',
    title: 'Update your contact details',
    summary: 'Keep your name, email and phone up to date.',
    steps: [
      'Open My details, correct your name, email or phone and press Save my details.',
      'Vision Velocity is told about the change. Future sign-in links go to the new email address.',
      'If the store\'s own details are wrong, use Contact us at the top of the page.',
    ],
  },
  {
    slug: 'ao-sign-in',
    audience: 'bunnings',
    title: 'Signing in',
    summary: 'No password — a link is emailed to you.',
    steps: [
      'Open the link in the email from Vision Velocity. You stay signed in on that device for 7 days.',
      'Link used or expired? Go to the Bunnings sign-in page, enter your work email and press Email me a sign-in link.',
    ],
  },
];

export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'Awaiting approval', meaning: 'A charity has signed up and is waiting for a Vision Velocity founder to approve it.' },
  { term: 'Approved', meaning: 'The charity has been approved and can use the charity area.' },
  { term: 'Requested by charity', meaning: 'A charity has asked for an event. It is not booked until Vision Velocity confirms it.' },
  { term: 'Planned', meaning: 'An event is being arranged but not yet confirmed with everyone.' },
  { term: 'Confirmed', meaning: 'An event (or a supplier for an event) is agreed.' },
  { term: 'Completed', meaning: 'The event has taken place.' },
  { term: 'Cancelled', meaning: 'The event will not go ahead.' },
  { term: 'Possible / Declined', meaning: 'For a supplier store on an event: still being asked, or has said no.' },
  { term: 'Pending, Scheduled, Delivered', meaning: 'Order stages: received but not confirmed; delivery booked; delivered.' },
  { term: 'Package', meaning: 'What a charity orders for an event, such as a set number of sausages, bread and sauce.' },
  { term: 'Component', meaning: 'One item inside a package, such as a carton of sausages or a pack of napkins.' },
  { term: 'Run sheet', meaning: 'A printable page with everything needed on the day: store, times, staff, packages, suppliers and contacts.' },
  { term: 'Order summary', meaning: 'A printable record of an order. It is not an invoice.' },
  { term: 'Invoice', meaning: 'The bill for an order, issued when the order is confirmed. Vision Velocity is not registered for GST, so it is an invoice, not a tax invoice, and no GST is charged.' },
  { term: 'Void (invoice)', meaning: 'An invoice cancelled because of a mistake. It stays on record; a corrected invoice gets a new number.' },
  { term: 'Head-office negotiations', meaning: 'Our discussions with each supermarket chain\'s head office (formerly "Supplier status").' },
];

const P = (title: string, purpose: string, tasks: string[], guides: string[]): PageHelp => ({ title, purpose, tasks, guides });

/** Help for each page, matched by path (record ids replaced by [id]). */
export const PAGE_HELP: Record<string, PageHelp> = {
  '/admin/dashboard': P('Dashboard', 'What needs your attention today, plus the main totals.', ['Work through Needs attention from the top', 'Open something you looked at recently', 'Search for anything with the box at the top'], ['getting-started', 'find-anything']),
  '/admin/charities': P('Charities', 'Every charity that has signed up or been added.', ['Filter to "Awaiting approval" to see new sign-ups', 'Open a charity to approve it or change its details', 'Download the list as a spreadsheet'], ['approve-charity']),
  '/admin/charities/new': P('Add a charity', 'Add a charity yourself, for example after a phone call.', ['Fill in the name and contact details', 'Save, then approve it to send the sign-in email'], ['approve-charity']),
  '/admin/charities/[id]': P('Charity', 'Everything about one charity: details, events, orders and who can sign in.', ['Approve a new charity', 'Add or remove people under Sign-in access', 'See the charity\'s events and orders'], ['approve-charity', 'charity-access']),
  '/admin/events': P('Events', 'All sausage sizzles, past and future.', ['Filter by status', 'Add an event', 'Download the list as a spreadsheet'], ['plan-event']),
  '/admin/events/new': P('Add event', 'Create a new event.', ['Choose date, store and charity', 'Add the details you know now; the rest can be added later'], ['plan-event']),
  '/admin/events/[id]': P('Event', 'One event: details, checklist, suppliers, packages, results and documents.', ['Check the checklist for anything missing', 'Add supplier stores', 'Print or email the run sheet', 'Confirm a charity\'s request'], ['plan-event', 'event-results', 'print-email']),
  '/admin/orders': P('Orders', 'What each charity has ordered.', ['Create a new order', 'Filter by status', 'Download the list as a spreadsheet'], ['create-order']),
  '/admin/orders/new': P('New order', 'Record an order for a charity.', ['Choose charity and package', 'Enter delivery details and price'], ['create-order']),
  '/admin/orders/[id]': P('Order', 'One order: details, status, invoice and documents.', ['Edit the order', 'Change the status (Confirmed issues and emails the invoice)', 'Mark the invoice paid, or void it', 'Print or email the order summary or invoice'], ['create-order', 'invoices', 'print-email']),
  '/admin/invoices': P('Invoices', 'Every invoice issued, and what is still to be paid.', ['Filter to Overdue or Awaiting payment', 'Open an invoice\'s order to mark it paid', 'Download the list as a spreadsheet'], ['invoices']),
  '/admin/invoice-settings': P('Invoice settings', 'The business details printed on invoices.', ['Enter the ABN, address and payment instructions', 'Set how many days charities have to pay'], ['invoices']),
  '/admin/packages': P('Packages', 'What charities can order.', ['Add or edit a package', 'Set its contents', 'Make it active when ready'], ['set-up-packages']),
  '/admin/components': P('Components', 'The items and ingredients that go into packages.', ['Add a component', 'Upload a photo', 'Record target buy and sell prices'], ['set-up-packages']),
  '/admin/bunnings': P('Bunnings stores', 'All Bunnings stores, with filters by state and postcode.', ['Find a store', 'Open it to see nearby suppliers and charities'], ['plan-event']),
  '/admin/bunnings/[id]': P('Bunnings store', 'One store with its details and nearby suppliers and charities.', ['See suppliers or charities in the same postcode or nearby', 'Email the Activities Officer a sign-in link'], ['plan-event', 'bunnings-officers']),
  '/admin/suppliers': P('Suppliers', 'Supermarket stores (Woolworths, Coles, IGA) that can supply events.', ['Filter by chain, state or postcode', 'Open a store to see or edit its contact'], ['plan-event']),
  '/admin/suppliers/[id]': P('Supplier store', 'One supermarket store and its contact.', ['Press Edit to update the store contact'], ['plan-event']),
  '/admin/supplier-status': P('Head-office negotiations', 'Our discussions with each supermarket chain\'s head office.', ['Record the latest status and contact for each chain'], []),
  '/admin/help': P('Help', 'Guides for common tasks and what the words mean.', ['Search the guides', 'Read the glossary', 'Replay the welcome tour'], ['getting-started']),
  '/admin/usage-report': P('Site usage', 'How the site is being used, and feedback received.', ['See the most-used buttons and pages', 'Spot forms that are often left unfinished', 'Read and close feedback'], ['usage-and-privacy']),
  '/charity': P('Home', 'What happens next and anything waiting for you.', ['See your next event', 'Request an event'], ['charity-start']),
  '/charity/my-events': P('My events', 'Your sausage sizzles, past and upcoming.', ['Request an event', 'Open an event for its run sheet or to enter results'], ['charity-request-event', 'charity-results']),
  '/charity/my-events/new': P('Request an event', 'Ask Vision Velocity to arrange a sausage sizzle.', ['Choose a date and store', 'Add other dates that suit'], ['charity-request-event']),
  '/charity/my-events/[id]': P('Event', 'Details of one of your events.', ['Print or email the run sheet', 'Enter your results after the event'], ['charity-results', 'charity-print-email']),
  '/charity/orders': P('My orders', 'What has been ordered for your events.', ['Open an order for its summary'], ['charity-print-email']),
  '/charity/orders/[id]': P('Order', 'One of your orders.', ['Print, download or email the order summary', 'Print or download your invoice'], ['charity-print-email', 'charity-invoices']),
  '/bunnings/activities-officer/events': P('Events at my store', 'Charity sausage sizzles at your store.', ['Print or download a run sheet', 'Add an event to your calendar', 'Phone the charity contact'], ['ao-start', 'ao-run-sheet']),
  '/bunnings/activities-officer/store': P('My details', 'Your contact details for this store.', ['Correct your name, email or phone'], ['ao-details']),
  '/bunnings/activities-officer/help': P('Help', 'Guides for the Bunnings area.', ['Read a guide', 'Contact Vision Velocity'], ['ao-start', 'ao-sign-in']),
  '/charity/profile': P('Profile', 'Your charity\'s contact details and the people who can sign in.', ['Update your details', 'Add a person (main contact only)'], ['charity-start']),
  '/charity/help': P('Help', 'Guides for using your charity area.', ['Read a guide', 'Contact Vision Velocity'], ['charity-start']),
};

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function helpForPath(pathname: string | null): PageHelp | null {
  if (!pathname) return null;
  const key = pathname.replace(UUID_RE, '[id]').replace(/\/$/, '') || '/';
  return PAGE_HELP[key] ?? null;
}

export function guide(slug: string): HelpGuide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
