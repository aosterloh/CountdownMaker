# Agent Interaction & Execution Protocols

## Operating Modes
1. **DISCUSSION / PLAN MODE (Default when logic/design is mentioned)**
   - Trigger: Any message discussing app logic, architectural concerns, or bug theories without an explicit command to implement or wdyt? question
   - Rule: DO NOT write, touch, or modify any files.
   - Action: Analyze root cause, ask clarifying questions on expected vs. actual behavior, and present an implementation proposal first.

2. **IMPLEMENTATION MODE**
   - Trigger: User explicitly instructs "Apply", "Implement", or says "Proceed with code".
   - Rule: Execute local file edits, run local verification tests, and keep the server running locally.

3. **DEPLOYMENT MODE**
   - Trigger: Explicit command starting with "Deploy to Cloud Run" or "go cloud".
   - Rule: NEVER run deployment scripts, gcloud build/deploy commands, or Docker container pushes unless explicitly requested with the keyword "Deploy" or "go cloud".
   - Default: All execution and verification must remain strictly local.

## Hard Constraints
- If the user says something is "off", "wrong", or "broken", treat this as an investigation prompt. Ask 2-3 targeted diagnostic questions instead of immediately generating replacement code.


## Model use
- use the latest Gemini models or ask user which version to use during initial project setup. Do not use older models.

## Authentication Standard (Default Pattern)
Every web application built or modified MUST enforce corporate Googler authentication via Firebase:

1. **Authentication Mechanism**:
   - Google Sign-In via Firebase Auth. No manual passwords or passcodes.
   - Present a clean Google-branded "Sign in with Google" screen before rendering app features.

2. **Hardcoded Firebase Configuration**:
   ```javascript
   export const firebaseConfig = {
     apiKey: "AIzaSyBDfu44ElID27cy2lvozY2BD1izTq7AIuo",
     authDomain: "aosterloh-cs-muc.firebaseapp.com",
     projectId: "aosterloh-cs-muc",
     storageBucket: "aosterloh-cs-muc.appspot.com",
     appId: "1:557450838719:web:5e51f"
   };
   ```

3. **Googler Domain Restriction (@google.com)**:
   - Configure `GoogleAuthProvider` with `provider.setCustomParameters({ hd: 'google.com', prompt: 'select_account' })`.
   - On `onAuthStateChanged`, verify `user.email.toLowerCase().endsWith('@google.com')`.
   - If not `@google.com`, immediately call `auth.signOut()` and show an "Access Denied: @google.com accounts only" message.
 