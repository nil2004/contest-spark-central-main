
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Upload, Trophy } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: Settings,
      title: "Admin Creates Contest",
      description: "Contest administrators set up campaigns with clear rules, prizes, and dual leaderboard structure.",
      color: "from-purple-500 to-blue-500"
    },
    {
      icon: Upload,
      title: "Influencers Submit",
      description: "Creators submit their content entries with platform links and compete for both engagement and creativity scores.",
      color: "from-blue-500 to-teal-500"
    },
    {
      icon: Trophy,
      title: "Winners Get Rewards",
      description: "Top performers in both Engagement and Creativity leaderboards receive separate prize pools.",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Simple 3-step process to join contests and win amazing prizes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="p-8 text-center">
                <div className="relative mb-6">
                  <div className={`w-16 h-16 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
