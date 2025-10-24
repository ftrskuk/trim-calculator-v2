# trim-calculator-v2

Product Requirements Document: AI Paper Trim Size Calculator v2.0
1. Introduction
This document outlines the requirements for version 2.0 of the AI Paper Trim Size Calculator. The product is an advanced web-based tool for production planners in the paper industry. It helps them calculate optimal paper trim sizes to fulfill production orders efficiently, minimizing waste by adhering to paper mill deckle constraints. Version 2.0 aims to enhance user workflow by introducing persistent storage for calculations and upgrading the AI core for more sophisticated suggestions.
2. Vision & Goals
Vision: To be the industry-standard, intelligent tool for paper production planning, saving time and material costs for paper mills and their clients.
Goals:
Increase User Efficiency: Allow users to save, manage, and reuse previous calculations, eliminating repetitive data entry.
Enhance AI Capabilities: Integrate a more powerful AI model (e.g., GPT-5 Codex) to provide more accurate and diverse set combination suggestions.
Establish a Scalable Foundation: Build a robust backend using Supabase to support user accounts, collaborative features, and more in the future.
Streamline Deployment: Utilize Vercel for continuous, hassle-free deployment and hosting.
3. Target Audience
Primary: Production Planners, Schedulers at paper manufacturing companies.
Secondary: Sales and Account Managers who create quotes for clients based on production feasibility.
4. Features & Functionality
4.1. Feature: Calculation History & Management ("이전 기록")
Description: Users need the ability to save their work and refer back to it later. This feature will allow users to save a complete snapshot of their current calculation setup and load it in a future session.
User Stories:
As a planner, I want to save my current set combination with a descriptive name so I can easily find and reuse it for a recurring order.
As a manager, I want to view a list of saved historical calculations to review past production plans.
As a user, I want to load a saved calculation to make minor adjustments without re-entering all the data from scratch.
As a user, I want to delete old or irrelevant calculations to keep my history clean.
Functional Requirements:
A "Save Calculation" button will be added to the main interface.
Clicking "Save" prompts the user to enter a name for the calculation.
The entire state (Mill, substance, length, rolls, quantities, multipliers) is saved to the Supabase database.
A "View History" button will open a modal displaying a list of all saved calculations.
The list will display the calculation name and save date/time, sorted from newest to oldest.
Each item in the list will have "Load" and "Delete" buttons. "Load" will populate the calculator with the selected data, and "Delete" will remove the record after confirmation.
4.2. Feature: AI Engine Upgrade ("AI로 채우기")
Description: The current "AI로 채우기" function will be upgraded to use the more advanced GPT-5 Codex API. This is expected to yield more creative and efficient trim combinations.
Functional Requirements:
The backend service (geminiService.ts) will be refactored to call the GPT-5 Codex API endpoint.
The prompt will be re-engineered and optimized specifically for GPT-5 to ensure it consistently returns valid JSON in the required format.
Error handling will be made more robust to account for potential variations in the new API's responses.
5. Technical Architecture
Frontend: React (Vite), TypeScript, Tailwind CSS.
Backend: Supabase, using its PostgreSQL database for storage and potentially Authentication for user management.
AI Service: API endpoint for the specified GPT-5 Codex model.
Deployment: Vercel, linked to a Git repository for automatic deployments.
