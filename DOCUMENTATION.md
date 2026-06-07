# Medipal - AI-Powered Healthcare Assistant

## Project Overview

**Medipal** is a comprehensive web-based healthcare application that provides AI-powered medical symptom assessment and healthcare coordination. The platform enables users to describe their symptoms through an interactive chat interface, receive personalized health guidance, and connect with recommended healthcare specialists.

### Mission
To democratize healthcare access by providing instant, multilingual AI-powered health assistance that helps users understand their symptoms and guides them to appropriate care.

### Key Features
- AI-powered symptom assessment via conversational chat
- Multilingual support (10+ Indian languages)
- Voice input/output capabilities
- Specialist recommendations based on symptoms
- Seamless care coordination
- Emergency guidance and disclaimers

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Feature Specifications](#feature-specifications)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Environment Variables](#environment-variables)
8. [Deployment](#deployment)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)
11. [Future Enhancements](#future-enhancements)

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.8.3 | Type Safety |
| Vite | 5.4.19 | Build Tool |
| Tailwind CSS | 3.4.17 | Styling |
| shadcn/ui | - | UI Components |
| Radix UI | - | Accessible Components |
| TanStack Query | 5.83.0 | State Management |
| React Router | 6.30.1 | Routing |
| Lucide React | 0.462.0 | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | Backend-as-a-Service |
| Supabase Edge Functions | Serverless Functions |
| OpenAI GPT-4o-mini | AI Language Model |

### Development Tools
| Technology | Purpose |
|------------|---------|
| ESLint | Code Linting |
| PostCSS | CSS Processing |
| Autoprefixer | Vendor Prefixes |

---

## Project Structure

```
medipal/
├── src/
│   ├── assets/
│   │   └── medical-ai-hero.jpg       # Hero background image
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── ... (30+ more UI components)
│   │   ├── ChatInterface.tsx        # Main AI chat component
│   │   ├── SpecialistRecommendation.tsx
│   │   └── MedicalDisclaimer.tsx
│   ├── pages/
│   │   ├── Index.tsx               # Home/Landing page
│   │   └── NotFound.tsx            # 404 page
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts           # Supabase client instance
│   │       └── types.ts            # Database types
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   └── use-mobile.tsx
│   ├── lib/
│   │   └── utils.ts               # Utility functions
│   ├── App.tsx                    # Root component with routing
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Global styles
│   └── vite-env.d.ts
├── supabase/
│   ├── functions/
│   │   └── medical-chat/
│   │       └── index.ts           # Edge function for AI chat
│   └── config.toml
├── public/
│   ├── placeholder.svg
│   └── robots.txt
├── package.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tailwind.config.ts
├── vite.config.ts
└── DOCUMENTATION.md
```

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      React Application (Vite)                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │    Home     │  │ Chat View   │  │Specialists  │  │ Disclaimer  │   │   │
│  │  │   (Index)   │  │ (ChatIter)  │  │   (Recomd)  │  │    (Info)   │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STATE MANAGEMENT                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TanStack React Query                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌───────────────────────────────────────────────────────────────────���─┐   │
│  │                   Supabase Client (HTTP)                           │   │
│  │                    (REST API + WebSocket)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICES                                   │
│  ┌─────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │    Supabase Edge Function   │  │       OpenAI API                  │   │
│  │       (medical-chat)        │──│   (GPT-4o-mini)                   │   │
│  │    - Request validation     │  │   - Symptom analysis              │   │
│  │    - Language detection      │  │   - Response generation           │   │
│  │    - Severity evaluation     │  │   - Multilingual support         │   │
│  └─────────────────────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User inputs symptoms** → ChatInterface component
2. **Message sent to Supabase** → via `supabase.functions.invoke()`
3. **Edge function processes** → Validates input, builds conversation context
4. **OpenAI API called** → Sends conversation to GPT-4o-mini
5. **AI generates response** → Returns formatted solution/question
6. **Response sent to frontend** → Displayed in chat with severity badge

---

## Feature Specifications

### 1. Home Page (Index.tsx)

**Path**: `/`

The main landing page featuring:
- **Hero Section**: Full-width gradient background with hero image
  - Title: "AI-Powered Healthcare At Your Fingertips"
  - Subtitle describing the service
  - Call-to-action buttons
  
- **Features Section**: Three-column grid displaying core capabilities
  - Intelligent Symptom Analysis
  - Expert Recommendations
  - Seamless Care Coordination
  
- **Trust Section**: Trust indicators
  - HIPAA Compliant
  - 24/7 Available
  - Evidence-Based
  
- **CTA Section**: Final call-to-action

**State Management**:
```typescript
const [currentView, setCurrentView] = useState<'home' | 'chat' | 'specialists' | 'disclaimer'>('home');
```

### 2. Chat Interface (ChatInterface.tsx)

**Path**: `/chat` (internal view)

The core AI-powered health assistant component with:

#### Features
- **Interactive chat** with message history
- **Typing indicators** for bot responses
- **Severity badges** (low, medium, high, emergency)
- **Voice input** (Speech-to-Text via Web Speech API)
- **Voice output** (Text-to-Speech via Speech Synthesis API)
- **Language selection** with 12 supported languages
- **Quick actions** (Schedule, Emergency, New Chat)

#### Supported Languages
| Code | Language |
|------|----------|
| auto | Auto-detect |
| en-IN | English (India) |
| hi-IN | Hindi (हिन्दी) |
| bn-IN | Bengali (বাংলা) |
| ta-IN | Tamil (தமிழ்) |
| te-IN | Telugu (తెలుగు) |
| mr-IN | Marathi (मराठी) |
| gu-IN | Gujarati (ગુજરાતી) |
| kn-IN | Kannada (ಕನ್ನಡ) |
| ml-IN | Malayalam (മലയാളം) |
| pa-IN | Punjabi (ਪੰਜਾਬੀ) |
| ur-IN | Urdu (اُردو) |

#### Message Interface
```typescript
interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'emergency';
}
```

#### Voice Features Implementation

**Text-to-Speech (TTS)**:
- Uses browser's `SpeechSynthesis` API
- Prefers Indian locale voices (en-IN, hi-IN, etc.)
- Rate: 0.95 (slightly slower for clarity)
- Queues sentences for natural flow

**Speech-to-Text (STT)**:
- Uses Web Speech API (`SpeechRecognition` or `webkitSpeechRecognition`)
- Auto-sends captured speech on stop
- Supports all languages from selection

### 3. Specialist Recommendations (SpecialistRecommendation.tsx)

**Path**: `/specialists` (internal view)

Display of recommended healthcare specialists based on symptom assessment.

#### Specialist Interface
```typescript
interface Specialist {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  availability: string;
  location: string;
  distance: string;
  acceptsInsurance: boolean;
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
}
```

#### Features
- Specialist cards with ratings and availability
- Urgency level badges
- Insurance acceptance indicators
- Schedule appointment buttons
- Contact options
- 24/7 human support option

### 4. Medical Disclaimer (MedicalDisclaimer.tsx)

**Path**: `/disclaimer` (internal view)

Important information about:
- AI assistant limitations
- Privacy and data handling
- Emergency contacts
- Medical disclaimers

---

## Configuration

### Tailwind Custom Theme

The project extends Tailwind with custom medical-themed colors and gradients:

```typescript
// Custom colors defined in index.css (CSS variables)
--primary: #0ea5e9 (医疗 blue)
--primary-soft: #f0f9ff (浅蓝)
--gradient-primary: linear-gradient
--gradient-hero: linear-gradient
--gradient-card: linear-gradient

// Custom shadows
shadow-medical: 0 10px 40px rgba(14, 165, 233, 0.2)
shadow-card: 0 4px 20px rgba(0, 0, 0, 0.08)
```

### Supabase Configuration

**Project URL**: `https://afughhionnnerqjewaxx.supabase.co`

**Client Configuration**:
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

---

## API Reference

### Edge Function: medical-chat

**Endpoint**: `https://afughhionnnerqjewaxx.supabase.co/functions/v1/medical-chat`

**Method**: POST

#### Request
```typescript
{
  message: string;           // User's latest message
  conversationHistory: {    // Previous messages for context
    role: 'user' | 'assistant';
    content: string;
  }[];
}
```

#### Response
```typescript
{
  response: string;        // AI's response
  severity: 'low' | 'medium' | 'high';  // Calculated severity
}
```

#### Response Format

The AI responds in two modes:

1. **Question Mode** (gathering info):
```
Question: How long have you been experiencing these symptoms?
```

2. **Solution Mode** (providing guidance):
```
Solution:
Brief Assessment: ...

Possible Causes:
- ...

Red Flags (Urgent):
- ...

Next Steps:
- See a general physician within 24 hours
- ...

Self-care Remedies:
- Rest and stay hydrated
- ...

Precautions & Prevention:
- Avoid strenuous activity
- ...

When to Seek Care:
- If symptoms worsen
- ...

Disclaimer: This is not a substitute for professional medical advice.
```

### Conversation Flow

```
User: "I have a headache"
    │
    ▼
AI: "Question: How long have you been experiencing this headache?"
    │
    ▼
User: "Since this morning"
    │
    ▼
AI: "Question: Where exactly do you feel the pain - front, back, or sides?"
    │
    ▼
User: "Mostly in my forehead and temples"
    │
    ▼
AI: "Solution: Brief Assessment: ..."
```

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o-mini access |

### Supabase (set automatically)
| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anonymous key |

---

## Deployment

### Build Commands

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Development server
npm run dev

# Preview production build
npm run preview
```

### Deployment Options

1. **Lovable** (primary)
   - Deploy via https://lovable.dev/projects/9442c5d1-3c2e-4c04-97f3-783936352a2c

2. **Supabase**
   - Edge functions deploy automatically with Supabase CLI

3. **Manual**
   - Build with `npm run build`
   - Deploy `dist/` folder to any static host

---

## Security Considerations

### Current Implementation

1. **API Key Protection**
   - OpenAI API key stored in Supabase Edge Function secrets
   - Not exposed to client-side code

2. **CORS**
   - Edge function allows all origins (`*`)
   - Should be restricted in production

3. **Authentication**
   - Public access (no authentication required)
   - Consider adding auth for production

### Recommendations for Production

1. Restrict CORS to specific domains
2. Add authentication (Supabase Auth)
3. Implement rate limiting on Edge Function
4. Add input sanitization
5. Enable HTTPS-only
6. Add HIPAA-compliant storage
7. Consider data encryption at rest

---

## Troubleshooting

### Common Issues

#### 1. Chat not sending messages
- Check Supabase function deployment
- Verify `OPENAI_API_KEY` is set
- Check browser console for errors

#### 2. Voice features not working
- TTS requires browser support
- STT requires `SpeechRecognition` API
- Some browsers don't support these APIs

#### 3. Edge Function Errors
- Check Supabase logs
- Verify environment variables
- Check function syntax

#### 4. Build Failures
- Clear node_modules: `rm -rf node_modules && npm i`
- Check TypeScript errors: `npm run lint`

---

## Future Enhancements

### Planned Features

1. **Authentication System**
   - User accounts and profiles
   - Medical history storage
   - Secure data management

2. **Appointment Scheduling**
   - Calendar integration
   - Provider availability sync
   - Reminders

3. **Prescription Integration**
   - OCR for prescriptions
   - Drug interaction checking

4. **Telemedicine**
   - Video consultations
   - Remote diagnostics

5. **Multi-language Expansion**
   - More Indian languages
   - Regional dialects

6. **AI Model Improvements**
   - Fine-tuned medical model
   - Better symptom correlation

---

## License

This project is for demonstration purposes. The AI-generated content should not be used as a substitute for professional medical advice.

---

## Credits

- Built with [Lovable](https://lovable.dev)
- UI Components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
- AI powered by [OpenAI](https://openai.com)

---

## Contact

For questions or support, please refer to the project repository or contact the development team.

*Last Updated: April 2026*
