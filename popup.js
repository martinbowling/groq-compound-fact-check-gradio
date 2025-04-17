document.addEventListener('DOMContentLoaded', () => {
  const checkFactsButton = document.getElementById('check-facts');
  const statusMessage = document.getElementById('status');
  const apiKeyWarning = document.getElementById('api-key-warning');
  const openOptionsLink = document.getElementById('open-options');
  const openSettingsLink = document.getElementById('open-settings');
  
  // Check if API key is set
  checkApiKey();
  
  // Event listeners
  checkFactsButton.addEventListener('click', startFactCheck);
  openOptionsLink.addEventListener('click', openOptions);
  openSettingsLink.addEventListener('click', openOptions);
  
  // Check if the API key is set
  function checkApiKey() {
    chrome.storage.local.get(['apiKey'], function(result) {
      if (!result.apiKey) {
        // API key not set, show warning
        apiKeyWarning.style.display = 'block';
        checkFactsButton.disabled = true;
        checkFactsButton.classList.add('disabled');
      } else {
        // API key is set, hide warning
        apiKeyWarning.style.display = 'none';
        checkFactsButton.disabled = false;
        checkFactsButton.classList.remove('disabled');
      }
    });
  }
  
  // Open options page to set API key
  function openOptions() {
    chrome.runtime.openOptionsPage();
  }
  
  // Start the fact check process
  async function startFactCheck() {
    statusMessage.textContent = 'Initiating fact checking...';
    
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we have an API key
      chrome.storage.local.get(['apiKey'], function(result) {
        if (!result.apiKey) {
          statusMessage.textContent = 'Error: API key not set. Please set it in settings.';
          return;
        }
        
        // Send message to content script to start fact check
        chrome.tabs.sendMessage(tab.id, { 
          action: 'startFactCheck',
          apiKey: result.apiKey
        });
        
        statusMessage.textContent = 'Fact check initiated! Check the overlay on the page.';
      });
    } catch (error) {
      statusMessage.textContent = `Error: ${error.message}. Try reloading the page.`;
    }
  }
});