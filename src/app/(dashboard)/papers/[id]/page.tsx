"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  Database, 
  ExternalLink, 
  FileText, 
  Layers, 
  Loader2, 
  Sparkles,
  AlertTriangle,
  Lightbulb,
  FileCode,
  Clock
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface PaperSection {
  id: string;
  sectionType: "RESEARCH_QUESTION" | "METHODOLOGY" | "DATASET" | "KEY_FINDINGS" | "LIMITATION" | "FUTURE_WORK";
  content: string;
}

interface Paper {
  id: string;
  title: string;
  authors: string | null;
  abstract: string | null;
  year: number | null;
  journal: string | null;
  doi: string | null;
  pdfUrl: string | null;
  status: string;
  createdAt: string;
  sections: PaperSection[];
  clusters: { id: string; clusterName: string; color: string }[];
  workspace: { id: string; name: string; userId: string };
}

export default function PaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarPapers, setSimilarPapers] = useState<any[]>([]);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPaperDetail();
    }
  }, [params.id]);

  useEffect(() => {
    if (paper && paper.abstract) {
      fetchSimilarPapers();
    }
  }, [paper]);

  const fetchPaperDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/papers/${params.id}`);
      if (!res.ok) {
        throw new Error("Failed to load paper details");
      }
      const data = await res.json();
      setPaper(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSimilarPapers = async () => {
    if (!paper || !paper.abstract) return;
    setIsSearchingSimilar(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: paper.abstract,
          workspaceId: paper.workspace.id,
          limit: 4,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Filter out this paper itself
        const filtered = data.filter((item: any) => item.paperId !== paper.id);
        setSimilarPapers(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingSimilar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
        <p>Loading literature intelligence...</p>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-slate-400 text-center max-w-md mx-auto">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
        <p className="font-semibold text-white">Load Error</p>
        <p className="text-sm text-slate-500 mt-1">{error || "Literature metadata not found."}</p>
        <Button onClick={() => router.push("/dashboard")} className="mt-6 bg-slate-900 border border-slate-800 text-white">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const getSectionContent = (type: string) => {
    return paper.sections.find((s) => s.sectionType === type)?.content || "Not explicitly stated";
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header and Back */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Button onClick={() => router.push("/dashboard")} variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Workspace
        </Button>
        {paper.pdfUrl && (
          <a href={paper.pdfUrl} target="_blank" rel="noreferrer">
            <Button className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-[1.02] duration-200 transition-all">
              View Original PDF <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        )}
      </div>

      {/* Metadata Showcase */}
      <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-xl hover:border-indigo-500/10 transition-colors duration-300">
        {paper.clusters.map((c) => (
          <div
            key={c.id}
            className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border animate-pulse"
            style={{
              borderColor: `${c.color}35`,
              backgroundColor: `${c.color}15`,
              color: c.color,
            }}
          >
            {c.clusterName}
          </div>
        ))}

        <h1 className="text-2xl md:text-3xl font-bold text-white max-w-4xl leading-tight">{paper.title}</h1>
        <p className="text-indigo-400 mt-2 font-medium">{paper.authors || "Unknown Authors"}</p>

        <div className="flex flex-wrap gap-4 mt-6 text-xs text-slate-450">
          {paper.journal && (
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <span>{paper.journal}</span>
            </div>
          )}
          {paper.year && (
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              <span>{paper.year}</span>
            </div>
          )}
          {paper.doi && (
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
              <span className="font-bold text-indigo-400">DOI</span>
              <span>{paper.doi}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span>Ingested {formatDate(paper.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="bg-slate-900/60 border border-slate-800 w-full justify-start p-1.5 h-12">
          <TabsTrigger value="summary" className="py-2 px-4">Executive Summary</TabsTrigger>
          <TabsTrigger value="insights" className="py-2 px-4">Extracted Insights</TabsTrigger>
          <TabsTrigger value="related" className="py-2 px-4">Embedding Similarity</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-6">
          <Card className="bg-slate-900/50 border-slate-800/80 shadow-xl backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" /> Paper Abstract / Executive Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                {paper.abstract || "No abstract extracted for this literature item."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extracted Insights Tab */}
        <TabsContent value="insights" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Card className="bg-slate-900/50 border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 hover:translate-y-[-1px] shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" /> Research Question
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm leading-relaxed">{getSectionContent("RESEARCH_QUESTION")}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 hover:translate-y-[-1px] shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <FileCode className="h-4.5 w-4.5 text-violet-400" /> Methodology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm leading-relaxed">{getSectionContent("METHODOLOGY")}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 hover:translate-y-[-1px] shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-pink-400" /> Dataset Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm leading-relaxed">{getSectionContent("DATASET")}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/80 hover:border-slate-700/60 transition-all duration-300 hover:translate-y-[-1px] shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-emerald-400" /> Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm leading-relaxed">{getSectionContent("KEY_FINDINGS")}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/85 hover:border-amber-500/40 transition-all duration-300 hover:translate-y-[-1px] shadow-md border-amber-500/20 bg-amber-500/[0.02]">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-400" /> Stated Limitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm leading-relaxed">{getSectionContent("LIMITATION")}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/85 hover:border-indigo-500/40 transition-all duration-300 hover:translate-y-[-1px] shadow-md border-indigo-500/20 bg-indigo-500/[0.02]">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Lightbulb className="h-4.5 w-4.5 text-indigo-400 animate-pulse" /> Future Directions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm leading-relaxed">{getSectionContent("FUTURE_WORK")}</p>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Embedding Similarity Tab */}
        <TabsContent value="related" className="mt-6">
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-white text-lg">Vector Space Neighbors</CardTitle>
              <CardDescription className="text-slate-400">
                Related literature items in this workspace mapped by vector embedding similarity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSearchingSimilar ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mr-2" />
                  <span>Computing cosine distance relationships...</span>
                </div>
              ) : similarPapers.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">
                  No other papers with similar content found in this workspace. Try uploading more papers.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {similarPapers.map((sim, idx) => (
                    <div key={idx} className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl hover:border-slate-700/60 transition-all duration-250 hover:translate-y-[-1px] stagger-item">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <Link href={`/papers/${sim.paperId}`} className="font-bold text-white hover:text-indigo-400 hover:underline truncate flex-1">
                          {sim.paper?.title}
                        </Link>
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shrink-0">
                          {Math.round(sim.similarity * 100)}% match
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-xs truncate mb-2">By {sim.paper?.authors || "Unknown authors"}</p>
                      <p className="text-slate-500 text-xs italic capitalize">Matching Section: {sim.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
