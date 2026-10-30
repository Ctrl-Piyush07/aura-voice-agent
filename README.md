# Aria — AI Voice Customer Support Agent

Aria is a browser-based AI voice assistant built for Aura Skincare, a fictional Indian D2C skincare brand. Customers can speak naturally to ask about orders, shipping, returns, damaged products, payment policies and cancellations.

**Live Application:** https://aura-voice-frontend.onrender.com

**Backend Health:** https://aura-voice-backend-2axh.onrender.com/api/health

## Features

- Browser-based speech recognition and text-to-speech
- Natural AI conversations using Google Gemini
- Indian English speech recognition preference
- Real backend function calling for mock order lookups
- Multi-turn conversational context
- Start Call and End Call controls
- Listening, Thinking and Speaking indicators
- Chronological, timestamped call transcript
- Structured JSON call outcome after each call
- Policy-aware responses and safety guardrails
- Helpful handling of missing or invalid order IDs

## Technology Stack

**Frontend:** React, Vite, JavaScript, CSS

**Voice:** Browser Web Speech API (SpeechRecognition and SpeechSynthesis)

**Backend:** Node.js, Express

**AI:** Google Gemini through the `@google/genai` SDK

**Data:** Local mock order database in `server/orders.json`

**Hosting:** Render Web Service and Render Static Site

## Architecture

```text
Customer speaks
      |
      v
Browser SpeechRecognition
      |
      v
React application
      |
      | POST /api/chat
      v
Express backend
      |
      v
Google Gemini
      |
      | If order details are needed
      v
get_order_details function
      |
      v
Mock order database
      |
      v
Verified order information
      |
      v
Gemini generates response
      |
      v
Backend response guardrails
      |
      v
React displays response
      |
      v
Browser SpeechSynthesis
      |
      v
Customer hears Aria
```

When the call ends, React displays the chronological conversation and generates a structured JSON outcome from the transcript.

## Project Structure

```text
aura-voice-agent/
├── public/
├── src/
│   ├── Components/
│   ├── hooks/
│   │   ├── useSpeechRecognition.js
│   │   └── useTextToSpeech.js
│   ├── services/
│   │   └── chatApi.js
│   ├── utils/
│   │   └── buildCallOutcome.js
│   └── App.jsx
├── server/
│   ├── index.js
│   ├── ariaInstructions.js
│   ├── orderToolDeclaration.js
│   ├── orderTools.js
│   ├── responseGuardrails.js
│   └── orders.json
├── package.json
└── README.md
```

## Local Setup

### Prerequisites

- Node.js and npm
- A Google Gemini API key
- Google Chrome or another compatible browser
- Microphone access

### 1. Clone the repository

```bash
git clone https://github.com/Ctrl-Piyush07/aura-voice-agent.git
cd aura-voice-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the backend

Create `server/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Never commit a real API key or `.env` file.

### 4. Start the backend

In the first terminal:

```bash
node server/index.js
```

Backend URL: http://localhost:3001

Health check: http://localhost:3001/api/health

### 5. Start the frontend

In a second terminal:

```bash
npm run dev
```

Frontend URL: http://localhost:5173

In development, the frontend uses `http://localhost:3001` by default. For another backend address, configure `VITE_API_BASE_URL` before building.

## How to Use

1. Open the application in a supported browser.
2. Allow microphone access.
3. Click **Start Call**.
4. Ask Aria a customer-support question.
5. Listen to the response and continue the conversation.
6. Click **End Call**.
7. Review the call transcript and structured JSON outcome.

## Sample Orders

| Order ID | Product                     | Status           |
| -------- | --------------------------- | ---------------- |
| ORD-101  | Vitamin C Serum 30ml        | Out for Delivery |
| ORD-102  | Hydrating Sunscreen SPF 50  | Delivered        |
| ORD-103  | Green Tea Face Wash + Toner | Processing       |

All orders are fictional test data.

Suggested demo questions:

- "Where is my order ORD-103?"
- "Can I cancel that order?"
- "Where is my order ORD-101?"
- "Can you cancel that order?"
- "What is your return policy?"
- "What happens if my product arrives damaged?"
- "Can I use cash on delivery for ₹2,600?"

