import useColorMode from '@/Hooks/useColorMode';

const DarkModeSwitcher = () => {
  const [colorMode, setColorMode] = useColorMode();

  return (
    <div className="flex items-center justify-center">
      <div 
        className="relative flex h-9 w-20 items-center rounded-full bg-gray-200 dark:bg-gray-700 p-1 duration-300 ease-in-out cursor-pointer shadow-inner"
        onClick={() => {
          if (typeof setColorMode === 'function') {
            setColorMode(colorMode === 'light' ? 'dark' : 'light');
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span
          className={`absolute left-1 flex h-7 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300 dark:bg-gray-800 ${
            colorMode === 'dark' ? 'translate-x-full' : ''
          }`}
        >
           {/* Active Icon in Handle */}
           {colorMode === 'dark' ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-indigo-400 fill-indigo-400"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
           ) : (
             <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-yellow-500 fill-yellow-500"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
           )}
        </span>

        {/* Background Icons (Visible when not covered) */}
        <span className="flex w-full justify-between px-2.5">
            <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-4 h-4 ${colorMode === 'light' ? 'opacity-0' : 'text-gray-400'}`}
                xmlns="http://www.w3.org/2000/svg"
            >
                 {/* Sun Icon Placeholder on Left when Dark Mode is Active (Empty or dim) */}
                 <circle cx="12" cy="12" r="5" />
                 <line x1="12" y1="1" x2="12" y2="3" />
                 <line x1="12" y1="21" x2="12" y2="23" />
                 <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                 <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                 <line x1="1" y1="12" x2="3" y2="12" />
                 <line x1="21" y1="12" x2="23" y2="12" />
                 <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                 <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>

             <svg
               viewBox="0 0 24 24"
               fill="none"
               strokeWidth="2"
               strokeLinecap="round"
               strokeLinejoin="round"
               className={`w-4 h-4 ${colorMode === 'dark' ? 'opacity-0' : 'text-gray-400'}`}
               xmlns="http://www.w3.org/2000/svg"
             >
                 {/* Moon Icon Placeholder on Right when Light Mode is Active */}
                 <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
             </svg>
        </span>
      </div>
    </div>
  );
};

export default DarkModeSwitcher;
