import { NextResponse } from 'next/server'

export async function GET() {
  const emails = [
    {
      id: '1',
      recipient: 'Demo Student A',
      subject: 'Lesson Confirmation — June 3rd at 2:00 PM',
      preview: 'This confirms your behind-the-wheel lesson on Tuesday at 2:00 PM with your assigned instructor. Please arrive 10 minutes early to the pickup location.',
      sentAt: '2 hours ago',
    },
    {
      id: '2',
      recipient: 'Demo Family B',
      subject: 'Payment Received — Driver Ed Package',
      preview: 'Thank you for your payment of $650 for the Complete Driver Ed Package. Your student is now confirmed for the June session starting June 10th.',
      sentAt: '5 hours ago',
    },
    {
      id: '3',
      recipient: 'Demo Student C',
      subject: 'Session Reminder — Tomorrow at 10:00 AM',
      preview: 'Just a friendly reminder that your driving lesson is scheduled for tomorrow morning at 10:00 AM. See you then!',
      sentAt: '1 day ago',
    },
    {
      id: '4',
      recipient: 'Demo Student D',
      subject: 'Balance Due Notice — Lesson Package',
      preview: 'Our records show a remaining balance of $200 on your lesson package. Please complete payment before your next scheduled session.',
      sentAt: '2 days ago',
    },
    {
      id: '5',
      recipient: 'Demo Student E',
      subject: 'Welcome to Roadsmith!',
      preview: "Welcome! We're excited to have you enrolled. Your first lesson is coming up soon — we'll send a reminder 48 hours before. In the meantime, feel free to review the parallel parking guide we sent.",
      sentAt: '3 days ago',
    },
  ]

  return NextResponse.json({ emails })
}
