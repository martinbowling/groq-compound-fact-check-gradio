// Content script for Groq Fact Checker

// Track the state of fact checking
let factCheckInProgress = false;
let claimsData = [];
let overlayVisible = false;
let apiKey = null;

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startFactCheck') {
    apiKey = message.apiKey;
    if (!factCheckInProgress) {
      startFactCheck();
    } else {
      toggleOverlay();
    }
  } else if (message.action === 'claimsExtracted') {
    // Show the extracted claims while they're being fact-checked
    showExtractedClaims(message.claims);
    updateStatus('Fact checking claims...');
  } else if (message.action === 'factCheckResults') {
    updateFactCheckResults(message.results);
  } else if (message.action === 'factCheckError') {
    showError(message.error);
  }
});

// Convert HTML to Markdown
function htmlToMarkdown(html) {
  // Create a temporary div to work with the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove script and style tags
  const scripts = tempDiv.querySelectorAll('script, style, iframe, noscript');
  scripts.forEach(script => script.remove());
  
  // Get main content area if possible, otherwise use the whole body
  let mainContent = tempDiv.querySelector('main, article, .article, .content, #content');
  if (!mainContent) {
    mainContent = tempDiv;
  }
  
  // Get all text paragraphs
  const paragraphs = mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
  
  // Create markdown string
  let markdown = '';
  
  paragraphs.forEach(paragraph => {
    const tagName = paragraph.tagName.toLowerCase();
    
    // Handle headings
    if (tagName.match(/h[1-6]/)) {
      const level = parseInt(tagName.substring(1));
      const hashes = '#'.repeat(level);
      markdown += `${hashes} ${paragraph.textContent.trim()}\n\n`;
    } 
    // Handle paragraphs
    else if (tagName === 'p') {
      markdown += `${paragraph.textContent.trim()}\n\n`;
    }
    // Handle list items
    else if (tagName === 'li') {
      markdown += `- ${paragraph.textContent.trim()}\n`;
    }
  });
  
  return markdown.trim();
}

// Start the fact checking process
function startFactCheck() {
  factCheckInProgress = true;
  
  // Create or show the overlay
  createOrShowOverlay();
  
  // Get the page content
  // We'll extract text content carefully to maximize what we can process
  // Groq Compound model supports up to 128K tokens (roughly 400K characters)
  
  // First try to identify the main content
  let mainContent = document.querySelector('main, article, .article, [role="main"], #content, .content');
  if (!mainContent) {
    // If no main content container is found, use the body but filter out unnecessary elements
    mainContent = document.body;
  }
  
  // Clone the element to avoid modifying the actual page
  const contentClone = mainContent.cloneNode(true);
  
  // Remove elements that typically don't contain relevant content
  const elementsToRemove = contentClone.querySelectorAll(
    'script, style, noscript, iframe, nav, footer, header, aside, [role="complementary"], .sidebar, .ad, .advertisement, .banner, .menu, .navigation'
  );
  elementsToRemove.forEach(el => el.remove());
  
  // Extract text content from paragraphs, headers, and list items
  let extractedText = '';
  const contentElements = contentClone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, .article-body, .article-content');
  
  if (contentElements.length > 0) {
    // If we found specific content elements, use them
    contentElements.forEach(el => {
      extractedText += el.textContent + '\n\n';
    });
  } else {
    // Fallback: just get all text content, but still limit to a reasonable size
    extractedText = contentClone.textContent;
  }
  
  // Normalize whitespace
  const cleanText = extractedText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  // Limit to 300K characters which should be safely within the 128K token limit
  // This is still a very generous limit and should capture most articles completely
  const markdown = cleanText.substring(0, 300000);
  
  // Update status
  updateStatus('Converting page content...');
  
  // Send to background script for processing
  updateStatus('Extracting claims...');
  
  chrome.runtime.sendMessage({
    action: 'processFactCheck',
    content: markdown,
    apiKey: apiKey
  });
}

// Create or show the fact check overlay
function createOrShowOverlay() {
  let overlay = document.getElementById('groq-fact-check-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'groq-fact-check-overlay';
    
    // Create overlay header
    const header = document.createElement('div');
    header.id = 'groq-fact-check-header';
    
    const title = document.createElement('div');
    title.id = 'groq-fact-check-title';
    title.textContent = 'Groq Fact Checker';
    
    const closeButton = document.createElement('button');
    closeButton.id = 'groq-fact-check-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', toggleOverlay);
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create content area
    const content = document.createElement('div');
    content.id = 'groq-fact-check-content';
    
    // Create status bar
    const status = document.createElement('div');
    status.id = 'groq-fact-check-status';
    status.textContent = 'Initializing...';
    
    overlay.appendChild(header);
    overlay.appendChild(content);
    overlay.appendChild(status);
    
    document.body.appendChild(overlay);
  }
  
  overlay.style.display = 'flex';
  overlayVisible = true;
}

