exports.handler = async (event, context) => {
  const { text } = JSON.parse(event.body);

  // Define the models in order of preference
  const MODELS = [
    "openai-large", // Primary model
    "llama",        // First fallback
    "mistral"      // Second fallback
  ];

  // Function to call the API with a specific model
  const callAPI = async (model) => {
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
        model: model,
        jsonMode: true,
        private: true
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  };

  // Try each model in order
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      console.log(`Trying model: ${model}`);
      const result = await callAPI(model);

      // If successful, return the result
      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
    } catch (error) {
      console.error(`Error with model ${model}:`, error.message);

      // If this is the last model, throw the error
      if (i === MODELS.length - 1) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "All models failed. Please try again later." }),
        };
      }

      // Otherwise, continue to the next model
      console.log(`Switching to fallback model: ${MODELS[i + 1]}`);
    }
  }
};
