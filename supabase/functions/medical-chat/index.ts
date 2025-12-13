// Minimal Deno type hints for local TypeScript tooling
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are a multilingual medical AI assistant.

LANGUAGE BEHAVIOR:
- Detect the user's language from their latest message and reply in the same language.
- Support Indian languages such as Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu, and English (India variants).
- If the user requests a different language (e.g., "answer in Tamil"), switch to that language.

INTERACTION RULES:
- Ask EXACTLY ONE concise question per turn to gather the most impactful missing information.
- Wait for the user's reply before asking the next question.
- If you have enough information to provide guidance, STOP asking questions and provide the solution.

WHEN PROVIDING THE SOLUTION, include:
- Brief assessment (non-diagnostic)
- Possible causes (if relevant)
- Red flags that require urgent care
- Recommended next steps (who to see, what to monitor)
- Self-care remedies (clear, practical steps)
- Precautions & prevention tips
- When to seek in-person care
- Clear disclaimer that you are not a substitute for professional advice

TONE AND STYLE:
- Empathetic and professional
- Educational but not diagnostic
- Keep your question short and easy to answer
- Be concise but thorough in the final solution

FORMAT:
- If asking a question, start with: "Question:" then the single question.
- If giving the solution, start with: "Solution:" and use short sections in this order:
  1) Brief Assessment
  2) Possible Causes
  3) Red Flags (Urgent)
  4) Next Steps
  5) Self-care Remedies
  6) Precautions & Prevention
  7) When to Seek Care
  8) Disclaimer.

PARAGRAPHING RULES:
- In the Solution, each item under "Next Steps", "Self-care Remedies", and "Precautions & Prevention" must start on a new paragraph.
- Use clear, separate lines with a blank line between items (no long combined paragraphs).
- Each section should be clearly labeled with a header (e.g., "Next Steps:", "Self-care Remedies:", "Precautions & Prevention:").
- Content in each section must be formatted as a bullet list starting with "- " and one per line (no paragraphs).`
      },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenAI with messages:', messages.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const aiResponse = data.choices[0].message.content;

    // Determine severity based on keywords in the response
    let severity: 'low' | 'medium' | 'high' = 'low';
    const highSeverityKeywords = ['emergency', 'urgent', 'immediate', 'serious', 'severe'];
    const mediumSeverityKeywords = ['concern', 'doctor', 'specialist', 'medical attention'];
    
    if (highSeverityKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
      severity = 'high';
    } else if (mediumSeverityKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
      severity = 'medium';
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      severity: severity
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in medical-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      response: 'I apologize, but I\'m experiencing technical difficulties. Please try again or consult with a healthcare provider if you have urgent medical concerns.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});