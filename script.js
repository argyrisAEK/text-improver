document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const improveBtn = document.getElementById('improve-btn');
  const textDisplay = document.getElementById('text-display');
  const errorMessage = document.getElementById('error-message');
  const suggestionPanel = document.getElementById('suggestion-panel');
  const issuesSummary = document.getElementById('issues-summary');
  const suggestionContent = document.getElementById('suggestion-content');
  const closeSuggestion = document.getElementById('close-suggestion');

  let originalText = '';

  fileInput.addEventListener('change', handleFileUpload);
  analyzeBtn.addEventListener('click', analyzeText);
  improveBtn.addEventListener('click', improveFullText);
  closeSuggestion.addEventListener('click', () => {
    suggestionPanel.classList.remove('active');
  });

  textDisplay.addEventListener('input', function() {
    if (textDisplay.textContent.trim()) {
      analyzeBtn.disabled = false;
      improveBtn.disabled = false;
    } else {
      analyzeBtn.disabled = true;
      improveBtn.disabled = true;
    }
  });

  function handleFileUpload(event) {
    const file = event.target.files[0];
    errorMessage.textContent = '';

    if (!file) return;

    if (file.type !== 'text/plain') {
      errorMessage.textContent = 'Please upload a valid .txt file';
      fileInput.value = '';
      analyzeBtn.disabled = true;
      improveBtn.disabled = true;
      return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
      textDisplay.textContent = e.target.result;
      analyzeBtn.disabled = false;
      improveBtn.disabled = false;
    };

    reader.onerror = function() {
      errorMessage.textContent = 'Error reading the file';
      analyzeBtn.disabled = true;
      improveBtn.disabled = true;
    };

    reader.readAsText(file);
  }

  async function analyzeText() {
    const text = textDisplay.textContent || textDisplay.innerText;

    if (!text.trim()) {
      errorMessage.textContent = 'No text to analyze';
      return;
    }

    clearHighlights();
    issuesSummary.innerHTML = '';

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    errorMessage.textContent = '';

    try {
      const result = await analyzeTextWithLLM(text);

      if (result && result.phrases && result.phrases.length > 0) {
        highlightPhrases(result.phrases);
        displaySummary(result.summary);
        improveBtn.disabled = false;
      } else {
        errorMessage.textContent = 'No phrases to improve were found';
      }
    } catch (error) {
      errorMessage.textContent = `Error: ${error.message || 'Failed to analyze text'}`;
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Highlight Phrases Needing Improvement';
    }
  }

  async function analyzeTextWithLLM(text) {
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

    return response.json();
  }

  async function improveFullText() {
    const text = textDisplay.textContent || textDisplay.innerText;

    if (!text.trim()) {
      errorMessage.textContent = 'No text to improve';
      return;
    }

    originalText = text;

    improveBtn.disabled = true;
    improveBtn.textContent = 'Improving...';
    errorMessage.textContent = '';

    try {
      const improvedText = await improveTextWithLLM(text);

      textDisplay.innerHTML = improvedText;

      clearHighlights();
      issuesSummary.innerHTML = `
        <h3>Text has been improved!</h3>
        <button id="show-comparison" class="toggle-comparison">Show Before & After Comparison</button>
      `;

      document.getElementById('show-comparison').addEventListener('click', () => {
        showComparison(originalText, textDisplay.innerHTML);
      });
    } catch (error) {
      errorMessage.textContent = `Error: ${error.message || 'Failed to improve text with AI'}`;
    } finally {
      improveBtn.disabled = false;
      improveBtn.textContent = 'Get Improved Text';
    }
  }

  async function improveTextWithLLM(text) {
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

    return response.text();
  }

  function highlightPhrases(phrases) {
    const instance = new Mark(textDisplay);

    phrases.forEach(phrase => {
      instance.mark(phrase, {
        className: 'highlight',
        accuracy: 'exactly',
        separateWordSearch: false,
        each: (element) => {
          element.addEventListener('click', () => {
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
    const completion = JSON.parse(localStorage.getItem('lastAnalysis'));

    if (!completion || !completion.explanations || !completion.explanations[phrase]) {
      return;
    }

    const analysis = completion.explanations[phrase];

    suggestionContent.innerHTML = `
      <h3>Original: <span class="original-phrase">${phrase}</span></h3>
      <p><strong>Issue:</strong> ${analysis.issue}</p>
      <p><strong>Suggestion:</strong> ${analysis.suggestion}</p>
      <button id="apply-suggestion">Apply This Suggestion</button>
    `;

    const rect = element.getBoundingClientRect();
    const panelHeight = 200;

    if (window.innerHeight - rect.bottom < panelHeight) {
      suggestionPanel.style.top = `${rect.top - panelHeight - 10}px`;
    } else {
      suggestionPanel.style.top = `${rect.bottom + 10}px`;
    }

    suggestionPanel.style.left = `${rect.left + rect.width / 2 - 150}px`;
    suggestionPanel.classList.add('active');

    document.getElementById('apply-suggestion').addEventListener('click', () => {
      applyTextReplacement(phrase, analysis.suggestion);
      suggestionPanel.classList.remove('active');
    });
  }

  function applyTextReplacement(original, replacement) {
    const content = textDisplay.textContent;
    const startPos = content.indexOf(original);

    if (startPos === -1) return;

    const range = document.createRange();
    const sel = window.getSelection();

    let currentNode = textDisplay.firstChild;
    let currentPos = 0;

    while (currentNode) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const nodeLength = currentNode.textContent.length;

        if (currentPos <= startPos && startPos < currentPos + nodeLength) {
          const nodeStartPos = startPos - currentPos;
          range.setStart(currentNode, nodeStartPos);
          range.setEnd(currentNode, nodeStartPos + original.length);

          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('insertText', false, replacement);
          return;
        }

        currentPos += nodeLength;
      } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const nodeText = currentNode.textContent;

        if (nodeText === original) {
          currentNode.textContent = replacement;
          return;
        }

        currentPos += nodeText.length;
      }

      currentNode = getNextNode(currentNode, textDisplay);
    }

    textDisplay.innerHTML = textDisplay.innerHTML.replace(original, replacement);
  }

  function getNextNode(node, root) {
    if (node.firstChild) {
      return node.firstChild;
    }

    while (node) {
      if (node.nextSibling) {
        return node.nextSibling;
      }
      node = node.parentNode;
      if (node === root) {
        return null;
      }
    }

    return null;
  }

  function clearHighlights() {
    const instance = new Mark(textDisplay);
    instance.unmark();
    suggestionPanel.classList.remove('active');
  }

  function showComparison(before, after) {
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

      document.getElementById('hide-comparison').addEventListener('click', () => {
        comparisonContainer.classList.remove('active');
      });
    }

    const diff = computeTextDiff(before, after);

    document.getElementById('before-content').innerHTML = diff.beforeHtml;
    document.getElementById('after-content').innerHTML = diff.afterHtml;

    comparisonContainer.classList.add('active');
    comparisonContainer.scrollIntoView({ behavior: 'smooth' });
  }

  function computeTextDiff(before, after) {
    const beforeSentences = before.split(/(?<=[.!?])\s+/);
    const afterSentences = after.split(/(?<=[.!?])\s+/);

    let beforeHtml = '';
    let afterHtml = '';

    let i = 0, j = 0;
    while (i < beforeSentences.length || j < afterSentences.length) {
      if (i >= beforeSentences.length) {
        afterHtml += `<span class="diff-added">${afterSentences[j]}</span> `;
        j++;
      } else if (j >= afterSentences.length) {
        beforeHtml += `<span class="diff-deleted">${beforeSentences[i]}</span> `;
        i++;
      } else if (beforeSentences[i] === afterSentences[j]) {
        beforeHtml += beforeSentences[i] + ' ';
        afterHtml += afterSentences[j] + ' ';
        i++;
        j++;
      } else if (beforeSentences[i].toLowerCase() === afterSentences[j].toLowerCase()) {
        beforeHtml += `<span class="diff-highlight">${beforeSentences[i]}</span> `;
        afterHtml += `<span class="diff-highlight">${afterSentences[j]}</span> `;
        i++;
        j++;
      } else {
        const similarity = calculateSimilarity(beforeSentences[i], afterSentences[j]);
        if (similarity > 0.5) {
          beforeHtml += `<span class="diff-highlight">${beforeSentences[i]}</span> `;
          afterHtml += `<span class="diff-highlight">${afterSentences[j]}</span> `;
          i++;
          j++;
        } else {
          const lookAhead = findBestMatch(beforeSentences, i, afterSentences, j);
          if (lookAhead.foundInBefore) {
            beforeHtml += `<span class="diff-deleted">${beforeSentences[i]}</span> `;
            i++;
          } else if (lookAhead.foundInAfter) {
            afterHtml += `<span class="diff-added">${afterSentences[j]}</span> `;
            j++;
          } else {
            beforeHtml += `<span class="diff-deleted">${beforeSentences[i]}</span> `;
            afterHtml += `<span class="diff-added">${afterSentences[j]}</span> `;
            i++;
            j++;
          }
        }
      }
    }

    return { beforeHtml, afterHtml };
  }

  function calculateSimilarity(str1, str2) {
    const normalize = s => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const s1 = normalize(str1);
    const s2 = normalize(str2);

    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    let matches = 0;
    for (const word of words1) {
      if (words2.includes(word)) matches++;
    }

    return matches / Math.max(words1.length, words2.length);
  }

  function findBestMatch(beforeArr, beforeIdx, afterArr, afterIdx) {
    const lookAheadLimit = 3;

    for (let i = 1; i <= lookAheadLimit && beforeIdx + i < beforeArr.length; i++) {
      if (calculateSimilarity(beforeArr[beforeIdx + i], afterArr[afterIdx]) > 0.7) {
        return { foundInBefore: true, foundInAfter: false };
      }
    }

    for (let i = 1; i <= lookAheadLimit && afterIdx + i < afterArr.length; i++) {
      if (calculateSimilarity(beforeArr[beforeIdx], afterArr[afterIdx + i]) > 0.7) {
        return { foundInBefore: false, foundInAfter: true };
      }
    }

    return { foundInBefore: false, foundInAfter: false };
  }
});
