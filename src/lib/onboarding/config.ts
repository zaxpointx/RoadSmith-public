/**
 * Onboarding Agent — State Machine Config
 *
 * Defines conversational responses, prompts, and suggestions
 * for each state in the onboarding flow. The "AI personality"
 * is entirely config-driven (no external LLM needed).
 */

export type OnboardingState =
  | 'started'
  | 'students_import'
  | 'instructors_added'
  | 'session_types_set'
  | 'complete'

export interface OnboardingStep {
  /** The message the agent sends when entering this state */
  greeting: string
  /** Quick-reply buttons shown to the user */
  suggestions: string[]
  /** How to process the user's reply at this step */
  handler: 'greeting' | 'students_response' | 'add_instructor' | 'session_types_response' | 'finish'
}

export type OnboardingConfig = Record<OnboardingState, OnboardingStep>

export const ONBOARDING_CONFIG: OnboardingConfig = {
  started: {
    greeting:
      "Hey! 👋 I'm your setup assistant. I'll help you get your school running fast.\n\nDo you already have students you want to import, or are you starting fresh?",
    suggestions: ['I have a CSV of students', 'Starting from scratch — no students yet'],
    handler: 'greeting',
  },

  students_import: {
    greeting:
      "Great choice! Let's get your students in the system.\n\nIf you have a CSV file with columns like student_name, email, phone, permit_number, DOB — just upload it and I'll map everything automatically.\n\nOr if you'd rather add students one at a time later, we can skip this and move to instructors.",
    suggestions: ['Upload my CSV', 'Skip — add students later'],
    handler: 'students_response',
  },

  instructors_added: {
    greeting:
      "Awesome! Now let's add your instructors.\n\nMost driving schools start with 1-3 instructors. I'll walk you through adding them one by one. You'll need:\n\n• Name\n• Email\n• Phone (optional)\n\nReady to add your first instructor?",
    suggestions: ['Add an instructor', 'I\'ll add instructors later'],
    handler: 'add_instructor',
  },

  session_types_set: {
    greeting:
      "You're making great progress! 🎉\n\nNow let's set up your session types — these are the lessons students will book and pay for.\n\nMost schools charge $45–60 for a 2-hour behind-the-wheel lesson. What do you want to offer?\n\nCommon types: Behind-the-Wheel Lesson ($50), Drive Test Prep ($65)",
    suggestions: ['Set up a Behind-the-Wheel Lesson', 'Set up a Drive Test Prep', 'Skip for now'],
    handler: 'session_types_response',
  },

  complete: {
    greeting:
      "You're all set! 🎉 Here's what we've set up:\n\n✅ Students imported / ready to import\n✅ Instructors added\n✅ Session types configured\n\nYour dashboard is ready — I'll be here if you need anything.",
    suggestions: ['Take me to my dashboard', 'Re-run the tour'],
    handler: 'finish',
  },
}

/**
 * Contextual reply generator.
 * Given current state + user message, returns the next agent response
 * and what state to transition to.
 */
export function processUserReply(
  currentState: OnboardingState,
  userMessage: string,
  data?: Record<string, unknown>
): { response: string; nextState: OnboardingState; actions?: string[] } {
  const msg = userMessage.toLowerCase().trim()

  switch (currentState) {
    case 'started': {
      if (msg.includes('csv') || msg.includes('upload') || msg.includes('import') || msg.includes('have student')) {
        return {
          response:
            "Perfect! Let's import your students.\n\nHead over to the import page and upload your CSV. I support columns like: student_name, email, phone, permit_number, DOB, parent_email.\n\nOr if you want to do it right here, paste your CSV data below and I'll process it.",
          nextState: 'students_import',
          actions: ['open_import_page'],
        }
      }
      return {
        response:
          "Starting fresh — I like it! Let's build from the ground up.\n\nFirst up: let's add your instructors so you can start scheduling lessons.",
        nextState: 'instructors_added',
      }
    }

    case 'students_import': {
      if (msg.includes('upload') || msg.includes('csv') || msg.includes('paste')) {
        return {
          response:
            "Go to Students → Import in the sidebar to upload your CSV file. It'll preview the first few rows so you can verify the column mapping before importing.\n\nOnce you're done, come back here and I'll walk you through the next steps!",
          nextState: 'instructors_added',
          actions: ['open_import_page'],
        }
      }
      return {
        response:
          "No problem! You can always import students later from the Students tab.\n\nNow let's get your instructors set up.",
        nextState: 'instructors_added',
      }
    }

    case 'instructors_added': {
      if (msg.includes('add') || msg.includes('instructor') || msg.includes('yes') || msg.includes('ready')) {
        return {
          response:
            "Let's add an instructor!\n\nOpen the Instructors page from the sidebar and click \"Add Instructor\". Enter their name, email, and phone, then hit save.\n\nOnce you've added at least one instructor, come back and tell me you're done!",
          nextState: 'session_types_set',
          actions: ['open_instructors_page'],
        }
      }
      return {
        response:
          "No worries — you can always add instructors later. Let's move on to setting up your lesson offerings.",
        nextState: 'session_types_set',
      }
    }

    case 'session_types_set': {
      if (msg.includes('behind') || msg.includes('wheel') || msg.includes('lesson') || msg.includes('set') || msg.includes('yes') || msg.includes('setup')) {
        return {
          response:
            "Great choice! A standard Behind-the-Wheel Lesson is typically 2 hours. I'll create one with a $50 deposit for you.\n\nOpen Session Types from the sidebar to customize duration, price, and add more types. Most schools also offer Drive Test Prep.\n\nWhen you're happy with your offerings, tell me you're done!",
          nextState: 'complete',
          actions: ['open_session_types'],
        }
      }
      return {
        response:
          "No problem — you can always configure session types later from Settings. Let's wrap up your setup!",
        nextState: 'complete',
      }
    }

    case 'complete': {
      if (msg.includes('dashboard') || msg.includes('take') || msg.includes('go') || msg.includes('yes')) {
        return {
          response:
            "Here you go! Your dashboard is all set up and ready to go.\n\nRemember: I'm always available in the bottom-right corner if you need help.",
          nextState: 'complete',
          actions: ['go_to_dashboard'],
        }
      }
      return {
        response:
          "Sure! Let's go through it again from the beginning.",
        nextState: 'started',
      }
    }

    default:
      return {
        response: "I'm not sure what to do here. Let's start over!",
        nextState: 'started',
      }
  }
}
