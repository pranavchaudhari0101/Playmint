import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Target, CheckCircle2 } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useApi, errorMessage } from '@/lib/useApi';
import { useAuth } from '@/state/AuthContext';
import { useCart } from '@/state/CartContext';
import { formatPaise, formatSparks, lineSparkCap, shortfall } from '@/lib/money';
import { Loading, ErrorPanel, InlineError } from '@/components/Feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductVisual } from '@/components/commerce/ProductVisual';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { wallet } = useAuth();
  const { add, has } = useCart();

  const [notice, setNotice] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  const result = useApi(() => api.catalog.product(id!), [id]);

  if (result.loading && !result.data) return <Loading />;
  if (result.error) return <ErrorPanel message={result.error} onRetry={result.reload} />;
  if (!result.data) return null;

  const product = result.data.product;
  const cap = lineSparkCap(product, 1);
  const missing = shortfall(cap, wallet.balance);
  const cashAfterMaxSparks = product.cashPricePaise - Math.min(cap, wallet.balance);

  async function setAsGoal() {
    setGoalError(null);
    try {
      await api.goals.set(product.id);
      navigate('/goal');
    } catch (err) {
      setGoalError(errorMessage(err));
    }
  }

  return (
    <section className="space-y-6">
      <Link
        to={product.categorySlug ? `/store/${product.categorySlug}` : '/store'}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DFD2] bg-white px-4 py-1.5 text-xs font-bold text-[#666057] shadow-xs hover:text-[#191B1D] hover:bg-[#FAF6EE] transition-all"
      >
        <ArrowLeft size={14} /> Back to Catalog
      </Link>

      <div className="grid items-start gap-8 md:grid-cols-2">
        {/* Left: Bento Image Card */}
        <div className="bento-card overflow-hidden p-4">
          <div className="aspect-square overflow-hidden rounded-2xl border border-[#E6DFD2] bg-[#FAF5EB]">
            <ProductVisual
              sku={product.sku}
              name={product.name}
              imageUrl={product.imageUrl}
            />
          </div>
        </div>

        {/* Right: Product Specs & Pricing */}
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {product.isSparksOnly && (
              <Badge variant="obsidian" className="text-xs font-bold">
                SPARKS ONLY
              </Badge>
            )}
            {product.tags.map((tag) => (
              <Badge key={tag} variant="default">{tag}</Badge>
            ))}
            {!product.inStock && (
              <Badge variant="rust" className="text-xs font-bold">
                OUT OF STOCK
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191B1D]">{product.name}</h1>
          {product.description && (
            <p className="text-sm leading-relaxed text-[#666057]">{product.description}</p>
          )}

          {product.isSparksOnly ? (
            <div className="bento-card p-6 border border-[#FDB827]/50 bg-[#FFFDF7]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#9B9489] mb-1">
                Full Spark Redemption
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FDB827] text-xs font-bold text-[#191B1D]">
                  ✦
                </span>
                <span className="text-2xl font-extrabold text-[#191B1D]">
                  {formatSparks(cap)} Sparks
                </span>
                <span className="text-xs font-bold text-[#10B981]">· No cash needed</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#8E877B]">
                Sparks-only rewards are paid entirely with earned Sparks directly from your wallet balance.
              </p>
            </div>
          ) : (
            <div className="bento-card p-6 border border-[#E6DFD2] bg-white">
              <div className="text-xs font-bold uppercase tracking-wider text-[#9B9489] mb-1">
                Retail Price
              </div>
              <div className="text-3xl font-extrabold tracking-tight text-[#191B1D]">
                {formatPaise(product.cashPricePaise)}
              </div>

              <div className="mt-4 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] p-4">
                <p className="text-xs font-bold text-[#D97706]">WITH YOUR SPARKS</p>
                <p className="text-base font-extrabold text-[#191B1D] mt-0.5">
                  ✦ {formatSparks(Math.min(cap, wallet.balance))} Sparks +{' '}
                  {formatPaise(Math.max(0, cashAfterMaxSparks))} Cash
                </p>
                <p className="mt-1 text-xs text-[#8E877B]">
                  Up to {formatSparks(cap)} Sparks ({formatPaise(cap)}) can be applied to this item at checkout.
                </p>
              </div>
            </div>
          )}

          {missing > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs font-semibold text-[#D97706]">
              <Target size={15} />
              <span>Win {formatSparks(missing)} more Sparks through matches to claim in full.</span>
            </div>
          )}

          {notice && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#86EFAC] bg-[#F0FDF4] px-4 py-3 text-xs font-bold text-[#15803D]">
              <CheckCircle2 size={16} />
              <span>Added to your cart!</span>
            </div>
          )}
          {goalError && <InlineError message={goalError} className="mt-4" />}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="gold"
              disabled={!product.inStock}
              onClick={() => {
                add(product);
                setNotice('Added to cart.');
              }}
            >
              <ShoppingCart size={15} />
              {has(product.id) ? 'Add Another' : 'Add to Cart'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/cart')}>
              Go to Cart
            </Button>
            <Button variant="ghost" onClick={setAsGoal}>
              <Target size={15} /> Set as Goal
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
