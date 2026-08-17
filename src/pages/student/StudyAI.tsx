import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import type { AiChatSession, AiChatMessage, ApiConfig } from '@/types';
import { buildAdaptivePayload } from '@/lib/payloadEngine';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, ChevronDown, ArrowDown, Search, Sparkles } from 'lucide-react';
import { ChatHeader } from '@/components/study-ai/ChatHeader';
import { HistoryDrawer } from '@/components/study-ai/HistoryDrawer';
import { MessageBubble } from '@/components/study-ai/MessageBubble';
import { Composer } from '@/components/study-ai/Composer';
import { EmptyState } from '@/components/study-ai/EmptyState';
import { LimitGate } from '@/components/study-ai/LimitGate';
import { ModelSelector } from '@/components/study-ai/ModelSelector';

// ─── Typing indicator ────────────────────────────────────────────────────────
const TypingDots: React.FC = () => (
  <div className="flex items-center gap-1.5 py-1">
    <span className="text-xs text-muted-foreground">Study AI is typing</span>
    {[0, 1, 2].map(i => (
      <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-primary inline-block"
        animate={{ y: [0, -4, 0] }} transition={{ duration: 0.35, repeat: Infinity, delay: i * 0.08 }} />
    ))}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const StudyAI: React.FC = () => {
  const { profile } = useAuth();
  const { configs, getModuleConfig, isLoaded: apiLoaded } = useApiConfigs();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const navigate = useNavigate();
  const handleBack = () => navigate(-1);

  // Model selection
  const defaultConfig = getModuleConfig('study-ai');
  const [selectedModel, setSelectedModel] = useState<ApiConfig | null>(null);
  const activeConfig = selectedModel || defaultConfig;

  useEffect(() => {
    if (defaultConfig && !selectedModel) setSelectedModel(defaultConfig);
  }, [defaultConfig]);

  // Sessions
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<AiChatSession | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Messages
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Input
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Conversation search
  const [convSearch, setConvSearch] = useState('');
  const [showConvSearch, setShowConvSearch] = useState(false);
  const [convSearchIdx, setConvSearchIdx] = useState(0);

  // AI config / access
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const dailyLimit = useMemo(() => {
    return aiConfig?.studentConfig?.daily_limit || aiConfig?.classConfig?.daily_limit || aiConfig?.globalSettings?.global_daily_limit || 50;
  }, [aiConfig]);
  const usageText = useMemo(() => {
    if (!aiConfig?.usage) return undefined;
    return `${aiConfig.usage.message_count}/${dailyLimit} today`;
  }, [aiConfig, dailyLimit]);

  // ─── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (profile?.student_id && profile?.role === 'student') {
      fetchAiConfig();
      fetchSessions();
    } else {
      setIsDataLoaded(true);
      setSessionsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (activeSession) fetchMessages(activeSession.id);
    else setMessages([]);
  }, [activeSession]);

  useEffect(() => {
    if (!showScrollBtn) scrollToBottom('smooth');
  }, [messages]);

  useEffect(() => {
    setEditingMessageId(null);
  }, [activeSession]);

  // ─── Data fetch ───────────────────────────────────────────────────────────
  const fetchAiConfig = async () => {
    if (!profile?.student_id) return;
    const { data: student } = await api.getStudentById(profile.student_id);
    if (!student?.class_id) { setIsDataLoaded(true); return; }
    const config = await api.getAiConfigForStudent(profile.student_id, student.class_id);
    setAiConfig(config);
    setIsDataLoaded(true);
  };

  const fetchSessions = async () => {
    if (!profile?.student_id) return;
    setSessionsLoading(true);
    const { data, error } = await api.getAiChatSessions(profile.student_id);
    if (!error && data) {
      setSessions(data);
      if (!activeSession && data.length > 0) setActiveSession(data[0]);
    }
    setSessionsLoading(false);
  };

  const fetchMessages = async (sessionId: string) => {
    setMessagesLoading(true);
    const { data, error } = await api.getAiChatMessages(sessionId);
    if (!error) setMessages(data || []);
    setMessagesLoading(false);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // ─── Access check ─────────────────────────────────────────────────────────
  const checkAccess = () => {
    if (!aiConfig) return { allowed: true };
    const { globalSettings, studentConfig, classConfig, usage } = aiConfig;
    if (!globalSettings?.is_system_enabled)
      return { allowed: false, message: globalSettings?.system_unavailable_message, type: 'unavailable' as const };
    if (studentConfig?.is_enabled === false)
      return { allowed: false, message: globalSettings?.individual_disabled_message, type: 'disabled' as const };
    if (classConfig?.is_enabled === false)
      return { allowed: false, message: globalSettings?.class_disabled_message, type: 'disabled' as const };
    const limit = studentConfig?.daily_limit || classConfig?.daily_limit || globalSettings?.global_daily_limit || 50;
    if ((usage?.message_count || 0) >= limit)
      return { allowed: false, message: `${globalSettings?.limit_reached_message}\n\n${globalSettings?.reset_info_message}`, type: 'limit' as const };
    return { allowed: true };
  };

  const access = checkAccess();

  // ─── Session management ───────────────────────────────────────────────────
  const handleCreateSession = async () => {
    if (!profile?.student_id) return;
    const { data, error } = await api.createAiChatSession(profile.student_id, 'New Chat');
    if (error || !data) { toast.error('Failed to create chat'); return; }
    setSessions(prev => [data, ...prev]);
    setActiveSession(data);
    setMessages([]);
    setInputValue('');
    setEditingMessageId(null);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    const { error } = await api.deleteAiChatSession(id);
    if (error) { toast.error('Failed to delete chat'); return; }
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) { setActiveSession(null); setMessages([]); }
  };

  const handleRenameSession = async (id: string, title: string) => {
    const { error } = await api.updateAiChatSession(id, { title });
    if (error) { toast.error('Failed to rename'); return; }
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
    if (activeSession?.id === id) setActiveSession(prev => prev ? { ...prev, title } : prev);
  };

  const handlePinSession = async (session: AiChatSession) => {
    const newPin = !session.is_pinned;
    const { error } = await api.updateAiChatSession(session.id, { is_pinned: newPin } as any);
    if (error) { toast.error('Failed to update pin'); return; }
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, is_pinned: newPin } : s));
  };

  // ─── Build system prompt ──────────────────────────────────────────────────
  const buildSystemPrompt = async (currentAiConfig: any): Promise<string> => {
    let studentData: any = {};
    let contextualInfo = '';
    if (profile?.student_id) {
      const { data: student } = await api.getStudentById(profile.student_id);
      if (student) {
        studentData = { name: student.name, class: student.class, section: student.section };
        const perms = currentAiConfig?.globalSettings;
        if (perms?.access_grades_enabled) studentData.rank_in_class = student.rank;
        if (perms?.access_attendance_enabled) { const { data: att } = await api.getAttendance(profile.student_id); studentData.attendance = att; }
        if (perms?.access_exams_enabled) { const { data: exams } = await api.getExams(); studentData.upcoming_exams = exams; }
        contextualInfo = `\nSTUDENT CONTEXT:\n${JSON.stringify(studentData, null, 2)}\nPERMISSIONS: Grades=${perms?.access_grades_enabled ? 'YES' : 'NO'} Attendance=${perms?.access_attendance_enabled ? 'YES' : 'NO'} Exams=${perms?.access_exams_enabled ? 'YES' : 'NO'} Fees=${perms?.access_fees_enabled ? 'YES' : 'NO'}`;
      }
    }
    return `You are Study AI, an intelligent and friendly educational assistant developed by Inolas Technologies for RSBS School. Personality: warm, encouraging, patient. Auto-detect Hindi/English/Hinglish and reply in the same language. Use markdown for structure. Subjects: Math, Science, English, Hindi, Social Science, CS, Coding, NCERT, UPMSP.${contextualInfo}`;
  };

  // ─── Core AI request ──────────────────────────────────────────────────────
  const sendAiRequest = async (session: AiChatSession, contextMessages: AiChatMessage[]) => {
    setIsLoading(true);
    scrollToBottom();

    try {
      // Refresh config
      let currentAiConfig = aiConfig;
      if (profile?.student_id) {
        const { data: sr } = await api.getStudentById(profile.student_id);
        if (sr?.class_id) {
          currentAiConfig = await api.getAiConfigForStudent(profile.student_id, sr.class_id);
          setAiConfig(currentAiConfig);
        }
      }

      const systemPrompt = await buildSystemPrompt(currentAiConfig);
      const selectedBody = activeConfig?.bodies?.find((b: any) => b.is_default) || activeConfig?.bodies?.[0];
      const lastMsg = contextMessages[contextMessages.length - 1];
      const history = contextMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
      const finalBody = buildAdaptivePayload(selectedBody?.content || {}, history, lastMsg?.content || '', [], systemPrompt);

      const subVars = (t: string) => {
        let r = t;
        (activeConfig?.variables || []).forEach((v: any) => { if (v.key && v.value) r = r.replace(new RegExp(`{{${v.key}}}`, 'g'), v.value); });
        return r;
      };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      activeConfig?.headers?.forEach((h: any) => { if (h.key) headers[h.key] = subVars(h.value); });
      if (activeConfig?.apiKey && activeConfig?.auth_type !== 'none') {
        if (activeConfig.auth_type === 'bearer') headers['Authorization'] = `Bearer ${activeConfig.apiKey}`;
        else if (activeConfig.auth_type === 'api_key') headers['X-API-Key'] = activeConfig.apiKey;
      }

      let response: Response;
      try {
        response = await fetch(subVars(activeConfig?.endpoint || ''), {
          method: activeConfig?.method || 'POST',
          headers,
          body: activeConfig?.method !== 'GET' ? JSON.stringify(finalBody) : undefined
        });
      } catch { throw new Error('Network error — check your connection.'); }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error('Authentication failed. Check the API key.');
        if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment.');
        if (response.status >= 500) throw new Error('AI service temporarily unavailable.');
        throw new Error(`Error ${response.status}`);
      }

      const respData = await response.json();
      const getNested = (obj: any, path: string) => path.split(/[.[\]]/).filter(Boolean).reduce((a: any, p: string) => a?.[p], obj);
      const parsed = getNested(respData, activeConfig?.responseField || '');
      const fullText = typeof parsed === 'string' ? parsed : JSON.stringify(respData, null, 2);

      // Save AI message and render it immediately. The response is delivered by the
      // model as fast as the network allows; the MessageBubble entrance animation provides
      // the subtle streaming feel.
      const { data: savedAI } = await api.addAiChatMessage({
        session_id: session.id, role: 'assistant', content: fullText, attachments: []
      });
      if (savedAI) {
        setMessages([...contextMessages, savedAI]);
      }

      // Increment usage only after a successful AI response
      if (profile?.student_id) {
        await api.incrementAiUsage(profile.student_id);
        await fetchAiConfig();
      }

      // Auto-rename session
      if (session.title === 'New Chat' && lastMsg?.content && lastMsg.content.length > 3) {
        const newTitle = lastMsg.content.slice(0, 45) + (lastMsg.content.length > 45 ? '…' : '');
        await api.updateAiChatSession(session.id, { title: newTitle });
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, title: newTitle } : s));
        if (activeSession?.id === session.id) setActiveSession(prev => prev ? { ...prev, title: newTitle } : prev);
      }
    } catch (err: any) {
      const msg = err?.message || 'Study AI encountered an error. Please try again.';
      toast.error(msg, { duration: 5000 });
      const { data: saved } = await api.addAiChatMessage({ session_id: session.id, role: 'assistant', content: `⚠️ ${msg}`, attachments: [] });
      if (saved) setMessages(prev => [...prev, saved]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── New message send ─────────────────────────────────────────────────────
  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text) return;
    if (!access.allowed) { toast.error(access.message || 'Access denied'); return; }
    if (!activeConfig) { toast.error('Study AI is not configured. Contact your admin.'); return; }

    // Auto-create session
    let session = activeSession;
    if (!session) {
      if (!profile?.student_id) return;
      const { data, error } = await api.createAiChatSession(profile.student_id, text.slice(0, 40) || 'New Chat');
      if (error || !data) { toast.error('Failed to start session'); return; }
      session = data;
      setActiveSession(data);
      setSessions(prev => [data, ...prev]);
    }

    const { data: savedUser, error: userErr } = await api.addAiChatMessage({
      session_id: session.id, role: 'user', content: text, attachments: []
    });
    if (userErr || !savedUser) { toast.error('Failed to save message'); return; }

    setInputValue('');
    setEditingMessageId(null);
    const updatedMessages = [...messages, savedUser];
    setMessages(updatedMessages);
    await sendAiRequest(session, updatedMessages);
  };

  // ─── Edit latest user message ───────────────────────────────────────────────
  const handleEdit = async () => {
    if (!editingMessageId) return;
    const text = inputValue.trim();
    if (!text) return;
    if (!access.allowed) { toast.error(access.message || 'Access denied'); return; }
    if (!activeConfig) { toast.error('Study AI is not configured. Contact your admin.'); return; }
    if (!activeSession) return;

    const editIndex = messages.findIndex(m => m.id === editingMessageId);
    if (editIndex === -1) return;
    const msg = messages[editIndex];
    if (msg.role !== 'user') { toast.error('Only user messages can be edited'); return; }

    const { data: updated, error } = await api.updateAiChatMessage(editingMessageId, { content: text });
    if (error || !updated) { toast.error('Failed to update message'); return; }

    const toDelete = messages.slice(editIndex + 1);
    const updatedMessages = [...messages.slice(0, editIndex), { ...updated, content: text }];
    await Promise.all(toDelete.map(m => api.deleteAiChatMessage(m.id)));
    setMessages(updatedMessages);
    setInputValue('');
    setEditingMessageId(null);
    await sendAiRequest(activeSession, updatedMessages);
  };

  const handleComposerSend = () => {
    if (editingMessageId) handleEdit();
    else handleSend();
  };

  // ─── Regenerate latest AI response ────────────────────────────────────────
  const handleRegenerate = async () => {
    if (!activeSession) return;
    const lastAssistantIdx = messages.map(m => m.role).lastIndexOf('assistant');
    if (lastAssistantIdx === -1) return;
    const lastAssistant = messages[lastAssistantIdx];
    const updatedMessages = messages.filter(m => m.id !== lastAssistant.id);
    await api.deleteAiChatMessage(lastAssistant.id);
    setMessages(updatedMessages);
    await sendAiRequest(activeSession, updatedMessages);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied');
  };

  // ─── Derived ─────────────────────────────────────────────────────────────
  const latestUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') return messages[i].id;
    return null;
  }, [messages]);
  const latestAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant') return messages[i].id;
    return null;
  }, [messages]);

  const handleMessageAction = (type: 'copy' | 'edit' | 'regenerate', msg: AiChatMessage) => {
    if (type === 'copy') handleCopy(msg.content);
    if (type === 'edit') { setEditingMessageId(msg.id); setInputValue(msg.content); }
    if (type === 'regenerate') handleRegenerate();
  };

  const searchMatches = convSearch
    ? messages.reduce<number[]>((acc, m, i) => {
        if (m.content.toLowerCase().includes(convSearch.toLowerCase())) acc.push(i);
        return acc;
      }, [])
    : [];

  // ─── Guards ───────────────────────────────────────────────────────────────
  if (!apiLoaded || !isDataLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Sparkles className="w-6 h-6 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <HistoryDrawer
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        sessions={sessions}
        activeSession={activeSession}
        onSelect={setActiveSession}
        onNewChat={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onPinSession={handlePinSession}
        search={sidebarSearch}
        onSearch={setSidebarSearch}
        loading={sessionsLoading}
        isDark={isDark}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <ChatHeader
          title="Study AI"
          subtitle={activeSession && activeSession.title !== 'New Chat' ? activeSession.title : undefined}
          usageText={usageText}
          onOpenHistory={() => setSidebarOpen(true)}
          onNewChat={handleCreateSession}
          onToggleSearch={() => setShowConvSearch(v => !v)}
          onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
          onBack={handleBack}
          isDark={isDark}
        />

        <AnimatePresence>
          {showConvSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex-none overflow-hidden px-3 md:px-4 pb-2"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-muted/50">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  value={convSearch}
                  onChange={e => { setConvSearch(e.target.value); setConvSearchIdx(0); }}
                  placeholder="Search messages…"
                  className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
                />
                {searchMatches.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground">
                    <span>{convSearchIdx + 1}/{searchMatches.length}</span>
                    <button onClick={() => setConvSearchIdx(i => Math.max(0, i - 1))} className="hover:text-primary"><ChevronDown className="w-3 h-3 rotate-180" /></button>
                    <button onClick={() => setConvSearchIdx(i => Math.min(searchMatches.length - 1, i + 1))} className="hover:text-primary"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                )}
                <button onClick={() => { setShowConvSearch(false); setConvSearch(''); }} className="hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {!access.allowed ? (
            <LimitGate access={access} />
          ) : !activeSession ? (
            <EmptyState onSuggestion={text => setInputValue(text)} isDark={isDark} />
          ) : messagesLoading ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl mx-auto space-y-4">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={cn('flex', i % 2 ? 'justify-end' : 'justify-start')}>
                    <div className={cn('rounded-2xl h-16 animate-pulse bg-muted', i % 2 ? 'w-48' : 'w-64')} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              ref={scrollAreaRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-4 py-3"
              style={{ scrollBehavior: 'smooth', overscrollBehavior: 'contain' }}
              onScroll={e => {
                const el = e.currentTarget;
                setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
              }}
            >
              <div className="space-y-3 max-w-2xl mx-auto pb-4">
                {messages.map((msg, idx) => {
                  const isHighlighted = !!convSearch && searchMatches[convSearchIdx] === idx;

                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      displayContent={msg.content}
                      isStreaming={false}
                      isHighlighted={isHighlighted}
                      isDark={isDark}
                      canEdit={msg.role === 'user' && msg.id === latestUserMessageId && access.allowed}
                      canRegenerate={msg.role === 'assistant' && msg.id === latestAssistantMessageId}
                      onCopy={() => handleCopy(msg.content)}
                      onEdit={() => handleMessageAction('edit', msg)}
                      onRegenerate={() => handleMessageAction('regenerate', msg)}
                    />
                  );
                })}

                <AnimatePresence>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2"
                    >
                      <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div className={cn('px-3.5 py-2.5 rounded-2xl rounded-bl-md border border-border/40 bg-muted', isDark && 'bg-zinc-800/80 border-white/5')}>
                        <TypingDots />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>


                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted z-10"
                onClick={() => { scrollToBottom(); setShowScrollBtn(false); }}
              >
                <ArrowDown className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <Composer
          value={inputValue}
          onChange={setInputValue}
          onSend={handleComposerSend}
          disabled={isLoading || !activeConfig || !access.allowed}
          isLoading={isLoading}
          placeholder={access.allowed ? 'Ask Study AI anything…' : 'Daily limit reached — come back tomorrow'}
          usageText={usageText}
          isEditing={!!editingMessageId}
          modelSelector={
            <ModelSelector configs={configs} selected={selectedModel} onSelect={setSelectedModel} />
          }
        />
      </div>
    </div>
  );
};

export default StudyAI;
