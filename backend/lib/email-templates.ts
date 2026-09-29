// /lib/email-templates.ts
// Task 3.3: Email Templates with Tracking Integration

import { renderTemplate } from './handlebars-utils';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  plainTextBody: string;
  variables: string[];
}

export interface EmailVariables {
  [key: string]: string | number | boolean;
}

/**
 * Generate tracking pixel URL
 * Called during email send to create unique pixel per recipient
 */
export function generateTrackingPixel(trackingId: string): string {
  const baseUrl = process.env.TRACKING_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/tracking/pixel?id=${trackingId}`;
}

/**
 * Wrap link for click tracking
 * All external links in emails should use this wrapper
 */
export function wrapLinkForTracking(trackingId: string, url: string): string {
  const baseUrl = process.env.TRACKING_BASE_URL || 'http://localhost:3000';
  const encodedUrl = encodeURIComponent(url);
  return `${baseUrl}/api/tracking/click?id=${trackingId}&redirect=${encodedUrl}`;
}

// ============================================
// EMAIL TEMPLATE 1: CHARITY SIGNUP CONFIRMATION
// ============================================

export const charitySignupConfirmationTemplate: EmailTemplate = {
  id: 'charity_signup_confirmation',
  name: 'Charity Signup Confirmation',
  subject: 'Welcome to Vision Velocity – We\'re Reviewing Your Application',
  htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    .button { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Vision Velocity</h1>
    </div>

    <div class="content">
      <p>Hello {{charityName}},</p>

      <p>Thank you for signing up with Vision Velocity! We're excited to help {{charityName}} raise funds through professional sausage sizzles and catering events.</p>

      <h2>What Happens Next</h2>
      <p>We're reviewing your application and will contact you within 24 hours to confirm your account activation. During this time, our team will:</p>
      <ul>
        <li>Verify your charity details</li>
        <li>Confirm your preferred Bunnings locations</li>
        <li>Discuss your first event details</li>
      </ul>

      <h2>In the Meantime</h2>
      <p>You can explore what's available in our platform. Here's what you'll be able to do once approved:</p>
      <ul>
        <li>Book events at any of our partner Bunnings stores</li>
        <li>Access our delivery and logistics support</li>
        <li>Track funds raised and event attendance</li>
      </ul>

      <p><strong>Contact Details We Have on File:</strong></p>
      <p>
        Contact: {{contactName}}<br>
        Email: {{contactEmail}}<br>
        Phone: {{contactPhone}}
      </p>

      <p>If any of these details are incorrect, please reply to this email and let us know.</p>

      <p>Thank you for choosing Vision Velocity. We look forward to supporting your fundraising efforts!</p>

      <p>Best regards,<br>
      The Vision Velocity Team</p>
    </div>

    <div class="footer">
      <p>Vision Velocity &copy; 2026. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
      <img src="{{trackingPixel}}" alt="" width="1" height="1" style="display:none;">
    </div>
  </div>
</body>
</html>
  `,
  plainTextBody: `Hello {{charityName}},

Thank you for signing up with Vision Velocity! We're excited to help {{charityName}} raise funds through professional sausage sizzles and catering events.

WHAT HAPPENS NEXT

We're reviewing your application and will contact you within 24 hours to confirm your account activation. During this time, our team will:
- Verify your charity details
- Confirm your preferred Bunnings locations
- Discuss your first event details

IN THE MEANTIME

You can explore what's available in our platform. Here's what you'll be able to do once approved:
- Book events at any of our partner Bunnings stores
- Access our delivery and logistics support
- Track funds raised and event attendance

CONTACT DETAILS WE HAVE ON FILE

Contact: {{contactName}}
Email: {{contactEmail}}
Phone: {{contactPhone}}

If any of these details are incorrect, please reply to this email and let us know.

Thank you for choosing Vision Velocity. We look forward to supporting your fundraising efforts!

Best regards,
The Vision Velocity Team

---
Vision Velocity © 2026. All rights reserved.
To unsubscribe: {{unsubscribeUrl}}
  `,
  variables: ['charityName', 'contactName', 'contactEmail', 'contactPhone', 'trackingPixel', 'unsubscribeUrl'],
};

// ============================================
// EMAIL TEMPLATE 2: CHARITY SIGNUP APPROVED
// ============================================

