import React from 'react';
import { NavLink } from 'react-router-dom';

const tabsByLanguage = {
  vi: [
    { icon: '📊', label: 'Trang chủ', path: '/' },
    { icon: '📚', label: 'Chia sẻ', path: '/share' },
    { icon: '💬', label: 'Chat', path: '/chat' },
    { icon: '🤝', label: 'Bạn bè', path: '/friends' },
    { icon: '👤', label: 'Hồ sơ', path: '/profile' },
  ],
  en: [
    { icon: '📊', label: 'Home', path: '/' },
    { icon: '📚', label: 'Share', path: '/share' },
    { icon: '💬', label: 'Chat', path: '/chat' },
    { icon: '🤝', label: 'Friends', path: '/friends' },
    { icon: '👤', label: 'Profile', path: '/profile' },
  ],
};

function MobileBottomNav({ language = 'vi' }) {
  const tabs = tabsByLanguage[language] || tabsByLanguage.vi;

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileBottomNav;
