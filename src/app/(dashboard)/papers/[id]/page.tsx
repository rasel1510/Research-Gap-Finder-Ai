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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
        <Loader2 className="h-8 w-8 text-green-500 animate-spin mb-3" />
        <p>Loading literature intelligence...</p>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-gray-500 text-center max-w-md mx-auto">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
        <p className="font-semibold text-gray-900">Load Error</p>
        <p className="text-sm text-gray-500 mt-1">{error || "Literature metadata not found."}</p>
        <Button onClick={() => router.push("/dashboard")} className="mt-6 bg-white border border-green-200 text-gray-700 hover:bg-green-50">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const getSectionContent = (type: string) => {
    return paper.sections.find((s) => s.sectionType === type)?.content || "Not explicitly stated";
  };

  // Section card config with White & Green color scheme
  const sectionCards = [
    {
      type: "RESEARCH_QUESTION",
      title: "Research Question",
      icon: <Sparkles className="h-4 w-4 text-green-600" />,
      bgAccent: "bg-green-50/50",
      borderAccent: "border-green-100 hover:border-green-300",
    },
    {
      type: "METHODOLOGY",
      title: "Methodology",
      icon: <FileCode className="h-4 w-4 text-emerald-600" />,
      bgAccent: "bg-emerald-50/50",
      borderAccent: "border-emerald-100 hover:border-emerald-300",
    },
    {
      type: "DATASET",
      title: "Dataset Used",
      icon: <Database className="h-4 w-4 text-teal-600" />,
      bgAccent: "bg-teal-50/50",
      borderAccent: "border-teal-100 hover:border-teal-300",
    },
    {
      type: "KEY_FINDINGS",
      title: "Key Findings",
      icon: <Layers className="h-4 w-4 text-green-700" />,
      bgAccent: "bg-green-50/60",
      borderAccent: "border-green-100 hover:border-green-300",
    },
    {
      type: "LIMITATION",
      title: "Stated Limitations",
      icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
      bgAccent: "bg-amber-50/40",
      borderAccent: "border-amber-200 hover:border-amber-400",
    },
    {
      type: "FUTURE_WORK",
      title: "Future Directions",
      icon: <Lightbulb className="h-4 w-4 text-green-600 animate-pulse" />,
      bgAccent: "bg-green-50/40",
      borderAccent: "border-green-200 hover:border-green-400",
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header and Back */}
      <div className="flex items-center justify-between border-b border-green-100 pb-4">
        <Button onClick={() => router.push("/dashboard")} variant="outline" className="flex items-center gap-2 border-green-200 text-gray-700 hover:bg-green-50 hover:border-green-300">
          <ArrowLeft className="h-4 w-4" /> Back to Workspace
        </Button>
        {paper.pdfUrl && (
          <a href={paper.pdfUrl} target="_blank" rel="noreferrer">
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center gap-2 shadow-md shadow-green-200/50 hover:from-green-600 hover:to-emerald-700 hover:scale-[1.02] duration-200 transition-all">
              View Original PDF <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        )}
      </div>

      {/* Metadata Banner */}
      <div className="bg-white border border-green-100 p-6 rounded-2xl relative overflow-hidden shadow-md hover:border-green-200 transition-colors duration-300">
        {/* Cluster badges */}
        <div className="flex flex-wrap gap-2 absolute top-4 right-4">
          {paper.clusters.map((c) => (
            <div
              key={c.id}
              className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border"
              style={{
                borderColor: `${c.color}40`,
                backgroundColor: `${c.color}12`,
                color: c.color,
              }}
            >
              {c.clusterName}
            </div>
          ))}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 max-w-4xl leading-tight">{paper.title}</h1>
        <p className="text-green-700 mt-2 font-medium">{paper.authors || "Unknown Authors"}</p>

        <div className="flex flex-wrap gap-3 mt-6 text-xs text-gray-500">
          {paper.journal && (
            <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
              <BookOpen className="h-3.5 w-3.5 text-green-600" />
              <span>{paper.journal}</span>
            </div>
          )}
          {paper.year && (
            <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
              <Calendar className="h-3.5 w-3.5 text-green-600" />
              <span>{paper.year}</span>
            </div>
          )}
          {paper.doi && (
            <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
              <span className="font-bold text-green-600">DOI</span>
              <span>{paper.doi}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
            <Clock className="h-3.5 w-3.5 text-green-600" />
            <span>Ingested {formatDate(paper.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="bg-white border border-green-200 w-full justify-start p-1.5 h-12">
          <TabsTrigger value="summary" className="py-2 px-4">Executive Summary</TabsTrigger>
          <TabsTrigger value="insights" className="py-2 px-4">Extracted Insights</TabsTrigger>
          <TabsTrigger value="related" className="py-2 px-4">Embedding Similarity</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-6">
          <Card className="bg-white border border-green-100 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" /> Paper Abstract / Executive Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                {paper.abstract || "No abstract extracted for this literature item."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extracted Insights Tab */}
        <TabsContent value="insights" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sectionCards.map((sec) => (
              <Card key={sec.type} className={`bg-white border ${sec.borderAccent} transition-all duration-300 hover:translate-y-[-1px] shadow-sm hover:shadow-md`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-gray-900 text-base flex items-center gap-2">
                    {sec.icon} {sec.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`p-3 rounded-lg ${sec.bgAccent}`}>
                    <p className="text-gray-600 text-sm leading-relaxed">{getSectionContent(sec.type)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Embedding Similarity Tab */}
        <TabsContent value="related" className="mt-6">
          <Card className="bg-white border border-green-100 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg">Vector Space Neighbors</CardTitle>
              <CardDescription className="text-gray-500">
                Related literature items in this workspace mapped by vector embedding similarity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSearchingSimilar ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 className="h-6 w-6 text-green-500 animate-spin mr-2" />
                  <span>Computing cosine distance relationships...</span>
                </div>
              ) : similarPapers.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">
                  No other papers with similar content found in this workspace. Try uploading more papers.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {similarPapers.map((sim, idx) => (
                    <div key={idx} className="p-4 bg-green-50/60 border border-green-100 rounded-xl hover:border-green-300 transition-all duration-250 hover:translate-y-[-1px] stagger-item">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <Link href={`/papers/${sim.paperId}`} className="font-bold text-gray-900 hover:text-green-700 hover:underline truncate flex-1">
                          {sim.paper?.title}
                        </Link>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
                          {Math.round(sim.similarity * 100)}% match
                        </Badge>
                      </div>
                      <p className="text-gray-500 text-xs truncate mb-2">By {sim.paper?.authors || "Unknown authors"}</p>
                      <p className="text-gray-400 text-xs italic capitalize">Matching Section: {sim.label}</p>
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
