// src/components/TailwindLogin.js
import React, { useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { supabase } from '../supabaseClient';

// Import images from the src folder assets
import logo from '../assets/logo/logo.png';
import dashboard from '../assets/images/home/dashboard.png';
import coding from '../assets/images/home/coding.png';
import gitImg from '../assets/images/home/git.png';
import womenImg from '../assets/images/people/women.jpg';
import manImg from '../assets/images/people/man.jpg';
import man2Img from '../assets/images/people/man2.jpg';
import forestImg from '../assets/images/home/forest.jpg';
import mountainImg from '../assets/images/home/mountain.jpg';
import photographyImg from '../assets/images/home/photography.jpg';

const TailwindLogin = () => {
  // Toggle header logic – adds or removes an "open" class for responsive collapse.
  const toggleHeader = () => {
    console.log('Toggle header triggered');
    const headerItems = document.getElementById('collapsed-header-items');
    if (headerItems) {
      headerItems.classList.toggle('open'); // Make sure to define the .open class styling in your CSS.
    }
  };

  // Login handler using Supabase OAuth with Google
  const handleLogin = async (e) => {
    e.preventDefault();
    // Get frontend URL from environment variable or default to localhost
    const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
    
    // OAuth options with required Google scopes for Gmail and Calendar access
    const options = {
      redirectTo: FRONTEND_URL,
      queryParams: {
        access_type: 'offline', // Request a refresh token
        prompt: 'consent',      // Force prompt for consent to always obtain the refresh token
        scope:
          'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar',
      },
    };
    
    try {
      // Initiate OAuth flow with Google via Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options,
      });
      
      if (error) {
        console.error('Error during sign in:', error);
      } else {
        console.log('OAuth sign in initiated:', data);
        // The redirect will happen automatically - no need to handle it here
      }
    } catch (err) {
      console.error('Unexpected error during login:', err);
    }
  };

  useEffect(() => {
    // Register the ScrollTrigger plugin for animations
    gsap.registerPlugin(ScrollTrigger);

    // Set initial state for all elements with the .reveal-up class.
    gsap.set('.reveal-up', { opacity: 0, y: '100%' });

    // Animate the #dashboard element with a box shadow effect when scrolling.
    gsap.to('#dashboard', {
      boxShadow: '0px 15px 25px -5px rgba(170,49,233,0.44)',
      duration: 0.3,
      scrollTrigger: {
        trigger: '#hero-section',
        start: '60% 60%',
        end: '80% 80%',
      },
    });

    // Animate each section's elements with the .reveal-up class as they scroll into view.
    const sections = gsap.utils.toArray('section');
    sections.forEach((sec) => {
      gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: '10% 80%', // When the top of the section reaches 80% of viewport height.
          end: '20% 90%',
        },
      }).to(sec.querySelectorAll('.reveal-up'), {
        opacity: 1,
        y: '0%',
        duration: 0.8,
        stagger: 0.2,
      });
    });
  }, []);

  return (
    <div className="tw-flex tw-font-sans tw-min-h-[100vh] tw-flex-col tw-bg-light tw-text-dark">
      {/* HEADER */}
      <header className="lg:tw-justify-around tw-max-w-lg:tw-px-4 tw-max-w-lg:tw-mr-auto tw-absolute tw-top-0 tw-z-20 tw-flex tw-h-[70px] tw-w-full tw-bg-opacity-80 tw-bg-white tw-backdrop-blur-sm tw-px-[5%] tw-shadow-soft">
        {/* Logo */}
        <a className="tw-flex tw-items-center tw-gap-2" href="/">
          <div className="tw-h-[45px] tw-w-[45px] tw-rounded-full tw-bg-pastel-green tw-flex tw-items-center tw-justify-center">
            <img src={logo} alt="logo" className="tw-object tw-h-8 tw-w-8" />
          </div>
          <span className="tw-font-bold tw-text-xl tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent">Pearrot</span>
        </a>
        {/* Navigation links and "Get started" button inline */}
        <div id="collapsed-header-items" className="collapsible-header animated-collapse tw-flex tw-h-full tw-w-full tw-items-center tw-justify-end tw-gap-5">
          <a className="tw-font-medium tw-text-dark hover:tw-text-primary tw-transition-colors tw-duration-300" href="/">About us</a>
          <a className="tw-font-medium tw-text-dark hover:tw-text-primary tw-transition-colors tw-duration-300" href="#pricing">Pricing</a>
          <a className="tw-font-medium tw-text-dark hover:tw-text-primary tw-transition-colors tw-duration-300" href="#core-features">Features</a>
          {/* Google Sign-in button */}
          <a
            href="#"
            aria-label="Sign in with Google"
            onClick={handleLogin}
            className="tw-rounded-xl tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-px-4 tw-py-2 tw-text-white tw-font-medium tw-shadow-button hover:tw-shadow-hover tw-transition-all tw-duration-300 hover:tw-translate-y-[-2px]"
          >
            <span className="tw-flex tw-items-center">
              <span className="tw-mr-2">🚀</span>
              <span>Sign in with Google</span>
            </span>
          </a>
        </div>
        {/* Hamburger button for smaller screens */}
        <button
          className="tw-absolute tw-right-4 tw-top-5 tw-z-50 tw-text-dark tw-w-8 tw-h-8 tw-rounded-lg tw-bg-pastel-blue tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center lg:tw-hidden"
          onClick={toggleHeader}
          aria-label="menu"
          id="collapse-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-5 tw-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* HERO SECTION */}
      <section
        className="tw-relative tw-flex tw-min-h-[100vh] tw-w-full tw-max-w-[100vw] tw-flex-col tw-overflow-hidden tw-pt-[80px] max-md:tw-mt-[50px] tw-bg-gradient-to-br tw-from-white tw-to-pastel-blue tw-bg-opacity-30"
        id="hero-section"
      >
        <div className="tw-flex tw-h-full tw-min-h-[100vh] tw-w-full tw-flex-col tw-place-content-center tw-gap-8 tw-p-[5%] max-lg:tw-p-4 max-xl:tw-place-items-center">
          <div className="tw-flex tw-flex-col tw-place-content-center tw-items-center">
            <div className="reveal-up tw-text-center tw-text-6xl tw-font-bold tw-leading-[80px] max-lg:tw-text-4xl max-md:tw-leading-snug">
              <span className="tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent">Pear Hacks</span>
              <div className="tw-flex tw-items-center tw-justify-center tw-gap-3">
                <span className="tw-text-3xl">✉️</span>
                <span className="tw-bg-gradient-to-r tw-from-dark tw-to-primary tw-bg-clip-text tw-text-transparent">Email</span>
                <span className="tw-text-2xl">&</span>
                <span className="tw-text-3xl">🗓️</span>
                <span className="tw-bg-gradient-to-r tw-from-secondary tw-to-accent tw-bg-clip-text tw-text-transparent">Calendar</span>
              </div>
              <div className="tw-text-3xl tw-mt-2 tw-text-dark">AI Assistant</div>
            </div>
            <div className="reveal-up tw-mt-8 tw-max-w-[500px] tw-p-2 tw-text-center tw-text-xl tw-text-dark max-lg:tw-max-w-full">
              <p className="tw-bg-white tw-bg-opacity-70 tw-p-4 tw-rounded-xl tw-shadow-soft">
                Streamline your email and calendar management with our cute AI-powered assistant. 
                Connect with Google to get started!
              </p>
            </div>
            <div className="reveal-up tw-mt-6 tw-flex tw-place-items-center tw-gap-6 tw-overflow-hidden tw-p-2">
              {/* Login with Google button in hero section */}
              <a
                className="tw-bg-primary tw-text-white tw-font-medium tw-px-6 tw-py-3 tw-rounded-xl tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-2px] tw-transition-all tw-duration-300"
                href="#"
                onClick={handleLogin}
              >
                <span className="tw-flex tw-items-center">
                  <span className="tw-text-xl tw-mr-2">🚀</span>
                  <span>Connect with Google</span>
                </span>
              </a>
              <a 
                href="#core-features" 
                className="tw-bg-pastel-green tw-text-dark tw-font-medium tw-px-6 tw-py-3 tw-rounded-xl tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-2px] tw-transition-all tw-duration-300"
              >
                <span className="tw-flex tw-items-center">
                  <span className="tw-text-xl tw-mr-2">✨</span>
                  <span>See Features</span>
                </span>
              </a>
            </div>
          </div>
          <div className="reveal-up tw-flex tw-w-full tw-place-content-center tw-place-items-center tw-mt-4" id="dashboard-container">
            <div
              className="tw-flex tw-max-h-[750px] tw-min-h-[450px] tw-w-full tw-min-w-[350px] tw-max-w-[950px] tw-rounded-3xl tw-overflow-hidden tw-shadow-soft tw-border-4 tw-border-white max-lg:tw-h-fit max-lg:tw-max-h-[320px] max-lg:tw-min-h-[150px] max-lg:tw-w-[320px]"
              id="dashboard"
            >
              <img src={dashboard} alt="dashboard" className="tw-h-full tw-w-full tw-object-cover max-lg:tw-object-contain" />
            </div>
            {/* Decorative elements */}
            <div className="tw-absolute tw-top-1/4 tw-left-10 tw-w-20 tw-h-20 tw-bg-pastel-yellow tw-rounded-full tw-opacity-30 tw-blur-xl"></div>
            <div className="tw-absolute tw-bottom-1/4 tw-right-10 tw-w-32 tw-h-32 tw-bg-pastel-pink tw-rounded-full tw-opacity-30 tw-blur-xl"></div>
          </div>
        </div>
      </section>

      {/* EMAIL MANAGEMENT SECTION */}
      <section className="tw-relative tw-flex tw-w-full tw-min-h-[80vh] tw-max-w-[100vw] tw-flex-col tw-place-content-center tw-place-items-center tw-overflow-hidden tw-p-8 tw-bg-white">
        <div className="reveal-up tw-flex tw-min-h-[60vh] tw-place-content-center tw-place-items-center tw-gap-[10%] max-lg:tw-flex-col max-lg:tw-gap-10">
          <div className="tw-flex">
            <div className="tw-max-h-[650px] tw-max-w-[850px] tw-overflow-hidden tw-rounded-3xl tw-shadow-soft tw-border-4 tw-border-pastel-pink">
              <img src={coding} alt="email interface" className="tw-h-full tw-w-full tw-object-cover" />
            </div>
          </div>
          <div className="tw-mt-6 tw-flex tw-max-w-[450px] tw-flex-col tw-gap-5">
            <div className="tw-flex tw-items-center tw-gap-3">
              <div className="tw-h-14 tw-w-14 tw-bg-pastel-pink tw-rounded-full tw-flex tw-items-center tw-justify-center">
                <span className="tw-text-3xl">✉️</span>
              </div>
              <h3 className="tw-text-4xl max-md:tw-text-2xl tw-font-bold tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent">Email Management</h3>
            </div>
            <div className="tw-mt-4 tw-flex tw-flex-col tw-gap-4">
              <div className="tw-bg-white tw-rounded-xl tw-shadow-soft tw-p-4">
                <h4 className="tw-text-xl tw-font-medium tw-flex tw-items-center tw-text-primary">
                  <span className="tw-mr-2 tw-text-2xl">✨</span>
                  AI-powered Email Summary
                </h4>
                <p className="tw-text-lg tw-text-dark tw-mt-2">
                  Get intelligent summaries of your emails to quickly understand what matters most.
                </p>
              </div>
              <div className="tw-bg-white tw-rounded-xl tw-shadow-soft tw-p-4">
                <h4 className="tw-text-xl tw-font-medium tw-flex tw-items-center tw-text-primary">
                  <span className="tw-mr-2 tw-text-2xl">🔄</span>
                  Gmail Integration
                </h4>
                <p className="tw-text-lg tw-text-dark tw-mt-2">
                  Seamlessly connect with Gmail to manage your emails without leaving our platform.
                </p>
              </div>
              <div className="tw-bg-white tw-rounded-xl tw-shadow-soft tw-p-4">
                <h4 className="tw-text-xl tw-font-medium tw-flex tw-items-center tw-text-primary">
                  <span className="tw-mr-2 tw-text-2xl">🤖</span>
                  AI Writing Assistant
                </h4>
                <p className="tw-text-lg tw-text-dark tw-mt-2">
                  Get help drafting replies and creating professional email content with our AI assistant.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALENDAR INTEGRATION SECTION */}
      <section className="tw-relative tw-flex tw-w-full tw-min-h-[80vh] tw-max-w-[100vw] tw-flex-col tw-place-content-center tw-place-items-center tw-overflow-hidden tw-p-8 tw-bg-gradient-to-br tw-from-white tw-to-pastel-green tw-bg-opacity-30">
        <div className="reveal-up tw-flex tw-min-h-[60vh] tw-place-content-center tw-place-items-center tw-gap-[10%] max-lg:tw-flex-col max-lg:tw-gap-10">
          <div className="tw-mt-6 tw-flex tw-max-w-[450px] tw-flex-col tw-gap-5 max-lg:tw-order-2">
            <div className="tw-flex tw-items-center tw-gap-3">
              <div className="tw-h-14 tw-w-14 tw-bg-pastel-green tw-rounded-full tw-flex tw-items-center tw-justify-center">
                <span className="tw-text-3xl">🗓️</span>
              </div>
              <h3 className="tw-text-4xl max-md:tw-text-2xl tw-font-bold tw-bg-gradient-to-r tw-from-secondary tw-to-accent tw-bg-clip-text tw-text-transparent">Calendar Integration</h3>
            </div>
            <div className="tw-mt-4 tw-flex tw-flex-col tw-gap-4">
              <div className="tw-bg-white tw-rounded-xl tw-shadow-soft tw-p-4">
                <h4 className="tw-text-xl tw-font-medium tw-flex tw-items-center tw-text-secondary">
                  <span className="tw-mr-2 tw-text-2xl">🔄</span>
                  Google Calendar
                </h4>
                <p className="tw-text-lg tw-text-dark tw-mt-2">
                  View and manage your Google Calendar events directly within our interface.
                </p>
              </div>
              <div className="tw-bg-white tw-rounded-xl tw-shadow-soft tw-p-4">
                <h4 className="tw-text-xl tw-font-medium tw-flex tw-items-center tw-text-secondary">
                  <span className="tw-mr-2 tw-text-2xl">🧠</span>
                  Smart Scheduling
                </h4>
                <p className="tw-text-lg tw-text-dark tw-mt-2">
                  Let our AI help you find the best time for meetings and appointments.
                </p>
              </div>
              <div className="tw-bg-white tw-rounded-xl tw-shadow-soft tw-p-4">
                <h4 className="tw-text-xl tw-font-medium tw-flex tw-items-center tw-text-secondary">
                  <span className="tw-mr-2 tw-text-2xl">🔔</span>
                  Smart Reminders
                </h4>
                <p className="tw-text-lg tw-text-dark tw-mt-2">
                  Get intelligent reminders about upcoming events and never miss an important meeting.
                </p>
              </div>
            </div>
          </div>
          <div className="tw-flex max-lg:tw-order-1">
            <div className="tw-max-h-[650px] tw-max-w-[850px] tw-overflow-hidden tw-rounded-3xl tw-shadow-soft tw-border-4 tw-border-pastel-green">
              <img src={gitImg} alt="calendar view" className="tw-h-full tw-w-full tw-object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="core-features" className="tw-relative tw-flex tw-w-full tw-max-w-[100vw] tw-min-h-[100vh] tw-flex-col tw-place-content-center tw-place-items-center tw-overflow-hidden tw-p-8 tw-bg-white">
        <div className="tw-mt-8 tw-flex tw-flex-col tw-place-items-center tw-gap-8">
          <div className="reveal-up tw-mt-5 tw-flex tw-flex-col tw-gap-3 tw-text-center">
            <div className="tw-h-16 tw-w-16 tw-bg-pastel-purple tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto">
              <span className="tw-text-3xl">✨</span>
            </div>
            <h3 className="tw-text-xl tw-text-primary tw-font-medium">Features that simplify your digital life</h3>
            <h2 className="tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent">Core Features</h2>
          </div>
          
          <div className="tw-mt-6 tw-flex tw-max-w-[80%] tw-flex-wrap tw-place-content-center tw-gap-6 max-lg:tw-flex-col">
            {/* Feature 1 */}
            <div className="reveal-up tw-flex tw-h-[280px] tw-w-[350px] tw-flex-col tw-gap-4 tw-p-6 tw-text-center tw-bg-white tw-rounded-2xl tw-shadow-soft tw-border-t-4 tw-border-primary">
              <div className="tw-h-16 tw-w-16 tw-bg-pastel-pink tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto">
                <span className="tw-text-3xl">✉️</span>
              </div>
              <h3 className="tw-text-2xl tw-font-semibold tw-text-primary">Email Management</h3>
              <div className="tw-text-dark">
                Read, reply, and organize your Gmail messages with our intuitive interface and AI assistance.
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="reveal-up tw-flex tw-h-[280px] tw-w-[350px] tw-flex-col tw-gap-4 tw-p-6 tw-text-center tw-bg-white tw-rounded-2xl tw-shadow-soft tw-border-t-4 tw-border-secondary">
              <div className="tw-h-16 tw-w-16 tw-bg-pastel-green tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto">
                <span className="tw-text-3xl">🗓️</span>
              </div>
              <h3 className="tw-text-2xl tw-font-semibold tw-text-secondary">Calendar View</h3>
              <div className="tw-text-dark">
                Visualize your schedule and manage events from your Google Calendar without switching between apps.
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="reveal-up tw-flex tw-h-[280px] tw-w-[350px] tw-flex-col tw-gap-4 tw-p-6 tw-text-center tw-bg-white tw-rounded-2xl tw-shadow-soft tw-border-t-4 tw-border-primary">
              <div className="tw-h-16 tw-w-16 tw-bg-pastel-blue tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto">
                <span className="tw-text-3xl">🤖</span>
              </div>
              <h3 className="tw-text-2xl tw-font-semibold tw-text-primary">AI Chat Assistant</h3>
              <div className="tw-text-dark">
                Chat with our AI assistant to help you compose emails, summarize messages, and provide insights from your data.
              </div>
            </div>
            
            {/* Feature 4 */}
            <div className="reveal-up tw-flex tw-h-[280px] tw-w-[350px] tw-flex-col tw-gap-4 tw-p-6 tw-text-center tw-bg-white tw-rounded-2xl tw-shadow-soft tw-border-t-4 tw-border-secondary">
              <div className="tw-h-16 tw-w-16 tw-bg-pastel-purple tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto">
                <span className="tw-text-3xl">📝</span>
              </div>
              <h3 className="tw-text-2xl tw-font-semibold tw-text-secondary">Draft Writer</h3>
              <div className="tw-text-dark">
                Write better emails faster with AI-powered draft suggestions and templates for common messages.
              </div>
            </div>
            
            {/* Feature 5 */}
            <div className="reveal-up tw-flex tw-h-[280px] tw-w-[350px] tw-flex-col tw-gap-4 tw-p-6 tw-text-center tw-bg-white tw-rounded-2xl tw-shadow-soft tw-border-t-4 tw-border-primary">
              <div className="tw-h-16 tw-w-16 tw-bg-pastel-yellow tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto">
                <span className="tw-text-3xl">🔒</span>
              </div>
              <h3 className="tw-text-2xl tw-font-semibold tw-text-primary">Secure Authentication</h3>
              <div className="tw-text-dark">
                Your data is protected with OAuth secure login through Google, ensuring your information stays safe.
              </div>
            </div>
            
            {/* Feature 6 */}
            <div className="reveal-up tw-flex tw-h-[280px] tw-w-[350px] tw-flex-col tw-gap-4 tw-p-6 tw-text-center tw-bg-white tw-rounded-2xl tw-shadow-soft tw-border-t-4 tw-border-secondary">
              <div className="tw-h-16 tw-w-16 tw-bg-pastel-pink tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto">
                <span className="tw-text-3xl">📊</span>
              </div>
              <h3 className="tw-text-2xl tw-font-semibold tw-text-secondary">Email Analytics</h3>
              <div className="tw-text-dark">
                Get insights into your email patterns, response times, and trends to improve your communication.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="tw-mt-5 tw-flex tw-w-full tw-min-h-[100vh] tw-flex-col tw-place-content-center tw-place-items-center tw-p-8 tw-bg-gradient-to-br tw-from-white tw-to-pastel-pink tw-bg-opacity-30">
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
          <div className="tw-h-16 tw-w-16 tw-bg-pastel-blue tw-rounded-full tw-flex tw-items-center tw-justify-center">
            <span className="tw-text-3xl">💬</span>
          </div>
          <h3 className="tw-text-3xl tw-font-bold tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent max-md:tw-text-2xl">What Our Users Say</h3>
        </div>
        
        <div className="tw-mt-10 tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 xl:tw-grid-cols-3 tw-gap-8 tw-max-w-[1200px]">
          {/* Testimonial 1 */}
          <div className="reveal-up tw-flex tw-h-fit tw-w-full tw-break-inside-avoid tw-flex-col tw-rounded-2xl tw-bg-white tw-shadow-soft tw-p-6 tw-border-l-4 tw-border-primary">
            <div className="tw-flex tw-place-items-center tw-gap-4">
              <div className="tw-h-[60px] tw-w-[60px] tw-overflow-hidden tw-rounded-full tw-border-[3px] tw-border-solid tw-border-pastel-pink tw-shadow-soft">
                <img src={womenImg} alt="Sarah L." className="tw-h-full tw-w-full tw-object-cover" />
              </div>
              <div className="tw-flex tw-flex-col tw-gap-1">
                <div className="tw-font-bold tw-text-lg tw-text-primary">Sarah L.</div>
                <div className="tw-text-dark tw-opacity-70">Marketing Manager</div>
              </div>
              <div className="tw-ml-auto tw-text-4xl">💗</div>
            </div>
            <p className="tw-mt-4 tw-text-dark tw-leading-relaxed">
              "The email summarization feature has saved me hours every week. I can quickly prioritize messages and stay on top of important communications!"
            </p>
          </div>
          
          {/* Testimonial 2 */}
          <div className="reveal-up tw-flex tw-h-fit tw-w-full tw-break-inside-avoid tw-flex-col tw-rounded-2xl tw-bg-white tw-shadow-soft tw-p-6 tw-border-l-4 tw-border-secondary">
            <div className="tw-flex tw-place-items-center tw-gap-4">
              <div className="tw-h-[60px] tw-w-[60px] tw-overflow-hidden tw-rounded-full tw-border-[3px] tw-border-solid tw-border-pastel-blue tw-shadow-soft">
                <img src={manImg} alt="Michael R." className="tw-h-full tw-w-full tw-object-cover" />
              </div>
              <div className="tw-flex tw-flex-col tw-gap-1">
                <div className="tw-font-bold tw-text-lg tw-text-secondary">Michael R.</div>
                <div className="tw-text-dark tw-opacity-70">Software Engineer</div>
              </div>
              <div className="tw-ml-auto tw-text-4xl">✨</div>
            </div>
            <p className="tw-mt-4 tw-text-dark tw-leading-relaxed">
              "Having my calendar and email in one place is a game-changer. The integration is seamless and the UI is clean and intuitive!"
            </p>
          </div>
          
          {/* Testimonial 3 */}
          <div className="reveal-up tw-flex tw-h-fit tw-w-full tw-break-inside-avoid tw-flex-col tw-rounded-2xl tw-bg-white tw-shadow-soft tw-p-6 tw-border-l-4 tw-border-accent">
            <div className="tw-flex tw-place-items-center tw-gap-4">
              <div className="tw-h-[60px] tw-w-[60px] tw-overflow-hidden tw-rounded-full tw-border-[3px] tw-border-solid tw-border-pastel-green tw-shadow-soft">
                <img src={man2Img} alt="David K." className="tw-h-full tw-w-full tw-object-cover" />
              </div>
              <div className="tw-flex tw-flex-col tw-gap-1">
                <div className="tw-font-bold tw-text-lg tw-text-accent">David K.</div>
                <div className="tw-text-dark tw-opacity-70">Product Manager</div>
              </div>
              <div className="tw-ml-auto tw-text-4xl">🚀</div>
            </div>
            <p className="tw-mt-4 tw-text-dark tw-leading-relaxed">
              "The AI assistant helps me draft professional responses quickly. It's like having a personal secretary that understands my communication style!"
            </p>
          </div>
          
          {/* Testimonial 4 */}
          <div className="reveal-up tw-flex tw-h-fit tw-w-full tw-break-inside-avoid tw-flex-col tw-rounded-2xl tw-bg-white tw-shadow-soft tw-p-6 tw-border-l-4 tw-border-primary">
            <div className="tw-flex tw-place-items-center tw-gap-4">
              <div className="tw-h-[60px] tw-w-[60px] tw-overflow-hidden tw-rounded-full tw-border-[3px] tw-border-solid tw-border-pastel-purple tw-shadow-soft">
                <img src={womenImg} alt="Jennifer A." className="tw-h-full tw-w-full tw-object-cover" />
              </div>
              <div className="tw-flex tw-flex-col tw-gap-1">
                <div className="tw-font-bold tw-text-lg tw-text-primary">Jennifer A.</div>
                <div className="tw-text-dark tw-opacity-70">Freelance Writer</div>
              </div>
              <div className="tw-ml-auto tw-text-4xl">🎯</div>
            </div>
            <p className="tw-mt-4 tw-text-dark tw-leading-relaxed">
              "I love how I can see my schedule alongside my emails. It helps me plan my day more effectively and never miss important deadlines!"
            </p>
          </div>
          
          {/* Testimonial 5 */}
          <div className="reveal-up tw-flex tw-h-fit tw-w-full tw-break-inside-avoid tw-flex-col tw-rounded-2xl tw-bg-white tw-shadow-soft tw-p-6 tw-border-l-4 tw-border-secondary">
            <div className="tw-flex tw-place-items-center tw-gap-4">
              <div className="tw-h-[60px] tw-w-[60px] tw-overflow-hidden tw-rounded-full tw-border-[3px] tw-border-solid tw-border-pastel-yellow tw-shadow-soft">
                <img src={manImg} alt="Robert T." className="tw-h-full tw-w-full tw-object-cover" />
              </div>
              <div className="tw-flex tw-flex-col tw-gap-1">
                <div className="tw-font-bold tw-text-lg tw-text-secondary">Robert T.</div>
                <div className="tw-text-dark tw-opacity-70">Sales Director</div>
              </div>
              <div className="tw-ml-auto tw-text-4xl">📊</div>
            </div>
            <p className="tw-mt-4 tw-text-dark tw-leading-relaxed">
              "The email analytics feature has given me valuable insights into my team's communication patterns. We've improved our response times significantly!"
            </p>
          </div>
          
          {/* Testimonial 6 */}
          <div className="reveal-up tw-flex tw-h-fit tw-w-full tw-break-inside-avoid tw-flex-col tw-rounded-2xl tw-bg-white tw-shadow-soft tw-p-6 tw-border-l-4 tw-border-accent">
            <div className="tw-flex tw-place-items-center tw-gap-4">
              <div className="tw-h-[60px] tw-w-[60px] tw-overflow-hidden tw-rounded-full tw-border-[3px] tw-border-solid tw-border-pastel-pink tw-shadow-soft">
                <img src={man2Img} alt="Jason M." className="tw-h-full tw-w-full tw-object-cover" />
              </div>
              <div className="tw-flex tw-flex-col tw-gap-1">
                <div className="tw-font-bold tw-text-lg tw-text-accent">Jason M.</div>
                <div className="tw-text-dark tw-opacity-70">Startup Founder</div>
              </div>
              <div className="tw-ml-auto tw-text-4xl">🔒</div>
            </div>
            <p className="tw-mt-4 tw-text-dark tw-leading-relaxed">
              "As someone who handles hundreds of emails daily, this tool has been a lifesaver. The Google integration is flawless and secure!"
            </p>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="tw-mt-5 tw-flex tw-w-full tw-flex-col tw-place-items-center tw-p-8 tw-bg-white" id="pricing">
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
          <div className="tw-h-16 tw-w-16 tw-bg-pastel-yellow tw-rounded-full tw-flex tw-items-center tw-justify-center">
            <span className="tw-text-3xl">💰</span>
          </div>
          <h3 className="tw-text-3xl tw-font-bold tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent max-md:tw-text-2xl">Simple Pricing</h3>
          <p className="tw-text-center tw-text-dark tw-max-w-[600px] tw-mt-2">
            Choose the plan that works best for your needs. All plans include our core features.
          </p>
        </div>
        
        <div className="tw-mt-10 tw-flex tw-flex-wrap tw-place-content-center tw-gap-8 max-lg:tw-flex-col">
          {/* Pricing Card 1 */}
          <div className="reveal-up tw-flex tw-w-[380px] tw-flex-col tw-place-items-center tw-gap-4 tw-rounded-2xl tw-bg-white tw-p-8 tw-shadow-soft tw-border tw-border-gray-200 max-lg:tw-w-[340px] hover:tw-shadow-hover tw-transition-all tw-duration-300">
            <div className="tw-h-20 tw-w-20 tw-bg-pastel-blue tw-rounded-full tw-flex tw-items-center tw-justify-center">
              <span className="tw-text-4xl">🆓</span>
            </div>
            <h3 className="tw-mt-2">
              <span className="tw-text-4xl tw-font-bold tw-text-dark">Free</span>
            </h3>
            <p className="tw-mt-1 tw-text-center tw-text-dark">
              Perfect for getting started with email and calendar management
            </p>
            <div className="tw-w-full tw-h-px tw-bg-gray-200 tw-my-4"></div>
            <ul className="tw-mt-2 tw-flex tw-flex-col tw-gap-3 tw-text-center tw-text-lg tw-text-dark tw-w-full">
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Email summarization
              </li>
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Basic calendar view
              </li>
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Limited AI chat assistance
              </li>
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Google integration
              </li>
            </ul>
            <a 
              href="#" 
              onClick={handleLogin} 
              className="tw-mt-8 tw-w-full tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-text-white tw-font-medium tw-px-6 tw-py-3 tw-rounded-xl tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-2px] tw-transition-all tw-duration-300 tw-text-center"
            >
              <span className="tw-flex tw-items-center tw-justify-center">
                <span className="tw-mr-2">🚀</span> Sign Up Now
              </span>
            </a>
          </div>
          
          {/* Pricing Card 2 */}
          <div className="reveal-up tw-flex tw-w-[380px] tw-flex-col tw-place-items-center tw-gap-4 tw-rounded-2xl tw-bg-white tw-p-8 tw-shadow-soft tw-border-2 tw-border-primary tw-scale-105 tw-z-10 max-lg:tw-w-[340px] max-lg:tw-scale-100 hover:tw-shadow-hover tw-transition-all tw-duration-300">
            <div className="tw-absolute tw-top-0 tw-right-6 tw-transform tw-translate-y-[-50%] tw-bg-accent tw-text-dark tw-font-bold tw-px-4 tw-py-1 tw-rounded-full tw-text-sm">
              POPULAR
            </div>
            <div className="tw-h-20 tw-w-20 tw-bg-pastel-pink tw-rounded-full tw-flex tw-items-center tw-justify-center">
              <span className="tw-text-4xl">⭐</span>
            </div>
            <h3 className="tw-mt-2 tw-flex tw-items-end">
              <span className="tw-text-4xl tw-font-bold tw-text-primary">$9</span>
              <span className="tw-text-xl tw-text-dark tw-opacity-70">/mo</span>
            </h3>
            <p className="tw-mt-1 tw-text-center tw-text-dark">
              Our most popular plan for professionals and small teams
            </p>
            <div className="tw-w-full tw-h-px tw-bg-gray-200 tw-my-4"></div>
            <ul className="tw-mt-2 tw-flex tw-flex-col tw-gap-3 tw-text-center tw-text-lg tw-text-dark tw-w-full">
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> All Free features
              </li>
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Advanced email analytics
              </li>
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Unlimited AI chat
              </li>
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Smart scheduling assistant
              </li>
            </ul>
            <a 
              href="#" 
              onClick={handleLogin} 
              className="tw-mt-8 tw-w-full tw-bg-primary tw-text-white tw-font-medium tw-px-6 tw-py-3 tw-rounded-xl tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-2px] tw-transition-all tw-duration-300 tw-text-center"
            >
              <span className="tw-flex tw-items-center tw-justify-center">
                <span className="tw-mr-2">🌟</span> Get Started
              </span>
            </a>
          </div>
          
          {/* Pricing Card 3 */}
          <div className="reveal-up tw-flex tw-w-[380px] tw-flex-col tw-place-items-center tw-gap-4 tw-rounded-2xl tw-bg-white tw-p-8 tw-shadow-soft tw-border tw-border-gray-200 max-lg:tw-w-[340px] hover:tw-shadow-hover tw-transition-all tw-duration-300">
            <div className="tw-h-20 tw-w-20 tw-bg-pastel-green tw-rounded-full tw-flex tw-items-center tw-justify-center">
              <span className="tw-text-4xl">🏢</span>
            </div>
            <h3 className="tw-mt-2 tw-flex tw-items-end">
              <span className="tw-text-4xl tw-font-bold tw-text-dark">$19</span>
              <span className="tw-text-xl tw-text-dark tw-opacity-70">/mo</span>
            </h3>
            <p className="tw-mt-1 tw-text-center tw-text-dark">
              Enterprise-grade features for teams and businesses
            </p>
            <div className="tw-w-full tw-h-px tw-bg-gray-200 tw-my-4"></div>
            <ul className="tw-mt-2 tw-flex tw-flex-col tw-gap-3 tw-text-center tw-text-lg tw-text-dark tw-w-full">
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> All Pro features
              </li>
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Team collaboration tools
              </li>
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Advanced automation
              </li>
              <li className="tw-flex tw-items-center tw-gap-2 tw-justify-center">
                <span className="tw-text-primary">✓</span> Priority support
              </li>
            </ul>
            <a 
              href="#" 
              onClick={handleLogin} 
              className="tw-mt-8 tw-w-full tw-bg-secondary tw-text-white tw-font-medium tw-px-6 tw-py-3 tw-rounded-xl tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-2px] tw-transition-all tw-duration-300 tw-text-center"
            >
              <span className="tw-flex tw-items-center tw-justify-center">
                <span className="tw-mr-2">📞</span> Contact Sales
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* NEWSLETTER SECTION */}
      <section className="tw-flex tw-w-full tw-flex-col tw-place-content-center tw-place-items-center tw-gap-6 tw-p-12 tw-bg-gradient-to-br tw-from-white tw-to-pastel-blue tw-bg-opacity-30">
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
          <div className="tw-h-16 tw-w-16 tw-bg-pastel-purple tw-rounded-full tw-flex tw-items-center tw-justify-center">
            <span className="tw-text-3xl">📮</span>
          </div>
          <h2 className="tw-text-3xl tw-font-bold tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent max-md:tw-text-2xl">Stay Updated</h2>
          <p className="tw-text-center tw-text-dark tw-max-w-[600px] tw-mt-2">
            Subscribe to our newsletter for the latest features and updates. No spam, ever!
          </p>
        </div>
        
        <div className="tw-flex tw-flex-col sm:tw-flex-row tw-items-center tw-gap-3 tw-overflow-hidden tw-p-2 tw-mt-4 tw-max-w-[600px] tw-w-full">
          <input
            type="email"
            className="tw-h-[60px] tw-w-full tw-p-4 tw-outline-none tw-bg-white tw-rounded-xl tw-border tw-border-pastel-purple tw-shadow-soft focus:tw-ring-2 focus:tw-ring-primary tw-text-dark tw-transition-all tw-duration-300"
            placeholder="Your email address"
          />
          <a 
            href="#"
            className="tw-bg-primary tw-text-white tw-font-medium tw-px-6 tw-py-4 tw-rounded-xl tw-shadow-button hover:tw-shadow-hover hover:tw-translate-y-[-2px] tw-transition-all tw-duration-300 tw-flex tw-items-center tw-min-w-[150px] tw-justify-center sm:tw-w-auto tw-w-full"
          >
            <span className="tw-mr-2">✉️</span> Subscribe
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="tw-mt-auto tw-flex tw-w-full tw-place-content-around tw-gap-8 tw-p-12 tw-bg-gradient-to-b tw-from-white tw-to-pastel-green/30 tw-text-dark max-md:tw-flex-col">
        <div className="tw-flex tw-h-full tw-flex-col tw-gap-6 tw-max-w-[300px] max-md:tw-items-center">
          <div className="tw-flex tw-items-center tw-gap-3">
            <div className="tw-h-12 tw-w-12 tw-bg-pastel-green tw-rounded-full tw-flex tw-items-center tw-justify-center">
              <img src={logo} alt="logo" className="tw-h-8 tw-w-8" />
            </div>
            <span className="tw-font-bold tw-text-xl tw-bg-gradient-to-r tw-from-primary tw-to-secondary tw-bg-clip-text tw-text-transparent">Pearrot Hacks</span>
          </div>
          
          <div className="tw-text-dark max-md:tw-text-center">
            Pear Hacks, Inc.
            <br />
            123 Tech Plaza
            <br />
            San Francisco, CA 94103
          </div>
          
          <div className="tw-mt-3 tw-text-lg tw-font-semibold tw-text-primary max-md:tw-text-center">Connect with us</div>
          <div className="tw-flex tw-gap-4 tw-text-3xl max-md:tw-justify-center">
            <a href="#" aria-label="Facebook" className="tw-h-10 tw-w-10 tw-bg-pastel-blue tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shadow-soft hover:tw-shadow-hover tw-transition-all tw-duration-300 hover:tw-translate-y-[-2px]">
              <i className="bi bi-facebook tw-text-primary"></i>
            </a>
            <a href="#" aria-label="Twitter" className="tw-h-10 tw-w-10 tw-bg-pastel-pink tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shadow-soft hover:tw-shadow-hover tw-transition-all tw-duration-300 hover:tw-translate-y-[-2px]">
              <i className="bi bi-twitter tw-text-primary"></i>
            </a>
            <a href="#" aria-label="Instagram" className="tw-h-10 tw-w-10 tw-bg-pastel-yellow tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shadow-soft hover:tw-shadow-hover tw-transition-all tw-duration-300 hover:tw-translate-y-[-2px]">
              <i className="bi bi-instagram tw-text-primary"></i>
            </a>
          </div>
        </div>
        
        <div className="tw-flex tw-h-full tw-flex-col tw-gap-6 tw-max-w-[300px] max-md:tw-items-center">
          <h2 className="tw-text-2xl tw-font-bold tw-text-primary max-md:tw-text-center">Resources</h2>
          <div className="tw-flex tw-flex-col tw-gap-4 max-md:tw-text-center max-md:tw-items-center">
            <a href="#" className="tw-text-dark hover:tw-text-primary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-primary">→</span> About us
            </a>
            <a href="#" className="tw-text-dark hover:tw-text-primary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-primary">→</span> Privacy Policy
            </a>
            <a href="#" className="tw-text-dark hover:tw-text-primary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-primary">→</span> Terms of Service
            </a>
            <a href="#" className="tw-text-dark hover:tw-text-primary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-primary">→</span> Help Center
            </a>
            <a href="#" className="tw-text-dark hover:tw-text-primary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-primary">→</span> Contact Us
            </a>
          </div>
        </div>
        
        <div className="tw-flex tw-h-full tw-flex-col tw-gap-6 tw-max-w-[300px] max-md:tw-items-center">
          <h2 className="tw-text-2xl tw-font-bold tw-text-secondary max-md:tw-text-center">Features</h2>
          <div className="tw-flex tw-flex-col tw-gap-4 max-md:tw-text-center max-md:tw-items-center">
            <a href="#" className="tw-text-dark hover:tw-text-secondary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-secondary">→</span> Email Management
            </a>
            <a href="#" className="tw-text-dark hover:tw-text-secondary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-secondary">→</span> Calendar View
            </a>
            <a href="#" className="tw-text-dark hover:tw-text-secondary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-secondary">→</span> AI Chat Assistant
            </a>
            <a href="#" className="tw-text-dark hover:tw-text-secondary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-secondary">→</span> Draft Writer
            </a>
            <a href="#" className="tw-text-dark hover:tw-text-secondary tw-transition-colors tw-duration-300 tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-secondary">→</span> Email Analytics
            </a>
          </div>
        </div>
      </footer>
      
      {/* COPYRIGHT */}
      <div className="tw-p-4 tw-text-center tw-text-dark tw-bg-light tw-text-sm">
        © {new Date().getFullYear()} Pear Hacks. All rights reserved. Made with 💜 by our team.
      </div>
    </div>
  );
};

export default TailwindLogin;
