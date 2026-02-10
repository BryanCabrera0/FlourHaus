"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";

type Props = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

export default function ImageUploadField({ value, onChange, disabled }: Props) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);

      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        setUploadError("Use JPEG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Max 5 MB.");
        return;
      }

      setUploading(true);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = (await res.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;
        if (!res.ok || !json?.url) {
          throw new Error(json?.error ?? "Upload failed.");
        }
        onChange(json.url);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) {
      return;
    }
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) {
      return;
    }
    setDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
  }

  return (
    <div>
      <label className="admin-label">Image</label>

      <div className="flex gap-2 mb-2">
        <button
          type="button"
          className={`upload-tab ${tab === "upload" ? "active" : ""}`}
          onClick={() => setTab("upload")}
          disabled={disabled}
        >
          Upload
        </button>
        <button
          type="button"
          className={`upload-tab ${tab === "url" ? "active" : ""}`}
          onClick={() => setTab("url")}
          disabled={disabled}
        >
          Paste URL
        </button>
      </div>

      {tab === "upload" ? (
        <div
          className={`upload-dropzone p-4 text-center ${dragging ? "dragging" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => {
            if (!disabled) fileInputRef.current?.click();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <div className="py-2">
              <div
                className="upload-progress-bar w-full mx-auto"
                style={{ maxWidth: 200 }}
              />
              <p className="text-xs mt-2 text-fh-muted">Uploading...</p>
            </div>
          ) : (
            <div className="py-2">
              <svg
                className="mx-auto mb-1 text-fh-muted"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-xs text-fh-muted">
                Drop an image or click to browse
              </p>
              <p className="text-xs mt-0.5 text-fh-muted">
                JPEG, PNG, WebP, GIF &middot; Max 5 MB
              </p>
            </div>
          )}
        </div>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="admin-input"
          placeholder="https://... (optional)"
          disabled={disabled}
        />
      )}

      {uploadError ? (
        <p className="text-xs mt-1 text-fh-danger">{uploadError}</p>
      ) : null}

      {value ? (
        <div className="mt-2 flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="h-16 rounded-lg object-cover border surface-divider"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="btn-remove text-xs py-1 px-2"
            title="Remove image"
            disabled={disabled}
          >
            &times;
          </button>
        </div>
      ) : null}
    </div>
  );
}

