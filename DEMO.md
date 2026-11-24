# Roadsmith demo

A 10-minute walkthrough of the product on your own machine. Everything is synthetic: a fictional school (Larkspur Driving School, Nashville), fictional families, phone numbers in the 555 range, and a test checkout. No text messages, emails or charges leave your computer, and no account or key is needed.

## Start it

Requirements: Node.js 22.6+ and npm.

```bash
npm ci
npm run dev
```

Open:

- **http://localhost:3000/sandbox**: text the school as any person
- **http://localhost:3000/app**: the owner's Control Center (one click to sign in as the demo owner)

The first page load creates the sandbox database in `.roadsmith/` and seeds it, which takes a few seconds. **Reset sandbox** (on the sandbox page) puts everything back to the starting data.

## The journey

1. **A new parent asks.** On the sandbox page, pick **New parent** and text: `Hi! How much are lessons?` Then `I want to book a driving lesson for my daughter`. Answer the questions (`my daughter`, `Olivia Grant 04/02/2010`, `1500 Riverside Dr, Nashville TN 37206`, `permit TN55512345`). The times you're offered come from the scheduler: instructor hours, holidays, time off, classes and the drive between pickups.
2. **Book and pay.** Reply with a letter. You get a hold and a payment link. Open it, try **Simulate a declined card** (a retry link is texted), then **Pay with a test card**. The confirmation text arrives, and the instructor is told about the new lesson.
3. **A full class.** Text `Do you have drivers ed classes?`, pick the class with one seat left, and register a student. The seat is held. Try the same class from another number (type any number under "Text as") and you'll be offered the next class instead.
4. **Changes.** As **Linda Carter** (Emma's mom): `Can we move it to Saturday morning?` and pick a time. As **James Rivera**: `cancel my lesson tomorrow`, then `yes`. A paid cancellation sends the refund to the owner for approval.
5. **Things it won't decide.** As Linda: `Emma was in a fender bender during practice, is she ok to drive?` This goes to the owner as urgent, and the owner gets a text.
6. **Instructors, with no app.** As **John Smith**: `schedule tomorrow`, `who's next`, `running 15 min late` (the next family is told), `block friday 9-11am dentist`.
7. **The owner.** Open **Control Center**. The **Today** page shows what needs you, what was handled, each instructor's route and the money collected.
   - **Draft drive times** for last week's class: Roadsmith schedules every student's behind-the-wheel lesson, grouped by neighborhood, and skips the student without a permit. Approve it and each family gets their time.
   - Or do it by text as **Maya Torres**: `plan drives`, `inbox`, `approve 1`.
8. **Time.** On the sandbox page, **Tomorrow 7am** jumps the clock. Instructors get their morning schedules, the owner gets a brief, reminders go out, and unpaid holds are released.
9. **Control.** In **Playbook**, set **Book driving lessons** to **Ask me first** and save. Book again as a parent: the request lands in your inbox as a one-click approval.
10. **Tenant isolation.** Switch "School being texted" to **Harbor Point Driving** and text as Linda. That school has never heard of her and sees nothing from Larkspur.

## About the assistant's replies

Without an `ANTHROPIC_API_KEY`, replies come from Roadsmith's built-in interpreter. It handles the requests above and hands anything else to the owner. To use Claude for natural conversation, add a key to `.env.local` (see `.env.example`) and restart. Both engines use the same permission-checked tools. The sandbox banner and the Playbook page show which engine is active.

How it works and what's verified: [docs/OS.md](docs/OS.md).
