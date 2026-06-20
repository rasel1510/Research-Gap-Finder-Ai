"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { 
  Compass, 
  Cpu, 
  FileText, 
  Network, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle 
} from "lucide-react";

export default function LandingPage() {
  const { data: session } = useSession();

  const features = [
    {
      icon: <FileText className="h-6 w-6 text-green-600" />,
      title: "PDF Ingestion",
      description: "Extract clean, structured content directly from research papers, bypassing complex layout elements."
    },
    {
      icon: <Cpu className="h-6 w-6 text-green-700" />,
      title: "AI Analysis Engine",
      description: "Automatically isolate Research Questions, Methodologies, Datasets, limitations, and future directions."
    },
    {
      icon: <Network className="h-6 w-6 text-emerald-600" />,
      title: "Semantic Clustering",
      description: "Cluster literatures semantically using vector embeddings to identify thematic domains."
    },
    {
      icon: <Compass className="h-6 w-6 text-green-600" />,
      title: "Gap Discovery",
      description: "Uncover methodological shortcomings, dataset deficiencies, and underexplored future directions."
    }
  ];

  return (
    <div className="relative flex-1 flex flex-col justify-between min-h-screen">
      {/* Subtle green glow overlays */}
      <div className="absolute top-20 left-1/4 w-[450px] h-[450px] bg-green-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[450px] h-[450px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 rounded-lg glow-green shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">ResearchGap <span className="gradient-text">AI</span></span>
        </div>
        <div>
          {session ? (
            <Link href="/dashboard">
              <Button variant="outline" className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400">
                Go to Workspace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <div className="flex space-x-3">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-green-700 hover:bg-green-50">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-200/60">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center py-16 z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-green-300/70 bg-green-50 text-green-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Next-Gen Literature Intelligence
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight mb-6 text-gray-900">
          Discover <span className="gradient-text">Research Gaps</span> Instantly With Literature AI
        </h1>
        
        <p className="text-gray-500 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Upload scientific paper PDFs, run thematic vector clustering, and automatically generate novel, high-impact research directions driven by artificial intelligence.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link href={session ? "/dashboard" : "/register"}>
            <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 font-semibold px-8 shadow-lg shadow-green-200/60 flex items-center gap-2 hover:scale-[1.03] transition-all duration-200">
              Start Free Workspace <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="font-semibold px-8 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400">
              Explore Platform
            </Button>
          </a>
        </div>

        {/* Features Grid */}
        <section id="features" className="w-full py-12 scroll-mt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {features.map((feat, index) => (
              <div key={index} className="glass-card p-6 rounded-xl stagger-item">
                <div className="mb-4 bg-green-50 p-3 rounded-lg inline-block border border-green-100">
                  {feat.icon}
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full mt-16 border-t border-green-100 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-extrabold text-gray-900 mb-2 flex items-center gap-1">
                <TrendingUp className="h-6 w-6 text-green-500" /> 10x
              </span>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Literature Review Speed</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-extrabold text-gray-900 mb-2 flex items-center gap-1">
                <CheckCircle className="h-6 w-6 text-emerald-500" /> 95%
              </span>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Accuracy in Gap Identification</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-extrabold text-gray-900 mb-2 flex items-center gap-1">
                <Network className="h-6 w-6 text-green-600" /> 100%
              </span>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Scientific Rigor Mapping</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-green-100 py-8 text-center text-gray-400 text-sm z-10 bg-white/50 backdrop-blur">
        <p>&copy; {new Date().getFullYear()} ResearchGap AI. All rights reserved. Created for literature intelligence and gap finding.</p>
      </footer>
    </div>
  );
}
