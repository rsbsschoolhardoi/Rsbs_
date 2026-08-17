import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Paperclip, Mic, MicOff, X, FileText, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Attachment } from '@/types/chat';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition if available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        toast.error(`Speech recognition failed: ${event.error}`);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message, attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFile(true);
    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const isDoc = file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isTxt = file.type === 'text/plain';

      if (!isImage && !isPdf && !isDoc && !isTxt) {
        toast.error(`File type ${file.type} not supported.`);
        continue;
      }

      // 5MB limit
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      try {
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          type: isImage ? 'image' : 'file',
          url,
          name: file.name,
          mimeType: file.type
        });
      } catch (error) {
        toast.error(`Failed to process ${file.name}`);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setIsProcessingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        toast.error('Voice input is not supported in this browser.');
        return;
      }
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  return (
    <div className="border-t bg-background p-4 sticky bottom-0 z-20">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        {/* Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden border bg-muted p-2 flex items-center gap-2 pr-8 shadow-sm animate-in zoom-in duration-200">
                {att.type === 'image' ? (
                  <img src={att.url} alt="Preview" className="h-10 w-10 object-cover rounded" />
                ) : (
                  <FileText className="h-6 w-6 text-primary" />
                )}
                <span className="text-xs truncate max-w-[150px] font-medium">{att.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="absolute right-1 top-1 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <input
              type="file"
              ref={cameraInputRef}
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileChange(e, true)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || isProcessingFile}
              title="Capture Image"
            >
              <Camera className="h-5 w-5" />
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => handleFileChange(e)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isProcessingFile}
              title="Attach Files"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 shrink-0 transition-all",
                isRecording ? "text-destructive bg-destructive/10 animate-pulse" : "text-muted-foreground hover:text-primary"
              )}
              onClick={toggleRecording}
              disabled={disabled || isProcessingFile}
              title={isRecording ? "Stop Recording" : "Voice Input"}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </div>

          <Textarea
            placeholder={isRecording ? "Listening..." : "Ask me anything..."}
            className="min-h-[40px] max-h-[150px] resize-none overflow-y-auto transition-all focus-visible:ring-primary/20"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isProcessingFile}
          />

          <Button 
            onClick={handleSend} 
            disabled={disabled || isProcessingFile || (!message.trim() && attachments.length === 0)} 
            size="icon" 
            className="h-10 w-10 shrink-0 shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            {isProcessingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
