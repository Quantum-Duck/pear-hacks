// src/components/EmailDetail.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { emptyProfilePic } from '../assets/Assets';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function EmailDetail() {
  const { emailId } = useParams();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replyVisible, setReplyVisible] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/api/emails/${emailId}`, { withCredentials: true })
      .then((response) => {
        setThread(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching email thread:', error);
        setLoading(false);
      });
  }, [emailId]);

  // Decode a base64url encoded string.
  const decodeBase64 = (encodedStr) => {
    const base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
    try {
      return decodeURIComponent(escape(window.atob(base64)));
    } catch (e) {
      return window.atob(base64);
    }
  };

  // Recursively extract the plain text body from the payload.
  const extractBody = (payload) => {
    if (payload.body && payload.body.data) {
      return decodeBase64(payload.body.data);
    }
    if (payload.parts) {
      for (let part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return decodeBase64(part.body.data);
        }
        if (part.parts) {
          const result = extractBody(part);
          if (result) return result;
        }
      }
    }
    return '';
  };

  // Get a header’s value by name.
  const getHeader = (headers, name) => {
    const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  const handleReplyClick = () => {
    setReplyVisible(true);
  };

  const handleReplyCancel = () => {
    setReplyVisible(false);
    setReplyContent('');
  };

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    setSendingReply(true);
    const messages = thread.messages;
    const latestMessage = messages[messages.length - 1];
    const headers = latestMessage.payload.headers;
    const from = getHeader(headers, 'From');
    let subject = getHeader(headers, 'Subject');
    if (!subject.toLowerCase().startsWith('re:')) {
      subject = 'Re: ' + subject;
    }
    axios
      .post(
        `${API_BASE_URL}/api/emails/send`,
        {
          to: from,
          subject: subject,
          body: replyContent,
        },
        { withCredentials: true }
      )
      .then((response) => {
        setSendingReply(false);
        setReplyVisible(false);
        setReplyContent('');
        console.log('Reply sent successfully:', response.data);
      })
      .catch((error) => {
        console.error('Error sending reply:', error);
        setSendingReply(false);
      });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleDelete = () => {
    axios
      .delete(`${API_BASE_URL}/api/emails/${emailId}`, { withCredentials: true })
      .then((response) => {
        console.log('Email deleted:', response.data);
        navigate(-1);
      })
      .catch((error) => {
        console.error('Error deleting email:', error);
      });
  };

  // Render the message body as HTML if it appears to be HTML.
  // FIX: Make the check case-insensitive by converting to lowercase.
  const renderMessageBody = (body) => {
    const trimmedBody = body.trim();
    const lowerCaseBody = trimmedBody.toLowerCase();
    const isHTML =
      lowerCaseBody.startsWith('<!doctype') ||
      lowerCaseBody.startsWith('<html') ||
      lowerCaseBody.startsWith('<body');
    if (isHTML) {
      return (
        <div
          className="tw-mt-2 tw-text-black" // Ensuring HTML body uses black text for visibility.
          dangerouslySetInnerHTML={{ __html: body }}
        />
      );
    }
    return (
      <p className="tw-mt-2 tw-whitespace-pre-wrap tw-text-black">
        {body}
      </p>
    );
  };

  if (loading) {
    return <p className="tw-text-center tw-mt-4 tw-text-black">Loading email...</p>; // Loading text remains visible.
  }

  if (!thread) {
    return <p className="tw-text-center tw-mt-4 tw-text-black">No email thread found.</p>; // No-thread text remains visible.
  }

  // Show only the latest message by default if there are several.
  const messagesToDisplay =
    !showAllMessages && thread.messages.length > 1
      ? [thread.messages[thread.messages.length - 1]]
      : thread.messages;

  // Use the first message’s subject for the main subject header.
  const firstMessageHeaders = thread.messages[0].payload.headers;
  const mainSubject = getHeader(firstMessageHeaders, 'Subject') || 'No subject';

  return (
    <div className="tw-container tw-py-2">
      {/* Icon Header */}
      <div className="tw-flex tw-items-center tw-p-4">
        {/* Back Button */}
        <button onClick={handleBack} className="tw-text-gray-500 hover:tw-text-white">
          <svg className="tw-w-5 tw-h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        {/* Delete Button */}
        <button onClick={handleDelete} className="tw-ml-10 tw-text-gray-500 hover:tw-text-white">
          <svg className="tw-w-5 tw-h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1z" />
          </svg>
        </button>
      </div>

      {/* Subject Header */}
      <h2 className="tw-text-2xl tw-font-bold tw-flex tw-items-center tw-ml-20 tw-text-white">
        {mainSubject}
        <span className="tw-text-xs tw-bg-gray-300 tw-text-gray-800 tw-rounded tw-ml-2 tw-px-2 tw-py-0.5">
          Inbox
        </span>
      </h2>

      {/* Show previous messages button */}
      {!showAllMessages && thread.messages.length > 1 && (
        <button
          onClick={() => setShowAllMessages(true)}
          className="tw-mt-2 tw-ml-20 tw-text-blue-500 hover:tw-underline"
        >
          Show previous messages ({thread.messages.length - 1})
        </button>
      )}

      {/* Email Messages */}
      <div className="tw-ml-20 tw-mt-4">
        {messagesToDisplay.map((message, index) => {
          const headers = message.payload.headers;
          const from = getHeader(headers, 'From');
          const date = getHeader(headers, 'Date');
          const body = extractBody(message.payload);
          return (
            <div
              key={index}
              className="tw-mb-4 tw-border tw-border-gray-300 tw-rounded-lg tw-p-4 tw-bg-[#f2f6fc] tw-text-black"
            >
              <div className="tw-flex tw-items-center tw-mb-2">
                <img
                  src={emptyProfilePic}
                  alt="profile"
                  className="tw-rounded-full tw-w-10 tw-h-10 tw-mr-2 tw-bg-gray-300"
                />
                <div className="tw-flex-1">
                  <p className="tw-font-medium tw-text-black">
                    {from.split('@')[0]} <span>&lt;{from}&gt;</span>
                  </p>
                </div>
                <div className="tw-ml-auto tw-text-xs tw-text-gray-500">
                  {new Date(date).getDate()}{' '}
                  {new Date(date).toLocaleString('default', { month: 'long' })}{' '}
                  {new Date(date).getFullYear()}
                </div>
              </div>
              {renderMessageBody(body)}
            </div>
          );
        })}
      </div>

      {/* Reply UI */}
      {replyVisible ? (
        <div className="tw-mt-5 tw-ml-20 tw-p-4 tw-border tw-border-gray-300 tw-rounded-lg tw-text-black">
          <h3 className="tw-text-xl tw-font-semibold tw-mb-4">Reply</h3>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows="6"
            placeholder="Your Reply"
            className="tw-w-full tw-p-2 tw-border tw-border-gray-300 tw-rounded"
          />
          <div className="tw-flex tw-justify-end tw-mt-4">
            <button
              onClick={handleReplySubmit}
              disabled={sendingReply}
              className="tw-bg-primary tw-text-white tw-px-4 tw-py-2 tw-rounded hover:tw-opacity-90"
            >
              {sendingReply ? 'Sending...' : 'Send Reply'}
            </button>
            <button
              onClick={handleReplyCancel}
              className="tw-ml-2 tw-bg-transparent tw-text-primary tw-border tw-border-primary tw-px-4 tw-py-2 tw-rounded hover:tw-opacity-90"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="tw-ml-20 tw-mt-2">
          <button
            onClick={handleReplyClick}
            className="tw-bg-primary tw-text-white tw-px-4 tw-py-2 tw-rounded hover:tw-opacity-90"
          >
            Reply
          </button>
        </div>
      )}
    </div>
  );
}

export default EmailDetail;
