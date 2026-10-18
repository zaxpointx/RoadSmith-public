# Public website route contract

| Route | Audience | Purpose | Backend dependency | Auth | Success state |
|---|---|---|---|---|---|
| `/` | Driving-school owner | Explain Roadsmith and route to demo/contact/trial | Existing links only | No | Visitor can reach every public conversion path |
| `/pricing` | Driving-school owner | Explain contact-sales offer without unverified pricing | Existing links only | No | Visitor can request a conversation |
| `/faq` | Driving-school owner | Answer verified product and workflow questions | None | No | Accessible disclosures open and close |
| `/contact` | Driving-school owner | Request a demo or conversation | New `/api/contact` route using existing email abstraction | No | Clear submitted or safe failure state |
| `/demo` | Evaluator/owner | Enter the existing sandbox operator demo | `/api/auth/demo-login` | Demo session | Visitor reaches the existing demo flow |
| `/login` | Existing owner/operator | Sign in | Existing Supabase auth | Yes after sign-in | Existing login behavior is preserved |
| `/signup` | New owner/operator | Create an account and school | Existing Supabase signup route | No before signup | Existing signup behavior is preserved |
| `/forgot-password` | Existing owner/operator | Recover access | Existing auth flow | No | Existing recovery behavior is preserved |
| `/legal/terms` | All visitors | Terms | None | No | Public legal document |
| `/legal/privacy` | All visitors | Privacy | None | No | Public legal document |

## Public navigation

Primary links are Home, How it works, Operator console, Demo, FAQ, Contact, and Sign in. The primary action is Request a demo / Start a trial, using the existing verified destination when possible.

## Contact contract

`POST /api/contact` accepts `name`, `email`, `schoolName`, and `message`. `name`, `email`, and `message` are required. The route validates input server-side, sends through the existing email abstraction, and returns a generic success or failure response without exposing provider errors or secrets. It does not write to Supabase.

Local verification must not intentionally submit a valid request while a real Resend key is configured.
