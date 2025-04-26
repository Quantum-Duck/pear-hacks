import React, { useState, useEffect } from 'react';
import axios from 'axios';

// API and workday constants
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WORK_DAY_START = 7;  // 7 AM
const WORK_DAY_END = 21;   // 9 PM
const HOUR_HEIGHT = 60;    // Each hour block is 60px high
const TOTAL_HEIGHT = (WORK_DAY_END - WORK_DAY_START) * HOUR_HEIGHT; // Total day height

function CalendarView() {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  // newEvent holds the data for the creation modal form.
  const [newEvent, setNewEvent] = useState({
    summary: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    attendees: ''
  });
  // dragInfo is used when clicking and dragging inside a day column to create a new event.
  const [dragInfo, setDragInfo] = useState(null);
  // resizingInfo holds data when an event is being resized (extended) by dragging its bottom edge.
  const [resizingInfo, setResizingInfo] = useState(null);

  // ---------------------------------------------------------------------------
  // Fetch the events for the current week from the backend.
  // ---------------------------------------------------------------------------
  const fetchEvents = () => {
    axios
      .get(`${API_BASE_URL}/api/calendar/`, { withCredentials: true })
      .then(response => {
        console.log("Successfully fetched calendar events:", response.data);
        setEvents(response.data);
      })
      .catch(error => {
        console.error("Error fetching calendar events:", error);
      });
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // ---------------------------------------------------------------------------
  // Computes the 7 dates for the current week (starting with Monday)
  // ---------------------------------------------------------------------------
  const getWeekDates = () => {
    const today = new Date();
    // Adjust Sunday (0) so that Monday is day 1
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek - 1));
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();

  // ---------------------------------------------------------------------------
  // DRAG TO CREATE: Handlers for selecting a new event time slot.
  // ---------------------------------------------------------------------------
  const handleMouseDown = (e, day) => {
    e.preventDefault();
    // Determine the click offset within the day column.
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    setDragInfo({ day, startY: offsetY, currentY: offsetY });
  };

  const handleMouseMove = (e) => {
    if (!dragInfo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    setDragInfo(prev => ({ ...prev, currentY: offsetY }));
  };

  const handleMouseUp = (e) => {
    if (!dragInfo) return;
    const { day, startY, currentY } = dragInfo;
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);

    // Here 1px corresponds to 1 minute since HOUR_HEIGHT = 60 for one hour.
    const startMinutesOffset = Math.floor(minY);
    const endMinutesOffset = Math.floor(maxY);

    const startHour = WORK_DAY_START + Math.floor(startMinutesOffset / 60);
    const startMinute = startMinutesOffset % 60;
    const endHour = WORK_DAY_START + Math.floor(endMinutesOffset / 60);
    const endMinute = endMinutesOffset % 60;

    const pad = num => String(num).padStart(2, '0');
    const year = day.getFullYear();
    const month = pad(day.getMonth() + 1);
    const date = pad(day.getDate());
    const startValue = `${year}-${month}-${date}T${pad(startHour)}:${pad(startMinute)}`;
    const endValue = `${year}-${month}-${date}T${pad(endHour)}:${pad(endMinute)}`;

    // Pre-fill the creation form and show the modal.
    setNewEvent({
      summary: '',
      start_time: startValue,
      end_time: endValue,
      location: '',
      description: '',
      attendees: ''
    });
    setShowModal(true);
    setDragInfo(null);
  };

  // ---------------------------------------------------------------------------
  // NEW EVENT MODAL: Handles input changes and submitting the new event.
  // ---------------------------------------------------------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEvent(prev => ({ ...prev, [name]: value }));
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    // Convert attendees (comma-separated emails) to an array.
    const attendees = newEvent.attendees
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    const payload = {
      summary: newEvent.summary,
      start_time: newEvent.start_time,
      end_time: newEvent.end_time,
      location: newEvent.location,
      description: newEvent.description,
      attendees: attendees,
    };

    axios
      .post(`${API_BASE_URL}/api/calendar/`, payload, { withCredentials: true })
      .then(response => {
        console.log("Event created successfully:", response.data);
        fetchEvents();
        setShowModal(false);
        // Reset the form.
        setNewEvent({
          summary: '',
          start_time: '',
          end_time: '',
          location: '',
          description: '',
          attendees: ''
        });
      })
      .catch(error => {
        console.error("Error creating event:", error);
      });
  };

  // ---------------------------------------------------------------------------
  // EVENT DELETION: Called when a user clicks on an event.
  // ---------------------------------------------------------------------------
  const handleDelete = (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      axios
        .delete(`${API_BASE_URL}/api/calendar/${eventId}`, { withCredentials: true })
        .then(response => {
          console.log("Event deleted successfully:", response.data);
          fetchEvents();
        })
        .catch(error => {
          console.error("Error deleting event:", error);
        });
    }
  };

  // ---------------------------------------------------------------------------
  // EVENT RESIZING: Allows users to extend an event by dragging a handle.
  // ---------------------------------------------------------------------------
  const handleResizeMouseDown = (e, event, eventTop, eventHeight) => {
    // Prevent triggering the parent click/drag events.
    e.stopPropagation();
    setResizingInfo({
      event,
      initialMouseY: e.clientY,
      initialHeight: eventHeight,
      currentMouseY: e.clientY
    });
  };

  // Add global mousemove and mouseup listeners when resizing.
  useEffect(() => {
    if (resizingInfo !== null) {
      const handleMouseMoveGlobal = (e) => {
        setResizingInfo(prev => ({ ...prev, currentMouseY: e.clientY }));
      };

      const handleMouseUpGlobal = () => {
        if (resizingInfo) {
          const deltaY = resizingInfo.currentMouseY - resizingInfo.initialMouseY;
          // New height in minutes (with a minimum of 20 minutes).
          const newHeight = Math.max(20, resizingInfo.initialHeight + deltaY);
          // Calculate new end time from the event's start time.
          const startStr = resizingInfo.event.start?.dateTime || resizingInfo.event.start?.date;
          const eventStart = new Date(startStr);
          const newEndTime = new Date(eventStart.getTime() + newHeight * 60000);

          const pad = num => String(num).padStart(2, '0');
          const year = eventStart.getFullYear();
          const month = pad(eventStart.getMonth() + 1);
          const date = pad(eventStart.getDate());
          const hour = pad(newEndTime.getHours());
          const minute = pad(newEndTime.getMinutes());
          const newEndValue = `${year}-${month}-${date}T${hour}:${minute}`;

          // Update the event via the API.
          axios
            .put(
              `${API_BASE_URL}/api/calendar/${resizingInfo.event.id}`,
              { end_time: newEndValue },
              { withCredentials: true }
            )
            .then(response => {
              fetchEvents();
            })
            .catch(error => console.error("Error updating event:", error));
        }
        setResizingInfo(null);
      };

      window.addEventListener('mousemove', handleMouseMoveGlobal);
      window.addEventListener('mouseup', handleMouseUpGlobal);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveGlobal);
        window.removeEventListener('mouseup', handleMouseUpGlobal);
      };
    }
  }, [resizingInfo]);

  // ---------------------------------------------------------------------------
  // RENDER EVENT BOX: Computes the vertical position and height based on the event times.
  // Also includes a resize handle at the bottom.
  // ---------------------------------------------------------------------------
  const renderEventBox = (event) => {
    const startStr = event.start?.dateTime || event.start?.date;
    const endStr = event.end?.dateTime || event.end?.date;
    const startTime = new Date(startStr);
    const endTime = new Date(endStr);

    // Calculate minutes offset from WORK_DAY_START.
    const startTotalMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endTotalMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const workStartMinutes = WORK_DAY_START * 60;
    const top = Math.max(0, startTotalMinutes - workStartMinutes);
    const height = Math.max(20, endTotalMinutes - startTotalMinutes);

    // Get a pastel color based on event name hash
    const getEventColor = () => {
      const hash = event.summary.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
      const colors = [
        'tw-bg-pastel-pink', 
        'tw-bg-pastel-blue', 
        'tw-bg-pastel-green', 
        'tw-bg-pastel-purple', 
        'tw-bg-pastel-yellow'
      ];
      return colors[hash % colors.length];
    };

    const bgColor = getEventColor();
    
    return (
      <div
        key={event.id}
        className={`absolute ${bgColor} tw-border-l-4 tw-border-primary tw-rounded-lg tw-shadow-soft tw-px-2 tw-py-1 tw-text-xs tw-cursor-pointer hover:tw-shadow-hover tw-transition-all tw-duration-300 tw-text-dark`}
        style={{
          top: top,
          height: height,
          left: '5px',
          right: '5px',
          overflow: 'hidden',
        }}
        title={`Click to delete "${event.summary}"`}
        onClick={() => handleDelete(event.id)}
      >
        <div className="tw-font-semibold tw-truncate">{event.summary}</div>
        <div className="tw-text-[10px] tw-flex tw-items-center tw-mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-3 tw-w-3 tw-mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
          {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        {event.location && (
          <div className="tw-text-[10px] tw-flex tw-items-center tw-mt-1 tw-truncate">
            <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-3 tw-w-3 tw-mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {event.location}
          </div>
        )}
        {/* Resize handle to extend the event */}
        <div
          className="tw-h-2 tw-absolute tw-bottom-0 tw-left-0 tw-right-0 tw-bg-secondary tw-bg-opacity-30 tw-cursor-ns-resize tw-rounded-b-lg hover:tw-bg-opacity-60"
          onMouseDown={(e) => handleResizeMouseDown(e, event, top, height)}
        ></div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDER: Timeline and day columns with events, drag selection, and modals.
  // ---------------------------------------------------------------------------
  return (
    <div className="tw-text-dark tw-min-h-full">
      <div className="tw-flex tw-items-center tw-mb-6">
        <div className="tw-h-12 tw-w-12 tw-bg-pastel-green tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mr-4">
          <span className="tw-text-2xl">🗓️</span>
        </div>
        <h1 className="tw-text-3xl tw-font-bold tw-bg-gradient-to-r tw-from-secondary tw-to-accent tw-bg-clip-text tw-text-transparent">Calendar</h1>
        
        <div className="tw-ml-auto">
          <button
            onClick={() => setShowModal(true)}
            className="tw-bg-accent tw-text-dark tw-px-4 tw-py-2 tw-rounded-xl tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-1px] tw-transition-all tw-duration-300 tw-font-medium tw-flex tw-items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5 tw-mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Event
          </button>
        </div>
      </div>

      <div className="tw-bg-white tw-rounded-2xl tw-shadow-soft tw-p-4 tw-mb-6">
        {/* Header Row: Empty left column for timeline, then day headers */}
        <div className="tw-flex">
          <div className="tw-w-16"></div>
          {weekDates.map((day) => {
            const dayKey = day.toISOString().split('T')[0];
            const isToday = new Date().toDateString() === day.toDateString();
            const dayLabel = day.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
            return (
              <div 
                key={dayKey} 
                className={`tw-flex-1 tw-text-center tw-font-semibold tw-py-2 ${isToday ? 'tw-bg-pastel-green tw-rounded-lg tw-bg-opacity-30' : ''}`}
              >
                {dayLabel}
              </div>
            );
          })}
        </div>

        {/* Main grid: Timeline column and seven day columns */}
        <div className="tw-flex tw-mt-2">
          {/* Timeline Column */}
          <div className="tw-w-16 tw-border-r tw-border-gray-200">
            {Array.from({ length: WORK_DAY_END - WORK_DAY_START + 1 }).map((_, idx) => (
              <div
                key={idx}
                className="tw-h-[60px] tw-text-right tw-pr-2 tw-border-b tw-border-gray-100 tw-text-xs tw-text-gray-500 tw-font-medium"
              >
                {WORK_DAY_START + idx}:00
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDates.map((day) => {
            const dayKey = day.toISOString().split('T')[0];
            const isToday = new Date().toDateString() === day.toDateString();
            // Filter events that occur on this day.
            const eventsForDay = events.filter(event => {
              const eventDate = new Date(event.start?.dateTime || event.start?.date);
              return eventDate.toDateString() === day.toDateString();
            });

            return (
              <div
                key={dayKey}
                className={`tw-flex-1 tw-border-r tw-border-gray-200 tw-relative ${isToday ? 'tw-bg-pastel-green tw-bg-opacity-10' : ''}`}
                style={{ height: `${TOTAL_HEIGHT}px` }}
                onMouseDown={(e) => handleMouseDown(e, day)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Hour grid lines */}
                {Array.from({ length: WORK_DAY_END - WORK_DAY_START + 1 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="tw-absolute tw-left-0 tw-right-0 tw-border-t tw-border-gray-100"
                    style={{ top: idx * HOUR_HEIGHT }}
                  ></div>
                ))}

                {/* Render events */}
                {eventsForDay.map(event => renderEventBox(event))}

                {/* Render drag-selection box if a new event is being selected */}
                {dragInfo &&
                  dragInfo.day.toDateString() === day.toDateString() && (
                    <div
                      className="tw-absolute tw-bg-secondary tw-bg-opacity-30 tw-border tw-border-secondary tw-border-dashed"
                      style={{
                        top: Math.min(dragInfo.startY, dragInfo.currentY),
                        height: Math.abs(dragInfo.currentY - dragInfo.startY),
                        left: '2px',
                        right: '2px',
                        borderRadius: '6px',
                      }}
                    ></div>
                  )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for creating a new event */}
      {showModal && (
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-justify-center tw-items-center tw-z-50">
          <div className="tw-bg-white tw-rounded-2xl tw-shadow-soft tw-w-full tw-max-w-md tw-overflow-hidden">
            {/* Header with gradient */}
            <div className="tw-bg-gradient-to-r tw-from-secondary tw-to-primary tw-p-4 tw-text-white">
              <div className="tw-flex tw-items-center">
                <span className="tw-text-2xl tw-mr-2">✨</span>
                <h3 className="tw-text-xl tw-font-bold">Create New Event</h3>
              </div>
            </div>
            
            <form onSubmit={handleModalSubmit} className="tw-p-6 tw-space-y-4">
              <div>
                <label className="tw-block tw-mb-1 tw-font-medium tw-flex tw-items-center">
                  <span className="tw-mr-2">📝</span> Title
                </label>
                <input
                  type="text"
                  name="summary"
                  value={newEvent.summary}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-3 tw-py-2 tw-rounded-xl tw-border tw-border-pastel-blue tw-bg-light tw-shadow-input focus:tw-ring-2 focus:tw-ring-secondary focus:tw-outline-none tw-transition-all tw-duration-300"
                  placeholder="Meeting with team"
                  required
                />
              </div>
              <div className="tw-flex tw-space-x-3">
                <div className="tw-flex-1">
                  <label className="tw-block tw-mb-1 tw-font-medium tw-flex tw-items-center">
                    <span className="tw-mr-2">🕒</span> Start
                  </label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={newEvent.start_time}
                    onChange={handleInputChange}
                    className="tw-w-full tw-px-3 tw-py-2 tw-rounded-xl tw-border tw-border-pastel-green tw-bg-light tw-shadow-input focus:tw-ring-2 focus:tw-ring-secondary focus:tw-outline-none tw-transition-all tw-duration-300"
                    required
                  />
                </div>
                <div className="tw-flex-1">
                  <label className="tw-block tw-mb-1 tw-font-medium tw-flex tw-items-center">
                    <span className="tw-mr-2">⏱️</span> End
                  </label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={newEvent.end_time}
                    onChange={handleInputChange}
                    className="tw-w-full tw-px-3 tw-py-2 tw-rounded-xl tw-border tw-border-pastel-green tw-bg-light tw-shadow-input focus:tw-ring-2 focus:tw-ring-secondary focus:tw-outline-none tw-transition-all tw-duration-300"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="tw-block tw-mb-1 tw-font-medium tw-flex tw-items-center">
                  <span className="tw-mr-2">📍</span> Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={newEvent.location}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-3 tw-py-2 tw-rounded-xl tw-border tw-border-pastel-yellow tw-bg-light tw-shadow-input focus:tw-ring-2 focus:tw-ring-secondary focus:tw-outline-none tw-transition-all tw-duration-300"
                  placeholder="Office Meeting Room 4"
                />
              </div>
              <div>
                <label className="tw-block tw-mb-1 tw-font-medium tw-flex tw-items-center">
                  <span className="tw-mr-2">📄</span> Description
                </label>
                <textarea
                  name="description"
                  value={newEvent.description}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-3 tw-py-2 tw-rounded-xl tw-border tw-border-pastel-purple tw-bg-light tw-shadow-input focus:tw-ring-2 focus:tw-ring-secondary focus:tw-outline-none tw-transition-all tw-duration-300"
                  rows="3"
                  placeholder="Enter any details about this event..."
                ></textarea>
              </div>
              <div>
                <label className="tw-block tw-mb-1 tw-font-medium tw-flex tw-items-center">
                  <span className="tw-mr-2">👥</span> Attendees
                </label>
                <input
                  type="text"
                  name="attendees"
                  value={newEvent.attendees}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-3 tw-py-2 tw-rounded-xl tw-border tw-border-pastel-pink tw-bg-light tw-shadow-input focus:tw-ring-2 focus:tw-ring-secondary focus:tw-outline-none tw-transition-all tw-duration-300"
                  placeholder="person@example.com, another@example.com"
                />
                <div className="tw-text-xs tw-text-gray-500 tw-mt-1">Separate multiple emails with commas</div>
              </div>
              <div className="tw-flex tw-justify-end tw-space-x-3 tw-pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="tw-bg-light tw-text-dark tw-font-medium tw-px-4 tw-py-2 tw-rounded-xl tw-border tw-border-gray-300 tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-1px] tw-transition-all tw-duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tw-bg-primary tw-text-white tw-font-medium tw-px-6 tw-py-2 tw-rounded-xl tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-1px] tw-transition-all tw-duration-300"
                >
                  <div className="tw-flex tw-items-center">
                    <span className="tw-mr-1">✅</span> Save Event
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
