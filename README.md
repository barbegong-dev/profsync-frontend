# eTrackFac - Faculty Document Tracking System (Frontend)

This is the frontend application for the eTrackFac system, a mobile-first web application designed for tracking and managing faculty document submissions. It is built with [Next.js](https://nextjs.org/) and features a premium, responsive design.

## Features

*   **Mobile-First Design**: Fully responsive interface with card-based views for mobile and table views for desktop.
*   **Role-Based Access**: Specialized dashboards for Faculty, Program Chairs, Deans, and Admins.
*   **Authentication**: Secure login and registration with validation by Admin.
*   **Dynamic Navigation**: Slide-out sidebar and floating mobile header.
*   **Document Management**: Upload, review, and track status of requirements.

## Prerequisites

Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [npm](https://www.npmjs.com/) or yarn

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/PrimeX-Ryan/Etrackfac-APP.git
    cd Etrackfac-APP
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file in the root directory if customizable environment variables are needed. By default, the app connects to the backend at `http://localhost:8000`.

    If you need to change the backend URL, update `src/lib/api.ts` or add:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8000
    ```

## Running Locally

1.  **Start the development server:**
    ```bash
    npm run dev
    ```

2.  **Access the application:**
    Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

*   `src/app`: App router pages (Login, Register, Dashboards).
*   `src/components`: Reusable UI components (Layout, etc.).
*   `src/context`: React Context for state management (AuthContext).
*   `src/lib`: Utility functions and API configuration.
*   `src/globals.css`: Global styles and strict CSS variables for the theme.

## Deployment

This project can be easily declared to Vercel or any Next.js hosting provider.

```bash
npm run build
npm run start
```
