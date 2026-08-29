import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/state/AuthContext';
import { RewardCard } from '@/components/commerce/RewardCard';
import { Loading, ErrorPanel } from '@/components/Feedback';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const CategoryScreen: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { wallet } = useAuth();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');

  const categories = useApi(() => api.catalog.categories(), []);
  const products = useApi(
    () => api.catalog.products({ category: slug, search: submitted || undefined, limit: 60 }),
    [slug, submitted],
  );

  const category = categories.data?.categories.find((c) => c.slug === slug);

  return (
    <section>
      <Link
        to="/store"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cream-dim transition-colors hover:text-amber"
      >
        <ArrowLeft size={14} /> All rewards
      </Link>

      <div className="mb-6">
        <div className="hud-label mb-2">CATEGORY</div>
        <h1 className="text-2xl font-extrabold text-cream">{category?.name ?? slug}</h1>
        {products.data && (
          <p className="mt-1 text-sm text-cream-dim">
            {products.data.total} {products.data.total === 1 ? 'reward' : 'rewards'}
          </p>
        )}
      </div>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(search.trim());
        }}
      >
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-cream-faint"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this category"
            aria-label="Search products"
            className="pl-9"
          />
        </div>
        <Button variant="secondary" type="submit">
          Search
        </Button>
        {submitted && (
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setSearch('');
              setSubmitted('');
            }}
          >
            <X size={14} /> Clear
          </Button>
        )}
      </form>

      {products.loading && !products.data && <Loading />}
      {products.error && <ErrorPanel message={products.error} onRetry={products.reload} />}

      {products.data && products.data.products.length === 0 && (
        <div className="panel mx-auto max-w-md p-8 text-center">
          <h2 className="text-sm font-extrabold text-[#B45309]">NOTHING MATCHES</h2>
          <p className="mt-2 text-sm text-cream-dim">
            Try a different search term or browse another category.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.data?.products.map((product) => (
          <RewardCard key={product.id} product={product} balance={wallet.balance} />
        ))}
      </div>
    </section>
  );
};
