"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  Upload,
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Trash2,
  FileCheck,
  ChevronRight,
  BookOpen,
  Eye,
  X,
  History,
  PlusCircle,
} from "lucide-react";

interface SourceItem {
  source: string;
  snippet: string;
}

interface Message {
  sender: "user" | "ai";
  text: string;
  sources?: SourceItem[];
}

interface ChatSession {
  id: string;
  title: string;
  files: string[];
  messages: Message[];
  createdAt: string;
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Chat History Management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  
  const [question, setQuestion] = useState<string>("");
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Modal for inspecting source snippet
  const [activeSnippetModal, setActiveSnippetModal] = useState<SourceItem | null>(null);

  // Load chat history from localStorage on initial render
  useEffect(() => {
    const saved = localStorage.getItem("documind_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) setActiveSessionId(parsed[0].id);
      } catch (e) {
        console.error("Failed to parse saved sessions", e);
      }
    }
  }, []);

  // Save sessions to localStorage on changes
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("documind_sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Create a new blank session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: `Workspace #${sessions.length + 1}`,
      files: [],
      messages: [],
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // 1. Upload Multiple Files
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: selectedFiles[0].name,
        files: [],
        messages: [],
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      currentSessionId = newSession.id;
    }

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    setIsUploading(true);
    setUploadStatus("Uploading & indexing resources...");

    try {
      const res = await axios.post("http://127.0.0.1:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploadedNames: string[] = res.data.filenames;
      setUploadStatus(`Indexed ${res.data.new_chunks_added} chunks across ${uploadedNames.length} file(s)`);

      setSessions((prev) =>
        prev.map((session) => {
          if (session.id === currentSessionId) {
            const updatedFiles = Array.from(new Set([...session.files, ...uploadedNames]));
            const initialAiMsg: Message = {
              sender: "ai",
              text: `Indexed resource(s): **${uploadedNames.join(", ")}**. You can now query across all uploaded files!`,
            };
            return {
              ...session,
              files: updatedFiles,
              messages: [...session.messages, initialAiMsg],
            };
          }
          return session;
        })
      );
    } catch (err: any) {
      setUploadStatus("Upload failed. Make sure FastAPI server is running.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Ask Question
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !activeSessionId) return;

    const userText = question;
    setQuestion("");

    const userMsg: Message = { sender: "user", text: userText };

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s))
    );
    setIsAsking(true);

    try {
      const res = await axios.post("http://127.0.0.1:8000/ask", {
        question: userText,
      });

      const aiMsg: Message = {
        sender: "ai",
        text: res.data.answer,
        sources: res.data.sources,
      };

      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s))
      );
    } catch (err: any) {
      const errorMsg: Message = {
        sender: "ai",
        text: "⚠️ **Error:** Backend server communication error.",
      };
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s))
      );
    } finally {
      setIsAsking(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    localStorage.setItem("documind_sessions", JSON.stringify(updated));
    if (activeSessionId === id) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : "");
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Left Sidebar: Workspaces & Multi-file Upload */}
      <div className="w-80 border-r border-slate-800/80 p-5 flex flex-col justify-between bg-slate-900/40 backdrop-blur-xl">
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">DocuMind AI</h1>
            </div>
            <button
              onClick={createNewSession}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl transition cursor-pointer"
              title="New Topic Workspace"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Saved Topic Workspaces List */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Topic Workspaces
            </span>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2">No active workspace yet.</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition cursor-pointer border ${
                      s.id === activeSessionId
                        ? "bg-indigo-950/60 border-indigo-700/60 text-indigo-200"
                        : "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80"
                    }`}
                  >
                    <span className="truncate max-w-[170px] font-medium">{s.title}</span>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Multi-File Document Ingestion */}
          <form onSubmit={handleFileUpload} className="space-y-3 pt-2 border-t border-slate-800/80">
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Add Resources to Current Topic
            </label>
            <div className="relative group border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-2xl p-4 text-center transition bg-slate-900/50">
              <input
                type="file"
                multiple
                accept=".pdf,.pptx"
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-indigo-400 transition" />
                <span className="text-xs font-medium text-slate-300">
                  {selectedFiles && selectedFiles.length > 0
                    ? `${selectedFiles.length} file(s) selected`
                    : "Drop PDF or PPTX files here"}
                </span>
                <span className="text-[10px] text-slate-500">Hold Ctrl/Cmd to select multiple</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedFiles || selectedFiles.length === 0 || isUploading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Indexing Chunks...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Add Selected Resources</span>
                </>
              )}
            </button>
          </form>

          {/* Active Session Resources List */}
          {activeSession && activeSession.files.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Indexed Resources ({activeSession.files.length})
              </span>
              <div className="space-y-1">
                {activeSession.files.map((fname, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-indigo-300 truncate">
                    <FileCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{fname}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>FastAPI + Gemini 3.8</span>
          </div>
        </div>
      </div>

      {/* Right Main Chat Interface */}
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-950">
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 text-slate-500">
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-indigo-400">
                <BookOpen className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200">DocuMind Research Assistant</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload one or more files to start asking questions grounded directly in your documents.
                </p>
              </div>
            </div>
          ) : (
            activeSession.messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 max-w-3xl ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 border border-slate-700 text-indigo-400"
                  }`}
                >
                  {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="group relative space-y-2">
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none"
                    }`}
                  >
                    {msg.sender === "ai" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                  </div>

                  {/* Interactive Citation Badges */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 pl-1">
                      <span className="font-medium text-slate-500">Citations (click to inspect):</span>
                      {msg.sources.map((src, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSnippetModal(src)}
                          className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-indigo-400" />
                          <span>{src.source}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.sender === "ai" && (
                    <button
                      onClick={() => copyToClipboard(msg.text, index)}
                      className="opacity-0 group-hover:opacity-100 transition absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                      title="Copy Answer"
                    >
                      {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {isAsking && (
            <div className="flex items-center gap-3 text-slate-400 text-xs animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <span>Searching chunks & generating grounded response...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleAskQuestion} className="mt-4">
          <div className="relative flex items-center bg-slate-900/90 border border-slate-800 focus-within:border-indigo-500/80 rounded-2xl p-1.5 transition shadow-xl">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question across your indexed resources..."
              className="flex-1 bg-transparent px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAsking || !question.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Snippet Inspector Modal */}
      {activeSnippetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <BookOpen className="w-4 h-4" />
                <span>Source Passage: {activeSnippetModal.source}</span>
              </div>
              <button
                onClick={() => setActiveSnippetModal(null)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl text-xs text-slate-300 font-mono leading-relaxed max-h-60 overflow-y-auto border border-slate-800">
              {activeSnippetModal.snippet}
            </div>
            <div className="text-right">
              <button
                onClick={() => setActiveSnippetModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl text-slate-200 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}