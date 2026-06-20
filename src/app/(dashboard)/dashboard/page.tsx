"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Layers, 
  Lightbulb, 
  UploadCloud, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  Search,
  CheckCircle,
  Clock,
  Settings,
  Trash2
} from "lucide-react";
import { getStatusColor, formatDate, truncate } from "@/lib/utils";
import Link from "next/link";

interface Paper {
  id: string;
  title: string;
  authors: string | null;
  year: number | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
}

interface Cluster {
  id: string;
  clusterName: string;
}

interface Gap {
  id: string;
  gapTitle: string;
  confidenceScore: number;
}

export default function DashboardPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read workspaceId from localStorage on mount & update on storage changes
  useEffect(() => {
    const activeId = localStorage.getItem("activeWorkspaceId");
    setWorkspaceId(activeId);

    // Poll for changes in activeWorkspaceId to keep workspaces synced
    const interval = setInterval(() => {
      const currentId = localStorage.getItem("activeWorkspaceId");
      if (currentId !== workspaceId) {
        setWorkspaceId(currentId);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [workspaceId]);

  // Load paper, cluster, and gap lists
  useEffect(() => {
    if (workspaceId) {
      fetchPapers();
      fetchClusters();
      fetchGaps();
    }
  }, [workspaceId]);

  // If papers are in PENDING or PROCESSING, poll them to update status in real-time
  useEffect(() => {
    const hasProcessing = papers.some((p) => p.status === "PENDING" || p.status === "PROCESSING");
    if (hasProcessing && workspaceId) {
      const timeout = setTimeout(() => {
        fetchPapers();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [papers, workspaceId]);

  const fetchPapers = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/papers?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setPapers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClusters = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/clusters?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setClusters(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGaps = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/gaps?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setGaps(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;

    if (!file.name.endsWith(".pdf")) {
      setUploadError("Only PDF files are supported");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("workspaceId", workspaceId);

    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        setUploadError(errData.error || "Failed to upload file");
      } else {
        const newPaper = await res.json();
        setPapers((prev) => [newPaper, ...prev]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      setUploadError("Upload connection failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!confirm("Are you sure you want to delete this paper?")) return;
    try {
      const res = await fetch(`/api/papers/${paperId}`, { method: "DELETE" });
      if (res.ok) {
        setPapers((prev) => prev.filter((p) => p.id !== paperId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery || !workspaceId) return;

    setIsSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, workspaceId }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Stats
  const totalPapers = papers.length;
  const processingPapers = papers.filter((p) => p.status === "PROCESSING" || p.status === "PENDING").length;
  const completedPapers = papers.filter((p) => p.status === "COMPLETED").length;
  const totalClusters = clusters.length;
  const totalGaps = gaps.length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Literature Intelligence Dashboard</h1>
          <p className="text-slate-400 mt-1">Upload papers, track processing pipeline, and extract insights.</p>
        </div>
        
        {/* Upload Button overlay */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="application/pdf"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !workspaceId}
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-[1.02] duration-200 transition-all"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Uploading PDF...
              </>
            ) : (
              <>
                <UploadCloud className="h-4.5 w-4.5" />
                Upload Paper (PDF)
              </>
            )}
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/20 text-red-400 text-sm font-medium">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Papers</CardTitle>
            <FileText className="h-5 w-5 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalPapers}</div>
            <p className="text-xs text-slate-500 mt-1.5">{completedPapers} processed successfully</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Processing</CardTitle>
            <Clock className="h-5 w-5 text-purple-400 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{processingPapers}</div>
            <p className="text-xs text-slate-500 mt-1.5">Papers in background queue</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Thematic Clusters</CardTitle>
            <Layers className="h-5 w-5 text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalClusters}</div>
            <p className="text-xs text-slate-500 mt-1.5">Categorized themes mapped</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Research Gaps</CardTitle>
            <Lightbulb className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalGaps}</div>
            <p className="text-xs text-slate-500 mt-1.5">AI-detected opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Paper List Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/50 border-slate-800/80 shadow-xl backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-white text-lg">My Literature Repository</CardTitle>
              <CardDescription className="text-slate-400">List of uploaded research papers and parsing status.</CardDescription>
            </CardHeader>
            <CardContent>
              {papers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500">
                  <UploadCloud className="h-10 w-10 text-slate-600 mb-3 animate-bounce" />
                  <p className="text-sm font-medium">No research papers in this workspace yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Upload a PDF above to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-900/60 max-h-[500px] overflow-y-auto pr-1">
                  {papers.map((paper) => (
                    <div key={paper.id} className="py-3 px-3 hover:bg-slate-900/40 rounded-lg transition-colors flex items-center justify-between gap-4 stagger-item">
                      <div className="min-w-0">
                        {paper.status === "COMPLETED" ? (
                          <Link href={`/papers/${paper.id}`} className="font-semibold text-white hover:text-indigo-400 transition-colors hover:underline text-sm md:text-base block truncate">
                            {paper.title}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-400 text-sm md:text-base block truncate">
                            {paper.title}
                          </span>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-550">
                          <span className="truncate max-w-[150px] md:max-w-[250px]">
                            {paper.authors ? `By ${truncate(paper.authors, 40)}` : "Unknown authors"}
                          </span>
                          <span>&bull;</span>
                          <span>{paper.year || "N/A"}</span>
                          <span>&bull;</span>
                          <span>Uploaded {formatDate(paper.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={getStatusColor(paper.status)}>
                          {paper.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePaper(paper.id)}
                          className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-slate-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Semantic Search Panel */}
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800/80 shadow-xl backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-indigo-400" /> Semantic Literature Search
              </CardTitle>
              <CardDescription className="text-slate-400">Query vector space using natural language RAG model.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="E.g., Federated learning limitations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="submit" disabled={isSearching} className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-650 hover:to-purple-650 text-white shadow-md hover:shadow-indigo-500/10">
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </form>

              {/* Results */}
              <div className="mt-6 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {searchResults.length > 0 ? (
                  searchResults.map((result, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-lg text-xs hover:border-slate-700/60 transition-colors duration-200 stagger-item">
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <Link href={`/papers/${result.paperId}`} className="font-bold text-white hover:text-indigo-400 hover:underline truncate flex-1">
                          {result.paper?.title}
                        </Link>
                        <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shrink-0">
                          {Math.round(result.similarity * 100)}% match
                        </Badge>
                      </div>
                      <p className="text-slate-400 capitalize font-medium mb-1">Section: {result.label}</p>
                      <p className="text-slate-500 leading-relaxed italic">&ldquo;{truncate(result.distance === 0 ? "Perfect match context text" : "Match found in paper sections...", 120)}&rdquo;</p>
                    </div>
                  ))
                ) : (
                  searchQuery && !isSearching && (
                    <p className="text-slate-500 text-center py-4 text-xs">No matching passages found.</p>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
