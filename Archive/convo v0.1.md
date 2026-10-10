# Allowances - Onboarding & Action Tracker (v0.1)

## Overview
This document tracks the initial setup and progress of the Allowances project, a family bank web app.

## Status: Starting
- [x] Review `plan.md`
- [x] Initialize project directory structure
- [x] Set up Supabase project (manual step for user)
- [x] Configure Database Schema
- [x] Implement Frontend Shell
- [x] Link Supabase credentials

## Questions & Decisions
- **Q: Which frontend framework or vanilla JS?**
  - *A: Starting with Vanilla JS and Supabase CDN for simplicity (MVP).*
- **Q: How to handle `family_id`?**
  - *A: Created a `parents` table that links `auth.uid()` to a `family_id`. This allows parents in the same family to see the same data.*

## Action Log
- 2023-10-27: Initialized `convo v0.1.md` and reviewed project plan.
- 2023-10-27: Created folder structure, `schema.sql`, `index.html`, and `app.js`.
- 2023-10-27: Linked Supabase credentials and moved `app.js` to `public/`.
