"use client";

import { useMemo, useState } from "react";
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

export default function AdminMenuManager({ initialItems }: AdminMenuManagerProps) {
  const [items, setItems] = useState<AdminMenuItem[]>(sortItems(initialItems));
  const [drafts, setDrafts] = useState<Record<number, MenuDraft>>(() =>
    Object.fromEntries(initialItems.map((item) => [item.id, toDraft(item)]))
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
  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const hasItems = items.length > 0;
  const menuItems = useMemo(() => sortItems(items), [items]);

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
      setError("Name, description, category, valid price, and valid sort order are required.");
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
      setError("Name, description, category, valid price, and valid sort order are required.");
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
        sortItems(prev.map((item) => (item.id === id ? payload.menuItem! : item)))
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
        sortItems(prev.map((item) => (item.id === id ? payload.menuItem! : item)))
      );
      setDrafts((prev) => ({ ...prev, [id]: toDraft(payload.menuItem!) }));
      setMessage(
        payload.menuItem.isActive
          ? `Activated "${payload.menuItem.name}".`
          : `Archived "${payload.menuItem.name}".`
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

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: "#3D2B1F" }}>
          Add Menu Item
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="Name"
            value={createForm.name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm"
          />
          <input
            placeholder="Category"
            value={createForm.category}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
            className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm"
          />
          <input
            placeholder="Price (e.g. 4.99)"
            value={createForm.price}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, price: event.target.value }))}
            className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm"
          />
          <input
            placeholder="Sort Order (e.g. 10)"
            value={createForm.sortOrder}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
            className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm"
          />
          <input
            placeholder="Image URL (optional)"
            value={createForm.imageUrl}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm md:col-span-2"
          />
          <textarea
            placeholder="Description"
            value={createForm.description}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
            className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm md:col-span-2"
            rows={3}
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <label className="text-sm flex items-center gap-2" style={{ color: "#6B5740" }}>
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
            className="btn-primary py-2.5 px-5 text-sm disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create Item"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm p-3 rounded-lg" style={{ color: "#A0555E", backgroundColor: "rgba(160, 85, 94, 0.08)" }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm p-3 rounded-lg" style={{ color: "#4A6B4A", backgroundColor: "rgba(74, 107, 74, 0.08)" }}>
          {message}
        </p>
      ) : null}

      {!hasItems ? (
        <div className="panel p-6">
          <p style={{ color: "#6B5740" }}>No menu items yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {menuItems.map((item) => {
            const draft = drafts[item.id] ?? toDraft(item);
            const busy = !!busyIds[item.id];
            return (
              <div key={item.id} className="panel p-5 space-y-4">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold" style={{ color: "#3D2B1F" }}>
                      #{item.id} • {item.name}
                    </p>
                    <p className="text-sm" style={{ color: "#6B5740" }}>
                      {item.category} • {formatCurrency(item.price)} • sort {item.sortOrder}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#6B5740" }}>
                      {item.isActive ? "Active" : "Archived"} • updated{" "}
                      {new Date(item.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item.id)}
                      disabled={busy}
                      className="btn-ghost text-xs py-2 px-3 disabled:opacity-50"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={draft.name}
                    onChange={(event) => setDraftValue(item.id, "name", event.target.value)}
                    className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={draft.category}
                    onChange={(event) => setDraftValue(item.id, "category", event.target.value)}
                    className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={draft.price}
                    onChange={(event) => setDraftValue(item.id, "price", event.target.value)}
                    className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={draft.sortOrder}
                    onChange={(event) => setDraftValue(item.id, "sortOrder", event.target.value)}
                    className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={draft.imageUrl}
                    onChange={(event) => setDraftValue(item.id, "imageUrl", event.target.value)}
                    className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm md:col-span-2"
                    placeholder="Image URL (optional)"
                  />
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      setDraftValue(item.id, "description", event.target.value)
                    }
                    className="rounded-lg border border-[#E4D5C8] bg-white px-3 py-2 text-sm md:col-span-2"
                    rows={3}
                  />
                </div>

                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <label className="text-sm flex items-center gap-2" style={{ color: "#6B5740" }}>
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
                    className="btn-primary py-2.5 px-5 text-sm disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
