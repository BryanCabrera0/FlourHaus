"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { AdminMenuItemVariant } from "@/lib/types";

type VariantDraft = {
  label: string;
  unitCount: string;
  price: string;
  sortOrder: string;
  isActive: boolean;
};

type Props = {
  menuItemId: number;
  basePrice: number;
  variants: AdminMenuItemVariant[];
  disabled?: boolean;
  onVariantsChange: (nextVariants: AdminMenuItemVariant[]) => void;
};

function sortVariants(list: AdminMenuItemVariant[]): AdminMenuItemVariant[] {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id - b.id;
  });
}

function toDraft(variant: AdminMenuItemVariant): VariantDraft {
  return {
    label: variant.label,
    unitCount: variant.unitCount.toString(),
    price: variant.price.toString(),
    sortOrder: variant.sortOrder.toString(),
    isActive: variant.isActive,
  };
}

function parseIntStrict(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function parsePositiveInt(value: string): number | null {
  const parsed = parseIntStrict(value);
  if (parsed === null || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parsePrice(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export default function MenuItemVariantsEditor({
  menuItemId,
  basePrice,
  variants,
  disabled,
  onVariantsChange,
}: Props) {
  const sortedVariants = useMemo(() => sortVariants(variants), [variants]);

  const [drafts, setDrafts] = useState<Record<number, VariantDraft>>({});
  const [createDraft, setCreateDraft] = useState<VariantDraft>({
    label: "",
    unitCount: "4",
    price: "",
    sortOrder: "0",
    isActive: true,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(Object.fromEntries(sortedVariants.map((variant) => [variant.id, toDraft(variant)])));
  }, [sortedVariants]);

  function setBusy(variantId: number, value: boolean) {
    setBusyIds((prev) => ({ ...prev, [variantId]: value }));
  }

  async function createVariant(draft: VariantDraft): Promise<AdminMenuItemVariant> {
    const label = draft.label.trim();
    const unitCount = parsePositiveInt(draft.unitCount);
    const price = parsePrice(draft.price);
    const sortOrder = parseIntStrict(draft.sortOrder) ?? 0;

    if (!label || label.length > 60 || unitCount === null || price === null) {
      throw new Error("Label, unit count, and a valid price are required.");
    }

    const response = await fetch(`/api/admin/menu/${menuItemId}/variants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label,
        unitCount,
        price,
        sortOrder,
        isActive: draft.isActive,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { variant?: AdminMenuItemVariant; error?: string }
      | null;

    if (!response.ok || !payload?.variant) {
      throw new Error(payload?.error ?? "Failed to create variant.");
    }

    return payload.variant;
  }

  async function updateVariant(variantId: number, draft: VariantDraft): Promise<AdminMenuItemVariant> {
    const label = draft.label.trim();
    const unitCount = parsePositiveInt(draft.unitCount);
    const price = parsePrice(draft.price);
    const sortOrder = parseIntStrict(draft.sortOrder) ?? 0;

    if (!label || label.length > 60 || unitCount === null || price === null) {
      throw new Error("Label, unit count, and a valid price are required.");
    }

    const response = await fetch(`/api/admin/menu/variants/${variantId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label,
        unitCount,
        price,
        sortOrder,
        isActive: draft.isActive,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { variant?: AdminMenuItemVariant; error?: string }
      | null;

    if (!response.ok || !payload?.variant) {
      throw new Error(payload?.error ?? "Failed to update variant.");
    }

    return payload.variant;
  }

  async function deleteVariant(variantId: number): Promise<void> {
    const response = await fetch(`/api/admin/menu/variants/${variantId}`, {
      method: "DELETE",
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error ?? "Failed to delete variant.");
    }
  }

  async function handleCreate() {
    if (disabled || isCreating) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsCreating(true);

    try {
      const created = await createVariant(createDraft);
      onVariantsChange(sortVariants([...sortedVariants, created]));
      setCreateDraft({
        label: "",
        unitCount: "4",
        price: "",
        sortOrder: "0",
        isActive: true,
      });
      setShowCreate(false);
      setSuccess(`Added variant "${created.label}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create variant.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSave(variantId: number) {
    if (disabled || busyIds[variantId]) {
      return;
    }

    const draft = drafts[variantId];
    if (!draft) {
      return;
    }

    setError(null);
    setSuccess(null);
    setBusy(variantId, true);

    try {
      const updated = await updateVariant(variantId, draft);
      onVariantsChange(
        sortVariants(
          sortedVariants.map((variant) => (variant.id === variantId ? updated : variant))
        )
      );
      setSuccess(`Saved variant "${updated.label}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save variant.");
    } finally {
      setBusy(variantId, false);
    }
  }

  async function handleDelete(variantId: number) {
    if (disabled || busyIds[variantId]) {
      return;
    }

    const existing = sortedVariants.find((variant) => variant.id === variantId);
    if (!existing) {
      return;
    }

    const confirmed = window.confirm(`Delete variant "${existing.label}"?`);
    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);
    setBusy(variantId, true);

    try {
      await deleteVariant(variantId);
      onVariantsChange(sortVariants(sortedVariants.filter((variant) => variant.id !== variantId)));
      setSuccess(`Deleted variant "${existing.label}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete variant.");
    } finally {
      setBusy(variantId, false);
    }
  }

  async function handleAddCookiePresets() {
    if (disabled || isBulkCreating) {
      return;
    }

    const presets = [4, 8, 12];
    const existingLabels = new Set(sortedVariants.map((variant) => variant.label.trim().toLowerCase()));

    setError(null);
    setSuccess(null);
    setIsBulkCreating(true);

    let createdCount = 0;
    const createdVariants: AdminMenuItemVariant[] = [];

    try {
      for (const unitCount of presets) {
        const label = `${unitCount}`;
        if (existingLabels.has(label.toLowerCase())) {
          continue;
        }

        const computed = Math.round(basePrice * unitCount * 100) / 100;

        const created = await createVariant({
          label,
          unitCount: unitCount.toString(),
          price: computed.toString(),
          sortOrder: (unitCount * 10).toString(),
          isActive: true,
        });

        createdVariants.push(created);
        createdCount += 1;
      }

      if (createdCount === 0) {
        setSuccess("Cookie presets already exist.");
        return;
      }

      onVariantsChange(sortVariants([...sortedVariants, ...createdVariants]));
      setSuccess(`Added ${createdCount} cookie preset${createdCount === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add presets.");
    } finally {
      setIsBulkCreating(false);
    }
  }

  return (
    <div className="mt-5 border-t surface-divider pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="kicker kicker-blue">Variants</p>
          <p className="text-xs text-fh-muted mt-1">
            Optional presets like cookie packs (4 / 8 / 12). If variants exist, customers will select one before adding to cart.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAddCookiePresets}
            disabled={disabled || isBulkCreating}
            className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
            title={`Uses base price (${formatCurrency(basePrice)}) to prefill prices.`}
          >
            {isBulkCreating ? "Adding..." : "Add 4/8/12 presets"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((prev) => !prev)}
            disabled={disabled}
            className="btn-admin-nav text-xs py-2 px-3 disabled:opacity-50"
          >
            {showCreate ? "Close" : "Add Variant"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-xs mt-3 text-fh-danger">{error}</p>
      ) : null}
      {success ? (
        <p className="text-xs mt-2 text-fh-accent-blue">{success}</p>
      ) : null}

      {sortedVariants.length === 0 ? (
        <p className="text-sm text-fh-muted mt-4">No variants yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {sortedVariants.map((variant) => {
            const draft = drafts[variant.id] ?? toDraft(variant);
            const busy = !!busyIds[variant.id];

            return (
              <div key={variant.id} className="surface-soft p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                    <div>
                      <label className="admin-label">Label</label>
                      <input
                        value={draft.label}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [variant.id]: { ...draft, label: e.target.value },
                          }))
                        }
                        className="admin-input"
                        placeholder="e.g. 8"
                        disabled={disabled || busy}
                        maxLength={60}
                      />
                    </div>
                    <div>
                      <label className="admin-label">Units</label>
                      <input
                        value={draft.unitCount}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [variant.id]: { ...draft, unitCount: e.target.value },
                          }))
                        }
                        className="admin-input"
                        placeholder="8"
                        disabled={disabled || busy}
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="admin-label">Price</label>
                      <input
                        value={draft.price}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [variant.id]: { ...draft, price: e.target.value },
                          }))
                        }
                        className="admin-input"
                        placeholder="12.99"
                        disabled={disabled || busy}
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <label className="admin-label">Sort</label>
                      <input
                        value={draft.sortOrder}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [variant.id]: { ...draft, sortOrder: e.target.value },
                          }))
                        }
                        className="admin-input"
                        placeholder="0"
                        disabled={disabled || busy}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="md:col-span-2 lg:col-span-4">
                      <label className="text-xs flex items-center gap-2 text-fh-muted">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [variant.id]: { ...draft, isActive: e.target.checked },
                            }))
                          }
                          disabled={disabled || busy}
                        />
                        Variant is active
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => void handleSave(variant.id)}
                      disabled={disabled || busy}
                      className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
                    >
                      {busy ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(variant.id)}
                      disabled={disabled || busy}
                      className="btn-remove text-xs py-2 px-4 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate ? (
        <div className="mt-4 surface-soft p-4">
          <p className="kicker kicker-accent mb-2">Add Variant</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="admin-label">Label</label>
              <input
                value={createDraft.label}
                onChange={(e) => setCreateDraft((prev) => ({ ...prev, label: e.target.value }))}
                className="admin-input"
                placeholder="e.g. 8"
                maxLength={60}
                disabled={disabled || isCreating}
              />
            </div>
            <div>
              <label className="admin-label">Units</label>
              <input
                value={createDraft.unitCount}
                onChange={(e) => setCreateDraft((prev) => ({ ...prev, unitCount: e.target.value }))}
                className="admin-input"
                placeholder="8"
                inputMode="numeric"
                disabled={disabled || isCreating}
              />
            </div>
            <div>
              <label className="admin-label">Price</label>
              <input
                value={createDraft.price}
                onChange={(e) => setCreateDraft((prev) => ({ ...prev, price: e.target.value }))}
                className="admin-input"
                placeholder="12.99"
                inputMode="decimal"
                disabled={disabled || isCreating}
              />
            </div>
            <div>
              <label className="admin-label">Sort</label>
              <input
                value={createDraft.sortOrder}
                onChange={(e) => setCreateDraft((prev) => ({ ...prev, sortOrder: e.target.value }))}
                className="admin-input"
                placeholder="0"
                inputMode="numeric"
                disabled={disabled || isCreating}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <label className="text-xs flex items-center gap-2 text-fh-muted">
                <input
                  type="checkbox"
                  checked={createDraft.isActive}
                  onChange={(e) => setCreateDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
                  disabled={disabled || isCreating}
                />
                Variant is active
              </label>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={disabled || isCreating}
              className="btn-primary text-xs py-2.5 px-4 disabled:opacity-50"
            >
              {isCreating ? "Adding..." : "Add Variant"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              disabled={disabled || isCreating}
              className="btn-admin-nav text-xs py-2.5 px-4 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
