"use client";

import { useCallback, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { AdminMenuItemVariant } from "@/lib/types";
import ImageUploadField from "./ImageUploadField";

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
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
  featuredSortOrder: string;
};

type AdminMenuManagerProps = {
  initialItems: AdminMenuItem[];
};

type StatusFilter = "active" | "archived" | "all";
type FeaturedFilter = "featured" | "not_featured" | "all";

function sortItems(items: AdminMenuItem[]): AdminMenuItem[] {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const categoryCmp = a.category.localeCompare(b.category);
    if (categoryCmp !== 0) return categoryCmp;
    return a.id - b.id;
  });
}

function toDraft(item: AdminMenuItem | null): MenuDraft {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    category: item?.category ?? "",
    price: (item?.price ?? 0).toString(),
    imageUrl: item?.imageUrl ?? "",
    isActive: item?.isActive ?? true,
    isFeatured: item?.isFeatured ?? false,
    sortOrder: (item?.sortOrder ?? 0).toString(),
    featuredSortOrder: (item?.featuredSortOrder ?? 0).toString(),
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

function formatCount(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
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

async function requestMenuCreate(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/menu", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; menuItem?: AdminMenuItem }
    | null;

  if (!response.ok || !payload?.menuItem) {
    throw new Error(payload?.error ?? "Failed to create menu item.");
  }

  return payload.menuItem;
}

function ItemImage({ item }: { item: Pick<AdminMenuItem, "imageUrl" | "name"> }) {
  if (item.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border surface-divider bg-white/60" />;
  }

  return (
    <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center bg-[rgba(224,215,255,0.35)] border surface-divider text-fh-accent">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    </div>
  );
}

export default function AdminMenuManager({ initialItems }: AdminMenuManagerProps) {
  const [items, setItems] = useState<AdminMenuItem[]>(() => sortItems(initialItems));
  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({});

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [isBulkWorking, setIsBulkWorking] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editorDraft, setEditorDraft] = useState<MenuDraft>(() => toDraft(null));
  const [editorBusy, setEditorBusy] = useState(false);

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "archived" && item.isActive) return false;

      if (featuredFilter === "featured" && !item.isFeatured) return false;
      if (featuredFilter === "not_featured" && item.isFeatured) return false;

      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      if (!normalizedSearch) return true;
      const haystack = `${item.name} ${item.description} ${item.category}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [categoryFilter, featuredFilter, items, normalizedSearch, statusFilter]);

  const visibleItemIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);

  const selectedCount = selectedIds.size;
  const isSomeVisibleSelected = visibleItemIds.some((id) => selectedIds.has(id));
  const isAllVisibleSelected =
    visibleItemIds.length > 0 && visibleItemIds.every((id) => selectedIds.has(id));

  const selectAllVisibleRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (!node) return;
      node.indeterminate = !isAllVisibleSelected && isSomeVisibleSelected;
    },
    [isAllVisibleSelected, isSomeVisibleSelected],
  );

  const anySelectedBusy = useMemo(
    () => Array.from(selectedIds).some((id) => !!busyIds[id]),
    [busyIds, selectedIds],
  );

  const bulkActionsDisabled = isBulkWorking || selectedCount === 0 || anySelectedBusy;

  function setBusy(id: number, value: boolean) {
    setBusyIds((prev) => ({ ...prev, [id]: value }));
  }

  function setBusyMany(ids: number[], value: boolean) {
    setBusyIds((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = value;
      return next;
    });
  }

  function toggleSelectedId(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        for (const id of visibleItemIds) next.delete(id);
      } else {
        for (const id of visibleItemIds) next.add(id);
      }

      return next;
    });
  }

  function openCreate() {
    setError(null);
    setMessage(null);
    setEditorMode("create");
    setEditingItemId(null);
    setEditorDraft(toDraft(null));
    setEditorOpen(true);
  }

  function openEdit(itemId: number) {
    const item = items.find((entry) => entry.id === itemId) ?? null;
    if (!item) return;
    setError(null);
    setMessage(null);
    setEditorMode("edit");
    setEditingItemId(itemId);
    setEditorDraft(toDraft(item));
    setEditorOpen(true);
  }

  function closeEditor() {
    if (editorBusy) return;
    setEditorOpen(false);
  }

  async function handleQuickToggleActive(id: number) {
    const item = items.find((entry) => entry.id === id);
    if (!item || busyIds[id]) return;

    setError(null);
    setMessage(null);
    setBusy(id, true);
    try {
      const updated = await requestMenuUpdate(id, { isActive: !item.isActive });
      setItems((prev) => sortItems(prev.map((entry) => (entry.id === id ? updated : entry))));
      setMessage(updated.isActive ? `Activated "${updated.name}".` : `Archived "${updated.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update menu item.");
    } finally {
      setBusy(id, false);
    }
  }

  async function handleQuickToggleFeatured(id: number) {
    const item = items.find((entry) => entry.id === id);
    if (!item || busyIds[id]) return;

    setError(null);
    setMessage(null);
    setBusy(id, true);
    try {
      const updated = await requestMenuUpdate(id, { isFeatured: !item.isFeatured });
      setItems((prev) => sortItems(prev.map((entry) => (entry.id === id ? updated : entry))));
      setMessage(updated.isFeatured ? `Featured "${updated.name}".` : `Unfeatured "${updated.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update menu item.");
    } finally {
      setBusy(id, false);
    }
  }

  async function handleDelete(id: number) {
    const item = items.find((entry) => entry.id === id);
    if (!item || busyIds[id]) return;

    const confirmed = window.confirm(`Delete "${item.name}" permanently?`);
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    setBusy(id, true);
    try {
      await requestMenuDelete(id);
      setItems((prev) => prev.filter((entry) => entry.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setMessage(`Deleted "${item.name}".`);
      if (editingItemId === id) {
        setEditorOpen(false);
        setEditingItemId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete menu item.");
    } finally {
      setBusy(id, false);
    }
  }

  async function handleBulkSetActive(nextActive: boolean) {
    if (isBulkWorking || selectedIds.size === 0) return;

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
        failures.push({ id, error: err instanceof Error ? err.message : "Failed to update menu item." });
      }
    }

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((item) => [item.id, item]));
      setItems((prev) => sortItems(prev.map((item) => updatedById.get(item.id) ?? item)));
      setMessage(
        nextActive ? `Activated ${formatCount(updated.length, "item")}.` : `Archived ${formatCount(updated.length, "item")}.`,
      );
    }

    if (failures.length > 0) {
      const first = failures[0];
      setError(`Failed to update ${formatCount(failures.length, "item")}. First error: (#${first.id}) ${first.error}`);
    }

    setBusyMany(targetIds, false);
    setIsBulkWorking(false);
  }

  async function handleBulkSetFeatured(nextFeatured: boolean) {
    if (isBulkWorking || selectedIds.size === 0) return;

    const itemsById = new Map(items.map((item) => [item.id, item]));
    const targetIds = Array.from(selectedIds).filter((id) => {
      const item = itemsById.get(id);
      return item && item.isFeatured !== nextFeatured;
    });

    if (targetIds.length === 0) {
      setError(null);
      setMessage(nextFeatured ? "Selected items are already featured." : "Selected items are already not featured.");
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
        failures.push({ id, error: err instanceof Error ? err.message : "Failed to update menu item." });
      }
    }

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((item) => [item.id, item]));
      setItems((prev) => sortItems(prev.map((item) => updatedById.get(item.id) ?? item)));
      setMessage(nextFeatured ? `Featured ${formatCount(updated.length, "item")}.` : `Unfeatured ${formatCount(updated.length, "item")}.`);
    }

    if (failures.length > 0) {
      const first = failures[0];
      setError(`Failed to update ${formatCount(failures.length, "item")}. First error: (#${first.id}) ${first.error}`);
    }

    setBusyMany(targetIds, false);
    setIsBulkWorking(false);
  }

  async function handleBulkDelete() {
    if (isBulkWorking || selectedIds.size === 0) return;

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
    if (!confirmed) return;

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
        failures.push({ id, error: err instanceof Error ? err.message : "Failed to delete menu item." });
      }
    }

    if (deletedIds.length > 0) {
      const deletedSet = new Set(deletedIds);
      setItems((prev) => prev.filter((item) => !deletedSet.has(item.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of deletedIds) next.delete(id);
        return next;
      });
      setMessage(`Deleted ${formatCount(deletedIds.length, "item")}.`);
    }

    if (failures.length > 0) {
      const first = failures[0];
      setError(`Failed to delete ${formatCount(failures.length, "item")}. First error: (#${first.id}) ${first.error}`);
    }

    setBusyMany(targetIds, false);
    setIsBulkWorking(false);
  }

  async function handleEditorSave() {
    if (editorBusy) return;

    setError(null);
    setMessage(null);

    const price = parsePrice(editorDraft.price);
    const sortOrder = parseSortOrder(editorDraft.sortOrder);
    const featuredSortOrder = editorDraft.isFeatured ? parseSortOrder(editorDraft.featuredSortOrder) : 0;

    if (
      !editorDraft.name.trim() ||
      !editorDraft.description.trim() ||
      !editorDraft.category.trim() ||
      price === null ||
      sortOrder === null ||
      featuredSortOrder === null
    ) {
      setError("Name, description, category, valid price, and valid order values are required.");
      return;
    }

    const payload = {
      name: editorDraft.name.trim(),
      description: editorDraft.description.trim(),
      category: editorDraft.category.trim(),
      price,
      imageUrl: editorDraft.imageUrl,
      isActive: editorDraft.isActive,
      isFeatured: editorDraft.isFeatured,
      sortOrder,
      featuredSortOrder,
    };

    setEditorBusy(true);
    try {
      if (editorMode === "create") {
        const created = await requestMenuCreate(payload);
        setItems((prev) => sortItems([...prev, created]));
        setMessage(`Created "${created.name}".`);
        setEditorOpen(false);
      } else {
        const id = editingItemId;
        if (!id) {
          setError("No menu item selected.");
          return;
        }

        setBusy(id, true);
        const updated = await requestMenuUpdate(id, payload);
        setItems((prev) => sortItems(prev.map((entry) => (entry.id === id ? updated : entry))));
        setMessage(`Saved "${updated.name}".`);
        setEditorOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save menu item.");
    } finally {
      if (editingItemId) setBusy(editingItemId, false);
      setEditorBusy(false);
    }
  }

  const editingItem =
    editorMode === "edit" && editingItemId
      ? items.find((entry) => entry.id === editingItemId) ?? null
      : null;

  const isCookieDraft = useMemo(() => {
    const normalized = editorDraft.category.trim().toLowerCase();
    return normalized === "cookies" || normalized === "cookie";
  }, [editorDraft.category]);

  return (
    <div className="space-y-6">
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

      <div className="panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label className="admin-label">Search</label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="admin-input"
              placeholder="Search by name, category, description..."
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={openCreate}
              className="btn-primary py-2.5 px-4 text-xs"
            >
              + Add item
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="admin-label">Category</label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="admin-input"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="admin-input"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="admin-label">Featured</label>
            <select
              value={featuredFilter}
              onChange={(event) => setFeaturedFilter(event.target.value as FeaturedFilter)}
              className="admin-input"
            >
              <option value="all">All</option>
              <option value="featured">Featured</option>
              <option value="not_featured">Not featured</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-fh-muted mt-4">
          Showing {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}.
        </p>

        {selectedCount > 0 ? (
          <div className="mt-4 surface-soft p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-fh-muted">
              Selected <span className="font-semibold text-fh-heading">{selectedCount}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={clearSelection}
                disabled={isBulkWorking}
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
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="panel p-6">
          <p className="text-fh-muted">No menu items yet.</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="panel p-6">
          <p className="text-fh-muted">No items match your filters.</p>
        </div>
      ) : (
        <div className="panel p-0 overflow-hidden">
          <div className="px-5 py-4 border-b surface-divider flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-fh-muted">
              <input
                ref={selectAllVisibleRef}
                type="checkbox"
                className="h-4 w-4 accent-[var(--fh-accent-primary)]"
                checked={isAllVisibleSelected}
                onChange={toggleSelectAllVisible}
                disabled={visibleItemIds.length === 0 || isBulkWorking}
              />
              Select all shown
            </label>
            <p className="text-xs text-fh-muted">
              Tip: use the star button to feature an item on the home page.
            </p>
          </div>

          <div className="divide-y surface-divider">
            {visibleItems.map((item) => {
              const busy = !!busyIds[item.id];
              const selected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${!item.isActive ? "item-archived" : ""}`}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelectedId(item.id)}
                      disabled={busy || isBulkWorking}
                      className="mt-1 h-4 w-4 accent-[var(--fh-accent-primary)]"
                      aria-label={`Select ${item.name}`}
                    />

                    <ItemImage item={item} />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-fh-heading truncate">
                          {item.name}
                        </p>
                        <span className="text-[0.65rem] font-medium accent-sky px-1.5 py-0.5 rounded">
                          #{item.id}
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

                      <p className="text-sm text-fh-muted mt-1 truncate">
                        {item.category} • {formatCurrency(item.price)}
                      </p>
                      <p className="text-xs text-fh-muted mt-1 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
                    <button
                      type="button"
                      onClick={() => openEdit(item.id)}
                      disabled={busy || isBulkWorking}
                      className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleQuickToggleFeatured(item.id)}
                      disabled={busy || isBulkWorking}
                      className={item.isFeatured ? "btn-admin-nav-active text-xs py-2 px-3 disabled:opacity-50" : "btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"}
                      aria-label={item.isFeatured ? `Unfeature ${item.name}` : `Feature ${item.name}`}
                      title={item.isFeatured ? "Remove from featured" : "Feature on home page"}
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleQuickToggleActive(item.id)}
                      disabled={busy || isBulkWorking}
                      className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
                    >
                      {item.isActive ? "Archive" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      disabled={busy || isBulkWorking}
                      className="btn-remove text-xs py-2 px-3 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editorOpen ? (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={closeEditor}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="absolute right-0 top-0 h-full w-full max-w-xl panel rounded-none overflow-y-auto"
          >
            <div className="p-6 border-b surface-divider flex items-start justify-between gap-4">
              <div>
                <p className="kicker kicker-accent mb-2">
                  {editorMode === "create" ? "Create" : "Edit"} Menu Item
                </p>
                <h2 className="text-2xl font-bold text-fh-heading">
                  {editorMode === "create" ? "New Item" : editingItem?.name ?? "Menu Item"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                disabled={editorBusy}
                className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Name</label>
                  <input
                    value={editorDraft.name}
                    onChange={(e) => setEditorDraft((prev) => ({ ...prev, name: e.target.value }))}
                    className="admin-input"
                    disabled={editorBusy}
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="admin-label">Category</label>
                  <input
                    value={editorDraft.category}
                    onChange={(e) => setEditorDraft((prev) => ({ ...prev, category: e.target.value }))}
                    className="admin-input"
                    disabled={editorBusy}
                    maxLength={80}
                    placeholder="Cookies, Cakes, Breads..."
                  />
                </div>
                <div>
                  <label className="admin-label">Price</label>
                  <input
                    value={editorDraft.price}
                    onChange={(e) => setEditorDraft((prev) => ({ ...prev, price: e.target.value }))}
                    className="admin-input"
                    disabled={editorBusy}
                    inputMode="decimal"
                    placeholder="4.99"
                  />
                  {isCookieDraft ? (
                    <p className="text-xs mt-1 text-fh-muted">
                      Cookie items are sold only in packs of 4 / 8 / 12. The price above is per cookie.
                    </p>
                  ) : null}
                </div>
                <div className="flex items-end gap-4">
                  <label className="text-sm flex items-center gap-2 text-fh-muted">
                    <input
                      type="checkbox"
                      checked={editorDraft.isActive}
                      onChange={(e) => setEditorDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
                      disabled={editorBusy}
                    />
                    Active
                  </label>
                  <label className="text-sm flex items-center gap-2 text-fh-muted">
                    <input
                      type="checkbox"
                      checked={editorDraft.isFeatured}
                      onChange={(e) => setEditorDraft((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                      disabled={editorBusy}
                    />
                    Featured on home page
                  </label>
                </div>
                <div className="md:col-span-2">
                  <ImageUploadField
                    value={editorDraft.imageUrl}
                    onChange={(url) => setEditorDraft((prev) => ({ ...prev, imageUrl: url }))}
                    disabled={editorBusy}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="admin-label">Description</label>
                  <textarea
                    value={editorDraft.description}
                    onChange={(e) => setEditorDraft((prev) => ({ ...prev, description: e.target.value }))}
                    className="admin-input resize-y"
                    rows={4}
                    disabled={editorBusy}
                    maxLength={600}
                    placeholder="Short, simple description customers will see."
                  />
                </div>
              </div>

              <details className="surface-soft p-4">
                <summary className="cursor-pointer font-semibold text-fh-heading">
                  Advanced (sorting)
                </summary>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="admin-label">Display Order</label>
                    <input
                      value={editorDraft.sortOrder}
                      onChange={(e) => setEditorDraft((prev) => ({ ...prev, sortOrder: e.target.value }))}
                      className="admin-input"
                      disabled={editorBusy}
                      inputMode="numeric"
                      placeholder="0"
                    />
                    <p className="text-xs mt-1 text-fh-muted">
                      Lower numbers appear first in the menu.
                    </p>
                  </div>
                  <div>
                    <label className="admin-label">Featured Order</label>
                    <input
                      value={editorDraft.featuredSortOrder}
                      onChange={(e) => setEditorDraft((prev) => ({ ...prev, featuredSortOrder: e.target.value }))}
                      className="admin-input"
                      disabled={editorBusy || !editorDraft.isFeatured}
                      inputMode="numeric"
                      placeholder="0"
                    />
                    <p className="text-xs mt-1 text-fh-muted">
                      Used only when featured.
                    </p>
                  </div>
                </div>
              </details>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                {editorMode === "edit" && editingItem ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete(editingItem.id)}
                    disabled={editorBusy || !!busyIds[editingItem.id]}
                    className="btn-remove text-xs py-2.5 px-4 disabled:opacity-50"
                  >
                    Delete item
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => void handleEditorSave()}
                  disabled={editorBusy}
                  className="btn-primary py-3 px-6 text-sm disabled:opacity-50"
                >
                  {editorBusy ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
