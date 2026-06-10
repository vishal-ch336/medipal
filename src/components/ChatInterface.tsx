import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, AlertTriangle, Info, Stethoscope, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CitationSource {
  id: string;
  title: string;
}

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'emergency';
  sources?: CitationSource[];
}

interface SourcesPayload {
  type: 'sources';
  data: CitationSource[];
}

interface ChatHistoryRecord {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  onScheduleAppointment?: () => void;
  onFindSpecialist?: (specialty: string) => void;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  type: 'bot',
  content:
    "Hello! I'm your AI health assistant. I'm here to help you understand your symptoms and guide you to appropriate care. Please describe what symptoms you're experiencing today.",
  timestamp: new Date(),
};

const KNOWN_SPECIALTIES = [
  'General Physician',
  'ENT Specialist',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Orthopedic Surgeon',
  'Neurologist',
  'ENT',
];

const detectSpecialty = (content: string): string | null => {
  const lower = content.toLowerCase();
  for (const specialty of KNOWN_SPECIALTIES) {
    if (lower.includes(specialty.toLowerCase())) {
      return specialty;
    }
  }
  return null;
};

const parseAssistantContent = (raw: string): { mode: 'question' | 'solution'; text: string } => {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith('question:')) {
    return { mode: 'question', text: trimmed.replace(/^[Qq]uestion:\s*/, '') };
  }
  if (trimmed.toLowerCase().startsWith('solution:')) {
    return { mode: 'solution', text: trimmed.replace(/^[Ss]olution:\s*/, '') };
  }
  return { mode: 'question', text: trimmed };
};

