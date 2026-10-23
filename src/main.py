import time
import os
from typing import List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

# Import text extraction utilities from src.app
from src.app import parse_pdf, parse_pptx, build_chunks, keyword_search

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document store
doc_store: List[Dict[str, Any]] = []

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class QuestionRequest(BaseModel):
    question: str

@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    global doc_store
    
    total_new_chunks = 0
    processed_files = []

    for file in files:
        file_ext = os.path.splitext(file.filename)[1].lower()
        contents = await file.read()
        
        if file_ext == ".pdf":
            raw_text = parse_pdf(contents)
        elif file_ext == ".pptx":
            raw_text = parse_pptx(contents)
        else:
            continue

        if not raw_text.strip():
            continue

        chunks = build_chunks(raw_text, doc_name=file.filename)
        doc_store.extend(chunks)
        total_new_chunks += len(chunks)
        processed_files.append(file.filename)

    if not processed_files:
        raise HTTPException(status_code=400, detail="No valid text found in uploaded file(s).")

    return {
        "message": "Files indexed successfully",
        "filenames": processed_files,
        "total_chunks_in_store": len(doc_store),
        "new_chunks_added": total_new_chunks,
    }

@app.post("/ask")
async def ask_question(payload: QuestionRequest):
    if not doc_store:
        raise HTTPException(status_code=400, detail="No document indexed yet. Please upload a file first.")
        
    relevant_chunks = keyword_search(payload.question, doc_store, top_k=3)
    
    context = ""
    sources_with_snippets = []
    for chunk in relevant_chunks:
        context += f"\n[{chunk['source']}]\n{chunk['text']}\n"
        sources_with_snippets.append({
            "source": chunk["source"],
            "snippet": chunk["text"]
        })
        
    system_prompt = (
        "You are DocuMind. Answer the user's question using ONLY the provided context snippets. "
        "Include the source reference (e.g. Slide X or Page Y) in your answer."
    )
    
    prompt = f"{system_prompt}\n\nRetrieved Context:\n{context}\n\nQuestion: {payload.question}"
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt
            )
            return {
                "answer": response.text, 
                "sources": sources_with_snippets
            }
        except Exception as e:
            if ("503" in str(e) or "UNAVAILABLE" in str(e)) and attempt < max_retries - 1:
                time.sleep(4)
                continue
            raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")