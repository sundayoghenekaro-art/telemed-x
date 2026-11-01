# TelemedX - Unified Healthcare Ecosystem

## Project Overview

A comprehensive healthcare management platform built for managing patient records, appointments, telemedicine consultations, pharmacy operations, laboratory services, radiology, billing, and more.

## Technologies Used

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Database & Authentication)
- Capacitor (Mobile)

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Supabase account and project

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Set up environment variables
# Copy .env.example to .env and fill in your Supabase credentials
cp .env.example .env

# Start the development server
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Lint code

## Mobile Development

For Android builds, see:
- [ANDROID_BUILD_GUIDE.md](./ANDROID_BUILD_GUIDE.md)
- [ANDROID_QUICK_START.md](./ANDROID_QUICK_START.md)

## Environment Variables

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for required configuration.

## Security

See [SECURITY_RECOMMENDATIONS.md](./SECURITY_RECOMMENDATIONS.md) for security best practices.
