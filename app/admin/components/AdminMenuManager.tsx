"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { AdminMenuItemVariant } from "@/lib/types";
import MenuItemVariantsEditor from "./MenuItemVariantsEditor";

type AdminMenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  isFeatured: boolean;
  featuredSortOrder: number;
  variants: AdminMenuItemVariant[];
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
  isFeatured: boolean;
  featuredSortOrder: string;
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
    isFeatured: item.isFeatured,
    featuredSortOrder: item.featuredSortOrder.toString(),
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
              <p className="text-xs mt-2 text-fh-muted">
                Uploading...
              </p>
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
        />
      )}

      {uploadError && (
        <p className="text-xs mt-1 text-fh-danger">
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
            className="h-16 rounded-lg object-cover border surface-divider"
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
    isFeatured: false,
    featuredSortOrder: "0",
    isActive: true,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const hasItems = items.length > 0;
  const menuItems = useMemo(() => sortItems(items), [items]);
  const grouped = useMemo(() => groupByCategory(menuItems), [menuItems]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isFiltering = normalizedSearch.length > 0;

  const visibleGroups = useMemo(() => {
    if (!normalizedSearch) {
      return grouped;
    }

    return grouped
      .map((group) => ({
        category: group.category,
        items: group.items.filter((item) => {
          const haystack = `${item.name} ${item.description} ${item.category}`.toLowerCase();
          return haystack.includes(normalizedSearch);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [grouped, normalizedSearch]);

  const totalVisibleItems = useMemo(
    () => visibleGroups.reduce((sum, group) => sum + group.items.length, 0),
    [visibleGroups],
  );

  const visibleItemIds = useMemo(
    () => visibleGroups.flatMap((group) => group.items.map((item) => item.id)),
    [visibleGroups],
  );

  const selectedCount = selectedIds.size;
  const isSomeVisibleSelected = visibleItemIds.some((id) => selectedIds.has(id));
  const isAllVisibleSelected =
    visibleItemIds.length > 0 && visibleItemIds.every((id) => selectedIds.has(id));

  const selectAllVisibleRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (!node) {
        return;
      }
      node.indeterminate = !isAllVisibleSelected && isSomeVisibleSelected;
    },
    [isAllVisibleSelected, isSomeVisibleSelected],
  );

  const anySelectedBusy = useMemo(
    () => Array.from(selectedIds).some((id) => !!busyIds[id]),
    [busyIds, selectedIds],
  );

  const bulkActionsDisabled = isBulkWorking || selectedCount === 0 || anySelectedBusy;

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

  function setBusyMany(ids: number[], value: boolean) {
    setBusyIds((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = value;
      }
      return next;
    });
  }

  function toggleSelectedId(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set<number>());
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allVisibleSelected =
        visibleItemIds.length > 0 && visibleItemIds.every((id) => prev.has(id));

      if (allVisibleSelected) {
        for (const id of visibleItemIds) {
          next.delete(id);
        }
      } else {
        for (const id of visibleItemIds) {
          next.add(id);
        }
      }

      return next;
    });
  }

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  function expandAllVisibleCategories() {
    setExpandedCategories((prev) => {
      const next = { ...prev };
      for (const group of visibleGroups) {
        next[group.category] = true;
      }
      return next;
    });
  }

  function collapseAllVisibleCategories() {
    setExpandedCategories((prev) => {
      const next = { ...prev };
      for (const group of visibleGroups) {
        next[group.category] = false;
      }
      return next;
    });
    setEditingItemId(null);
  }

  async function handleCreate() {
    if (isCreating) {
      return;
    }

    setError(null);
    setMessage(null);

    const price = parsePrice(createForm.price);
    const sortOrder = parseSortOrder(createForm.sortOrder);
    const featuredSortOrder = createForm.isFeatured
      ? parseSortOrder(createForm.featuredSortOrder)
      : 0;

    if (
      !createForm.name.trim() ||
      !createForm.description.trim() ||
      !createForm.category.trim() ||
      price === null ||
      sortOrder === null ||
      featuredSortOrder === null
    ) {
      setError("Name, description, category, valid price, and valid order values are required.");
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
          isFeatured: createForm.isFeatured,
          featuredSortOrder,
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
        isFeatured: false,
        featuredSortOrder: "0",
        isActive: true,
      });
      setMessage(`Created "${created.name}".`);
      setShowCreateForm(false);
      setExpandedCategories((prev) => ({ ...prev, [created.category]: true }));
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
    const featuredSortOrder = draft.isFeatured ? parseSortOrder(draft.featuredSortOrder) : 0;

    if (
      !draft.name.trim() ||
      !draft.description.trim() ||
      !draft.category.trim() ||
      price === null ||
      sortOrder === null ||
      featuredSortOrder === null
    ) {
      setError("Name, description, category, valid price, and valid order values are required.");
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
          isFeatured: draft.isFeatured,
          featuredSortOrder,
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
      setExpandedCategories((prev) => ({ ...prev, [payload.menuItem!.category]: true }));
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
      setEditingItemId((prev) => (prev === id ? null : prev));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setMessage(`Deleted "${item.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete menu item.");
    } finally {
      setBusy(id, false);
    }
  }

  async function requestMenuUpdate(id: number, body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/menu/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; menuItem?: AdminMenuItem }
      | null;

    if (!response.ok || !payload?.menuItem) {
      throw new Error(payload?.error ?? "Failed to update menu item.");
    }

    return payload.menuItem;
  }

  async function requestMenuDelete(id: number) {
    const response = await fetch(`/api/admin/menu/${id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; ok?: boolean }
      | null;

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error ?? "Failed to delete menu item.");
    }
  }

  function formatCount(count: number, noun: string) {
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
  }

  async function handleBulkSetActive(nextActive: boolean) {
    if (isBulkWorking || selectedIds.size === 0) {
      return;
    }

    const itemsById = new Map(items.map((item) => [item.id, item]));
    const targetIds = Array.from(selectedIds).filter((id) => {
      const item = itemsById.get(id);
      return item && item.isActive !== nextActive;
    });

    if (targetIds.length === 0) {
      setError(null);
      setMessage(nextActive ? "Selected items are already active." : "Selected items are already archived.");
      return;
    }

    setIsBulkWorking(true);
    setError(null);
    setMessage(null);
    setBusyMany(targetIds, true);

    const updated: AdminMenuItem[] = [];
    const failures: { id: number; error: string }[] = [];

    for (const id of targetIds) {
      try {
        updated.push(await requestMenuUpdate(id, { isActive: nextActive }));
      } catch (err) {
        failures.push({
          id,
          error: err instanceof Error ? err.message : "Failed to update menu item.",
        });
      }
    }

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((item) => [item.id, item]));
      setItems((prev) =>
        sortItems(prev.map((item) => updatedById.get(item.id) ?? item)),
      );
      setDrafts((prev) => {
        const next = { ...prev };
        for (const item of updated) {
          next[item.id] = toDraft(item);
        }
        return next;
      });

      setMessage(
        nextActive
          ? `Activated ${formatCount(updated.length, "item")}.`
          : `Archived ${formatCount(updated.length, "item")}.`,
      );
    }

    if (failures.length > 0) {
      const first = failures[0];
      setError(
        `Failed to update ${formatCount(failures.length, "item")}. First error: (#${first.id}) ${first.error}`,
      );
    }

    setBusyMany(targetIds, false);
    setIsBulkWorking(false);
  }

  async function handleBulkSetFeatured(nextFeatured: boolean) {
    if (isBulkWorking || selectedIds.size === 0) {
      return;
    }

    const itemsById = new Map(items.map((item) => [item.id, item]));
    const targetIds = Array.from(selectedIds).filter((id) => {
      const item = itemsById.get(id);
      return item && item.isFeatured !== nextFeatured;
    });

    if (targetIds.length === 0) {
      setError(null);
      setMessage(
        nextFeatured
          ? "Selected items are already featured."
          : "Selected items are already not featured.",
      );
      return;
    }

    setIsBulkWorking(true);
    setError(null);
    setMessage(null);
    setBusyMany(targetIds, true);

    const updated: AdminMenuItem[] = [];
    const failures: { id: number; error: string }[] = [];

    for (const id of targetIds) {
      try {
        updated.push(await requestMenuUpdate(id, { isFeatured: nextFeatured }));
      } catch (err) {
        failures.push({
          id,
          error: err instanceof Error ? err.message : "Failed to update menu item.",
        });
      }
    }

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((item) => [item.id, item]));
      setItems((prev) =>
        sortItems(prev.map((item) => updatedById.get(item.id) ?? item)),
      );
      setDrafts((prev) => {
        const next = { ...prev };
        for (const item of updated) {
          next[item.id] = toDraft(item);
        }
        return next;
      });

      setMessage(
        nextFeatured
          ? `Featured ${formatCount(updated.length, "item")}.`
          : `Unfeatured ${formatCount(updated.length, "item")}.`,
      );
    }

    if (failures.length > 0) {
      const first = failures[0];
      setError(
        `Failed to update ${formatCount(failures.length, "item")}. First error: (#${first.id}) ${first.error}`,
      );
    }

    setBusyMany(targetIds, false);
    setIsBulkWorking(false);
  }

  async function handleBulkDelete() {
    if (isBulkWorking || selectedIds.size === 0) {
      return;
    }

    const itemsById = new Map(items.map((item) => [item.id, item]));
    const targetIds = Array.from(selectedIds).filter((id) => itemsById.has(id));

    if (targetIds.length === 0) {
      clearSelection();
      return;
    }

    const confirmed = window.confirm(
      targetIds.length === 1
        ? `Delete "${itemsById.get(targetIds[0])?.name ?? "this item"}" permanently?`
        : `Delete ${targetIds.length} menu items permanently?`,
    );
    if (!confirmed) {
      return;
    }

    setIsBulkWorking(true);
    setError(null);
    setMessage(null);
    setBusyMany(targetIds, true);

    const deletedIds: number[] = [];
    const failures: { id: number; error: string }[] = [];

    for (const id of targetIds) {
      try {
        await requestMenuDelete(id);
        deletedIds.push(id);
      } catch (err) {
        failures.push({
          id,
          error: err instanceof Error ? err.message : "Failed to delete menu item.",
        });
      }
    }

    if (deletedIds.length > 0) {
      const deletedSet = new Set(deletedIds);
      setItems((prev) => prev.filter((item) => !deletedSet.has(item.id)));
      setDrafts((prev) => {
        const next = { ...prev };
        for (const id of deletedIds) {
          delete next[id];
        }
        return next;
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of deletedIds) {
          next.delete(id);
        }
        return next;
      });
      setEditingItemId((prev) => (prev !== null && deletedSet.has(prev) ? null : prev));
      setMessage(`Deleted ${formatCount(deletedIds.length, "item")}.`);
    }

    if (failures.length > 0) {
      const first = failures[0];
      setError(
        `Failed to delete ${formatCount(failures.length, "item")}. First error: (#${first.id}) ${first.error}`,
      );
    }

    setBusyMany(targetIds, false);
    setIsBulkWorking(false);
  }

  return (
    <div className="space-y-6">
      {/* ── Collapsible Add Menu Item (CSS accordion) ── */}
      <div className="panel menu-add-panel overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="w-full p-5 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg font-bold bg-[var(--fh-accent-primary)]">
              +
            </span>
            <h2 className="text-xl font-bold text-fh-heading">
              Add Menu Item
            </h2>
          </div>
          <span
            className="text-lg transition-transform duration-300 text-fh-accent"
            style={{
              transform: showCreateForm ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
        </button>

        <div className={`accordion-content ${showCreateForm ? "open" : ""}`}>
          <div className="accordion-inner">
            <div className="px-5 pb-5 pt-5 border-t surface-divider">
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
                <div>
                  <label className="admin-label">Featured Order</label>
                  <input
                    value={createForm.featuredSortOrder}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, featuredSortOrder: event.target.value }))
                    }
                    className="admin-input"
                    placeholder="0 = first"
                    disabled={!createForm.isFeatured}
                  />
                  <p className="text-xs mt-1 text-fh-muted">
                    Only used when featured.
                  </p>
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
                    className="admin-input resize-y"
                    rows={3}
                    placeholder="Describe this item..."
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm flex items-center gap-2 text-fh-muted">
                    <input
                      type="checkbox"
                      checked={createForm.isActive}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, isActive: event.target.checked }))
                      }
                    />
                    Item is active
                  </label>
                  <label className="text-sm flex items-center gap-2 text-fh-muted">
                    <input
                      type="checkbox"
                      checked={createForm.isFeatured}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, isFeatured: event.target.checked }))
                      }
                    />
                    Featured on home page
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="btn-primary py-2.5 px-5 text-sm disabled:opacity-50"
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
        <div className="panel p-6">
          <p className="text-fh-muted">No menu items yet.</p>
        </div>
      ) : (
        <>
            <div className="panel p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex-1">
                  <label className="admin-label">Find Menu Items</label>
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="admin-input"
                    placeholder="Search by name, description, or category"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={expandAllVisibleCategories}
                    className="btn-admin-nav text-xs py-2 px-3"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllVisibleCategories}
                    className="btn-admin-nav text-xs py-2 px-3"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
  
              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="flex items-center gap-2 text-sm text-fh-muted">
                  <input
                    ref={selectAllVisibleRef}
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--fh-accent-primary)]"
                    checked={isAllVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={visibleItemIds.length === 0 || isBulkWorking}
                    aria-label="Select all visible menu items"
                  />
                  Select all shown
                </label>
  
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-fh-muted">Selected {selectedCount}</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={selectedCount === 0 || isBulkWorking}
                    className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
                  >
                    Clear
                  </button>
                <button
                  type="button"
                  onClick={() => void handleBulkSetActive(true)}
                  disabled={bulkActionsDisabled}
                  className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
                >
                  Activate
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkSetActive(false)}
                  disabled={bulkActionsDisabled}
                  className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkSetFeatured(true)}
                  disabled={bulkActionsDisabled}
                  className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
                >
                  Feature
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkSetFeatured(false)}
                  disabled={bulkActionsDisabled}
                  className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
                >
                  Unfeature
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={bulkActionsDisabled}
                  className="btn-remove text-xs py-2 px-3 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-xs text-fh-muted mt-3">
                Showing {totalVisibleItems} item{totalVisibleItems === 1 ? "" : "s"} across{" "}
                {visibleGroups.length} categor{visibleGroups.length === 1 ? "y" : "ies"}
                {isFiltering ? ` matching "${searchTerm.trim()}".` : "."}
              </p>
            </div>

          {visibleGroups.length === 0 ? (
            <div className="panel p-6">
              <p className="text-fh-muted">No items match your search.</p>
            </div>
          ) : (
            visibleGroups.map((group) => {
              const categoryOpen = isFiltering || !!expandedCategories[group.category];

              return (
                <section key={group.category} className="panel overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isFiltering) {
                        toggleCategory(group.category);
                      }
                    }}
                    className="w-full px-5 py-4 flex items-center justify-between text-left bg-[rgba(255,204,225,0.22)] border-b surface-divider"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm text-fh-accent transition-transform ${
                          categoryOpen ? "rotate-90" : ""
                        }`}
                        aria-hidden="true"
                      >
                        ▶
                      </span>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-fh-accent">
                        {group.category}
                      </h3>
                      <span className="accent-lavender text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {group.items.length} item{group.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="text-xs text-fh-muted">
                      {isFiltering ? "Auto-expanded while searching" : categoryOpen ? "Hide" : "Show"}
                    </span>
                  </button>

                  {categoryOpen ? (
                    <div className="px-5 pb-2">
                      {group.items.map((item, index) => {
                        const draft = drafts[item.id] ?? toDraft(item);
                        const busy = !!busyIds[item.id];
                        const selected = selectedIds.has(item.id);
                        const isEditing = editingItemId === item.id;
                        const descriptionPreview =
                          item.description.length > 120
                            ? `${item.description.slice(0, 120)}...`
                            : item.description;

                        return (
                          <article
                            key={item.id}
                            className={`py-4 ${index > 0 ? "border-t surface-divider" : ""} ${
                              !item.isActive ? "item-archived" : ""
                            }`}
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="flex gap-4 items-start">
                                <div className="pt-1">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleSelectedId(item.id)}
                                    disabled={busy || isBulkWorking}
                                    className="h-4 w-4 accent-[var(--fh-accent-primary)]"
                                    aria-label={`Select ${item.name}`}
                                  />
                                </div>
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border-2 surface-divider"
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center bg-[rgba(224,215,255,0.35)] border-2 surface-divider text-fh-accent">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                      <path d="m21 15-5-5L5 21" />
                                    </svg>
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-fh-heading">{item.name}</p>
                                    <span className="text-[0.65rem] font-medium accent-sky px-1.5 py-0.5 rounded">
                                      #{item.id}
                                    </span>
                                    <span className="price-pill text-xs font-semibold px-2 py-0.5 rounded-full">
                                      {formatCurrency(item.price)}
                                    </span>
                                    {item.isFeatured ? (
                                      <span className="accent-mint text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                        Featured
                                      </span>
                                    ) : null}
                                    {item.isActive ? (
                                      <span className="status-active inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--fh-accent-primary)]" />
                                        Active
                                      </span>
                                    ) : (
                                      <span className="status-archived inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--fh-accent-primary)] opacity-60" />
                                        Archived
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-fh-muted">{descriptionPreview}</p>
                                  <p className="text-xs text-fh-muted">
                                    {item.isFeatured ? `Featured order ${item.featuredSortOrder} \u00b7 ` : ""}
                                    Display order {item.sortOrder} &middot; Updated{" "}
                                    {new Date(item.updatedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              <div className="flex gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingItemId((prev) =>
                                      prev === item.id ? null : item.id,
                                    )
                                  }
                                  className={`${
                                    isEditing ? "btn-admin-nav-active" : "btn-admin-nav"
                                  } text-xs py-2 px-3`}
                                >
                                  {isEditing ? "Close" : "Edit"}
                                </button>
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

                            {isEditing ? (
                              <div className="menu-edit-section mt-4 rounded-xl p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="admin-label">Name</label>
                                    <input
                                      value={draft.name}
                                      onChange={(event) =>
                                        setDraftValue(item.id, "name", event.target.value)
                                      }
                                      className="admin-input"
                                    />
                                  </div>
                                  <div>
                                    <label className="admin-label">Category</label>
                                    <input
                                      value={draft.category}
                                      onChange={(event) =>
                                        setDraftValue(item.id, "category", event.target.value)
                                      }
                                      className="admin-input"
                                    />
                                  </div>
                                  <div>
                                    <label className="admin-label">Price</label>
                                    <input
                                      value={draft.price}
                                      onChange={(event) =>
                                        setDraftValue(item.id, "price", event.target.value)
                                      }
                                      className="admin-input"
                                    />
                                  </div>
                                  <div>
                                    <label className="admin-label">Display Order</label>
                                    <input
                                      value={draft.sortOrder}
                                      onChange={(event) =>
                                        setDraftValue(item.id, "sortOrder", event.target.value)
                                      }
                                      className="admin-input"
                                    />
                                  </div>
                                  <div>
                                    <label className="admin-label">Featured Order</label>
                                    <input
                                      value={draft.featuredSortOrder}
                                      onChange={(event) =>
                                        setDraftValue(item.id, "featuredSortOrder", event.target.value)
                                      }
                                      className="admin-input"
                                      disabled={!draft.isFeatured}
                                    />
                                    <p className="text-xs mt-1 text-fh-muted">
                                      Only used when featured.
                                    </p>
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
                                      className="admin-input resize-y"
                                      rows={3}
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <MenuItemVariantsEditor
                                      menuItemId={item.id}
                                      basePrice={item.price}
                                      variants={item.variants}
                                      disabled={busy}
                                      onVariantsChange={(nextVariants) => {
                                        setItems((prev) =>
                                          sortItems(
                                            prev.map((entry) =>
                                              entry.id === item.id
                                                ? { ...entry, variants: nextVariants }
                                                : entry,
                                            ),
                                          ),
                                        );
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="mt-4 flex justify-between items-center gap-4 flex-wrap">
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <label className="text-sm flex items-center gap-2 text-fh-muted">
                                      <input
                                        type="checkbox"
                                        checked={draft.isActive}
                                        onChange={(event) =>
                                          setDraftValue(item.id, "isActive", event.target.checked)
                                        }
                                      />
                                      Item is active
                                    </label>
                                    <label className="text-sm flex items-center gap-2 text-fh-muted">
                                      <input
                                        type="checkbox"
                                        checked={draft.isFeatured}
                                        onChange={(event) =>
                                          setDraftValue(item.id, "isFeatured", event.target.checked)
                                        }
                                      />
                                      Featured on home page
                                    </label>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSave(item.id)}
                                    disabled={busy}
                                    className="btn-primary py-2.5 px-5 text-sm disabled:opacity-50"
                                  >
                                    {busy ? "Saving..." : "Save Changes"}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
