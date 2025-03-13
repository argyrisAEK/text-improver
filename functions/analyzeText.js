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
            content: `You are a professional writing coach and editor...` // Your system message here
          },
          {
            role: "user",
            content: text
          }
        ],
        model: "openai-large",
        jsonMode: true,
        private: true
      }),
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to analyze text with AI' }),
      };
    }

    const result = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
