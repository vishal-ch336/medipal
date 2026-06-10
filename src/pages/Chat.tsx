import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AppNavbar } from '@/components/AppNavbar';
import { ChatInterface } from '@/components/ChatInterface';
import { SpecialistRecommendation } from '@/components/SpecialistRecommendation';

const Chat = () => {
  const [showSpecialists, setShowSpecialists] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const handleScheduleAppointment = () => {
    setSelectedSpecialty(null);
    setShowSpecialists(true);
  };

  const handleFindSpecialist = (specialty: string) => {
    setSelectedSpecialty(specialty);
    setShowSpecialists(true);
  };

  const handleSpecialistSchedule = (specialistId: string) => {
    alert(`Scheduling appointment with specialist ${specialistId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="max-w-4xl mx-auto p-4">
        {showSpecialists ? (
          <>
            <div className="mb-6 text-center">
              <Button
                variant="outline"
                onClick={() => setShowSpecialists(false)}
                className="mb-4"
              >
                ← Back to Chat
              </Button>
            </div>
            <SpecialistRecommendation
              selectedSpecialty={selectedSpecialty}
              onSchedule={handleSpecialistSchedule}
            />
          </>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-foreground">AI Health Assistant</h1>
            </div>
            <ChatInterface
              onScheduleAppointment={handleScheduleAppointment}
              onFindSpecialist={handleFindSpecialist}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
