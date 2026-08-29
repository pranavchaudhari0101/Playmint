import React from 'react';
import { Link } from 'react-router-dom';
import type { CatalogProduct } from '@/api/types';
import { RewardCard } from './RewardCard';

interface RewardRailProps {
  title: string;
  subtitle: string;
  products: CatalogProduct[];
  balance: number;
  viewAllTo?: string;
}

/** Titled horizontal reward section for the store home. */
export const RewardRail: React.FC<RewardRailProps> = ({
  title,
  subtitle,
  products,
  balance,
  viewAllTo,
}) => {
  if (products.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#191B1D] tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-xs text-[#8E877B]">{subtitle}</p>
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="shrink-0 rounded-full border border-[#E6DFD2] bg-white px-4 py-1.5 text-xs font-bold text-[#191B1D] shadow-xs hover:bg-[#F5EDE0] transition-colors"
          >
            View all
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <RewardCard key={product.id} product={product} balance={balance} />
        ))}
      </div>
    </section>
  );
};
