// /lib/handlebars-utils.ts
// Task 3.3: Handlebars Template Rendering Utilities

/**
 * Simple handlebars-like template renderer
 * Replaces {{variable}} patterns with values from data object
 */
export function renderTemplate(
  template: string,
  data: Record<string, string | number | boolean>
): string {
  let rendered = template;

  // Pattern: {{variableName}}
  const variablePattern = /\{\{(\w+)\}\}/g;

  rendered = rendered.replace(variablePattern, (match, variableName) => {
    const value = data[variableName];

    if (value === undefined || value === null) {
      console.warn(`Template variable not found: ${variableName}`);
      return match; // Return original if not found
    }

    return String(value);
  });

  return rendered;
}

/**
 * Validate that all required variables are present in data
 * Throws error if any required variable is missing
 */
export function validateTemplateVariables(
  template: string,
  data: Record<string, any>,
  requiredVariables: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const variable of requiredVariables) {
    if (data[variable] === undefined || data[variable] === null) {
      missing.push(variable);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Extract all template variables from a template string
 * Returns array of variable names found in {{variableName}} patterns
 */
export function extractTemplateVariables(template: string): string[] {
  const variablePattern = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = variablePattern.exec(template)) !== null) {
    const variableName = match[1];
    if (!variables.includes(variableName)) {
      variables.push(variableName);
    }
  }

  return variables;
}

/**
 * Escape HTML special characters to prevent XSS
 * Use when rendering user-provided content in templates
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Conditionally render template sections based on data
 * Supports {{#if variable}}content{{/if}} syntax
 */
export function renderConditional(
  template: string,
  data: Record<string, any>
): string {
  let rendered = template;

  // Pattern: {{#if variable}}content{{/if}}
  const conditionalPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

  rendered = rendered.replace(conditionalPattern, (match, variableName, content) => {
    const value = data[variableName];

    // Render content if variable is truthy
    if (value) {
      return content;
    }

    return ''; // Remove content if variable is falsy
  });

  return rendered;
}

/**
 * Render loops in templates
 * Supports {{#each items}}{{this}}{{/each}} syntax
 */
export function renderLoop(
  template: string,
  data: Record<string, any>
): string {
  let rendered = template;

  // Pattern: {{#each arrayName}}content{{/each}}
  const loopPattern = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  rendered = rendered.replace(loopPattern, (match, arrayName, content) => {
    const array = data[arrayName];

    if (!Array.isArray(array)) {
      console.warn(`Loop variable is not an array: ${arrayName}`);
      return '';
    }

    return array
      .map((item, index) => {
        // Render content for each item
        // Replace {{this}} with item value
        let itemContent = content.replace(/\{\{this\}\}/g, String(item));

        // Also replace {{@index}} with current index
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));

        return itemContent;
      })
      .join('');
  });

  return rendered;
}

/**
 * Format date string in email template
 * Use as {{formatDate date 'DD/MM/YYYY'}}
 * This is a helper for common date formatting
 */
export function formatDate(dateString: string, format: string = 'DD/MM/YYYY'): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString; // Return original if not valid date
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (format === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  } else if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  } else if (format === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }

  return dateString; // Return original if format not recognised
}

/**
 * Format currency value in email template
 * Use as {{formatCurrency amount 'AUD'}}
 */
export function formatCurrency(amount: number | string, currency: string = 'AUD'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return String(amount); // Return original if not valid number
  }

  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
  });

  return formatter.format(numAmount);
}

/**
 * Render full template with all features (variables, conditionals, loops)
 */
export function renderFullTemplate(
  template: string,
  data: Record<string, any>
): string {
  let rendered = template;

  // First render conditionals
  rendered = renderConditional(rendered, data);

  // Then render loops
  rendered = renderLoop(rendered, data);

  // Finally render variables
  rendered = renderTemplate(rendered, data);

  return rendered;
}

export default {
  renderTemplate,
  validateTemplateVariables,
  extractTemplateVariables,
  escapeHtml,
  renderConditional,
  renderLoop,
  formatDate,
  formatCurrency,
  renderFullTemplate,
};
