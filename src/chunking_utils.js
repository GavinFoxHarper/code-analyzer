// chunking-utils.js
// Utility functions for intelligent code chunking and analysis

export const CHUNK_CONFIG = {
  MAX_CHUNK_SIZE: 8000,
  OVERLAP_SIZE: 200,
  MAX_FILE_SIZE: 500000,
  COMPLEXITY_THRESHOLD: 1000,
  
  // Language-specific configurations
  LANGUAGE_CONFIGS: {
    javascript: {
      breakPoints: ['}', ';', '\n'],
      functionPattern: /function\s+\w+|=>\s*{|class\s+\w+/g,
      complexity: {
        functionWeight: 10,
        classWeight: 15,
        loopWeight: 5
      }
    },
    python: {
      breakPoints: ['\n', ':', 'def ', 'class '],
      functionPattern: /def\s+\w+|class\s+\w+/g,
      complexity: {
        functionWeight: 10,
        classWeight: 15,
        indentWeight: 2
      }
    },
    java: {
      breakPoints: ['}', ';', '\n'],
      functionPattern: /public\s+\w+|private\s+\w+|protected\s+\w+|class\s+\w+/g,
      complexity: {
        methodWeight: 10,
        classWeight: 20,
        interfaceWeight: 15
      }
    }
  }
};

/**
 * Detects the programming language of a file based on its extension and content
 */
export const detectLanguage = (fileName, content) => {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const extensionMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'javascript',
    'tsx': 'javascript',
    'py': 'python',
    'pyw': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php'
  };

  return extensionMap[extension] || 'generic';
};

/**
 * Calculates complexity score for content
 */
export const calculateComplexity = (content, language = 'generic') => {
  const config = CHUNK_CONFIG.LANGUAGE_CONFIGS[language] || CHUNK_CONFIG.LANGUAGE_CONFIGS.javascript;
  
  const lineCount = content.split('\n').length;
  const functionMatches = content.match(config.functionPattern) || [];
  const functionCount = functionMatches.length;
  
  // Language-specific complexity calculations
  let complexityScore = lineCount;
  
  if (config.complexity) {
    complexityScore += (functionCount * config.complexity.functionWeight);
    
    // Additional language-specific complexity factors
    if (language === 'python') {
      // Count indentation levels for Python
      const indentLevels = content.split('\n').map(line => {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
      });
      const maxIndent = Math.max(...indentLevels);
      complexityScore += (maxIndent * config.complexity.indentWeight);
    }
    
    if (language === 'javascript') {
      // Count nested structures
      const nestedStructures = (content.match(/{\s*{|}\s*}/g) || []).length;
      complexityScore += (nestedStructures * 5);
    }
  }
  
  return complexityScore;
};

/**
 * Finds optimal break points for chunking based on language
 */
export const findOptimalBreakPoint = (content, position, language = 'generic') => {
  const config = CHUNK_CONFIG.LANGUAGE_CONFIGS[language] || CHUNK_CONFIG.LANGUAGE_CONFIGS.javascript;
  const breakPoints = config.breakPoints;
  
  const searchRadius = Math.min(200, content.length - position);
  const searchStart = Math.max(0, position - searchRadius);
  const searchEnd = Math.min(content.length, position + searchRadius);
  
  const candidates = [];
  
  // Find all possible break points in the search area
  for (const breakPoint of breakPoints) {
    let searchPos = searchStart;
    while (searchPos < searchEnd) {
      const foundPos = content.indexOf(breakPoint, searchPos);
      if (foundPos === -1 || foundPos >= searchEnd) break;
      
      candidates.push({
        position: foundPos + breakPoint.length,
        type: breakPoint,
        priority: getBreakPointPriority(breakPoint, language)
      });
      
      searchPos = foundPos + 1;
    }
  }
  
  if (candidates.length === 0) {
    return position;
  }
  
  // Sort by priority and proximity to desired position
  candidates.sort((a, b) => {
    const distanceA = Math.abs(a.position - position);
    const distanceB = Math.abs(b.position - position);
    const priorityDiff = b.priority - a.priority;
    
    // Prioritize by break point type first, then by distance
    if (priorityDiff !== 0) return priorityDiff;
    return distanceA - distanceB;
  });
  
  return candidates[0].position;
};

/**
 * Gets priority for different break point types
 */
const getBreakPointPriority = (breakPoint, language) => {
  const priorities = {
    javascript: {
      '}': 10,
      ';': 8,
      '\n': 3
    },
    python: {
      '\n': 10,
      ':': 8,
      'def ': 15,
      'class ': 15
    },
    java: {
      '}': 12,
      ';': 9,
      '\n': 3
    }
  };
  
  const langPriorities = priorities[language] || priorities.javascript;
  return langPriorities[breakPoint] || 1;
};

/**
 * Creates intelligent chunks with language-aware break points
 */
