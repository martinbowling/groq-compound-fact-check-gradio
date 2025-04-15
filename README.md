# Groq Compound Fact Checker

A web application that uses Groq's Compound model to extract and fact-check claims from news articles. Built with Gradio for a user-friendly interface.

## Features

- Extract key claims from news articles
- Fact-check claims using Groq's Compound model
- Clean and intuitive web interface
- Real-time processing with progress updates
- Access to real-time information through web search
- Intelligent claim verification with source attribution

## About the Compound Model

This application leverages Groq's `compound-beta` model, an advanced AI system that combines the power of Llama 4 and Llama 3.3 70b models with agentic tooling capabilities. The model can:

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

- Python 3.8 or higher
- Groq API key
- Virtual environment (recommended)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/martinbowling/groq-compound-fact-check-gradio.git
cd groq-compound-fact-check-gradio
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

3. Install required packages:
```bash
pip install gradio groq python-dotenv requests
```

4. Create a `.env` file in the project root and add your Groq API key:
```
GROQ_API_KEY=your_api_key_here
```

## Usage

1. Start the application:
```bash
python main.py
```

2. Open your web browser and navigate to the URL shown in the terminal (typically http://127.0.0.1:7860)

3. Enter a news article URL in the input field and click "Check Facts"

4. The application will:
   - Fetch the article content
   - Extract key claims
   - Fact-check each claim using real-time information
   - Display the results with sources and explanations

## How It Works

1. **Article Fetching**: Uses the Markdowner API to extract clean text from news articles
2. **Claim Extraction**: Uses Groq's Compound model to identify key claims from the article
3. **Fact Checking**: 
   - Uses Groq's Compound model to verify each claim
   - Automatically searches for current information
   - Cross-references multiple sources
   - Provides detailed explanations with sources
4. **User Interface**: Built with Gradio for a seamless user experience

## License

This project is open source and available under the MIT License.

## Author

- Martin Bowling ([@martinbowling](https://github.com/martinbowling))

## Acknowledgments

- [Groq](https://groq.com/) for providing the AI models and agentic tooling capabilities
- [Gradio](https://gradio.app/) for the web interface framework
- [Markdowner API](https://md.dhr.wtf/) for article text extraction