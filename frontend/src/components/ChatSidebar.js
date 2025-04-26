// src/components/ChatSidebar.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ChatSidebar({ isOpen, toggleChatSidebar }) {
  // Chat-related state
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [userProfile, setUserProfile] = useState('');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // State for switching views: "chat" or "calendar"
  const [viewMode, setViewMode] = useState('chat');

  // Calendar events state
  const [calendarEvents, setCalendarEvents] = useState([]);
  // State to control the open/close status of the event form modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  // State to hold form data for creating/editing a calendar event
  const [calendarForm, setCalendarForm] = useState({
    id: null,
    summary: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    attendees: ''
  });

  // Fetch user profile on component mount.
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/emails/get_analysis`, { withCredentials: true })
      .then((response) => {
        const profile = response.data.profile;
        if (profile) {
          setUserProfile(profile);
        }
      })
      .catch((error) => {
        console.error('Error fetching user analysis:', error);
      });
  }, []);

  // Fetch calendar events when the view is switched to calendar.
  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarEvents();
    }
  }, [viewMode]);

  // Function to load calendar events from the backend.
  const fetchCalendarEvents = () => {
    axios
      .get(`${API_BASE_URL}/api/calendar/`, { withCredentials: true })
      .then((response) => {
        setCalendarEvents(response.data);
      })
      .catch((error) => {
        console.error('Error fetching calendar events:', error);
        alert('Error fetching calendar events.');
      });
  };

  // Handler for sending a chat prompt.
  const handleSend = () => {
    if (!prompt.trim()) return;

    // Pull the current time and the user's time zone from the browser
    const currentTime = new Date().toISOString();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Append the extra details to the prompt text
    const enrichedPrompt = `${prompt}\nCurrent time: ${currentTime}\nTime zone: ${timeZone}`;

    // Preserve line breaks in the user message
    const userMessage = { sender: 'User', text: prompt };
    setChatHistory([...chatHistory, userMessage]);

    axios
      .post(
        `${API_BASE_URL}/api/ai-chat/`,
        { prompt: enrichedPrompt },
        { withCredentials: true }
      )
      .then((response) => {
        // Preserve any line breaks in the AI response
        const aiMessage = { sender: 'AI', text: response.data.response };
        setChatHistory((history) => [...history, aiMessage]);
      })
      .catch((error) => {
        console.error('Error in AI chat:', error);
        // Add an error message to the chat history
        setChatHistory((history) => [...history, { 
          sender: 'System', 
          text: 'Error communicating with the AI service. Please try again.'
        }]);
      });

    setPrompt('');
  };

  // Handler to analyze the user.
  const handleAnalyzeUser = () => {
    axios
      .get(`${API_BASE_URL}/api/emails/analyze_user`, { withCredentials: true })
      .then((response) => {
        const data = response.data;
        setUserProfile(data.profile);
        alert('User analysis completed and profile generated.');
      })
      .catch((error) => {
        console.error('Error analyzing user:', error);
        alert('Error analyzing user. Please try again.');
      });
  };

  // Open the profile modal.
  const handleDisplayProfile = () => {
    setProfileModalOpen(true);
  };

  // Close the profile modal.
  const handleCloseProfileModal = () => {
    setProfileModalOpen(false);
  };

  // ----------------------
  // Calendar Event Handlers
  // ----------------------

  // Opens the event modal. If an event is passed in, the form is prefilled for editing.
  const openEventModal = (event = null) => {
    if (event) {
      // Editing an existing event: prefill the form with current data.
      setCalendarForm({
        id: event.id,
        summary: event.summary || '',
        start_time: event.start.dateTime || '',
        end_time: event.end.dateTime || '',
        location: event.location || '',
        description: event.description || '',
        attendees: event.attendees ? event.attendees.map(a => a.email).join(', ') : ''
      });
    } else {
      // Creating a new event: clear the form.
      setCalendarForm({
        id: null,
        summary: '',
        start_time: '',
        end_time: '',
        location: '',
        description: '',
        attendees: ''
      });
    }
    setEventModalOpen(true);
  };

  // Closes the event modal.
  const closeEventModal = () => {
    setEventModalOpen(false);
  };

  // Updates the calendar form state as the user types.
  const handleCalendarFormChange = (e) => {
    const { name, value } = e.target;
    setCalendarForm(prev => ({ ...prev, [name]: value }));
  };

  // Handles the creation or updating of a calendar event.
  const handleSubmitEvent = () => {
    // Convert attendees string into an array (split by comma and trim).
    const attendeesArray = calendarForm.attendees
      ? calendarForm.attendees.split(',').map(email => email.trim())
      : [];

    if (calendarForm.id) {
      // Update the existing event using a PUT request.
      axios
        .put(`${API_BASE_URL}/api/calendar/${calendarForm.id}`, {
          summary: calendarForm.summary,
          start_time: calendarForm.start_time,
          end_time: calendarForm.end_time,
          location: calendarForm.location,
          description: calendarForm.description,
          attendees: attendeesArray
        }, { withCredentials: true })
        .then((response) => {
          alert('Event updated successfully.');
          closeEventModal();
          fetchCalendarEvents();
        })
        .catch((error) => {
          console.error('Error updating event:', error);
          alert('Error updating event.');
        });
    } else {
      // Create a new event using a POST request.
      axios
        .post(`${API_BASE_URL}/api/calendar/`, {
          summary: calendarForm.summary,
          start_time: calendarForm.start_time,
          end_time: calendarForm.end_time,
          location: calendarForm.location,
          description: calendarForm.description,
          attendees: attendeesArray
        }, { withCredentials: true })
        .then((response) => {
          alert('Event created successfully.');
          closeEventModal();
          fetchCalendarEvents();
        })
        .catch((error) => {
          console.error('Error creating event:', error);
          alert('Error creating event.');
        });
    }
  };

  // Deletes the specified calendar event.
  const handleDeleteEvent = (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    axios
      .delete(`${API_BASE_URL}/api/calendar/${eventId}`, { withCredentials: true })
      .then((response) => {
        alert('Event deleted successfully.');
        fetchCalendarEvents();
      })
      .catch((error) => {
        console.error('Error deleting event:', error);
        alert('Error deleting event.');
      });
  };

  return (
    <div
      className={`tw-fixed tw-right-0 tw-top-[64px] tw-w-80 tw-bg-white tw-text-dark tw-p-4 tw-overflow-y-auto tw-overflow-x-hidden tw-transform tw-transition-transform tw-duration-500 tw-ease-in-out tw-shadow-soft ${
        isOpen ? 'tw-translate-x-0' : 'tw-translate-x-full'
      }`}
      style={{ height: 'calc(100vh - 64px)' }} // Ensures the sidebar fits under the header.
    >
      {/* Tab Headers: switch between Chat and Calendar views */}
      <div className="tw-flex tw-justify-between tw-items-center tw-mb-6 tw-bg-pastel-blue tw-bg-opacity-30 tw-rounded-2xl tw-p-1">
        <button 
          onClick={() => setViewMode('chat')}
          className={`tw-flex-1 tw-py-2 tw-px-4 tw-rounded-xl tw-transition-all tw-duration-300 tw-flex tw-items-center tw-justify-center tw-gap-2 ${
            viewMode === 'chat' 
              ? 'tw-bg-white tw-shadow-button tw-text-primary tw-font-medium' 
              : 'tw-text-gray-600 hover:tw-bg-white hover:tw-bg-opacity-50'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
          Chat
        </button>
        <button 
          onClick={() => setViewMode('calendar')}
          className={`tw-flex-1 tw-py-2 tw-px-4 tw-rounded-xl tw-transition-all tw-duration-300 tw-flex tw-items-center tw-justify-center tw-gap-2 ${
            viewMode === 'calendar' 
              ? 'tw-bg-white tw-shadow-button tw-text-secondary tw-font-medium' 
              : 'tw-text-gray-600 hover:tw-bg-white hover:tw-bg-opacity-50'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          Calendar
        </button>
      </div>

      {/* Chat View */}
      {viewMode === 'chat' && (
        <>
          <div className="tw-flex tw-justify-between tw-items-center tw-px-1">
            <div className="tw-flex tw-items-center">
              <div className="tw-h-8 tw-w-8 tw-bg-pastel-purple tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mr-2">
                <span className="tw-text-lg">🤖</span>
              </div>
              <h2 className="tw-text-lg tw-font-semibold tw-text-primary">Pear Assistant</h2>
            </div>
            <button
              onClick={toggleChatSidebar}
              className="tw-bg-transparent tw-border tw-border-secondary tw-text-secondary tw-px-3 tw-py-1 tw-rounded-lg hover:tw-bg-secondary hover:tw-text-white tw-transition-all tw-duration-300"
              aria-label="Hide chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {chatHistory.length === 0 ? (
            <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-mt-8 tw-p-4 tw-text-center tw-text-gray-500">
              <div className="tw-text-4xl tw-mb-3">👋</div>
              <p className="tw-mb-3">Hi there! I'm your friendly assistant.</p>
              <p className="tw-text-sm">Ask me questions, request emails, or help with your calendar!</p>
            </div>
          ) : (
            <ul className="tw-mt-5 tw-space-y-4 tw-max-h-[calc(100vh-280px)] tw-overflow-y-auto tw-pr-1">
              {chatHistory.map((msg, index) => (
                <li 
                  key={index} 
                  className={`tw-rounded-2xl tw-transition-all tw-duration-500 tw-max-h-80 tw-overflow-y-auto tw-p-3
                    ${msg.sender === 'User' 
                      ? 'tw-bg-pastel-blue tw-ml-4' 
                      : 'tw-bg-pastel-green tw-mr-4'}`
                  }
                >
                  <div className="tw-font-medium tw-mb-1 tw-text-xs tw-text-gray-600">
                    {msg.sender === 'User' ? 'You' : '🍐 Pear Assistant'}
                  </div>
                  <div className="tw-break-words tw-whitespace-pre-wrap tw-text-dark">
                    {msg.text && typeof msg.text === 'string' 
                      ? msg.text
                      : JSON.stringify(msg.text, null, 2)}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="tw-mt-4 tw-bg-white tw-rounded-2xl tw-p-3 tw-shadow-soft">
            <textarea
              placeholder="Ask me anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows="3"
              className="tw-w-full tw-p-3 tw-rounded-xl tw-border tw-border-pastel-purple tw-bg-white tw-text-dark focus:tw-border-primary tw-transition-all tw-duration-300 tw-resize-y tw-break-words"
            />
            <div className="tw-flex tw-gap-2 tw-mt-2">
              <button
                onClick={handleSend}
                className="tw-flex-1 tw-bg-primary tw-text-white tw-py-2 tw-px-4 tw-rounded-lg tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-1px] tw-transition-all tw-duration-300 tw-font-medium tw-flex tw-items-center tw-justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5 tw-mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                Send
              </button>
            </div>
          </div>

          <div className="tw-mt-6 tw-flex tw-gap-2">
            <button
              onClick={handleAnalyzeUser}
              className="tw-flex-1 tw-bg-white tw-border tw-border-secondary tw-text-secondary tw-px-3 tw-py-2 tw-rounded-lg tw-shadow-button hover:tw-bg-secondary hover:tw-text-white tw-transition-all tw-duration-300 tw-text-sm"
            >
              Analyze Writing
            </button>
            <button
              onClick={handleDisplayProfile}
              disabled={!userProfile}
              className={`tw-flex-1 tw-bg-white tw-border tw-border-primary tw-text-primary tw-px-3 tw-py-2 tw-rounded-lg tw-shadow-button hover:tw-bg-primary hover:tw-text-white tw-transition-all tw-duration-300 tw-text-sm ${
                !userProfile ? 'tw-opacity-50 tw-cursor-not-allowed' : ''
              }`}
            >
              View Profile
            </button>
          </div>
        </>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <>
          <div className="tw-flex tw-justify-between tw-items-center tw-px-1">
            <div className="tw-flex tw-items-center">
              <div className="tw-h-8 tw-w-8 tw-bg-pastel-green tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mr-2">
                <span className="tw-text-lg">🗓️</span>
              </div>
              <h2 className="tw-text-lg tw-font-semibold tw-text-secondary">Calendar</h2>
            </div>
            <button
              onClick={() => setViewMode('chat')}
              className="tw-bg-transparent tw-border tw-border-primary tw-text-primary tw-px-3 tw-py-1 tw-rounded-lg hover:tw-bg-primary hover:tw-text-white tw-transition-all tw-duration-300"
              aria-label="Back to chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => openEventModal()}
            className="tw-mt-6 tw-w-full tw-bg-accent tw-text-dark tw-py-3 tw-rounded-xl tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-1px] tw-transition-all tw-duration-300 tw-font-medium tw-flex tw-items-center tw-justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5 tw-mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Event
          </button>

          {calendarEvents.length === 0 ? (
            <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-mt-8 tw-p-4 tw-text-center tw-text-gray-500">
              <div className="tw-text-4xl tw-mb-3">📅</div>
              <p className="tw-mb-2">No events yet</p>
              <p className="tw-text-sm">Create your first event to get started!</p>
            </div>
          ) : (
            <ul className="tw-mt-5 tw-space-y-3 tw-max-h-[calc(100vh-220px)] tw-overflow-y-auto tw-pr-1">
              {calendarEvents.map((event) => (
                <li key={event.id} className="tw-rounded-xl tw-bg-white tw-shadow-soft tw-p-4 tw-transition-all tw-duration-300 hover:tw-shadow-hover">
                  <div className="tw-border-l-4 tw-border-accent tw-pl-3">
                    <h3 className="tw-font-semibold tw-break-words tw-text-dark">{event.summary}</h3>
                    <div className="tw-flex tw-items-center tw-text-sm tw-text-gray-600 tw-mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="tw-break-words">
                        {new Date(event.start.dateTime).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {event.location && (
                      <div className="tw-flex tw-items-center tw-text-sm tw-text-gray-600 tw-mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="tw-break-words">{event.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="tw-flex tw-gap-2 tw-mt-3 tw-justify-end">
                    <button
                      onClick={() => openEventModal(event)}
                      className="tw-bg-white tw-border tw-border-secondary tw-text-secondary tw-px-3 tw-py-1 tw-rounded-lg hover:tw-bg-secondary hover:tw-text-white tw-transition-all tw-duration-300 tw-text-sm tw-flex tw-items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="tw-bg-white tw-border tw-border-primary tw-text-primary tw-px-3 tw-py-1 tw-rounded-lg hover:tw-bg-primary hover:tw-text-white tw-transition-all tw-duration-300 tw-text-sm tw-flex tw-items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-transition-opacity tw-duration-500 tw-z-50">
          <div className="tw-bg-white tw-rounded-2xl tw-w-full tw-max-w-3xl tw-overflow-hidden tw-shadow-hover" style={{maxHeight: '80vh'}}>
            {/* Modal Header */}
            <div className="tw-bg-gradient-to-r tw-from-pastel-purple tw-to-pastel-blue tw-p-5">
              <div className="tw-flex tw-items-center tw-justify-between">
                <div className="tw-flex tw-items-center">
                  <div className="tw-h-10 tw-w-10 tw-bg-white tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mr-3 tw-shadow-button">
                    <span className="tw-text-xl">👤</span>
                  </div>
                  <h3 className="tw-text-xl tw-font-bold tw-text-dark">Your Writing Profile</h3>
                </div>
                <button
                  onClick={handleCloseProfileModal}
                  className="tw-bg-white tw-text-primary tw-h-8 tw-w-8 tw-rounded-full tw-flex tw-items-center tw-justify-center hover:tw-bg-primary hover:tw-text-white tw-transition-all tw-duration-300 tw-shadow-button"
                  aria-label="Close modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="tw-p-6 tw-overflow-y-auto" style={{maxHeight: 'calc(80vh - 80px)'}}>
              <div className="tw-bg-pastel-yellow tw-bg-opacity-20 tw-p-4 tw-rounded-xl tw-mb-4 tw-border-l-4 tw-border-accent">
                <p className="tw-text-sm tw-text-gray-600">This is an AI-generated analysis of your writing style based on your emails</p>
              </div>
              <div className="tw-bg-white tw-rounded-xl tw-shadow-soft tw-p-5 tw-whitespace-pre-wrap tw-break-words tw-text-dark">
                {userProfile}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="tw-p-4 tw-bg-gray-50 tw-border-t tw-border-gray-200">
              <div className="tw-flex tw-justify-end">
                <button
                  onClick={handleCloseProfileModal}
                  className="tw-bg-primary tw-text-white tw-px-6 tw-py-2 tw-rounded-lg tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-1px] tw-transition-all tw-duration-300 tw-font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Event Modal */}
      {eventModalOpen && (
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50">
          <div className="tw-bg-white tw-rounded-2xl tw-w-full tw-max-w-lg tw-overflow-hidden tw-shadow-hover">
            {/* Modal Header */}
            <div className="tw-bg-gradient-to-r tw-from-pastel-green tw-to-pastel-blue tw-p-5">
              <div className="tw-flex tw-items-center tw-justify-between">
                <div className="tw-flex tw-items-center">
                  <div className="tw-h-10 tw-w-10 tw-bg-white tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mr-3 tw-shadow-button">
                    <span className="tw-text-xl">{calendarForm.id ? '📝' : '✨'}</span>
                  </div>
                  <h3 className="tw-text-xl tw-font-bold tw-text-dark">
                    {calendarForm.id ? 'Edit Event' : 'Create New Event'}
                  </h3>
                </div>
                <button
                  onClick={closeEventModal}
                  className="tw-bg-white tw-text-secondary tw-h-8 tw-w-8 tw-rounded-full tw-flex tw-items-center tw-justify-center hover:tw-bg-secondary hover:tw-text-white tw-transition-all tw-duration-300 tw-shadow-button"
                  aria-label="Close modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="tw-p-6">
              <div className="tw-space-y-4">
                <div>
                  <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-600 tw-mb-1">Event Name</label>
                  <input
                    type="text"
                    name="summary"
                    placeholder="What's your event called?"
                    value={calendarForm.summary}
                    onChange={handleCalendarFormChange}
                    className="tw-w-full tw-p-3 tw-rounded-xl tw-border tw-border-pastel-purple tw-bg-white tw-text-dark focus:tw-ring-2 focus:tw-ring-accent focus:tw-border-transparent"
                  />
                </div>
                
                <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-600 tw-mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      name="start_time"
                      value={calendarForm.start_time}
                      onChange={handleCalendarFormChange}
                      className="tw-w-full tw-p-3 tw-rounded-xl tw-border tw-border-pastel-blue tw-bg-white tw-text-dark focus:tw-ring-2 focus:tw-ring-accent focus:tw-border-transparent"
                    />
                  </div>
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-600 tw-mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      name="end_time"
                      value={calendarForm.end_time}
                      onChange={handleCalendarFormChange}
                      className="tw-w-full tw-p-3 tw-rounded-xl tw-border tw-border-pastel-blue tw-bg-white tw-text-dark focus:tw-ring-2 focus:tw-ring-accent focus:tw-border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-600 tw-mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    placeholder="Where is this happening? (optional)"
                    value={calendarForm.location}
                    onChange={handleCalendarFormChange}
                    className="tw-w-full tw-p-3 tw-rounded-xl tw-border tw-border-pastel-green tw-bg-white tw-text-dark focus:tw-ring-2 focus:tw-ring-accent focus:tw-border-transparent"
                  />
                </div>
                
                <div>
                  <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-600 tw-mb-1">Description</label>
                  <textarea
                    name="description"
                    placeholder="Add some details about this event (optional)"
                    value={calendarForm.description}
                    onChange={handleCalendarFormChange}
                    rows="3"
                    className="tw-w-full tw-p-3 tw-rounded-xl tw-border tw-border-pastel-yellow tw-bg-white tw-text-dark focus:tw-ring-2 focus:tw-ring-accent focus:tw-border-transparent tw-resize-y"
                  />
                </div>
                
                <div>
                  <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-600 tw-mb-1">Attendees</label>
                  <input
                    type="text"
                    name="attendees"
                    placeholder="Enter email addresses separated by commas (optional)"
                    value={calendarForm.attendees}
                    onChange={handleCalendarFormChange}
                    className="tw-w-full tw-p-3 tw-rounded-xl tw-border tw-border-pastel-purple tw-bg-white tw-text-dark focus:tw-ring-2 focus:tw-ring-accent focus:tw-border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="tw-p-4 tw-bg-gray-50 tw-border-t tw-border-gray-200">
              <div className="tw-flex tw-justify-end tw-gap-3">
                <button
                  onClick={closeEventModal}
                  className="tw-bg-white tw-text-gray-600 tw-border tw-border-gray-300 tw-px-5 tw-py-2 tw-rounded-lg hover:tw-bg-gray-100 tw-transition-all tw-duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitEvent}
                  className={`tw-text-white tw-px-5 tw-py-2 tw-rounded-lg tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-1px] tw-transition-all tw-duration-300 tw-font-medium tw-flex tw-items-center
                    ${calendarForm.id ? 'tw-bg-secondary' : 'tw-bg-accent tw-text-dark'}`}
                >
                  {calendarForm.id ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5 tw-mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Update Event
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5 tw-mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Create Event
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatSidebar;
