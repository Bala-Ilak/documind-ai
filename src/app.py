import os
import chromadb
from dotenv import load_dotenv
from google import genai

print("Initializing DocuMind...")

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is missing! Check your .env file.")

client = genai.Client(api_key=api_key)

# In-memory document storage for bulletproof execution on Windows
doc_store = []

def load_pptx_document(pptx_path):
    from pptx import Presentation
    prs = Presentation(pptx_path)
    extracted_chunks = []
    for i, slide in enumerate(prs.slides):
        slide_text = ""
        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    if paragraph.text.strip():
                        slide_text += paragraph.text.strip() + " "
        if slide_text.strip():
            extracted_chunks.append({"text": slide_text.strip(), "source": f"Slide {i + 1}"})
    return extracted_chunks

def load_pdf_document(pdf_path):
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    extracted_chunks = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            extracted_chunks.append({"text": text.strip(), "source": f"Page {i + 1}"})
    return extracted_chunks

def load_document(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Could not find '{file_path}'. Check your file location.")
    if file_path.endswith(".pdf"):
        return load_pdf_document(file_path)
    elif file_path.endswith(".pptx"):
        return load_pptx_document(file_path)
    else:
        raise ValueError("Unsupported format! Use .pdf or .pptx")

def index_document(file_path):
    global doc_store
    print(f"Parsing document: {file_path}...")
    chunks = load_document(file_path)
    
    print(f"Extracted {len(chunks)} text chunks.")
    if len(chunks) == 0:
        print("WARNING: No text found in document.")
        return False
        
    doc_store = chunks
    print(f"Successfully loaded {len(doc_store)} chunks into memory!\n")
    return True

# Smart keyword and relevance search across document chunks
def retrieve_relevant_chunks(question, top_k=3):
    words = [w.lower() for w in question.split() if len(w) > 2]
    scored_chunks = []
    
    for chunk in doc_store:
        text_lower = chunk["text"].lower()
        score = sum(text_lower.count(w) for w in words)
        scored_chunks.append((score, chunk))
        
    # Sort by relevance score
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    # Return top K matches
    return [c[1] for c in scored_chunks[:top_k]]

def ask_documind(question):
    relevant_chunks = retrieve_relevant_chunks(question, top_k=3)
    
    context = ""
    for chunk in relevant_chunks:
        context += f"\n[{chunk['source']}]\n{chunk['text']}\n"
        
    system_prompt = (
        "You are DocuMind. Answer the user's question using ONLY the provided context snippets. "
        "Include the source reference (e.g. Slide X or Page Y) in your answer."
    )
    
    prompt = f"{system_prompt}\n\nRetrieved Context:\n{context}\n\nQuestion: {question}"
    
    try:
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Gemini API Error: {e}"

file_name = "sample.pptx"

if index_document(file_name):
    print("Type your question below (or type 'exit' to quit):\n")
    while True:
        user_query = input("You: ")
        if user_query.lower() in ["exit", "quit", "q"]:
            print("Exiting DocuMind session. Goodbye!")
            break
        if not user_query.strip():
            continue
            
        answer = ask_documind(user_query)
        print(f"\nDocuMind Answer:\n{answer}\n")
        print("-" * 50 + "\n")