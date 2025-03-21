# Text Improver App

The **Text Improver App** is a web application that helps users analyze and improve their text. It highlights phrases that need improvement, provides specific suggestions, and offers an option to automatically improve the entire text. The app uses serverless functions (Netlify Functions) to handle backend logic, such as calling external APIs for text analysis and improvement.

## Features

- **Text Analysis**: Highlights phrases that need improvement and provides explanations and suggestions.
- **Text Improvement**: Automatically improves the entire text by simplifying sentences, removing redundancies, and enhancing readability.
- **Before & After Comparison**: Allows users to compare the original text with the improved version.
- **Word Count Limit**: Supports texts up to 2000 words.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Netlify Functions (Serverless)
- **External API**: [Pollinations.ai](https://text.pollinations.ai/) for text analysis and improvement
- **Libraries**: [mark.js](https://markjs.io/) for text highlighting

## Live Demo

You can try the app live here: [Text Improver App](https://text-improver.netlify.app/)

---

## Getting Started

Follow these instructions to set up the app locally on your machine.

### Prerequisites

- Node.js (v16 or higher)
- Netlify CLI (optional, for local testing of serverless functions)
- Git (for cloning the repository)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/text-improver-app.git
   cd text-improver-app
