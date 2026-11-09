// /lib/email.ts
// Task 3.3: Email Service with Tracking Integration

import { renderTemplate } from './handlebars-utils';
import { allowedRecipients } from './email-allowlist';
import {
  getTemplate,
  generateTrackingPixel,
  wrapLinkForTracking,
  EmailTemplate,
  EmailVariables,
} from './email-templates';

export type EmailProvider = 'resend' | 'sendgrid';

export interface EmailRequest {
  templateId: string;
  recipientEmail: string;
  recipientName: string;
  variables: EmailVariables;
  trackingId?: string; // Optional tracking ID for email opens/clicks
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  trackingId?: string;
}

/**
 * Process email template with variables and tracking
 */
async function processEmailTemplate(
  template: EmailTemplate,
  variables: EmailVariables,
  trackingId?: string
): Promise<{ subject: string; htmlBody: string; plainTextBody: string }> {
  // Generate tracking pixel if tracking is enabled
  let processedVariables = { ...variables };

  if (trackingId) {
    const trackingPixel = generateTrackingPixel(trackingId);
    processedVariables.trackingPixel = trackingPixel;
  }

  // Render subject with variables
  const subject = renderTemplate(template.subject, processedVariables);

  // Without a tracking ID there is no pixel to render: drop the placeholder <img>
  // so the recipient never sees a broken image or a literal {{trackingPixel}}.
  const htmlSource = trackingId
    ? template.htmlBody
    : template.htmlBody.replace(/<img[^>]*\{\{trackingPixel\}\}[^>]*>\s*/g, '');

  // Render HTML body
  let htmlBody = renderTemplate(htmlSource, processedVariables);

  // Render plain text body
  let plainTextBody = renderTemplate(template.plainTextBody, processedVariables);

  // Wrap external links in HTML for click tracking
  if (trackingId) {
    htmlBody = wrapExternalLinks(htmlBody, trackingId);
  }

  return {
    subject,
    htmlBody,
    plainTextBody,
  };
}

/**
 * Wrap external links in HTML for click tracking
 * Finds all <a href="..."> links and wraps them with tracking wrapper
 */
function wrapExternalLinks(html: string, trackingId: string): string {
  // Regular expression to find external links
  // This pattern matches href attributes that start with http:// or https://
  const linkRegex = /href=["']((https?:\/\/[^"']+))["']/g;

  return html.replace(linkRegex, (match, url) => {
    const wrappedUrl = wrapLinkForTracking(trackingId, url);
    return `href="${wrappedUrl}"`;
  });
}

/**
 * Send email via Resend
 * Requires RESEND_API_KEY environment variable
 */
async function sendViaResend(
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlBody: string,
  plainTextBody: string
): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable not configured');
  }

  // On staging, a recipient not on EMAIL_ALLOWLIST is logged and skipped.
  const [allowedTo] = allowedRecipients(recipientEmail);
  if (!allowedTo) return null;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NEXT_PUBLIC_EMAIL_FROM || 'noreply@visionvelocity.com.au',
        to: allowedTo,
        subject,
        html: htmlBody,
        text: plainTextBody,
        reply_to: process.env.NEXT_PUBLIC_EMAIL_REPLY_TO || 'support@visionvelocity.com.au',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API error: ${error.message}`);
    }

    const data = await response.json();
    return data.id; // Message ID from Resend
  } catch (error) {
    console.error('Resend send error:', error);
    throw error;
  }
}

/**
 * Send email via SendGrid
 * Requires SENDGRID_API_KEY environment variable
 */
async function sendViaSendGrid(
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlBody: string,
  plainTextBody: string
): Promise<string | null> {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable not configured');
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: recipientEmail, name: recipientName }],
            subject,
          },
        ],
        from: {
          email: process.env.NEXT_PUBLIC_EMAIL_FROM || 'noreply@visionvelocity.com.au',
          name: 'Vision Velocity',
        },
        content: [
          {
            type: 'text/plain',
            value: plainTextBody,
          },
          {
            type: 'text/html',
            value: htmlBody,
          },
        ],
        reply_to: {
          email: process.env.NEXT_PUBLIC_EMAIL_REPLY_TO || 'support@visionvelocity.com.au',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} ${errorText}`);
    }

    // SendGrid returns 202 Accepted with no body for successful sends
    // Extract message ID from X-Message-Id header if available
    const messageId = response.headers.get('X-Message-Id') || 'sendgrid-' + Date.now();
    return messageId;
  } catch (error) {
    console.error('SendGrid send error:', error);
    throw error;
  }
}