export const charitySignupApprovedTemplate: EmailTemplate = {
  id: 'charity_signup_approved',
  name: 'Charity Signup Approved',
  subject: 'Your Vision Velocity Account is Ready – Book Your First Event',
  htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Account is Approved!</h1>
    </div>

    <div class="content">
      <p>Hello {{contactName}},</p>

      <p>Great news! Your {{charityName}} account has been approved and is now active. We can now start arranging your first event.</p>

      <h2>What You Can Do Now</h2>
      <ul>
        <li>Book sausage sizzles at any of our partner Bunnings stores</li>
        <li>Choose your preferred date and location</li>
        <li>Access our logistics support and delivery services</li>
        <li>View all available event packages and pricing</li>
      </ul>

      <h2>Your First Event</h2>
      <p>To get started, reply to this email with your preferred date and Bunnings location, and we will arrange your first event. Our team will handle:</p>
      <ul>
        <li>Stock delivery to your Bunnings location</li>
        <li>Coordination with the store's Activities Officer</li>
        <li>Event setup and support on the day</li>
      </ul>

      <h2>Need Help?</h2>
      <p>If you have any questions or need assistance booking your first event, please reply to this email or contact us at {{supportEmail}}.</p>

      <p>We're excited to support {{charityName}} in your fundraising efforts!</p>

      <p>Best regards,<br>
      The Vision Velocity Team</p>
    </div>

    <div class="footer">
      <p>Vision Velocity © 2026. All rights reserved.</p>
      <img src="{{trackingPixel}}" alt="" width="1" height="1" style="display:none;">
    </div>
  </div>
</body>
</html>
  `,
  plainTextBody: `Hello {{contactName}},

Great news! Your {{charityName}} account has been approved and is now active. We can now start arranging your first event.

WHAT YOU CAN DO NOW

- Book sausage sizzles at any of our partner Bunnings stores
- Choose your preferred date and location
- Access our logistics support and delivery services
- View all available event packages and pricing

YOUR FIRST EVENT

To get started, reply to this email with your preferred date and Bunnings location, and we will arrange your first event. Our team will handle:
- Stock delivery to your Bunnings location
- Coordination with the store's Activities Officer
- Event setup and support on the day

NEED HELP?

If you have any questions or need assistance booking your first event, please reply to this email or contact us at {{supportEmail}}.

We're excited to support {{charityName}} in your fundraising efforts!

Best regards,
The Vision Velocity Team

---
Vision Velocity © 2026. All rights reserved.
  `,
  variables: ['contactName', 'charityName', 'supportEmail', 'trackingPixel'],
};

// ============================================
// EMAIL TEMPLATE 3: EVENT CONFIRMATION
// ============================================

export const eventConfirmationTemplate: EmailTemplate = {
  id: 'event_confirmation',
  name: 'Event Confirmation',
  subject: 'Event Confirmed – {{eventDate}} at {{bunningsLocation}}',
  htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .event-details { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Event Confirmed</h1>
    </div>

    <div class="content">
      <p>Hello {{contactName}},</p>

      <p>Your event for {{charityName}} has been confirmed! Here are the details:</p>

      <div class="event-details">
        <p><strong>Event Date:</strong> {{eventDate}}</p>
        <p><strong>Time:</strong> 7:00 AM – 5:00 PM</p>
        <p><strong>Location:</strong> {{bunningsLocation}}</p>
        <p><strong>Address:</strong> {{bunningsAddress}}</p>
        <p><strong>Expected Attendees:</strong> {{expectedAttendees}}</p>
      </div>

      <h2>Delivery Details</h2>
      <p>Our team will deliver all stock and equipment to {{bunningsLocation}} on {{eventDate}} at 7:00 AM sharp. Please ensure someone from your team is available to receive the delivery.</p>

      <h2>What's Included</h2>
      <ul>
        <li>Full stock as per your selected package</li>
        <li>Equipment and setup assistance</li>
        <li>Coordination with Bunnings Activities Officer</li>
        <li>Evening stock collection and cleanup support</li>
      </ul>

      <h2>Your Bunnings Contact</h2>
      <p>The Activities Officer at your Bunnings location is <strong>{{aoName}}</strong>. They will be your point of contact on the day.</p>
      <p>Phone: {{aoPhone}}</p>
      <p>Email: {{aoEmail}}</p>

      <h2>Important Notes</h2>
      <ul>
        <li>Ensure parking is available for delivery vehicle</li>
        <li>Have a responsible team member present from 6:45 AM</li>
        <li>Contact us immediately if there are any issues</li>
      </ul>

      <h2>Questions?</h2>
      <p>Contact our support team at {{supportEmail}} or {{supportPhone}}</p>

      <p>We're looking forward to a successful event!</p>

      <p>Best regards,<br>
      The Vision Velocity Team</p>
    </div>

    <div class="footer">
      <p>Vision Velocity © 2026. All rights reserved.</p>
      <img src="{{trackingPixel}}" alt="" width="1" height="1" style="display:none;">
    </div>
  </div>
</body>
</html>
  `,
  plainTextBody: `Hello {{contactName}},

Your event for {{charityName}} has been confirmed! Here are the details:

EVENT DETAILS

Event Date: {{eventDate}}
Time: 7:00 AM – 5:00 PM
Location: {{bunningsLocation}}
Address: {{bunningsAddress}}
Expected Attendees: {{expectedAttendees}}

DELIVERY DETAILS

Our team will deliver all stock and equipment to {{bunningsLocation}} on {{eventDate}} at 7:00 AM sharp. Please ensure someone from your team is available to receive the delivery.

WHAT'S INCLUDED

- Full stock as per your selected package
- Equipment and setup assistance
- Coordination with Bunnings Activities Officer
- Evening stock collection and cleanup support

YOUR BUNNINGS CONTACT

The Activities Officer at your Bunnings location is {{aoName}}.
Phone: {{aoPhone}}
Email: {{aoEmail}}

IMPORTANT NOTES

- Ensure parking is available for delivery vehicle
- Have a responsible team member present from 6:45 AM
- Contact us immediately if there are any issues

QUESTIONS?

Contact our support team at {{supportEmail}} or {{supportPhone}}

We're looking forward to a successful event!

Best regards,
The Vision Velocity Team

---
Vision Velocity © 2026. All rights reserved.
  `,
  variables: ['contactName', 'charityName', 'eventDate', 'bunningsLocation', 'bunningsAddress', 'expectedAttendees', 'aoName', 'aoPhone', 'aoEmail', 'supportEmail', 'supportPhone', 'trackingPixel'],
};

