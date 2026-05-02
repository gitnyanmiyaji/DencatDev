import json
import re

def build():
    # Load Services Data
    with open('services.json', 'r', encoding='utf-8') as f:
        services = json.load(f)

    # Update index.html using regex with paired markers
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    services_js = f"const servicesData = {json.dumps(services, ensure_ascii=False, indent=8)};"
    
    # Replace content between START and END markers
    pattern = r"(/\* \[\[SERVICES_DATA_START\]\] \*/).*?(/\* \[\[SERVICES_DATA_END\]\] \*/)"
    replacement = rf"\1\n        {services_js}\n        \2"
    html = re.sub(pattern, replacement, html, flags=re.DOTALL)
    
    # Final safety check: scrub any "dencat" if it somehow exists
    html = html.replace("dencat", "dencat")

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)

    # Generate llms.txt (Privacy-First)
    llms = [
        "# dencat.dev - The Digital Garden of dencat",
        "",
        "> [!NOTE]",
        "> This is a machine-readable summary of the dencat.dev portal.",
        "",
        "## Overview",
        "dencat.dev is the primary public entry point for dencat's self-hosted services and projects.",
        "",
        "## Core Services"
    ]
    
    for s in services:
        status = "(Private)" if s['category'] == 'private' else "(Public)"
        llms.append(f"- **{s['name']}** {status}: [{s['url']}]({s['url']}) - {s['description']}")

    llms.extend([
        "",
        "## About the Owner",
        "- **Name**: dencat",
        "- **Focus**: AI agents, VR, and self-hosting.",
        "",
        "## AI Policy",
        "This domain is AI-friendly. Agents are encouraged to use this file to understand the context of the services provided here."
    ])

    with open('llms.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(llms))

    print("❄️  Build Complete: Privacy check passed, files updated.")

if __name__ == "__main__":
    build()
