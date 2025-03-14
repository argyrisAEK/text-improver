exports.handler = async (event, context) => {
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
            role: "system",
            content: `You are a professional editor with expertise in clear, concise writing. Improve the provided text
            by:
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
            
             Return only the improved text without any explanations or additional commentary.`
          },
          {
            role: "user",
            content: text
          }
        ],
        model: "openai-large",
        private: true
      }),
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to improve text with AI' }),
      };
    }

    const result = await response.text();
    return {
      statusCode: 200,
      body: result,
    };
  } catch (error) {
    console.error('Error improving text:', error); // Log the error
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