// Toggle overlay visibility
function toggleOverlay() {
  const overlay = document.getElementById('groq-fact-check-overlay');
  if (overlay) {
    if (overlayVisible) {
      overlay.style.display = 'none';
      overlayVisible = false;
    } else {
      overlay.style.display = 'flex';
      overlayVisible = true;
    }
  }
}

// Update the fact check status
function updateStatus(message) {
  const statusElement = document.getElementById('groq-fact-check-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

// Show error message
function showError(errorMessage) {
  const contentElement = document.getElementById('groq-fact-check-content');
  if (contentElement) {
    contentElement.innerHTML = `
      <div class="error-message">
        <p>An error occurred: ${errorMessage}</p>
        <p>Please try again later or check your API key settings.</p>
      </div>
    `;
  }
  
  updateStatus('Error occurred');
  factCheckInProgress = false;
}

// Show extracted claims before fact checking is complete
function showExtractedClaims(claims) {
  if (!claims || !claims.claims || claims.claims.length === 0) return;
  
  const contentElement = document.getElementById('groq-fact-check-content');
  if (!contentElement) return;
  
  // Store claims for later
  claimsData = claims.claims;
  
  // Clear previous content
  contentElement.innerHTML = '';
  
  // Add results header
  const header = document.createElement('h2');
  header.textContent = 'Extracted Claims';
  header.style.margin = '0 0 16px 0';
  contentElement.appendChild(header);
  
  // Add a note about fact checking in progress
  const note = document.createElement('p');
  note.textContent = 'Fact checking in progress...';
  note.style.marginBottom = '16px';
  note.style.fontStyle = 'italic';
  contentElement.appendChild(note);
  
  // Create container for claims
  const claimsContainer = document.createElement('div');
  claimsContainer.className = 'fact-check-container';
  
  // Process each claim
  claims.claims.forEach(claim => {
    const claimElement = document.createElement('div');
    claimElement.className = 'claim-item pending';
    
    // Claim text
    const claimText = document.createElement('div');
    claimText.className = 'claim-text';
    claimText.textContent = claim.claim;
    
    // Status indicator
    const status = document.createElement('div');
    status.className = 'verification-result';
    status.innerHTML = '<span class="verification-pending">Checking...</span>';
    
    // Add elements to the claim item
    claimElement.appendChild(claimText);
    claimElement.appendChild(status);
    
    // Add to container
    claimsContainer.appendChild(claimElement);
  });
  
  contentElement.appendChild(claimsContainer);
}

// Update fact check results in the UI
function updateFactCheckResults(results) {
  const contentElement = document.getElementById('groq-fact-check-content');
  if (!contentElement) return;
  
  console.log('Received fact check results:', results);
  
  // If results is empty or undefined
  if (!results || results.length === 0) {
    contentElement.innerHTML = '<p>No claims found to fact check on this page.</p>';
    updateStatus('Completed - No claims found');
    factCheckInProgress = false;
    return;
  }
  
  // Clear previous content
  contentElement.innerHTML = '';
  
  // Add results header
  const header = document.createElement('h2');
  header.textContent = 'Fact Check Results';
  header.style.margin = '0 0 16px 0';
  contentElement.appendChild(header);
  
  // Create container for claims
  const claimsContainer = document.createElement('div');
  claimsContainer.className = 'fact-check-container';
  
  // Process each claim
  results.forEach(claim => {
    // Default to pending if verified is not defined
    const isVerified = typeof claim.verified === 'boolean' ? claim.verified : null;
    const verificationClass = isVerified === null ? 'pending' : (isVerified ? 'verified-true' : 'verified-false');
    
    const claimElement = document.createElement('div');
    claimElement.className = `claim-item ${verificationClass}`;
    
    // Claim text
    const claimText = document.createElement('div');
    claimText.className = 'claim-text';
    claimText.textContent = claim.claim || 'Unknown claim';
    
    // Verification result
    const verification = document.createElement('div');
    verification.className = 'verification-result';
    const verificationSpan = document.createElement('span');
    
    if (isVerified === null) {
      verificationSpan.className = 'verification-pending';
      verificationSpan.textContent = 'Pending';
    } else {
      verificationSpan.className = isVerified ? 'verification-true' : 'verification-false';
      verificationSpan.textContent = isVerified ? 'True' : 'False';
    }
    
    verification.appendChild(document.createTextNode('Verification: '));
    verification.appendChild(verificationSpan);
    
    // Explanation
    const explanation = document.createElement('div');
    explanation.className = 'verification-explanation';
    explanation.textContent = claim.explanation || 'No explanation provided';
    
    // Source
    const source = document.createElement('div');
    source.className = 'verification-source';
    source.textContent = `Source: ${claim.source || 'Not specified'}`;
    
    // Add all elements to the claim item
    claimElement.appendChild(claimText);
    claimElement.appendChild(verification);
    claimElement.appendChild(explanation);
    claimElement.appendChild(source);
    
    // Add to container
    claimsContainer.appendChild(claimElement);
  });
  
  contentElement.appendChild(claimsContainer);
  updateStatus('Fact check completed');
  factCheckInProgress = false;
}