// Save options to chrome.storage
function saveOptions() {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter a valid Groq API key.', 'error');
    return;
  }
  
  if (!apiKey.startsWith('gsk_')) {
    showStatus('API key should start with "gsk_". Please check your key.', 'error');
    return;
  }
  
  chrome.storage.local.set(
    { apiKey: apiKey },
    function() {
      // Update status to let user know options were saved
      showStatus('Settings saved successfully!', 'success');
      
      // Test the API key
      testApiKey(apiKey);
    }
  );
}

// Test if the API key is valid
function testApiKey(apiKey) {
  // Update status
  showStatus('Testing API key...', 'normal');
  
  // Make a simple request to Groq API
  fetch('https://api.groq.com/openai/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // Check if compound-beta is available
    const hasCompound = data.data && data.data.some(model => model.id === 'compound-beta');
    
    if (hasCompound) {
      showStatus('API key is valid and has access to Compound model!', 'success');
    } else {
      showStatus('API key is valid, but Compound model may not be available.', 'success');
    }
  })
  .catch(error => {
    console.error('Error testing API key:', error);
    showStatus(`Error testing API key: ${error.message}`, 'error');
  });
}

// Restore options from chrome.storage
function restoreOptions() {
  chrome.storage.local.get(
    { apiKey: '' },
    function(items) {
      document.getElementById('apiKey').value = items.apiKey;
    }
  );
}

// Show status message
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status';
  
  if (type) {
    status.classList.add(type);
  }
  
  status.style.display = 'block';
  
  // Clear the status message after 3 seconds if it's a success message
  if (type === 'success') {
    setTimeout(function() {
      status.style.display = 'none';
    }, 3000);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);