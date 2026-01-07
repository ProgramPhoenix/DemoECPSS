# ECPSS Demo - Electing Committees Proactive Secret Sharing

An interactive demonstration of the ECPSS protocol (Electing Committees Proactive Secret Sharing) built with Vue 3, TypeScript, and Vite.

## Overview

```
src/
├── crypto/
│   ├── ecpss.ts      # ECPSS protocol implementation
│   └── shamir.ts     # Shamir's Secret Sharing algorithm
├── components/
│   ├── TerminalConsole.vue  # Terminal-like log display
└── App.vue           # Main UI
```

### Technologies

- **Vue 3** - Modern framework with Composition API
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Docker** - Containerization for easy deployment

## Installation & Setup

### Prerequisites

- Node.js 22 or higher
- npm
- Docker (optional)

### Local Development

```bash
# Clone repository
cd DemoECPSS

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will run at `http://localhost:5173`

### Production Build

```bash
# Create build
npm run build

# Preview production build
npm run preview
```

### Docker Deployment

```bash
# Build Docker image
docker build -t ecpss-demo .

# Start container
docker run -p 80:80 ecpss-demo
```

