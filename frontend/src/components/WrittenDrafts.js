// src/components/WrittenDrafts.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function WrittenDrafts() {
  const [tab, setTab] = useState(0);
  const [drafts, setDrafts] = useState([]);
  const [infoItems, setInfoItems] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [actionRequired, setActionRequired] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [meetingUpdates, setMeetingUpdates] = useState([]);
  const [others, setOthers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let { data, error } = await supabase
        .from('users')
        .select('drafts, information, promotions, action_required, receipts, meeting_updates, others')
        .eq('email', user.email)
        .single();
      if (error) {
        console.error('Error fetching user data:', error);
      } else {
        setDrafts(data?.drafts || []);
        setInfoItems(data?.information || []);
        setPromotions(data?.promotions || []);
        setActionRequired(data?.action_required || []);
        setReceipts(data?.receipts || []);
        setMeetingUpdates(data?.meeting_updates || []);
        setOthers(data?.others || []);
      }
    }
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
  };

  const handleItemClick = (item) => {
    navigate(`/email/${item.emailId}`);
  };

  const handleReadEmails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/emails/process_latest`, { withCredentials: true });
      console.log('Processed emails:', response.data);
      fetchUserData();
    } catch (error) {
      console.error('Error processing emails:', error);
    }
  };

  const handleQuickRemove = async (type, item) => {
    try {
      const payload = { type, emailId: item.emailId };
      if (type === "draft") {
        payload.gmailDraftId = item.gmailDraftId;
      }
      const response = await axios.post(`${API_BASE_URL}/api/emails/quick_remove`, payload, { withCredentials: true });
      if (response.status !== 200) {
        throw new Error("Failed to remove item");
      }
      // Update UI based on removal type
      if (type === "draft") {
        setDrafts(prev => prev.filter(d => d.emailId !== item.emailId));
      } else if (type === "info") {
        setInfoItems(prev => prev.filter(i => i.emailId !== item.emailId));
      } else if (type === "promotion") {
        setPromotions(prev => prev.filter(p => p.emailId !== item.emailId));
      } else if (type === "action_required") {
        setActionRequired(prev => prev.filter(a => a.emailId !== item.emailId));
      } else if (type === "receipts") {
        setReceipts(prev => prev.filter(r => r.emailId !== item.emailId));
      } else if (type === "meeting_updates") {
        setMeetingUpdates(prev => prev.filter(m => m.emailId !== item.emailId));
      } else if (type === "other") {
        setOthers(prev => prev.filter(o => o.emailId !== item.emailId));
      }
    } catch (error) {
      console.error("Error in quick remove:", error);
    }
  };

  const renderTabContent = () => {
    switch(tab) {
      case 0:
        return (
          <ul className="tw-divide-y tw-divide-gray-300">
            {drafts.map((draft, index) => (
              <li
                key={index}
                onClick={() => navigate(`/email/${draft.emailId || draft.threadId}`)}
                className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-cursor-pointer hover:tw-bg-gray-100"
              >
                <div>
                  <p className="tw-text-sm tw-font-medium">
                    Draft: {draft.content?.replySubject || draft.emailId}
                  </p>
                  <p className="tw-text-xs tw-text-gray-600">
                    {draft.content?.draftContent || ""}
                  </p>
                </div>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleQuickRemove("draft", draft); 
                  }}
                  className="tw-border tw-border-secondary tw-text-secondary tw-px-2 tw-py-1 tw-rounded"
                >
                  Quick Remove
                </button>
              </li>
            ))}
          </ul>
        );
      case 1:
        return (
          <ul className="tw-divide-y tw-divide-gray-300">
            {infoItems.map((item, index) => (
              <li 
                key={index}
                onClick={() => handleItemClick(item)}
                className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-cursor-pointer hover:tw-bg-gray-100"
              >
                <div>
                  <p className="tw-text-sm tw-font-medium">
                    Email ID: {item.emailId}
                  </p>
                  <p className="tw-text-xs tw-text-gray-600">
                    {item.content?.summary || ""}
                  </p>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleQuickRemove("info", item); 
                  }}
                  className="tw-border tw-border-secondary tw-text-secondary tw-px-2 tw-py-1 tw-rounded"
                >
                  Quick Remove
                </button>
              </li>
            ))}
          </ul>
        );
      case 2:
        return (
          <ul className="tw-divide-y tw-divide-gray-300">
            {promotions.map((item, index) => (
              <li
                key={index}
                onClick={() => handleItemClick(item)}
                className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-cursor-pointer hover:tw-bg-gray-100"
              >
                <div>
                  <p className="tw-text-sm tw-font-medium">
                    Email ID: {item.emailId}
                  </p>
                  <p className="tw-text-xs tw-text-gray-600">
                    <strong>{item.content?.title || ""}</strong>
                    <br />
                    {item.content?.details || ""}<br />
                    <em>{item.content?.expiration || ""}</em>
                  </p>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleQuickRemove("promotion", item); 
                  }}
                  className="tw-border tw-border-secondary tw-text-secondary tw-px-2 tw-py-1 tw-rounded"
                >
                  Quick Remove
                </button>
              </li>
            ))}
          </ul>
        );
      case 3:
        return (
          <ul className="tw-divide-y tw-divide-gray-300">
            {actionRequired.map((item, index) => (
              <li 
                key={index}
                onClick={() => handleItemClick(item)}
                className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-cursor-pointer hover:tw-bg-gray-100"
              >
                <div>
                  <p className="tw-text-sm tw-font-medium">
                    Email ID: {item.emailId}
                  </p>
                  <p className="tw-text-xs tw-text-gray-600">
                    <strong>Action Points:</strong> {item.content?.actionPoints || ""}<br />
                    <em>{item.content?.summary || ""}</em>
                  </p>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleQuickRemove("action_required", item); 
                  }}
                  className="tw-border tw-border-secondary tw-text-secondary tw-px-2 tw-py-1 tw-rounded"
                >
                  Quick Remove
                </button>
              </li>
            ))}
          </ul>
        );
      case 4:
        return (
          <ul className="tw-divide-y tw-divide-gray-300">
            {receipts.map((item, index) => (
              <li 
                key={index}
                onClick={() => handleItemClick(item)}
                className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-cursor-pointer hover:tw-bg-gray-100"
              >
                <div>
                  <p className="tw-text-sm tw-font-medium">
                    Email ID: {item.emailId}
                  </p>
                  <p className="tw-text-xs tw-text-gray-600">
                    <strong>Order Number:</strong> {item.content?.orderNumber || ""}<br />
                    <strong>Total Amount:</strong> {item.content?.totalAmount || ""}<br />
                    <em>{item.content?.summary || ""}</em>
                  </p>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleQuickRemove("receipts", item); 
                  }}
                  className="tw-border tw-border-secondary tw-text-secondary tw-px-2 tw-py-1 tw-rounded"
                >
                  Quick Remove
                </button>
              </li>
            ))}
          </ul>
        );
      case 5:
        return (
          <ul className="tw-divide-y tw-divide-gray-300">
            {meetingUpdates.map((item, index) => (
              <li 
                key={index}
                onClick={() => handleItemClick(item)}
                className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-cursor-pointer hover:tw-bg-gray-100"
              >
                <div>
                  <p className="tw-text-sm tw-font-medium">
                    Email ID: {item.emailId}
                  </p>
                  <p className="tw-text-xs tw-text-gray-600">
                    <strong>{item.content?.meetingSubject || ""}</strong><br />
                    {item.content?.summary || ""}
                  </p>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleQuickRemove("meeting_updates", item); 
                  }}
                  className="tw-border tw-border-secondary tw-text-secondary tw-px-2 tw-py-1 tw-rounded"
                >
                  Quick Remove
                </button>
              </li>
            ))}
          </ul>
        );
      case 6:
        return (
          <ul className="tw-divide-y tw-divide-gray-300">
            {others.map((item, index) => (
              <li 
                key={index}
                onClick={() => handleItemClick(item)}
                className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-cursor-pointer hover:tw-bg-gray-100"
              >
                <div>
                  <p className="tw-text-sm tw-font-medium">
                    Email ID: {item.emailId}
                  </p>
                  <p className="tw-text-xs tw-text-gray-600">
                    {item.content?.summary || ""}
                  </p>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleQuickRemove("other", item); 
                  }}
                  className="tw-border tw-border-secondary tw-text-secondary tw-px-2 tw-py-1 tw-rounded"
                >
                  Quick Remove
                </button>
              </li>
            ))}
          </ul>
        );
      default:
        return null;
    }
  };

  return (
    <div className="tw-p-5">
      <h2 className="tw-text-2xl tw-font-bold">Written Drafts</h2>
      <button
        onClick={handleReadEmails}
        className="tw-bg-primary tw-text-white tw-px-4 tw-py-2 tw-rounded tw-mt-2"
      >
        Read Emails
      </button>
      {/* Tabs */}
      <div className="tw-mt-4 tw-border-b tw-border-gray-300">
        <button
          onClick={() => handleTabChange(0)}
          className={`tw-py-2 tw-px-4 focus:tw-outline-none ${
            tab === 0 ? "tw-border-b-2 tw-border-primary tw-text-primary" : "tw-text-gray-500"
          }`}
        >
          Drafts
        </button>
        <button
          onClick={() => handleTabChange(1)}
          className={`tw-py-2 tw-px-4 focus:tw-outline-none ${
            tab === 1 ? "tw-border-b-2 tw-border-primary tw-text-primary" : "tw-text-gray-500"
          }`}
        >
          Info
        </button>
        <button
          onClick={() => handleTabChange(2)}
          className={`tw-py-2 tw-px-4 focus:tw-outline-none ${
            tab === 2 ? "tw-border-b-2 tw-border-primary tw-text-primary" : "tw-text-gray-500"
          }`}
        >
          Promotions
        </button>
        <button
          onClick={() => handleTabChange(3)}
          className={`tw-py-2 tw-px-4 focus:tw-outline-none ${
            tab === 3 ? "tw-border-b-2 tw-border-primary tw-text-primary" : "tw-text-gray-500"
          }`}
        >
          Action Required
        </button>
        <button
          onClick={() => handleTabChange(4)}
          className={`tw-py-2 tw-px-4 focus:tw-outline-none ${
            tab === 4 ? "tw-border-b-2 tw-border-primary tw-text-primary" : "tw-text-gray-500"
          }`}
        >
          Receipts
        </button>
        <button
          onClick={() => handleTabChange(5)}
          className={`tw-py-2 tw-px-4 focus:tw-outline-none ${
            tab === 5 ? "tw-border-b-2 tw-border-primary tw-text-primary" : "tw-text-gray-500"
          }`}
        >
          Meeting Updates
        </button>
        <button
          onClick={() => handleTabChange(6)}
          className={`tw-py-2 tw-px-4 focus:tw-outline-none ${
            tab === 6 ? "tw-border-b-2 tw-border-primary tw-text-primary" : "tw-text-gray-500"
          }`}
        >
          Other
        </button>
      </div>
      <div className="tw-mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default WrittenDrafts;
