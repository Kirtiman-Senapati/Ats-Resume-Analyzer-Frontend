import { useState, useEffect } from "react";
import axios from "axios";
import constants, {
  buildPresenceChecklist,
  METRIC_CONFIG,
  JOB_MATCH_METRICS,
} from "./constants.js";
import * as pdfjslib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
import mammoth from "mammoth";

pdfjslib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ==========================================
// 📗 AXIOS CONFIGURATION
// ==========================================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ||'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  }
});

function App() {
  // State management
  const [APIReady, setAPIReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [Analysis, setAnalysis] = useState(null);
  const [ResumeText, setResumeText] = useState("");
  const [PresenceChecklist, setPresenceChecklist] = useState([]);
  const [mode, setMode] = useState("analyzer");
  const [jobDescription, setJobDescription] = useState("");
  const [jobMatchResult, setJobMatchResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // ==========================================
  // ⚡ CHECK BACKEND API
  // ==========================================
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await api.get('/api/health');
        
        if (response.data.status === 'ok') {
          setAPIReady(true);
          console.log(`✅ Backend ready: ${response.data.provider}`);
        }
      } catch (error) {
        console.error('❌ Backend unavailable:', error.message);
        setAPIReady(false);
      }
    };
    
    checkBackend();
    
    const interval = setInterval(() => {
      if (!APIReady) checkBackend();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [APIReady]);


  // ==========================================
  // 📄 PDF EXTRACTION
  // ==========================================
  const extractPDFText = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjslib.getDocument({ data: arrayBuffer }).promise;
      const texts = await Promise.all(
        Array.from({ length: pdf.numPages }, (_, i) =>
          pdf.getPage(i + 1).then((page) =>
            page.getTextContent().then((tc) =>
              tc.items.map((item) => item.str).join("  ")
            )
          )
        )
      );
      return texts.join("\n").trim();
    } catch (error) {
      console.error("PDF error:", error);
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  };


 // ==========================================
  // 📝 WORD EXTRACTION
  // ==========================================
  const extractWordText = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    } catch (error) {
      console.error("Word error:", error);
      throw new Error(`Word extraction failed: ${error.message}`);
    }
  };

  // Parse JSON response from AI

  /* const parseJsonResponse = (reply) => {
    try {
      if (!reply) {
        throw new Error("Empty response from AI");
      }

      console.log("AI Response:", reply);

      const match = reply.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(match[0]);

      if (!parsed.overallScore && !parsed.matchPercentage && !parsed.error) {
        throw new Error("Invalid AI response format - missing required fields");
      }

      return parsed;
    } catch (err) {
      console.error("Parse error:", err);
      console.error("Original reply:", reply);
      throw new Error(`Failed to parse AI response: ${err.message}`);
    }
  }; */

 
 
  // ==========================================
  // 🤖 ANALYZE RESUME
  // ==========================================
  const analyzeResume = async (text) => {
    try {
      if (!text || text.trim().length < 50) {
        throw new Error("Resume text too short");
      }

      console.log("📤 Calling backend API...");

      const response = await api.post('/api/analyze-resume', {
        resumeText: text,
        prompt: constants.ANALYZE_RESUME_PROMPT,
      });

      console.log("📥 Response:", response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Analysis failed');
      }

      return response.data.data;
      
    } catch (error) {
      console.error("❌ Analysis error:", error);
      
      if (error.response) {
        throw new Error(error.response.data.error || 'Backend error');
      } else if (error.request) {
        throw new Error('Backend not responding. Check if server is running on port 5000.');
      } else {
        throw error;
      }
    }
  };

  // ==========================================
  // 🎯 MATCH JOB
  // ==========================================
  const matchResumeWithJob = async (resumeText, jobDesc) => {
    try {
      if (!resumeText || resumeText.trim().length < 50) {
        throw new Error("Resume text too short");
      }

      if (!jobDesc || jobDesc.trim().length < 50) {
        throw new Error("Job description too short");
      }

      console.log("📤 Sending match request...");

      const response = await api.post('/api/match-job', {
        resumeText: resumeText,
        jobDescription: jobDesc,
        prompt: constants.JOB_MATCH_PROMPT,
      });

      console.log("📥 Match response:", response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Match failed');
      }

      return response.data.data;
      
    } catch (error) {
      console.error("❌ Match error:", error);
      
      if (error.response) {
        throw new Error(error.response.data.error || 'Backend error');
      } else if (error.request) {
        throw new Error('Backend not responding');
      } else {
        throw error;
      }
    }
  };



