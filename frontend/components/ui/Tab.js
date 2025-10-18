export default function Tab({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  className = ''
}) {
  const variants = {
    default: {
      container: 'border-b border-gray-200 dark:border-gray-700',
      tab: 'border-b-2 pb-2 px-4 py-2 text-sm font-medium transition-colors',
      active: 'border-primary-500 text-primary-600 dark:text-primary-400',
      inactive: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
    },
    pills: {
      container: 'p-1 bg-gray-100 dark:bg-gray-800 rounded-lg',
      tab: 'px-3 py-2 text-sm font-medium rounded-md transition-colors',
      active: 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm',
      inactive: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
    }
  };

  const config = variants[variant];

  return (
    <div className={`${config.container} ${className}`}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${config.tab} ${
              activeTab === tab.id ? config.active : config.inactive
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="flex items-center">
              {tab.icon && <tab.icon className="h-4 w-4 mr-2" />}
              {tab.label}
              {tab.count !== null && tab.count !== undefined && (
                <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}