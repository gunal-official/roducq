"use client";

// Menu-button keyboard model: arrows/Home/End rove through the complete
// menu, Escape restores focus, Tab returns to the document's tab sequence.
import { useCallback, useEffect, useId, useRef, useState } from "react";

const ITEM_SELECTOR =
  '[role="menuitem"], [role="menuitemradio"], button:not([disabled])';

export function Menu({
  trigger,
  children,
  label,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const startAtEnd = useRef(false);
  const menuId = useId();
  const close = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [],
    );
    // One tab stop while open; arrow keys handle the remaining choices.
    items.forEach((item) => {
      item.tabIndex = -1;
    });
    (startAtEnd.current ? items.at(-1) : items[0])?.focus();
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onFocus = (e: FocusEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => {
          startAtEnd.current = false;
          setOpen((o) => !o);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            startAtEnd.current = event.key === "ArrowUp";
            setOpen(true);
          }
        }}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-control transition-colors duration-150 hover:bg-muted focus-visible:bg-muted"
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={(event) => {
            const items = Array.from(
              menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ??
                [],
            );
            const index = items.indexOf(document.activeElement as HTMLElement);
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            } else if (event.key === "Tab") {
              // Do not cancel Tab: focus returns to the trigger before the
              // browser advances naturally to the next/previous control.
              close();
            } else if (
              ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        items.length) %
                      items.length;
              items[next]?.focus();
            } else if (event.key.length === 1 && /\S/.test(event.key)) {
              const ordered = [
                ...items.slice(index + 1),
                ...items.slice(0, index + 1),
              ];
              ordered
                .find((item) =>
                  item.textContent
                    ?.trim()
                    .toLowerCase()
                    .startsWith(event.key.toLowerCase()),
                )
                ?.focus();
            }
          }}
          className="account-menu absolute right-0 top-full z-50 mt-1 min-w-[176px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-surface border border-border bg-card p-1 shadow-lg animate-pop-in"
        >
          {/* close is an event callback, never a render-time ref read. */}
          {/* eslint-disable-next-line react-hooks/refs */}
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-sm text-text transition-colors duration-150 hover:bg-muted"
    >
      {children}
    </button>
  );
}
