import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper to filter promotions with a valid, unexpired date ("mm/dd/yyyy" format).
const filterValidPromotions = (promotions) => {
  const currentDate = new Date();
  return promotions.filter((item) => {
    const expiration = item.content?.expiration;
    if (!expiration) return false;
    const parts = expiration.split('/');
    if (parts.length !== 3) return false;
    const [month, day, year] = parts;
    const expDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return expDate >= currentDate;
  });
};

/*
  SectionWrapper:
  - Measures the "natural" height of its children (header + content).
  - If collapse=true, it animates height, opacity, and margin-bottom to zero.
  - If collapse=false, it sets these properties to the measured size so the section
    takes up exactly as much space as it needs.
*/
const SectionWrapper = ({ collapse, children }) => {
  const wrapperRef = useRef(null);
  const [height, setHeight] = useState(0);

  // Measure the content immediately after DOM changes.
  useLayoutEffect(() => {
    if (wrapperRef.current) {
      if (!collapse) {
        const fullHeight = wrapperRef.current.scrollHeight;
        setHeight(fullHeight);
      } else {
        setHeight(0);
      }
    }
  }, [collapse, children]);

  const style = {
    height: `${height}px`,
    opacity: collapse ? 0 : 1,
    marginBottom: collapse ? '0px' : '1.5rem',
    overflow: 'hidden',
    transition: 'height 0.5s ease, opacity 0.5s ease, margin-bottom 0.5s ease',
  };

  return (
    <div style={style}>
      <div ref={wrapperRef}>
        {children}
      </div>
    </div>
  );
};

