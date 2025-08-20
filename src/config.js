// Configuration for the Code Analyzer app
export const config = {
  // API Configuration
  // The API key should be set as an environment variable for security
  // In development: Create a .env file with VITE_ANTHROPIC_API_KEY=your-key-here
  // In production: Set the environment variable on your hosting platform
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  
  // API endpoint
  apiEndpoint: 'https://api.anthropic.com/v1/messages',
  
  // Model configuration
  model: 'claude-sonnet-4-20250514',
  maxTokens: 8000,
  
  // File size limits
  maxFileSize: 1024 * 1024 * 2, // 2MB
  maxContentLength: 8000, // Characters for analysis
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000, // Base delay in ms
  
  // Supported file extensions
  supportedExtensions: [
    '.js', '.jsx', '.ts', '.tsx',           // JavaScript/TypeScript
    '.py', '.pyw', '.pyc',                  // Python
    '.java', '.cpp', '.c', '.cs', '.h',     // Compiled languages
    '.php', '.rb', '.go', '.rs', '.swift',  // Other languages
    '.kt', '.scala', '.html', '.css',       // More languages
    '.json', '.md', '.sql', '.sh',          // Data/Script files
    '.yml', '.yaml', '.xml', '.toml'        // Config files
  ]
};

// Helper function to check if API key is configured
export const isApiKeyConfigured = () => {
  return config.apiKey && config.apiKey.length > 0;
};

// Helper function to get masked API key for display
export const getMaskedApiKey = () => {
  if (!config.apiKey) return 'Not configured';
  return config.apiKey.substring(0, 8) + '...' + config.apiKey.substring(config.apiKey.length - 4);
};