const mapHistoryToMessages = (records: ChatHistoryRecord[]): Message[] =>
  records.map((record) => ({
    id: record.id,
    type: record.sender === 'user' ? 'user' : 'bot',
    content:
      record.sender === 'ai'
        ? parseAssistantContent(record.content).text
        : record.content,
    timestamp: new Date(record.created_at),
    severity: record.sender === 'ai' ? 'low' : undefined,
  }));

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onScheduleAppointment,
  onFindSpecialist,
}) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamingBotIdRef = useRef<string | null>(null);
  const scrollAfterHistoryRef = useRef(false);
  const inputRef = useRef<string>('');

  // Fetch persistent chat history on mount
  useEffect(() => {
    if (!token) {
      setIsLoadingHistory(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const { data } = await axios.get<ChatHistoryRecord[]>('/api/chat/history', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.length > 0) {
          setMessages(mapHistoryToMessages(data));
          scrollAfterHistoryRef.current = true;
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [token]);

  // Authenticated WebSocket connection
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:8000/chat/ws?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const chunk = event.data as string;

      if (chunk === '[DONE]') {
        const botId = streamingBotIdRef.current;
        if (botId) {
          setMessages((prev) =>
            prev.map((message) => {
              if (message.id !== botId) return message;
              const parsed = parseAssistantContent(message.content);
              return { ...message, content: parsed.text };
            }),
          );
        }
        streamingBotIdRef.current = null;
        setIsTyping(false);
        return;
      }

      try {
        const payload = JSON.parse(chunk) as SourcesPayload;
        if (payload.type === 'sources' && Array.isArray(payload.data)) {
          const botId = streamingBotIdRef.current;
          if (!botId) return;

          setMessages((prev) =>
            prev.map((message) =>
              message.id === botId
                ? { ...message, sources: payload.data }
                : message,
            ),
          );
          return;
        }
      } catch {
        /* not a JSON control payload — treat as streamed text */
      }

      const botId = streamingBotIdRef.current;
      if (!botId) return;

      setIsTyping(false);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === botId
            ? { ...message, content: message.content + chunk }
            : message,
        ),
      );
    };

    ws.onerror = () => {
      console.error('WebSocket connection error');
    };

    ws.onclose = (event) => {
      if (event.code === 1008) {
        console.error('WebSocket closed: invalid or expired token');
      }
      wsRef.current = null;
      streamingBotIdRef.current = null;
      setIsTyping(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token]);

  // Auto-scroll on new messages and after history is painted
  useEffect(() => {
    const behavior = scrollAfterHistoryRef.current ? 'smooth' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    scrollAfterHistoryRef.current = false;
  }, [messages, isTyping]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isCompleted || isTyping) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content:
          "I'm having trouble connecting to the chat service. Please refresh the page and try again.",
        timestamp: new Date(),
        severity: 'medium',
      };
      setMessages((prev) => [...prev, errorResponse]);
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    const botId = `bot-${Date.now()}`;
    streamingBotIdRef.current = botId;

    const botPlaceholder: Message = {
      id: botId,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      severity: 'low',
    };

    setMessages((prev) => [...prev, userMessage, botPlaceholder]);
    setInputValue('');
    inputRef.current = '';
    setIsTyping(true);

    ws.send(userMessage.content);
  }, [inputValue, isCompleted, isTyping]);

  const resetChat = () => {
    streamingBotIdRef.current = null;
    setMessages([WELCOME_MESSAGE]);
    setIsCompleted(false);
    setInputValue('');
    inputRef.current = '';
    setIsTyping(false);
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'emergency':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'accent';
      default:
        return 'primary';
    }
  };

  return (
    <Card className="h-[600px] flex flex-col bg-gradient-card shadow-medical">
      <div className="p-4 border-b bg-gradient-primary text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-white/20 text-white">
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">HealthAI Assistant</h3>
            <p className="text-xs opacity-90">
              {isLoadingHistory ? 'Loading conversation…' : 'Medical Information'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'bot' && (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}

            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
              <div
                className={`p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-primary text-white ml-auto'
                    : 'bg-white border shadow-card'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {message.content ||
                    (isTyping &&
                    message.type === 'bot' &&
                    message.id === messages[messages.length - 1]?.id
                      ? '…'
                      : '')}
                </p>
                {message.severity && message.content && (
                  <div className="mt-2 flex items-center gap-2">
                    <Info className="h-3 w-3" />
                    <Badge variant={getSeverityColor(message.severity)} className="text-xs">
                      {message.severity === 'emergency'
                        ? 'Seek immediate care'
                        : message.severity === 'high'
                          ? 'Consult doctor soon'
                          : message.severity === 'medium'
                            ? 'Monitor symptoms'
                            : 'Self-care possible'}
                    </Badge>
                  </div>
                )}
                {message.type === 'bot' && message.content && detectSpecialty(message.content) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => onFindSpecialist?.(detectSpecialty(message.content)!)}
                  >
                    <Stethoscope className="h-4 w-4" />
                    Find a {detectSpecialty(message.content)} Near Me
                  </Button>
                )}
              </div>
              {message.type === 'bot' && message.sources && message.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.sources.map((source) => (
                    <Badge
                      key={source.id}
                      variant="outline"
                      title={`Source ID: ${source.id}`}
                      className="cursor-pointer gap-1 border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                      onClick={() =>
                        console.info('Citation selected:', source.id, source.title)
                      }
                    >
                      <BookOpen className="h-3 w-3 shrink-0" />
                      {source.title}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.type === 'user' && (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-secondary">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-muted/30">
        <div className="flex gap-2 mb-3">
          <Button variant="soft" size="sm" onClick={onScheduleAppointment}>
            Schedule Appointment
          </Button>
          <Button variant="outline" size="sm">
            Emergency Info
          </Button>
          <Button variant="outline" size="sm" onClick={resetChat}>
            New Chat
          </Button>
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              inputRef.current = e.target.value;
            }}
            placeholder="Answer the question or describe your symptoms..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
            disabled={isLoadingHistory}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping || isLoadingHistory}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <AlertTriangle className="h-3 w-3 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            For emergencies, call emergency services immediately
          </p>
        </div>
      </div>
    </Card>
  );
};
