"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SignInPageProps {
  className?: string;
}

// Minimal animated dot grid background
const AnimatedDotGrid = ({ reverse = false }: { reverse?: boolean }) => {
  const [time, setTime] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const speed = reverse ? 4 : 3;

  useEffect(() => {
    startTimeRef.current = Date.now();
    const animate = () => {
      setTime((Date.now() - startTimeRef.current) / 1000);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [reverse]);

  const dots = useMemo(() => {
    const cols = 60;
    const rows = 40;
    return Array.from({ length: cols * rows }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return { col, row, i };
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.9)_0%,_transparent_70%)]" />
      <svg
        className="absolute inset-0 w-full h-full opacity-60"
        xmlns="http://www.w3.org/2000/svg"
      >
        {dots.map(({ col, row, i }) => {
          const spacing = 20;
          const x = col * spacing + (spacing - 3) / 2;
          const y = row * spacing + (spacing - 3) / 2;
          const centerX = 60 * spacing / 2;
          const centerY = 40 * spacing / 2;
          const dist = Math.sqrt(
            Math.pow(col - centerX / spacing, 2) +
              Math.pow(row - centerY / spacing, 2)
          );
          const jitter = ((i * 17) % 23) / 100;
          const timing = reverse
            ? (Math.max(60, 40) - dist) * 0.02 + jitter * 0.2
            : dist * 0.01 + jitter * 0.15;
          const phase = timing * speed;
          const visible = Math.sin((time - phase) * 0.5);
          const opacity = reverse
            ? visible > 0 ? 0 : Math.min(1, Math.abs(visible) * 1.25)
            : visible > 0 ? Math.min(1, visible * 1.25) : 0;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={2}
              fill={`rgba(255,255,255,${Math.max(0, opacity * 0.8)})`}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const SignInPage = ({ className }: SignInPageProps) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
  const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: 'demo@roadsmith.io', pin: '0000' }),
      });
      if (res.ok) {
        setReverseCanvasVisible(true);
        setTimeout(() => setInitialCanvasVisible(false), 50);
        setTimeout(() => {
          router.replace('/school-admin');
        }, 1500);
      } else {
        setError('Demo unavailable — try again.');
        setLoading(false);
      }
    } catch {
      setError('Demo unavailable — try again.');
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex w-[100%] flex-col min-h-screen bg-black relative", className)}>
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        {initialCanvasVisible && <AnimatedDotGrid reverse={false} />}
        {reverseCanvasVisible && <AnimatedDotGrid reverse={true} />}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,1)_0%,_transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width='18' height='18' viewBox='0 0 16 16' fill='none'>
                <path d='M8 2L13 5.5H3L8 2Z' fill='black' fillOpacity='0.9' />
                <path d='M3 5.5V10.5L8 14V8.5H13V5.5H3Z' fill='black' fillOpacity='0.6' />
              </svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.1em', fontFamily: "'Outfit', sans-serif" }}>Road<span style={{ color: 'var(--success)' }}>SMITH</span></span>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '40px 32px',
          }}>
            <h1 style={{
              fontFamily: "'Outfit', serif",
              fontStyle: 'italic',
              fontWeight: '600',
              fontSize: '26px',
              color: 'var(--text-primary)',
              textAlign: 'center',
              marginBottom: '8px',
              letterSpacing: '-0.01em',
            }}>
              Sign in to your school
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginBottom: '36px',
            }}>
              Welcome back
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {error && (
                <p style={{ fontSize: '13px', color: '#EF4444', textAlign: 'center' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: 'var(--success)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'background 0.2s',
                  marginTop: '4px',
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#6ef59d'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--success)'; }}
              >
                {loading ? 'Signing in...' : 'Continue'}
              </button>
            </form>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '24px 0',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = 'var(--success)'; e.currentTarget.style.color = 'var(--success)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Try demo
            </button>

            <p style={{
              textAlign: 'center',
              fontSize: '13px',
              color: 'var(--text-muted)',
              marginTop: '24px',
            }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" style={{ color: 'var(--success)', textDecoration: 'none' }}>
                Sign up →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
