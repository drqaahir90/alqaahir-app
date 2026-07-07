# QCAP · User Manual

Welcome to **Qaahir Clinical Academy** — your complete clinical training
companion. This guide walks you through every feature available to
learners.

Available in: 🇬🇧 English · 🇸🇦 العربية · 🇸🇴 Soomaali (change from the top
bar or Profile → Preferred language).

---

## Table of contents

1. [Getting started](#getting-started)
2. [The home dashboard](#the-home-dashboard)
3. [MCQ Bank](#mcq-bank)
4. [Case Studies](#case-studies)
5. [OPD Simulator](#opd-simulator)
6. [Health Education](#health-education)
7. [Friends](#friends)
8. [Private Chat](#private-chat)
9. [Challenges](#challenges)
10. [Leaderboard](#leaderboard)
11. [Public profiles](#public-profiles)
12. [Notifications](#notifications)
13. [Support chat](#support-chat)
14. [About Us](#about-us)
15. [Your profile & settings](#your-profile--settings)
16. [Music player](#music-player)
17. [Installing as an app (PWA)](#installing-as-an-app-pwa)
18. [Tips & tricks](#tips--tricks)

---

## Getting started

### Creating an account

1. Open the app and click **Register**.
2. Provide your **email**, **username**, **WhatsApp number** (optional), and
   a password (min. 6 characters).
3. Check your inbox for a **verification email** and click the link to
   activate.
4. Sign in and start learning.

### Signing in

- Enter your registered email + password.
- Forgot your password? Click **🔑 Forgot password?** on the sign-in form.
- Your session persists across visits — no need to sign in every time.

### Signing out

Open **Profile → 🚪 Sign out**. The Sign-out button is intentionally located
only inside your profile.

---

## The home dashboard

Route: `/`

Your personalized landing page shows:

- **Learning modules** — 6 quick-access tiles (MCQs, Case Studies, OPD,
  Education, Leaderboard, Friends).
- **Top learners** — see who's leading the leaderboard.
- **Featured articles** — the latest published health education.
- **Your stats** — XP, streak, quizzes taken.

The **top bar** contains:
- 🌍 **Language selector**
- ☀️/🌙 **Theme selector** (Light / Dark / System)
- 🎵 **Music player button**
- 🔔 **Notifications** (with unread badge)
- 👤 **Your avatar** (opens Profile)

---

## MCQ Bank

Route: `/mcq`

**Multiple-Choice Question** quizzes for rapid revision.

1. **Choose filters**: specialty · difficulty · number of questions (5/10/20/50).
2. Click **Start quiz**.
3. For each question:
   - Read carefully.
   - Select one option.
   - Watch the **⏱ timer** — running out auto-submits.
   - Click **Submit answer** to see the explanation.
4. At the end, review every question with its correct answer and explanation.
5. Earn **XP** for each correct answer, plus a bonus for a perfect score.

Difficulty tuning is per-question — pick easier levels while learning, harder
levels for exam prep.

---

## Case Studies

Route: `/cases`

Multi-step clinical reasoning exercises.

1. Browse cases filtered by specialty or difficulty.
2. Each case opens with **patient information** (age, sex, chief complaint).
3. Progress through **numbered steps** — each step may contain an MCQ
   checkpoint or just informational content.
4. Answer checkpoints to receive per-step explanations.
5. Finish the case to log the result and earn XP.

Titles are **neutral** (they describe the presentation, not the diagnosis) so
you can practice diagnostic reasoning authentically.

---

## OPD Simulator

Route: `/opd`

Realistic **Outpatient Department** encounters organized by clinical
specialty.

### Workflow

```
Patient Information → Clinical Assessment → Diagnosis (MCQ) → Management (MCQ) → Result
```

### What you'll see

- **Patient profile** (age, sex, occupation, ethnicity)
- **Chief complaint** + full **History of Present Illness**
- Past medical / surgical / medication / allergy / family / social histories
- **Review of Systems** and clinical **risk factors**
- **Vital signs** with automatic colour coding:
  - 🟢 Green (normal)
  - 🟡 Yellow (mild abnormality)
  - 🟠 Orange (moderate concern)
  - 🔴 Red (critical)
- **General** and **systemic** examination findings (positive + negative)
- **Laboratory results** in a colour-flagged table
- **Imaging** (X-ray, CT, MRI, ultrasound, ECG, clinical photos) when relevant
- After you answer diagnosis + management:
  - 🎓 **Learning points**
  - 📅 **Follow-up plan**
  - 📖 **References**

### Getting new cases

- Filter by specialty → click **🎲 Random** to generate one from that
  specialty.
- Or browse the full list and click any case card.

The first time you open a case, a **🎨 Colour guide** popup explains the
vital-signs coding. You can re-open it any time from the top-right of the
case screen.

---

## Health Education

Route: `/education`

Curated clinical articles maintained by administrators.

- Search by title or content
- Filter by **category** (specialty)
- **⭐ Featured** strip highlights recommended reading
- Click **📑 Bookmark** to save an article to your profile
- Click **Read more** to open the full article in a modal

---

## Friends

Route: `/friends`

Connect with other learners. Four tabs:

### 🧑 Friends
Your accepted friends list. Each row shows XP, streak, country, DEMO badge
(if applicable), and quick actions:
- **💬 Message** — opens the real-time chat
- **🎯 Challenge** — start a friend challenge
- **🗑 Remove** — with confirmation

### 🔍 Discover
Find learners to connect with:
- **Search** by name or email
- **✨ Suggested for you** — prioritized by matching country
- **🏆 Top learners** — sorted by XP
- **🆕 Recently joined**

Each result shows XP/streak/country and an **+ Add friend** button.

### 📥 Requests
- **Received** — accept ✓ or decline ✕
- **Sent** — cancel pending requests

### ⚡ Challenges
- Active + pending challenges
- Historical results with 🏆/🥈 badges

---

## Private Chat

Route: `/friends/chat/:friendId`

Full real-time chat with any friend. Features:

- **Sent / Delivered / Seen** ticks
- **Typing indicator** (peer typing shows within 3 s)
- **Online status** (🟢 online / 🟡 recently active / ⚪ offline)
- **Message search** within the thread
- **Reply** to any message (quoted preview)
- **Delete** your own messages
- **Emoji picker** with modern iOS-style emojis
- **File attachments** (images inline; files as download links)
- **Push notifications** when you receive a new message (if you enabled them
  in Profile → 🔔 Push notifications)

Chats are end-to-end persistent — you can pick up any conversation from
any device where you're signed in.

---

## Challenges

Peer-to-peer quiz duels. From any friend's row or profile:

1. Click **🎯 Challenge**.
2. Configure: specialty · difficulty · number of questions · timer.
3. Click **Send challenge** — your friend receives an invitation.
4. When accepted, both of you answer **the same question set** independently.
5. When both submit, results are computed automatically:
   - **Highest score** wins.
   - **Tie-breaker**: fastest completion.
   - A 🏆 summary message is posted into your private chat.
6. All results are saved in your **Challenge history**.

---

## Leaderboard

Route: `/leaderboard`

Global ranking of every learner by **XP**, showing:

- Rank (top 3 get medals 🥇🥈🥉)
- Avatar + username + country flag
- XP · Quizzes taken · Accuracy · 🔥 Streak
- **★ Featured** users pinned by admins
- **DEMO** badge on sample users
- **You** badge on your own row

Click any row to open that user's public profile.

---

## Public profiles

Route: `/u/:userId`

Read-only view of any user's public profile:

- Avatar · username · country · online status · member since
- 4 stat cards: XP · Streak · Quizzes · Accuracy
- **Recent activity** feed (last 10 quiz results)
- Context-aware actions:
  - **+ Add friend** / **⏳ Pending** / **✓ Accept**
  - **💬 Message** (if friends)
  - **🎯 Challenge** (if friends)

Never exposes private data (email, phone, moderation history).

---

## Notifications

Route: `/notifications`

Your notification feed — every friend request, challenge, message,
achievement, and admin announcement.

- Unread notifications have a **teal dot**
- **View →** deep-links to the relevant page
- **Mark as read** / **Mark all as read**
- Priority coloured bars: gray (low) · sky (normal) · amber (high) · red (urgent)
- **📎** shows if the notification includes an image

### Enable OS notifications

From **Profile → 🔔 Push notifications**:
1. Toggle the master **Enable** switch
2. Grant browser permission when prompted
3. Choose per-category subscriptions:
   - Announcements
   - Personal messages
   - Reminders
   - Achievements & rewards

Notifications keep working when the app is closed (on browsers that
support the Notifications API).

---

## Support chat

Route: `/support`

Live chat with the platform's support team. Ask questions, report bugs,
request content.

- Realtime messages with **seen** receipts
- **Attach files** (screenshots, documents)
- **Reply to** or **delete** your own messages

Administrators respond directly in the same thread.

---

## About Us

Route: `/about`

Public page describing the platform's mission, vision, contact information,
and social links — fully editable by administrators without redeploying.

---

## Your profile & settings

Route: `/profile`

### Personal information

- **Change photo** — upload or 🗑 remove
- **Edit username · WhatsApp · language**

### Statistics

- **XP · Quizzes · Accuracy · Bookmarks** dashboard

### Appearance

- **Theme** — Light / Dark / System
- **Sound effects** — master switch + volume slider

### Music

- Enable/disable background music
- Add your own music files (see next section)

### Push notifications

- Master switch + per-category subscriptions

### Quiz history

- Full history of every quiz you've taken
- **🗑** individual quiz delete
- **🗑 Clear all quiz history** — bulk delete (with confirmation)

### Sign out

- **🚪 Sign out** at the top of the page, and again at the bottom on mobile

---

## Music player

Access from the **🎵 button in the top bar**.

- **Enable** to activate the player
- **Add music** — select audio files from your device (MP3, WAV, OGG, M4A,
  AAC, FLAC). Files are stored on your device only — never uploaded.
- **Playlist** — reorder, remove tracks
- **Controls** — play/pause, previous/next, shuffle, repeat (off / all / one)
- **Seek** — drag the progress bar
- **Volume** — slider (persisted across sessions)
- **Background playback** — continues while navigating between pages
- **Android media controls** — hardware buttons + notification media panel work

Playlists persist locally so your music is there next time you sign in.

---

## Installing as an app (PWA)

QCAP works as an **installable Progressive Web App**.

### Android (Chrome)

1. Open the site.
2. Tap the **⋮** menu → **Install app**.
3. QCAP appears on your home screen with a proper icon and splash screen.
4. It opens in **standalone mode** (no browser chrome).

### iOS (Safari)

1. Open the site.
2. Tap **Share** → **Add to Home Screen**.

### Desktop (Chrome / Edge)

1. Click the **install icon** in the address bar.
2. QCAP appears in your Start menu / Applications folder.

### After installing

- **Works offline** — recent pages load without internet (service worker
  caches the app shell).
- **Media controls** work from Android's notification panel.
- **Back button** — first press stays in the app; pressing back on Home
  asks to confirm exit.

---

## Tips & tricks

- 📌 **Bookmark articles** you want to reread — find them under Profile → Bookmarks.
- 🎯 **Challenge a friend** for exam-week motivation — the loser buys coffee!
- 🔥 **Maintain your streak** by taking at least one quiz per day.
- 🌍 **Switch languages any time** without losing progress — content is
  stored in all three languages.
- ☀️/🌙 **Try dark mode** for late-night study sessions.
- 🎵 **Study music** playing in the background improves focus (add your own
  favorites via the music button).
- 🔔 **Enable notifications** so friends and admins can reach you instantly.
- 💾 **Install as PWA** for the smoothest experience — feels like a native app.

---

## Getting help

- **Feature requests / bugs** — open a support chat (`/support`)
- **Content errors** — the admin team is notified via support chat
- **Password reset** — 🔑 Forgot password? on the sign-in form
- **Contact** — via the About Us page

Happy learning! 🩺