## Customer Support Policies

- Shipping is free above ₹499.
- Orders below ₹499 have a ₹50 delivery fee.
- Standard delivery takes 3–5 business days.
- Returns are accepted within 7 days of delivery when products are unopened, unused and in their original packaging.
- Damaged products must be reported within 48 hours of delivery with photos.
- Only orders in Processing status are eligible for cancellation.
- Shipped or Out for Delivery orders cannot be cancelled; customers may refuse delivery.
- Cash on Delivery is available for orders up to ₹2,500, payable by cash or UPI.

For orders exactly ₹499, the shipping fee is not specified in the provided policy. Aria is instructed not to invent a rule.

## Safety and Limitations

Aria uses verified mock order records rather than generating order details from memory.

The backend includes system instructions and a response filter to reduce unsupported promises, including false claims about connecting customers to human support.

Aria can explain cancellation eligibility but cannot actually cancel, refund, replace or modify orders.

The current implementation does not support real human call transfers, payment processing or integration with a production order-management system.

Speech recognition accuracy depends on browser support, microphone quality, pronunciation and background noise.

Call transcripts and structured outcomes are maintained in the browser application during the session; they are not persisted in a production database.

The post-call JSON uses rule-based classification and may not capture every complex conversation perfectly.

Render's free backend may become inactive when unused, making the first request slower.

## Engineering Reflections

### 1. Why this architecture and technology stack?

### 1. Why this architecture and technology stack?

I chose this technology stack because I have been working with the MERN stack for the past 1.5 years and have gained hands-on experience through various projects. Since I am already comfortable with React, Node.js, and Express, I could focus more on implementing the AI voice agent's functionality rather than spending time learning a completely new technology stack.

I used React to build an interactive user interface and Node.js with Express to handle backend operations, API requests, and order lookups. I integrated Google Gemini for natural language understanding and conversational responses, along with the Web Speech API for speech recognition and text-to-speech.

I also kept the frontend and backend separate to make the application easier to maintain, test, and scale. This architecture allows me to extend the project with additional features and business integrations in the future.

### 2. What was the hardest problem, and how did I solve it?

The most hardest part was handling edge case response of the AI agent.Initially it was giving unusual response which are out of scope of this brand.So,i tried various fixes and somehow got through it.

One such example is I strengthened the system instructions and added backend response validation for unsupported human-transfer promises.

### 3. What would I improve with one more week?

As far as i have i tried to study about the datastraw company and its sevices,If I had more time, I would evolve Aria from an Aura Skincare-specific voice agent into a configurable AI customer support platform.

The core technology—React, Express, Gemini, and voice recognition—would remain the same. Each business would have its own configuration for branding, policies, customer data, and integrations.

For example, the same AI engine could support a skincare brand, a fashion store, or an electronics company without rebuilding the entire application.

This would make Aria more scalable, reusable, and valuable for a company like DataStraw that works with multiple clients.

### 4. How would I scale this to 1,000 conversations per day?

I would deploy the frontend through a CDN and run the backend on an autoscaling service with multiple stateless instances.

I would replace the mock JSON order database with a secure database or order-management API and introduce authentication, rate limiting, request validation and monitoring.

I would persist conversation sessions and outcomes in a managed datastore with retention controls, track AI latency and errors, and introduce queues or asynchronous processing for non-real-time work.

I would also monitor Gemini API usage, costs and concurrency, and implement retries and graceful failure handling where appropriate.

## Deployment

The application is deployed on Render using two services:

**Frontend**

- Type: Static Site
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_BASE_URL`

**Backend**

- Type: Web Service
- Build command: `npm install`
- Start command: `node server/index.js`
- Environment variables: `GEMINI_API_KEY`, `FRONTEND_URL`

The Gemini API key is configured only on the backend.

## Project Context

Built as an AI Voice Agent internship assessment for DataStraw Technologies. Aura Skincare and its sample customer records are fictional and used solely for demonstration.