/*
  EmailTypeSection:
  - Always renders the section header (title + item count).
  - If isActive=true, renders the "Back"/"Read All" buttons + email list.
  - Clicking the header toggles whether this section is active.
*/
const EmailTypeSection = ({
  id,
  title,
  items,
  type,
  isActive,
  onToggle,
  primaryRender,
  secondaryRender,
  handleReadAll,
  renderList,
}) => {
  // Get emoji based on section type
  const getEmoji = () => {
    switch (id) {
      case 'drafts': return '✏️';
      case 'infoItems': return '📚';
      case 'promotions': return '🎟️';
      case 'actionRequired': return '⚡';
      case 'receipts': return '🧾';
      case 'meetingUpdates': return '📅';
      case 'others': return '📁';
      default: return '📄';
    }
  };
  
  // Get background color class based on section type
  const getBgColor = () => {
    switch (id) {
      case 'drafts': return 'tw-bg-pastel-blue tw-bg-opacity-30';
      case 'infoItems': return 'tw-bg-pastel-green tw-bg-opacity-30';
      case 'promotions': return 'tw-bg-pastel-yellow tw-bg-opacity-30';
      case 'actionRequired': return 'tw-bg-pastel-pink tw-bg-opacity-30';
      case 'receipts': return 'tw-bg-pastel-purple tw-bg-opacity-30';
      case 'meetingUpdates': return 'tw-bg-pastel-blue tw-bg-opacity-30';
      case 'others': return 'tw-bg-pastel-green tw-bg-opacity-30';
      default: return 'tw-bg-pastel-blue tw-bg-opacity-30';
    }
  };
  
  return (
    <section id={id} className={`tw-bg-white tw-rounded-2xl tw-shadow-soft tw-overflow-hidden tw-mb-4`}>
      {/* Header */}
      <div 
        onClick={onToggle}
        className={`tw-p-4 tw-flex tw-items-center tw-cursor-pointer ${getBgColor()}`}
      >
        <div className="tw-w-10 tw-h-10 tw-rounded-full tw-bg-white tw-flex tw-items-center tw-justify-center tw-shadow-button tw-mr-3">
          <span className="tw-text-xl">{getEmoji()}</span>
        </div>
        <div>
          <h3 className="tw-text-xl tw-font-semibold tw-text-dark">{title}</h3>
          <p className="tw-text-sm tw-text-gray-600">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      {/* Body (only when active) */}
      {isActive && (
        <div className="tw-p-4">
          <div className="tw-flex tw-space-x-4 tw-mb-6 tw-pt-2">
            <button
              className="tw-flex tw-items-center tw-bg-white tw-border tw-border-secondary tw-text-secondary tw-px-4 tw-py-2 tw-rounded-lg tw-shadow-button hover:tw-bg-secondary hover:tw-text-white tw-transition-all tw-duration-300"
              onClick={(e) => { 
                e.stopPropagation(); 
                onToggle();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <button
              className="tw-flex tw-items-center tw-bg-white tw-border tw-border-primary tw-text-primary tw-px-4 tw-py-2 tw-rounded-lg tw-shadow-button hover:tw-bg-primary hover:tw-text-white tw-transition-all tw-duration-300"
              onClick={(e) => { 
                e.stopPropagation();
                handleReadAll(type);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
              Mark All Read
            </button>
          </div>
          <div className="tw-max-h-[500px] tw-overflow-y-auto tw-pr-1">
            {renderList(items, type, primaryRender, secondaryRender)}
          </div>
        </div>
      )}
    </section>
  );
};

// Helper to render sender details (simply returns the sender's name).
const renderSender = (item) => {
  return item.sender?.name || 'None';
};

const BotSummary = () => {
  const [drafts, setDrafts] = useState([]);
  const [infoItems, setInfoItems] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [actionRequired, setActionRequired] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [meetingUpdates, setMeetingUpdates] = useState([]);
  const [others, setOthers] = useState([]);

  // activeCategory = null => all sections show only the header.
  // Otherwise, the active section is expanded.
  const [activeCategory, setActiveCategory] = useState(null);
  const navigate = useNavigate();

  // Load data on mount.
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('users')
        .select(
          'drafts, information, promotions, action_required, receipts, meeting_updates, others'
        )
        .eq('email', user.email)
        .single();
      if (error) {
        console.error('Error fetching user data:', error);
      } else {
        setDrafts(data?.drafts || []);
        setInfoItems(data?.information || []);
        setPromotions(filterValidPromotions(data?.promotions || []));
        setActionRequired(data?.action_required || []);
        setReceipts(data?.receipts || []);
        setMeetingUpdates(data?.meeting_updates || []);
        setOthers(data?.others || []);
      }
    }
  };

  // Quick remove handler.
  const handleQuickRemove = async (type, item) => {
    try {
      const payload = { type, emailId: item.emailId };
      if (type === "draft") {
        payload.gmailDraftId = item.gmailDraftId;
      }
      const response = await fetch(`${API_BASE_URL}/api/emails/quick_remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to remove item");

      // Update local state.
      if (type === "draft") setDrafts(prev => prev.filter(d => d.emailId !== item.emailId));
      else if (type === "info") setInfoItems(prev => prev.filter(i => i.emailId !== item.emailId));
      else if (type === "promotion") setPromotions(prev => prev.filter(p => p.emailId !== item.emailId));
      else if (type === "action_required") setActionRequired(prev => prev.filter(a => a.emailId !== item.emailId));
      else if (type === "receipts") setReceipts(prev => prev.filter(r => r.emailId !== item.emailId));
      else if (type === "meeting_updates") setMeetingUpdates(prev => prev.filter(m => m.emailId !== item.emailId));
      else if (type === "other") setOthers(prev => prev.filter(o => o.emailId !== item.emailId));
    } catch (error) {
      console.error("Error in quick remove:", error);
    }
  };

  // Mark all as read in a category.
  const handleReadAll = async (type) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/emails/read_all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type }),
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
      // Clear local state.
      if (type === "draft") setDrafts([]);
      else if (type === "info") setInfoItems([]);
      else if (type === "promotion") setPromotions([]);
      else if (type === "action_required") setActionRequired([]);
      else if (type === "receipts") setReceipts([]);
      else if (type === "meeting_updates") setMeetingUpdates([]);
      else if (type === "other") setOthers([]);
    } catch (error) {
      console.error("Error in handleReadAll:", error);
    }
  };

  // Render a list of emails.
  const renderList = (items, type, primaryRender, secondaryRender) => (
    <ul className="tw-space-y-3">
      {items.length === 0 ? (
        <li className="tw-text-center tw-py-6 tw-text-gray-500">
          <div className="tw-text-3xl tw-mb-2">🎉</div>
          <p>No items in this category!</p>
        </li>
      ) : (
        items.map((item, index) => (
          <li
            key={index}
            className="tw-bg-white tw-rounded-xl tw-shadow-soft tw-p-4 tw-cursor-pointer hover:tw-shadow-hover tw-transition-all tw-duration-300 tw-border tw-border-gray-100"
            onClick={() => navigate(`/email/${item.emailId}`)}
          >
            <div className="tw-flex tw-justify-between tw-items-start tw-gap-3">
              <div className="tw-flex tw-flex-col tw-flex-grow">
                <span className="tw-font-semibold tw-text-dark tw-break-words">{primaryRender(item)}</span>
                <div className="tw-text-gray-600 tw-text-sm tw-mt-1 tw-break-words">{secondaryRender(item)}</div>
              </div>
              
              <button
                className="tw-flex tw-items-center tw-bg-white tw-border tw-border-primary tw-text-primary tw-px-3 tw-py-1.5 tw-rounded-lg hover:tw-bg-primary hover:tw-text-white tw-transition-all tw-duration-300 tw-shadow-button tw-flex-shrink-0 tw-whitespace-nowrap tw-text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickRemove(type, item);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            </div>
          </li>
        ))
      )}
    </ul>
  );

  // Pie chart data.
  const chartData = [
    { name: 'Drafts', value: drafts.length },
    { name: 'Info', value: infoItems.length },
    { name: 'Promotions', value: promotions.length },
    { name: 'Action Required', value: actionRequired.length },
    { name: 'Receipts', value: receipts.length },
    { name: 'Meeting Updates', value: meetingUpdates.length },
    { name: 'Other', value: others.length },
  ];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AA336A', '#33AAFF', '#66CC66'];

  // Scroll to a section if the user clicks a pie slice.
  const handlePieClick = (data) => {
    if (data && data.payload) {
      const name = data.payload.name;
      const categoryIdMap = {
        'Drafts': 'drafts',
        'Info': 'infoItems',
        'Promotions': 'promotions',
        'Action Required': 'actionRequired',
        'Receipts': 'receipts',
        'Meeting Updates': 'meetingUpdates',
        'Other': 'others',
      };
      const sectionId = categoryIdMap[name];
      if (sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  // Array of all sections.
  const sections = [
    {
      id: "drafts",
      title: "Drafts",
      items: drafts,
      type: "draft",
      primaryRender: (item) => {
        const subject = item.draft?.replySubject;
        const sender = renderSender(item);
        return subject ? `Draft: ${subject} - ${sender}` : sender;
      },
      secondaryRender: (item) =>
        item.draft?.draftContent || "No draft content provided",
    },
    {
      id: "infoItems",
      title: "Info Items",
      items: infoItems,
      type: "info",
      primaryRender: (item) => renderSender(item),
      secondaryRender: (item) =>
        item.content?.summary || "No summary available",
    },
    {
      id: "promotions",
      title: "Promotions",
      items: promotions,
      type: "promotion",
      primaryRender: (item) => 
        `${item.content?.title || 'Promotion'}${item.sender?.name ? ' - ' + item.sender.name : ''}`,
      secondaryRender: (item) => (
        <>
          <strong>{item.content?.title || "No title"}</strong> — {item.content?.details || "No details"} — <em>{item.content?.expiration || "No expiration"}</em>
        </>
      ),
    },
    {
      id: "actionRequired",
      title: "Action Required",
      items: actionRequired,
      type: "action_required",
      primaryRender: (item) => 
        `${item.content?.actionPoints || 'Action Required'}${item.sender?.name ? ' - ' + item.sender.name : ''}`,
      secondaryRender: (item) => (
        <>
          <strong>Action Points:</strong> {item.content?.actionPoints || "None"} — <em>{item.content?.summary || "No summary"}</em>
        </>
      ),
    },
    {
      id: "receipts",
      title: "Receipts",
      items: receipts,
      type: "receipts",
      primaryRender: (item) => 
        `${item.content?.orderNumber ? 'Order ' + item.content.orderNumber : 'Receipt'}${item.sender?.name ? ' - ' + item.sender.name : ''}`,
      secondaryRender: (item) => (
        <>
          <strong>Order Number:</strong> {item.content?.orderNumber || "None"} — <strong>Total Amount:</strong> {item.content?.totalAmount || "None"} — <em>{item.content?.summary || "No summary"}</em>
        </>
      ),
    },
    {
      id: "meetingUpdates",
      title: "Meeting Updates",
      items: meetingUpdates,
      type: "meeting_updates",
      primaryRender: (item) => 
        `${item.content?.meetingSubject || 'Meeting Update'}${item.sender?.name ? ' - ' + item.sender.name : ''}`,
      secondaryRender: (item) => (
        <>
          <strong>{item.content?.meetingSubject || "No subject"}</strong> — {item.content?.summary || "No summary"}
        </>
      ),
    },
    {
      id: "others",
      title: "Other",
      items: others,
      type: "other",
      primaryRender: (item) => 
        `${item.content?.summary || 'Other'}${item.sender?.name ? ' - ' + item.sender.name : ''}`,
      secondaryRender: (item) =>
        item.content?.summary || "No summary available",
    },
  ];

  // Determine if a section is collapsed.
  const isCollapsed = (sectionId) => {
    if (activeCategory === null) {
      return false;
    }
    return sectionId !== activeCategory;
  };

  // Determine if a section is active.
  const isActive = (sectionId) => activeCategory === sectionId;

  return (
    <div className="tw-min-h-full tw-text-dark">
      <div className="tw-flex tw-items-center tw-mb-6">
        <div className="tw-h-12 tw-w-12 tw-bg-pastel-purple tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mr-4">
          <span className="tw-text-2xl">📊</span>
        </div>
        <h1 className="tw-text-3xl tw-font-bold tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent">Email Summary</h1>
      </div>
      
      <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-8">
        {/* Overall Summary Section */}
        <div className="tw-bg-white tw-rounded-2xl tw-p-6 tw-shadow-soft">
          <h2 className="tw-text-xl tw-font-semibold tw-mb-4 tw-flex tw-items-center">
            <span className="tw-mr-2">📈</span>
            Overview
          </h2>
          <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-mb-6">
            <p className="tw-flex tw-items-center">
              <span className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-pastel-blue tw-rounded-full tw-mr-2">
                ✏️
              </span>
              Drafts: <span className="tw-ml-2 tw-font-semibold tw-text-primary">{drafts.length}</span>
            </p>
            <p className="tw-flex tw-items-center">
              <span className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-pastel-green tw-rounded-full tw-mr-2">
                📚
              </span>
              Info Items: <span className="tw-ml-2 tw-font-semibold tw-text-secondary">{infoItems.length}</span>
            </p>
            <p className="tw-flex tw-items-center">
              <span className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-pastel-yellow tw-rounded-full tw-mr-2">
                🎟️
              </span>
              Promotions: <span className="tw-ml-2 tw-font-semibold tw-text-accent">{promotions.length}</span>
            </p>
            <p className="tw-flex tw-items-center">
              <span className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-pastel-pink tw-rounded-full tw-mr-2">
                ⚡
              </span>
              Action Required: <span className="tw-ml-2 tw-font-semibold tw-text-primary">{actionRequired.length}</span>
            </p>
            <p className="tw-flex tw-items-center">
              <span className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-pastel-purple tw-rounded-full tw-mr-2">
                🧾
              </span>
              Receipts: <span className="tw-ml-2 tw-font-semibold tw-text-secondary">{receipts.length}</span>
            </p>
            <p className="tw-flex tw-items-center">
              <span className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-pastel-blue tw-rounded-full tw-mr-2">
                📅
              </span>
              Meeting Updates: <span className="tw-ml-2 tw-font-semibold tw-text-accent">{meetingUpdates.length}</span>
            </p>
            <p className="tw-flex tw-items-center">
              <span className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-bg-pastel-green tw-rounded-full tw-mr-2">
                📁
              </span>
              Other: <span className="tw-ml-2 tw-font-semibold tw-text-primary">{others.length}</span>
            </p>
          </div>
          <div className="tw-p-4 tw-bg-pastel-blue tw-bg-opacity-20 tw-rounded-xl">
            <PieChart width={400} height={300}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
                onClick={handlePieClick}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#FF6B6B' : 
                          index === 1 ? '#4ECDC4' : 
                          index === 2 ? '#FFD166' : 
                          index === 3 ? '#FC76A1' : 
                          index === 4 ? '#A685E2' : 
                          index === 5 ? '#6CACE4' : 
                          '#95D44A'}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
            <p className="tw-text-center tw-text-sm tw-text-gray-600">Click on a section to jump to details</p>
          </div>
        </div>

        {/* Detailed Email Sections */}
        <div className="tw-flex tw-flex-col">
          {sections.map((section) => (
            <SectionWrapper
              key={section.id}
              collapse={isCollapsed(section.id)}
            >
              <EmailTypeSection
                id={section.id}
                title={section.title}
                items={section.items}
                type={section.type}
                isActive={isActive(section.id)}
                onToggle={() =>
                  setActiveCategory(isActive(section.id) ? null : section.id)
                }
                primaryRender={section.primaryRender}
                secondaryRender={section.secondaryRender}
                handleReadAll={handleReadAll}
                renderList={renderList}
              />
            </SectionWrapper>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BotSummary;
