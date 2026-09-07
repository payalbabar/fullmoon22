import React, { useState } from 'react';
import { MessageSquare, X, Star, Send, CheckCircle2 } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

type FeedbackCategory = 'Bug' | 'UX' | 'Feature Request' | 'General';

const CATEGORIES: FeedbackCategory[] = ['Bug', 'UX', 'Feature Request', 'General'];

const FEEDBACK_ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT || '';
const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL || 'feedback@example.com';

export const FeedbackWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [category, setCategory] = useState<FeedbackCategory>('General');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleOpen = () => {
    setOpen(true);
    trackEvent('feedback_opened');
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setRating(0);
      setHoveredRating(0);
      setCategory('General');
      setComment('');
      setSubmitted(false);
      setError('');
    }, 300);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      rating,
      category,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
      page: window.location.href,
    };

    try {
      if (FEEDBACK_ENDPOINT) {
        const res = await fetch(FEEDBACK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
      } else {
        const subject = encodeURIComponent(`[Midnight Lottery Feedback] ${category} — ${rating}/5 stars`);
        const body = encodeURIComponent(
          `Rating: ${rating}/5\nCategory: ${category}\n\nComment:\n${comment || '(no comment)'}\n\nTimestamp: ${payload.timestamp}`
        );
        window.open(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`, '_blank');
      }

      trackEvent('feedback_submitted', { category });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={handleOpen}
        title="Share your feedback"
        aria-label="Share your feedback"
        style={{
          position: 'fixed',
          bottom: '1.75rem',
          right: '1.75rem',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'var(--accent-gradient)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 25px rgba(139, 92, 246, 0.5)',
          zIndex: 1500,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08) translateY(-2px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.7)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 25px rgba(139, 92, 246, 0.5)';
        }}
      >
        <MessageSquare size={22} color="#ffffff" />
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 8, 15, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: '1.75rem',
            zIndex: 1600,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card card-glowing-purple"
            style={{
              width: '380px',
              maxWidth: '100%',
              padding: '1.85rem',
              background: 'rgba(11, 15, 29, 0.96)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <MessageSquare size={18} color="var(--accent-purple-light)" />
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffffff' }}>Share Feedback</span>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Close feedback"
                aria-label="Close feedback"
              >
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              /* Success State */
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div
                  style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '18px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto',
                  }}
                >
                  <CheckCircle2 size={32} color="#10b981" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem', color: '#ffffff' }}>
                  Thank you!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Your feedback directly improves the Midnight Privacy Lottery dApp.
                </p>
                <button
                  onClick={handleClose}
                  className="btn btn-secondary"
                  style={{ marginTop: '1.5rem', width: '100%' }}
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form */
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  How is your experience?
                </p>
                <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1.25rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        transition: 'transform 0.15s ease',
                        transform: (hoveredRating || rating) >= star ? 'scale(1.15)' : 'scale(1)',
                      }}
                      aria-label={`${star} star rating`}
                    >
                      <Star
                        size={24}
                        fill={(hoveredRating || rating) >= star ? '#f59e0b' : 'transparent'}
                        color={(hoveredRating || rating) >= star ? '#f59e0b' : 'rgba(255, 255, 255, 0.18)'}
                      />
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Category
                </p>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      style={{
                        padding: '0.38rem 0.8rem',
                        borderRadius: '9999px',
                        border: `1px solid ${category === cat ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                        background: category === cat ? 'rgba(139, 92, 246, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                        color: category === cat ? '#ffffff' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Tell us what you think or report an issue..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="input-field"
                  style={{ resize: 'none', marginBottom: '0.35rem', fontSize: '0.88rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {comment.length}/500
                </div>

                {error && (
                  <p style={{ color: 'var(--accent-rose)', fontSize: '0.825rem', marginBottom: '0.75rem' }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ width: '100%', gap: '0.55rem' }}
                >
                  {submitting ? 'Submitting...' : (
                    <>
                      <Send size={15} />
                      <span>Send Feedback</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
