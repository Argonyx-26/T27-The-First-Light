import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { DocumentMetadata } from "@/types";
import {
  BookOpen,
  Upload,
  FileText,
  FileCode,
  File,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ShieldCheck,
  RefreshCw,
  Search,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";

export const TeacherMaterialsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [topic, setTopic] = useState<string>("Newton's Laws");
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch documents list
  const {
    data: docsData,
    isLoading: loadingDocs,
    error: docsError,
    refetch,
  } = useQuery({
    queryKey: ["ragDocuments"],
    queryFn: () => api.getDocuments(),
  });

  // Ingestion mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, topic }: { file: File; topic: string }) =>
      api.uploadDocument(file, topic),
    onSuccess: (data) => {
      setUploadSuccessMsg(data.message);
      setUploadErrorMsg(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["ragDocuments"] });
    },
    onError: (err: any) => {
      setUploadErrorMsg(err.message || "Failed to upload and ingest document.");
      setUploadSuccessMsg(null);
    },
  });

  // Deletion mutation
  const deleteMutation = useMutation({
    mutationFn: (docId: string) => api.deleteDocument(docId),
    onSuccess: () => {
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["ragDocuments"] });
    },
    onError: (err: any) => {
      setUploadErrorMsg(err.message || "Failed to delete document.");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadSuccessMsg(null);
      setUploadErrorMsg(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate({ file: selectedFile, topic });
  };

  const documents: DocumentMetadata[] = docsData?.documents || [];
  const totalPages = documents.reduce((sum, d) => sum + (d.page_count || 1), 0);
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="w-5 h-5 text-rose-500" />;
    if (ext === "md") return <FileCode className="w-5 h-5 text-indigo-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="space-y-8 py-4 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Curriculum Grounding Knowledge Base</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Study Materials &amp; RAG Ingestion
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Upload authoritative course textbooks, lecture notes, and syllabus readings. When students trigger a confirmed misconception, targeted remediation is mathematically grounded in your exact materials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-card">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Ingested Documents
              </span>
              <span className="text-2xl font-black text-slate-900">{documents.length}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-card">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Indexed Pages
              </span>
              <span className="text-2xl font-black text-slate-900">{totalPages}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-card">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Vector Chunks
              </span>
              <span className="text-2xl font-black text-slate-900">{totalChunks}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-card">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Grounding Engine
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-emerald-700">Active</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone Card */}
      <Card className="border border-border/80 shadow-card">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <span>Upload Course Material for Ingestion</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Supports PDF documents, plain text (.txt), and Markdown (.md). Documents are parsed page-by-page, chunked with context preservation, and embedded into local ChromaDB.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-4">
          {uploadSuccessMsg && (
            <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <AlertTitle className="font-semibold text-xs">Ingestion Complete</AlertTitle>
              <AlertDescription className="text-xs">{uploadSuccessMsg}</AlertDescription>
            </Alert>
          )}

          {uploadErrorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle className="font-semibold text-xs">Ingestion Error</AlertTitle>
              <AlertDescription className="text-xs">{uploadErrorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Document or Diagram (.pdf, .txt, .md, .png, .jpg)
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              {selectedFile && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Curriculum Topic / Unit
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Newton's Laws"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs"
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  <span>Processing &amp; Embedding...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 mr-2" />
                  <span>Ingest Material</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ingested Documents List */}
      <Card className="border border-border/80 shadow-card">
        <CardHeader className="p-5 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Ingested Curriculum Materials ({documents.length})</span>
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              ChromaDB persistent collection: <code>mm_remediation_knowledge</code>
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingDocs ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : docsError ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle className="font-semibold text-xs">Error Loading Documents</AlertTitle>
                <AlertDescription className="text-xs">
                  {(docsError as any).message || "Could not retrieve document list."}
                </AlertDescription>
              </Alert>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center space-y-3 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-900">No Documents Ingested Yet</p>
              <p className="text-xs max-w-md mx-auto">
                Upload your course notes, slides, or chapters above to enable citation-backed remediation for students.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-border text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Document Name</th>
                    <th className="py-3 px-4">Topic</th>
                    <th className="py-3 px-4">Pages</th>
                    <th className="py-3 px-4">Vector Chunks</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {documents.map((doc) => {
                    const isConfirmingDelete = deleteConfirmId === doc.id;
                    const dateStr = new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-900 flex items-center gap-2.5">
                          {getFileIcon(doc.filename)}
                          <div>
                            <span className="block">{doc.filename}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {(doc.file_size_bytes / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                            {doc.topic || "General"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {doc.page_count} {doc.page_count === 1 ? "page" : "pages"}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {doc.chunk_count} vectors
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {doc.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground">
                          {dateStr}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isConfirmingDelete ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[10px] text-rose-600 font-semibold">Delete?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => deleteMutation.mutate(doc.id)}
                                disabled={deleteMutation.isPending}
                              >
                                Yes
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(doc.id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RAG Architectural Safety & Pedagogical Callout */}
      <Card className="border border-border/80 shadow-card bg-slate-900 text-white">
        <CardContent className="p-6 sm:p-7 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pedagogical &amp; Prompt Security Guarantees</span>
          </div>

          <h3 className="text-xl font-bold tracking-tight text-white">
            Why RAG Grounding is Essential for Misconception Diagnosis
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 text-xs sm:text-sm text-slate-300">
            <div className="space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Zero Hallucinated Citations</span>
              </h4>
              <p className="leading-relaxed text-slate-400 text-xs">
                LLMs frequently fabricate plausible-sounding textbook quotes. In Misconception Mapper, citations and page numbers are managed strictly by deterministic metadata extracted directly from physical PDFs.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Page-Aware Attribution</span>
              </h4>
              <p className="leading-relaxed text-slate-400 text-xs">
                Students are not given generic advice; they are directed to the exact page (e.g. <em>Page 2: Inertia vs Force</em>) where the formal physics definition dispels their specific intuitive trap.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Prompt Injection Defense</span>
              </h4>
              <p className="leading-relaxed text-slate-400 text-xs">
                Uploaded texts are strictly isolated into passive reference blocks. Any embedded instructions (e.g. &apos;ignore previous instructions&apos;) are treated strictly as student subject matter, never as model commands.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
