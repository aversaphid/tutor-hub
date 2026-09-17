"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Edit3,
  Globe,
  Tag,
  Filter,
  ArrowUpDown,
  Sparkles,
  FolderOpen,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export interface ResourceItem {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  category: string;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface SharedResourcesHubProps {
  currentUser: {
    id: string;
    name: string;
    role: "HEAD_TUTOR" | "TUTOR" | "TUTEE";
  };
}

const PRESET_CATEGORIES = [
  "All",
  "Past Papers",
  "Worksheets",
  "Online Tools",
  "Formulas & Specs",
  "Starters & Plenaries",
  "General",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; darkBg: string }> = {
  "Past Papers": {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
    darkBg: "dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
  Worksheets: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
    darkBg: "dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  "Online Tools": {
    bg: "bg-sky-100",
    text: "text-sky-800",
    border: "border-sky-200",
    darkBg: "dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
  },
  "Formulas & Specs": {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-200",
    darkBg: "dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  "Starters & Plenaries": {
    bg: "bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-200",
    darkBg: "dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  },
  General: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
    darkBg: "dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

export default function SharedResourcesHub({ currentUser }: SharedResourcesHubProps) {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "category">("newest");

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copied link tracker
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/resources");
      if (!res.ok) {
        throw new Error("Failed to load resources");
      }
      const data = await res.json();
      setResources(data.resources || []);
    } catch (err: any) {
      console.error(err);
      setError("Unable to load resources. Please refresh or try again.");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(""), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingResource(null);
    setFormTitle("");
    setFormUrl("");
    setFormCategory("General");
    setFormDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ResourceItem) => {
    setEditingResource(item);
    setFormTitle(item.title);
    setFormUrl(item.url);
    setFormCategory(item.category || "General");
    setFormDescription(item.description || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formTitle.trim()) {
      setFormError("Please enter a title for the resource.");
      return;
    }
    if (!formUrl.trim()) {
      setFormError("Please enter a web link or URL.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingResource) {
        // Update
        const res = await fetch(`/api/resources/${editingResource.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            url: formUrl.trim(),
            category: formCategory.trim() || "General",
            description: formDescription.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || "Failed to update resource.");
          return;
        }

        setIsModalOpen(false);
        showNotification(`Updated "${data.resource.title}".`);
        loadResources();
      } else {
        // Create
        const res = await fetch("/api/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            url: formUrl.trim(),
            category: formCategory.trim() || "General",
            description: formDescription.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || "Failed to create resource.");
          return;
        }

        setIsModalOpen(false);
        showNotification(`Added "${data.resource.title}" to shared library!`);
        loadResources();
      }
    } catch {
      setFormError("Network error while saving resource.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResource = async (item: ResourceItem) => {
    if (!confirm(`Are you sure you want to remove "${item.title}" from the shared library?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/resources/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete resource.");
        return;
      }
      showNotification(`Removed "${item.title}".`);
      loadResources();
    } catch {
      alert("Network error while deleting resource.");
    }
  };

  const handleCopyLink = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      alert("Failed to copy link.");
    }
  };

  // Helper to extract hostname from URL
  const getDomain = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return rawUrl;
    }
  };

  // Filtered and sorted list
  const filteredResources = useMemo(() => {
    return resources
      .filter((r) => {
        const matchesCategory =
          selectedCategory === "All" || r.category === selectedCategory;
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !q ||
          r.title.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          r.url.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "category") {
          return a.category.localeCompare(b.category);
        }
        return 0;
      });
  }, [resources, selectedCategory, searchTerm, sortBy]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: resources.length };
    for (const r of resources) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return counts;
  }, [resources]);

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#48A5EE]/10 text-[#48A5EE] text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Collective Tutor Hub</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              Shared Resource Library
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              A shared repository of useful links, past papers, worksheets, formulas, and online tools
              accessible to all tutors and administrators.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resource Link</span>
          </button>
        </div>
      </div>

      {/* Search, Category Filter & Sorting Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resources by title, description, or domain..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A5EE]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              <span className="hidden sm:inline">Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#48A5EE]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Category:</span>
          </span>
          {PRESET_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#48A5EE] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resource Grid / Content */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#48A5EE] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading shared resources...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
          <p className="text-xs text-red-600 dark:text-red-300 font-semibold">{error}</p>
          <button
            onClick={loadResources}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center mx-auto">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {searchTerm || selectedCategory !== "All"
                ? "No resources match your filters"
                : "No shared resources yet"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedCategory !== "All"
                ? "Try searching for something else or reset your category filters."
                : "Add useful past paper links, online calculators, formula sheets, and teaching tools to build up the team's library."}
            </p>
          </div>
          {searchTerm || selectedCategory !== "All" ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
              }}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add the First Resource</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((item) => {
            const canManage =
              currentUser.role === "HEAD_TUTOR" || currentUser.id === item.createdById;
            const categoryStyle =
              CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;
            const domain = getDomain(item.url);

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#48A5EE]/50 dark:hover:border-[#48A5EE]/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  {/* Top bar: Category Badge + Manage buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border} ${categoryStyle.darkBg}`}
                    >
                      {item.category}
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit resource"
                          aria-label="Edit resource"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(item)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                          title="Delete resource"
                          aria-label="Delete resource"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Domain link */}
                  <div className="space-y-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-[#48A5EE] dark:hover:text-[#48A5EE] transition-colors line-clamp-2 inline-flex items-center gap-1.5"
                    >
                      <span>{item.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                    </a>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{domain}</span>
                    </div>
                  </div>

                  {/* Description if any */}
                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Footer bar: Contributor + Quick Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-slate-400 truncate">
                    Added by{" "}
                    <strong className="text-slate-600 dark:text-slate-300">
                      {item.createdBy?.name || "Tutor"}
                    </strong>
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(item.id, item.url)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        copiedId === item.id
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                      title="Copy URL"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#48A5EE]/10 hover:bg-[#48A5EE]/20 text-[#48A5EE] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {editingResource ? "Edit Shared Resource" : "Add Shared Resource"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Visible to all tutors and administrators
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-600 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveResource} className="space-y-4">
              {/* Resource Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Resource Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. CorbettMaths 5-a-day Worksheets"
                  maxLength={150}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A5EE]"
                />
              </div>

              {/* Resource URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Link / URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="e.g. corbettmaths.com/5-a-day or https://..."
                  maxLength={1000}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A5EE]"
                />
                <p className="text-[11px] text-slate-400">
                  Protocol (https://) will be added automatically if omitted.
                </p>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CATEGORIES.filter((c) => c !== "All").map((cat) => {
                    const isSelected = formCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormCategory(cat)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#48A5EE]/15 border-[#48A5EE] text-[#48A5EE] font-semibold dark:bg-[#48A5EE]/25"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notes / Description (Optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Recommended for GCSE Higher revision starters and homework packs..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A5EE] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingResource
                    ? "Save Changes"
                    : "Add Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
