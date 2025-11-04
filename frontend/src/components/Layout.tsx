import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <nav className="bg-gray-100 dark:bg-gray-800 shadow-lg relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center gap-3">
                  <img
                    src="/assets/bricks.png"
                    alt="Building Bricks"
                    className="h-16 relative z-10"
                    style={{ marginBottom: '-1rem', marginTop: '-0.5rem' }}
                  />
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ fontFamily: "'Bungee', sans-serif", letterSpacing: '0.05em' }}>
                    CATALOG
                  </span>
                </Link>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/')
                      ? 'border-primary-600 text-gray-900 dark:border-primary-400 dark:text-white'
                      : 'border-transparent text-gray-600 dark:text-gray-300 hover:border-gray-400 hover:text-gray-900 dark:hover:border-gray-500 dark:hover:text-gray-200'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/sets"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/sets')
                      ? 'border-primary-600 text-gray-900 dark:border-primary-400 dark:text-white'
                      : 'border-transparent text-gray-600 dark:text-gray-300 hover:border-gray-400 hover:text-gray-900 dark:hover:border-gray-500 dark:hover:text-gray-200'
                  }`}
                >
                  My Sets
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden ml-2 p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile menu sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gray-100 dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50 sm:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <img
              src="/assets/bricks.png"
              alt="Building Bricks"
              className="h-8"
            />
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100" style={{ fontFamily: "'Bungee', sans-serif" }}>
              MENU
            </span>
          </div>
          <button
            onClick={closeMobileMenu}
            className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Close menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="py-4 space-y-1">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className={`block pl-4 pr-4 py-3 border-l-4 text-base font-medium ${
              isActive('/')
                ? 'border-primary-600 text-gray-900 bg-gray-200 dark:border-primary-400 dark:text-primary-300 dark:bg-gray-700'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/sets"
            onClick={closeMobileMenu}
            className={`block pl-4 pr-4 py-3 border-l-4 text-base font-medium ${
              isActive('/sets')
                ? 'border-primary-600 text-gray-900 bg-gray-200 dark:border-primary-400 dark:text-primary-300 dark:bg-gray-700'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            My Sets
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