/**
 * Send email using configured provider
 */
export async function sendEmail(request: EmailRequest): Promise<EmailResponse> {
  try {
    // Get template
    const template = getTemplate(request.templateId);
    if (!template) {
      return {
        success: false,
        error: `Template not found: ${request.templateId}`,
      };
    }

    // Process template with variables and tracking
    const { subject, htmlBody, plainTextBody } = await processEmailTemplate(
      template,
      request.variables,
      request.trackingId
    );

    // Determine email provider
    const provider: EmailProvider = (process.env.EMAIL_PROVIDER || 'resend') as EmailProvider;

    let messageId: string | null = null;

    if (provider === 'resend') {
      messageId = await sendViaResend(
        request.recipientEmail,
        request.recipientName,
        subject,
        htmlBody,
        plainTextBody
      );
    } else if (provider === 'sendgrid') {
      messageId = await sendViaSendGrid(
        request.recipientEmail,
        request.recipientName,
        subject,
        htmlBody,
        plainTextBody
      );
    } else {
      throw new Error(`Unsupported email provider: ${provider}`);
    }

    // Log email send for audit trail (optional)
    await logEmailSent({
      templateId: request.templateId,
      recipientEmail: request.recipientEmail,
      recipientName: request.recipientName,
      messageId: messageId || undefined,
      trackingId: request.trackingId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      messageId: messageId || undefined,
      trackingId: request.trackingId,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Record an email send. The schema has no general-purpose email log table
 * (email_recipients requires a campaign_id), so sends are recorded as a
 * structured server log line when ENABLE_EMAIL_LOGGING=true. Never throws.
 */
async function logEmailSent(details: {
  templateId: string;
  recipientEmail: string;
  recipientName: string;
  messageId?: string;
  trackingId?: string;
  timestamp: string;
}): Promise<void> {
  if (process.env.ENABLE_EMAIL_LOGGING !== 'true') return;
  try {
    console.info('[email] sent', JSON.stringify(details));
  } catch (error) {
    console.warn('Email logging failed (non-fatal):', error);
  }
}

/**
 * Send email to multiple recipients (batch)
 */
export async function sendEmailBatch(
  requests: EmailRequest[]
): Promise<EmailResponse[]> {
  const results = await Promise.all(
    requests.map(request => sendEmail(request))
  );
  return results;
}

/**
 * Resend email by template ID to address
 * Useful for resending failed emails
 */
export async function resendEmail(
  templateId: string,
  recipientEmail: string,
  recipientName: string,
  variables: EmailVariables
): Promise<EmailResponse> {
  const trackingId = `resend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return sendEmail({
    templateId,
    recipientEmail,
    recipientName,
    variables,
    trackingId,
  });
}

/**
 * Test email sending without actually sending
 * Useful for development/testing
 */
export async function testEmailTemplate(
  templateId: string,
  variables: EmailVariables
): Promise<{ subject: string; htmlBody: string; plainTextBody: string; error?: string }> {
  try {
    const template = getTemplate(templateId);
    if (!template) {
      return {
        subject: '',
        htmlBody: '',
        plainTextBody: '',
        error: `Template not found: ${templateId}`,
      };
    }

    const result = await processEmailTemplate(template, variables, 'test-tracking-id');
    return result;
  } catch (error) {
    return {
      subject: '',
      htmlBody: '',
      plainTextBody: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
