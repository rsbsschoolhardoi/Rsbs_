/**
 * Adaptive Multimodal Payload Engine
 *
 * Builds the correct API request body for any LLM:
 *   - Text-only models (Groq llama-3.1, GPT-4o-mini, etc.)
 *   - Vision models (meta/llama-3.2-90b-vision-instruct, GPT-4o, Gemini, etc.)
 *
 * Handles:
 *   - {{messages}} / {{user_input}} placeholder substitution in body templates
 *   - Image attachments → OpenAI-compatible content array with image_url parts
 *   - PDF/document attachments → text extraction fallback (URL + description)
 *   - Empty image_url parts stripped for text-only payloads
 */

export interface Attachment {
  url: string;
  type: 'image' | 'pdf' | 'document';
  name: string;
  mimeType: string;
}

export interface MessageContext {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

// ─── Deep variable substitution ──────────────────────────────────────────────

function deepSubstitute(node: any, replacements: Record<string, any>): any {
  if (typeof node === 'string') {
    let result = node;
    for (const [key, val] of Object.entries(replacements)) {
      const placeholder = `{{${key}}}`;
      if (result === placeholder) {
        // Exact match — replace with typed value (e.g. array / object)
        return val;
      }
      // Partial string substitution
      if (typeof val === 'string' || typeof val === 'number') {
        result = result.split(placeholder).join(String(val));
      }
    }
    return result;
  }
  if (Array.isArray(node)) return node.map(item => deepSubstitute(item, replacements));
  if (node && typeof node === 'object') {
    const out: any = {};
    for (const k of Object.keys(node)) out[k] = deepSubstitute(node[k], replacements);
    return out;
  }
  return node;
}

// ─── Vision content builder ───────────────────────────────────────────────────

/**
 * Builds an OpenAI-compatible content array for a user message with attachments.
 * Images → { type: "image_url", image_url: { url } }
 * PDFs/docs → described in text block (no binary embedding)
 */
function buildVisionContent(
  text: string,
  attachments: Attachment[]
): string | Array<any> {
  if (!attachments || attachments.length === 0) return text;

  const parts: any[] = [];

  // Text part first
  if (text.trim()) {
    parts.push({ type: 'text', text });
  }

  for (const att of attachments) {
    if (att.type === 'image') {
      parts.push({
        type: 'image_url',
        image_url: { url: att.url, detail: 'auto' },
      });
    } else {
      // PDF / document → describe it in text so model knows context
      parts.push({
        type: 'text',
        text: `[Attached ${att.type.toUpperCase()}: "${att.name}" — URL: ${att.url}]\nPlease analyze this document as requested.`,
      });
    }
  }

  // If no text was added and only one part exists, keep as simple string
  if (parts.length === 1 && parts[0].type === 'text') return parts[0].text;
  return parts;
}

// ─── Sanitize messages (strip empty image_url parts) ─────────────────────────

function sanitizeMessage(msg: any): any {
  if (!msg || typeof msg !== 'object') return msg;
  if (!Array.isArray(msg.content)) return msg;

  const filtered = msg.content.filter((part: any) => {
    if (part?.type === 'image_url') {
      const url = part?.image_url?.url;
      return url && url.trim() !== '';
    }
    return true;
  });

  // Collapse single text part back to string
  if (filtered.length === 1 && filtered[0]?.type === 'text') {
    return { ...msg, content: filtered[0].text };
  }
  return { ...msg, content: filtered };
}

export function sanitizeMessages(messages: any[]): any[] {
  return messages.map(sanitizeMessage);
}

// ─── Main payload builder ─────────────────────────────────────────────────────

/**
 * Builds the final request body for any LLM API call.
 *
 * @param bodyTemplate  The `content` object from the selected ApiBody (admin-configured)
 * @param history       Previous messages in this session (role + content)
 * @param userText      The student's current text input
 * @param attachments   Files attached to this message (images, PDFs, docs)
 * @param systemPrompt  Injected system context (student data, permissions)
 */
export function buildAdaptivePayload(
  bodyTemplate: Record<string, any>,
  history: MessageContext[],
  userText: string,
  attachments: Attachment[],
  systemPrompt: string
): Record<string, any> {
  const hasAttachments = attachments.length > 0;

  // Build user message content — vision array when files present, plain string otherwise
  const userContent = hasAttachments
    ? buildVisionContent(userText, attachments)
    : userText;

  const systemMessage = { role: 'system', content: systemPrompt };

  // Build history messages (older messages never have pending new attachments)
  const historyMessages = history.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const currentUserMessage = { role: 'user', content: userContent };
  const allMessages = [systemMessage, ...historyMessages, currentUserMessage];

  // Check whether the template has {{messages}} or {{user_input}} placeholders
  const templateStr = JSON.stringify(bodyTemplate);
  const hasMessagesPlaceholder = templateStr.includes('{{messages}}');
  const hasUserInputPlaceholder = templateStr.includes('{{user_input}}');

  let payload: Record<string, any>;

  if (hasMessagesPlaceholder || hasUserInputPlaceholder) {
    // Template-driven substitution
    payload = deepSubstitute(bodyTemplate, {
      messages: allMessages,
      user_input: userText,
    });
  } else {
    // No placeholders — forcefully inject messages field
    payload = { ...bodyTemplate, messages: allMessages };
  }

  // Final sanitize pass — removes any empty image_url parts
  if (payload.messages && Array.isArray(payload.messages)) {
    payload.messages = sanitizeMessages(payload.messages);
  }

  return payload;
}
