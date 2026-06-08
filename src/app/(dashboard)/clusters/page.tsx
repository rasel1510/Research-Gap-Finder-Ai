"use client";

import { useEffect, useState } from "react";
import { truncate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { 
  Layers, 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  Info,
  HelpCircle,
  FileText
} from "lucide-react";
import Link from "next/link";

interface Paper {
  id: string;
  title: string;
  authors: string | null;
  year: number | null;
}

interface Cluster {
  id: string;
  clusterName: string;
  description: string | null;
  color: string;
  papers: Paper[];
}

export default function ClustersPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClustering, setIsClustering] = useState(false);
  const [selectedK, setSelectedK] = useState("4");
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
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
      fetchClusters();
    }
  }, [workspaceId]);

  const fetchClusters = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clusters?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setClusters(data);
        if (data.length > 0) {
          setActiveClusterId(data[0].id);
        }
      }
    } catch (err) {
      setError("Failed to load clusters");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunClustering = async () => {
    if (!workspaceId) return;
    setIsClustering(true);
    setError(null);
    try {
      const res = await fetch("/api/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          k: parseInt(selectedK),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cluster papers");
      }

      const data = await res.json();
      setClusters(data);
      if (data.length > 0) {
        setActiveClusterId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to cluster papers");
    } finally {
      setIsClustering(false);
    }
  };

  const activeCluster = clusters.find((c) => c.id === activeClusterId);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Layers className="h-8 w-8 text-indigo-400" /> Thematic Cluster Map
          </h1>
          <p className="text-slate-400 mt-1">
            Group literature into semantic clusters using k-means mapping of abstract embeddings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            label="Clusters (k)"
            value={selectedK}
            onChange={(e) => setSelectedK(e.target.value)}
            options={[
              { value: "2", label: "2 Clusters" },
              { value: "3", label: "3 Clusters" },
              { value: "4", label: "4 Clusters" },
              { value: "5", label: "5 Clusters" },
              { value: "6", label: "6 Clusters" },
              { value: "8", label: "8 Clusters" },
            ]}
            className="w-32"
          />
          <Button
            onClick={handleRunClustering}
            disabled={isClustering || !workspaceId}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 mt-5"
          >
            {isClustering ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Clustering...
              </>
            ) : (
              <>
                <RefreshCw className="h-4.5 w-4.5" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mr-3" />
          <span>Analyzing embedding partitions...</span>
        </div>
      ) : clusters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-2xl text-slate-500">
          <Layers className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
          <p className="font-semibold text-white">No clusters generated yet</p>
          <p className="text-slate-650 text-sm mt-1 max-w-sm text-center">
            You need at least 2 papers uploaded with abstract embeddings. Click &apos;Run Analysis&apos; above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SVG Force/Orbit style visual Map */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-950/60 border-slate-900 shadow-xl overflow-hidden h-[500px] flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">Workspace Semantic Projection</CardTitle>
                <CardDescription className="text-slate-400">Interactive k-means clusters. Click circles to inspect themes.</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex items-center justify-center relative bg-slate-950/40 p-0 overflow-hidden">
                {/* SVG Visual Projection */}
                <svg className="w-full h-full min-h-[350px]">
                  {/* Drawing connection links if nodes are active */}
                  {clusters.map((c, cIdx) => {
                    const angle = (cIdx / clusters.length) * 2 * Math.PI;
                    const cx = 280 + Math.cos(angle) * 110;
                    const cy = 200 + Math.sin(angle) * 90;

                    return c.papers.map((p, pIdx) => {
                      const pAngle = pIdx * 1.5;
                      const px = cx + Math.cos(pAngle) * 35;
                      const py = cy + Math.sin(pAngle) * 35;

                      return (
                        <line
                          key={`link-${cIdx}-${pIdx}`}
                          x1={cx}
                          y1={cy}
                          x2={px}
                          y2={py}
                          stroke={c.color}
                          strokeWidth="0.8"
                          strokeOpacity="0.25"
                        />
                      );
                    });
                  })}

                  {/* Draw Cluster Center Hubs */}
                  {clusters.map((c, cIdx) => {
                    const angle = (cIdx / clusters.length) * 2 * Math.PI;
                    const cx = 280 + Math.cos(angle) * 110;
                    const cy = 200 + Math.sin(angle) * 90;
                    const isActive = c.id === activeClusterId;

                    return (
                      <g key={c.id} className="cluster-node" onClick={() => setActiveClusterId(c.id)}>
                        {/* Glow filter under active circle */}
                        {isActive && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="28"
                            fill={c.color}
                            opacity="0.15"
                            className="animate-pulse-glow"
                          />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isActive ? "20" : "15"}
                          fill={c.color}
                          stroke="#000"
                          strokeWidth="2"
                          opacity={isActive ? "0.9" : "0.7"}
                          className="transition-all duration-300"
                        />
                        <text
                          x={cx}
                          y={cy + 4}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          C{cIdx + 1}
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw individual paper nodes orbiting their clusters */}
                  {clusters.map((c, cIdx) => {
                    const angle = (cIdx / clusters.length) * 2 * Math.PI;
                    const cx = 280 + Math.cos(angle) * 110;
                    const cy = 200 + Math.sin(angle) * 90;

                    return c.papers.map((p, pIdx) => {
                      const pAngle = pIdx * 1.5;
                      const px = cx + Math.cos(pAngle) * 35;
                      const py = cy + Math.sin(pAngle) * 35;

                      return (
                        <circle
                          key={p.id}
                          cx={px}
                          cy={py}
                          r="5"
                          fill={c.color}
                          stroke="#000"
                          strokeWidth="1"
                          opacity="0.8"
                          className="hover:scale-150 hover:opacity-100 transition-all cursor-pointer duration-200"
                        >
                          <title>{p.title}</title>
                        </circle>
                      );
                    });
                  })}
                </svg>

                {/* Map legends */}
                <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 p-2 bg-slate-950/60 border border-slate-900/40 rounded-lg backdrop-blur">
                  {clusters.map((c, idx) => (
                    <div key={c.id} className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-slate-400">Cluster {idx + 1}: {truncate(c.clusterName, 15)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Sidebar Column */}
          <div>
            {activeCluster ? (
              <Card className="bg-slate-950/60 border-slate-900 shadow-xl h-full flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: activeCluster.color }} />
                    <CardTitle className="text-white text-lg">{activeCluster.clusterName}</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400 mt-2">
                    {activeCluster.description || "Thematic grouping descriptions."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto max-h-[300px]">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Papers ({activeCluster.papers.length})</h4>
                  <div className="space-y-3">
                    {activeCluster.papers.map((p) => (
                      <div key={p.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg stagger-item">
                        <Link href={`/papers/${p.id}`} className="font-semibold text-white hover:text-indigo-400 hover:underline text-xs block line-clamp-2">
                          {p.title}
                        </Link>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">By {p.authors || "Unknown author"}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center border border-slate-900 rounded-2xl text-slate-500 p-8 text-center text-xs">
                Select a cluster node in the project canvas to view details.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
