"use client";

import { useEffect } from "react";

type AscentModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  /** "photo" = portrait narrow (crop step), "split" = wide (tag/form steps) */
  size?: "photo" | "split";
  children: React.ReactNode;
};

export function AscentModal({
  open,
  onClose,
  title,
  leftAction,
  rightAction,
  size = "split",
  children,
}: AscentModalProps) {
  // Lock body scroll while open (iOS-safe pattern)
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <style>{`
        .ascent-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          z-index: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: aModalFadeIn 0.2s ease;
        }
        @keyframes aModalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .ascent-modal-container {
          position: relative;
          background: white;
          border-radius: 12px;
          width: min(940px, 92vw);
          height: min(680px, 92svh);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: aModalSlideIn 0.22s cubic-bezier(0.32, 0.72, 0, 1);
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1),
                      height 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .ascent-modal-container--photo {
          width: min(500px, 92vw);
          height: min(680px, 92svh);
        }
        .ascent-modal-container--split {
          width: min(860px, 92vw);
        }
        @keyframes aModalSlideIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .ascent-modal-header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 52px;
          flex-shrink: 0;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 16px;
        }
        .ascent-modal-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
        }
        .ascent-modal-left {
          margin-right: auto;
          display: flex;
          align-items: center;
          z-index: 1;
        }
        .ascent-modal-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          z-index: 1;
        }
        .ascent-modal-body {
          flex: 1;
          overflow: hidden;
          display: flex;
        }
        /* Mobile: full screen, no border-radius */
        @media (max-width: 639px) {
          .ascent-modal-backdrop {
            align-items: flex-end;
          }
          .ascent-modal-container {
            width: 100%;
            height: 100svh;
            border-radius: 0;
            padding-bottom: env(safe-area-inset-bottom);
            animation: aModalSlideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);
          }
          @keyframes aModalSlideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        }
      `}</style>

      <div
        className="ascent-modal-backdrop"
        onClick={onClose}
      >
        <div
          className={`ascent-modal-container${size === "photo" ? " ascent-modal-container--photo" : " ascent-modal-container--split"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="ascent-modal-header">
            <div className="ascent-modal-left">
              {leftAction ?? (
                <button
                  onClick={onClose}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 4, color: "#111827", display: "flex", alignItems: "center",
                    borderRadius: 6,
                  }}
                  aria-label="Cerrar"
                >
                  <CloseIcon />
                </button>
              )}
            </div>

            <span className="ascent-modal-title">{title}</span>

            <div className="ascent-modal-right">
              {rightAction}
            </div>
          </div>

          {/* Body */}
          <div className="ascent-modal-body">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
