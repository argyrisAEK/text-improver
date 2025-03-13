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
            content: `You are a professional editor with expertise in clear, concise writing...` // Your system message here
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
