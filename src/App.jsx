import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Play, Zap, Shield, Lightbulb, Network, BarChart3, ArrowLeft, Github, Archive, Link, Settings, Key } from 'lucide-react';
import { config, isApiKeyConfigured, getMaskedApiKey } from './config';

const App = () => {
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState({});
  const [currentAnalysis, setCurrentAnalysis] = useState('');
  const [systemAnalysis, setSystemAnalysis] = useState(null);
  const [analyzingSystem, setAnalyzingSystem] = useState(false);
  const [plainEnglishReport, setPlainEnglishReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [apiStatus, setApiStatus] = useState({ hasIssues: false, message: '', type: '' });
  const [analysisMode, setAnalysisMode] = useState('single');
  const [githubUrl, setGithubUrl] = useState('');
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.webkitdirectory = true;
    }
  }, []);

  const supportedExtensions = [
    '.js', '.jsx', '.ts', '.tsx',           // JavaScript/TypeScript
    '.py', '.pyw', '.pyc',                  // Python (including .pyw and .pyc)
    '.java', '.cpp', '.c', '.cs', '.h',     // Compiled languages
    '.php', '.rb', '.go', '.rs', '.swift',  // Other languages
    '.kt', '.scala', '.html', '.css',       // More languages
    '.json', '.md', '.sql', '.sh',          // Data/Script files
    '.yml', '.yaml', '.xml', '.toml'        // Config files
  ];

  const handleFileUpload = (uploadedFiles) => {
    console.log(`=== FILE UPLOAD DEBUG ===`);
    console.log(`Total files dropped/selected: ${uploadedFiles.length}`);
    
    Array.from(uploadedFiles).forEach((file, index) => {
      console.log(`\nFile ${index + 1}:`);
      console.log(`- Name: ${file.name}`);
      console.log(`- Size: ${file.size} bytes`);
      console.log(`- Type: ${file.type}`);
      console.log(`- Last Modified: ${new Date(file.lastModified)}`);
      
      // Check if it's a zip file
      if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        console.log(`- Detected ZIP file, processing...`);
        handleZipFile(file);
        return;
      }
      
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      const isValid = supportedExtensions.includes(extension);
      console.log(`- Extension: ${extension}`);
      console.log(`- Valid: ${isValid}`);
      
      if (!isValid) {
        console.log(`- REJECTED: Extension not in supported list`);
        console.log(`- Supported extensions:`, supportedExtensions);
      }
    });

    const validFiles = Array.from(uploadedFiles).filter(file => {
      // Skip zip files as they're handled separately
      if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        return false;
      }
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      return supportedExtensions.includes(extension);
    });

    console.log(`\nResult: ${validFiles.length} valid files out of ${uploadedFiles.length} total`);
    if (validFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...validFiles]);
    }
  };

  const handleZipFile = async (zipFile) => {
    try {
      console.log(`Processing ZIP file: ${zipFile.name}`);
      setCurrentAnalysis(`Extracting ZIP file: ${zipFile.name}...`);
      
      // Import JSZip dynamically
      const JSZip = await loadJSZip();
      
      const arrayBuffer = await zipFile.arrayBuffer();
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(arrayBuffer);
      
      console.log('ZIP file loaded successfully');
      const extractedFiles = [];
      
      // Process each file in the ZIP
      for (const [path, zipEntry] of Object.entries(zipContent.files)) {
        if (!zipEntry.dir) { // Skip directories
          try {
            const extension = '.' + path.split('.').pop().toLowerCase();
            
            // Check if it's a supported file type
            if (supportedExtensions.includes(extension)) {
              console.log(`Extracting supported file: ${path}`);
              
              const content = await zipEntry.async('text');
              
              // Create a File object
              const blob = new Blob([content], { type: 'text/plain' });
              const file = new File([blob], path.split('/').pop(), { type: 'text/plain' });
              
              // Add path information
              file.displayPath = path;
              file.fileName = path.split('/').pop();
              
              extractedFiles.push(file);
            } else {
              console.log(`Skipping unsupported file: ${path} (${extension})`);
            }
          } catch (error) {
            console.warn(`Could not extract file ${path}:`, error);
          }
        }
      }
      
      console.log(`Successfully extracted ${extractedFiles.length} supported files from ZIP`);
      
      if (extractedFiles.length > 0) {
        setFiles(prevFiles => [...prevFiles, ...extractedFiles]);
        alert(`Successfully extracted ${extractedFiles.length} code files from ${zipFile.name}!`);
      } else {
        alert('No supported code files found in the ZIP archive. Please check that your ZIP contains programming files with supported extensions.');
      }
      
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      alert(`Could not process ZIP file: ${error.message}\n\nPlease ensure the file is a valid ZIP archive and try again.`);
    } finally {
      setCurrentAnalysis('');
    }
  };

  const loadJSZip = async () => {
    // Check if JSZip is already loaded
    if (window.JSZip) {
      return window.JSZip;
    }
    
    // Load JSZip from CDN
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => {
        console.log('JSZip loaded successfully');
        resolve(window.JSZip);
      };
      script.onerror = (error) => {
        console.error('Failed to load JSZip:', error);
        reject(new Error('Failed to load ZIP processing library. Please check your internet connection and try again.'));
      };
      document.head.appendChild(script);
    });
  };

  const handleGithubRepo = async () => {
    if (!githubUrl.trim()) {
      alert('Please enter a GitHub repository URL');
      return;
    }

    try {
      setLoadingRepo(true);
      setCurrentAnalysis('Loading GitHub repository...');

      // Extract owner and repo from URL
      const urlMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!urlMatch) {
        throw new Error('Invalid GitHub URL format. Use: https://github.com/owner/repo');
      }

      const [, owner, repo] = urlMatch;
      const cleanRepo = repo.replace(/\.git$/, ''); // Remove .git suffix if present

      console.log(`Fetching repository: ${owner}/${cleanRepo}`);

      // Use GitHub API to get repository contents
      const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contents`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Repository not found. Please check the URL and make sure the repository is public.');
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const contents = await response.json();
      console.log('Repository contents:', contents);

      // Recursively fetch all files
      const allFiles = await fetchAllRepoFiles(owner, cleanRepo, '');
      
      console.log(`Found ${allFiles.length} files in repository`);
      
      // Filter for supported file types
      const validFiles = allFiles.filter(file => {
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        return supportedExtensions.includes(extension);
      });

      console.log(`${validFiles.length} files match supported extensions`);

      if (validFiles.length === 0) {
        alert('No supported code files found in this repository.');
        return;
      }

      // Create File objects from the repository files
      const fileObjects = validFiles.map(file => {
        const blob = new Blob([file.content], { type: 'text/plain' });
        const fileObj = new File([blob], file.name, { type: 'text/plain' });
        fileObj.displayPath = file.path;
        fileObj.fileName = file.name;
        return fileObj;
      });

      setFiles(prevFiles => [...prevFiles, ...fileObjects]);
      setGithubUrl(''); // Clear the input
      
      alert(`Successfully loaded ${fileObjects.length} code files from ${owner}/${cleanRepo}`);

    } catch (error) {
      console.error('Error loading GitHub repository:', error);
      alert(`Error loading repository: ${error.message}`);
    } finally {
      setLoadingRepo(false);
      setCurrentAnalysis('');
    }
  };

  const fetchAllRepoFiles = async (owner, repo, path = '') => {
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.warn(`Could not fetch contents for path: ${path}`);
        return [];
      }

      const contents = await response.json();
      let allFiles = [];

      for (const item of contents) {
        if (item.type === 'file') {
          // Fetch file content
          try {
            const fileResponse = await fetch(item.download_url);
            if (fileResponse.ok) {
              const content = await fileResponse.text();
              allFiles.push({
                name: item.name,
                path: item.path,
                content: content
              });
            }
          } catch (error) {
            console.warn(`Could not fetch file: ${item.path}`, error);
          }
        } else if (item.type === 'dir') {
          // Recursively fetch directory contents (limit depth to avoid infinite loops)
          const depth = path.split('/').filter(p => p).length;
          if (depth < 10) { // Limit recursion depth
            const subFiles = await fetchAllRepoFiles(owner, repo, item.path);
            allFiles = [...allFiles, ...subFiles];
          }
        }
      }

      return allFiles;
    } catch (error) {
      console.error(`Error fetching repository contents for path ${path}:`, error);
      return [];
    }
  };

  const handleFolderUpload = (uploadedFiles) => {
    console.log(`=== FOLDER UPLOAD DEBUG ===`);
    console.log(`Total files dropped/selected: ${uploadedFiles.length}`);
    
    const validFiles = Array.from(uploadedFiles).filter(file => {
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      const isValid = supportedExtensions.includes(extension);
      console.log(`File: ${file.name}, Extension: ${extension}, Valid: ${isValid}`);
      return isValid;
    });

    const filesWithPath = validFiles.map(file => ({
      ...file,
      displayPath: file.webkitRelativePath || file.name,
      fileName: file.name
    }));

    console.log(`Found ${filesWithPath.length} valid files in folder out of ${uploadedFiles.length} total files`);
    setFiles(prevFiles => [...prevFiles, ...filesWithPath]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedItems = e.dataTransfer.items;
    const droppedFiles = e.dataTransfer.files;
    
    // Check if any dropped files are zip files
    const hasZipFiles = Array.from(droppedFiles).some(file => 
      file.name.toLowerCase().endsWith('.zip') || 
      file.type === 'application/zip' || 
      file.type === 'application/x-zip-compressed'
    );
    
    if (hasZipFiles) {
      // Handle zip files directly
      handleFileUpload(droppedFiles);
      return;
    }
    
    if (droppedItems && droppedItems.length > 0) {
      const files = [];
      const promises = [];
      
      for (let i = 0; i < droppedItems.length; i++) {
        const item = droppedItems[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            promises.push(processEntry(entry, ''));
          }
        }
      }
      
      Promise.all(promises).then(results => {
        const allFiles = results.flat().filter(file => {
          const extension = '.' + file.name.split('.').pop().toLowerCase();
          return supportedExtensions.includes(extension);
        });
        
        console.log(`Dropped ${allFiles.length} valid files`);
        setFiles(prevFiles => [...prevFiles, ...allFiles]);
      });
    } else {
      handleFileUpload(droppedFiles);
    }
  };

  const processEntry = async (entry, path) => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          const fileWithPath = {
            ...file,
            displayPath: path + file.name,
            fileName: file.name
          };
          resolve([fileWithPath]);
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        dirReader.readEntries((entries) => {
          const promises = entries.map(subEntry => 
            processEntry(subEntry, path + entry.name + '/')
          );
          Promise.all(promises).then(results => {
            resolve(results.flat());
          });
        });
      } else {
        resolve([]);
      }
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (index) => {
    const fileToRemove = files[index];
    setFiles(files.filter((_, i) => i !== index));
    const newResults = { ...analysisResults };
    delete newResults[fileToRemove.displayPath];
    setAnalysisResults(newResults);
  };

  const getFileType = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const typeMap = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'py': 'python', 'pyw': 'python', 'pyc': 'python',  // All Python variants
      'java': 'java', 'cpp': 'cpp', 'c': 'c', 'cs': 'csharp', 'h': 'c',
      'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust', 'swift': 'swift',
      'kt': 'kotlin', 'scala': 'scala', 'html': 'html', 'css': 'css',
      'json': 'json', 'sql': 'sql', 'sh': 'bash', 'yml': 'yaml', 'yaml': 'yaml',
      'md': 'markdown', 'xml': 'xml', 'toml': 'toml'
    };
    console.log(`File type mapping: ${fileName} -> ${extension} -> ${typeMap[extension] || extension}`);
    return typeMap[extension] || extension;
  };

  const analyzeCode = async (fileContent, fileName, fileType) => {
    console.log(`\n=== AI ANALYSIS DEBUG ===`);
    console.log(`Starting analysis for: ${fileName}`);
    console.log(`File type: ${fileType}`);
    console.log(`Content length: ${fileContent.length}`);

    let truncatedContent = fileContent;
    const maxContentLength = 8000;
    if (fileContent.length > maxContentLength) {
      truncatedContent = fileContent.substring(0, maxContentLength) + '\n\n// ... (file truncated for analysis - showing first ' + maxContentLength + ' characters)';
      console.log(`File truncated from ${fileContent.length} to ${truncatedContent.length} characters`);
    }

    let prompt = `
You are a comprehensive code analyzer. Analyze the following ${fileType} code and provide a detailed JSON response with improvements, fixes, and suggestions.

File: ${fileName}
Code:
\`\`\`${fileType}
${truncatedContent}
\`\`\`

Provide your analysis in the following JSON format:
{
  "errors": [
    {"line": number, "type": "error_type", "description": "description", "fix": "suggested_fix"}
  ],
  "warnings": [
    {"line": number, "type": "warning_type", "description": "description", "suggestion": "suggestion"}
  ],
  "improvements": [
    {"type": "improvement_type", "description": "description", "before": "old_code", "after": "new_code"}
  ],
  "optimizations": [
    {"type": "optimization_type", "description": "description", "impact": "performance_impact"}
  ],
  "security": [
    {"vulnerability": "vulnerability_type", "severity": "high|medium|low", "description": "description", "fix": "fix"}
  ],
  "suggestions": [
    {"category": "category", "suggestion": "suggestion", "benefit": "benefit"}
  ],
  "improvedCode": "complete_improved_version_of_the_code",
  "qualityScore": number_out_of_100,
  "complexity": "low|medium|high",
  "maintainability": "poor|fair|good|excellent"
}

Focus on:
1. Syntax errors and logical bugs
2. Performance optimizations
3. Security vulnerabilities
4. Code style and best practices
5. Modern language features and patterns
6. Error handling improvements
7. Documentation and readability

Your entire response must be valid JSON only. Do not include any text outside the JSON structure. Keep strings concise to avoid truncation.
`;

    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} - Sending request to Claude API...`);
        
        if (attempt > 1) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const currentApiKey = apiKey || config.apiKey;
        if (!currentApiKey) {
          throw new Error('API key not configured. Please add your Anthropic API key in the settings.');
        }
        
        const response = await fetch(config.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": currentApiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens,
            messages: [{ role: "user", content: prompt }]
          })
        });

        console.log(`API Response status: ${response.status}`);
        
        if (response.status === 503) {
          console.log(`API temporarily unavailable (503). Attempt ${attempt}/${maxRetries}`);
          lastError = new Error(`API temporarily overloaded (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            continue;
          } else {
            throw new Error(`API is currently overloaded. Please try again in a few minutes. (503 Service Unavailable after ${maxRetries} attempts)`);
          }
        }
        
        if (response.status === 429) {
          console.log(`Rate limited (429). Attempt ${attempt}/${maxRetries}`);
          lastError = new Error(`Rate limited (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            continue;
          } else {
            throw new Error(`Rate limit exceeded. Please wait a moment and try again. (429 Too Many Requests after ${maxRetries} attempts)`);
          }
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API request failed with status: ${response.status} - ${errorText}`);
          throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`Raw API response:`, data);
        
        let responseText = data.content[0].text;
        console.log(`Response text length: ${responseText.length}`);
        console.log(`Raw response text:`, responseText);
        
        responseText = responseText.trim();
        responseText = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        
        const firstBrace = responseText.indexOf('{');
        if (firstBrace > 0) {
          responseText = responseText.substring(firstBrace);
          console.log(`Trimmed to start at first brace:`, responseText.substring(0, 200));
        }
        
        const lastBrace = responseText.lastIndexOf('}');
        if (lastBrace > 0 && lastBrace < responseText.length - 1) {
          responseText = responseText.substring(0, lastBrace + 1);
          console.log(`Trimmed to end at last brace:`, responseText.substring(-200));
        }
        
        console.log(`Final cleaned response:`, responseText.substring(0, 500));
        
        let parsedResult;
        try {
          parsedResult = JSON.parse(responseText);
          console.log(`Successfully parsed JSON result`);
          return parsedResult;
        } catch (parseError) {
          console.error(`JSON parse error:`, parseError);
          console.error(`Failed to parse this text:`, responseText);
          
          if (responseText.includes('"improvedCode":') && !responseText.endsWith('}')) {
            console.log(`Attempting to repair truncated JSON...`);
            let repairedJson = responseText;
            
            const lastQuote = repairedJson.lastIndexOf('"');
            const lastBrace = repairedJson.lastIndexOf('}');
            
            if (lastQuote > lastBrace) {
              repairedJson = repairedJson.substring(0, lastQuote + 1);
              
              if (!repairedJson.includes('"qualityScore":')) {
                repairedJson += ',"qualityScore":75,"complexity":"medium","maintainability":"fair"';
              }
              
              if (!repairedJson.endsWith('}')) {
                repairedJson += '}';
              }
              
              console.log(`Repaired JSON preview:`, repairedJson.substring(-200));
              
              try {
                parsedResult = JSON.parse(repairedJson);
                console.log(`Successfully parsed repaired JSON!`);
                return parsedResult;
              } catch (repairError) {
                console.error(`Repair attempt failed:`, repairError);
              }
            }
          }
          
          if (attempt < maxRetries) {
            console.log(`JSON parsing failed, retrying with shorter prompt...`);
            lastError = new Error(`JSON parsing failed: ${parseError.message}`);
            
            if (attempt === maxRetries - 1) {
              prompt = `
Analyze this ${fileType} code and return ONLY a short JSON response (under 3000 characters):

\`\`\`${fileType}
${fileContent.substring(0, 1000)}${fileContent.length > 1000 ? '\n// ... (truncated for analysis)' : ''}
\`\`\`

Return only this JSON structure:
{
  "errors": [{"line": 0, "type": "type", "description": "desc", "fix": "fix"}],
  "warnings": [],
  "improvements": [{"type": "type", "description": "short desc", "before": "old", "after": "new"}],
  "optimizations": [],
  "security": [],
  "suggestions": [{"category": "cat", "suggestion": "suggestion", "benefit": "benefit"}],
  "improvedCode": "improved version of the code",
  "qualityScore": 75,
  "complexity": "medium",
  "maintainability": "fair"
}

Keep all strings short and do not include long code blocks in the response.
`;
              console.log(`Using shortened prompt for final retry`);
            }
            
            continue;
          }
          
          return {
            errors: [{"line": 0, "type": "json_parse_error", "description": `JSON parsing failed: ${parseError.message}`, "fix": "API response was malformed - try analyzing a smaller file or simpler code"}],
            warnings: [{"line": 0, "type": "response_warning", "description": "Analysis may be incomplete due to parsing issues", "suggestion": "Try analyzing again with simpler code"}],
            improvements: [],
            optimizations: [],
            security: [],
            suggestions: [{"category": "technical", "suggestion": "Break large files into smaller pieces for better analysis", "benefit": "More reliable analysis results"}],
            improvedCode: fileContent,
            qualityScore: 50,
            complexity: "unknown",
            maintainability: "unknown"
          };
        }
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < maxRetries) {
          console.log(`Retrying in a moment...`);
          continue;
        }
      }
    }
    
    console.error("All retry attempts failed. Last error:", lastError);
    return {
      errors: [{"line": 0, "type": "api_error", "description": `Failed to analyze code: ${lastError.message}`, "fix": "Try again in a few minutes. The AI service may be temporarily busy."}],
      warnings: [{"line": 0, "type": "service_warning", "description": "Analysis service temporarily unavailable", "suggestion": "Please try again later"}],
      improvements: [],
      optimizations: [],
      security: [],
      suggestions: [{"category": "retry", "suggestion": "Wait a few minutes and try analyzing again", "benefit": "Service availability typically improves quickly"}],
      improvedCode: fileContent,
      qualityScore: 0,
      complexity: "unknown",
      maintainability: "unknown"
    };
  };

  // Individual file analysis only
  const runIndividualAnalysis = async () => {
    setAnalysisMode('single');
    await analyzeAllFiles();
  };

  // System analysis (includes individual files first)
  const runSystemAnalysis = async () => {
    setAnalysisMode('whole');
    await analyzeAllFiles();
    // analyzeSystemArchitecture will be called automatically after analyzeAllFiles
  };

  // Error-focused analysis (includes individual files first)
  const runErrorFocus = async () => {
    setAnalysisMode('errors');
    await analyzeAllFiles();
  };

  // Business report (includes individual files, system analysis, then report)
  const runBusinessReport = async () => {
    setAnalysisMode('report');
    await analyzeAllFiles();
    // System analysis and report generation will be called automatically
  };

  // Complete analysis (all steps)
  const runCompleteAnalysis = async () => {
    setAnalysisMode('whole');
    await analyzeAllFiles();
    // All subsequent steps will be called automatically
  };

  const analyzeAllFiles = async () => {
    if (files.length === 0) return;

    setAnalyzing(true);
    setAnalysisResults({});
    setSystemAnalysis(null);
    setPlainEnglishReport(null);
    setApiStatus({ hasIssues: false, message: '', type: '' });
    
    let hasApiIssues = false;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const displayName = file.displayPath || file.name;
      setCurrentAnalysis(`Analyzing individual files: ${displayName}... (${i + 1}/${files.length})`);
      
      try {
        console.log(`\n=== ANALYZING FILE ===`);
        console.log(`File: ${displayName}`);
        console.log(`File size: ${file.size} bytes`);
        console.log(`File type detected: ${file.type}`);
        
        const content = await file.text();
        console.log(`Content length: ${content.length} characters`);
        console.log(`Content preview (first 200 chars):`, content.substring(0, 200));
        console.log(`Content seems to be text: ${content.length > 0 && !content.includes('\0')}`);
        
        const fileType = getFileType(file.fileName || file.name);
        console.log(`Mapped file type for analysis: ${fileType}`);
        
        if (content.length === 0) {
          throw new Error('File appears to be empty');
        }
        
        if (content.includes('\0')) {
          throw new Error('File appears to be binary, not text');
        }
        
        console.log(`Starting AI analysis...`);
        const result = await analyzeCode(content, displayName, fileType);
        console.log(`Analysis completed successfully`);
        
        if (result.errors?.some(error => error.type === 'api_error')) {
          hasApiIssues = true;
        }
        
        setAnalysisResults(prev => ({
          ...prev,
          [displayName]: {
            ...result,
            originalCode: content,
            fileType: fileType,
            wasTruncated: content.length > 8000
          }
        }));
      } catch (error) {
        console.error(`Error analyzing ${displayName}:`, error);
        hasApiIssues = true;
        setAnalysisResults(prev => ({
          ...prev,
          [displayName]: {
            errors: [{"line": 0, "type": "read_error", "description": "Could not read file", "fix": "Ensure file is valid text"}],
            warnings: [], improvements: [], optimizations: [], security: [], suggestions: [],
            improvedCode: "", qualityScore: 0, complexity: "unknown", maintainability: "unknown",
            originalCode: "", fileType: getFileType(file.fileName || file.name)
          }
        }));
      }
    }
    
    if (hasApiIssues) {
      setApiStatus({
        hasIssues: true,
        message: 'The AI analysis service was temporarily busy during some file analysis. You can try re-analyzing specific files or the whole project.',
        type: 'warning'
      });
    }
    
    setAnalyzing(false);
    setCurrentAnalysis('');
    
    // Only continue to system analysis if mode requires it
    if (analysisMode === 'whole' || analysisMode === 'report') {
      setTimeout(() => {
        analyzeSystemArchitecture();
      }, 1000);
    } else {
      // For individual file analysis, make sure we're showing the results
      if (analysisMode !== 'single' && analysisMode !== 'errors') {
        setAnalysisMode('single'); // Default to showing individual file results
      }
    }
  };

  const analyzeSystemArchitecture = async () => {
    if (Object.keys(analysisResults).length === 0) return;

    setAnalyzingSystem(true);
    setCurrentAnalysis('Analyzing system architecture and file relationships...');

    try {
      console.log(`\n=== SYSTEM ANALYSIS DEBUG ===`);
      console.log(`Number of files to analyze: ${Object.keys(analysisResults).length}`);
      
      const fileData = Object.entries(analysisResults).map(([filePath, result]) => {
        console.log(`Preparing file: ${filePath}, Content length: ${result.originalCode?.length || 0}`);
        return {
          path: filePath,
          content: result.originalCode || '',
          fileType: result.fileType || 'unknown',
          individualAnalysis: {
            qualityScore: result.qualityScore || 0,
            complexity: result.complexity || 'unknown',
            errors: result.errors?.length || 0,
            warnings: result.warnings?.length || 0,
            security: result.security?.length || 0
          }
        };
      });

      console.log(`Prepared ${fileData.length} files for system analysis`);

      const limitedFileData = fileData.map(file => ({
        ...file,
        content: file.content.length > 3000 ? file.content.substring(0, 3000) + '\n// ... (truncated for analysis)' : file.content
      }));

      const systemPrompt = `
You are an expert software architect analyzing a complete codebase. Examine all files together to understand the system architecture, workflows, dependencies, and relationships.

FILES IN CODEBASE (${limitedFileData.length} files):
${limitedFileData.map(file => `
File: ${file.path} (${file.fileType})
Quality Score: ${file.individualAnalysis.qualityScore}/100
Errors: ${file.individualAnalysis.errors}, Warnings: ${file.individualAnalysis.warnings}, Security Issues: ${file.individualAnalysis.security}

Content:
\`\`\`${file.fileType}
${file.content}
\`\`\`
`).join('\n')}

