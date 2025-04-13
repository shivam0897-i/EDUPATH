import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RoadmapSuggestion {
  title: string;
  description: string;
  steps: string[];
  resources: Array<{
    name: string;
    type: string;
    url?: string;
  }>;
}

function validateRoadmapContent(content: any): content is RoadmapSuggestion {
  return (
    typeof content === 'object' &&
    typeof content.title === 'string' &&
    typeof content.description === 'string' &&
    Array.isArray(content.steps) &&
    content.steps.every((step: any) => typeof step === 'string') &&
    Array.isArray(content.resources) &&
    content.resources.every((resource: any) => 
      typeof resource === 'object' &&
      typeof resource.name === 'string' &&
      typeof resource.type === 'string' &&
      (resource.url === undefined || typeof resource.url === 'string')
    )
  );
}

async function generateRoadmapContent(prompt: string, apiKey: string): Promise<RoadmapSuggestion> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `As an expert in educational planning and career development, create a detailed, personalized learning roadmap. 
          
Input Information:
${prompt}

Requirements:
1. The roadmap should be practical and achievable
2. Include specific, actionable steps
3. Recommend high-quality, relevant resources
4. Consider the user's time commitment and background
5. Focus on progressive skill development

Provide the response in this exact JSON format:
{
  "title": "A clear, motivating title for the roadmap",
  "description": "A comprehensive overview of the learning path, including expected outcomes",
  "steps": [
    "Detailed step 1 with clear action items",
    "Detailed step 2 with clear action items",
    ...
  ],
  "resources": [
    {
      "name": "Resource name",
      "type": "Specific type (course/book/tutorial/tool/community)",
      "url": "Direct URL to the resource (if applicable)"
    }
  ]
}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
        stopSequences: ["}"]
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid response format from Gemini API');
  }

  try {
    const generatedText = data.candidates[0].content.parts[0].text;
    const roadmapContent = JSON.parse(generatedText) as RoadmapSuggestion;

    if (!validateRoadmapContent(roadmapContent)) {
      throw new Error('Generated content does not match expected format');
    }

    return roadmapContent;
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${error.message}`);
  }
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Valid prompt is required');
    }

    const roadmapContent = await generateRoadmapContent(prompt, geminiApiKey);

    // Store the roadmap in Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase
      .from('roadmaps')
      .insert({
        prompt,
        content: roadmapContent,
        user_id: userId,
      });

    if (insertError) {
      console.error('Error storing roadmap:', insertError);
      // Continue execution even if storage fails
    }

    return new Response(
      JSON.stringify(roadmapContent),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) { 
    console.error('Error:', error);
    let status = 500; // Default to 500 (Internal Server Error)
    if (error.message.includes('Gemini API key is not configured')) { //Example of a specific check
      status = 503; // Service Unavailable
    } else if (error.message.includes('User ID is required')) {
      status = 400; //Bad Request
    } else if (error.message.includes('Valid prompt is required')) {
      status = 400; //Bad Request
    }
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: status,
      }
    );
  }
};