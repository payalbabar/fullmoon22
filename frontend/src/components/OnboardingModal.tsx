import React, { useState, useEffect } from 'react';
import { Shield, Ticket, Trophy, Wallet, X, Lock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

const STORAGE_KEY = 'midnight_lottery_onboarding_complete';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Shield size={40} color="#8b5cf6" />,
    title: 'Welcome to Midnight Privacy Lottery',
    description:
      'A fully decentralized, privacy-preserving lottery built on Midnight Network. Your identity stays completely hidden — only a zero-knowledge commitment is stored on-chain.',
    highlight: 'Zero-Knowledge. Fully On-Chain.',
  },
  {
    icon: <Ticket size={40} color="#00f2fe" />,
    title: 'How the Lottery Works',
    description:
      'Buy a ticket by depositing 1 tNIGHT. A private random salt is generated for you and hashed into a ZK commitment. When the round closes, a VRF seed selects the winning ticket fairly.',
    highlight: 'Your secret salt is never revealed on-chain.',
  },
  {
    icon: <Lock size={40} color="#10b981" />,
    title: 'Why Zero-Knowledge?',
    description:
      'Traditional lotteries expose all participants publicly. Midnight uses Compact smart contracts so you can prove you own a winning ticket without revealing which ticket is yours or linking it to your identity.',
    highlight: 'Privacy-first. Trustless. Verifiable.',
  },
  {
    icon: <Wallet size={40} color="#f59e0b" />,
    title: 'Connect Your Wallet',
    description:
      'Use Lace Wallet or 1AM Wallet browser extension to interact with Midnight Network. Switch to the Preprod network and connect using the button in the top right.',
    highlight: 'Midnight DApp Connector API v4 Compatible.',
  },
  {
    icon: <Trophy size={40} color="#8b5cf6" />,
    title: "You're Ready to Play",
    description:
      "Once your wallet is connected: click 'Buy Ticket' to enter the lottery, wait for the draw, and if you win — click 'Claim Prize' to verify your ZK ticket proof and receive the pot.",
    highlight: 'All transactions happen live on Midnight Preprod.',
  },
];

export const OnboardingModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setVisible(true);
      trackEvent('onboarding_started');
    }

    const handleOpenEvent = () => {
      setStep(0);
      setVisible(true);
    };

    window.addEventListener('open-onboarding', handleOpenEvent);
    return () => window.removeEventListener('open-onboarding', handleOpenEvent);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'ArrowRight' && step < steps.length - 1) setStep((s) => s + 1);
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, step]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    trackEvent('onboarding_completed', { step: step + 1 });
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    trackEvent('onboarding_skipped', { step: step + 1 });
  };

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 8, 15, 0.88)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSkip();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card card-glowing-purple"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '2.5rem',
          position: 'relative',
          background: 'rgba(11, 15, 29, 0.96)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.16s ease',
          }}
          title="Close guide (Esc)"
          aria-label="Close guide"
        >
          <X size={18} />
        </button>

        {/* Step Progress Indicators */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                height: '4px',
                flex: 1,
                borderRadius: '2px',
                background: i <= step ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.08)',
                boxShadow: i <= step ? '0 0 8px rgba(139, 92, 246, 0.4)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Step Icon */}
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(0, 242, 254, 0.1) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 10px 30px rgba(139, 92, 246, 0.25)',
          }}
        >
          {current.icon}
        </div>

        {/* Content */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', lineHeight: 1.25, color: '#ffffff' }}>
          {current.title}
        </h2>
        
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.35rem', fontSize: '0.96rem' }}>
          {current.description}
        </p>

        {current.highlight && (
          <div
            style={{
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.32)',
              borderRadius: '12px',
              padding: '0.8rem 1.15rem',
              marginBottom: '2rem',
              fontSize: '0.88rem',
              color: 'var(--accent-purple-light)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
            }}
          >
            <Sparkles size={16} color="var(--accent-cyan)" />
            <span>{current.highlight}</span>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          {step > 0 && (
            <button
              onClick={handleBack}
              className="btn btn-secondary"
              style={{ gap: '0.4rem', flex: '0 0 auto' }}
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={handleNext}
            className="btn btn-primary"
            style={{ gap: '0.55rem', flex: 1, fontWeight: 700 }}
          >
            {isLast ? (
              <>
                <span>Start Playing</span>
                <Trophy size={16} />
              </>
            ) : (
              <>
                <span>Next Step</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Step counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>Step {step + 1} of {steps.length}</span>
          {step < steps.length - 1 && (
            <button
              onClick={handleSkip}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                textDecoration: 'underline',
              }}
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
