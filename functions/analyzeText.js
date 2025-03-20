
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { text } = JSON.parse(event.body);

  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
                 content: `You are a professional writing coach and editor. Analyze the provided text and identify phrases that could be improved.
            Focus on issues like:
            - Passive voice constructions (e.g., "mistakes were made" → "they made mistakes")
            - Jargon or technical terms that aren't clearly explained
            - Redundant expressions (e.g., "completely eliminate" → "eliminate")
            - Wordy phrases (e.g., "in the event that" → "if")
            - Clichés and overused expressions
            - Vague or ambiguous language
            - Complex sentences that could be simplified
            - Outdated or inappropriate expressions
            
            For each phrase, provide a specific explanation of the issue and a clear suggestion for improvement.
            Also provide a concise summary of overall writing patterns that need attention.
            
            Respond directly with JSON, following this JSON schema, and no other text:
            {
              "phrases": ["exact phrase from the text that needs improvement", ...],
              "explanations": {
                "exact phrase": {"issue": "Clear description of the writing problem", "suggestion": "Provide only the improved wording"},
                ...
              },
              "summary": "Brief analysis(max: 20 words) of writing patterns with constructive feedback"
            }`
          },
          {
            role: 'user',
            content: text,
          },
        ],
        model: 'openai-large',
        jsonMode: true,
        private: true,
      }),
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to analyze text' }),
    };
  }
};
