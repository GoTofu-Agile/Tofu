"use client";

import { useEffect, useRef, useState } from "react";
import { Bug, MessageSquareWarning } from "lucide-react";

export function FeedbackOverlay() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [ready, setReady] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  useEffect(() => {
    // Start near bottom-left once viewport dimensions are available.
    queueMicrotask(() => {
      const y = Math.max(16, window.innerHeight - 72);
      setPosition({ x: 16, y });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;

    function onPointerMove(e: PointerEvent) {
      if (!isDraggingRef.current) return;
      const size = buttonRef.current?.offsetWidth ?? 44;
      const nextX = e.clientX - dragOffsetRef.current.x;
      const nextY = e.clientY - dragOffsetRef.current.y;
      const clampedX = Math.min(Math.max(8, nextX), window.innerWidth - size - 8);
      const clampedY = Math.min(Math.max(8, nextY), window.innerHeight - size - 8);
      movedRef.current = true;
      setPosition({ x: clampedX, y: clampedY });
    }

    function onPointerUp() {
      isDraggingRef.current = false;
      // If the user dragged, don't toggle the menu on release.
      setTimeout(() => {
        movedRef.current = false;
      }, 0);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [ready]);

  return (
    <div className="fixed z-40" style={{ left: position.x, top: position.y }}>
      {open && (
        <div className="absolute bottom-12 left-0 w-[12rem] rounded-xl border border-stone-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
          <a
            href="mailto:admin@gotofu.io?subject=GoTofu%20Feedback"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-stone-700 transition-colors hover:bg-stone-100"
          >
            <MessageSquareWarning className="h-3.5 w-3.5" />
            Give feedback
          </a>
          <a
            href="mailto:admin@gotofu.io?subject=GoTofu%20Bug%20Report"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-stone-700 transition-colors hover:bg-stone-100"
          >
            <Bug className="h-3.5 w-3.5" />
            Report bug
          </a>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        title="Drag to move. Click for feedback options."
        onPointerDown={(e) => {
          isDraggingRef.current = true;
          const rect = e.currentTarget.getBoundingClientRect();
          dragOffsetRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onClick={() => {
          if (movedRef.current) return;
          setOpen((prev) => !prev);
        }}
        className="grid h-11 w-11 place-items-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-md transition-colors hover:bg-stone-100"
        aria-label="Feedback and bug report"
      >
        <Bug className="h-5 w-5" />
      </button>
    </div>
  );
}
