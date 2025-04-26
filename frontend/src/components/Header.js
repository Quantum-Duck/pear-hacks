// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Header = ({ toggleDrawer, toggleChatSidebar, handleLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleProfileClick = () => {
    setMenuOpen(!menuOpen);
  };

  const handleClickOutside = () => {
    if (menuOpen) setMenuOpen(false);
  };

  const handleSignOut = () => {
    handleLogout();
    setMenuOpen(false);
  };

  return (
    <header className="tw-fixed tw-top-0 tw-left-0 tw-right-0 tw-z-50 tw-bg-white tw-shadow-soft tw-h-16">
      <div className="tw-flex tw-items-center tw-h-full tw-px-4 tw-max-w-[1400px] tw-mx-auto">
        {/* Logo and Brand */}
        <div className="tw-flex tw-items-center">
          <button
            onClick={toggleDrawer}
            className="tw-p-2 tw-rounded-full tw-text-dark hover:tw-bg-pastel-blue tw-transition-all tw-duration-300 tw-mr-3"
            aria-label="Toggle menu"
          >
            {/* Menu Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="tw-h-6 tw-w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <Link to="/" className="tw-flex tw-items-center tw-gap-2">
            <div className="tw-text-2xl tw-font-bold tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent">
              Pear
            </div>
            <div className="tw-text-3xl tw-leading-none">🍐</div>
          </Link>
          
          {/* Greeting message */}
          <div className="tw-ml-6 tw-font-medium tw-text-dark tw-hidden md:tw-block">
            {greeting}, friend!
          </div>
        </div>

        {/* Spacer */}
        <div className="tw-flex-1" />

        {/* Actions */}
        <div className="tw-flex tw-items-center tw-gap-1">
          {/* Chat Toggle */}
          <button
            onClick={toggleChatSidebar}
            className="tw-p-2 tw-rounded-full tw-bg-pastel-purple tw-text-dark hover:tw-bg-primary hover:tw-text-white tw-transition-all tw-duration-300 tw-shadow-button"
            aria-label="Toggle chat"
          >
            {/* Chat Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="tw-h-6 tw-w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>

          {/* Account/Profile */}
          <div className="tw-relative">
            <button
              onClick={handleProfileClick}
              className="tw-p-2 tw-rounded-full tw-bg-pastel-green tw-text-dark hover:tw-bg-secondary hover:tw-text-white tw-transition-all tw-duration-300 tw-ml-2 tw-shadow-button"
              aria-label="Open profile menu"
            >
              {/* Account Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="tw-h-6 tw-w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                <div 
                  className="tw-fixed tw-inset-0 tw-z-40" 
                  onClick={handleClickOutside}
                ></div>
                <div className="tw-absolute tw-right-0 tw-mt-2 tw-w-48 tw-bg-white tw-rounded-xl tw-shadow-hover tw-border tw-border-pastel-blue tw-z-50 tw-overflow-hidden tw-animate-fadeIn">
                  <div className="tw-p-3 tw-border-b tw-border-pastel-blue">
                    <div className="tw-text-sm tw-font-medium tw-text-dark">Your Account</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="tw-flex tw-items-center tw-w-full tw-text-left tw-px-4 tw-py-3 tw-text-dark hover:tw-bg-pastel-pink tw-transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5 tw-mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
