import React from 'react';

/**
 * Componentes de Carga Esqueleto (Skeleton Loaders) con animación shimmer
 * Mejora la percepción de velocidad y fluidez visual en la aplicación.
 */

export const CardSkeleton = () => (
  <div className="bg-surface border border-line/90 rounded-3xl p-5 shadow-xs animate-pulse space-y-3">
    <div className="flex items-center justify-between">
      <div className="w-10 h-10 bg-surface-muted rounded-2xl" />
      <div className="w-16 h-5 bg-surface-muted rounded-full" />
    </div>
    <div className="w-3/4 h-5 bg-surface-muted rounded-lg mt-2" />
    <div className="w-full h-3 bg-surface-muted rounded-md" />
    <div className="w-2/3 h-3 bg-surface-muted rounded-md" />
    <div className="w-full h-9 bg-surface-muted rounded-xl mt-4" />
  </div>
);

export const VitalsSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="p-4 bg-canvas rounded-2xl border border-line/80 space-y-2">
        <div className="w-20 h-3 bg-surface-muted rounded" />
        <div className="w-16 h-7 bg-stone-300 rounded" />
        <div className="w-12 h-4 bg-surface-muted rounded-md" />
      </div>
    ))}
  </div>
);

export const TimelineItemSkeleton = () => (
  <div className="flex gap-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-surface-muted shrink-0" />
    <div className="flex-1 space-y-2 py-1">
      <div className="w-1/3 h-4 bg-surface-muted rounded" />
      <div className="w-full h-3 bg-surface-muted rounded" />
      <div className="w-1/2 h-3 bg-surface-muted rounded" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 4 }) => (
  <tr className="animate-pulse border-b border-stone-100">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="py-3 px-4">
        <div className="w-full h-4 bg-surface-muted rounded" />
      </td>
    ))}
  </tr>
);
