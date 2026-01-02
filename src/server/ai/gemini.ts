import { GoogleGenerativeAI } from '@google/generative-ai';
import { ErrorType, classifyError } from './errorClassifier';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

interface AIExplanationRequest {
  questionTitle: string;
  questionDescription: string;
  userQuery: string;
  referenceQuery: string;
  errorMessage: string;
}

interface AIExplanationResponse {
  explanation: string;
  correctedQuery: string;
  bestPractice?: string;
}

function buildPrompt(data: AIExplanationRequest, errorType: ErrorType): string {
  const { questionTitle, questionDescription, userQuery, referenceQuery, errorMessage } = data;

  const baseContext = `
    You are a SQL instructor. A student has submitted an incorrect query for the following problem.
    Problem: "${questionTitle}: ${questionDescription}"
    
    Student Query:
    ${userQuery}

    Reference Solution:
    ${referenceQuery}

    The system detected this specific error:
    "${errorMessage}"
    
    Error Classification: ${errorType}
  `;

  let specificInstruction = '';

  switch (errorType) {
    case ErrorType.COLUMN_COUNT_MISMATCH:
      specificInstruction = `
        Explain that the number of columns returned does not match the requirement.
        List the expected columns vs the actual columns found in the query.
        Keep it brief.
      `;
      break;
    case ErrorType.COLUMN_NAME_MISMATCH:
      specificInstruction = `
        Explain that the column names must match exactly. 
        If the user forgot an alias, point that out explicitly.
      `;
      break;
    case ErrorType.AGGREGATION_ALIAS_MISSING:
      specificInstruction = `
        Explain that when using aggregation functions like AVG/COUNT/SUM, an alias is required to match the expected schema.
        Show the correct alias usage.
      `;
      break;
    case ErrorType.ROW_MISMATCH:
      specificInstruction = `
        The query returns the correct columns but incorrect data (wrong rows).
        Analyze the WHERE clause or filtering logic to explain why the result set is different.
        Do NOT assume row order matters unless specified (comparison is order-independent).
      `;
      break;
    case ErrorType.JOIN_LOGIC_ERROR:
      specificInstruction = `
        The query involves a JOIN which seems to be producing incorrect rows (or duplicates/missing data).
        Explain the mistake in the JOIN condition or type (INNER vs LEFT).
      `;
      break;
    case ErrorType.SYNTAX_ERROR:
      specificInstruction = `
        The query failed to execute. Point out the syntax error clearly.
      `;
      break;
    default:
      specificInstruction = `
        Analyze the logic difference between the student's query and the reference solution.
        Explain the logical flaw.
      `;
  }

  return `
    ${baseContext}

    ${specificInstruction}

    Return your response in strict JSON format with these fields:
    {
      "explanation": "A short, technical explanation of the error (max 2 sentences).",
      "correctedQuery": "The fixed SQL query.",
      "bestPractice": "Optional: One short tip related to the error (e.g. 'Always use aliases for aggregates')."
    }
    
    Do NOT include markdown formatting like \`\`\`json. Just the raw JSON string.
  `;
}

export async function explainError(data: AIExplanationRequest): Promise<AIExplanationResponse> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const errorType = classifyError(data.errorMessage, data.userQuery);
  const prompt = buildPrompt(data, errorType);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown if Gemini adds it despite instructions
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText) as AIExplanationResponse;
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      explanation: 'Unable to generate explanation at this time.',
      correctedQuery: data.referenceQuery,
      bestPractice: 'Check the reference solution.'
    };
  }
}
