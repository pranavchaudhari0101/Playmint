import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useCart } from '../../state/CartContext';
import { formatSparks } from '../../lib/money';

export const TopBar: React.FC = () => {
  const { wallet, user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <span className="brandMark">✦</span> Playmint
      </Link>

      <div className="topActions">
        <button className="ghost" onClick={() => navigate('/cart')}>
          Cart{itemCount > 0 ? ` · ${itemCount}` : ''}
        </button>

        <button
          className="sparkPill"
          onClick={() => navigate('/wallet')}
          title={user ? `Signed in as ${user.email}` : undefined}
        >
          ⚡ {formatSparks(wallet.balance)}
        </button>

        <button className="ghost" onClick={logout} title="Log out">
          ⏏
        </button>
      </div>
    </header>
  );
};
