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
            role: "system",
            content: `You are a professional editor with expertise in clear, concise writing. Improve the provided text by:
            1. Replacing passive voice with active voice where appropriate
            2. Eliminating unnecessary jargon and technical terms, or explaining them if essential
            3. Removing redundancies and wordiness without losing meaning
            4. Breaking up overly complex sentences into clearer structures
            5. Replacing vague language with specific, concrete terms
            6. Substituting clichés and overused expressions with fresh language
            7. Ensuring consistent tone and appropriate formality level
            8. Improving overall flow and readability

            Important guidelines:
            - Maintain the original meaning and core message
            - Preserve the author's unique voice and perspective
            - Keep any technical terminology that is necessary for the audience
            - Ensure the improved text serves its intended purpose more effectively
            - Ensure the improved text to look like it was written by a human and not by A.I.

            Return only the improved text without any explanations or additional commentary.`
          },
          {
            role: "user",
            content: text
          }
        ],
        model: model,
        private: true
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  };

  // Try each model in order
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      console.log(`Trying model: ${model}`);
      const improvedText = await callAPI(model);

      // If successful, return the result
      return {
        statusCode: 200,
        body: improvedText,
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
