import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { CatalogProduct } from '@/api/types';
import { formatPaise, formatSparks, lineSparkCap } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ProductVisual } from './ProductVisual';

interface RewardCardProps {
  product: CatalogProduct;
  /** Wallet balance — affordability label only, never pricing. */
  balance: number;
}

/** Store grid card in warm luxury bento styling. */
export const RewardCard: React.FC<RewardCardProps> = ({ product, balance }) => {
  const cap = lineSparkCap(product, 1);
  const affordable = balance >= cap;
  const shortBy = cap - balance;

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        'bento-card bento-card-interactive group relative flex flex-col overflow-hidden p-4',
        !product.inStock && 'opacity-60 saturate-50',
      )}
    >
      <div className="relative mb-3.5 aspect-square overflow-hidden rounded-2xl border border-[#E6DFD2] bg-[#FAF5EB]">
        <ProductVisual
          sku={product.sku}
          name={product.name}
          imageUrl={product.imageUrl}
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {product.isSparksOnly && (
          <span className="absolute top-2.5 left-2.5">
            <Badge variant="obsidian" className="text-[0.6rem] font-bold">
              SPARKS ONLY
            </Badge>
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-2.5 top-2.5 flex justify-end">
            <Badge variant="rust" className="text-[0.6rem] font-bold">
              OUT OF STOCK
            </Badge>
          </span>
        )}

        {/* Hover Arrow Badge */}
        <div className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#191B1D] shadow-sm backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight size={14} />
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {product.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[#FAF5EB] border border-[#E6DFD2] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[#8E877B]"
          >
            {tag}
          </span>
        ))}
      </div>

      <h3 className="mb-2 text-sm font-bold leading-snug text-[#191B1D] line-clamp-1">{product.name}</h3>

      {product.isSparksOnly ? (
        <div className="mt-auto pt-2 border-t border-[#EFE8DC]">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FDB827] text-[0.65rem] font-bold text-[#191B1D]">
              ✦
            </span>
            <span className="font-extrabold text-sm text-[#191B1D]">
              {formatSparks(cap)} Sparks
            </span>
          </div>
          <p
            className={cn(
              'mt-1 text-xs font-semibold',
              affordable ? 'text-[#10B981]' : 'text-[#8E877B]',
            )}
          >
            {affordable
              ? '✓ Claimable now'
              : `${formatSparks(shortBy)} sparks to go`}
          </p>
        </div>
      ) : (
        <div className="mt-auto pt-2 border-t border-[#EFE8DC]">
          <div className="text-base font-extrabold text-[#191B1D]">
            {formatPaise(product.cashPricePaise)}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#D97706]">
            <span>✦</span>
            Up to {formatSparks(cap)} sparks off
          </p>
          {product.earnbackSparks > 0 && (
            <p className="mt-0.5 text-[0.7rem] font-semibold text-[#10B981]">
              +{formatSparks(product.earnbackSparks)} sparks earn-back
            </p>
          )}
        </div>
      )}
    </Link>
  );
};
