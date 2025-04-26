// src/components/EmailList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function EmailList({ emailCache, setEmailCache }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageToken, setPageToken] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [currentTab, setCurrentTab] = useState('INBOX');
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [isWatching, setIsWatching] = useState(false);
  const navigate = useNavigate();

  // Transform the raw email object from the API into a UI-friendly format.
  const transformEmail = (email) => {
    const headers = email.payload?.headers || [];
    const getHeader = (name) => {
      const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    // Extract organization name from the "From" header.
    const rawFrom = getHeader('From');
    let organization;
    if (rawFrom) {
      const match = rawFrom.match(/^(.*)<.*>$/);
      if (match) {
        organization = match[1].trim();
      } else {
        organization = rawFrom.split('@')[0];
      }
    } else {
      organization = 'Unknown Organization';
    }

    // Extract subject and content.
    const subject = getHeader('Subject') || '';
    const content = email.snippet || '';

    // Determine the email date.
    const headerDate = getHeader('Date');
    let dateObj = null;
    if (headerDate && !isNaN(new Date(headerDate).getTime())) {
      dateObj = new Date(headerDate);
    } else if (email.internalDate && !isNaN(Number(email.internalDate))) {
      dateObj = new Date(Number(email.internalDate));
    }

    return {
      id: email.id,
      organization,
      subject,
      content,
      date: dateObj, // Date object or null.
      starred: false,
    };
  };

  const fetchEmails = (token = null, label = currentTab) => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/api/emails/get_emails`, {
        params: {
          maxResults: 20,
          pageToken: token,
          label: label,
        },
        withCredentials: true,
      })
      .then((response) => {
        const data = response.data;
        const transformedEmails = data.emails.map(transformEmail);
        setEmails(transformedEmails);
        setNextPageToken(data.nextPageToken);
        setPageToken(token);
        // Cache the transformed emails.
        setEmailCache((prevCache) => ({
          ...prevCache,
          [currentTab]: {
            emails: transformedEmails,
            nextPageToken: data.nextPageToken,
            pageToken: token,
          },
        }));
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching emails:', error);
        setLoading(false);
      });
  };

  useEffect(() => {
    console.log("Current Tab:", currentTab);
    console.log("Cache for current tab:", emailCache[currentTab]);
    if (emailCache[currentTab] && emailCache[currentTab].emails && emailCache[currentTab].emails.length > 0) {
      setEmails(emailCache[currentTab].emails);
      setNextPageToken(emailCache[currentTab].nextPageToken);
      setPageToken(emailCache[currentTab].pageToken);
      console.log("Emails not fetched");
    } else {
      fetchEmails();
      console.log("Emails get fetched");
    }
  }, [currentTab, emailCache]);

  const handleNextPage = () => {
    if (nextPageToken) {
      fetchEmails(nextPageToken);
    }
  };

  const handlePrevPage = () => {
    console.warn('Previous page functionality is not implemented.');
  };

  const handleEmailClick = (emailId) => {
    navigate(`/email/${emailId}`);
  };

  const toggleSelection = (id) => {
    if (selectedEmails.includes(id)) {
      setSelectedEmails(selectedEmails.filter((eid) => eid !== id));
    } else {
      setSelectedEmails([...selectedEmails, id]);
    }
  };

  const toggleStarred = (id) => {
    setEmails(
      emails.map((email) => {
        if (email.id === id) {
          return { ...email, starred: !email.starred };
        }
        return email;
      })
    );
  };

  const reduceEmailContent = (content, maxLength) => {
    if (!content) return '';
    return content.length <= maxLength ? content : content.slice(0, maxLength) + '...';
  };

  // Handler to toggle watch/unwatch functionality
  const handleToggleWatch = () => {
    if (!isWatching) {
      axios
        .post(`${API_BASE_URL}/api/emails/watch`, {}, { withCredentials: true })
        .then((response) => {
          console.log('Started watching:', response.data);
          setIsWatching(true);
        })
        .catch((error) => {
          console.error('Error starting watch:', error);
        });
    } else {
      axios
        .post(`${API_BASE_URL}/api/emails/stop_watch`, {}, { withCredentials: true })
        .then((response) => {
          console.log('Stopped watching:', response.data);
          setIsWatching(false);
        })
        .catch((error) => {
          console.error('Error stopping watch:', error);
        });
    }
  };

  return (
    <div className="tw-p-5">
      {/* Header */}
      <div className="tw-flex tw-items-center tw-justify-between">
        <h1 className="tw-text-2xl tw-font-bold">
          {currentTab === 'INBOX' ? 'Inbox' : 'Sent'}
        </h1>
        <button
          onClick={handleToggleWatch}
          className="tw-bg-secondary tw-text-white tw-px-4 tw-py-2 tw-rounded"
        >
          {isWatching ? 'Unwatch' : 'Watch'}
        </button>
      </div>

      {/* Email List */}
      <ul className="tw-mt-4">
        {emails.map((email) => (
          <li
            key={email.id}
            onClick={() => handleEmailClick(email.id)}
            // TODO: Adding tw-text-black to ensure the text is visible on the white/light background.
            className="tw-p-[10px] tw-bg-[#f2f6fc] tw-flex tw-items-center tw-cursor-pointer tw-mb-[5px] tw-text-black hover:tw-bg-[#e8edf3]"
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selectedEmails.includes(email.id)}
              onClick={(e) => {
                e.stopPropagation();
                toggleSelection(email.id);
              }}
              className="tw-mr-2 tw-cursor-pointer"
            />
            {/* Star Icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleStarred(email.id);
              }}
              className="tw-mr-2"
            >
              {email.starred ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="tw-w-5 tw-h-5" fill="#FFF200" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="tw-w-5 tw-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.11 6.48a1 1 0 00.95.69h6.813c.969 0 1.371 1.24.588 1.81l-5.517 4.015a1 1 0 00-.364 1.118l2.11 6.48c.3.921-.755 1.688-1.54 1.118L12 18.347l-5.517 4.015c-.785.57-1.84-.197-1.54-1.118l2.11-6.48a1 1 0 00-.364-1.118L2.672 11.907c-.783-.57-.38-1.81.588-1.81h6.813a1 1 0 00.95-.69l2.11-6.48z" />
                </svg>
              )}
            </button>
            {/* Email Content */}
            <div className="tw-flex tw-flex-col tw-flex-1 tw-overflow-hidden">
              <p className="tw-text-[14px] tw-font-medium tw-whitespace-nowrap tw-overflow-hidden tw-truncate">
                {email.organization}
              </p>
              <p className="tw-text-[13px] tw-whitespace-nowrap tw-overflow-hidden tw-truncate">
                {email.subject}
              </p>
              <p className="tw-text-[12px] tw-text-[#555] tw-whitespace-nowrap tw-overflow-hidden tw-truncate">
                {reduceEmailContent(email.content, 30)}
              </p>
            </div>
            {/* Email Date */}
            <span className="tw-text-[12px] tw-text-[#5F6368] tw-ml-[10px]">
              {email.date
                ? `${email.date.getDate()} ${email.date.toLocaleString('default', { month: 'long' })}`
                : 'Invalid date'}
            </span>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      <div className="tw-mt-5">
        <button
          onClick={handlePrevPage}
          disabled={loading}
          className="tw-bg-primary tw-text-white tw-px-4 tw-py-2 tw-rounded disabled:tw-opacity-50"
        >
          Previous Page
        </button>
        <button
          onClick={handleNextPage}
          disabled={loading || !nextPageToken}
          className="tw-bg-primary tw-text-white tw-px-4 tw-py-2 tw-rounded tw-ml-2 disabled:tw-opacity-50"
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

export default EmailList;
