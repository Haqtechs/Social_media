frontend/README.md
# Social Media Frontend

React frontend for the social media application.

## Features

- User authentication (login/signup)
- Create posts with text and images
- Like and comment on posts
- Follow/unfollow users
- User profiles
- Responsive design with green and white theme

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

## Setup

### Install Dependencies

```bash
npm install
Run Development Server
npm run dev
The app will run on http://localhost:5173
Build for Production
npm run build
Environment
The API URL is configured in:
src/context/AuthContext.jsx
src/services/API.js
Current API: https://social-media-4kso.onrender.com/api
Deployment to GitHub Pages
Install gh-pages:
npm install --save-dev gh-pages
Add to package.json:
"homepage": "https://your-username.github.io/your-repo-name",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
Deploy:
npm run deploy
Project Structure
src/
├── components/       # Reusable components
├── pages/           # Page components
├── context/         # React context (Auth)
├── services/        # API calls
├── App.jsx          # Main app component
├── main.jsx         # Entry point
└── index.css        # Global styles
Theme Colors
Primary Green: #10b981
Dark Green: #059669
Light Green: #d1fae5
White: #ffffff
