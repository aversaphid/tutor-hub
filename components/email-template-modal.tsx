"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Video,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { parseEmailList } from "@/lib/email-utils";
import { getCanonicalPortalUrl } from "@/lib/calendar";

export interface CustomEmailTemplate {
  id: string;
  name: string;
  body: string;
}

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id?: string;
    name: string;
    email?: string | null;
    parentEmail?: string | null;
    pin?: string | null;
    magicKey?: string | null;
  } | null;
  initialSelectedEmail?: string | null;
  initialSelectAll?: boolean;
  teamsMeetingUrl?: string | null;
  tutorName?: string | null;
}

const DEFAULT_SUBJECT = "Tuition Meeting";

const BUILTIN_TEMPLATE_GENERAL = `Hello,

You can access your portal at this link:
[MAGIC LINK HERE]
Or through the general link:
https://portal.lbmathstuition.co.uk/, where your PIN is [PIN HERE]

Just in case, the direct link is:
[TEAMS MEETING LINK HERE]

Thanks,
[TUTOR NAME HERE]`;

const BUILTIN_TEMPLATE_TEAMS = `Hello,

Here's the link to the Teams Meeting:
[TEAMS MEETING LINK HERE]

Thanks,
[TUTOR NAME HERE]`;

export default function EmailTemplateModal({
  isOpen,
  onClose,
  student,
  initialSelectedEmail,
  initialSelectAll = false,
  teamsMeetingUrl: initialTeamsUrl = "",
  tutorName = "Your Tutor",
}: EmailTemplateModalProps) {
  // Available emails
  const availableEmails = useMemo(() => {
    if (!student) return [];
    const list = parseEmailList(student.parentEmail || student.email);
    // Remove duplicates
    return Array.from(new Set(list));
  }, [student]);

  // Selected emails
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState("");
  const [showAddCustomEmail, setShowAddCustomEmail] = useState(false);

  // Teams URL (can be edited/supplied right in the modal)
  const [teamsUrl, setTeamsUrl] = useState(initialTeamsUrl || "");

  // Templates state
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("general");
  const [customTemplates, setCustomTemplates] = useState<CustomEmailTemplate[]>([]);

  // Subject and Body text
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState("");

  // Copy status indicators
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Custom template management dialog
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [templateSaveError, setTemplateSaveError] = useState("");

  // Load custom templates from localStorage
  useEffect(() => {
    try {
      const storageKey = `tutor_custom_email_templates`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCustomTemplates(parsed);
        }
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  // Save custom templates to localStorage
  const saveCustomTemplates = (templates: CustomEmailTemplate[]) => {
    setCustomTemplates(templates);
    try {
      localStorage.setItem(`tutor_custom_email_templates`, JSON.stringify(templates));
    } catch {}
  };

  // Helper to resolve placeholders
  const resolveTemplateText = (templateText: string, overrideTeamsUrl?: string): string => {
    if (!student) return templateText;
    const portalOrigin = getCanonicalPortalUrl();
    const magicLink = student.magicKey
      ? `${portalOrigin}/student?key=${encodeURIComponent(student.magicKey)}`
      : `${portalOrigin}/student`;
    const pin = student.pin || "----";
    const activeUrl = (overrideTeamsUrl !== undefined ? overrideTeamsUrl : teamsUrl).trim();
    const teamsLink = activeUrl || "[TEAMS MEETING LINK HERE]";
    const tutor = (tutorName || "Your Tutor").trim();
    const studentName = (student.name || "Student").trim();

    return templateText
      .replace(/\[MAGIC LINK HERE\]/g, magicLink)
      .replace(/\{MAGIC_LINK\}/g, magicLink)
      .replace(/\[PIN HERE\]/g, pin)
      .replace(/\{PIN\}/g, pin)
      .replace(/\[TEAMS MEETING LINK HERE\]/g, teamsLink)
      .replace(/\{TEAMS_LINK\}/g, teamsLink)
      .replace(/\[TUTOR NAME HERE\]/g, tutor)
      .replace(/\{TUTOR_NAME\}/g, tutor)
      .replace(/\[STUDENT NAME HERE\]/g, studentName)
      .replace(/\{STUDENT_NAME\}/g, studentName);
  };

  // When modal opens or student changes, initialize selections
  useEffect(() => {
    if (!isOpen || !student) return;

    let effectiveTeams = (initialTeamsUrl || "").trim();
    if (!effectiveTeams) {
      try {
        effectiveTeams = (localStorage.getItem("tutor_default_teams_url") || "").trim();
      } catch {}
    }

    setTeamsUrl(effectiveTeams);
    setSubject(DEFAULT_SUBJECT);
    setShowAddCustomEmail(false);
    setCustomEmailInput("");
    setIsCreatingTemplate(false);

    // Initial email selection
    if (initialSelectAll) {
      setSelectedEmails([...availableEmails]);
    } else if (initialSelectedEmail && availableEmails.includes(initialSelectedEmail)) {
      setSelectedEmails([initialSelectedEmail]);
    } else if (availableEmails.length > 0) {
      setSelectedEmails([...availableEmails]);
    } else {
      setSelectedEmails([]);
    }

    // Default to general template with resolved teams URL
    setSelectedTemplateKey("general");
    setBody(resolveTemplateText(BUILTIN_TEMPLATE_GENERAL, effectiveTeams));
  }, [isOpen, student, availableEmails, initialSelectedEmail, initialSelectAll, initialTeamsUrl]);

  // When template selection changes or teamsUrl changes, regenerate body
  const applyTemplate = (key: string, currentTeamsUrl: string = teamsUrl) => {
    setSelectedTemplateKey(key);
    setSubject(DEFAULT_SUBJECT);

    if (key === "direct") {
      setBody("");
      return;
    }

    if (key === "general") {
      setBody(resolveTemplateText(BUILTIN_TEMPLATE_GENERAL, currentTeamsUrl));
      return;
    }

    if (key === "teams") {
      setBody(resolveTemplateText(BUILTIN_TEMPLATE_TEAMS, currentTeamsUrl));
      return;
    }

    const custom = customTemplates.find((t) => t.id === key);
    if (custom) {
      setBody(resolveTemplateText(custom.body, currentTeamsUrl));
    }
  };

  // Handle teams URL change and update body live if placeholders exist
  const handleTeamsUrlChange = (newUrl: string) => {
    setTeamsUrl(newUrl);
    try {
      if (newUrl.trim()) {
        localStorage.setItem("tutor_default_teams_url", newUrl.trim());
      }
    } catch {}

    if (selectedTemplateKey === "general") {
      setBody(resolveTemplateText(BUILTIN_TEMPLATE_GENERAL, newUrl));
    } else if (selectedTemplateKey === "teams") {
      setBody(resolveTemplateText(BUILTIN_TEMPLATE_TEAMS, newUrl));
    } else {
      const custom = customTemplates.find((t) => t.id === selectedTemplateKey);
      if (custom) {
        setBody(resolveTemplateText(custom.body, newUrl));
      }
    }
  };

  // Toggle recipient email
  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSelectAllEmails = () => {
    setSelectedEmails([...availableEmails]);
  };

  const handleClearAllEmails = () => {
    setSelectedEmails([]);
  };

  const handleAddCustomEmail = () => {
    const trimmed = customEmailInput.trim();
    if (!trimmed) return;
    if (!selectedEmails.includes(trimmed)) {
      setSelectedEmails((prev) => [...prev, trimmed]);
    }
    setCustomEmailInput("");
    setShowAddCustomEmail(false);
  };

  // Custom template save
  const handleSaveNewTemplate = () => {
    if (!newTemplateName.trim()) {
      setTemplateSaveError("Please enter a template name");
      return;
    }
    if (!newTemplateBody.trim()) {
      setTemplateSaveError("Please enter the template message body");
      return;
    }

    const newTemplate: CustomEmailTemplate = {
      id: `custom_${Date.now()}`,
      name: newTemplateName.trim(),
      body: newTemplateBody.trim(),
    };

    const updated = [...customTemplates, newTemplate];
    saveCustomTemplates(updated);
    setIsCreatingTemplate(false);
    setNewTemplateName("");
    setNewTemplateBody("");
    setTemplateSaveError("");

    // Select this newly created template
    setSelectedTemplateKey(newTemplate.id);
    setBody(resolveTemplateText(newTemplate.body));
  };

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this custom template?")) return;
    const updated = customTemplates.filter((t) => t.id !== id);
    saveCustomTemplates(updated);
    if (selectedTemplateKey === id) {
      applyTemplate("general");
    }
  };

  // Construct mailto link
  const mailtoHref = useMemo(() => {
    if (selectedEmails.length === 0) return "#";
    const to = selectedEmails.join(",");
    const params = new URLSearchParams();
    if (subject.trim()) params.set("subject", subject.trim());
    if (body.trim()) params.set("body", body);
    return `mailto:${to}?${params.toString().replace(/\+/g, "%20")}`;
  }, [selectedEmails, subject, body]);

  const handleOpenMailto = () => {
    if (selectedEmails.length === 0) return;
    window.location.href = mailtoHref;
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    } catch {}
  };

  const handleCopyAll = async () => {
    const fullText = `To: ${selectedEmails.join(", ")}\nSubject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {}
  };

  if (!isOpen || !student) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-5 relative max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#48A5EE]/10 text-[#48A5EE]">
              <Mail className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#48A5EE]">
              Email Dispatcher
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100">
            Send Email &bull; <span className="text-[#48A5EE]">{student.name}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pick recipients, select an auto-filled template, or edit the text before launching your mail app.
          </p>
        </div>

        {/* 1. Recipient Selection Section */}
        <div className="space-y-2.5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>Recipients (Click to toggle):</span>
              <span className="text-[10px] font-semibold text-slate-400">
                ({selectedEmails.length} selected)
              </span>
            </label>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handleSelectAllEmails}
                className="text-[11px] font-bold text-[#48A5EE] hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-600">&bull;</span>
              <button
                type="button"
                onClick={handleClearAllEmails}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Email pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {availableEmails.map((email) => {
              const isSelected = selectedEmails.includes(email);
              return (
                <button
                  key={email}
                  type="button"
                  onClick={() => toggleEmail(email)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-[#48A5EE] text-white border-[#48A5EE] shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[10px] border transition-colors ${
                      isSelected
                        ? "bg-white text-[#48A5EE] border-white font-bold"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span>{email}</span>
                </button>
              );
            })}

            {/* Custom/Extra emails added */}
            {selectedEmails
              .filter((e) => !availableEmails.includes(e))
              .map((extra) => (
                <button
                  key={extra}
                  type="button"
                  onClick={() => toggleEmail(extra)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600 text-white border border-indigo-600 shadow-xs cursor-pointer"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>{extra}</span>
                  <X className="w-3 h-3 opacity-70 hover:opacity-100" />
                </button>
              ))}

            {/* Add extra email button */}
            {!showAddCustomEmail ? (
              <button
                type="button"
                onClick={() => setShowAddCustomEmail(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Email</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={customEmailInput}
                  onChange={(e) => setCustomEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomEmail();
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs bg-white dark:bg-slate-900 border border-[#48A5EE] text-slate-800 dark:text-slate-100 focus:outline-hidden w-44"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomEmail}
                  className="px-2 py-1 rounded-xl bg-[#48A5EE] text-white text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomEmail(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {selectedEmails.length === 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium pt-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Please select at least one email address to send to.</span>
            </p>
          )}
        </div>

        {/* 2. Template Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>Choose Template:</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCreatingTemplate(true);
                setNewTemplateName("");
                setNewTemplateBody(
                  `Hello,\n\nHere is your update:\n[MAGIC LINK HERE]\n\nThanks,\n[TUTOR NAME HERE]`
                );
              }}
              className="text-[11px] font-bold text-[#48A5EE] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>New Template</span>
            </button>
          </div>

          {/* Template buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Template 1: General Meeting */}
            <button
              type="button"
              onClick={() => applyTemplate("general")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                selectedTemplateKey === "general"
                  ? "bg-[#48A5EE]/10 border-[#48A5EE] text-[#48A5EE] shadow-xs"
                  : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>General Meeting</span>
                </span>
                {selectedTemplateKey === "general" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#48A5EE]" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                Portal Magic Link, PIN, &amp; direct Teams meeting link
              </p>
            </button>

            {/* Template 2: Just Teams Link */}
            <button
              type="button"
              onClick={() => applyTemplate("teams")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                selectedTemplateKey === "teams"
                  ? "bg-[#48A5EE]/10 border-[#48A5EE] text-[#48A5EE] shadow-xs"
                  : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  <span>Just Teams Link</span>
                </span>
                {selectedTemplateKey === "teams" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#48A5EE]" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                Quick reminder with only the Microsoft Teams call link
              </p>
            </button>

            {/* Template 3: Direct / Blank Mailto */}
            <button
              type="button"
              onClick={() => applyTemplate("direct")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                selectedTemplateKey === "direct"
                  ? "bg-[#48A5EE]/10 border-[#48A5EE] text-[#48A5EE] shadow-xs"
                  : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Direct Mailto</span>
                </span>
                {selectedTemplateKey === "direct" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#48A5EE]" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                Blank email body with pre-filled subject and recipients
              </p>
            </button>
          </div>

          {/* Custom templates list (if any exist) */}
          {customTemplates.length > 0 && (
            <div className="pt-1 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Your Saved Custom Templates:
              </span>
              <div className="flex flex-wrap gap-2">
                {customTemplates.map((custom) => {
                  const isSelected = selectedTemplateKey === custom.id;
                  return (
                    <div
                      key={custom.id}
                      onClick={() => applyTemplate(custom.id)}
                      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-300 font-bold shadow-xs"
                          : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300"
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                      <span>{custom.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomTemplate(custom.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 transition-opacity ml-1 cursor-pointer"
                        title="Delete template"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Create Custom Template Modal Drawer (if creating) */}
        {isCreatingTemplate && (
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Create New Custom Email Template</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingTemplate(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            {templateSaveError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{templateSaveError}</p>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Template Name:
              </label>
              <input
                type="text"
                placeholder="e.g. Homework Reminder / Exam Notice"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Message Body (Placeholders available):
                </label>
                <span className="text-[10px] text-purple-600 dark:text-purple-300">
                  Tags: [MAGIC LINK HERE], [PIN HERE], [TEAMS MEETING LINK HERE], [TUTOR NAME HERE]
                </span>
              </div>
              <textarea
                rows={5}
                value={newTemplateBody}
                onChange={(e) => setNewTemplateBody(e.target.value)}
                placeholder="Write your template text here..."
                className="w-full p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-purple-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingTemplate(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewTemplate}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Save Template
              </button>
            </div>
          </div>
        )}

        {/* 3. Teams Link Editor (if template includes teams link or tutor wants to verify it) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>Teams Meeting Link for this email:</span>
            </label>
            {!teamsUrl && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                (Optional / Not set)
              </span>
            )}
          </div>
          <input
            type="url"
            value={teamsUrl}
            onChange={(e) => handleTeamsUrlChange(e.target.value)}
            placeholder="https://teams.microsoft.com/l/meetup-join/..."
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-[#48A5EE] transition-all"
          />
        </div>

        {/* 4. Subject Line */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
            <span>Subject:</span>
            <span className="text-[10px] text-slate-400 font-normal">
              Preset to &quot;Tuition Meeting&quot;
            </span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold focus:outline-hidden focus:border-[#48A5EE] transition-all"
          />
        </div>

        {/* 5. Message Body Preview & Editor */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#48A5EE]" />
              <span>Email Message:</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyBody}
                className="text-[11px] font-bold text-[#48A5EE] hover:underline flex items-center gap-1 cursor-pointer"
                title="Copy message body to clipboard"
              >
                {copiedBody ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message here..."
            className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-hidden focus:border-[#48A5EE] transition-all resize-y font-sans leading-relaxed"
          />
        </div>

        {/* 6. Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy To recipients, Subject, and Body together for webmail"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied Full Details</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenMailto}
              disabled={selectedEmails.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#48A5EE] hover:bg-[#3292dc] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={
                selectedEmails.length === 0
                  ? "Select at least one recipient"
                  : `Launch mail application for ${selectedEmails.join(", ")}`
              }
            >
              <ExternalLink className="w-4 h-4" />
              <span>
                Open in Email App ({selectedEmails.length})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

