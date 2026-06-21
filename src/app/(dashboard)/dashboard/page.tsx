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

  useEffect(() => {
    const activeId = localStorage.getItem("activeWorkspaceId");
    setWorkspaceId(activeId);

    const interval = setInterval(() => {
      const currentId = localStorage.getItem("activeWorkspaceId");
      if (currentId !== workspaceId) {
        setWorkspaceId(currentId);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetchPapers();
      fetchClusters();
      fetchGaps();
    }
  }, [workspaceId]);

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
        let errMsg = "Failed to upload file";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = `Server error (${res.status}): Failed to process the upload.`;
        }
        setUploadError(errMsg);
      } else {
        const newPaper = await res.json();
        setPapers((prev) => [newPaper, ...prev]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      setUploadError("Upload connection failed. Please check your network connection.");
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

  const totalPapers = papers.length;
  const processingPapers = papers.filter((p) => p.status === "PROCESSING" || p.status === "PENDING").length;
  const completedPapers = papers.filter((p) => p.status === "COMPLETED").length;
  const totalClusters = clusters.length;
  const totalGaps = gaps.length;

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Literature Intelligence Dashboard</h1>
          <p className="text-gray-500 mt-1">Upload papers, track processing pipeline, and extract insights.</p>
        </div>

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
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center gap-2 shadow-md shadow-green-200/60 hover:shadow-green-300/50 hover:scale-[1.02] duration-200 transition-all hover:from-green-600 hover:to-emerald-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading PDF...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                Upload Paper (PDF)
              </>
            )}
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="glass-card border-green-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Papers</CardTitle>
            <FileText className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalPapers}</div>
            <p className="text-xs text-gray-400 mt-1.5">{completedPapers} processed successfully</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-green-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Processing</CardTitle>
            <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{processingPapers}</div>
            <p className="text-xs text-gray-400 mt-1.5">Papers in background queue</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-green-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Thematic Clusters</CardTitle>
            <Layers className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalClusters}</div>
            <p className="text-xs text-gray-400 mt-1.5">Categorized themes mapped</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-green-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Research Gaps</CardTitle>
            <Lightbulb className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalGaps}</div>
            <p className="text-xs text-gray-400 mt-1.5">AI-detected opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Paper List Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border border-green-100 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg">My Literature Repository</CardTitle>
              <CardDescription className="text-gray-500">List of uploaded research papers and parsing status.</CardDescription>
            </CardHeader>
            <CardContent>
              {papers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-green-100 rounded-xl text-gray-400">
                  <UploadCloud className="h-10 w-10 text-green-200 mb-3 animate-bounce" />
                  <p className="text-sm font-medium text-gray-500">No research papers in this workspace yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Upload a PDF above to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto pr-1">
                  {papers.map((paper) => (
                    <div key={paper.id} className="py-3 px-3 hover:bg-green-50/60 rounded-lg transition-colors flex items-center justify-between gap-4 stagger-item">
                      <div className="min-w-0">
                        {paper.status === "COMPLETED" ? (
                          <Link href={`/papers/${paper.id}`} className="font-semibold text-gray-900 hover:text-green-700 transition-colors hover:underline text-sm md:text-base block truncate">
                            {paper.title}
                          </Link>
                        ) : (
                          <span className="font-semibold text-gray-500 text-sm md:text-base block truncate">
                            {paper.title}
                          </span>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
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
                          className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
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
          <Card className="bg-white border border-green-100 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-green-600" /> Semantic Literature Search
              </CardTitle>
              <CardDescription className="text-gray-500">Query vector space using natural language RAG model.</CardDescription>
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
                <Button type="submit" disabled={isSearching} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md">
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </form>

              {/* Results */}
              <div className="mt-6 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {searchResults.length > 0 ? (
                  searchResults.map((result, idx) => (
                    <div key={idx} className="p-3 bg-green-50/60 border border-green-100 rounded-lg text-xs hover:border-green-300 transition-colors duration-200 stagger-item">
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <Link href={`/papers/${result.paperId}`} className="font-bold text-gray-900 hover:text-green-700 hover:underline truncate flex-1">
                          {result.paper?.title}
                        </Link>
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 shrink-0">
                          {Math.round(result.similarity * 100)}% match
                        </Badge>
                      </div>
                      <p className="text-gray-500 capitalize font-medium mb-1">Section: {result.label}</p>
                      <p className="text-gray-400 leading-relaxed italic">&ldquo;{truncate(result.distance === 0 ? "Perfect match context text" : "Match found in paper sections...", 120)}&rdquo;</p>
                    </div>
                  ))
                ) : (
                  searchQuery && !isSearching && (
                    <p className="text-gray-400 text-center py-4 text-xs">No matching passages found.</p>
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
