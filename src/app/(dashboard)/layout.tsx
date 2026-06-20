"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  LayoutDashboard, 
  Layers, 
  Lightbulb, 
  LogOut, 
  Folder, 
  Plus, 
  Loader2,
  Menu,
  X,
  Search,
  Check,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  // Load workspaces
  useEffect(() => {
    if (status === "authenticated") {
      fetchWorkspaces();
    }
  }, [status]);

  // Load active workspace from localStorage or set first one
  useEffect(() => {
    if (workspaces.length > 0) {
      const savedId = localStorage.getItem("activeWorkspaceId");
      const saved = workspaces.find((w) => w.id === savedId);
      if (saved) {
        setActiveWorkspace(saved);
      } else {
        setActiveWorkspace(workspaces[0]);
        localStorage.setItem("activeWorkspaceId", workspaces[0].id);
      }
    }
  }, [workspaces]);

  // Auto-create a default workspace if user has none
  useEffect(() => {
    if (workspacesLoaded && workspaces.length === 0 && status === "authenticated") {
      autoCreateDefaultWorkspace();
    }
  }, [workspacesLoaded, workspaces.length, status]);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWorkspacesLoaded(true);
    }
  };

  const autoCreateDefaultWorkspace = async () => {
    try {
      setIsCreatingWorkspace(true);
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My Research",
          description: "Default research workspace",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces([data]);
        setActiveWorkspace(data);
        localStorage.setItem("activeWorkspaceId", data.id);
      }
    } catch (err) {
      console.error("Failed to auto-create workspace:", err);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName) return;

    setIsCreatingWorkspace(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWorkspaceName,
          description: newWorkspaceDesc,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWorkspaces((prev) => [data, ...prev]);
        setActiveWorkspace(data);
        localStorage.setItem("activeWorkspaceId", data.id);
        setIsNewWorkspaceOpen(false);
        setNewWorkspaceName("");
        setNewWorkspaceDesc("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const switchWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
    localStorage.setItem("activeWorkspaceId", ws.id);
    // Reload components depending on workspaceId
    router.refresh();
  };

  // Auth redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Show loading only while auth is loading or workspaces haven't been fetched yet
  if (status === "loading" || !workspacesLoaded) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Initializing workspace context...</p>
      </div>
    );
  }

  // Workspaces loaded but empty and auto-creation in progress
  if (!activeWorkspace && isCreatingWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Setting up your research workspace...</p>
      </div>
    );
  }

  // Workspaces loaded but still empty (auto-creation failed)
  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 rounded-2xl shadow-2xl shadow-indigo-500/20">
          <Rocket className="h-10 w-10 text-white" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to ResearchGap AI</h2>
          <p className="text-slate-400 text-sm">Create your first workspace to start uploading papers and discovering research gaps.</p>
        </div>
        <Dialog open={isNewWorkspaceOpen} onOpenChange={setIsNewWorkspaceOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold px-8 py-3 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all">
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-slate-950 border border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">Create Your First Workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <Input
                label="Workspace Name"
                type="text"
                placeholder="E.g., Quantum Computing NLP"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                required
              />
              <Input
                label="Description (Optional)"
                type="text"
                placeholder="Brief objective of this research workspace"
                value={newWorkspaceDesc}
                onChange={(e) => setNewWorkspaceDesc(e.target.value)}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNewWorkspaceOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isCreatingWorkspace}>
                  {isCreatingWorkspace ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Workspace"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const menuItems = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4.5 w-4.5" />,
      href: "/dashboard"
    },
    {
      label: "Thematic Clusters",
      icon: <Layers className="h-4.5 w-4.5" />,
      href: "/clusters"
    },
    {
      label: "Research Gaps",
      icon: <Lightbulb className="h-4.5 w-4.5" />,
      href: "/gaps"
    }
  ];

  return (
    <div className="flex-1 flex min-h-screen bg-slate-950 dot-pattern text-slate-100 z-10">
      {/* Sidebar for Desktop */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/90 border-r border-slate-900 backdrop-blur-xl transition-transform duration-300 flex flex-col justify-between p-4 lg:translate-x-0 lg:static lg:flex",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div>
          {/* Logo */}
          <div className="flex items-center justify-between mb-8 px-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1.5 rounded-lg shadow-lg shadow-indigo-500/15">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white">ResearchGap <span className="gradient-text">AI</span></span>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Workspace Switcher */}
          <div className="mb-6 px-2">
            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Active Workspace</label>
            <Dialog open={isNewWorkspaceOpen} onOpenChange={setIsNewWorkspaceOpen}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Folder className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="font-semibold text-slate-200 truncate">{activeWorkspace.name}</span>
                  </div>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                </div>

                {/* Workspace List Dropdown wrapper */}
                <div className="max-h-28 overflow-y-auto space-y-1 mt-1.5">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => switchWorkspace(ws)}
                      className={cn(
                        "w-full text-left flex items-center justify-between p-1.5 rounded text-xs transition-colors",
                        ws.id === activeWorkspace.id
                          ? "bg-indigo-950/40 text-indigo-300 border border-indigo-900/40"
                          : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                      )}
                    >
                      <span className="truncate">{ws.name}</span>
                      {ws.id === activeWorkspace.id && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <DialogContent className="max-w-md bg-slate-950 border border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Workspace</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateWorkspace} className="space-y-4">
                  <Input
                    label="Workspace Name"
                    type="text"
                    placeholder="E.g., Quantum Computing NLP"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    required
                  />
                  <Input
                    label="Description (Optional)"
                    type="text"
                    placeholder="Brief objective of this research workspace"
                    value={newWorkspaceDesc}
                    onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsNewWorkspaceOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isCreatingWorkspace}>
                      {isCreatingWorkspace ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Workspace"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 px-2">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setIsSidebarOpen(false)}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === item.href
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                )}>
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Info / Logout */}
        <div className="border-t border-slate-900/60 pt-4 px-2 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-3 py-1">
            <div className="h-8 w-8 rounded-full bg-indigo-600/35 border border-indigo-500/20 flex items-center justify-center font-bold text-xs uppercase text-indigo-200">
              {session?.user?.name ? session.user.name.charAt(0) : "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{session?.user?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{session?.user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-950/20 text-xs px-3"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-b border-slate-900/60 backdrop-blur-md lg:hidden">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1.5 rounded-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base text-white">ResearchGap <span className="gradient-text">AI</span></span>
          </Link>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