// ============================================
// EMAIL TEMPLATE 4: EVENT REMINDER (24H BEFORE)
// ============================================

export const eventReminderTemplate: EmailTemplate = {
  id: 'event_reminder_24h',
  name: 'Event Reminder (24h Before)',
  subject: 'Final Reminder – Your Event Tomorrow at {{bunningsLocation}}',
  htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ffc107; color: #333; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .alert { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Event Reminder – Tomorrow!</h1>
    </div>

    <div class="content">
      <p>Hello {{contactName}},</p>

      <p>This is a friendly reminder that your sausage sizzle fundraiser is happening <strong>tomorrow</strong>!</p>

      <div class="alert">
        <p><strong>Event Tomorrow:</strong> {{eventDate}}</p>
        <p><strong>Location:</strong> {{bunningsLocation}}</p>
        <p><strong>Delivery Time:</strong> 7:00 AM</p>
      </div>

      <h2>Final Checklist</h2>
      <ul>
        <li>✓ Confirm all team members are attending</li>
        <li>✓ Arrange parking for delivery vehicle</li>
        <li>✓ Have someone available at 6:45 AM</li>
        <li>✓ Charge phones for day-of communication</li>
        <li>✓ Plan volunteer shifts if needed</li>
      </ul>

      <h2>Day-Of Contacts</h2>
      <p><strong>Bunnings Activities Officer:</strong> {{aoName}}</p>
      <p>Phone: {{aoPhone}}</p>

      <p><strong>Vision Velocity Support:</strong></p>
      <p>Phone: {{supportPhone}}</p>
      <p>Email: {{supportEmail}}</p>

      <h2>If You Need to Cancel</h2>
      <p>If circumstances have changed and you need to reschedule, please contact us immediately at {{supportEmail}} or {{supportPhone}}. We can work with you to find an alternative date.</p>

      <p>We're excited for tomorrow! Best of luck with your event.</p>

      <p>Best regards,<br>
      The Vision Velocity Team</p>
    </div>

    <div class="footer">
      <p>Vision Velocity © 2026. All rights reserved.</p>
      <img src="{{trackingPixel}}" alt="" width="1" height="1" style="display:none;">
    </div>
  </div>
</body>
</html>
  `,
  plainTextBody: `Hello {{contactName}},

This is a friendly reminder that your sausage sizzle fundraiser is happening TOMORROW!

EVENT TOMORROW: {{eventDate}}
Location: {{bunningsLocation}}
Delivery Time: 7:00 AM

FINAL CHECKLIST

✓ Confirm all team members are attending
✓ Arrange parking for delivery vehicle
✓ Have someone available at 6:45 AM
✓ Charge phones for day-of communication
✓ Plan volunteer shifts if needed

DAY-OF CONTACTS

Bunnings Activities Officer: {{aoName}}
Phone: {{aoPhone}}

Vision Velocity Support:
Phone: {{supportPhone}}
Email: {{supportEmail}}

IF YOU NEED TO CANCEL

If circumstances have changed and you need to reschedule, please contact us immediately at {{supportEmail}} or {{supportPhone}}. We can work with you to find an alternative date.

We're excited for tomorrow! Best of luck with your event.

Best regards,
The Vision Velocity Team

---
Vision Velocity © 2026. All rights reserved.
  `,
  variables: ['contactName', 'eventDate', 'bunningsLocation', 'aoName', 'aoPhone', 'supportPhone', 'supportEmail', 'trackingPixel'],
};

// ============================================
// EMAIL TEMPLATE 5: EVENT COMPLETED (POST-EVENT)
// ============================================

export const eventCompletedTemplate: EmailTemplate = {
  id: 'event_completed',
  name: 'Event Completed (Post-Event)',
  subject: 'Event Summary – Thank You for Your Effort',
  htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .summary { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Event Complete – Well Done!</h1>
    </div>

    <div class="content">
      <p>Hello {{contactName}},</p>

      <p>Thank you for running a successful sausage sizzle fundraiser for {{charityName}}! We're thrilled to share your event summary:</p>

      <div class="summary">
        <p><strong>Event Date:</strong> {{eventDate}}</p>
        <p><strong>Location:</strong> {{bunningsLocation}}</p>
        <p><strong>Attendees:</strong> {{actualAttendees}}</p>
        <p><strong>Funds Raised:</strong> \${{fundsRaised}}</p>
      </div>

      <h2>Impact Summary</h2>
      <p>Your event generated <strong>\${{fundsRaised}}</strong> for {{charityName}}. This is an outstanding result and demonstrates the power of community support for your cause.</p>

      <h2>Event Feedback</h2>
      <p>We'd love to hear about your experience. Your feedback helps us improve our service for future events:</p>
      <p><a href="{{feedbackUrl}}">Share Your Feedback (2-minute survey)</a></p>

      <h2>What Happens Next</h2>
      <ul>
        <li>Your event photos and data will be available in your dashboard within 2 business days</li>
        <li>A detailed financial summary will be sent to {{charityName}} within 3 business days</li>
        <li>You can schedule your next event anytime in your dashboard</li>
      </ul>

      <h2>Book Your Next Event</h2>
      <p>Congratulations on a successful event! Would you like to schedule another fundraiser? {{charityName}} can book as many events as you like at any of our partner Bunnings locations.</p>
      <p><a href="{{dashboardUrl}}">Book Your Next Event</a></p>

      <h2>Thank You</h2>
      <p>We're grateful for the opportunity to support {{charityName}} in your fundraising efforts. If you have any questions or would like to discuss tailored packages for future events, please don't hesitate to contact us.</p>

      <p>Best regards,<br>
      The Vision Velocity Team</p>
    </div>

    <div class="footer">
      <p>Vision Velocity © 2026. All rights reserved.</p>
      <img src="{{trackingPixel}}" alt="" width="1" height="1" style="display:none;">
    </div>
  </div>
</body>
</html>
  `,
  plainTextBody: `Hello {{contactName}},

Thank you for running a successful sausage sizzle fundraiser for {{charityName}}! We're thrilled to share your event summary:

EVENT SUMMARY

Event Date: {{eventDate}}
Location: {{bunningsLocation}}
Attendees: {{actualAttendees}}
Funds Raised: \${{fundsRaised}}

IMPACT SUMMARY

Your event generated \${{fundsRaised}} for {{charityName}}. This is an outstanding result and demonstrates the power of community support for your cause.

EVENT FEEDBACK

We'd love to hear about your experience. Your feedback helps us improve our service for future events:
{{feedbackUrl}}

WHAT HAPPENS NEXT

- Your event photos and data will be available in your dashboard within 2 business days
- A detailed financial summary will be sent to {{charityName}} within 3 business days
- You can schedule your next event anytime in your dashboard

BOOK YOUR NEXT EVENT

Congratulations on a successful event! Would you like to schedule another fundraiser? {{charityName}} can book as many events as you like at any of our partner Bunnings locations.

{{dashboardUrl}}

THANK YOU

We're grateful for the opportunity to support {{charityName}} in your fundraising efforts. If you have any questions or would like to discuss tailored packages for future events, please don't hesitate to contact us.

Best regards,
The Vision Velocity Team

---
Vision Velocity © 2026. All rights reserved.
  `,
  variables: ['contactName', 'charityName', 'eventDate', 'bunningsLocation', 'actualAttendees', 'fundsRaised', 'feedbackUrl', 'dashboardUrl', 'trackingPixel'],
};