Analyze this codebase as a complete system and provide a comprehensive JSON response:

{
  "architecture": {
    "pattern": "architecture_pattern_used",
    "description": "overall_architecture_description",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"]
  },
  "dependencies": [
    {"from": "file1", "to": "file2", "type": "import|function_call|data_flow", "description": "relationship_description"}
  ],
  "workflow": {
    "entryPoints": ["main_files"],
    "dataFlow": "description_of_data_flow_through_system",
    "executionPath": "typical_execution_path"
  },
  "codeOrganization": {
    "structure": "how_code_is_organized",
    "separation": "separation_of_concerns_analysis",
    "modularity": "low|medium|high",
    "reusability": "poor|fair|good|excellent"
  },
  "crossFileIssues": [
    {"type": "issue_type", "description": "description", "files": ["affected_files"], "impact": "impact", "solution": "recommended_solution"}
  ],
  "systemSuggestions": [
    {"category": "refactoring|architecture|performance|security|maintainability", "suggestion": "suggestion", "benefit": "benefit", "effort": "low|medium|high"}
  ],
  "missingComponents": [
    {"component": "missing_component", "purpose": "why_needed", "priority": "low|medium|high"}
  ],
  "overallAssessment": {
    "maintainability": "poor|fair|good|excellent",
    "scalability": "poor|fair|good|excellent", 
    "testability": "poor|fair|good|excellent",
    "security": "poor|fair|good|excellent",
    "performance": "poor|fair|good|excellent",
    "systemScore": 75
  },
  "refactoringPriorities": [
    {"priority": "high|medium|low", "task": "refactoring_task", "reason": "why_important", "estimatedEffort": "time_estimate"}
  ]
}

