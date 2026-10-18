'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import styles from './contact.module.css'

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setStatus('error')
      setError(data.error ?? 'Please check your details and try again.')
      return
    }
    setStatus('sent')
    event.currentTarget.reset()
  }

  return (
    <MarketingLayout>
      <main className={styles.page}>
        <section className={styles.intro}>
          <p className={styles.eyebrow}>Start with the real day</p>
          <h1>Let’s make the school easier to run.</h1>
          <p>Tell us where the work is getting stuck. We’ll show you the Roadsmith path that fits your school, without a sales maze.</p>
          <Link href="/demo" className={styles.secondaryLink}>Prefer to look first? Open the sandbox demo →</Link>
        </section>
        <form className={styles.form} onSubmit={submit}>
          <label>Name<input name="name" required autoComplete="name" placeholder="Your name" /></label>
          <label>Work email<input name="email" required type="email" autoComplete="email" placeholder="you@yourschool.com" /></label>
          <label>School name<input name="schoolName" required autoComplete="organization" placeholder="Your driving school" /></label>
          <label>What should we understand?<textarea name="message" required rows={6} placeholder="Tell us what currently takes too much attention." /></label>
          {status === 'error' && <p className={styles.error} role="alert">{error}</p>}
          {status === 'sent' && <p className={styles.success} role="status">Thanks — your request is ready for a follow-up.</p>}
          <button type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Request a conversation →'}</button>
          <p className={styles.note}>No charge is made by this form. We will only use your details to respond to this request.</p>
        </form>
      </main>
    </MarketingLayout>
  )
}
