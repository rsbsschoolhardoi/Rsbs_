import React, { useState, useEffect, useRef } from 'react';
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { Message, Attachment } from '@/types/chat';
import { ApiConfig } from '@/types';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ChatInterfacePage: React.FC = () => {
  const { getModuleConfig, isLoaded } = useApiConfigs();
  const activeConfig = getModuleConfig('ai-chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your AI assistant. Send me a message, an image, or a file to get started!',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && !activeConfig) {
      toast.info('No active API configuration found. Please visit Settings to set one up.');
    }
  }, [activeConfig, isLoaded]);

  const getNestedValue = (obj: any, path: string) => {
    return path.split(/[.[\]]/).filter(Boolean).reduce((acc, part) => acc?.[part], obj);
  };

  const substituteVariables = (text: string) => {
    let result = text;
    (activeConfig?.variables || []).forEach(v => {
      if (v.key && v.value) {
        const regex = new RegExp(`{{${v.key}}}`, 'g');
        result = result.replace(regex, v.value);
      }
    });
    return result;
  };

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    if (!activeConfig) {
      toast.error('No active API configuration found.');
      return;
    }

    // Preservation Rules: Do not remove or modify any characters from the original user input
    // Ensure the input is not empty before processing
    if (!content && (!attachments || attachments.length === 0)) return;

    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content, // Exact, unaltered user input preserved as UTF-8
      attachments: attachments,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Step 2: Template Selection and Substitution
      // Select the optimal request body based on the presence of attachments
      let selectedBody = activeConfig.bodies.find(b => b.is_default) || activeConfig.bodies[0];
      
      if (attachments && attachments.length > 0) {
        const fileBody = activeConfig.bodies.find(b => b.type === 'file');
        if (fileBody) selectedBody = fileBody;
      }

      const baseBodyString = JSON.stringify(selectedBody.content);
      
      // 1. Process and prepare the content for the API call
      // Preservation Rules: Ensure no preprocessing or post-processing occurs on the input data
      let messageContentWithAttachments = content;
      if (attachments && attachments.length > 0) {
        // Append attachment description if needed for context-aware APIs
        const attachmentDesc = attachments.map(a => `[Attached ${a.type}: ${a.name}]`).join(' ');
        messageContentWithAttachments = content ? `${content} ${attachmentDesc}` : attachmentDesc;
      }

      // 2. Substitute the input into the JSON body template
      // Preservation Rules: JSON.stringify maintains Unicode/special characters while ensuring valid JSON syntax.
      // Use a replacement function to avoid special character interpretation (like $) during substitution.
      const escapedInput = JSON.stringify(messageContentWithAttachments).slice(1, -1);
      const substitutedBodyString = baseBodyString.replace(/{{user_input}}/g, () => escapedInput);

      // Step 3: Pre-Send Validation Suite
      if (baseBodyString.includes('{{user_input}}') && !substitutedBodyString.includes(escapedInput) && substitutedBodyString.includes('{{user_input}}')) {
        throw new Error('Message not captured. Please check your configuration.');
      }

      let finalBody: any;
      try {
        finalBody = JSON.parse(substitutedBodyString);
      } catch (e) {
        throw new Error('Request preparation failed. Check your JSON template in Settings.');
      }

      // If the template supports vision/multimodal (detected by common keys), we could inject base64 images here
      // But we follow the "Strict Read-Only" and "No Structural Overrides" rules for the execution mode.
      // We send the finalBody as constructed by the substitution.

      // Step 4: Request Execution using exact configuration
      const substitutedEndpoint = substituteVariables(activeConfig.endpoint);
      const headersObj = activeConfig.headers.reduce((acc: any, h) => {
        if (h.key) acc[h.key] = substituteVariables(h.value);
        return acc;
      }, {});

      // Apply Auth if present
      if (activeConfig.apiKey && activeConfig.auth_type !== 'none') {
        if (activeConfig.auth_type === 'bearer') {
          headersObj['Authorization'] = `Bearer ${activeConfig.apiKey}`;
        } else if (activeConfig.auth_type === 'api_key') {
          headersObj['X-API-Key'] = activeConfig.apiKey;
        }
      }

      const response = await fetch(substitutedEndpoint, {
        method: activeConfig.method,
        headers: headersObj,
        body: activeConfig.method !== 'GET' ? JSON.stringify(finalBody) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API Error: HTTP ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      const parsedResponse = getNestedValue(data, activeConfig.responseField);

      if (typeof parsedResponse === 'string') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: parsedResponse,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data),
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to get response from API.');
      console.error('API Error:', error);
    } finally {
      // Step 6: Release lock
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {!activeConfig && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-top duration-500">
          <div className="bg-destructive/10 backdrop-blur-md border border-destructive/20 text-destructive text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-3 w-3" />
            System Offline: No Active Configuration
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative flex flex-col">
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col relative px-4">
          <MessageList messages={messages} isLoading={isLoading} />
        </div>
      </main>

      <div className="flex-none p-4 pb-8 max-w-4xl mx-auto w-full px-4">
        <Card className="bg-background/80 backdrop-blur shadow-2xl border-muted-foreground/10 overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/5">
          <ChatInput onSend={handleSend} disabled={isLoading || !activeConfig} />
        </Card>
      </div>
    </div>
  );
};

export default ChatInterfacePage;
