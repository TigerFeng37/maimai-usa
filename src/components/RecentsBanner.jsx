import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getRecentLocations } from '../utils/recentLocations';

function RecentsBanner() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ bottom: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const locationsWithStoreId = getRecentLocations();

  const updateMenuPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPosition({
      bottom: window.innerHeight - rect.top + 6,
      left: Math.min(rect.left, window.innerWidth - 320 - 16)
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleClickOutside = (event) => {
      const clickedButton = buttonRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);
      if (!clickedButton && !clickedMenu) setIsOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (locationsWithStoreId.length === 0) return null;

  const handleNavigate = (storeid) => {
    setIsOpen(false);
    if ('startViewTransition' in document) {
      document.startViewTransition(() => {
        navigate(`/location/${storeid}`);
      });
    } else {
      navigate(`/location/${storeid}`);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`fixed left-3 z-[1001] bottom-[5.5rem] md:bottom-12 py-2 px-3 text-sm rounded-full shadow-lg border transition-colors flex flex-row items-center gap-2 ${
          isOpen
            ? 'bg-[#41BCCC] text-white border-[#41BCCC]'
            : 'bg-white dark:bg-gray-900 text-black dark:text-white border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isOpen ? 'bg-white' : 'bg-[#41BCCC]'
          }`}
          aria-hidden="true"
        />
        <span className="font-medium">New</span>
        <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▴</span>
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            bottom: menuPosition.bottom,
            left: Math.max(12, menuPosition.left)
          }}
          className="fixed z-[1100] w-[min(20rem,calc(100vw-1.5rem))] max-h-72 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Recently Activated
            </span>
          </div>
          <ul className="py-1">
            {locationsWithStoreId.map((location) => (
              <li key={location.storeid}>
                <button
                  type="button"
                  role="option"
                  onClick={() => handleNavigate(location.storeid)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex flex-row items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-black dark:text-white truncate">
                        {location.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {[location.city, location.state].filter(Boolean).join(', ')}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm text-gray-400 group-hover:text-[#41BCCC] transition-colors">
                      →
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}

export default RecentsBanner;
