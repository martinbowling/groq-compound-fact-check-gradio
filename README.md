# Groq Compound Fact Checker Chrome Extension

A Chrome extension that uses Groq's Compound model to extract and fact-check claims from web pages in real-time.

## Features

- Extract key claims from web pages you're browsing
- Fact-check claims using Groq's Compound model
- Clean and intuitive overlay UI
- Real-time processing with progress updates
- Access to real-time information through web search
- Intelligent claim verification with source attribution

## About the Compound Model

This extension leverages Groq's `compound-beta` model, an advanced AI system that combines the power of Llama 4 and Llama 3.3 70b models with agentic tooling capabilities. The model can:

- Access real-time information through web search
- Execute code for data analysis
- Provide up-to-date fact-checking results
- Automatically source and verify information

The `compound-beta` model is particularly well-suited for fact-checking because it can:
- Search for current information to verify claims
- Cross-reference multiple sources
- Provide detailed explanations with sources
- Handle complex, multi-part claims

## Prerequisites

- Chrome browser
- Groq API key (starts with `gsk_`) with access to the Compound model

## Installation

1. Clone the repository:
```bash
git clone https://github.com/martinbowling/groq-compound-fact-check-chrome-extension.git
```

2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right
4. Click "Load unpacked" and select the `groq-compound-fact-check-chrome-extension` directory
5. The extension icon should appear in your browser toolbar
6. Click on the extension icon and then click "Settings" to open the options page
7. Enter your Groq API key and save the settings

## Usage

1. Navigate to any news article or web page
2. Click the Groq Fact Checker extension icon in your toolbar
3. Click "Check Facts on This Page" in the popup
4. An overlay will appear on the page showing:
   - Extracted claims from the page
   - Verification status (True/False) for each claim
   - Detailed explanation with sources

## How It Works

1. **Content Extraction**: Converts HTML page content to markdown format
2. **Claim Extraction**: Uses Groq's Compound model to identify key claims from the content
3. **Fact Checking**: 
   - Uses Groq's Compound model to verify each claim
   - Automatically searches for current information
   - Cross-references multiple sources
   - Provides detailed explanations with sources
4. **User Interface**: Modern overlay UI that appears on the page

## Development

To modify the extension:
1. Edit the files in the extension directory
2. Reload the extension in `chrome://extensions/` by clicking the refresh icon

## License

This project is open source and available under the MIT License.

## Author

- Martin Bowling ([@martinbowling](https://github.com/martinbowling))

## Acknowledgments

- [Groq](https://groq.com/) for providing the AI models and agentic tooling capabilities
- [Gradio](https://gradio.app/) for the backend API framework