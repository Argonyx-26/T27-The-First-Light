import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Library,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  Sparkles,
  BookOpen,
  Trash2,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";
import { api } from "@/api/client";
import { useSession } from "@/context/SessionContext";
import { DocumentMetadata, UploadProgressEvent } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";

const STAGES = [
  { key: "uploading", label: "Uploading", percent: 25 },
  { key: "extracting", label: "Extracting", percent: 50 },
  { key: "chunking", label: "Chunking", percent: 75 },
  { key: "indexing", label: "Indexing", percent: 95 },
  { key: "ready", label: "Ready", percent: 100 },
];

export const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { resumeSession } = useSession();

  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgressEvent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Scoped quizzing state
  const [activeQuizDocId, setActiveQuizDocId] = useState<string | null>(null);
  const [chapterInput, setChapterInput] = useState("");
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(3);
  const [quizModal, setQuizModal] = useState<{
    docId: string;
    filename: string;
    scope: "all" | "chapter";
    chapterName?: string;
  } | null>(null);

  // Preview modal / drawer
  const [previewDoc, setPreviewDoc] = useState<{ id: string; filename: string; text: string } | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const maxSizeBytes = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSizeBytes) {
        setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 500MB.`);
        setSelectedFile(null);
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({
      stage: "uploading",
      progress: 15,
      message: "Initiating upload to multimodal RAG pipeline...",
    });

    try {
      const result = await api.uploadDocumentWithProgress(
        selectedFile,
        topicInput.trim() || undefined,
        (progressEvent) => {
          setUploadProgress(progressEvent);
        }
      );

      if (result.stage === "failed") {
        throw new Error(result.message || "Ingestion failed.");
      }

      setUploadProgress({
        stage: "ready",
        progress: 100,
        message: result.message || "Document successfully ingested and indexed!",
      });

      setSelectedFile(null);
      setTopicInput("");
      await fetchDocuments();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setUploadError(err.message || "Failed to process document.");
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm("Are you sure you want to remove this document from the library?")) return;
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (previewDoc?.id === docId) setPreviewDoc(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const startQuiz = async (docId: string, scope: "all" | "chapter", chapterName?: string, count: number = selectedQuestionCount) => {
    setIsStartingQuiz(true);
    setQuizError(null);
    try {
      const quizRes = await api.generateDocQuiz({
        document_id: docId,
        scope,
        chapter_or_topic: chapterName || undefined,
        count: count,
      });

      setQuizModal(null);
      await resumeSession(quizRes.session_id);
      navigate("/quiz");
    } catch (err: any) {
      console.error("Failed to generate doc quiz:", err);
      setQuizError(err.message || "Failed to start quiz from document.");
      setIsStartingQuiz(false);
    }
  };

  const getStageIndex = (stageKey?: string) => {
    if (!stageKey) return -1;
    return STAGES.findIndex((s) => s.key === stageKey);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center space-x-2.5">
            <Library className="w-7 h-7 text-primary" />
            <span>Document Library &amp; Scoped Quizzing</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload course notes and textbooks to generate targeted diagnostic quizzes grounded in your study materials.
          </p>
        </div>
      </div>

      {/* Upload Zone with Real Stage Progress */}
      <Card className="border border-border/80 bg-white shadow-2xs">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-indigo-600" />
            <span>Upload Document to Multimodal RAG Pipeline</span>
          </h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Select File (.pdf, .txt, .md, .png, .jpg)</span>
                  <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Up to 500MB</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer border rounded-lg p-1.5 border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Topic / Subject (Optional)
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  disabled={isUploading}
                  placeholder="e.g. Classical Mechanics, Thermodynamics"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
            </div>

            {/* Real Progress Stepper */}
            {isUploading && uploadProgress && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    Live Ingestion Progress
                  </span>
                  <span className="font-bold text-indigo-600">
                    {uploadProgress.progress}%
                  </span>
                </div>

                <Progress value={uploadProgress.progress} indicatorClassName="bg-indigo-600" />

                {/* Stepper Dots */}
                <div className="grid grid-cols-4 gap-2 pt-1 text-[11px]">
                  {STAGES.slice(0, 4).map((stage, idx) => {
                    const currentIdx = getStageIndex(uploadProgress.stage);
                    const isPassed = currentIdx > idx;
                    const isCurrent = currentIdx === idx;

                    return (
                      <div
                        key={stage.key}
                        className={`flex items-center space-x-1.5 p-1.5 rounded-lg border transition ${
                          isCurrent
                            ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold"
                            : isPassed
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-medium"
                            : "bg-white border-slate-200 text-slate-400"
                        }`}
                      >
                        {isPassed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                        )}
                        <span className="truncate">{stage.label}</span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-600 italic">
                  {uploadProgress.message}
                </p>
              </div>
            )}

            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center space-x-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="font-semibold text-white bg-primary hover:bg-primary/90 text-xs px-5 h-9"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  <span>Processing Document...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                  <span>Upload &amp; Index</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Library View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Indexed Document Library ({documents.length})</span>
          </h2>
        </div>

        {quizError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {quizError}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
            <span>Loading document library...</span>
          </div>
        ) : documents.length === 0 ? (
          <Card className="border border-dashed border-border bg-slate-50/50 text-center">
            <CardContent className="p-10 space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">
                No documents in library
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload your study materials above to unlock grounded and scoped diagnostic quizzes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="border border-border/80 bg-white shadow-2xs hover:border-border transition"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Doc Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <h3 className="font-bold text-slate-900 text-base">
                          {doc.filename}
                        </h3>
                        {doc.topic && (
                          <Badge variant="secondary" className="text-[11px] font-semibold">
                            {doc.topic}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold"
                        >
                          Ready
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                        <span>{doc.page_count} page{doc.page_count !== 1 ? "s" : ""}</span>
                        <span>•</span>
                        <span>{doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""} indexed</span>
                        <span>•</span>
                        <span>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-xs text-slate-400 hover:text-rose-600 self-start sm:self-auto h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      <span>Delete</span>
                    </Button>
                  </div>

                  {/* Document Preview (First-page excerpt) */}
                  {doc.preview_excerpt && (
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                        First-Page Preview Excerpt:
                      </span>
                      <p className="text-slate-600 font-serif leading-relaxed line-clamp-2">
                        &ldquo;{doc.preview_excerpt}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Scoped Quizzing Actions */}
                  <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        disabled={isStartingQuiz}
                        onClick={() => setQuizModal({ docId: doc.id, filename: doc.filename, scope: "all" })}
                        className="text-xs font-semibold text-white bg-primary hover:bg-primary/90 h-8"
                      >
                        <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                        <span>Quiz Me: Whole Document</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isStartingQuiz}
                        onClick={() => setActiveQuizDocId(activeQuizDocId === doc.id ? null : doc.id)}
                        className="text-xs font-semibold h-8"
                      >
                        <Search className="w-3.5 h-3.5 mr-1.5" />
                        <span>Quiz Me: Chapter / Topic</span>
                      </Button>
                    </div>

                    <span className="text-[11px] text-muted-foreground">
                      Grounded via Multimodal RAG
                    </span>
                  </div>

                  {/* Scoped Chapter Input Drawer */}
                  <AnimatePresence>
                    {activeQuizDocId === doc.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 border-t border-dashed border-border"
                      >
                        <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-2.5">
                          <label className="block text-xs font-bold text-indigo-900">
                            Enter Chapter or Topic to Scope Retrieval:
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={chapterInput}
                              onChange={(e) => setChapterInput(e.target.value)}
                              placeholder="e.g. Chapter 2, Sorting Algorithms, Chemical Bonds"
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              disabled={!chapterInput.trim() || isStartingQuiz}
                              aria-label="Generate Scoped Quiz"
                              onClick={() => startQuiz(doc.id, "chapter", chapterInput.trim(), selectedQuestionCount)}
                              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white h-8"
                            >
                              {isStartingQuiz ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <span>Generate ({selectedQuestionCount} Qs)</span>
                              )}
                            </Button>
                          </div>

                          <div className="flex items-center space-x-2 pt-1">
                            <span className="text-[11px] font-semibold text-indigo-900">Questions:</span>
                            {[3, 5, 10, 15].map((cnt) => (
                              <button
                                key={cnt}
                                type="button"
                                onClick={() => setSelectedQuestionCount(cnt)}
                                className={`px-2.5 py-0.5 rounded text-xs font-semibold transition ${
                                  selectedQuestionCount === cnt
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                                }`}
                              >
                                {cnt}
                              </button>
                            ))}
                          </div>

                          <p className="text-[11px] text-indigo-700">
                            Uses existing vector retriever to match chunks specifically covering this chapter.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Question Count Selection Modal */}
      {quizModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Generate Diagnostic Quiz
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Document: <span className="font-semibold text-slate-700">{quizModal.filename}</span>
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Number of Questions
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSelectedQuestionCount(cnt)}
                    className={`py-2 px-3 rounded-xl text-sm font-bold border transition ${
                      selectedQuestionCount === cnt
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <span className="text-xs text-slate-600 font-medium">Or custom count:</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={selectedQuestionCount}
                  onChange={(e) => setSelectedQuestionCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 3)))}
                  className="w-20 px-2 py-1 text-xs border rounded-lg font-bold text-center focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Questions will be synthesized directly from this document&apos;s indexed chunks. Remediation for errors will cite exact pages and excerpts.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuizModal(null)}
                disabled={isStartingQuiz}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isStartingQuiz}
                onClick={() => startQuiz(quizModal.docId, quizModal.scope, quizModal.chapterName, selectedQuestionCount)}
                className="text-xs font-bold bg-primary hover:bg-primary/90 text-white"
              >
                {isStartingQuiz ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    <span>Preparing Quiz...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    <span>Start Quiz ({selectedQuestionCount} Qs)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
