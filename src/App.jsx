// Enhanced Code Analyzer with Chunking Support
// This extends the original code analyzer to handle large files by breaking them into chunks

import React, { useState, useRef, useCallback, useEffect } from 'react';

const MAX_CHUNK_SIZE = 8000; // Character limit per chunk
const OVERLAP_SIZE = 200; // Overlap between chunks for context
const MAX_FILE_SIZE = 500000; // Maximum file size to process (500KB)

const EnhancedCodeAnalyzer = () => {
  const [files, setFiles] = useState([]);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('anthropic_api_key') || '');
  const [apiKeyValid, setApiKeyValid] = useState(null);
  const [apiKeyValidating, setApiKeyValidating] = useState(false);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('user_email') || '');
  const [emailResults, setEmailResults] = useState(localStorage.getItem('email_results') === 'true');
  const [analysisMode, setAnalysisMode] = useState('individual');
  const [emailSending, setEmailSending] = useState(false);
  const fileInputRef = useRef(null);

  // Function to validate API key
  const validateApiKey = async (key) => {
    if (!key || !key.startsWith('sk-ant-')) {
      return { valid: false, error: 'Invalid API key format' };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      if (response.ok) {
        return { valid: true, error: null };
      } else if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      } else if (response.status === 429) {
        return { valid: false, error: 'Rate limit exceeded or insufficient credits' };
      } else {
        return { valid: false, error: `API error: ${response.status}` };
      }
    } catch (error) {
      return { valid: false, error: `Network error: ${error.message}` };
    }
  };

  // Function to validate API key on change
  const handleApiKeyValidation = async (key) => {
    if (!key) {
      setApiKeyValid(null);
      return;
    }

    setApiKeyValidating(true);
    const validation = await validateApiKey(key);
    setApiKeyValid(validation.valid);
    setApiKeyValidating(false);

    if (!validation.valid) {
      alert(`API Key Validation Failed: ${validation.error}`);
    }
  };

  // Email functionality using EmailJS
  const initializeEmailJS = () => {
    // Initialize EmailJS (you'll need to sign up at emailjs.com and get your keys)
    if (window.emailjs) {
      window.emailjs.init("YOUR_EMAILJS_USER_ID"); // Replace with your EmailJS User ID
    }
  };

  // Send analysis results via email
  const sendAnalysisEmail = async (results, userEmail) => {
    if (!userEmail || !window.emailjs) {
      console.warn('Email not configured or user email missing');
      return false;
    }

    setEmailSending(true);
    
    try {
      // Format results for email
      const emailContent = formatResultsForEmail(results);
      
      const templateParams = {
        to_email: userEmail,
        from_name: 'Enhanced Code Analyzer',
        subject: `Code Analysis Results - ${new Date().toLocaleDateString()}`,
        message: emailContent,
        analysis_date: new Date().toLocaleString(),
        total_files: results.length,
        total_issues: results.reduce((sum, result) => 
          sum + (result.allIssues ? result.allIssues.length : (result.issues ? result.issues.length : 0)), 0
        )
      };

      await window.emailjs.send(
        'YOUR_EMAIL_SERVICE_ID', // Replace with your EmailJS service ID
        'YOUR_EMAIL_TEMPLATE_ID', // Replace with your EmailJS template ID
        templateParams
      );

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    } finally {
      setEmailSending(false);
    }
  };

  // Format analysis results for email
  const formatResultsForEmail = (results) => {
    let emailContent = "Code Analysis Results\n";
    emailContent += "=" + "=".repeat(50) + "\n\n";

    results.forEach((result, index) => {
      emailContent += `File ${index + 1}: ${result.fileName}\n`;
      emailContent += "-".repeat(30) + "\n";
      
      if (result.error) {
        emailContent += `Error: ${result.error}\n\n`;
        return;
      }

      if (result.overallSummary) {
        emailContent += `Total Chunks: ${result.totalChunks}\n`;
        emailContent += `Total Issues: ${result.overallSummary.totalIssues}\n`;
        emailContent += `High Severity: ${result.overallSummary.highSeverityIssues}\n`;
        emailContent += `Security Issues: ${result.overallSummary.securityIssues}\n\n`;
      }

      const issues = result.allIssues || result.issues || [];
      if (issues.length > 0) {
        emailContent += "Issues Found:\n";
        issues.forEach((issue, issueIndex) => {
          emailContent += `${issueIndex + 1}. [${issue.severity?.toUpperCase()}] ${issue.description}\n`;
          if (issue.suggestion) {
            emailContent += `   Suggestion: ${issue.suggestion}\n`;
          }
        });
        emailContent += "\n";
      }

      if (result.recommendations && result.recommendations.length > 0) {
        emailContent += "Recommendations:\n";
        result.recommendations.forEach((rec, recIndex) => {
          emailContent += `${recIndex + 1}. ${rec.action}: ${rec.details}\n`;
        });
        emailContent += "\n";
      }

      emailContent += "\n";
    });

    return emailContent;
  };

  // Initialize EmailJS on component mount
  useEffect(() => {
    // Load EmailJS script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.onload = initializeEmailJS;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Validate API key when component mounts or key changes
  useEffect(() => {
    if (apiKey) {
      handleApiKeyValidation(apiKey);
    }
  }, []);

  // Function to chunk large content into smaller pieces
  const chunkContent = (content, fileName) => {
    if (content.length <= MAX_CHUNK_SIZE) {
      return [{ content, chunkIndex: 0, totalChunks: 1, fileName }];
    }

    const chunks = [];
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < content.length) {
      let chunkEnd = Math.min(currentPosition + MAX_CHUNK_SIZE, content.length);
      
      // Try to break at a logical point (end of line, function, etc.)
      if (chunkEnd < content.length) {
        const lastNewlineIndex = content.lastIndexOf('\n', chunkEnd);
        const lastFunctionEnd = content.lastIndexOf('}', chunkEnd);
        const lastSemicolon = content.lastIndexOf(';', chunkEnd);
        
        // Use the latest logical break point
        const breakPoint = Math.max(lastNewlineIndex, lastFunctionEnd, lastSemicolon);
        if (breakPoint > currentPosition + OVERLAP_SIZE) {
          chunkEnd = breakPoint + 1;
        }
      }

      let chunkContent = content.slice(currentPosition, chunkEnd);
      
      // Add context from previous chunk if not the first chunk
      if (chunkIndex > 0 && currentPosition >= OVERLAP_SIZE) {
        const contextStart = Math.max(0, currentPosition - OVERLAP_SIZE);
        const context = content.slice(contextStart, currentPosition);
        chunkContent = `/* Previous context for continuity:\n${context}\n*/\n\n${chunkContent}`;
      }

      chunks.push({
        content: chunkContent,
        chunkIndex: chunkIndex,
        totalChunks: 0, // Will be set after all chunks are created
        fileName,
        startPosition: currentPosition,
        endPosition: chunkEnd
      });

      currentPosition = chunkEnd;
      chunkIndex++;
    }

    // Set total chunks for all chunks
    chunks.forEach(chunk => chunk.totalChunks = chunks.length);
    
    return chunks;
  };

  // Function to detect if content should be chunked based on complexity
  const shouldChunk = (content) => {
    // Check file size
    if (content.length > MAX_CHUNK_SIZE) return true;
    
    // Check complexity indicators
    const lineCount = content.split('\n').length;
    const functionCount = (content.match(/function\s+\w+|=>\s*{|class\s+\w+/g) || []).length;
    const complexityScore = lineCount + (functionCount * 10);
    
    return complexityScore > 1000; // Arbitrary complexity threshold
  };

  // Enhanced analysis function with chunking support
  const analyzeChunk = async (chunk, analysisType = 'individual') => {
    const { content, chunkIndex, totalChunks, fileName } = chunk;
    
    const prompt = `
Analyze this ${totalChunks > 1 ? `code chunk (${chunkIndex + 1}/${totalChunks})` : 'code'} from file: ${fileName}

${totalChunks > 1 ? `
Note: This is part ${chunkIndex + 1} of ${totalChunks} chunks from a larger file. 
Please consider that there may be dependencies and context in other chunks.
Focus on issues visible in this section while noting potential cross-chunk dependencies.
` : ''}

Analysis type: ${analysisType}

Code to analyze:
\`\`\`
${content}
\`\`\`

Please provide analysis focusing on:
1. Code quality and best practices
2. Potential bugs and security vulnerabilities  
3. Performance optimization opportunities
4. Maintainability and readability issues
${totalChunks > 1 ? '5. Cross-chunk dependencies that may need attention' : ''}

Format your response as JSON with the following structure:
{
  "chunkInfo": {
    "fileName": "${fileName}",
    "chunkIndex": ${chunkIndex},
    "totalChunks": ${totalChunks}
  },
  "issues": [
    {
      "type": "error|warning|suggestion",
      "category": "bug|security|performance|style|maintainability",
      "description": "Issue description",
      "lineNumber": "estimated line number if applicable",
      "severity": "high|medium|low",
      "suggestion": "How to fix this issue"
    }
  ],
  "summary": "Overall assessment of this code chunk",
  "crossChunkNotes": "Dependencies or issues that span multiple chunks (if applicable)"
}
`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.content[0].text;
      
      try {
        // Try to parse as JSON, fallback to text if it fails
        const analysisData = JSON.parse(analysisText);
        return analysisData;
      } catch (parseError) {
        // If JSON parsing fails, return structured text response
        return {
          chunkInfo: { fileName, chunkIndex, totalChunks },
          issues: [],
          summary: analysisText,
          crossChunkNotes: '',
          parseError: true
        };
      }
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        chunkInfo: { fileName, chunkIndex, totalChunks },
        error: error.message,
        issues: [],
        summary: 'Analysis failed',
        crossChunkNotes: ''
      };
    }
  };

  // Function to merge analysis results from multiple chunks
  const mergeAnalysisResults = (chunkResults, fileName) => {
    const allIssues = [];
    const summaries = [];
    const crossChunkNotes = [];
    let hasErrors = false;

    chunkResults.forEach(result => {
      if (result.error) {
        hasErrors = true;
        return;
      }
      
      if (result.issues) {
        allIssues.push(...result.issues);
      }
      
      if (result.summary) {
        summaries.push(`Chunk ${result.chunkInfo.chunkIndex + 1}: ${result.summary}`);
      }
      
      if (result.crossChunkNotes) {
        crossChunkNotes.push(result.crossChunkNotes);
      }
    });

    // Group issues by category
    const issuesByCategory = allIssues.reduce((acc, issue) => {
      const category = issue.category || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(issue);
      return acc;
    }, {});

    // Calculate overall scores
    const totalIssues = allIssues.length;
    const highSeverityIssues = allIssues.filter(i => i.severity === 'high').length;
    const securityIssues = allIssues.filter(i => i.category === 'security').length;

    return {
      fileName,
      totalChunks: chunkResults.length,
      hasErrors,
      overallSummary: {
        totalIssues,
        highSeverityIssues,
        securityIssues,
        issuesByCategory
      },
      chunkSummaries: summaries,
      crossChunkNotes: crossChunkNotes.filter(note => note.trim()),
      allIssues,
      recommendations: generateRecommendations(allIssues, crossChunkNotes)
    };
  };

  // Generate recommendations based on analysis results
  const generateRecommendations = (issues, crossChunkNotes) => {
    const recommendations = [];
    
    const highSeverityIssues = issues.filter(i => i.severity === 'high');
    if (highSeverityIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Address high-severity issues first',
        details: `Found ${highSeverityIssues.length} high-severity issues that need immediate attention.`
      });
    }

    const securityIssues = issues.filter(i => i.category === 'security');
    if (securityIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Review security vulnerabilities',
        details: `Found ${securityIssues.length} potential security issues.`
      });
    }

    if (crossChunkNotes.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Review cross-file dependencies',
        details: 'Some issues may span multiple parts of the codebase. Consider holistic code review.'
      });
    }

    return recommendations;
  };

  // Main analysis function that handles chunking
  const analyzeFiles = async () => {
    if (!apiKey) {
      alert('Please set your Anthropic API key first');
      return;
    }

    if (apiKeyValid === false) {
      alert('Please enter a valid API key before analyzing');
      return;
    }

    if (files.length === 0) {
      alert('Please select files to analyze');
      return;
    }

    if (emailResults && !userEmail) {
      alert('Please enter your email address to receive results');
      return;
    }

    // Validate API key if not already validated
    if (apiKeyValid === null) {
      setApiKeyValidating(true);
      const validation = await validateApiKey(apiKey);
      setApiKeyValidating(false);
      
      if (!validation.valid) {
        alert(`API Key Invalid: ${validation.error}`);
        setApiKeyValid(false);
        return;
      }
      setApiKeyValid(true);
    }

    setLoading(true);
    setAnalysisResults([]);

    try {
      const results = [];

      for (const file of files) {
        const content = await readFileContent(file);
        
        // Check if file is too large
        if (content.length > MAX_FILE_SIZE) {
          results.push({
            fileName: file.name,
            error: `File too large (${content.length} characters). Maximum size is ${MAX_FILE_SIZE} characters.`,
            skipped: true
          });
          continue;
        }

        // Determine if chunking is needed
        if (shouldChunk(content)) {
          console.log(`Chunking file: ${file.name} (${content.length} characters)`);
          
          // Create chunks
          const chunks = chunkContent(content, file.name);
          console.log(`Created ${chunks.length} chunks for ${file.name}`);
          
          // Analyze each chunk
          const chunkResults = [];
          for (const chunk of chunks) {
            console.log(`Analyzing chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks} of ${file.name}`);
            const chunkResult = await analyzeChunk(chunk, analysisMode);
            chunkResults.push(chunkResult);
          }
          
          // Merge results
          const mergedResult = mergeAnalysisResults(chunkResults, file.name);
          results.push(mergedResult);
        } else {
          // Analyze as single chunk
          console.log(`Analyzing single file: ${file.name}`);
          const singleChunk = { 
            content, 
            chunkIndex: 0, 
            totalChunks: 1, 
            fileName: file.name 
          };
          const result = await analyzeChunk(singleChunk, analysisMode);
          results.push(result);
        }
      }

      setAnalysisResults(results);

      // Send email if requested
      if (emailResults && userEmail) {
        const emailSent = await sendAnalysisEmail(results, userEmail);
        if (emailSent) {
          alert('Analysis complete! Results have been sent to your email.');
        } else {
          alert('Analysis complete! Results displayed below. (Email sending failed)');
        }
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to read file content
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // File selection handlers
  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    setFiles(droppedFiles);
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  // API key management
  const saveApiKey = async () => {
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }

    // Validate API key before saving
    setApiKeyValidating(true);
    const validation = await validateApiKey(apiKey);
    setApiKeyValidating(false);

    if (validation.valid) {
      localStorage.setItem('anthropic_api_key', apiKey);
      setApiKeyValid(true);
      alert('API key validated and saved successfully!');
    } else {
      setApiKeyValid(false);
      alert(`API key validation failed: ${validation.error}`);
    }
  };

  // Email preferences management
  const saveEmailPreferences = () => {
    localStorage.setItem('user_email', userEmail);
    localStorage.setItem('email_results', emailResults.toString());
    alert('Email preferences saved!');
  };

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    setApiKeyValid(null); // Reset validation status
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Code Analyzer with Chunking
          </h1>
          <p className="text-gray-600">
            Analyze code files of any size with automatic chunking for large files
          </p>
        </header>

        {/* Email Configuration Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={emailResults}
                  onChange={(e) => setEmailResults(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Email results to me when analysis is complete
                </span>
              </label>
            </div>
            
            {emailResults && (
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  onClick={saveEmailPreferences}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Save Preferences
                </button>
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              Results will be displayed on screen and optionally emailed to you for easy sharing and record-keeping.
            </p>
          </div>
        </div>

        {/* API Key Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="password"
                  placeholder="Enter your Anthropic API key (sk-ant-...)"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    apiKeyValid === true ? 'border-green-500 bg-green-50' :
                    apiKeyValid === false ? 'border-red-500 bg-red-50' :
                    'border-gray-300'
                  } ${apiKeyValid === true ? 'focus:ring-green-500' : 
                       apiKeyValid === false ? 'focus:ring-red-500' : 
                       'focus:ring-blue-500'}`}
                />
                {apiKeyValidating && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {apiKeyValid === true && !apiKeyValidating && (
                  <div className="absolute right-3 top-2.5 text-green-500">✓</div>
                )}
                {apiKeyValid === false && !apiKeyValidating && (
                  <div className="absolute right-3 top-2.5 text-red-500">✗</div>
                )}
              </div>
              <button
                onClick={saveApiKey}
                disabled={apiKeyValidating || !apiKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {apiKeyValidating ? 'Validating...' : 'Validate & Save'}
              </button>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              {apiKeyValid === true && (
                <span className="text-green-600">✓ API key is valid and active</span>
              )}
              {apiKeyValid === false && (
                <span className="text-red-600">✗ API key validation failed</span>
              )}
              {apiKeyValid === null && apiKey && (
                <span className="text-gray-500">Click "Validate & Save" to check your API key</span>
              )}
            </div>
            
            <p className="text-xs text-gray-500">
              Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a>
            </p>
          </div>
        </div>

        {/* Analysis Mode Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Mode</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: 'individual', label: 'Individual Files', desc: 'Detailed per-file analysis' },
              { value: 'system', label: 'System Analysis', desc: 'Architecture and relationships' },
              { value: 'error', label: 'Error Focus', desc: 'Bug detection and fixes' },
              { value: 'business', label: 'Business Report', desc: 'Non-technical summary' }
            ].map((mode) => (
              <label key={mode.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="analysisMode"
                  value={mode.value}
                  checked={analysisMode === mode.value}
                  onChange={(e) => setAnalysisMode(e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg ${
                  analysisMode === mode.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-sm text-gray-600">{mode.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
          
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="space-y-4">
              <div className="text-4xl text-gray-400">📁</div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop files here or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports JavaScript, Python, Java, C++, and 25+ languages
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Large files will be automatically chunked for analysis
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.cs,.html,.css,.php,.go,.rs,.rb,.swift,.kt,.scala,.json,.yml,.yaml,.xml,.toml,.md,.sql,.sh"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Select Files
              </button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Selected Files:</h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <span className="font-medium">{file.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({(file.size / 1024).toFixed(1)} KB)
                        {file.size > MAX_CHUNK_SIZE && ' - Will be chunked'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Analysis Button */}
        <div className="text-center mb-6">
          <button
            onClick={analyzeFiles}
            disabled={loading || files.length === 0 || !apiKey || apiKeyValid === false || apiKeyValidating}
            className="px-8 py-3 bg-green-600 text-white text-lg font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (emailSending ? 'Sending Email...' : 'Analyzing...') : 'Start Analysis'}
          </button>
          
          {(loading || emailSending) && (
            <div className="mt-3 text-sm text-gray-600">
              {loading && !emailSending && 'Analyzing your code with Claude AI...'}
              {emailSending && 'Sending results to your email...'}
              {emailResults && userEmail && !emailSending && loading && (
                <div className="mt-1">Results will be emailed to: {userEmail}</div>
              )}
            </div>
          )}
          
          {apiKeyValid === false && (
            <div className="mt-2 text-sm text-red-600">
              Please enter a valid API key to proceed
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {analysisResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-6">Analysis Results</h2>
            
            {analysisResults.map((result, index) => (
              <div key={index} className="mb-8 border-b pb-6 last:border-b-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-medium">{result.fileName}</h3>
                  {result.totalChunks > 1 && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {result.totalChunks} chunks analyzed
                    </span>
                  )}
                </div>

                {result.error ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800">{result.error}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Overall Summary for chunked files */}
                    {result.overallSummary && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="font-medium mb-2">Overall Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Total Issues:</span> {result.overallSummary.totalIssues}
                          </div>
                          <div>
                            <span className="font-medium">High Severity:</span> {result.overallSummary.highSeverityIssues}
                          </div>
                          <div>
                            <span className="font-medium">Security:</span> {result.overallSummary.securityIssues}
                          </div>
                          <div>
                            <span className="font-medium">Chunks:</span> {result.totalChunks}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Issues */}
                    {result.allIssues && result.allIssues.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Issues Found:</h4>
                        <div className="space-y-2">
                          {result.allIssues.map((issue, issueIndex) => (
                            <div key={issueIndex} className={`p-3 rounded-md border ${
                              issue.severity === 'high' ? 'bg-red-50 border-red-200' :
                              issue.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                              'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">{issue.description}</div>
                                  {issue.suggestion && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      <strong>Suggestion:</strong> {issue.suggestion}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end text-sm">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                                    issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {issue.severity}
                                  </span>
                                  <span className="text-gray-500 mt-1">{issue.category}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {result.recommendations && result.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Recommendations:</h4>
                        <div className="space-y-2">
                          {result.recommendations.map((rec, recIndex) => (
                            <div key={recIndex} className="p-3 bg-green-50 border border-green-200 rounded-md">
                              <div className="font-medium text-green-800">{rec.action}</div>
                              <div className="text-sm text-green-700">{rec.details}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cross-chunk Notes */}
                    {result.crossChunkNotes && result.crossChunkNotes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Cross-Chunk Dependencies:</h4>
                        <div className="space-y-2">
                          {result.crossChunkNotes.map((note, noteIndex) => (
                            <div key={noteIndex} className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                              <div className="text-sm text-orange-800">{note}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {result.summary && (
                      <div>
                        <h4 className="font-medium mb-2">Summary:</h4>
                        <div className="p-3 bg-gray-50 rounded-md">
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">{result.summary}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedCodeAnalyzer;