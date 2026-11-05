'use client';

export const contentUpdatedEvent='slkm-content-updated';

export function notifyContentUpdated() {
 // Storage events reach other tabs; the custom event also covers the current tab.
 try {localStorage.setItem(contentUpdatedEvent,crypto.randomUUID())} catch {/* Focus refresh remains available when storage is blocked. */}
 window.dispatchEvent(new Event(contentUpdatedEvent));
}