// ==========================================
  // 🆕 PROCESS FILE/HANDEL FILE Functon
  // ==========================================
  const processFile = async (file) => {
    if (!file) return;

    console.log("File:", file.name, file.type);

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload PDF or Word (.docx) only");
      return;
    }

    if (!APIReady) {
      alert("Backend not ready. Please wait a moment and try again ...");
      return;
    }

    setUploadedFile(file);
    setIsLoading(true);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);
    setJobMatchResult(null);
    setShowResults(false);
    
    
    try {
      let text = "";

      if (file.type === "application/pdf") {
        console.log("Extracting PDF...");
        text = await extractPDFText(file);
      } else {
        console.log("Extracting Word...");
        text = await extractWordText(file);
      }

      console.log(`Extracted: ${text.length} chars`);

      if (!text || text.trim().length < 50) {
        throw new Error("Not enough text extracted");
      }

      setResumeText(text);

      if (mode === "analyzer") {
        console.log("Building checklist...");
        setPresenceChecklist(buildPresenceChecklist(text));

        console.log("Analyzing...");
        const analysisResult = await analyzeResume(text);
        console.log("Analysis done!");

        setAnalysis(analysisResult);
      } else {
        if (!jobDescription.trim()) {
          throw new Error("Enter job description first!");
        }

        console.log("Matching...");
        const matchResult = await matchResumeWithJob(text, jobDescription);
        console.log("Match done!");

        setJobMatchResult(matchResult);
      }

      setShowResults(true);
    } catch (err) {
      console.error("Error:", err);
      alert(`Error: ${err.message}`);
      reset();
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 📤 FILE UPLOAD
  // ==========================================
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    await processFile(file);
  };

  // ==========================================
  // 🆕 DRAG & DROP
  // ==========================================
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };


   // ==========================================
  // 🔄 RESET
  // ==========================================
  const reset = () => {
    setUploadedFile(null);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);
    setJobMatchResult(null);
    setShowResults(false);
  };

