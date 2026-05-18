"use client";

import React from "react";

type ButtonVariant =
  | "primary"
  | "dark"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-subtle"
  | "success";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  pill?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "#0369a1",
    color: "#ffffff",
    border: "none",
  },
  dark: {
    backgroundColor: "#111827",
    color: "#ffffff",
    border: "none",
  },
  secondary: {
    backgroundColor: "#f3f4f6",
    color: "#111827",
    border: "none",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "#111827",
    border: "1px solid #e5e7eb",
  },
  danger: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
  },
  "danger-subtle": {
    backgroundColor: "#fef2f2",
    color: "#ef4444",
    border: "none",
  },
  success: {
    backgroundColor: "#16a34a",
    color: "#ffffff",
    border: "none",
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { fontSize: 13, padding: "6px 12px", height: 32 },
  md: { fontSize: 14, padding: "10px 16px", height: 40 },
  lg: { fontSize: 15, padding: "14px 20px", height: 48 },
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  pill = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontWeight: 600,
    borderRadius: pill ? "var(--radius-full)" : "var(--radius-md)",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.6 : 1,
    width: fullWidth ? "100%" : undefined,
    transition: "opacity 0.15s ease",
    boxSizing: "border-box",
    outline: "none",
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <button disabled={isDisabled} style={baseStyle} {...props}>
      {loading && (
        <span
          style={{
            width: 14,
            height: 14,
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "var(--radius-full)",
            animation: "spin 0.6s linear infinite",
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </button>
  );
}
