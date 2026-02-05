import { gmail_v1 } from 'googleapis';

/**
 * Extracts the body text from an email payload.
 * Prefers plain text, falls back to HTML (with tags stripped).
 * Recursively searches nested parts for content.
 */
export function extractEmailBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  // Direct body data
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }

  // Multi-part message
  if (payload.parts) {
    // Prefer plain text
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf8');
    }

    // Fall back to HTML (strip tags)
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf8');
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Recursively check nested parts
    for (const part of payload.parts) {
      const body = extractEmailBody(part);
      if (body) return body;
    }
  }

  return '';
}

/**
 * Extracts common headers from an email.
 */
export function extractEmailHeaders(headers: gmail_v1.Schema$MessagePartHeader[] | undefined) {
  const headerList = headers || [];
  return {
    subject: headerList.find(h => h.name === 'Subject')?.value,
    from: headerList.find(h => h.name === 'From')?.value,
    to: headerList.find(h => h.name === 'To')?.value,
    cc: headerList.find(h => h.name === 'Cc')?.value,
    date: headerList.find(h => h.name === 'Date')?.value,
  };
}

/**
 * Modifies labels on one or more emails.
 * Automatically uses batch modify for multiple emails.
 */
export async function modifyEmailLabels(
  gmail: gmail_v1.Gmail,
  emailIds: string[],
  options: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
  }
): Promise<void> {
  if (emailIds.length === 1) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: emailIds[0],
      requestBody: {
        addLabelIds: options.addLabelIds,
        removeLabelIds: options.removeLabelIds,
      },
    });
  } else {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: emailIds,
        addLabelIds: options.addLabelIds,
        removeLabelIds: options.removeLabelIds,
      },
    });
  }
}
