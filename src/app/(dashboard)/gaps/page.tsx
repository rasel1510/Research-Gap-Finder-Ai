"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Lightbulb, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  Cpu, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Brain
} from "lucide-react";
import { getConfidenceColor, getConfidenceLabel } from "@/lib/utils";

interface Gap {
  id: string;
  gapTitle: string;
  gapDescription: string;
  suggestedMethodology: string | null;
  potentialImpact: string | null;
  confidenceScore: number;
  cluster: { id: string; clusterName: string; color: string } | null;
}

export default function GapsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [expandedGapId, setExpandedGapId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync workspaceId
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
      fetchGaps();
    }
  }, [workspaceId]);

  const fetchGaps = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gaps?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setGaps(data);
      }
    } catch (err) {
      setError("Failed to load gap opportunities");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetectGaps = async () => {
    if (!workspaceId) return;
    setIsDetecting(true);
    setError(null);
    try {
      const res = await fetch("/api/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gap detection failed");
      }

      const data = await res.json();
      setGaps(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze literature clusters");
    } finally {
      setIsDetecting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedGapId(expandedGapId === id ? null : id);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-green-100 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <Lightbulb className="h-8 w-8 text-green-600" /> Research Gap Intelligence
          </h1>
          <p className="text-gray-500 mt-1">
            Detect methodological gaps, dataset deficiencies, and underexplored areas in your repository.
          </p>
        </div>

        <div>
          <Button
            onClick={handleDetectGaps}
            disabled={isDetecting || !workspaceId}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center gap-2 shadow-md shadow-green-200/50 hover:from-green-600 hover:to-emerald-700 hover:scale-[1.02] duration-200 transition-all"
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing Clusters...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 animate-bounce" />
                Generate Gap Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-8 w-8 text-green-500 animate-spin mr-3" />
          <span>Scanning thematic overlap for literature boundaries...</span>
        </div>
      ) : gaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-green-100 rounded-2xl text-gray-400">
          <Lightbulb className="h-12 w-12 text-green-200 mb-4" />
          <p className="font-semibold text-gray-700">No gap suggestions generated yet</p>
          <p className="text-gray-400 text-sm mt-1 max-w-sm text-center">
            Run cluster analysis on your literature repository first, then trigger Gap Discovery above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {gaps.map((gap) => {
            const isExpanded = expandedGapId === gap.id;
            const percentage = Math.round(gap.confidenceScore * 100);

            return (
              <Card 
                key={gap.id} 
                className="bg-white border border-green-100 overflow-hidden hover:border-green-200 shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all duration-300 stagger-item"
              >
                <CardHeader className="cursor-pointer" onClick={() => toggleExpand(gap.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Related cluster chip */}
                      {gap.cluster && (
                        <Badge 
                          variant="outline" 
                          style={{
                            borderColor: `${gap.cluster.color}40`,
                            backgroundColor: `${gap.cluster.color}12`,
                            color: gap.cluster.color
                          }}
                          className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        >
                          Cluster: {gap.cluster.clusterName}
                        </Badge>
                      )}
                      <h3 className="text-lg font-bold text-gray-900 leading-snug">{gap.gapTitle}</h3>
                    </div>

                    {/* Score display */}
                    <div className="w-40 shrink-0 space-y-1 text-right">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-400">Confidence Score</span>
                        <span className={getConfidenceColor(gap.confidenceScore)}>
                          {percentage}% ({getConfidenceLabel(gap.confidenceScore)})
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1.5 bg-gray-100" />
                    </div>

                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 pb-6 border-t border-green-50 mt-3 pt-4">
                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed">{gap.gapDescription}</p>

                  {/* Toggle trigger */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleExpand(gap.id)}
                    className="mt-4 text-green-600 hover:text-green-700 hover:bg-green-50 p-0 h-auto"
                  >
                    {isExpanded ? (
                      <span className="flex items-center gap-1">Hide Proposal Details <ChevronUp className="h-4 w-4" /></span>
                    ) : (
                      <span className="flex items-center gap-1">View Full Research Proposal <ChevronDown className="h-4 w-4" /></span>
                    )}
                  </Button>

                  {/* Expandable details */}
                  {isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 border-t border-green-100 pt-6">
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu className="h-4 w-4 text-green-600" /> Suggested Methodology
                        </h4>
                        <p className="text-gray-600 text-xs md:text-sm leading-relaxed p-3 bg-green-50/60 border border-green-100 rounded-lg">
                          {gap.suggestedMethodology || "Under review by modeling advisors."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4 text-emerald-600" /> Potential Impact
                        </h4>
                        <p className="text-gray-600 text-xs md:text-sm leading-relaxed p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg">
                          {gap.potentialImpact || "Review pending impact evaluation."}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
