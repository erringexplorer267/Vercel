import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  X,
  Bot,
  User,
  Upload,
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";

// ----------------------------------------------------
// 🛠️ API KEY and CLIENT INITIALIZATION
// ----------------------------------------------------

// Read the key from the environment variable set up in .env.local
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Check if the key is available
if (!GEMINI_API_KEY) {
  console.error(
    "FATAL ERROR: VITE_GEMINI_API_KEY is not set. Please check your .env.local file."
  );
  // We will handle this error inside the component to render a useful message.
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// ----------------------------------------------------

const AIChatbotInterface = () => {
  // ----------------------------------------------------
  // STATE & REFS
  // ----------------------------------------------------
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  // NOTE: Attached files are not yet fully supported in this simplified chat logic.
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Render a "key missing" error message if the key is missing
  useEffect(() => {
    if (!GEMINI_API_KEY && messages.length === 1) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          text: "API Error: The Gemini API key is missing. Please check your **.env.local** file and console for details.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // ... (Your useEffect for speech recognition and auto-scroll remains the same)

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join("");

        setInputText(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleListening = () => {
    // ... (toggleListening logic remains the same)
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleFileAttachment = (event) => {
    const files = Array.from(event.target.files);
    // NOTE: File upload requires conversion to Base64/Part format for the Gemini API.
    // For now, we only store the file objects, but they are not sent to the API yet.
    setAttachedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ----------------------------------------------------
  // 🌟 CORRECTED sendMessage FUNCTION 🌟
  // ----------------------------------------------------
  const sendMessage = async () => {
    // Prevent sending if no text and no files are provided, or if the API client isn't ready
    if (!ai || (!inputText.trim() && attachedFiles.length === 0)) return;

    // 1. Prepare and Add User Message
    const userMessageText = inputText;
    const newMessage = {
      id: Date.now(),
      text: userMessageText,
      sender: "user",
      timestamp: new Date(),
      // Only include file metadata for display, not the raw object
      files:
        attachedFiles.length > 0
          ? attachedFiles.map((f) => ({ name: f.name, size: f.size }))
          : null,
    };

    // Update messages array and clear input/attachments immediately
    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    setAttachedFiles([]);
    setIsTyping(true); // Show typing indicator

    try {
      // 2. Format Conversation History for the API
      // Map over previous messages to structure them for the 'history' option.
      const chatHistory = messages
        .slice(1) // Skip the initial welcome message
        .filter((msg) => msg.text) // Ensure messages have text
        .map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }], // Note: Files would also go here as 'parts'
        }));

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: chatHistory,
      });

      // 3. Construct the message content (for now, text only)
      let messageContent = [userMessageText];

      // NOTE: If you uncomment file handling later, you'd add image/file parts here:
      /*
            if (attachedFiles.length > 0) {
                 const fileParts = await Promise.all(attachedFiles.map(fileToGenerativePart));
                 messageContent = [...messageContent, ...fileParts];
            }
            */

      // 4. Send the new message to the Gemini API
      const result = await chat.sendMessage({ message: messageContent });

      const botResponseText = result.text.trim();

      // 5. Add Bot Response
      const botResponse = {
        id: Date.now() + 1,
        text: botResponseText,
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      // Display an error message to the user
      const errorResponse = {
        id: Date.now() + 1,
        text: "Sorry, I ran into an error. Please check the browser console for details.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false); // Hide typing indicator
    }
  };
  // ----------------------------------------------------

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ----------------------------------------------------
  // RENDER LOGIC
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header, Messages Container, and Input Area remain the same */}

      {/* ... (The rest of your JSX template) ... */}

      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI Assistant</h1>
            <p className="text-gray-400 text-sm">
              Powered by advanced AI technology
            </p>
          </div>
          <div className="ml-auto">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "bot" && (
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`max-w-[70%] ${
                  message.sender === "user" ? "order-1" : ""
                }`}
              >
                <div
                  className={`p-4 rounded-2xl ${
                    message.sender === "bot" ? (
                      <ReactMarkdown className="text-sm leading-relaxed prose prose-invert max-w-none">
                        {message.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    )
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>

                  {/* Displaying File Metadata (if any) */}
                  {message.files && (
                    <div className="mt-3 space-y-2">
                      {message.files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-xs bg-black/20 rounded-lg p-2"
                        >
                          <Paperclip size={14} />
                          <span>{file.name}</span>
                          {/* The file object on the message might just be metadata now, check size access */}
                          {file.size && (
                            <span className="text-gray-400">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>

              {message.sender === "user" && (
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-4 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 text-sm"
                >
                  <Paperclip size={14} />
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            {/* File Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors flex-shrink-0"
              title="Attach files"
            >
              <Paperclip size={20} />
            </button>

            {/* Voice Input Button */}
            <button
              onClick={toggleListening}
              className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
              title={isListening ? "Stop recording" : "Start voice input"}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (or use voice input)"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows="1"
                style={{ minHeight: "52px", maxHeight: "120px" }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() && attachedFiles.length === 0}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl transition-colors flex-shrink-0"
              title="Send message"
            >
              <Send size={20} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileAttachment}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
          />
        </div>
      </div>
    </div>
  );
};

export default AIChatbotInterface;
