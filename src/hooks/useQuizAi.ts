import { useState, useCallback } from 'react';
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { api } from '@/db/api';
import { buildAdaptivePayload } from '@/lib/payloadEngine';
import { toast } from 'sonner';
import type { Quiz, Question, QuestionOption, QuizAiInteraction } from '@/types';

interface UseQuizAiOptions {
  quiz: Quiz;
  question: Question;
  attemptId: string;
  answerMode: 'instant' | 'confirm' | 'end';
  selectedOption?: QuestionOption | null;
  correctOption?: QuestionOption | null;
  isCorrect?: boolean | null;
  explanation?: string;
}

export function useQuizAi(options: UseQuizAiOptions) {
  const { activeConfig, isLoaded } = useApiConfigs();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const loadInteraction = useCallback(async () => {
    if (initialized) return;
    const { data } = await api.getQuizAiInteraction(options.attemptId, options.question.id);
    if (data && data.messages.length > 0) {
      setMessages(data.messages);
    }
    setInitialized(true);
  }, [initialized, options.attemptId, options.question.id]);

  const persistMessages = useCallback(async (next: { role: 'user' | 'assistant'; content: string }[]) => {
    await api.saveQuizAiInteraction(options.attemptId, options.question.id, next);
  }, [options.attemptId, options.question.id]);

  const streamResponse = useCallback(async (fullText: string) => {
    setStreamingText('');
    const words = fullText.split(' ');
    let built = '';
    for (let i = 0; i < words.length; i++) {
      built += (i === 0 ? '' : ' ') + words[i];
      setStreamingText(built);
      await new Promise((r) => setTimeout(r, 12 + Math.random() * 12));
    }
    setStreamingText('');
    return fullText;
  }, []);

  const buildSystemPrompt = useCallback(() => {
    const { quiz, question, answerMode, selectedOption, correctOption, isCorrect, explanation } = options;
    let prompt = `You are Study AI, a warm, encouraging educational tutor for RSBS School. The student is taking a quiz.\n\n`;
    prompt += `Quiz: ${quiz.title}\n`;
    if (quiz.subject_name) prompt += `Subject: ${quiz.subject_name}\n`;
    if (quiz.chapter) prompt += `Chapter: ${quiz.chapter}\n`;
    if (quiz.topic) prompt += `Topic: ${quiz.topic}\n`;
    prompt += `Difficulty: ${question.difficulty || 'medium'}\n`;
    if (question.marks) prompt += `Marks: ${question.marks}\n`;
    prompt += `\nQuestion: ${question.question_text}\n`;
    if (selectedOption) prompt += `Student selected: ${selectedOption.option_text}\n`;
    if (answerMode !== 'end' && correctOption) prompt += `Correct answer: ${correctOption.option_text}\n`;
    if (answerMode !== 'end' && explanation) prompt += `Explanation: ${explanation}\n`;
    if (isCorrect === true) prompt += `Result: The student's answer is correct.\n`;
    if (isCorrect === false) prompt += `Result: The student's answer is incorrect.\n`;

    prompt += `\nInstructions: Explain why the answer is correct or gently correct the mistake. If the quiz mode hides the correct answer, do not reveal it. Keep the response clear, supportive, and educational. Use markdown for formatting. Reply in the same language as the student. The student may ask follow-up questions. Maintain the quiz context.\n`;
    return prompt;
  }, [options]);

  const sendMessage = useCallback(async (text: string) => {
    if (!activeConfig) {
      toast.error('Study AI is not configured. Contact your admin.');
      return;
    }
    if (!isLoaded) return;

    setIsLoading(true);
    const userMsg = { role: 'user' as const, content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    await persistMessages(nextMessages);

    try {
      const selectedBody = activeConfig.bodies.find((b: any) => b.is_default) || activeConfig.bodies[0];
      if (!selectedBody) throw new Error('No AI body configured');

      const systemPrompt = buildSystemPrompt();
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const finalBody = buildAdaptivePayload(selectedBody.content, history, text, [], systemPrompt);

      const subVars = (t: string) => {
        let r = t;
        (activeConfig.variables || []).forEach((v: any) => {
          if (v.key && v.value) r = r.replace(new RegExp(`{{${v.key}}}`, 'g'), v.value);
        });
        return r;
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      activeConfig.headers.forEach((h: any) => {
        if (h.key) headers[h.key] = subVars(h.value);
      });
      if (activeConfig.apiKey && activeConfig.auth_type !== 'none') {
        if (activeConfig.auth_type === 'bearer') headers['Authorization'] = `Bearer ${activeConfig.apiKey}`;
        else if (activeConfig.auth_type === 'api_key') headers['X-API-Key'] = activeConfig.apiKey;
      }

      const response = await fetch(subVars(activeConfig.endpoint), {
        method: activeConfig.method,
        headers,
        body: activeConfig.method !== 'GET' ? JSON.stringify(finalBody) : undefined,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error('Authentication failed. Check the API key.');
        if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment.');
        if (response.status >= 500) throw new Error('AI service temporarily unavailable.');
        throw new Error(`Error ${response.status}`);
      }

      const respData = await response.json();
      const getNested = (obj: any, path: string) =>
        path.split(/[.[\]]/).filter(Boolean).reduce((a: any, p: string) => a?.[p], obj);
      const parsed = getNested(respData, activeConfig.responseField);
      const fullText = typeof parsed === 'string' ? parsed : JSON.stringify(respData, null, 2);

      const streamed = await streamResponse(fullText);
      const assistantMsg = { role: 'assistant' as const, content: streamed };
      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);
      await persistMessages(finalMessages);
    } catch (err: any) {
      const msg = err?.message || 'Study AI encountered an error. Please try again.';
      toast.error(msg);
      const errorMsg = { role: 'assistant' as const, content: `⚠️ ${msg}` };
      const finalMessages = [...nextMessages, errorMsg];
      setMessages(finalMessages);
      await persistMessages(finalMessages);
    } finally {
      setIsLoading(false);
    }
  }, [activeConfig, isLoaded, messages, buildSystemPrompt, persistMessages, streamResponse]);

  return {
    messages,
    streamingText,
    isLoading,
    initialized,
    loadInteraction,
    sendMessage,
    setMessages,
  };
}
