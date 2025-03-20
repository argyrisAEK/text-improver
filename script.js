document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyze-btn');
  const improveBtn = document.getElementById('improve-btn');
  const textDisplay = document.getElementById('text-display');
  const errorMessage = document.getElementById('error-message');
  const suggestionPanel = document.getElementById('suggestion-panel');
  const issuesSummary = document.getElementById('issues-summary');
  const suggestionContent = document.getElementById('suggestion-content');
  const closeSuggestion = document.getElementById('close-suggestion');
  const clearTextBtn = document.getElementById('clear-text-btn');

  // Add variables for comparison feature
  let originalText = '';

  analyzeBtn.addEventListener('click', analyzeText);
  improveBtn.addEventListener('click', () => improveFullText(0));
  closeSuggestion.addEventListener('click', () => {
    suggestionPanel.classList.remove('active');
  });

  textDisplay.addEventListener('input', function () {
    const text = textDisplay.textContent || textDisplay.innerText;
    const wordCount = countWords(text);

    if (text.trim()) {
      clearTextBtn.style.display = 'block';
      if (wordCount > 2000) {
        errorMessage.textContent = `Text exceeds 2000 words limit (currently ${wordCount} words)`;
        analyzeBtn.disabled = true;
        improveBtn.disabled = true;
      } else {
        errorMessage.textContent = `Word count: ${wordCount} / 2000`;
        analyzeBtn.disabled = false;
        improveBtn.disabled = false;
      }
    } else {
      errorMessage.textContent = '';
      analyzeBtn.disabled = true;
      improveBtn.disabled = true;
      clearTextBtn.style.display = 'none';
    }
  });

  textDisplay.addEventListener('paste', function () {
    // Show clear button when text is pasted
    setTimeout(() => {
      const text = textDisplay.textContent || textDisplay.innerText;
      if (text.trim()) {
        clearTextBtn.style.display = 'block';
      }
    }, 0);
  });

  clearTextBtn.addEventListener('click', function () {
    // Clear the text display
    textDisplay.innerHTML = '';
    clearTextBtn.style.display = 'none';
    errorMessage.textContent = '';
    analyzeBtn.disabled = true;
    improveBtn.disabled = true;

    // Clear any highlights and analysis
    clearHighlights();
    issuesSummary.innerHTML = '';

    // Remove any active comparison view
    const comparisonContainer = document.getElementById('comparison-container');
    if (comparisonContainer) {
      comparisonContainer.classList.remove('active');
    }
  });

  function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  async function analyzeTextWithLLM(text) {
    try {
      const response = await fetch('/.netlify/functions/analyzeText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      localStorage.setItem('lastAnalysis', JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Error:', error.message);
      throw error;
    }
  }

  function highlightPhrases(phrases) {
    const instance = new Mark(textDisplay);

    phrases.forEach((phrase) => {
      instance.mark(phrase, {
        className: 'highlight',
        accuracy: 'exactly',
        separateWordSearch: false,
        each: (element) => {
          // Add click event to each highlighted element
          element.addEventListener('click', (e) => {
            showSuggestionFor(phrase, element);
          });
        },
      });
    });
  }

  function displaySummary(summary) {
    issuesSummary.innerHTML = `
      <h3>Summary of Writing Issues</h3>
      <p>${summary}</p>
    `;
  }

  function showSuggestionFor(phrase, element) {
    // Get analysis results from the most recent API call
    const completion = JSON.parse(localStorage.getItem('lastAnalysis'));
    if (!completion || !completion.explanations || !completion.explanations[phrase]) {
      return;
    }

    const analysis = completion.explanations[phrase];

    // Show suggestion panel
    suggestionContent.innerHTML = `
      <h3>Original: <span class="original-phrase">${phrase}</span></h3>
      <p><strong>Issue:</strong> ${analysis.issue}</p>
      <p><strong>Suggestion:</strong> ${analysis.suggestion}</p>
      <button id="apply-suggestion">Apply This Suggestion</button>
    `;

    // Position the panel near the clicked element
    const rect = element.getBoundingClientRect();
    const panelHeight = 200; // Approximate height of panel

    // Adjust positioning to work better on mobile
    const isMobile = window.innerWidth <= 600;

    // Check if the panel would go off the bottom of the screen
    const bottomSpace = window.innerHeight - rect.bottom;
    if (bottomSpace < panelHeight) {
      // Position above the element
      suggestionPanel.style.top = `${rect.top - panelHeight - 10}px`;
    } else {
      // Position below the element
      suggestionPanel.style.top = `${rect.bottom + 10}px`;
    }

    // Center horizontally and handle mobile view
    if (isMobile) {
      suggestionPanel.style.left = `${Math.max(10, Math.min(window.innerWidth - 290, rect.left))}px`;
    } else {
      suggestionPanel.style.left = `${rect.left + rect.width / 2 - 150}px`;
    }

    suggestionPanel.classList.add('active');

    // Add event listener for apply button
    document.getElementById('apply-suggestion').addEventListener('click', () => {
      replaceHighlightedElement(element, analysis.suggestion);
      suggestionPanel.classList.remove('active');
    });
  }

  function replaceHighlightedElement(element, replacement) {
    // Create a new text node with the replacement text
    const newNode = document.createTextNode(replacement);

    // Replace the highlighted <mark> element with the new text
    element.replaceWith(newNode);

    // Re-enable analyze button since changes were made
    analyzeBtn.disabled = false;
    improveBtn.disabled = false;
  }

  async function improveFullText() {
    const text = textDisplay.textContent || textDisplay.innerText;

    if (!text.trim()) {
      errorMessage.textContent = 'No text to improve';
      return;
    }

    // Store original text before improving
    originalText = text;

    improveBtn.disabled = true;
    improveBtn.textContent = 'Improving...';
    errorMessage.textContent = '';

    try {
      const response = await fetch('/.netlify/functions/improveText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const improvedText = await response.text();

      // Check if response is unexpectedly JSON
      if (improvedText.startsWith('{')) {
        // If it's JSON, try to extract content
        try {
          const jsonResult = JSON.parse(improvedText);
          textDisplay.innerHTML = jsonResult.content || jsonResult;
        } catch (e) {
          throw new Error('Unexpected JSON response format');
        }
      } else {
        // Otherwise use the text directly
        textDisplay.innerHTML = improvedText;
      }

      // Clear any existing highlights and summaries
      clearHighlights();
      issuesSummary.innerHTML = `
        <h3>Text has been improved!</h3>
        <button id="show-comparison" class="toggle-comparison">Show Before & After Comparison</button>
      `;

      // Add event listener for the comparison button
      document.getElementById('show-comparison').addEventListener('click', () => {
        showComparison(originalText, textDisplay.innerHTML);
      });
    } catch (error) {
      console.error('Error:', error.message);
      errorMessage.textContent = `Error: ${error.message || 'Failed to improve text'}`;
    } finally {
      improveBtn.disabled = false;
      improveBtn.textContent = 'Improve Entire Text';
    }
  }

  function clearHighlights() {
    const instance = new Mark(textDisplay);
    instance.unmark();
    suggestionPanel.classList.remove('active');
  }

  function showComparison(before, after) {
    // Create comparison container if it doesn't exist
    let comparisonContainer = document.getElementById('comparison-container');
    if (!comparisonContainer) {
      comparisonContainer = document.createElement('div');
      comparisonContainer.id = 'comparison-container';
      comparisonContainer.innerHTML = `
        <h3>Before & After Comparison</h3>
        <div class="comparison-view">
          <div id="before-panel" class="comparison-panel">
            <h4>Original Text</h4>
            <div id="before-content"></div>
          </div>
          <div id="after-panel" class="comparison-panel">
            <h4>Improved Text</h4>
            <div id="after-content"></div>
          </div>
        </div>
        <button id="hide-comparison" class="toggle-comparison">Hide Comparison</button>
      `;
      textDisplay.parentNode.insertBefore(comparisonContainer, textDisplay);

      // Add event listener for hide button
      document.getElementById('hide-comparison').addEventListener('click', () => {
        comparisonContainer.classList.remove('active');
      });
    }

    // Get diff and apply highlights
    const diff = computeTextDiff(before, after);

    // Insert content
    document.getElementById('before-content').innerHTML = diff.beforeHtml;
    document.getElementById('after-content').innerHTML = diff.afterHtml;

    // Show the comparison
    comparisonContainer.classList.add('active');

    // Scroll to the comparison
    comparisonContainer.scrollIntoView({ behavior: 'smooth' });
  }

  function computeTextDiff(before, after) {
    // Split texts into words and punctuation
    const tokenize = (text) => text.match(/\S+|\s+/g) || [];
    const beforeTokens = tokenize(before);
    const afterTokens = tokenize(after);

    // Implementation of a simplified Myers diff algorithm
    const diffResult = findDiff(beforeTokens, afterTokens);

    // Generate HTML with appropriate highlighting
    let beforeHtml = '';
    let afterHtml = '';

    diffResult.forEach((part) => {
      if (part.added) {
        afterHtml += `<span class="diff-added">${part.value}</span>`;
      } else if (part.removed) {
        beforeHtml += `<span class="diff-deleted">${part.value}</span>`;
      } else {
        beforeHtml += part.value;
        afterHtml += part.value;
      }
    });

    return { beforeHtml, afterHtml };
  }

  function findDiff(before, after) {
    // Create a matrix to find the longest common subsequence
    const matrix = Array(before.length + 1)
      .fill()
      .map(() => Array(after.length + 1).fill(0));

    // Fill the matrix
    for (let i = 1; i <= before.length; i++) {
      for (let j = 1; j <= after.length; j++) {
        if (before[i - 1] === after[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
        } else {
          matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
        }
      }
    }

    // Backtrack to find differences
    const result = [];
    let i = before.length;
    let j = after.length;

    // Group consecutive operations for readability
    let currentOperation = null;
    let currentGroup = '';

    const flushGroup = () => {
      if (currentGroup) {
        result.unshift({
          value: currentGroup,
          added: currentOperation === 'added',
          removed: currentOperation === 'removed',
        });
        currentGroup = '';
      }
    };

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
        // Common element
        if (currentOperation !== null) {
          flushGroup();
          currentOperation = null;
        }
        currentGroup = before[i - 1] + currentGroup;
        i--;
        j--;
      } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
        // Addition
        if (currentOperation !== 'added') {
          flushGroup();
          currentOperation = 'added';
        }
        currentGroup = after[j - 1] + currentGroup;
        j--;
      } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
        // Deletion
        if (currentOperation !== 'removed') {
          flushGroup();
          currentOperation = 'removed';
        }
        currentGroup = before[i - 1] + currentGroup;
        i--;
      }
    }

    flushGroup();
    return result;
  }

  function analyzeText() {
    const text = textDisplay.textContent || textDisplay.innerText;

    // Store original text when analyzing
    originalText = text;

    if (!text.trim()) {
      errorMessage.textContent = 'No text to analyze';
      return;
    }

    // Clear any previous highlights and analysis
    clearHighlights();
    issuesSummary.innerHTML = '';

    // Show loading state
    analyzeBtn.disabled = true;
    improveBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    errorMessage.textContent = '';

    analyzeTextWithLLM(text)
      .then((result) => {
        if (result && result.phrases && result.phrases.length > 0) {
          highlightPhrases(result.phrases);
          displaySummary(result.summary);
          improveBtn.disabled = false;
        } else {
          errorMessage.textContent = 'No phrases to improve were found';
        }
      })
      .catch((error) => {
        errorMessage.textContent = `Error: ${error.message || 'Failed to analyze text'}`;
      })
      .finally(() => {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Highlight Phrases Needing Improvement';
      });
  }
});
