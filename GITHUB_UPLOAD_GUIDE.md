# How to Upload to GitHub - Easy Steps

## Step 1: Configure Git (One-time setup)
Open Command Prompt or Terminal in the project folder and run:
```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

## Step 2: Create GitHub Repository
1. Go to https://github.com
2. Sign in to your account
3. Click the green "New" button or go to https://github.com/new
4. Name your repository (e.g., "code-analyzer")
5. Keep it Public or Private as you prefer
6. DON'T initialize with README (we already have one)
7. Click "Create repository"

## Step 3: Upload Your Code
After creating the repository, GitHub will show you commands. Use these:

```bash
# We already did git init and git add, so just commit:
git commit -m "Initial commit: Code Analyzer - AI-powered code analysis tool"

# Add your GitHub repository as origin (replace USERNAME with your GitHub username):
git remote add origin https://github.com/USERNAME/code-analyzer.git

# Push to GitHub:
git branch -M main
git push -u origin main
```

## Alternative: GitHub Desktop (Easiest Visual Method)
1. Download GitHub Desktop: https://desktop.github.com/
2. Sign in with your GitHub account
3. Click "File" → "Add Local Repository"
4. Browse to: C:\Users\17866\Downloads\code-analyzer
5. Click "Add Repository"
6. Click "Publish repository" button
7. Choose name and privacy settings
8. Click "Publish Repository"

## Alternative: Direct Upload via GitHub Website
1. Create new repository on GitHub
2. Click "uploading an existing file" link
3. Drag all files EXCEPT:
   - node_modules folder
   - dist folder
   - .env file (if you created one)
4. Write commit message
5. Click "Commit changes"

## After Upload
Your repository will be available at:
`https://github.com/YOUR-USERNAME/code-analyzer`

### To Deploy Live Demo:
1. Go to repository Settings
2. Click "Pages" in sidebar
3. Under "Source", select "GitHub Actions"
4. Create a new workflow for Vite deployment

Or use Netlify/Vercel for easier deployment of the `dist` folder.

## Important Notes:
- Never commit your actual API key (.env file is already in .gitignore)
- The .env.example file shows others how to configure their own API key
- node_modules and dist folders are excluded automatically