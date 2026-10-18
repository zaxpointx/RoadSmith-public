'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Inbox, CheckCircle2 } from 'lucide-react';
import EmptyState from '@/components/admin/EmptyState';

type BookingRow = {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  deposit_amount_cents?: number | null;
  balance_due_cents?: number | null;
  created_at?: string | null;
  student_name?: string | null;
  session_date?: string | null;
  session_time?: string | null;
};

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatTime(timeStr?: string | null) {
  if (!timeStr) return '';
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(timeStr);
  let hour = Number(match[1]);
  const minute = match[2];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

function formatBookingDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function bookingTone(status?: string | null, paymentStatus?: string | null): 'green' | 'amber' | 'red' | 'blue' | 'grey' {
  const s = String(status ?? '').toLowerCase();
  const p = String(paymentStatus ?? '').toLowerCase();
  if (s === 'cancelled' || s === 'canceled' || s === 'no_show' || s === 'no-show') return 'red';
  if (p === 'paid' || s === 'confirmed' || s === 'completed') return 'green';
  if (s === 'pending' || s === 'pending_payment' || p === 'pending') return 'amber';
  return 'blue';
}

function bookingLabel(status?: string | null, paymentStatus?: string | null) {
  const s = String(status ?? '').toLowerCase();
  const p = String(paymentStatus ?? '').toLowerCase();
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  if (s === 'no_show' || s === 'no-show') return 'No show';
  if (s === 'completed') return 'Completed';
  if (p === 'paid' || s === 'confirmed') return 'Confirmed';
  if (s === 'pending_payment' || s === 'pending') return 'Pending';
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending';
}

function timeAgo(dateStr?: string | null) {
  if (!dateStr) return '';
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RecentBookingsCard({
  bookings,
  lastUpdated,
  onRefresh,
}: {
  bookings: BookingRow[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const rows = (bookings ?? []).slice(0, 6);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      window.setTimeout(() => setRefreshing(false), 400);
    }
  }

  return (
    <section className="dash-card" data-testid="recent-bookings-card">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Bookings</p>
          <h2 className="dash-section-title">Recent bookings</h2>
        </div>
        <div className="dash-section-actions">
          {lastUpdated && <span className="dash-section-meta">Updated {timeAgo(lastUpdated.toISOString())}</span>}
          <button type="button" className="dash-btn-ghost" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh recent bookings">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No bookings yet"
          description="New bookings will appear here the moment a student books online. They'll show up automatically — no refresh needed."
          cta={{ label: 'Open calendar', href: '/school-admin/calendar' }}
          secondary={{ label: 'Set up booking page', href: '/school-admin/settings' }}
          hint="Tip: Share your booking link on social media to start taking reservations."
        />
      ) : (
        <div className="dash-feed-list">
          {rows.map((booking) => {
            const tone = bookingTone(booking.status, booking.payment_status);
            const label = bookingLabel(booking.status, booking.payment_status);
            const when = booking.session_date || booking.created_at;
            const time = formatTime(booking.session_time);
            const deposit = booking.deposit_amount_cents != null ? currency(Number(booking.deposit_amount_cents) / 100) : null;
            return (
              <div key={booking.id} className="dash-feed-item" data-testid="recent-booking-row">
                <span className={`dash-feed-dot dash-status-dot ${tone}`} />
                <div className="dash-feed-content">
                  <p className="dash-feed-text">
                    <strong>{booking.student_name?.trim() || 'Unnamed student'}</strong>
                    {' · '}
                    {when ? formatBookingDate(when) : '—'}
                    {time ? ` at ${time}` : ''}
                  </p>
                  <p className="dash-feed-time">
                    <span className={`dash-pill dash-pill-${tone} dash-pill-tight`}>{label}</span>
                    {deposit && <span className="dash-feed-meta">Deposit {deposit}</span>}
                    Booked {timeAgo(booking.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

type ActivationStep = { key: string; label: string; done: boolean; href: string; icon: string };

export function ActivationChecklist({ progress }: { progress: { steps: ActivationStep[]; completedCount: number; totalCount: number } | undefined }) {
  if (!progress) return null;
  const { steps, completedCount, totalCount } = progress;
  const pct = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;
  const ringR = 18;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - pct / 100);

  return (
    <section className="dash-card">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Setup</p>
          <h2 className="dash-section-title">{allDone ? 'School is live' : 'Finish your setup'}</h2>
        </div>
        <div className="dash-section-actions">
          <div className="dash-ring">
            <svg width="44" height="44" viewBox="0 0 44 44" className="dash-ring-svg" aria-hidden>
              <circle cx="22" cy="22" r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle cx="22" cy="22" r={ringR} fill="none" stroke={allDone ? '#4ADE80' : '#A6FF3F'} strokeWidth="3" strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringOffset} className="dash-ring-fg" />
            </svg>
            <span className="dash-ring-label">{pct}%</span>
          </div>
        </div>
      </div>
      <div className="dash-progress">
        <div className={`dash-progress-fill${allDone ? ' done' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <div>
        {steps.map((step) => (
          <div key={step.key} className="dash-step-row">
            {step.done ? (
              <CheckCircle2 className="dash-step-check" />
            ) : (
              <span className="dash-step-pending"><span className="dash-step-pending-dot" /></span>
            )}
            <span className={`dash-step-text ${step.done ? 'done' : 'pending'}`}>{step.label}</span>
            {!step.done && (
              <Link href={step.href} className="dash-btn-ghost dash-btn-tiny">Complete</Link>
            )}
          </div>
        ))}
      </div>
      {!allDone && (
        <p className="dash-activation-note">
          Complete all steps to unlock full features. Your booking link goes live once you define session types and connect Stripe.
        </p>
      )}
    </section>
  );
}