#!/bin/bash

# Enhanced Code Analyzer Repository Update Script
# This script updates your existing repository with the enhanced features

set -e  # Exit on any error

echo "🚀 Updating repository with Enhanced Code Analyzer features..."
echo "=============================================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: This doesn't appear to be a git repository"
    echo "   Please run this script from your repository root directory"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Ask user if they want to create a new branch
echo ""
read -p "Do you want to create a new branch for the enhanced features? (y/n): " CREATE_BRANCH

if [ "$CREATE_BRANCH" = "y" ] || [ "$CREATE_BRANCH" = "Y" ]; then
    read -p "Enter branch name (default: enhanced-features): " BRANCH_NAME
    BRANCH_NAME=${BRANCH_NAME:-enhanced-features}
    
    echo "🌿 Creating and switching to branch: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
fi

# Check for existing files and create backups
echo ""
echo "🔍 Checking for existing files..."

backup_if_exists() {
    if [ -f "$1" ]; then
        echo "📋 Backing up existing $1 to $1.backup"
        cp "$1" "$1.backup"
    fi
}

backup_if_exists "package.json"
backup_if_exists "README.md"
backup_if_exists ".env.example"
backup_if_exists "src/App.jsx"

# Create necessary directories
echo "📁 Creating directory structure..."
mkdir -p src
mkdir -p docs
mkdir -p public

# Update .gitignore
echo "📝 Updating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production build
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# Backup files created by update script
*.backup
EOF

# Update package.json
echo "📦 Updating package.json..."
cat > package.json << 'EOF'
{
  "name": "enhanced-code-analyzer",
  "version": "2.0.0",
  "description": "Enhanced code analyzer with intelligent chunking for large files using Claude AI",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext js,jsx,ts,tsx",
    "lint:fix": "eslint src --ext js,jsx,ts,tsx --fix",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "analyze": "npm run build && npx bundle-analyzer dist/assets/*.js"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",
    "@emailjs/browser": "^3.11.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.0",
    "vite": "^4.4.5",
    "vitest": "^0.34.0"
  },
  "keywords": [
    "code-analysis",
    "static-analysis",
    "claude-ai",
    "chunking",
    "javascript",
    "python",
    "java",
    "code-quality",
    "security-analysis",
    "performance-optimization"
  ],
  "author": "Enhanced Code Analyzer Team",
  "license": "MIT",
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
EOF

# Update .env.example
echo "🔧 Creating/updating .env.example..."
cat > .env.example << 'EOF'
# .env.example
# Copy this file to .env and update with your actual values

# Anthropic API Configuration
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-actual-api-key-here

# EmailJS Configuration (Optional)
# Get these from your EmailJS dashboard at https://www.emailjs.com/
VITE_EMAILJS_USER_ID=your_emailjs_user_id
VITE_EMAILJS_SERVICE_ID=your_service_id  
VITE_EMAILJS_TEMPLATE_ID=your_template_id

# Application Configuration
VITE_APP_NAME=Enhanced Code Analyzer
VITE_APP_VERSION=2.0.0

# Analysis Configuration
VITE_MAX_CHUNK_SIZE=8000
VITE_MAX_FILE_SIZE=500000
VITE_OVERLAP_SIZE=200
VITE_COMPLEXITY_THRESHOLD=1000

# Feature Flags
VITE_ENABLE_EMAIL=true
VITE_ENABLE_API_VALIDATION=true
VITE_ENABLE_CHUNKING=true
EOF

# Create Vite config if it doesn't exist
if [ ! -f "vite.config.js" ]; then
    echo "⚡ Creating vite.config.js..."
    cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  }
})
EOF
fi

# Create index.html if it doesn't exist
if [ ! -f "index.html" ]; then
    echo "🌐 Creating index.html..."
    cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Enhanced Code Analyzer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF
fi

# Create main.jsx if it doesn't exist
if [ ! -f "src/main.jsx" ]; then
    echo "⚛️ Creating src/main.jsx..."
    cat > src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF
fi

# Create index.css if it doesn't exist
if [ ! -f "src/index.css" ]; then
    echo "🎨 Creating src/index.css..."
    cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}
EOF
fi

echo ""
echo "✅ Basic files updated!"
echo ""
echo "🔥 Now you need to copy the React component code manually:"
echo ""
echo "1. Copy the 'Enhanced Code Analyzer' artifact code to: src/App.jsx"
echo "2. Copy the 'Chunking Utilities Module' artifact code to: src/chunking-utils.js"  
echo "3. Copy the 'Email Configuration Template' artifact code to: src/email-config.js"
echo "4. Copy the 'EmailJS Setup Guide' artifact content to: docs/EmailJS-Setup-Guide.md"
echo ""
echo "📋 Then run these commands:"
echo ""
echo "# Install/update dependencies"
echo "npm install"
echo ""
echo "# Add changes to git"
echo "git add ."
echo ""
echo "# Commit the enhanced features"
echo "git commit -m \"feat: Enhanced code analyzer with API validation and email

- Add intelligent chunking system for large files
- Implement real-time API key validation with status indicators
- Add email integration using EmailJS for automatic result delivery
- Create language-aware code splitting algorithms
- Include comprehensive setup documentation and guides
- Add cross-chunk dependency analysis and relationship mapping
- Enhance UI with validation indicators and progress tracking
- Update project structure for modern React development

BREAKING CHANGE: Updated to React 18 with Vite build system
Requires Node.js 16+ and npm 8+\""
echo ""
echo "# Push to repository"
echo "git push"
echo ""
if [ "$CREATE_BRANCH" = "y" ] || [ "$CREATE_BRANCH" = "Y" ]; then
    echo "# Create pull request on GitHub if you used a branch"
    echo "# Go to GitHub and create a pull request from '$BRANCH_NAME' to '$CURRENT_BRANCH'"
fi
echo ""
echo "🎯 After copying the component code and running the commands above,"
echo "   your repository will have all the enhanced features!"
echo ""
echo "🔗 Repository will include:"
echo "   ✅ API key validation with real-time feedback"
echo "   ✅ Email integration for automatic result delivery"
echo "   ✅ Intelligent chunking for large files"
echo "   ✅ Language-aware code analysis"
echo "   ✅ Professional UI with progress indicators"
echo "   ✅ Complete documentation and setup guides"
echo ""
echo "Happy coding! 🚀"