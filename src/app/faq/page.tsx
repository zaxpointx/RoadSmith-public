import type { Metadata } from 'next'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import styles from './faq.module.css'

export const metadata: Metadata = {
  title: 'FAQ — Roadsmith',
  description: 'Answers about Roadsmith for driving-school owner-operators.',
}

const QUESTIONS = [
  ['What is Roadsmith?', 'Roadsmith is an operating layer for driving-school owners. It brings parent inquiries, capacity, travel-aware context, payments, reminders, bookings, and post-lesson notes into one clearer daily view.'],
  ['Who is Roadsmith for?', 'Roadsmith is designed for owner-operators and small driving schools that need to keep the day moving without losing judgment or context.'],
  ['Does Roadsmith make decisions automatically?', 'Roadsmith is approval-gated where a decision affects a parent, instructor, payment, or schedule. It prepares context and the next safe action; the owner stays in control.'],
  ['How does travel-aware scheduling work?', 'Behind-the-wheel timing depends on the instructor’s route, pickup locations, and the sequence of the day. Roadsmith presents that context instead of treating every lesson like an isolated fixed slot.'],
  ['Can I see the product before signing up?', 'Yes. The demo route opens a sandbox experience with clearly labeled demo data so you can inspect the operator workflow before connecting a real school.'],
  ['Does Roadsmith replace my existing tools?', 'Roadsmith is intended to connect the work already happening across scheduling, payments, communication, and records. The exact integration surface depends on the school’s current setup.'],
  ['How do I talk with the Roadsmith team?', 'Use the contact page to request a conversation. We will follow up with the next useful step for your school.'],
]

export default function FAQPage() {
  return (
    <MarketingLayout>
      <main className={styles.page}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Questions, answered</p>
          <h1>Clarity before you commit.</h1>
          <p>Roadsmith is built around the real operating day of a driving school. Here is the short version of how it works.</p>
        </header>
        <section className={styles.list} aria-label="Frequently asked questions">
          {QUESTIONS.map(([question, answer]) => (
            <details key={question} className={styles.item}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
      </main>
    </MarketingLayout>
  )
}
