# Code Analyzer - AI-Powered Code Analysis Tool

A comprehensive web application that analyzes your code using Claude AI to provide detailed insights, improvements, and recommendations. Supports individual file analysis, system-wide architecture review, and business-friendly reports.

## Features

- **Multi-File Support**: Analyze JavaScript, TypeScript, Python, Java, C++, and 25+ programming languages
- **Multiple Input Methods**: 
  - Drag and drop files or folders
  - Upload ZIP archives
  - Load directly from GitHub repositories
  - Select individual files or entire directories
- **Analysis Modes**:
  - Individual file analysis with line-by-line feedback
  - System architecture analysis for understanding file relationships
  - Error-focused analysis for debugging
  - Business summary reports for non-technical stakeholders
- **AI-Powered Insights**:
  - Syntax error detection
  - Security vulnerability identification
  - Performance optimization suggestions
  - Code quality scoring
  - Best practice recommendations
- **Export Options**: Download improved versions of your code files

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm installed
- An Anthropic API key ([Get one here](https://console.anthropic.com))

### Installation

1. Clone or download this repository:
```bash
git clone <repository-url>
cd code-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Configure your API key (choose one method):

   **Method 1: Environment Variable (Recommended)**
   - Copy `.env.example` to `.env`
   - Add your Anthropic API key:
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...
   ```

   **Method 2: In-App Configuration**
   - Launch the app and click the "API Key" button
   - Enter your key in the secure modal

### Running the Application

#### Development Mode
```bash
npm run dev
```
The app will open at http://localhost:3000

#### Production Build
```bash
npm run build
```
This creates an optimized build in the `dist` folder.

#### Preview Production Build
```bash
npm run preview
```

### Deployment

The built application in the `dist` folder can be deployed to any static hosting service:

- **Vercel**: `npm i -g vercel && vercel dist`
- **Netlify**: Drag and drop the `dist` folder to Netlify
- **GitHub Pages**: Use GitHub Actions or push the `dist` folder
- **AWS S3**: Upload `dist` contents to an S3 bucket with static hosting

## Usage

1. **Add Your API Key**: Click the "API Key" button and enter your Anthropic API key
2. **Upload Code**: 
   - Drag and drop files/folders onto the upload area
   - Click buttons to select files, folders, or ZIP archives
   - Paste a GitHub repository URL
3. **Choose Analysis Type**:
   - **Individual Files**: Detailed per-file analysis
   - **System Analysis**: Architecture and relationships
   - **Error Focus**: Concentrate on bugs and fixes
   - **Business Report**: Non-technical summary
4. **Review Results**: Navigate through different views to see insights
5. **Export**: Download improved versions of your code

## Security

- API keys are stored locally in your browser
- Keys are only sent to Anthropic's official API
- No code or data is stored on any server
- All analysis happens via direct API calls

## Supported File Types

- JavaScript/TypeScript: `.js`, `.jsx`, `.ts`, `.tsx`
- Python: `.py`, `.pyw`, `.pyc`
- Java/C/C++: `.java`, `.c`, `.cpp`, `.h`, `.cs`
- Web: `.html`, `.css`, `.php`
- Other: `.go`, `.rs`, `.rb`, `.swift`, `.kt`, `.scala`
- Config: `.json`, `.yml`, `.yaml`, `.xml`, `.toml`
- Documentation: `.md`, `.sql`, `.sh`

## Troubleshooting

### API Key Issues
- Ensure your API key starts with `sk-ant-`
- Check you have available credits in your Anthropic account
- Verify the key has necessary permissions

### Analysis Fails
- Large files may be truncated (8000 character limit)
- Ensure files are text-based, not binary
- Check your internet connection

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Ensure Node.js version is 16 or higher: `node --version`

## Development

### Project Structure
```
code-analyzer/
├── src/
│   ├── App.jsx         # Main application component
│   ├── config.js       # Configuration and API settings
│   ├── main.jsx        # Application entry point
│   └── index.css       # Tailwind CSS styles
├── public/             # Static assets
├── dist/               # Production build (generated)
└── package.json        # Dependencies and scripts
```

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

MIT License - feel free to use this tool for your projects!

## Support

For issues or questions, please open an issue on GitHub or contact the maintainers.
