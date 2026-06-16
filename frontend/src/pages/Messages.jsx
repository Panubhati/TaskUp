import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function Messages() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const isDark = (localStorage.getItem('theme') || 'dark') === 'dark';

  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState(null);
  const messagesEndRef = useRef(null);

  // Theme-aware colors
  const T = {
    bg: isDark ? '#0a0a0f' : '#f5f5f7',
    sidebarBg: isDark ? '#0e0e16' : '#ececef',
    card: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)',
    cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#f1f1f3' : '#1a1a2e',
    textSec: isDark ? '#94949e' : '#4a4a5a',
    textMuted: isDark ? '#5a5a66' : '#8a8a9a',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    myBubble: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.1)',
    theirBubble: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    activeBg: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(124,58,237,0.06)',
    hoverBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setMyId(payload.id);
    } catch {}
  }, [token, navigate]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(res.data.conversations || []);
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const openConversation = async (partnerId) => {
    setActivePartner(partnerId);
    try {
      const res = await axios.get(`${API}/messages/conversation/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.messages || []);
      // Refresh conversations to update unread counts
      fetchConversations();
    } catch {}
  };

  // Poll active conversation
  useEffect(() => {
    if (!activePartner) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/messages/conversation/${activePartner}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data.messages || []);
        fetchConversations();
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [activePartner, token, fetchConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activePartner || sending) return;
    setSending(true);
    try {
      await axios.post(`${API}/messages`, {
        receiverId: activePartner,
        content: newMessage.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewMessage('');
      // Refresh conversation
      const res = await axios.get(`${API}/messages/conversation/${activePartner}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.messages || []);
      fetchConversations();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message');
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeConvo = conversations.find(c => c.partnerId === activePartner);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: T.bg }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(139,92,246,0.15)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ color: T.textMuted, marginTop: 14, fontSize: '0.9rem' }}>Loading messages...</p>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', background: T.bg, overflow: 'hidden' }}>

      {/* ── Left Sidebar: Conversations ── */}
      <div style={{
        width: 320, flexShrink: 0, borderRight: `1px solid ${T.cardBorder}`,
        background: T.sidebarBg, display: 'flex', flexDirection: 'column',
      }}>
        {/* Sidebar Header */}
        <div style={{ padding: '20px 18px 14px', borderBottom: `1px solid ${T.cardBorder}` }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: T.text, margin: 0 }}>💬 Messages</h2>
          <p style={{ fontSize: '0.72rem', color: T.textMuted, margin: '4px 0 0' }}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <span style={{ fontSize: '2rem' }}>📭</span>
              <p style={{ color: T.textMuted, fontSize: '0.82rem', marginTop: 10 }}>No conversations yet</p>
              {role === 'company' && (
                <p style={{ color: T.textMuted, fontSize: '0.72rem', marginTop: 4 }}>
                  Visit the <span style={{ color: '#8b5cf6', cursor: 'pointer' }} onClick={() => navigate('/leaderboard')}>Leaderboard</span> to find candidates.
                </p>
              )}
            </div>
          ) : (
            conversations.map((convo) => (
              <div
                key={convo.partnerId}
                onClick={() => openConversation(convo.partnerId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px', cursor: 'pointer',
                  borderBottom: `1px solid ${T.cardBorder}`,
                  background: activePartner === convo.partnerId ? T.activeBg : 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => { if (activePartner !== convo.partnerId) e.currentTarget.style.background = T.hoverBg; }}
                onMouseLeave={e => { if (activePartner !== convo.partnerId) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: convo.partnerRole === 'company'
                    ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                    : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.9rem', fontWeight: 700,
                }}>
                  {convo.partnerName.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {convo.partnerName}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: T.textMuted, flexShrink: 0, marginLeft: 8 }}>
                      {formatTime(convo.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <span style={{
                      fontSize: '0.75rem', color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: convo.unreadCount > 0 ? 600 : 400,
                      color: convo.unreadCount > 0 ? T.textSec : T.textMuted,
                    }}>
                      {convo.lastMessage.length > 50 ? convo.lastMessage.substring(0, 50) + '...' : convo.lastMessage}
                    </span>
                    {convo.unreadCount > 0 && (
                      <span style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        color: '#fff', fontSize: '0.58rem', fontWeight: 700,
                        padding: '1px 6px', borderRadius: 50, minWidth: 18, textAlign: 'center',
                        flexShrink: 0, marginLeft: 6,
                      }}>
                        {convo.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right Panel: Message Thread ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!activePartner ? (
          /* No conversation selected */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '3rem', opacity: 0.5 }}>💬</span>
            <h3 style={{ color: T.textMuted, fontWeight: 600, fontSize: '1rem', marginTop: 12 }}>Select a conversation</h3>
            <p style={{ color: T.textMuted, fontSize: '0.82rem', marginTop: 4 }}>Choose from your conversations to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 24px', borderBottom: `1px solid ${T.cardBorder}`,
              background: T.card,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: activeConvo?.partnerRole === 'company'
                  ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                  : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.85rem', fontWeight: 700,
              }}>
                {activeConvo?.partnerName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: T.text }}>
                  {activeConvo?.partnerName || 'User'}
                </div>
                <div style={{ fontSize: '0.68rem', color: T.textMuted }}>
                  {activeConvo?.partnerRole === 'company' ? '🏢 Company' : '🎓 Student'}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              {/* View profile button (only for companies viewing students) */}
              {role === 'company' && activeConvo?.partnerRole === 'student' && (
                <button
                  onClick={() => navigate(`/candidate/${activePartner}`)}
                  style={{
                    padding: '6px 14px', borderRadius: 8,
                    border: `1px solid ${T.cardBorder}`, background: 'transparent',
                    color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  View Profile →
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((msg, idx) => {
                const isMine = msg.sender?._id === myId;
                return (
                  <div key={msg._id || idx} style={{
                    display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '70%', padding: '10px 16px',
                      borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isMine ? T.myBubble : T.theirBubble,
                      border: `1px solid ${isMine ? 'rgba(139,92,246,0.15)' : T.cardBorder}`,
                    }}>
                      <div style={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: T.textMuted, marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                        {formatTime(msg.createdAt)}
                        {isMine && msg.read && <span style={{ marginLeft: 6, color: '#10b981' }}>✓ Read</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
              padding: '14px 24px', borderTop: `1px solid ${T.cardBorder}`,
              background: T.card, display: 'flex', gap: 10, alignItems: 'flex-end',
            }}>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12,
                  background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                  color: T.text, fontSize: '0.88rem', fontFamily: 'inherit',
                  resize: 'none', outline: 'none', lineHeight: 1.5,
                  maxHeight: 120, minHeight: 40,
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 12, border: 'none',
                  background: (!newMessage.trim() || sending)
                    ? (isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.1)')
                    : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: '#fff', fontSize: '0.88rem', fontWeight: 600,
                  cursor: (!newMessage.trim() || sending) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', flexShrink: 0,
                  boxShadow: (!newMessage.trim() || sending) ? 'none' : '0 2px 10px rgba(139,92,246,0.2)',
                  transition: 'all 0.2s ease',
                }}
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
