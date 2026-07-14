import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Music,
  CreditCard,
  Receipt,
  ScrollText,
} from 'lucide-react';

const sections = [
  { to: '/admin', label: 'Дашборд', icon: LayoutDashboard, end: true, ready: true },
  { to: '/admin/users', label: 'Користувачі', icon: Users, end: false, ready: true },
  { to: '/admin/tracks', label: 'Треки', icon: Music, end: false, ready: false },
  { to: '/admin/pricing', label: 'Тарифи', icon: CreditCard, end: false, ready: false },
  { to: '/admin/subscriptions', label: 'Підписки', icon: Receipt, end: false, ready: false },
  { to: '/admin/audit', label: 'Аудит', icon: ScrollText, end: false, ready: false },
];

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-neutral-900 pt-16 flex">
      <aside className="w-56 flex-shrink-0 border-r border-white/10 bg-neutral-700/30 px-3 py-6 hidden md:block">
        <p className="px-3 mb-4 text-xs uppercase tracking-wider text-neutral-300">
          Адмін-панель
        </p>
        <nav className="space-y-1">
          {sections.map(({ to, label, icon: Icon, end, ready }) =>
            ready ? (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-primary-500/15 text-primary-500 font-medium'
                      : 'text-neutral-100 hover:bg-white/5 hover:text-neutral-50'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ) : (
              <span
                key={to}
                title="Скоро"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-500 cursor-not-allowed select-none"
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className="ml-auto text-[10px] uppercase tracking-wide">скоро</span>
              </span>
            ),
          )}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 px-4 md:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
