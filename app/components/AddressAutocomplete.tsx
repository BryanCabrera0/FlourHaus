"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

type AddressSuggestion = {
  id: string;
  label: string;
  value: string;
};

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSelect?: (selected: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  autoComplete?: string;
};

const MIN_QUERY_LENGTH = 5;
const DEBOUNCE_MS = 220;

function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onBlur,
  disabled = false,
  placeholder,
  required,
  maxLength = 240,
  className = "w-full rounded-xl px-3 py-2.5 text-sm input-soft",
  autoComplete = "street-address",
}: Props) {
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, AddressSuggestion[]>>(new Map());
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const listboxId = useId();
  const query = useMemo(() => normalizeQuery(value), [value]);

  const open = focused && (busy || suggestions.length > 0);

  useEffect(() => {
    if (!focused || disabled) {
      abortRef.current?.abort();
      abortRef.current = null;
      setBusy(false);
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    if (query.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      abortRef.current = null;
      setBusy(false);
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const cached = cacheRef.current.get(query);
    if (cached) {
      setSuggestions(cached);
      setActiveIndex(-1);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setSuggestions([]);
    setActiveIndex(-1);

    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/address/suggest?q=${encodeURIComponent(query)}`,
          {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | { suggestions?: AddressSuggestion[] }
          | null;

        const list = response.ok && Array.isArray(payload?.suggestions)
          ? payload!.suggestions!.filter(
              (item): item is AddressSuggestion =>
                !!item &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.label === "string" &&
                typeof item.value === "string",
            )
          : [];

        cacheRef.current.set(query, list);
        setSuggestions(list);
        setActiveIndex(-1);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setSuggestions([]);
        setActiveIndex(-1);
      } finally {
        setBusy(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [disabled, focused, query]);

  useEffect(() => {
    if (!open) return;

    function onDocPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setFocused(false);
        setSuggestions([]);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", onDocPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
    };
  }, [open]);

  function commitSelection(selected: AddressSuggestion) {
    onChange(selected.value);
    onSelect?.(selected.value);
    setSuggestions([]);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(suggestions.length - 1, prev + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(-1, prev - 1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      commitSelection(suggestions[activeIndex]);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setTimeout(() => {
            onBlur?.();
          }, 0);
        }}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        placeholder={placeholder}
        className={className}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        role="combobox"
      />

      {open ? (
        <div className="absolute left-0 right-0 mt-2 z-20 rounded-xl border surface-divider bg-white/90 backdrop-blur-md shadow-[0_12px_34px_rgba(45,40,80,0.12)] overflow-hidden">
          {busy ? (
            <div className="px-3 py-2 text-xs text-fh-muted">Searching…</div>
          ) : null}

          {suggestions.length > 0 ? (
            <ul id={listboxId} role="listbox" className="max-h-60 overflow-auto py-1">
              {suggestions.map((s, idx) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commitSelection(s);
                    }}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={
                      idx === activeIndex
                        ? "w-full text-left px-3 py-2 text-sm bg-[rgba(224,215,255,0.5)] text-fh-heading"
                        : "w-full text-left px-3 py-2 text-sm hover:bg-[rgba(204,241,255,0.45)] text-fh-heading"
                    }
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : !busy ? (
            <div className="px-3 py-2 text-xs text-fh-muted">
              No address suggestions.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
