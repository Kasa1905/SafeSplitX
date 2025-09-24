import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import {
  HomeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  BanknotesIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Expenses', href: '/expenses', icon: CurrencyDollarIcon },
  { name: 'Groups', href: '/groups', icon: UserGroupIcon },
  { name: 'Settlements', href: '/settlements', icon: BanknotesIcon },
  { name: 'Fraud Detection', href: '/fraud', icon: ShieldExclamationIcon },
];

export default function Layout({ children, title = 'SplitSafeX' }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true' || 
                  window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile sidebar */}
        <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
          <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setSidebarOpen(false)} />
          
          <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">SplitSafeX</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <a className={`group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors ${
                      router.pathname === item.href
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}>
                      <item.icon className="mr-4 h-6 w-6" />
                      {item.name}
                    </a>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">SplitSafeX</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <a className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      router.pathname === item.href
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}>
                      <item.icon className="mr-3 h-6 w-6" />
                      {item.name}
                    </a>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="md:pl-64 flex flex-col flex-1">
          {/* Top header */}
          <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50 dark:bg-gray-900">
            <button
              type="button"
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden md:block bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex-1" />
                <div className="flex items-center space-x-4">
                  {/* Dark mode toggle */}
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {darkMode ? (
                      <SunIcon className="h-5 w-5" />
                    ) : (
                      <MoonIcon className="h-5 w-5" />
                    )}
                  </button>

                  {/* User menu */}
                  {user && (
                    <div className="relative group">
                      <button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                            {user.firstName?.charAt(0) || '?'}{user.lastName?.charAt(0) || ''}
                          </span>
                        </div>
                        <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                      </button>
                      
                      {/* Dropdown menu */}
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                        <Link href="/profile">
                          <a className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <UserCircleIcon className="h-4 w-4 mr-2" />
                            Profile Settings
                          </a>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}