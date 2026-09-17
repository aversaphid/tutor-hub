# LB Maths Tuition — Learning Hub & Student Portal

> **Welcome to the official web platform for LB Maths Tuition.**  
> A bespoke, high-performance learning hub built to deliver tailored online mathematics tuition, live Microsoft Teams lessons, and a seamless lobby experience for students, parents, and tutors.

---

## 🌟 Student & Parent Experience

The LB Maths Tuition Learning Hub is designed to eliminate tech friction so students can focus entirely on learning:

- **🔑 Instant & Secure Access**: No cumbersome passwords to memorize. Students log in seamlessly using their personal **4-Digit Secret PIN** or a direct **Magic Access Link** provided by their tutor.
- **⏱️ Real-Time Lesson Lobby**: A dedicated student room featuring a live countdown clock, automated status indicators (*Scheduled*, *Live / In Progress*, *Delayed*), and audio cues when lessons begin.
- **🎥 1-Click Microsoft Teams Launcher**: Direct, verified entry into the online classroom room with intelligent guidance for browser and desktop Teams apps.
- **📚 Lesson Notes & Tutor Guidance**: Review preparation instructions, topics covered, and post-lesson notes provided directly by your tutor.
- **✨ Accessibility & Focus Tools**: Built-in high-contrast visual themes, dyslexia-friendly layout adjustments, and focus aids.

---

## 🎓 Tutor & Administrator Features

For our tutoring team, the hub provides a unified suite of tools for scheduling and lesson delivery:

- **📅 Real-Time Conflict-Free Scheduling Engine**: Intelligent calendar coordination that automatically prevents overlapping lessons across students and tutors.
- **⚡ Live Lesson Control Deck**: Real-time controls allowing tutors to update Teams links, notify students of brief delays (+5m / +10m), and trigger session chimes.
- **👥 Student Roster & Normal Tutor Pairing**: Easily assign students to their regular math tutor with automatic PIN and magic link generation.
- **🔒 Unified Security & Account Settings**: Secure credential updates, encrypted bcrypt password hashing, and signed session tokens.
- **📋 Completion Reports & Reminders**: Private administrative reminders, post-lesson feedback logging, and settled payout tracking.

---

## 🛠️ Technology Architecture

The platform is engineered using modern, production-grade web technologies:

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Language**: [TypeScript](https://www.typescriptlang.org/) for strict type safety
- **Database & ORM**: [Turso](https://turso.tech/) (libSQL distributed edge SQLite) with [Prisma ORM](https://www.prisma.io/)
- **Styling**: Modern, responsive UI with Tailwind CSS and [Lucide Icons](https://lucide.dev/)
- **Audio Cues**: Web Audio API synthesized chimes for session alerts and delay notifications
- **Security**: Cryptographically signed HMAC session cookies, bcrypt password hashing, and role-based authorization

---

## 🚀 Running Locally

To run the project locally for development or testing:

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ or 20+ recommended)
- `npm` or `pnpm`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aversaphid/tutor-hub.git
   cd tutor-hub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   TURSO_DATABASE_URL="libsql://your-database-name.turso.io"
   TURSO_AUTH_TOKEN="your-turso-auth-token"
   SESSION_SECRET="a-random-long-secret-key"
   ```

4. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Privacy

- **Student Data Protection**: Student records are strictly restricted to assigned tutors and administrative staff.
- **Encrypted Credentials**: Passwords are saved exclusively as salted bcrypt hashes. Neither administrators nor staff can view plaintext credentials.
- **No Stored Payment Information**: Student financial data is never collected or processed on this platform.

---

## 📬 Contact & Enquiries

For lesson bookings, enquiries, or technical support, please contact:
- **Head Tutor**: Luke ([luke@lbmathstuition.co.uk](mailto:luke@lbmathstuition.co.uk))
- **Website**: [LB Maths Tuition](https://lbmathstuition.co.uk)