export const createIntelligentChunks = (content, fileName) => {
  const language = detectLanguage(fileName, content);
  
  if (content.length <= CHUNK_CONFIG.MAX_CHUNK_SIZE) {
    return [{
      content,
      chunkIndex: 0,
      totalChunks: 1,
      fileName,
      language,
      startPosition: 0,
      endPosition: content.length,
      complexity: calculateComplexity(content, language)
    }];
  }

  const chunks = [];
  let currentPosition = 0;
  let chunkIndex = 0;

  while (currentPosition < content.length) {
    let chunkEnd = Math.min(currentPosition + CHUNK_CONFIG.MAX_CHUNK_SIZE, content.length);
    
    // Find optimal break point if not at end of file
    if (chunkEnd < content.length) {
      chunkEnd = findOptimalBreakPoint(content, chunkEnd, language);
    }

    let chunkContent = content.slice(currentPosition, chunkEnd);
    
    // Add contextual information for non-first chunks
    if (chunkIndex > 0 && currentPosition >= CHUNK_CONFIG.OVERLAP_SIZE) {
      const contextStart = Math.max(0, currentPosition - CHUNK_CONFIG.OVERLAP_SIZE);
      const context = content.slice(contextStart, currentPosition);
      
      chunkContent = `/* Context from previous chunk (lines ${getLineNumber(content, contextStart)}-${getLineNumber(content, currentPosition)}):
${context}
--- END CONTEXT ---
*/

${chunkContent}`;
    }

    const chunk = {
      content: chunkContent,
      chunkIndex,
      totalChunks: 0, // Will be set after all chunks are created
      fileName,
      language,
      startPosition: currentPosition,
      endPosition: chunkEnd,
      startLine: getLineNumber(content, currentPosition),
      endLine: getLineNumber(content, chunkEnd),
      complexity: calculateComplexity(chunkContent, language)
    };

    chunks.push(chunk);
    currentPosition = chunkEnd;
    chunkIndex++;
  }

  // Set total chunks for all chunks
  chunks.forEach(chunk => chunk.totalChunks = chunks.length);
  
  return chunks;
};

/**
 * Gets line number for a given character position
 */
const getLineNumber = (content, position) => {
  return content.slice(0, position).split('\n').length;
};

/**
 * Determines if content should be chunked based on size and complexity
 */
export const shouldChunk = (content, fileName) => {
  // Always chunk if exceeds size limit
  if (content.length > CHUNK_CONFIG.MAX_CHUNK_SIZE) {
    return { shouldChunk: true, reason: 'size_limit' };
  }
  
  // Check complexity
  const language = detectLanguage(fileName, content);
  const complexity = calculateComplexity(content, language);
  
  if (complexity > CHUNK_CONFIG.COMPLEXITY_THRESHOLD) {
    return { shouldChunk: true, reason: 'complexity' };
  }
  
  return { shouldChunk: false, reason: 'within_limits' };
};

/**
 * Analyzes chunk relationships and dependencies
 */
export const analyzeChunkRelationships = (chunks) => {
  const relationships = [];
  
  for (let i = 0; i < chunks.length - 1; i++) {
    const currentChunk = chunks[i];
    const nextChunk = chunks[i + 1];
    
    // Look for function/class definitions that might be split
    const currentEnds = findIncompleteStructures(currentChunk.content);
    const nextStarts = findStructureCompletions(nextChunk.content);
    
    if (currentEnds.length > 0 || nextStarts.length > 0) {
      relationships.push({
        chunkIndex: i,
        nextChunkIndex: i + 1,
        type: 'structural_split',
        details: {
          incompleteStructures: currentEnds,
          continuingStructures: nextStarts
        }
      });
    }
  }
  
  return relationships;
};

/**
 * Finds incomplete structures at the end of a chunk
 */
const findIncompleteStructures = (content) => {
  const structures = [];
  const lines = content.split('\n');
  
  // Look for unclosed braces, function definitions without bodies, etc.
  let braceCount = 0;
  let inFunction = false;
  
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
    const line = lines[i].trim();
    
    // Count braces in reverse
    for (const char of line.split('').reverse()) {
      if (char === '}') braceCount++;
      if (char === '{') braceCount--;
    }
    
    // Check for function definitions
    if (line.match(/function\s+\w+|=>\s*$|def\s+\w+.*:$/)) {
      inFunction = true;
    }
  }
  
  if (braceCount > 0) {
    structures.push({ type: 'unclosed_braces', count: braceCount });
  }
  
  if (inFunction) {
    structures.push({ type: 'incomplete_function' });
  }
  
  return structures;
};

/**
 * Finds structure completions at the beginning of a chunk
 */
const findStructureCompletions = (content) => {
  const structures = [];
  const lines = content.split('\n').slice(0, 10);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('}')) {
      structures.push({ type: 'closing_brace', line: trimmed });
    }
    if (trimmed.match(/^\s*\)/)) {
      structures.push({ type: 'closing_parenthesis', line: trimmed });
    }
  }
  
  return structures;
};

/**
 * Generates chunk analysis prompts based on chunk characteristics
 */
export const generateChunkPrompt = (chunk, analysisType, previousChunkSummary = null) => {
  const { content, chunkIndex, totalChunks, fileName, language, complexity, startLine, endLine } = chunk;
  
  let prompt = `Analyze this ${language} code chunk (${chunkIndex + 1}/${totalChunks}) from file: ${fileName}
Lines: ${startLine}-${endLine}
Complexity Score: ${complexity}

`;

  if (totalChunks > 1) {
    prompt += `Note: This is part ${chunkIndex + 1} of ${totalChunks} chunks from a larger file.
${previousChunkSummary ? `Previous chunk summary: ${previousChunkSummary}` : ''}
Please consider potential cross-chunk dependencies and incomplete structures.

`;
  }

  prompt += `Analysis type: ${analysisType}

Code to analyze:
\`\`\`${language}
${content}
\`\`\`

Focus on:
1. ${language}-specific best practices and patterns
2. Code quality and maintainability
3. Security vulnerabilities and performance issues
4. Structural completeness (for chunked files)
${totalChunks > 1 ? '5. Cross-chunk dependencies and references' : ''}

Provide structured analysis with specific line references where possible.`;

  return prompt;
};

export default {
  CHUNK_CONFIG,
  detectLanguage,
  calculateComplexity,
  createIntelligentChunks,
  shouldChunk,
  analyzeChunkRelationships,
  generateChunkPrompt
};