"use client";

import React, { useState, useRef } from "react";
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  Clock,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import { FileAttachment, formatAttachmentSize, getDaysRemaining } from "@/lib/storage";

interface HomeworkAttachmentsProps {
  sessionId: string;
  attachments?: FileAttachment[] | string | null;
  canUpload?: boolean;
  canDelete?: boolean;
  studentMagicKey?: string;
  onAttachmentsChange?: (newAttachments: FileAttachment[]) => void;
  compact?: boolean;
}

export default function HomeworkAttachments({
  sessionId,
  attachments: rawAttachments,
  canUpload = false,
  canDelete = false,
  studentMagicKey,
  onAttachmentsChange,
  compact = false,
}: HomeworkAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    current: number;
    total: number;
    name: string;
  } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse attachments
  const attachments: FileAttachment[] = React.useMemo(() => {
    if (!rawAttachments) return [];
    if (Array.isArray(rawAttachments)) return rawAttachments;
    try {
      const parsed = JSON.parse(rawAttachments);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  }, [rawAttachments]);

  const parseApiResponse = async (res: Response) => {
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON response (e.g. HTML 502/504 Bad Gateway from proxy)
    }

    if (!res.ok) {
      if (data && typeof data === "object" && data.error) {
        throw new Error(data.error);
      }
      if (res.status === 413) {
        throw new Error("File is too large for the server to process (413). Please upload a smaller file.");
      }
      if (res.status === 502 || res.status === 504) {
        throw new Error("Server or storage service is temporarily unavailable (502/504). Please try again in a moment.");
      }
      throw new Error(`Server returned error (${res.status}). Please try again.`);
    }

    if (!data) {
      throw new Error("Invalid response received from server.");
    }

    return data;
  };

  const getFileIcon = (fileName: string, mimeType?: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || mimeType?.includes("pdf")) {
      return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
    }
    if (
      ["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "") ||
      mimeType?.includes("image")
    ) {
      return <FileImage className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    if (["xlsx", "xls", "csv"].includes(ext || "") || mimeType?.includes("sheet")) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    return <FileIcon className="w-4 h-4 text-blue-500 shrink-0" />;
  };

  const handleUploadFiles = async (files: File[]) => {
    if (!sessionId) return;
    setErrorMsg(null);

    const validFiles = files.filter((f) => f && f.size > 0);
    if (validFiles.length === 0) return;

    // Check 10MB limit on all files upfront before initiating uploads
    for (const f of validFiles) {
      if (f.size > 10 * 1024 * 1024) {
        setErrorMsg(`"${f.name}" exceeds 10 MB limit.`);
        return;
      }
    }

    setIsUploading(true);

    try {
      // Upload files sequentially to avoid hitting proxy request size limits and race conditions
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadStatus({
          current: i + 1,
          total: validFiles.length,
          name: file.name,
        });

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/sessions/${sessionId}/attachments`, {
          method: "POST",
          body: formData,
        });

        const data = await parseApiResponse(res);

        if (onAttachmentsChange && data.attachments) {
          onAttachmentsChange(data.attachments);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (attachment: FileAttachment) => {
    if (!sessionId) return;
    setDownloadingId(attachment.id);
    setErrorMsg(null);

    try {
      const query = studentMagicKey ? `?key=${encodeURIComponent(studentMagicKey)}` : "";
      const res = await fetch(`/api/sessions/${sessionId}/attachments/${attachment.id}${query}`);
      const data = await parseApiResponse(res);

      if (data.downloadUrl) {
        // Open/download link
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = attachment.name;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (attachment: FileAttachment) => {
    if (!sessionId) return;
    if (!confirm(`Are you sure you want to delete "${attachment.name}"?`)) return;

    setDeletingId(attachment.id);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/attachments/${attachment.id}`, {
        method: "DELETE",
      });
      const data = await parseApiResponse(res);

      if (onAttachmentsChange && data.attachments) {
        onAttachmentsChange(data.attachments);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Upload Zone (Tutors only) */}
      {canUpload && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length > 0) handleUploadFiles(files);
            }}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
              if (files.length > 0) handleUploadFiles(files);
            }}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-all ${
              isDragOver
                ? "border-purple-500 bg-purple-50/60 dark:bg-purple-950/40"
                : "border-slate-200 dark:border-slate-700 hover:border-purple-400 bg-white dark:bg-slate-800/40"
            }`}
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate max-w-xs sm:max-w-md">
                  {uploadStatus && uploadStatus.total > 1
                    ? `Uploading (${uploadStatus.current}/${uploadStatus.total}): ${uploadStatus.name}...`
                    : uploadStatus
                    ? `Uploading ${uploadStatus.name}...`
                    : "Uploading attachment to Supabase..."}
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-purple-600 dark:text-purple-400 hover:underline">
                    Click to upload
                  </span>{" "}
                  or drag &amp; drop files (PDFs, worksheets, etc.)
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <span>PDF, Images, Word, Excel (max 10MB)</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">
                    <Clock className="w-2.5 h-2.5" /> 21-day rollover
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const daysLeft = getDaysRemaining(att);
            const isDeleting = deletingId === att.id;
            const isDownloading = downloadingId === att.id;

            return (
              <div
                key={att.id}
                className={`p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs flex items-center justify-between gap-2 transition-colors ${
                  compact ? "text-xs" : "text-xs sm:text-sm"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60">
                    {getFileIcon(att.name, att.type)}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-semibold text-slate-800 dark:text-slate-100 truncate text-xs"
                      title={att.name}
                    >
                      {att.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                      <span>{formatAttachmentSize(att.size)}</span>
                      <span>&bull;</span>
                      <span
                        className={`inline-flex items-center gap-0.5 font-medium ${
                          daysLeft <= 3
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                        title="Files are automatically removed after 21 days according to rolling retention policy"
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>{daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(att)}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Download attachment (presigned 15-minute link)"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    <span>Download</span>
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(att)}
                      disabled={isDeleting}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete attachment"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State when no attachments and not uploadable */}
      {!canUpload && attachments.length === 0 && (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 italic py-1">
          No worksheet files attached for this lesson.
        </div>
      )}
    </div>
  );
}
