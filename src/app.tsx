import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Clock, Target, Sparkles, ExternalLink } from 'lucide-react';
import { supabase } from './lib/supabase';
import { generateRoadmap } from './lib/ai';
import { Auth } from './components/Auth';
import type { User } from '@supabase/supabase-js';

type Step = {
  id: string;
  question: string;
  placeholder: string;
  icon: React.ReactNode;
};

const steps: Step[] = [
  {
    id: 'goals',
    question: 'What are your educational or career goals?',
    placeholder: 'e.g., Become a software developer, Start a business...',
    icon: <Target className="w-6 h-6" />,
  },
  {
    id: 'background',
    question: 'What is your educational background?',
    placeholder: "e.g., High school, Bachelor's degree...",
    icon: <GraduationCap className="w-6 h-6" />,
  },
  {
    id: 'skills',
    question: 'What skills do you currently have?',
    placeholder: 'e.g., Programming, Marketing, Design...',
    icon: <BookOpen className="w-6 h-6" />,
  },
  {
    id: 'time',
    question: 'How much time can you dedicate weekly?',
    placeholder: 'e.g., 5 hours, 10 hours...',
    icon: <Clock className="w-6 h-6" />,
  },
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleAnswer = async (value: string) => {
    const newAnswers = {
      ...answers,
      [steps[currentStep].id]: value
    };
    setAnswers(newAnswers);

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setLoading(true);
      try {
        const roadmapData = await generateRoadmap(newAnswers);
        console.log("Roadmap data from API:", roadmapData);
        setRoadmap(roadmapData);
        setShowRoadmap(true);
      } catch (error) {
        console.error('Error generating roadmap:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!user) {
    return <Auth />;
  }

  const handleRegenerateRoadmap = () => {
    setAnswers({});
    setRoadmap(null);
    setShowRoadmap(false);
    setCurrentStep(0);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-8">
        <div className="text-center">

          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Generating your personalized roadmap...</p>
        </div>
      </div>
    );
  }

  
  if (showRoadmap && roadmap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-end mb-4">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Sign Out
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-2 mb-8">
              <button 
                onClick={handleRegenerateRoadmap}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
              New Roadmap
              </button>    

              <Sparkles className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-800">{roadmap.title}</h1>
            </div>
            
            <div className="space-y-8">
              <div className="p-6 bg-purple-50 rounded-xl">
                <h2 className="text-xl font-semibold text-purple-800 mb-4">Your Profile</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-medium text-purple-900">Goals</h3>
                    <p className="text-gray-700">{answers.goals}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-purple-900">Background</h3>
                    <p className="text-gray-700">{answers.background}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-purple-900">Current Skills</h3>
                    <p className="text-gray-700">{answers.skills}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-purple-900">Time Commitment</h3>
                    <p className="text-gray-700">{answers.time}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Learning Path</h2>
                <p className="text-gray-700 mb-6">{roadmap.description}</p>
                <div className="space-y-4">
                  {roadmap.steps.map((step: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">Recommended Resources</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {roadmap.resources.map((resource: any, index: number) => (
                    <div key={index} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{resource.name}</h3>
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                      <span className="inline-block px-2 py-1 text-sm bg-purple-100 text-purple-700 rounded">
                        {resource.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Sign Out
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Your Educational Journey Starts Here
          </h1>
          <p className="text-lg text-gray-600">
            Let's create your personalized learning roadmap together
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-8">
            {steps[currentStep].icon}
            <h2 className="text-2xl font-semibold text-gray-800">
              {steps[currentStep].question}
            </h2>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={steps[currentStep].placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  handleAnswer((e.target as HTMLInputElement).value.trim());
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <p className="text-sm text-gray-500">
              Press Enter to continue
            </p>
          </div>

          <div className="mt-8">
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full ${
                    index <= currentStep ? 'bg-purple-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-center mt-4 text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
