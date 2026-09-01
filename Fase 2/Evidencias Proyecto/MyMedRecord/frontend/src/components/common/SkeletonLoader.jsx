import React from 'react';

/**
 * Componentes de Carga Esqueleto (Skeleton Loaders) con animación shimmer
 * Mejora la percepción de velocidad y fluidez visual en la aplicación.
 */

export const CardSkeleton = () => (
  <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-xs animate-pulse space-y-3">
    <div className="flex items-center justify-between">
      <div className="w-10 h-10 bg-stone-200 rounded-2xl" />
      <div className="w-16 h-5 bg-stone-200 rounded-full" />
    </div>
    <div className="w-3/4 h-5 bg-stone-200 rounded-lg mt-2" />
    <div className="w-full h-3 bg-stone-100 rounded-md" />
    <div className="w-2/3 h-3 bg-stone-100 rounded-md" />
    <div className="w-full h-9 bg-stone-100 rounded-xl mt-4" />
  </div>
);

export const VitalsSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
        <div className="w-20 h-3 bg-stone-200 rounded" />
        <div className="w-16 h-7 bg-stone-300 rounded" />
        <div className="w-12 h-4 bg-stone-200 rounded-md" />
      </div>
    ))}
  </div>
);

export const TimelineItemSkeleton = () => (
  <div className="flex gap-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-stone-200 shrink-0" />
    <div className="flex-1 space-y-2 py-1">
      <div className="w-1/3 h-4 bg-stone-200 rounded" />
      <div className="w-full h-3 bg-stone-100 rounded" />
      <div className="w-1/2 h-3 bg-stone-100 rounded" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 4 }) => (
  <tr className="animate-pulse border-b border-stone-100">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="py-3 px-4">
        <div className="w-full h-4 bg-stone-200 rounded" />
      </td>
    ))}
  </tr>
);
