# 💡 DocuMind AI — Interactive Visual RAG Research Assistant

DocuMind AI is a full-stack, retrieval-augmented generation (RAG) platform designed to parse, index, and query multi-format documents (`.pdf` and `.pptx`). It empowers users to extract grounded insights backed by interactive source citations, ensuring responses are directly tied to source material.

---

## ✨ Key Features

* **Multi-Format Ingestion:** Seamlessly parses PDF documents and PowerPoint presentations into semantic chunks.
* **Grounded RAG Engine:** Leverages Google's `gemini-3.8-flash` model combined with keyword-based context retrieval to ensure accurate, cited answers.
* **Interactive Source Inspector:** Modal popovers allow users to inspect the exact document passage used to generate each response.
* **Multi-Resource Workspaces:** Upload multiple files into custom, named workspaces to query across entire topic collections.
* **Persistent Chat History:** Client-side workspace state and conversation history persist across sessions using `localStorage`.
* **Polished Modern UI:** Glassmorphism dashboard built with Next.js 16, Tailwind CSS, Lucide icons, and Markdown rendering.

---

## 🛠️ Tech Stack

### Backend
* **Framework:** FastAPI (Python)
* **LLM Orchestration:** `google-genai` (Gemini 3.8 Flash)
* **Document Processing:** `pypdf`, `python-pptx`
* **Server:** Uvicorn

### Frontend
* **Framework:** Next.js 16 (Turbopack, React 19)
* **Styling:** Tailwind CSS
* **Icons & Rendering:** Lucide React, `react-markdown`, `remark-gfm`
* **HTTP Client:** Axios

---

## 🚀 Getting Started Locally

### Prerequisites
* Python 3.10 or higher
* Node.js 18 or higher
* Google Gemini API Key

### 1. Backend Setup

```bash
# Clone the repository
git clone [https://github.com/Bala-Ilak/documind-ai.git](https://github.com/Bala-Ilak/documind-ai.git)
cd documind-ai

# Set up virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env

# Start FastAPI server
uvicorn src.main:app --reload --port 8000