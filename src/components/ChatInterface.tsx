import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, AlertTriangle, Info, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'emergency';
}

interface ChatInterfaceProps {
  onScheduleAppointment?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onScheduleAppointment }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hello! I'm your AI health assistant. I'm here to help you understand your symptoms and guide you to appropriate care. Please describe what symptoms you're experiencing today.",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<string>('');
  const [language, setLanguage] = useState<string>('auto');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const languageOptions: { value: string; label: string }[] = [
    { value: 'auto', label: 'Auto (detect)' },
    { value: 'en-IN', label: 'English (India)' },
    { value: 'hi-IN', label: 'Hindi (हिन्दी)' },
    { value: 'bn-IN', label: 'Bengali (বাংলা)' },
    { value: 'ta-IN', label: 'Tamil (தமிழ்)' },
    { value: 'te-IN', label: 'Telugu (తెలుగు)' },
    { value: 'mr-IN', label: 'Marathi (मराठी)' },
    { value: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
    { value: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
    { value: 'ml-IN', label: 'Malayalam (മലയാളം)' },
    { value: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
    { value: 'ur-IN', label: 'Urdu (اُردو)' },
  ];
  const effectiveLang = useMemo(() => (language === 'auto' ? (typeof navigator !== 'undefined' ? (navigator as any).language || 'en-IN' : 'en-IN') : language), [language]);
  const canUseTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const canUseSTT = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }, []);

  // Load available TTS voices and keep in state
  useEffect(() => {
    if (!canUseTTS) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        window.speechSynthesis.onvoiceschanged = null as any;
      }
    };
  }, [canUseTTS]);

  const selectVoiceForLang = (langCode: string): SpeechSynthesisVoice | null => {
    if (!voices || voices.length === 0) return null;
    const lc = langCode.toLowerCase();
    // Strongly prefer Indian locale variants when possible (e.g., en-IN, hi-IN)
    const preferIndian = (v: SpeechSynthesisVoice) => (
      v.lang?.toLowerCase().endsWith('-in') || v.name.toLowerCase().includes('india')
    );
    // If English requested, bias to en-IN first
    if (lc.startsWith('en')) {
      const enInExact = voices.find(v => v.lang?.toLowerCase() === 'en-in');
      if (enInExact) return enInExact;
      const enInGoogle = voices.find(v => v.name.toLowerCase().includes('google') && v.lang?.toLowerCase() === 'en-in');
      if (enInGoogle) return enInGoogle;
      const anyEnIndian = voices.find(v => v.lang?.toLowerCase().startsWith('en') && preferIndian(v));
      if (anyEnIndian) return anyEnIndian;
    }
    // Prefer exact locale match
    const exact = voices.find(v => v.lang?.toLowerCase() === lc);
    if (exact) return exact;
    // Prefer same language prefix (e.g., hi-*)
    const prefix = lc.split('-')[0];
    const byPrefix = voices.find(v => v.lang?.toLowerCase().startsWith(prefix));
    if (byPrefix) return byPrefix;
    // Prefer Google voices if available for better fluency
    const googleMatch = voices.find(v => v.name.toLowerCase().includes('google') && v.lang?.toLowerCase().startsWith(prefix));
    if (googleMatch) return googleMatch;
    // Fallback to en-IN or any English voice
    const enIn = voices.find(v => v.lang?.toLowerCase() === 'en-in');
    if (enIn) return enIn;
    const anyEn = voices.find(v => v.lang?.toLowerCase().startsWith('en'));
    return anyEn || null;
  };
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping]);

  // Speak latest bot message when voice is enabled
  useEffect(() => {
    if (!canUseTTS || !voiceEnabled) return;
    const last = messages[messages.length - 1];
    if (!last || last.type !== 'bot' || !last.content) return;
    try {
      const speakFluent = (text: string) => {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Normalize bullets and whitespace to help prosody
        const normalized = text
          .replace(/\n\s*\n/g, '\n')
          .replace(/^\s*-\s+/gm, '')
          .replace(/\s+•\s+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();

        // Split into sentences using ., ?, !, Indic danda "।" and newlines
        const parts = normalized
          .split(/(?<=[\.\?\!।])\s+|\n+/)
          .map(p => p.trim())
          .filter(Boolean);

        const langToUse = effectiveLang.toLowerCase().startsWith('en') ? 'en-IN' : effectiveLang;
        const voice = selectVoiceForLang(langToUse);
        const queue: SpeechSynthesisUtterance[] = parts.map((p, idx) => {
          // Add slight pause by appending comma for short items
          const u = new SpeechSynthesisUtterance(p);
          u.lang = langToUse;
          if (voice) u.voice = voice;
          // Slightly slower for clarity; tweak for fluency
          u.rate = 0.95;
          u.pitch = 1.0;
          u.volume = 1.0;
          // Chain to next utterance
          u.onend = () => {
            const next = queue[idx + 1];
            if (next) {
              window.speechSynthesis.speak(next);
            }
          };
          return u;
        });

        if (queue.length > 0) {
          window.speechSynthesis.speak(queue[0]);
        }
      };

      speakFluent(last.content);
    } catch {}
  }, [messages, voiceEnabled, canUseTTS, effectiveLang, voices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { if (canUseTTS) window.speechSynthesis.cancel(); } catch {}
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, [canUseTTS]);

  const ensureRecognition = () => {
    if (recognitionRef.current || !canUseSTT) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec: any = new SR();
    rec.lang = effectiveLang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const finalText = transcript.trim();
      inputRef.current = finalText;
      setInputValue(finalText);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => {
      setIsListening(false);
      // Auto-send captured speech if present
      if (inputRef.current && inputRef.current.trim()) {
        handleSendMessage();
      }
    };
    recognitionRef.current = rec;
  };

  const toggleListening = () => {
    if (!canUseSTT) return;
    ensureRecognition();
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      try { rec.stop(); } catch {}
      setIsListening(false);
    } else {
      try { window.speechSynthesis?.cancel(); } catch {}
      try { rec.start(); setIsListening(true); } catch {}
    }
  };

  const parseAssistantContent = (raw: string): { mode: 'question' | 'solution'; text: string } => {
    const trimmed = raw.trim();
    if (trimmed.toLowerCase().startsWith('question:')) {
      return { mode: 'question', text: trimmed.replace(/^[Qq]uestion:\s*/,'') };
    }
    if (trimmed.toLowerCase().startsWith('solution:')) {
      return { mode: 'solution', text: trimmed.replace(/^[Ss]olution:\s*/,'') };
    }
    // Fallback: treat as question to keep turn-taking
    return { mode: 'question', text: trimmed };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isCompleted) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Get conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('medical-chat', {
        body: { 
          message: currentInput,
          conversationHistory: conversationHistory
        }
      });

      if (error) throw error;

      const parsed = parseAssistantContent(data.response || '');
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: parsed.text,
        timestamp: new Date(),
        severity: data.severity || 'low',
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "I apologize, but I'm experiencing technical difficulties. Please try again or consult with a healthcare provider if you have urgent medical concerns.",
        timestamp: new Date(),
        severity: 'medium',
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsTyping(false);
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'emergency': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'accent';
      default: return 'primary';
    }
  };

  return (
    <Card className="h-[600px] flex flex-col bg-gradient-card shadow-medical">
      {/* Chat Header */}
      <div className="p-4 border-b bg-gradient-primary text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-white/20 text-white">
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">HealthAI Assistant</h3>
            <p className="text-xs opacity-90">Medical Information</p>
          </div>
        </div>
      </div>

      {/* Messages */}
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
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.severity && (
                  <div className="mt-2 flex items-center gap-2">
                    <Info className="h-3 w-3" />
                    <Badge variant={getSeverityColor(message.severity)} className="text-xs">
                      {message.severity === 'emergency' ? 'Seek immediate care' : 
                       message.severity === 'high' ? 'Consult doctor soon' :
                       message.severity === 'medium' ? 'Monitor symptoms' : 'Self-care possible'}
                    </Badge>
                  </div>
                )}
              </div>
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

        {isTyping && (
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-white border p-3 rounded-lg shadow-card">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex gap-2 mb-3">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            title="Language for voice & mic"
          >
            {languageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button variant="soft" size="sm" onClick={onScheduleAppointment}>
            Schedule Appointment
          </Button>
          <Button variant="outline" size="sm">
            Emergency Info
          </Button>
          <Button
            variant={voiceEnabled ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => setVoiceEnabled((v) => !v)}
            title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant={isListening ? 'secondary' : 'outline'}
            size="sm"
            onClick={toggleListening}
            disabled={!canUseSTT}
            title={canUseSTT ? (isListening ? 'Stop mic' : 'Start mic') : 'Speech recognition not supported'}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMessages([{
                id: '1',
                type: 'bot',
                content: "Hello! I'm your AI health assistant. I'm here to help you understand your symptoms and guide you to appropriate care. Please describe what symptoms you're experiencing today.",
                timestamp: new Date(),
              }]);
              setIsCompleted(false);
              setInputValue('');
              try { window.speechSynthesis?.cancel(); } catch {}
              try { recognitionRef.current?.stop(); } catch {}
            }}
          >
            New Chat
          </Button>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); inputRef.current = e.target.value; }}
            placeholder={'Answer the question or describe your symptoms...'}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping}>
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