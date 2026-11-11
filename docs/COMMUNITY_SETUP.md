# Piste Atlas v0.9 — community account setup

The interface and local guest logbook are implemented, but **real email sign-in and cross-device reviews require a Supabase project**. GitHub Pages itself cannot host the private user database.

## Features and privacy

- Anyone can track mountains they've visited in a **guest logbook**, stored only in that browser.
- Signed-in users can store private resort visits (optional date and notes) across devices and can explicitly import earlier guest visits.
- Users can create, edit and delete one public 1–5 star review per resort, with a title and written comments. Public display names are shown alongside reviews, but **emails and private visit histories are not shown**.
- Resort profiles show recent reviews and published-review average ratings.
- Signed-in users can report inappropriate reviews. Reports are private and administrators can hide reviews.

## Connect the Supabase database

1. Create a project at https://supabase.com/dashboard or connect the Supabase app in ChatGPT, then authorize a project.
2. In the project's **SQL Editor**, execute the entire contents of the repository file **supabase/001_community.sql**. This sets up profiles, visits, reviews, moderation reports, aggregate rating summaries and restrictive Row Level Security (RLS) policies.
3. Under **Authentication → Providers → Email**, enable email sign-in with confirmation. The site uses Supabase email magic links; users do not need a password.
4. Under **Authentication → URL Configuration**, set the Site URL to https://ojan11-11.github.io/piste-atlas/ and add that same address to Redirect URLs. Update the URL when switching to a custom domain.
5. Obtain the **Project URL** and **publishable API key** (begins with sb_publishable_) in the project Connect dialog or Settings → API Keys.
6. Update the repository file **community-config.js**, setting its public URL and publishableKey values to the public project details. The site then loads the Supabase SDK when needed and activates email login, synced visits and reviews.
7. Confirm the live site works in an incognito browser: open the Account page, request a sign-in email, follow its link, save a visited resort and publish a review.
8. Test with **two different accounts** that each user can only read/write their own private visits, while the public can see approved/published reviews. Verify that a hidden review no longer counts in ratings.

**Never put a Supabase secret key, service_role key, database password, email SMTP credentials, or other private credentials in this repository.** Only the project URL and publishable browser key belong in community-config.js. The security boundary is RLS, not hiding public client credentials.

## Before a public launch

- Set up a reliable email sender and configure the project's sign-in rate limits and bot protection.
- Publish community guidelines and a privacy policy explaining that reviews and display names are public, visits private, and guest visits local-only.
- Establish ongoing moderation: inspect the private piste_review_reports table in Supabase, and change abusive piste_reviews.status to hidden. Reports do not automatically hide content.
- Provide a support contact and a user-data deletion process. The MVP does not yet have an in-app **delete account** endpoint. Removing an account through Supabase Auth cascades to its profile, visits and reviews through database foreign keys.
- Keep resort IDs stable when refreshing OpenSkiData, or migrate old IDs so users retain their past visits.
- Test database policies on a **real Supabase project** before inviting users. GitHub Actions verifies the static UI and SQL structure, but cannot prove live permissions until a project is connected.

## Developer tests

Run Node.js 22+:

    node --check community.js
    node tools/test-community.mjs
    node tools/test-site-directory.mjs

Relevant official guides:

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys
