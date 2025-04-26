// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EmailList from './components/EmailList';
import EmailDetail from './components/EmailDetail';
import CalendarView from './components/CalendarView';
import ChatSidebar from './components/ChatSidebar';
import WrittenDrafts from './components/WrittenDrafts';
import BotSummary from './components/BotSummary';
import SideBar from './components/SideBar';
import Header from './components/Header';
import TailwindLogin from './components/TailwindLogin';
import { supabase } from './supabaseClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

function MainApp({ handleLogout, emailCache, setEmailCache }) {
  const [openDrawer, setOpenDrawer] = useState(true);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);

  const toggleDrawer = () => setOpenDrawer(prev => !prev);
  const toggleChatSidebar = () => setChatSidebarOpen(prev => !prev);

  return (
    <div className="tw-relative tw-min-h-screen tw-bg-light">
      <Header
        toggleDrawer={toggleDrawer}
        toggleChatSidebar={toggleChatSidebar}
        handleLogout={handleLogout}
      />

      <SideBar open={openDrawer} toggleDrawer={toggleDrawer} />

      <div className={`tw-transition-all tw-duration-500 tw-ease-in-out ${
        openDrawer ? "tw-ml-64" : "tw-ml-0"
      } tw-p-6 tw-mt-16 tw-min-h-[calc(100vh-64px)]`}>
        <div className="tw-bg-white tw-rounded-2xl tw-p-6 tw-shadow-soft tw-min-h-[calc(100vh-120px)] tw-max-w-[1400px] tw-mx-auto">
          <Routes>
            <Route
              path="/"
              element={<EmailList emailCache={emailCache} setEmailCache={setEmailCache} />}
            />
            <Route path="/email/:emailId" element={<EmailDetail />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/drafts" element={<WrittenDrafts />} />
            <Route path="/bot-summary" element={<BotSummary />} />
            <Route 
              path="/settings" 
              element={
                <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-[70vh] tw-text-center">
                  <div className="tw-h-24 tw-w-24 tw-bg-pastel-yellow tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mb-4">
                    <span className="tw-text-4xl">⚙️</span>
                  </div>
                  <h2 className="tw-text-2xl tw-font-bold tw-text-dark tw-mb-2">Settings Page</h2>
                  <p className="tw-text-gray-600">This is a placeholder for the settings page.</p>
                </div>
              } 
            />
          </Routes>
        </div>
      </div>

      <ChatSidebar isOpen={chatSidebarOpen} toggleChatSidebar={toggleChatSidebar} />
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [emailCache, setEmailCache] = useState({});

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUser({ email: session.user.email });
        if (session.provider_token) {
          try {
            await fetch(`${API_BASE_URL}/auth/set-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: session.provider_token,
                refresh_token: session.provider_refresh_token,
                scope: session.provider_token_details ? session.provider_token_details.scope : null,
                id_token: session.provider_token_details ? session.provider_token_details.id_token : null,
                email: session.user.email,
              }),
              credentials: 'include',
            });
          } catch (err) {
            console.error('Error setting token on backend:', err);
          }
        }
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setUser({ email: session.user.email });
      else setUser(null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      {user ? (
        <MainApp
          handleLogout={handleLogout}
          emailCache={emailCache}
          setEmailCache={setEmailCache}
        />
      ) : (
        <Routes>
          <Route path="*" element={<TailwindLogin />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;