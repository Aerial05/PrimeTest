import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Trash2, Send, Bot, User, AlertCircle, Sparkles } from 'lucide-react';
import styles from './Chatbot.module.css';
import chatbotService from '/src/services/ChatbotService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '/src/config/firebase-config';
import singleServicesService from '/src/services/SingleServicesService';
import servicePackagesService from '/src/services/ServicePackagesService';

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [hasSeenDisclaimer, setHasSeenDisclaimer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const servicesCacheRef = useRef({ singles: [], packages: [] });

  // Ensure the services/packages are loaded once per session
  const ensureServicesLoaded = async () => {
    await ensureServicesLoadedOnce(servicesCacheRef, setServicesLoaded);
  };

  // Try to match AI-recommended names in the response to our DB items
  const matchServiceSuggestions = (responseText, userText) => {
    const txt = String(responseText || '').toLowerCase();
    const userTxt = String(userText || '').toLowerCase();
    if (!txt) return [];
    const singles = servicesCacheRef.current.singles || [];
    const packages = servicesCacheRef.current.packages || [];

    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const includesPhrase = (hay, needle) => hay.includes(needle) || hay.replace(/\s+/g, '')
      .includes(needle.replace(/\s+/g, ''));

  const hits = [];
  const mentionedSingles = [];

    // Prefer direct name mentions in the response
    singles.forEach((s) => {
      const name = s?.NAME || '';
      const n = norm(name);
      if (n && includesPhrase(norm(txt), n)) {
        const sug = { ...buildSuggestionFromSingle(s, { txt, userTxt }), score: n.length };
        hits.push(sug);
        mentionedSingles.push(s);
      }
    });
    packages.forEach((p) => {
      const name = p?.NAME || '';
      const n = norm(name);
      if (n && includesPhrase(norm(txt), n)) {
        hits.push({ ...buildSuggestionFromPackage(p, { txt, userTxt }), score: n.length });
      }
    });

    // Fallback heuristic: look for category keywords (simple)
    if (hits.length === 0) {
      const keywords = [
        { key: 'cbc', match: /\bcbc\b|complete blood count|blood test/ },
        { key: 'urinalysis', match: /urinalysis|urine test/ },
        { key: 'x-ray', match: /x[- ]?ray/ },
        { key: 'lipid', match: /lipid|cholesterol/ },
        { key: 'glucose', match: /glucose|sugar|fbs/ },
      ];
      const k = keywords.find(k => k.match.test(txt));
      if (k) {
        const kw = k.key;
        singles.forEach((s) => {
          if (String(s?.NAME || '').toLowerCase().includes(kw)) hits.push({ ...buildSuggestionFromSingle(s, { txt, userTxt }), score: 5 });
        });
        packages.forEach((p) => {
          if (String(p?.NAME || '').toLowerCase().includes(kw)) hits.push({ ...buildSuggestionFromPackage(p, { txt, userTxt }), score: 5 });
        });
      }
    }

    // If a mentioned single service is included within any package's features/description, suggest that package too
    if (mentionedSingles.length > 0) {
      const txtNorm = norm(txt);
      for (const s of mentionedSingles) {
        const sName = String(s?.NAME || '');
        const sNorm = norm(sName);
        for (const p of packages) {
          const featuresText = norm(`${p?.FEATURES || ''} ${p?.DESC || ''} ${p?.SPECIAL_INSTRUCTION || ''}`);
          if (sNorm && (featuresText.includes(sNorm) || includesPhrase(featuresText, sNorm))) {
            const pkgSug = buildSuggestionFromPackage(p, { txt, userTxt });
            pkgSug.reason = pkgSug.reason
              ? `${pkgSug.reason} Also, "${sName}" is part of this package. I recommend booking this package.`
              : `"${sName}" is part of this package. I recommend booking this package.`;
            hits.push({ ...pkgSug, score: (pkgSug.name || '').length + sNorm.length + 10 });
          }
        }
      }
    }

    // Special case: animal bite keywords → recommend package with 'bite' in name
    if (/animal\s*bite|dog\s*bite|cat\s*bite/.test(txt) || /tetanus|rabies/.test(txt)) {
      const bitePkg = packages.find(p => String(p?.NAME || '').toLowerCase().includes('bite'));
      if (bitePkg) {
        const pkgSug = buildSuggestionFromPackage(bitePkg, { txt, userTxt });
        if (!pkgSug.reason) pkgSug.reason = 'This package is designed for animal bite treatment. I recommend booking this package.';
        hits.push({ ...pkgSug, score: 999 });
      }
    }

    // Sort by score/price presence and cap to 3
    const scored = hits
      .map(h => ({ ...h, priceScore: h.priceLabel ? 1 : 0 }))
      .sort((a,b) => (b.score + b.priceScore) - (a.score + a.priceScore));
    const uniq = [];
    const seen = new Set();
    for (const s of scored) {
      const key = `${s.type}-${s.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(s);
      if (uniq.length >= 3) break;
    }
    return uniq;
  };

  const php = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num) || num <= 0) return '';
    try {
      return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(num);
    } catch {
      return `₱${Math.round(num).toLocaleString('en-PH')}`;
    }
  };

  const buildSuggestionFromSingle = (s, { txt, userTxt } = {}) => {
    const price = s.DISCOUNTED_PRICE ?? s.ORIGINAL_PRICE ?? s.PHIL_HEALTH_PROMO_PRICE;
    const priceLabel = php(price);
    const reason = computeReason({
      name: s.NAME,
      desc: s.DESC,
      features: s.SPECIAL_INSTRUCTIONS,
      txt,
      userTxt,
    });
    return {
      id: s.id,
      serviceId: s.SERVICE_ID || s.id,
      type: 'service',
      name: s.NAME || 'Service',
      desc: s.DESC || s.SPECIAL_INSTRUCTIONS || '',
      priceLabel: priceLabel || s.PRICE_NOTE || '',
      reason,
    };
  };

  const buildSuggestionFromPackage = (p, { txt, userTxt } = {}) => {
    const price = p.DISCOUNTED_PRICE ?? p.ORIGINAL_PRICE ?? p.PHIL_HEALTH_PROMO_PRICE;
    const priceLabel = php(price);
    const reason = computeReason({
      name: p.NAME,
      desc: p.DESC || p.SPECIAL_INSTRUCTION,
      features: p.FEATURES,
      txt,
      userTxt,
    });
    return {
      id: p.id,
      serviceId: p.SERVICE_PACKGE_ID || p.SERVICE_PACKAGE_ID || p.id,
      type: 'package',
      name: p.NAME || 'Package',
      desc: p.DESC || p.FEATURES || p.SPECIAL_INSTRUCTION || '',
      priceLabel: priceLabel || p.PRICE_NOTE || '',
      reason,
    };
  };
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const location = useLocation();

  // Track current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Show notification when chat is closed and bot sends message
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'bot') {
        setHasNewMessage(true);
      }
    } else {
      setHasNewMessage(false);
    }
  }, [isOpen, messages]);

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = '48px'; // Reset to min height
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  // Handle chatbot open with auth check
  const handleChatbotToggle = () => {
    if (!isOpen && !currentUser) {
      alert('Please log in to use the chatbot assistant.');
      return;
    }

    if (!isOpen && currentUser && !hasSeenDisclaimer) {
      setShowDisclaimer(true);
      return;
    }

    setIsOpen(!isOpen);
  };

  // Handle disclaimer acceptance
  const handleAcceptDisclaimer = () => {
    setShowDisclaimer(false);
    setHasSeenDisclaimer(true);
    setIsOpen(true);
  };

  const getCurrentPageContext = () => {
    const path = location.pathname.toLowerCase();
    if (path === '/' || path === '/dashboard') return 'home';
    if (path.includes('services')) return 'services';
    if (path.includes('about')) return 'about';
    if (path.includes('contact')) return 'contact';
    if (path.includes('appointment')) return 'appointment';
    if (path.includes('profile')) return 'profile';
    return 'general';
  };

  const handleSendMessage = async (messageText) => {
    const text = messageText || inputValue.trim();
    if (!text) return;

    setError('');
    setInputValue('');

    // Add user message
    const userMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);

    // Show typing indicator
    setIsTyping(true);

    try {
      // Get context
      const context = {
        currentPage: getCurrentPageContext(),
        userName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest'
      };

      // Send to Gemini API
      const response = await chatbotService.sendMessage(text, context);

      // Add bot response
      const botMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);

      // Try to fetch and display service/package suggestions based on AI text
      try {
        await ensureServicesLoaded();
        const suggestions = matchServiceSuggestions(response, text);
        if (suggestions.length > 0) {
          const suggestionsMessage = {
            id: Date.now() + 2,
            sender: 'bot',
            type: 'suggestions',
            suggestions,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, suggestionsMessage]);
        }
      } catch (e) {
        // Silent fail for suggestions; keep primary response
        console.warn('Suggestions fetch failed', e);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to get response. Please try again.');
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again or contact support if the issue persists.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setShowDeleteConfirm(true);
  };

  const confirmClearChat = () => {
    setMessages([]);
    chatbotService.clearHistory();
    setError('');
    setShowDeleteConfirm(false);
  };

  const cancelClearChat = () => {
    setShowDeleteConfirm(false);
  };

  const quickReplies = [
    'In a rush? We accept walk-ins!',
    'Can I get directions to your clinic?',
    "What's your emergency number?",
  ];

  return (
    <div className={styles.chatbotContainer}>
      {/* Floating Button */}
      <button
        className={`${styles.chatbotButton} ${isOpen ? styles.open : ''}`}
        onClick={handleChatbotToggle}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        title={isOpen ? 'Close chat' : 'Chat with us'}
      >
        {hasNewMessage && !isOpen && (
          <span className={styles.notificationBadge}>!</span>
        )}
        {isOpen ? <X /> : <MessageCircle />}
      </button>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className={styles.disclaimerModal}>
          <div className={styles.disclaimerContent}>
            <div className={styles.disclaimerHeader}>
              <AlertCircle />
              <h3>Chatbot Terms & Conditions</h3>
            </div>
            <div className={styles.disclaimerBody}>
              <p><strong>Purpose & Limitations:</strong></p>
              <p>The information provided by this chatbot is for appointment scheduling and general service information purposes only. It does not constitute professional medical advice, diagnosis, treatment, or a binding agreement.</p>
              
              <p><strong>Privacy & Chat History:</strong></p>
              <p>Your conversation history is not saved or stored. When you close the chatbot or leave the page, your entire chat history will be permanently cleared. Please save any important information before closing.</p>
              
              <p><strong>Human Representative:</strong></p>
              <p>If you need to speak with a staff member, the chatbot will attempt to connect you. If our staff is currently busy, please contact us directly at <strong>0926-638-6300</strong> for immediate assistance.</p>
              
              <p><strong>Important Notice:</strong></p>
              <p>For official confirmation, urgent concerns, or medical emergencies, please contact the clinic directly through the provided channels.</p>
            </div>
            <div className={styles.disclaimerActions}>
              <button 
                className={styles.disclaimerCancel}
                onClick={() => setShowDisclaimer(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.disclaimerAccept}
                onClick={handleAcceptDisclaimer}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.deleteModal} onClick={cancelClearChat}>
          <div className={styles.deleteContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteHeader}>
              <AlertCircle />
              <div>
                <h3>Clear conversation?</h3>
                <p className={styles.deleteSubtitle}>This action will permanently remove your current chat history.</p>
              </div>
            </div>
            <div className={styles.deleteBody}>
              <div className={styles.deletePreview}>
                <div className={styles.previewItem}>
                  <div className={styles.previewDot} />
                  <span>All messages in this chat will be deleted.</span>
                </div>
                <div className={styles.previewItem}>
                  <div className={styles.previewDot} />
                  <span>This cannot be undone.</span>
                </div>
              </div>
            </div>
            <div className={styles.deleteActions}>
              <button className={styles.deleteCancel} onClick={cancelClearChat}>Cancel</button>
              <button className={styles.deleteConfirm} onClick={confirmClearChat} aria-label="Confirm clear chat">
                <Trash2 />
                Clear chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatbotWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderInfo}>
              <div className={styles.headerAvatar}>
                <Sparkles />
              </div>
              <div className={styles.headerText}>
                <h3>Pulse</h3>
                <p className={styles.headerSubtitle}>AI Assistant</p>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.iconButton}
                onClick={handleClearChat}
                title="Clear chat"
                aria-label="Clear chat"
              >
                <Trash2 />
              </button>
              <button
                className={styles.iconButton}
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chat"
              >
                <X />
              </button>
            </div>
          </div>

          {/* Messages Container Wrapper */}
          <div className={styles.messagesWrapper}>
            <div className={styles.messagesContainer}>
              {messages.length === 0 && (
              <>
                {/* Welcome message as bot message */}
                <div className={`${styles.message} ${styles.bot}`}>
                  <div className={styles.messageAvatar}>
                    <Bot />
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageBubble}>
                      Hi, I'm Pulse! What services would you like to have? Just ask away!
                    </div>
                    <div className={styles.messageTime}>
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Quick Replies */}
                <div className={styles.quickRepliesSection}>
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      className={styles.quickReplyChip}
                      onClick={() => handleSendMessage(reply)}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.length > 0 && (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`${styles.message} ${styles[message.sender]}`}>
                    <div className={styles.messageAvatar}>
                      {message.sender === 'bot' ? <Bot /> : <User />}
                    </div>
                    <div className={styles.messageContent}>
                      {message.type === 'suggestions' ? (
                        <div className={styles.messageBubble}>
                          <div className={styles.suggestionsHeader}>Recommended options</div>
                          <div className={styles.suggestionsGrid}>
                            {message.suggestions.map((s) => (
                              <div key={`${s.type}-${s.id}`} className={styles.suggestionCard}>
                                <div className={styles.suggestionTop}>
                                  <div className={styles.suggestionTitle}>{s.name}</div>
                                  <span className={`${styles.badge} ${s.type === 'package' ? styles.badgePkg : styles.badgeSvc}`}>{s.type === 'package' ? 'Package' : 'Service'}</span>
                                </div>
                                {s.priceLabel && <div className={styles.suggestionPrice}>{s.priceLabel}</div>}
                                {s.desc && <div className={styles.suggestionDesc}>{s.desc}</div>}
                                {s.reason && <div className={styles.suggestionWhy}><strong>Why:</strong> {s.reason}</div>}
                                <div className={styles.suggestionActions}>
                                  <a href={`/appointment?serviceId=${encodeURIComponent(s.serviceId || s.id)}&type=${s.type}`} className={styles.suggestionBook} target="_blank" rel="noopener noreferrer">Book</a>
                                  <button className={styles.suggestionAsk} onClick={() => handleSendMessage(`Tell me more about ${s.name}`)}>Ask details</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.messageBubble}>
                            {renderMessageText(message.text)}
                          </div>
                          <div className={styles.messageTime}>{message.timestamp}</div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className={`${styles.message} ${styles.bot}`}>
                    <div className={styles.messageAvatar}>
                      <Bot />
                    </div>
                    <div className={styles.typingIndicator}>
                      <div className={styles.typingDot} />
                      <div className={styles.typingDot} />
                      <div className={styles.typingDot} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
            </div>

            {/* Error Display */}
            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className={styles.inputArea}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={inputRef}
                className={styles.messageInput}
                placeholder="I would like to book an appointment asap!"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                rows={1}
              />
            </div>
            <button
              className={styles.sendButton}
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              aria-label="Send message"
            >
              <Send />
            </button>
          </div>

          {/* Bottom disclaimer removed per request - modal still shown on first open */}
        </div>
      )}
    </div>
  );
}

// Turn urls into clickable links and preserve line breaks
function renderMessageText(text) {
  if (!text) return null;
  const parts = [];
  const urlRegex = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;
  let lastIndex = 0;
  let match;
  const src = String(text);
  while ((match = urlRegex.exec(src)) !== null) {
    const [url] = match;
    if (match.index > lastIndex) {
      parts.push(src.slice(lastIndex, match.index));
    }
    const href = url.startsWith('http') ? url : `https://${url}`;
    parts.push(
      <a key={`${href}-${match.index}`} href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < src.length) {
    parts.push(src.slice(lastIndex));
  }
  // Preserve line breaks
  return parts.flatMap((p, i) =>
    typeof p === 'string'
      ? p.split(/\n/g).map((line, j) => (j > 0 ? [<br key={`br-${i}-${j}`} />, line] : line)).flat()
      : p
  );
}

// Load services and packages once into a cache
async function ensureServicesLoadedOnce(refObj, setLoaded) {
  if (refObj.current.singles.length > 0 || refObj.current.packages.length > 0) {
    setLoaded(true);
    return;
  }
  const [singles, packages] = await Promise.all([
    singleServicesService.list().catch(() => []),
    servicePackagesService.list().catch(() => []),
  ]);
  refObj.current = { singles, packages };
  setLoaded(true);
}

// Create a short reason string from item descriptions/features vs user/AI text
function computeReason({ name, desc, features, txt, userTxt }) {
  const source = `${String(desc || '')}\n${String(features || '')}`.toLowerCase();
  const context = `${String(txt || '')} ${String(userTxt || '')}`.toLowerCase();
  if (!source) return '';
  const reasons = [];
  const addIf = (kw, phrase) => {
    if (source.includes(kw) && context.includes(kw)) reasons.push(phrase || kw);
  };
  // Simple keyword mapping
  addIf('cbc', 'it includes a Complete Blood Count (CBC)');
  addIf('blood', 'it covers relevant blood tests');
  addIf('lipid', 'it checks lipid/cholesterol levels');
  addIf('cholesterol', 'it checks cholesterol levels');
  addIf('glucose', 'it measures blood sugar');
  addIf('urinalysis', 'it provides a urinalysis');
  addIf('x-ray', 'it includes an X-ray');
  addIf('chest', 'it may include chest-related imaging or tests');
  addIf('fever', 'it includes tests that can help check infection indicators');
  addIf('dizzy', 'it offers tests that can help evaluate causes of dizziness');

  if (reasons.length === 0) return '';
  const uniq = Array.from(new Set(reasons));
  const because = uniq.slice(0, 2).join(' and ');
  return `Recommended because ${because}.`;
}

