# 📅 Scheduler — Intelligent Shift & Staff Planner

**Scheduler** is a robust, offline-first desktop application designed to simplify complex shift planning and staff management. Tailored for healthcare departments, hospitality, or any team-based environment, it focuses on area-based seat management, substitute tracking, and collision-free absence planning.

---

## ✨ Key Features (v1.0.1)

### 📊 Smart Dashboard
- **Instant Overview**: Cards tracking current staff status (Total fixed, substitutes, students, and active today).
- **Critical Alerts**: Real-time detection of uncovered gaps due to unplanned absences.
- **Formation Tracking**: Visual progress of trainee rotations and specific learning periods.

### 🗓️ Advanced Graphical Calendar
- **Dynamic Views**: Switch between **Weekly** and **Monthly** perspectives in a single click.
- **Smart Grouping**: Reorganize the grid instantly by **Reference Shift** (Morning, Afternoon, Night) or **Physical Area** (ER, ICU, etc.).
- **Live Overrides**: Manually assign or swap workers for specific days with an intuitive modal.
- **Print & Export**: High-quality landscape printing support for physical wall schedules.

### 👥 Staff & Talent Management
- **Categorization**: Manage **Fixed** staff (assigned to permanent seats), **Substitutes** (external/internal), and **Students** (trainees).
- **Capability Engine**: Define mastered profiles for each substitute to receive automatic assignment suggestions.
- **Detailed Analytics**: Annual activity heatmaps (GitHub style) for every worker, showing work distribution and absence history.

### 🚑 Absence & Conflict Radar
- **Comprehensive Tracking**: Manage Vacations, Sick Leave, Union Leave, and more.
- **Impact Analysis**: Before saving an absence, the system warns you exactly how many shifts will become uncovered in the calendar.
- **One-Click Coverage**: Integrated management tool to find and assign available substitutes for empty slots.

### ⚙️ Full Configuration Engine
- **Custom Areas**: Create department zones with specific colors for visual identity.
- **Seat Mapping**: Define "Profiles" (slots) within areas, linked to base shifts and recurring schedules.
- **Holiday Calendar**: Global holiday management that automatically adjusts profile logic.

---

## 🛠️ Technical Stack

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- **State & Routing**: [Zustand](https://github.com/pmndrs/zustand) & [TanStack Router](https://tanstack.com/router/)
- **Backend**: [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/)
- **Database**: [SQLite](https://sqlite.org/) via [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) & [Drizzle ORM](https://orm.drizzle.team/)
- **Desktop Wrapper**: [Electron](https://www.electronjs.org/)
- **i18n**: Fully Bilingual (**English / Spanish**) via `react-i18next`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Clone the repository
2. Install dependencies at the root:
   ```bash
   npm install
   ```
3. Install dependencies for sub-projects:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

### Development Mode
To run the dual-server setup with Electron:
```bash
npm start
```

### Building for Production
To package the app into a standalone executable (Windows/macOS/Linux):
```bash
# Build the frontend and generate the installer
npm run dist
```
The installer will be generated in the `release/` directory.

---

## 🔒 Security & Privacy
- **100% Offline**: Data never leaves your machine. The SQLite database is stored locally.
- **Portable**: Easy to backup by simply copying the `database.sqlite` file.
- **No Dependencies**: Works without an internet connection once installed.

---

## 📄 License
This project is licensed under the [ISC License](LICENSE).

---
*Made with ❤️ for efficient team management.*
