// Background script for Groq Fact Checker

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Groq Fact Checker installed');
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processFactCheck') {
    // Handle fact check requests by forwarding to Groq API
    processFactCheck(message.content, message.apiKey, sender)
      .then(response => {
        // Send results back to content script
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'factCheckResults',
          results: response
        });
      })
      .catch(error => {
        console.error('Fact check error:', error);
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'factCheckError',
          error: error.message
        });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

// Process fact check by calling Groq API
async function processFactCheck(content, apiKey, sender) {
  try {
    // First extract claims from content
    const claims = await extractClaims(content, apiKey);
    
    // Send the extracted claims to content script to display while we fact check
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'claimsExtracted',
      claims: claims
    });
    
    // Then fact check each claim
    const factChecks = await factCheckClaims(claims, apiKey);
    
    return factChecks;
  } catch (error) {
    console.error('Error in processFactCheck:', error);
    throw error;
  }
}

// Extract claims from content using Groq Llama 4
async function extractClaims(content, apiKey) {
  console.log('Extracting claims...');
  
  try {
    const prompt = `You are an expert at identifying factual claims in text content. Your task is to extract the key factual claims from the provided content that should be fact-checked.

TASK:
1. Carefully read through the entire content.
2. Identify the most important factual claims that could be verified or disputed (e.g., statistics, historical events, scientific statements, attributions, etc.).
3. Focus on substantive claims that are central to the content's argument or narrative.
4. Ignore opinions, subjective statements, or rhetorical questions.
5. Return exactly 5-10 of the most significant claims that are worth fact-checking.
6. For each claim, extract just the claim itself, not surrounding context.
7. Make sure each claim stands alone and contains enough context to be checked.

CONTENT:
${content}

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "claims": [
    {
      "claim_id": 1,
      "claim": "The exact claim text as presented in the content"
    },
    {
      "claim_id": 2,
      "claim": "Another specific factual claim"
    }
    ... and so on
  ]
}`;
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const result = data.choices[0].message.content;
    
    // Try to extract JSON from the response
    try {
      // If the response contains a code block, extract it
      let jsonData;
      if (result.includes('```json')) {
        const jsonStr = result.split('```json')[1].split('```')[0].trim();
        jsonData = JSON.parse(jsonStr);
      } else if (result.includes('```')) {
        const jsonStr = result.split('```')[1].split('```')[0].trim();
        jsonData = JSON.parse(jsonStr);
      } else {
        jsonData = JSON.parse(result);
      }
      
      console.log('Extracted claims:', jsonData);
      return jsonData;
    } catch (e) {
      console.error('Error parsing claims response:', e);
      throw new Error('Failed to parse claims from model response.');
    }
  } catch (error) {
    console.error('Error in extractClaims:', error);
    throw error;
  }
}

// Fact check claims using Groq Compound
async function factCheckClaims(claimsData, apiKey) {
  console.log('Fact checking claims:', claimsData);
  
  try {
    const prompt = `You are an expert fact-checker using Groq's Compound model, which has access to current information via web search. Your task is to rigorously fact-check each claim with high accuracy and provide detailed explanations with reliable sources.

TASK:
1. For each claim provided, conduct thorough research using your web search capability.
2. Determine if each claim is TRUE or FALSE only (not "partially true").
3. Provide a detailed explanation (2-3 sentences) explaining your verification.
4. Cite specific, reliable sources you used to verify each claim.
5. Be balanced and objective in your assessment.

CLAIMS TO CHECK:
${JSON.stringify(claimsData)}

CRITICAL INSTRUCTIONS:
- You MUST respond ONLY with a valid JSON object in the exact format shown below.
- Do not include any text before or after the JSON.
- For "verified", use a boolean value (true or false).
- Do not use any other format or include explanatory text.

OUTPUT FORMAT:
{
  "fact_checks": [
    {
      "claim_id": 1,
      "claim": "The exact claim text",
      "verified": true,
      "explanation": "Your explanation of why the claim is true, with specific details from your research",
      "source": "Specific source"
    },
    {
      "claim_id": 2,
      "claim": "Another claim text",
      "verified": false,
      "explanation": "Your explanation of why the claim is false",
      "source": "Source"
    }
  ]
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'compound-beta',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 8000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const result = data.choices[0].message.content;
    
    // Try to extract JSON from the response
    try {
      console.log('Raw response from Compound:', result);
      
      // If the response contains a code block, extract it
      let jsonData;
      let jsonStr = '';
      
      if (result.includes('```json')) {
        jsonStr = result.split('```json')[1].split('```')[0].trim();
      } else if (result.includes('```')) {
        jsonStr = result.split('```')[1].split('```')[0].trim();
      } else {
        jsonStr = result.trim();
      }
      
      // Try to find a JSON object in the response
      try {
        jsonData = JSON.parse(jsonStr);
      } catch (jsonError) {
        console.error('Initial JSON parse error:', jsonError);
        
        // Try to find JSON in the string by looking for patterns
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extractedJsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
          try {
            jsonData = JSON.parse(extractedJsonStr);
          } catch (extractError) {
            console.error('Extracted JSON parse error:', extractError);
            throw new Error('Could not parse JSON from response');
          }
        } else {
          // If we still can't find valid JSON, create a basic structure
          // based on the prompt output - this is a fallback
          console.warn('Creating fallback fact check structure');
          return createFallbackFactCheckResults(result);
        }
      }
      
      console.log('Parsed fact check results:', jsonData);
      
      if (jsonData.fact_checks) {
        return jsonData.fact_checks;
      } else if (Array.isArray(jsonData)) {
        // Sometimes the model might return just an array of fact checks
        return jsonData;
      } else {
        // If we have a JSON object but not in the expected format
        console.warn('JSON found but not in expected format, creating fallback structure');
        return createFallbackFactCheckResults(result);
      }
    } catch (e) {
      console.error('Error parsing fact check response:', e, 'Raw result:', result);
      // Even if parsing fails, try to extract something useful
      return createFallbackFactCheckResults(result);
    }
  } catch (error) {
    console.error('Error in factCheckClaims:', error);
    throw error;
  }
}

// Create a fallback structure if we can't parse the JSON properly
function createFallbackFactCheckResults(rawResponse) {
  console.log('Creating fallback fact check results from raw text');
  
  // Try to find fact check information in the raw text
  const factChecks = [];
  let claimId = 1;
  
  // Split by claims/sections if possible
  const sections = rawResponse.split(/Claim \d+:|CLAIM \d+:|Fact Check \d+:|FACT CHECK \d+:/i);
  
  if (sections.length > 1) {
    // Process each section (skip the first if it's just intro text)
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i].trim();
      
      // Try to extract key information
      let claim = '';
      let verified = null;
      let explanation = '';
      let source = '';
      
      // Look for the claim
      const claimMatch = section.match(/["'](.+?)["']/);
      if (claimMatch) {
        claim = claimMatch[1];
      } else {
        // Take the first sentence as the claim
        const firstSentenceMatch = section.match(/^(.+?[.!?])\s/);
        if (firstSentenceMatch) {
          claim = firstSentenceMatch[1];
        } else {
          // Just take the first 100 characters
          claim = section.substring(0, 100).trim() + '...';
        }
      }
      
      // Check verification status
      if (
        section.toLowerCase().includes('true') || 
        section.toLowerCase().includes('verified') || 
        section.toLowerCase().includes('correct')
      ) {
        verified = true;
      } else if (
        section.toLowerCase().includes('false') || 
        section.toLowerCase().includes('not verified') || 
        section.toLowerCase().includes('incorrect')
      ) {
        verified = false;
      } else {
        // Default to false if unclear
        verified = false;
      }
      
      // Extract explanation - take the rest of the text
      explanation = section.replace(claim, '').trim();
      if (explanation.length > 200) {
        explanation = explanation.substring(0, 197) + '...';
      }
      
      // Look for source references
      const sourceMatch = section.match(/source:(.+?)(\.|$)/i);
      if (sourceMatch) {
        source = sourceMatch[1].trim();
      } else {
        source = 'Not specified';
      }
      
      factChecks.push({
        claim_id: claimId++,
        claim: claim,
        verified: verified,
        explanation: explanation,
        source: source
      });
    }
  } else {
    // If we can't split by claims, just create one generic fact check
    factChecks.push({
      claim_id: 1,
      claim: 'Extracted claim',
      verified: false,
      explanation: 'Could not properly parse fact check results. Please try again.',
      source: 'Error in processing'
    });
  }
  
  return factChecks;
}