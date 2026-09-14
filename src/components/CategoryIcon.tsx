import type { ReactNode } from 'react';
import type { Category } from '../types';

/** Centralized category → elegant monoline icon mapping */
const paths: Record<string, ReactNode> = {
  Money: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  Deadline: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  Subscription: (
    <>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 014-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 01-4 4H3" />
    </>
  ),
  Contract: (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  Warranty: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  Return: (
    <>
      <path d="M3 12a9 9 0 101-4.7" />
      <path d="M3 4v5h5" />
    </>
  ),
  Document: (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h8" />
    </>
  ),
  Other: (
    <>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M18 15l.75 2.25L21 18l-2.25.75L18 21l-.75-2.25L15 18l2.25-.75L18 15z" />
    </>
  ),
};

const tint: Record<string, string> = {
  Money: 'var(--cat-money)',
  Deadline: 'var(--cat-deadline)',
  Subscription: 'var(--cat-sub)',
  Contract: 'var(--cat-contract)',
  Warranty: 'var(--cat-warranty)',
  Return: 'var(--cat-return)',
  Document: 'var(--cat-doc)',
  Other: 'var(--cat-other)',
};

export function CategoryIcon({
  category,
  size = 18,
  className = '',
}: {
  category: Category | string;
  size?: number;
  className?: string;
}) {
  const key = (category in paths ? category : 'Other') as string;
  return (
    <span
      className={`cat-icon ${className}`}
      style={{
        color: tint[key] || tint.Other,
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 0,
      }}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block', flexShrink: 0 }}
      >
        {paths[key]}
      </svg>
    </span>
  );
}
