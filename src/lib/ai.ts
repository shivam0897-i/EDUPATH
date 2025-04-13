import { supabase } from './supabase';

type RoadmapSuggestion = {
  title: string;
  description: string;
  steps: string[];
  resources: Array<{
    name: string;
    type: string;
    url?: string;
  }>;
};

export async function generateRoadmap(userInputs: Record<string, string>): Promise<RoadmapSuggestion> {
  try {
    const prompt = `
      Create a personalized learning roadmap based on the following information:
      - Goals: ${userInputs.goals}
      - Background: ${userInputs.background}
      - Current Skills: ${userInputs.skills}
      - Weekly Time Commitment: ${userInputs.time}

      Provide specific steps and resources that align with the user's background and time availability.
      Focus on actionable steps and high-quality learning resources.
    `;

    const user = await supabase.auth.getUser();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-roadmap`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-user-id': user.data.user?.id || '',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to generate roadmap: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating roadmap:', error);
    // Fallback response if the API fails
    return {
      title: 'Personalized Learning Path',
      description: 'Based on your profile, here\'s a suggested learning path.',
      steps: [
        'Research fundamental concepts in your area of interest',
        'Start with beginner-friendly tutorials and courses',
        'Practice with hands-on projects',
        'Join relevant communities and forums',
      ],
      resources: [
        {
          name: 'Online Learning Platforms',
          type: 'platform',
          url: 'https://www.coursera.org'
        },
        {
          name: 'Documentation and Tutorials',
          type: 'documentation'
        },
        {
          name: 'Community Forums',
          type: 'community'
        }
      ]
    };
  }
}