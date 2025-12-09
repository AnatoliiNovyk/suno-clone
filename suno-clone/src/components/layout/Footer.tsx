import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-neutral-900 border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold text-neutral-50 mb-4">SUNO</h3>
            <p className="text-sm text-neutral-100">
              AI музична платформа для створення унікальних треків
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-50 mb-3">Продукт</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/create" className="text-sm text-neutral-100 hover:text-neutral-50">
                  Створити музику
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-neutral-100 hover:text-neutral-50">
                  Тарифи
                </Link>
              </li>
              <li>
                <Link to="/hub" className="text-sm text-neutral-100 hover:text-neutral-50">
                  Hub
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-50 mb-3">Компанія</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-neutral-100 hover:text-neutral-50">
                  Про нас
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-neutral-100 hover:text-neutral-50">
                  Кар`єра
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-neutral-100 hover:text-neutral-50">
                  Контакти
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-50 mb-3">Правова інформація</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-neutral-100 hover:text-neutral-50">
                  Умови використання
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-neutral-100 hover:text-neutral-50">
                  Політика конфіденційності
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-sm text-neutral-300">
            2024 Suno Clone. Всі права захищені.
          </p>
        </div>
      </div>
    </footer>
  );
}
