export type MessageRole = 'user' | 'assistant' | 'system';

export interface Attachment {
  type: 'image' | 'file' | 'voice';
  url: string;
  name?: string;
  mimeType?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  metadata?: {
    image?: string;
    audio?: string;
  };
}

export interface ApiHeader {
  key: string;
  value: string;
}

export interface ApiVariable {
  id: string;
  key: string;
  value: string;
}

export interface ApiBody {
  id: string;
  name: string;
  content: Record<string, any>;
  type: 'text' | 'file';
  is_default: boolean;
}

export interface ApiConfig {
  id: string;
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: ApiHeader[];
  variables: ApiVariable[];
  bodies: ApiBody[];
  responseField: string;
  auth_type: 'bearer' | 'api_key' | 'none';
  apiKey?: string;
  created_at: string;
  last_applied: string;
  is_active: boolean;
}

export const DEFAULT_CONFIG: ApiConfig = {
  id: 'default',
  name: 'Default OpenAI Config',
  endpoint: '',
  method: 'POST',
  headers: [
    { key: 'Content-Type', value: 'application/json' },
  ],
  variables: [],
  bodies: [
    {
      id: 'default-body',
      name: 'JSON Payload',
      content: { model: 'gpt-3.5-turbo' },
      type: 'text',
      is_default: true
    }
  ],
  responseField: 'choices[0].message.content',
  auth_type: 'none',
  created_at: new Date().toISOString(),
  last_applied: '',
  is_active: false,
};