// ============================================
// EMAIL TEMPLATE 6: ADMIN NOTIFICATION (NEW SIGNUP)
// ============================================

export const adminNotificationTemplate: EmailTemplate = {
  id: 'admin_notification_signup',
  name: 'Admin Notification (New Signup)',
  subject: 'New charity signup: {{charityName}}',
  htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .details { background-color: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    .button { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Charity Signup – Review Required</h1>
    </div>

    <div class="content">
      <p>A new charity has signed up and requires your approval.</p>

      <div class="details">
        <h3>Signup Details</h3>
        <p><strong>Charity Name:</strong> {{charityName}}</p>
        <p><strong>Contact Name:</strong> {{contactName}}</p>
        <p><strong>Email:</strong> {{contactEmail}}</p>
        <p><strong>Phone:</strong> {{contactPhone}}</p>
        <p><strong>Address:</strong> {{charityAddress}}</p>
        <p><strong>Preferred Location:</strong> {{preferredBunningsLocation}}</p>
        <p><strong>First Event Date:</strong> {{requestedEventDate}}</p>
        <p><strong>Expected Attendees:</strong> {{expectedAttendees}}</p>
        <p><strong>Signup Timestamp:</strong> {{signupTime}}</p>
      </div>

      <h2>Next Steps</h2>
      <ol>
        <li>Review the charity details for validity</li>
        <li>Verify contact information if needed</li>
        <li>Check ABN/charity status (if provided)</li>
        <li>Approve or reject the signup</li>
        <li>Charity will receive confirmation email within 24 hours</li>
      </ol>

      <p style="text-align: center;">
        <a href="{{adminDashboardUrl}}" class="button">Review in Dashboard</a>
      </p>

      <h2>Notes</h2>
      <ul>
        <li>Check that the charity is legitimate and eligible</li>
        <li>Verify contact information is accurate</li>
        <li>Ensure Bunnings location preference is supported</li>
        <li>Follow up if event date conflicts with existing bookings</li>
      </ul>

      <p><strong>Note:</strong> Charities are in status 'pending_approval' until you take action.</p>
    </div>

    <div class="footer">
      <p>Vision Velocity Admin Dashboard</p>
    </div>
  </div>
</body>
</html>
  `,
  plainTextBody: `New Charity Signup – Review Required

A new charity has signed up and requires your approval.

SIGNUP DETAILS

Charity Name: {{charityName}}
Contact Name: {{contactName}}
Email: {{contactEmail}}
Phone: {{contactPhone}}
Address: {{charityAddress}}
Preferred Location: {{preferredBunningsLocation}}
First Event Date: {{requestedEventDate}}
Expected Attendees: {{expectedAttendees}}
Signup Timestamp: {{signupTime}}

NEXT STEPS

1. Review the charity details for validity
2. Verify contact information if needed
3. Check ABN/charity status (if provided)
4. Approve or reject the signup
5. Charity will receive confirmation email within 24 hours

Review in Dashboard: {{adminDashboardUrl}}

NOTES

- Check that the charity is legitimate and eligible
- Verify contact information is accurate
- Ensure Bunnings location preference is supported
- Follow up if event date conflicts with existing bookings

Note: Charities are in status 'pending_approval' until you take action.

---
Vision Velocity Admin Dashboard
  `,
  variables: ['charityName', 'contactName', 'contactEmail', 'contactPhone', 'charityAddress', 'preferredBunningsLocation', 'requestedEventDate', 'expectedAttendees', 'signupTime', 'adminDashboardUrl'],
};

// ============================================
// EMAIL TEMPLATE 7: WOOLWORTHS STATUS UPDATE
// ============================================

export const woolworthsStatusUpdateTemplate: EmailTemplate = {
  id: 'woolworths_status_update',
  name: 'Woolworths Status Update',
  subject: 'Woolworths Negotiation Update – {{milestone}} Reached',
  htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6f42c1; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .milestone { background-color: #e7e5ff; border: 2px solid #6f42c1; padding: 20px; border-radius: 4px; text-align: center; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Woolworths Partnership Progress</h1>
    </div>

    <div class="content">
      <p>Dear Natalie,</p>

      <p>Congratulations! We've reached a significant milestone in the Woolworths negotiation.</p>

      <div class="milestone">
        <h2>{{milestone}} ✓</h2>
        <p><strong>Date Reached:</strong> {{milestoneDate}}</p>
      </div>

      <h2>Current Status</h2>
      <p><strong>Overall Progress:</strong> {{progressPercentage}}% complete</p>
      <p><strong>Store Manager:</strong> {{storeManagerName}}</p>
      <p><strong>Last Contact:</strong> {{lastContactDate}}</p>
      <p><strong>Next Milestone:</strong> {{nextMilestone}}</p>
      <p><strong>Planned Next Contact:</strong> {{nextMilestoneDate}}</p>

      <h2>Negotiation Areas</h2>
      <p><strong>Delivery & Logistics:</strong> {{deliveryStatus}}</p>
      <p><strong>Supply & Pricing:</strong> {{supplyStatus}}</p>
      <p><strong>Commercial Agreement:</strong> {{commercialStatus}}</p>

      <h2>Recent Notes</h2>
      <p>{{recentNotes}}</p>

      <h2>Next Steps</h2>
      <ul>
        <li>Schedule meeting with {{storeManagerName}} for {{nextMilestoneDate}}</li>
        <li>Prepare materials for {{nextMilestone}} discussion</li>
        <li>Follow up on {{deliveryStatus}} and {{supplyStatus}} items</li>
      </ul>

      <p>This is excellent progress on the Woolworths partnership. Keep up the great work!</p>

      <p>Best regards,<br>
      Mark & The Vision Velocity Team</p>
    </div>

    <div class="footer">
      <p>Vision Velocity © 2026. All rights reserved.</p>
      <img src="{{trackingPixel}}" alt="" width="1" height="1" style="display:none;">
    </div>
  </div>
</body>
</html>
  `,
  plainTextBody: `Dear Natalie,

Congratulations! We've reached a significant milestone in the Woolworths negotiation.

{{milestone}} ✓
Date Reached: {{milestoneDate}}

CURRENT STATUS

Overall Progress: {{progressPercentage}}% complete
Store Manager: {{storeManagerName}}
Last Contact: {{lastContactDate}}
Next Milestone: {{nextMilestone}}
Planned Next Contact: {{nextMilestoneDate}}

NEGOTIATION AREAS

Delivery & Logistics: {{deliveryStatus}}
Supply & Pricing: {{supplyStatus}}
Commercial Agreement: {{commercialStatus}}

RECENT NOTES

{{recentNotes}}

NEXT STEPS

- Schedule meeting with {{storeManagerName}} for {{nextMilestoneDate}}
- Prepare materials for {{nextMilestone}} discussion
- Follow up on {{deliveryStatus}} and {{supplyStatus}} items

This is excellent progress on the Woolworths partnership. Keep up the great work!

Best regards,
Mark & The Vision Velocity Team

---
Vision Velocity © 2026. All rights reserved.
  `,
  variables: ['milestone', 'milestoneDate', 'progressPercentage', 'storeManagerName', 'lastContactDate', 'nextMilestone', 'nextMilestoneDate', 'deliveryStatus', 'supplyStatus', 'commercialStatus', 'recentNotes', 'trackingPixel'],
};

// ============================================
// TEMPLATE REGISTRY
// ============================================

export const emailTemplates: Record<string, EmailTemplate> = {
  charity_signup_confirmation: charitySignupConfirmationTemplate,
  charity_signup_approved: charitySignupApprovedTemplate,
  event_confirmation: eventConfirmationTemplate,
  event_reminder_24h: eventReminderTemplate,
  event_completed: eventCompletedTemplate,
  admin_notification_signup: adminNotificationTemplate,
  woolworths_status_update: woolworthsStatusUpdateTemplate,
};

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): EmailTemplate | null {
  return emailTemplates[templateId] || null;
}

/**
 * List all available templates
 */
export function listTemplates(): EmailTemplate[] {
  return Object.values(emailTemplates);
}

/**
 * Get template by name
 */
export function getTemplateByName(name: string): EmailTemplate | null {
  return Object.values(emailTemplates).find(t => t.name === name) || null;
}
