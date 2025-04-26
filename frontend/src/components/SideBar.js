// src/components/SideBar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const SideBar = ({ open, toggleDrawer }) => {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  // Navigation items with icons and cute emojis
  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/bot-summary', 
      emoji: '✨',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ) 
    },
    { 
      name: 'Emails', 
      path: '/', 
      emoji: '📧',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ) 
    },
    { 
      name: 'Calendar', 
      path: '/calendar', 
      emoji: '🗓️',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ) 
    },
    { 
      name: 'Drafts', 
      path: '/drafts', 
      emoji: '📝',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ) 
    },
    { 
      name: 'Settings', 
      path: '/settings', 
      emoji: '⚙️',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ) 
    },
  ];

  const bgColors = {
    hover: {
      '/bot-summary': 'tw-bg-pastel-purple',
      '/': 'tw-bg-pastel-blue',
      '/calendar': 'tw-bg-pastel-green',
      '/drafts': 'tw-bg-pastel-yellow',
      '/settings': 'tw-bg-pastel-pink'
    },
    active: {
      '/bot-summary': 'tw-bg-primary tw-bg-opacity-20',
      '/': 'tw-bg-secondary tw-bg-opacity-20',
      '/calendar': 'tw-bg-accent tw-bg-opacity-20',
      '/drafts': 'tw-bg-primary tw-bg-opacity-20',
      '/settings': 'tw-bg-secondary tw-bg-opacity-20'
    }
  };

  return (
    <div
      className={`tw-fixed tw-top-16 tw-left-0 tw-h-[calc(100%-64px)] tw-bg-light tw-shadow-soft tw-transform tw-transition-transform tw-duration-500 tw-z-40 ${
        open ? 'tw-translate-x-0' : '-tw-translate-x-full'
      }`}
    >
      <div className="tw-w-64 tw-py-6 tw-px-4">
        <div className="tw-mb-8 tw-px-2">
          <div className="tw-text-xs tw-font-medium tw-text-gray-400 tw-uppercase tw-tracking-wider">Main Menu</div>
        </div>
        
        {/* Navigation List */}
        <nav>
          <ul className="tw-space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isHovered = hoveredItem === item.path;
              
              return (
                <li key={item.path} className="tw-mb-1">
                  <Link
                    to={item.path}
                    onClick={() => toggleDrawer()}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`tw-flex tw-items-center tw-py-3 tw-px-4 tw-rounded-xl tw-transition-all tw-duration-300 tw-text-dark
                      ${isActive ? bgColors.active[item.path] : isHovered ? bgColors.hover[item.path] : 'tw-bg-transparent'} 
                      ${isActive ? 'tw-font-medium' : 'tw-font-normal'}
                    `}
                  >
                    <div className={`tw-flex tw-items-center tw-justify-center tw-h-8 tw-w-8 tw-mr-3 
                      ${isActive ? 'tw-text-primary' : 'tw-text-gray-600'}`}
                    >
                      {item.icon}
                    </div>
                    <span>{item.name}</span>
                    <div className="tw-ml-auto tw-opacity-60">{item.emoji}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Cute sidebar footer */}
        <div className="tw-absolute tw-bottom-0 tw-left-0 tw-w-full tw-p-4">
          <div className="tw-bg-pastel-yellow tw-rounded-xl tw-p-3 tw-text-center tw-shadow-soft">
            <div className="tw-text-xs tw-text-gray-600">Made with</div>
            <div className="tw-flex tw-justify-center tw-gap-1 tw-text-xl">
              <span>🍐</span>
              <span>💖</span>
              <span>✨</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideBar;