Focus on:
1. How files interact and depend on each other
2. Overall system architecture and design patterns
3. Data flow and execution paths through the system
4. Cross-file code duplication and inconsistencies
5. System-level security and performance issues
6. Opportunities for architectural improvements
7. Missing abstractions or components
8. Workflow optimization opportunities

Your entire response must be valid JSON only. Do not include any text outside the JSON structure.
`;

      console.log(`System prompt length: ${systemPrompt.length} characters`);
      console.log(`Sending system analysis request...`);

      const currentApiKey = apiKey || config.apiKey;
      if (!currentApiKey) {
        throw new Error('API key not configured. Please add your Anthropic API key in the settings.');
      }
      
      const response = await fetch(config.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": currentApiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          messages: [{ role: "user", content: systemPrompt }]
        })
      });

      console.log(`System analysis response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`System analysis API error: ${response.status} - ${errorText}`);
        throw new Error(`System analysis failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`System analysis raw response:`, data);
      
      let responseText = data.content[0].text;
      console.log(`System response text length: ${responseText.length}`);
      console.log(`System response preview:`, responseText.substring(0, 500));
      
      responseText = responseText.trim();
      responseText = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      
      const firstBrace = responseText.indexOf('{');
      if (firstBrace > 0) {
        responseText = responseText.substring(firstBrace);
      }
      
      const lastBrace = responseText.lastIndexOf('}');
      if (lastBrace > 0 && lastBrace < responseText.length - 1) {
        responseText = responseText.substring(0, lastBrace + 1);
      }
      
      console.log(`Cleaned system response preview:`, responseText.substring(0, 500));
      
      let systemResult;
      try {
        systemResult = JSON.parse(responseText);
        console.log(`Successfully parsed system analysis JSON`);
      } catch (parseError) {
        console.error(`System analysis JSON parse error:`, parseError);
        console.error(`Failed to parse this text:`, responseText);
        throw new Error(`JSON parsing failed: ${parseError.message}`);
      }
      
      setSystemAnalysis(systemResult);
      
    } catch (error) {
      console.error("System analysis error details:", error);
      console.error("Error stack:", error.stack);
      
      // Don't set a fake systemAnalysis object - leave it null to indicate failure
      // Instead, switch to showing individual file results so user sees something useful
      setAnalysisMode('single');
      
      // Set an API status to indicate the system analysis failed
      setApiStatus({
        hasIssues: true,
        message: `System analysis failed: ${error.message}. Your individual file analysis completed successfully - click "Individual Files" to see those results.`,
        type: 'warning'
      });
    }

    setAnalyzingSystem(false);
    setCurrentAnalysis('');
    
    // Only continue to report generation if mode requires it
    if (analysisMode === 'report') {
      setTimeout(() => {
        generatePlainEnglishReport();
      }, 1000);
    } else if (analysisMode === 'whole') {
      // Make sure we're showing the system analysis results
      setAnalysisMode('whole');
    }
  };

  const generatePlainEnglishReport = async (additionalContext = '') => {
    if (!systemAnalysis || Object.keys(analysisResults).length === 0) return;

    setGeneratingReport(true);
    setCurrentAnalysis('Generating plain English summary report...');

    try {
      console.log(`\n=== GENERATING PLAIN ENGLISH REPORT ===`);
      
      const totalFiles = Object.keys(analysisResults).length;
      const totalErrors = Object.values(analysisResults).reduce((sum, result) => sum + (result.errors?.length || 0), 0);
      const totalWarnings = Object.values(analysisResults).reduce((sum, result) => sum + (result.warnings?.length || 0), 0);
      const totalSecurity = Object.values(analysisResults).reduce((sum, result) => sum + (result.security?.length || 0), 0);
      const avgQuality = Object.values(analysisResults).reduce((sum, result) => sum + (result.qualityScore || 0), 0) / totalFiles;
      
      const reportPrompt = `
You are an expert technical communicator who explains complex software issues in simple, business-friendly language. Generate a comprehensive summary report for non-technical stakeholders.

CODEBASE ANALYSIS DATA:
- Total Files Analyzed: ${totalFiles}
- Total Critical Errors: ${totalErrors}
- Total Warnings: ${totalWarnings}
- Security Issues: ${totalSecurity}
- Average Code Quality: ${avgQuality.toFixed(1)}/100
- System Score: ${systemAnalysis.overallAssessment.systemScore}/100

SYSTEM ASSESSMENT:
- Architecture: ${systemAnalysis.architecture.pattern}
- Maintainability: ${systemAnalysis.overallAssessment.maintainability}
- Security: ${systemAnalysis.overallAssessment.security}
- Performance: ${systemAnalysis.overallAssessment.performance}
- Scalability: ${systemAnalysis.overallAssessment.scalability}

KEY ISSUES FOUND:
${Object.entries(analysisResults).map(([file, result]) => `
File: ${file}
- Errors: ${result.errors?.length || 0}
- Security Issues: ${result.security?.length || 0}
- Quality Score: ${result.qualityScore || 0}/100
`).join('')}

SYSTEM-LEVEL ISSUES:
${systemAnalysis.crossFileIssues.map(issue => `- ${issue.description}`).join('\n')}

ADDITIONAL CONTEXT FROM USER:
${additionalContext || userNotes || 'No additional context provided'}

Create a comprehensive but easy-to-understand report in JSON format:

{
  "executiveSummary": "2-3 sentence high-level summary of what this code does and its overall health",
  "whatIsThisCode": {
    "purpose": "In simple terms, what is this software supposed to do?",
    "currentState": "How well is it working right now?",
    "mainComponents": ["list", "of", "key", "parts"]
  },
  "keyFindings": {
    "goodNews": ["positive aspects in simple terms"],
    "concerns": ["problems that need attention in simple terms"],
    "urgentIssues": ["critical problems that need immediate attention"]
  },
  "businessImpact": {
    "riskLevel": "Low|Medium|High",
    "potentialProblems": ["what could go wrong for users/business"],
    "timeToFix": "estimate in business terms (hours/days/weeks)",
    "costImplications": "explanation of why this matters financially"
  },
  "whatNeedsFixing": [
    {
      "issue": "problem in simple terms",
      "priority": "High|Medium|Low", 
      "effort": "Easy|Moderate|Complex",
      "benefit": "why fixing this helps the business",
      "files": ["which files need work"]
    }
  ],
  "recommendations": {
    "immediate": ["what to do right now"],
    "shortTerm": ["what to do in next few weeks"],
    "longTerm": ["strategic improvements"]
  },
  "followUpQuestions": [
    "What is the main business goal of this software?",
    "How many users typically use this system?",
    "Are there any specific performance requirements?",
    "What's your timeline for improvements?",
    "Are there budget constraints we should consider?"
  ],
  "fileByFileBreakdown": [
    {
      "file": "filename",
      "purpose": "what this file does in simple terms",
      "issues": ["simple description of problems"],
      "priority": "High|Medium|Low"
    }
  ]
}

Write in a conversational, helpful tone as if explaining to a business owner or project manager. Avoid technical jargon. Focus on business impact and practical next steps.

Your entire response must be valid JSON only.
`;

      console.log(`Generating plain English report...`);

      const currentApiKey = apiKey || config.apiKey;
      if (!currentApiKey) {
        throw new Error('API key not configured. Please add your Anthropic API key in the settings.');
      }
      
      const response = await fetch(config.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": currentApiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4000,
          messages: [{ role: "user", content: reportPrompt }]
        })
      });

      console.log(`Plain English report response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Plain English report API error: ${response.status} - ${errorText}`);
        throw new Error(`Report generation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Plain English report raw response:`, data);
      
      let responseText = data.content[0].text;
      console.log(`Plain English response text length: ${responseText.length}`);
      console.log(`Plain English response preview:`, responseText.substring(0, 500));
      
      responseText = responseText.trim();
      responseText = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      
      const firstBrace = responseText.indexOf('{');
      if (firstBrace > 0) {
        responseText = responseText.substring(firstBrace);
      }
      
      const lastBrace = responseText.lastIndexOf('}');
      if (lastBrace > 0 && lastBrace < responseText.length - 1) {
        responseText = responseText.substring(0, lastBrace + 1);
      }
      
      console.log(`Cleaned plain English response preview:`, responseText.substring(0, 500));
      
      let reportResult;
      try {
        reportResult = JSON.parse(responseText);
        console.log(`Successfully parsed plain English report`);
      } catch (parseError) {
        console.error(`Plain English report JSON parse error:`, parseError);
        console.error(`Failed to parse this text:`, responseText);
        throw new Error(`Report JSON parsing failed: ${parseError.message}`);
      }
      
      setPlainEnglishReport(reportResult);
      setFollowUpQuestions(reportResult.followUpQuestions || []);
      
      // Make sure we're showing the report results
      setAnalysisMode('report');
      
    } catch (error) {
      console.error("Plain English report error:", error);
      setPlainEnglishReport({
        executiveSummary: "Unable to generate summary report due to technical issues.",
        whatIsThisCode: {
          purpose: "Analysis incomplete",
          currentState: "Unable to determine",
          mainComponents: []
        },
        keyFindings: {
          goodNews: [],
          concerns: ["Report generation failed"],
          urgentIssues: ["Unable to create plain English summary"]
        },
        businessImpact: {
          riskLevel: "Unknown",
          potentialProblems: ["Cannot assess due to report generation failure"],
          timeToFix: "Unknown",
          costImplications: "Unable to determine"
        },
        whatNeedsFixing: [],
        recommendations: {
          immediate: ["Try regenerating the report"],
          shortTerm: [],
          longTerm: []
        },
        followUpQuestions: [],
        fileByFileBreakdown: []
      });
    }

    setGeneratingReport(false);
    setCurrentAnalysis('');
  };

  const downloadImprovedFile = (filePath, improvedCode) => {
    console.log(`\n=== DOWNLOAD DEBUG ===`);
    console.log(`File path: ${filePath}`);
    console.log(`Improved code length: ${improvedCode?.length || 0}`);
    console.log(`Improved code preview:`, improvedCode?.substring(0, 200) || 'No code');
    
    if (!improvedCode || improvedCode.length === 0) {
      alert('No improved code available for this file. The analysis may have failed or no improvements were suggested.');
      return;
    }
    
    try {
      const blob = new Blob([improvedCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const fileName = filePath.split('/').pop() || filePath;
      const downloadFileName = `improved_${fileName}`;
      
      console.log(`Download filename: ${downloadFileName}`);
      console.log(`Blob size: ${blob.size} bytes`);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log(`Download initiated successfully`);
      
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download improved file: ${error.message}`);
    }
  };

  const downloadAllImproved = () => {
    console.log(`\n=== DOWNLOAD ALL DEBUG ===`);
    const availableFiles = Object.entries(analysisResults).filter(([filePath, result]) => {
      const hasImprovedCode = result.improvedCode && result.improvedCode.length > 0;
      const isDifferent = result.improvedCode !== result.originalCode;
      console.log(`File: ${filePath}, Has improved code: ${hasImprovedCode}, Is different: ${isDifferent}`);
      return hasImprovedCode && isDifferent;
    });
    
    console.log(`Found ${availableFiles.length} files with improvements`);
    
    if (availableFiles.length === 0) {
      alert('No improved files are available for download. Either the analysis is still running or no improvements were suggested.');
      return;
    }
    
    let downloadCount = 0;
    availableFiles.forEach(([filePath, result], index) => {
      setTimeout(() => {
        downloadImprovedFile(filePath, result.improvedCode);
        downloadCount++;
        if (downloadCount === availableFiles.length) {
          console.log(`All ${downloadCount} improved files downloaded`);
        }
      }, index * 200);
    });
  };

  const getQualityColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      // Update the config with the new API key
      config.apiKey = apiKey.trim();
      setShowApiKeyModal(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Configure API Key</h2>
            <p className="text-gray-600 mb-4">
              Enter your Anthropic API key to enable AI analysis. Your key is stored locally and never sent to any server except Anthropic's API.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleApiKeySubmit}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Save API Key
              </button>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a>
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Comprehensive Code Analyzer
            </h1>
            <p className="text-gray-600">
              Analyze files, folders, ZIP archives, or GitHub repositories with AI-powered insights and improvements
            </p>
          </div>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            title={`API Key: ${getMaskedApiKey()}`}
          >
            <Key className="h-4 w-4" />
            <span className="text-sm">API Key</span>
          </button>
        </div>

        {/* Warning if no API key */}
        {!isApiKeyConfigured() && !apiKey && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800">
                No API key configured. <button onClick={() => setShowApiKeyModal(true)} className="underline font-medium">Add your Anthropic API key</button> to enable AI analysis.
              </span>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:border-blue-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drop files, folders, or ZIP archives here, or choose an option below
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Supports: Python (.py), JavaScript (.js), TypeScript (.ts), Java, C++, and 25+ more
          </p>
          
          {/* Upload Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFolderUpload(e.target.files)}
            />
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              Select Files
            </button>
            
            <button
              onClick={() => {
                console.log('Folder button clicked, webkitdirectory:', folderInputRef.current?.webkitdirectory);
                folderInputRef.current?.click();
              }}
              className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              Select Folder
            </button>
            
            <button
              onClick={() => zipInputRef.current?.click()}
              className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
            >
              <Archive className="h-4 w-4 mr-2" />
              Upload ZIP
            </button>
            
            <button
              onClick={() => document.getElementById('github-input').focus()}
              className="bg-gray-800 text-white px-4 py-3 rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center"
            >
              <Github className="h-4 w-4 mr-2" />
              GitHub Repo
            </button>
          </div>
          
          {/* GitHub Repository Input */}
          <div className="bg-gray-50 p-4 rounded-lg border max-w-2xl mx-auto">
            <div className="flex items-center mb-2">
              <Github className="h-5 w-5 text-gray-600 mr-2" />
              <label className="text-sm font-medium text-gray-700">Load from GitHub Repository:</label>
            </div>
            <div className="flex gap-2">
              <input
                id="github-input"
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingRepo}
              />
              <button
                onClick={handleGithubRepo}
                disabled={loadingRepo || !githubUrl.trim()}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                {loadingRepo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Load Repo
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter a public GitHub repository URL to automatically load all code files
            </p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Uploaded Files ({files.length})</h3>
            <div className="grid grid-cols-1 gap-3">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{file.fileName || file.name}</div>
                      {file.displayPath && (
                        <div className="text-xs text-gray-500 truncate">{file.displayPath}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 text-sm ml-2 flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            {/* Analysis Choice Menu - Show immediately after file upload */}
            {Object.keys(analysisResults).length === 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg shadow-lg p-6 mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Choose Your Analysis Type</h3>
                <p className="text-gray-600 mb-6">Select how you'd like to analyze your code:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <button
                    onClick={() => runIndividualAnalysis()}
                    disabled={analyzing || analyzingSystem || generatingReport || loadingRepo}
                    className="p-6 rounded-lg border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-3">📄</div>
                      <div className="font-semibold text-lg mb-2">Analyze Individual Files</div>
                      <div className="text-sm text-gray-600 mb-3">Review each file separately with detailed feedback on errors, improvements, and code quality</div>
                      <div className="text-xs text-blue-600 font-medium">Best for: Code review, debugging, learning</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => runSystemAnalysis()}
                    disabled={analyzing || analyzingSystem || generatingReport || loadingRepo}
                    className="p-6 rounded-lg border-2 border-green-300 hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-3">🏗️</div>
                      <div className="font-semibold text-lg mb-2">Analyze as Complete System</div>
                      <div className="text-sm text-gray-600 mb-3">Understand architecture, file relationships, and system-wide patterns</div>
                      <div className="text-xs text-green-600 font-medium">Best for: Architecture review, refactoring</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => runErrorFocus()}
                    disabled={analyzing || analyzingSystem || generatingReport || loadingRepo}
                    className="p-6 rounded-lg border-2 border-red-300 hover:border-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-3">🔧</div>
                      <div className="font-semibold text-lg mb-2">Focus on Errors & Fixes</div>
                      <div className="text-sm text-gray-600 mb-3">Identify critical bugs, security issues, and get specific fix recommendations</div>
                      <div className="text-xs text-red-600 font-medium">Best for: Bug fixing, security audit</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => runBusinessReport()}
                    disabled={analyzing || analyzingSystem || generatingReport || loadingRepo}
                    className="p-6 rounded-lg border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-3">📊</div>
                      <div className="font-semibold text-lg mb-2">Business Summary Report</div>
                      <div className="text-sm text-gray-600 mb-3">Get a non-technical summary with business impact and recommendations</div>
                      <div className="text-xs text-purple-600 font-medium">Best for: Stakeholders, project planning</div>
                    </div>
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => runCompleteAnalysis()}
                    disabled={analyzing || analyzingSystem || generatingReport || loadingRepo}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto text-lg font-semibold"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Run Complete Analysis (All of the Above)
                  </button>
                  <p className="text-sm text-gray-500 mt-2">Analyzes files individually, then as a system, then generates a business report</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analysis Progress */}
        {(analyzing || analyzingSystem || generatingReport || loadingRepo || currentAnalysis.includes('Extracting ZIP')) && (
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="font-medium text-blue-800">
                {currentAnalysis}
              </span>
            </div>
          </div>
        )}

        {/* Basic demo message if no files */}
        {files.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Upload some code files to get started with AI-powered analysis!</p>
            <p className="text-sm text-gray-400">This is a demo version - try uploading a small JavaScript or Python file to see the analysis in action.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;