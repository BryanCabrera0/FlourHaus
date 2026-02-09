"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/app/lib/format";

type AdminMenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type MenuDraft = {
  name: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
};

type AdminMenuManagerProps = {
  initialItems: AdminMenuItem[];
};

function sortItems(items: AdminMenuItem[]): AdminMenuItem[] {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    const categoryCmp = a.category.localeCompare(b.category);
    if (categoryCmp !== 0) {
      return categoryCmp;
    }
    return a.id - b.id;
  });
}

function toDraft(item: AdminMenuItem): MenuDraft {
  return {
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.price.toString(),
    imageUrl: item.imageUrl ?? "",
    sortOrder: item.sortOrder.toString(),
    isActive: item.isActive,
  };
}

function parsePrice(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function parseSortOrder(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function groupByCategory(items: AdminMenuItem[]): { category: string; items: AdminMenuItem[] }[] {
  const map = new Map<string, AdminMenuItem[]>();
  for (const item of items) {
    const existing = map.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.category, [item]);
    }
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

/* ── ImageUploadField ──────────────────────── */

function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
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
        const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
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

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  return (
    <div>
      <label className="admin-label">Image</label>

      {/* tab switcher */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          className={`upload-tab ${tab === "upload" ? "active" : ""}`}
          onClick={() => setTab("upload")}
        >
          Upload
        </button>
        <button
          type="button"
          className={`upload-tab ${tab === "url" ? "active" : ""}`}
          onClick={() => setTab("url")}
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
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <div className="py-2">
              <div className="upload-progress-bar w-full mx-auto" style={{ maxWidth: 200 }} />
              <p className="text-xs mt-2" style={{ color: "#5E5485" }}>
                Uploading...
              </p>
            </div>
          ) : (
            <div className="py-2">
              <svg
                className="mx-auto mb-1"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A0A0B8"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-xs" style={{ color: "#5E5485" }}>
                Drop an image or click to browse
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#6E6395" }}>
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
        />
      )}

      {uploadError && (
        <p className="text-xs mt-1" style={{ color: "#C06070" }}>
          {uploadError}
        </p>
      )}

      {/* preview */}
      {value && (
        <div className="mt-2 flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="h-16 rounded-lg object-cover"
            style={{ border: "1px solid rgba(91, 164, 212, 0.15)" }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="btn-remove text-xs py-1 px-2"
            title="Remove image"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────── */

export default function AdminMenuManager({ initialItems }: AdminMenuManagerProps) {
  const [items, setItems] = useState<AdminMenuItem[]>(sortItems(initialItems));
  const [drafts, setDrafts] = useState<Record<number, MenuDraft>>(() =>
    Object.fromEntries(initialItems.map((item) => [item.id, toDraft(item)])),
  );
  const [createForm, setCreateForm] = useState<MenuDraft>({
    name: "",
    description: "",
    category: "",
    price: "0",
    imageUrl: "",
    sortOrder: "0",
    isActive: true,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const hasItems = items.length > 0;
  const menuItems = useMemo(() => sortItems(items), [items]);
  const grouped = useMemo(() => groupByCategory(menuItems), [menuItems]);

  function setDraftValue(id: number, field: keyof MenuDraft, value: string | boolean) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  }

  function setBusy(id: number, value: boolean) {
    setBusyIds((prev) => ({ ...prev, [id]: value }));
  }

  async function handleCreate() {
    if (isCreating) {
      return;
    }

    setError(null);
    setMessage(null);

    const price = parsePrice(createForm.price);
    const sortOrder = parseSortOrder(createForm.sortOrder);
    if (!createForm.name.trim() || !createForm.description.trim() || !createForm.category.trim() || price === null || sortOrder === null) {
      setError("Name, description, category, valid price, and valid display order are required.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          category: createForm.category,
          price,
          imageUrl: createForm.imageUrl,
          sortOrder,
          isActive: createForm.isActive,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; menuItem?: AdminMenuItem }
        | null;

      if (!response.ok || !payload?.menuItem) {
        throw new Error(payload?.error ?? "Failed to create menu item.");
      }

      const created = payload.menuItem;
      setItems((prev) => sortItems([...prev, created]));
      setDrafts((prev) => ({ ...prev, [created.id]: toDraft(created) }));
      setCreateForm({
        name: "",
        description: "",
        category: "",
        price: "0",
        imageUrl: "",
        sortOrder: "0",
        isActive: true,
      });
      setMessage(`Created "${created.name}".`);
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create menu item.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSave(id: number) {
    const draft = drafts[id];
    if (!draft || busyIds[id]) {
      return;
    }

    setError(null);
    setMessage(null);

    const price = parsePrice(draft.price);
    const sortOrder = parseSortOrder(draft.sortOrder);
    if (!draft.name.trim() || !draft.description.trim() || !draft.category.trim() || price === null || sortOrder === null) {
      setError("Name, description, category, valid price, and valid display order are required.");
      return;
    }

    setBusy(id, true);
    try {
      const response = await fetch(`/api/admin/menu/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          category: draft.category,
          price,
          imageUrl: draft.imageUrl,
          sortOrder,
          isActive: draft.isActive,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; menuItem?: AdminMenuItem }
        | null;

      if (!response.ok || !payload?.menuItem) {
        throw new Error(payload?.error ?? "Failed to update menu item.");
      }

      setItems((prev) =>
        sortItems(prev.map((item) => (item.id === id ? payload.menuItem! : item))),
      );
      setDrafts((prev) => ({ ...prev, [id]: toDraft(payload.menuItem!) }));
      setMessage(`Saved "${payload.menuItem.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update menu item.");
    } finally {
      setBusy(id, false);
    }
  }

  async function handleToggleActive(id: number) {
    const draft = drafts[id];
    if (!draft || busyIds[id]) {
      return;
    }

    setBusy(id, true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/menu/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !draft.isActive }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; menuItem?: AdminMenuItem }
        | null;
      if (!response.ok || !payload?.menuItem) {
        throw new Error(payload?.error ?? "Failed to update menu item.");
      }
      setItems((prev) =>
        sortItems(prev.map((item) => (item.id === id ? payload.menuItem! : item))),
      );
      setDrafts((prev) => ({ ...prev, [id]: toDraft(payload.menuItem!) }));
      setMessage(
        payload.menuItem.isActive
          ? `Activated "${payload.menuItem.name}".`
          : `Archived "${payload.menuItem.name}".`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update menu item.");
    } finally {
      setBusy(id, false);
    }
  }

  async function handleDelete(id: number) {
    const item = items.find((entry) => entry.id === id);
    if (!item || busyIds[id]) {
      return;
    }

    const confirmed = window.confirm(`Delete "${item.name}" permanently?`);
    if (!confirmed) {
      return;
    }

    setBusy(id, true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/menu/${id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Failed to delete menu item.");
      }

      setItems((prev) => prev.filter((entry) => entry.id !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setMessage(`Deleted "${item.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete menu item.");
    } finally {
      setBusy(id, false);
    }
  }

  /* running index for stagger delay */
  let cardIndex = 0;

  return (
    <div className="space-y-6 relative z-10">
      {/* ── Collapsible Add Menu Item (CSS accordion) ── */}
      <div className="panel menu-add-panel panel-hover-glow animate-card-enter overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="w-full p-5 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg font-bold"
              style={{ background: "#BAA0E6" }}
            >
              +
            </span>
            <h2 className="text-xl font-bold" style={{ color: "#40375F" }}>
              Add Menu Item
            </h2>
          </div>
          <span
            className="text-lg transition-transform duration-300"
            style={{
              color: "#BAA0E6",
              transform: showCreateForm ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            &#9662;
          </span>
        </button>

        <div className={`accordion-content ${showCreateForm ? "open" : ""}`}>
          <div className="accordion-inner">
            <div className="px-5 pb-5 pt-5" style={{ borderTop: "1px solid rgba(186, 156, 230, 0.15)" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Name</label>
                  <input
                    value={createForm.name}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="admin-input"
                    placeholder="e.g. Sourdough Loaf"
                  />
                </div>
                <div>
                  <label className="admin-label">Category</label>
                  <input
                    value={createForm.category}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="admin-input"
                    placeholder="e.g. Breads"
                  />
                </div>
                <div>
                  <label className="admin-label">Price</label>
                  <input
                    value={createForm.price}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, price: event.target.value }))}
                    className="admin-input"
                    placeholder="4.99"
                  />
                </div>
                <div>
                  <label className="admin-label">Display Order</label>
                  <input
                    value={createForm.sortOrder}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                    className="admin-input"
                    placeholder="1 = first, 10 = later"
                  />
                </div>
                <div className="md:col-span-2">
                  <ImageUploadField
                    value={createForm.imageUrl}
                    onChange={(url) => setCreateForm((prev) => ({ ...prev, imageUrl: url }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="admin-label">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="admin-input"
                    style={{ resize: "vertical" }}
                    rows={3}
                    placeholder="Describe this item..."
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
                <label className="text-sm flex items-center gap-2" style={{ color: "#6B5D79" }}>
                  <input
                    type="checkbox"
                    checked={createForm.isActive}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, isActive: event.target.checked }))
                    }
                  />
                  Item is active
                </label>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="btn-pastel-primary py-2.5 px-5 text-sm disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feedback messages ── */}
      {error ? (
        <div className="feedback-error text-sm p-3 rounded-lg animate-card-enter">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="feedback-success text-sm p-3 rounded-lg animate-card-enter">
          {message}
        </div>
      ) : null}

      {/* ── Menu items grouped by category ── */}
      {!hasItems ? (
        <div className="panel panel-hover-glow p-6 animate-card-enter">
          <p style={{ color: "#6B5D79" }}>No menu items yet.</p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.category} className="space-y-4">
            {/* Category header */}
            <div className="category-bar flex items-center gap-3">
              <h3 className="category-underline text-sm font-semibold uppercase tracking-wider" style={{ color: "#6B5B95" }}>
                {group.category}
              </h3>
              <div className="flex-1" />
              <span
                className="accent-lavender text-xs font-semibold px-2.5 py-0.5 rounded-full"
              >
                {group.items.length} item{group.items.length === 1 ? "" : "s"}
              </span>
            </div>

            {group.items.map((item) => {
              const draft = drafts[item.id] ?? toDraft(item);
              const busy = !!busyIds[item.id];
              const delay = cardIndex * 0.07;
              cardIndex++;
              return (
                <div
                  key={item.id}
                  className={`panel menu-item-card panel-hover-glow animate-card-enter p-0 overflow-hidden ${!item.isActive ? "item-archived" : ""}`}
                  style={{ animationDelay: `${delay}s` }}
                >
                  {/* Item header */}
	                  <div className="p-5 flex justify-between items-start gap-4 flex-wrap">
	                    <div className="flex gap-4 items-start">
	                      {/* Image thumbnail */}
	                      {item.imageUrl ? (
	                        // eslint-disable-next-line @next/next/no-img-element
	                        <img
	                          src={item.imageUrl}
	                          alt={item.name}
	                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
	                          style={{ border: "2px solid rgba(186,156,230,0.15)" }}
	                        />
	                      ) : (
                        <div
                          className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ background: "rgba(186,156,230,0.08)", border: "2px solid rgba(186,156,230,0.12)" }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BAA0E6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold" style={{ color: "#40375F" }}>
                            {item.name}
                          </p>
                          <span className="text-xs font-medium accent-sky px-1.5 py-0.5 rounded" style={{ fontSize: "0.65rem" }}>
                            #{item.id}
                          </span>
                          {item.isActive ? (
                            <span className="status-active inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4CAF7D" }} />
                              Active
                            </span>
                          ) : (
                            <span className="status-archived inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#BAA0E6" }} />
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-0.5" style={{ color: "#6B5D79" }}>
                          {formatCurrency(item.price)} &middot; display order {item.sortOrder}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#6E6395" }}>
                          Updated {new Date(item.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item.id)}
                        disabled={busy}
                        className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
                      >
                        {draft.isActive ? "Archive" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={busy}
                        className="btn-remove text-xs py-2 px-3 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Edit fields */}
                  <div className="menu-edit-section px-5 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="admin-label">Name</label>
                        <input
                          value={draft.name}
                          onChange={(event) => setDraftValue(item.id, "name", event.target.value)}
                          className="admin-input"
                        />
                      </div>
                      <div>
                        <label className="admin-label">Category</label>
                        <input
                          value={draft.category}
                          onChange={(event) => setDraftValue(item.id, "category", event.target.value)}
                          className="admin-input"
                        />
                      </div>
                      <div>
                        <label className="admin-label">Price</label>
                        <input
                          value={draft.price}
                          onChange={(event) => setDraftValue(item.id, "price", event.target.value)}
                          className="admin-input"
                        />
                      </div>
                      <div>
                        <label className="admin-label">Display Order</label>
                        <input
                          value={draft.sortOrder}
                          onChange={(event) => setDraftValue(item.id, "sortOrder", event.target.value)}
                          className="admin-input"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <ImageUploadField
                          value={draft.imageUrl}
                          onChange={(url) => setDraftValue(item.id, "imageUrl", url)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="admin-label">Description</label>
                        <textarea
                          value={draft.description}
                          onChange={(event) =>
                            setDraftValue(item.id, "description", event.target.value)
                          }
                          className="admin-input"
                          style={{ resize: "vertical" }}
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center gap-4 flex-wrap">
                      <label className="text-sm flex items-center gap-2" style={{ color: "#6B5D79" }}>
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(event) => setDraftValue(item.id, "isActive", event.target.checked)}
                        />
                        Item is active
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSave(item.id)}
                        disabled={busy}
                        className="btn-pastel-primary py-2.5 px-5 text-sm disabled:opacity-50"
                      >
                        {busy ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
