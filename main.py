import gradio as gr
import os
import asyncio
import json
import requests
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure API keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

def fetch_article(url):
    """Fetch article content using Markdowner API"""
    response = requests.get(f"https://md.dhr.wtf/?url={url}")
    if response.status_code == 200:
        return response.text
    else:
        return f"Error fetching article: {response.status_code}"

def extract_claims(article_content):
    """Extract claims from article using Groq Llama model"""
    prompt = f"""from the following news article in a json object please extract all the key claims presented so that we may fact check them <article>{article_content}</article> return a json 
object {{"claim_id":x,"claim":claim_made}}"""

    completion = client.chat.completions.create(
        model="compound-beta",
        messages=[{"role": "user", "content": prompt}]
    )
    return completion.choices[0].message.content

def fact_check_claims(claims_json):
    """Fact check extracted claims using Groq Llama model"""
    prompt = f"fact check these claims put the final fact check in <fact_check> tags, each claim should state if it is true or false and why and include the source of the fact check and the original claim {claims_json}"

    completion = client.chat.completions.create(
        model="compound-beta",
        messages=[{"role": "user", "content": prompt}]
    )

    result = completion.choices[0].message.content
    fact_check = result.split("<fact_check>")[1].split("</fact_check>")[0] if "<fact_check>" in result else result
    return fact_check

def check_facts(url):
    """Process URL to extract and fact check claims"""
    # Update status
    yield "Fetching article content..."

    # Get article content
    article_content = fetch_article(url)
    if article_content.startswith("Error"):
        yield article_content
        return

    yield "Extracting claims from article..."

    # Extract claims
    claims_json = extract_claims(article_content)

    yield "Fact checking claims..."

    # Fact check claims
    fact_check_results = fact_check_claims(claims_json)

    # Return formatted results
    yield f"""
## Fact Check Results

{fact_check_results}

---
*Powered by Groq Llama and Markdowner API*
"""

# Create Gradio interface
with gr.Blocks() as demo:
    gr.Markdown("# 🔍 Fact Checker")
    gr.Markdown("Enter a URL to an article, and we'll extract claims and fact check them.")

    with gr.Row():
        url_input = gr.Textbox(label="Article URL", placeholder="https://example.com/article")
        check_button = gr.Button("Check Facts")

    output = gr.Markdown()

    check_button.click(check_facts, inputs=url_input, outputs=output)

if __name__ == "__main__":
    demo.launch()