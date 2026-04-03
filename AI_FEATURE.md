# Feature: AI-Driven Situation Reports (SitReps)

**Branch:** `feature/ai-sitrep`

## Overview
To give our hackathon project a major "Wow" factor for the judges, I have implemented the core **AI Layer** outlined in our initial roadmap. The backend can now dynamically generate realistic, geopolitical-style situation reports based on the exact outcome of a simulation run.

## What Was Added
1. **`aiService.ts`**: Safely connects to Google's Gemini LLM. It compiles the simulation's final state (risk avoided, efficiency, profit, broken routes) and recent critical events into a strict prompt, ensuring the AI outputs a professional text without conversational filler.
2. **`/api/scenario/:id/ai-summary`**: A new endpoint in `scenarioRoutes.ts` that triggers the SitRep generation.
3. **Environment Config**: Setup `dotenv` in `server.ts` and created `.env.example` so teammates can easily configure their local environment.

## How the Team Can Use This
1. Generate an API Key from Google AI Studio.
2. In the `backend/` folder, create a `.env` file.
3. Add `GEMINI_API_KEY="your-key-here"`.
4. Now, the frontend can query the new endpoint right after the simulation ends, pulling down intelligence briefings to show the judges!