// ==========================================
  // 🎨 HELPER FUNCTIONS
  // ==========================================
  const getMatchLevelColor = (level) => {
    switch (level) {
      case "excellent": return "text-green-400";
      case "good": return "text-blue-400";
      case "fair": return "text-yellow-400";
      case "poor": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const getMatchLevelEmoji = (level) => {
    switch (level) {
      case "excellent": return "🎉";
      case "good": return "👍";
      case "fair": return "⚠️";
      case "poor": return "❌";
      default: return "❓";
    }
  };

  const getScoreColor = (score) => {
    const numScore = parseInt(score);
    if (numScore >= 8) return "text-green-400";
    if (numScore >= 6) return "text-blue-400";
    if (numScore >= 4) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBadgeColor = (score) => {
    const numScore = parseInt(score);
    if (numScore >= 8) return "bg-green-500/80";
    if (numScore >= 6) return "bg-blue-500/80";
    if (numScore >= 4) return "bg-yellow-500/80";
    return "bg-red-500/80";
  };



  // ==========================================
  // 🖼️ JSX RENDER
  // ==========================================


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-cyan-400 to-cyan-300 px-8 py-3 mb-4 rounded-lg">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black tracking-tight">
              ATS RESUME OPTIMIZER
            </h1>
          </div>
          <p className="text-gray-300 text-base">
            Analyze your resume or match it with a job description
          </p>
        </div>

       {/* BACKEND STATUS */}

        {!APIReady && (
          <div className="text-center mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-400 font-semibold">
              ⏳ Connecting to backend... (Port 5000)
            </p>
            <p className="text-yellow-300 text-sm mt-2">
              Make sure your backend server is running: <code>node server.js</code>
            </p>
          </div>
        )}


        {/* MODE SELECTOR */}
        
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => {setMode("analyzer");
                reset();
              }}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              mode === "analyzer"
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
              }`}
            >
              📊 Resume Analyzer
            </button>

            {/* Matcher Button */}
            <button
              onClick={() => {setMode("matcher");reset();}}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              mode === "matcher"
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
              }`}
            >
              🎯 Job Matcher

            </button>

          </div>
        

        {/* JOB DESCRIPTION INPUT (Matcher Mode Only) */}
        {mode === "matcher" && !showResults &&  (
          <div className="bg-slate-800/80 border border-cyan-600/50 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-3">
              📝 Enter  Job Description
            </h3>

            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Enter the complete job description here..."
              className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-gray-400 text-sm mt-2">
              💡 Tip: Include requirements, skills, and responsibilities for
              best results
            </p>
          </div>
        )}

        {/* File Upload Section/ /* UPLOAD AREA  */}

        {!showResults && (
          <div className={`bg-slate-800/60 border-2 border-dashed border-cyan-600/50 rounded-xl p-12 text-center hover:border-cyan-500 transition-all shadow-lg shadow-cyan-900/20 ${
              isDragging ? "border-cyan-400 bg-cyan-500/10" : ""
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            >
          
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center">
             <span className="text-4xl">📄</span>
            </div>
            <h3 className="text-2xl text-gray-200 mb-2">Upload Your Resume</h3>
            <p className=" text-lg text-gray-400 mb-6">

              PDF or Word documents (.doc, .docx) supported
            </p>

            {/* choose file button */}
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
              disabled={!APIReady || isLoading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className= "btn-primary inline-block"
              >
              Choose File

            </label>

            {!APIReady && (
                <p className="text-red-400 mt-4 font-semibold">
                  ⚠️ Backend not ready. Please start your server.
                </p>
              )}

          </div>
          
        )}
        {/* LOADING STATE */}
        {isLoading && (
          
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-600/30 rounded-xl p-12 text-center">

            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>

            <h3 className="text-2xl text-white mb-3 font-bold">
              Analyzing Resume
            </h3>
            
            <p className="text-gray-300">
              Please wait while AI reviews your resume...
            </p>
          </div>
        )}


        {/* Resume Analysis Results after uploading file amd loading screen main dashboard  */}
        {showResults && mode === "analyzer" && Analysis && (
          <div className="space-y-6">

            {/* File Info */}
            <div className="file-info-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">📄</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {uploadedFile?.name}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {ResumeText.length} characters analyzed
                  </p>
                </div>
              </div>
              <button onClick={reset} className="btn-secondary">
                Upload New
              </button>
            </div>
            
            {/* Overall Score Card - Matching screenshot design */}
            <div className="bg-gradient-to-br from-teal-900/60 via-blue-900/60 to-indigo-900/60 border border-slate-700 rounded-2xl p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-4xl">🏆</span>
                <h2 className="text-3xl font-bold text-white">Overall Score</h2>
              </div>
              <div
                className={`text-9xl font-extrabold mb-6 ${getScoreColor(
                  Analysis.overallScore
                )}`}
              >
                {Analysis.overallScore}
              </div>
              <div
                className={`inline-block px-8 py-3 rounded-full font-bold text-xl ${getScoreBadgeColor(
                  Analysis.overallScore
                )} text-white mb-4`}
              >
                📋{" "}
                {parseInt(Analysis.overallScore) >= 7
                  ? "Good Job!"
                  : "Needs Improved"}
              </div>
              <p className="text-gray-300 text-base mt-6">
                Score based on quantity, formatting, and keyword usage
              </p>
            </div>

            {/* Top Strengths & Main Improvements - Side by side */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Strengths */}
              <div className="bg-gradient-to-br from-teal-900/50 to-teal-800/50 border border-teal-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">💪</span>
                  <h3 className="text-2xl font-bold text-teal-300 uppercase">
                    Top Strengths
                  </h3>
                </div>
                <div className="space-y-3">
                  {Analysis.strengths?.map((item, i) => (
                    <div
                      key={i}
                      className="bg-teal-900/40 rounded-xl p-4 border border-teal-700/30 hover:border-teal-600/50 transition-all"
                    >
                      <div className="flex items-start gap-3 text-gray-100">
                        <span className="text-teal-400 text-xl font-bold mt-0.5">
                          •
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Improvements */}
              <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border border-orange-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">⚡</span>
                  <h3 className="text-2xl font-bold text-orange-300 uppercase">
                    Main Improvements
                  </h3>
                </div>
                <div className="space-y-3">
                  {Analysis.improvements?.map((item, i) => (
                    <div
                      key={i}
                      className="bg-orange-900/40 rounded-xl p-4 border border-orange-700/30 hover:border-orange-600/50 transition-all"
                    >
                      <div className="flex items-start gap-3 text-gray-100">
                        <span className="text-orange-400 text-xl font-bold mt-0.5">
                          •
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📋</span>
                <h3 className="text-2xl font-bold text-white">
                  Executive Summary
                </h3>
              </div>
              <p className="text-gray-300 leading-relaxed text-lg">
                {Analysis.summary}
              </p>
            </div>

            {/* Performance Metrics */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl">📊</span>
                <h3 className="text-2xl font-bold text-white">
                  Performance Matrics
                </h3>
              </div>
              <div className="space-y-6">
                {METRIC_CONFIG.map((metric, i) => {
                  const value =
                    Analysis.performanceMetrics?.[metric.key] ||
                    metric.defaultValue;
                  return (
                    <div key={i} className="group/item">
                      <div className="flex justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{metric.icon}</span>
                          <span className="text-gray-200 font-semibold text-lg">
                            {metric.label}
                          </span>
                        </div>
                        <span className="text-cyan-400 font-bold text-xl">
                          {value}/10
                        </span>
                      </div>
                      <div className="h-4 bg-slate-900/70 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className={`h-full bg-gradient-to-br ${metric.colorClass} transition-all duration-1000 shadow-lg ${metric.shadowClass}`}
                          style={{ width: `${(value / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resume Insights */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl">🔍</span>
                <h3 className="text-2xl font-bold text-purple-400">
                  Resume Insights
                </h3>
              </div>

              {/* Action Items */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🎯</span>
                  <h4 className="text-xl font-bold text-red-400">
                    Action Items
                  </h4>
                </div>
                <div className="space-y-3">
                  {Analysis.actionItems?.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-gray-100 bg-slate-900/60 p-4 rounded-xl border border-slate-700 hover:border-red-600/50 transition-all"
                    >
                      <span className="text-red-400 text-xl font-bold mt-0.5">
                        •
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro Tips */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💡</span>
                  <h4 className="text-xl font-bold text-yellow-400">
                    Pro Tips
                  </h4>
                </div>
                <div className="space-y-3">
                  {Analysis.proTips?.map((tip, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-gray-100 bg-slate-900/60 p-4 rounded-xl border border-slate-700 hover:border-yellow-600/50 transition-all"
                    >
                      <span className="text-yellow-400 text-xl font-bold mt-0.5">
                        •
                      </span>
                      <span className="leading-relaxed">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ATS Optimization */}
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-purple-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl">🤖</span>
                <h3 className="text-2xl font-bold text-purple-300">
                  ATS Optimization
                </h3>
              </div>

              {/* What is ATS? */}
              <div className="bg-indigo-900/60 border border-indigo-700/50 rounded-xl p-5 mb-8">
                <h4 className="text-xl font-bold text-white mb-3">
                  What is ATS?
                </h4>
                <p className="text-gray-200 leading-relaxed">
                  An ATS resume is a resume that has been optimized to pass
                  through an Applicant Tracking System (ATS), which is software
                  used by companies to screen job applications. To be
                  ATS-friendly, a resume needs a simple format, standard
                  headings, and relevant keywords from the job description to
                  ensure the software can read it and rank it as a good match
                  for the role. Fancy formatting, graphics, or tables can
                  confuse the ATS and cause the resume to be rejected, even if a
                  human would have found it qualified.
                </p>
              </div>

              {/* ATS Compatibility Checklist */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">🤖</span>
                  <h4 className="text-xl font-bold text-white">
                    ATS Compatibility Checklist
                  </h4>
                </div>
                <div className="space-y-3">
                  {PresenceChecklist.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700 hover:border-purple-600/50 transition-all"
                    >
                      {item.present ? (
                        <span className="text-green-400 text-2xl">✅</span>
                      ) : (
                        <span className="text-red-400 text-2xl">❌</span>
                      )}
                      <span className="text-gray-100 font-medium">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Keywords */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🔑</span>
                <h3 className="text-2xl font-bold text-cyan-400">
                  Recommended Keywords
                </h3>
              </div>
              <div className="flex flex-wrap gap-3 mb-6">
                {Analysis.keywords?.map((kw, i) => (
                  <span
                    key={i}
                    className="px-5 py-2.5 bg-blue-600/30 border border-blue-500/50 text-blue-200 rounded-xl text-base font-semibold hover:bg-blue-600/40 transition-all"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <div className="flex items-start gap-3 bg-slate-900/60 p-5 rounded-xl border border-slate-700">
                <span className="text-yellow-400 text-2xl">💡</span>
                <p className="text-gray-200 leading-relaxed">
                  Consider incorporating these keywords naturally into your
                  resume/cv to improve ATS compatibility and increase Your
                  chances for getting Job in company by Recruiters.
                </p>
              </div>
            </div>

            {/* Reset Button */}
            <div className="text-center pt-4">
              <button
                onClick={reset}
                className="px-10 py-4 bg-gradient-to-br from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40"
              >
                🔄 Analyze Another Resume
              </button>
            </div>
          </div>
        )}

        {/* Job Match Results */}
        {showResults && mode === "matcher" && jobMatchResult && (
          <div className="space-y-6">
            {/* Match Score Card */}
            <div className="bg-gradient-to-br from-teal-900/60 via-blue-900/60 to-indigo-900/60 border border-slate-700 rounded-2xl p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-4xl">
                  {getMatchLevelEmoji(jobMatchResult.matchLevel)}
                </span>
                <h2 className="text-3xl font-bold text-white">Match Score</h2>
              </div>
              <div className="text-9xl font-extrabold text-cyan-400 mb-6">
                {jobMatchResult.matchPercentage}%
              </div>
              <div
                className={`inline-block px-8 py-3 rounded-full font-bold text-xl capitalize ${getMatchLevelColor(
                  jobMatchResult.matchLevel
                )} bg-slate-800/60 border border-slate-700 mb-4`}
              >
                {jobMatchResult.matchLevel} Match
              </div>
              <p className="text-gray-300 text-base mt-6 max-w-2xl mx-auto">
                {jobMatchResult.overallAssessment}
              </p>
            </div>

            {/* NEW: Executive Summary Section */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📋</span>
                <h3 className="text-2xl font-bold text-white">
                  Executive Summary
                </h3>
              </div>
              <p className="text-gray-300 leading-relaxed text-lg">
                {jobMatchResult.executiveSummary ||
                  jobMatchResult.overallAssessment}
              </p>
            </div>

            {/* Matching & Missing Skills */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 border border-green-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">✅</span>
                  <h3 className="text-2xl font-bold text-green-300">
                    Matching Skills
                  </h3>
                </div>
                <div className="space-y-3">
                  {jobMatchResult.matchingSkills?.map((skill, i) => (
                    <div
                      key={i}
                      className="bg-green-900/40 rounded-xl p-4 border border-green-700/30"
                    >
                      <div className="flex items-start gap-3 text-gray-100">
                        <span className="text-green-400 text-xl">✓</span>
                        <span>{skill}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-900/50 to-red-800/50 border border-red-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">❌</span>
                  <h3 className="text-2xl font-bold text-red-300">
                    Missing Skills
                  </h3>
                </div>
                <div className="space-y-3">
                  {jobMatchResult.missingSkills?.map((skill, i) => (
                    <div
                      key={i}
                      className="bg-red-900/40 rounded-xl p-4 border border-red-700/30"
                    >
                      <div className="flex items-start gap-3 text-gray-100">
                        <span className="text-red-400 text-xl">✗</span>
                        <span>{skill}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Match Breakdown */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl">📊</span>
                <h3 className="text-2xl font-bold text-white">
                  Detailed Match Breakdown
                </h3>
              </div>
              <div className="space-y-6">
                {JOB_MATCH_METRICS.map((metric, i) => {
                  let value =
                    jobMatchResult.detailedBreakdown?.[metric.key] ||
                    metric.defaultValue;

                  // FIX: If the value is greater than 10, it means AI returned it out of 100, so divide by 10
                  if (value > 10) {
                    value = Math.round(value / 10);
                  }

                  // Ensure value is between 1-10
                  value = Math.max(1, Math.min(10, value));

                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{metric.icon}</span>
                          <span className="text-gray-200 font-semibold text-lg">
                            {metric.label}
                          </span>
                        </div>
                        <span className="text-cyan-400 font-bold text-xl">
                          {value}/10
                        </span>
                      </div>
                      <div className="h-4 bg-slate-900/70 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className={`h-full bg-gradient-to-br ${metric.colorClass} transition-all duration-1000`}
                          style={{ width: `${(value / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Weaknesses for This Job */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-teal-900/50 to-teal-800/50 border border-teal-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">💪</span>
                  <h3 className="text-2xl font-bold text-teal-300">
                    Strengths for This Job
                  </h3>
                </div>
                <div className="space-y-3">
                  {jobMatchResult.strengthsForThisJob?.map((strength, i) => (
                    <div
                      key={i}
                      className="bg-teal-900/40 rounded-xl p-4 border border-teal-700/30"
                    >
                      <div className="flex items-start gap-3 text-gray-100">
                        <span className="text-teal-400 text-xl">•</span>
                        <span>{strength}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border border-orange-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">⚠️</span>
                  <h3 className="text-2xl font-bold text-orange-300">
                    Areas of Concern
                  </h3>
                </div>

                <div className="space-y-3">
                  {jobMatchResult.weaknessesForThisJob?.map((weakness, i) => (
                    <div
                      key={i}
                      className="bg-orange-900/40 rounded-xl p-4 border border-orange-700/30"
                    >
                      <div className="flex items-start gap-3 text-gray-100">
                        <span className="text-orange-400 text-xl">•</span>
                        <span>{weakness}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">💡</span>
                <h3 className="text-2xl font-bold text-yellow-400">
                  Recommendations
                </h3>
              </div>
              <div className="space-y-3">
                {jobMatchResult.recommendations?.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-gray-100 bg-slate-900/60 p-4 rounded-xl border border-slate-700 hover:border-yellow-600/50 transition-all"
                  >
                    <span className="text-yellow-400 text-xl font-bold">•</span>
                    <span className="leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <div className="text-center pt-4">
              <button
                onClick={reset}
                className="px-10 py-4 bg-gradient-to-br from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-cyan-500/30"
              >
                🔄 Analyze Another Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
