import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatInterface } from '@/components/ChatInterface';
import { SpecialistRecommendation } from '@/components/SpecialistRecommendation';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { DataIngestion } from '@/components/DataIngestion';
import { Stethoscope, MessageCircle, Calendar, Shield, Brain, Heart, Database } from 'lucide-react';
import heroImage from '@/assets/medical-ai-hero.jpg';

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'chat' | 'specialists' | 'disclaimer' | 'ingestion'>('home');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);


  const handleScheduleAppointment = () => {
    setSelectedSpecialty(null);
    setCurrentView('specialists');
  };

  const handleFindSpecialist = (specialty: string) => {
    setSelectedSpecialty(specialty);
    setCurrentView('specialists');
  };

  const handleSpecialistSchedule = (specialistId: string) => {
    // In a real app, this would open a scheduling interface
    alert(`Scheduling appointment with specialist ${specialistId}`);
  };

  if (currentView === 'chat') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <Button variant="outline" onClick={() => setCurrentView('home')} className="mb-4">
              ← Back to Home
            </Button>
            <h1 className="text-3xl font-bold text-foreground">AI Health Assistant</h1>
          </div>
          <ChatInterface
            onScheduleAppointment={handleScheduleAppointment}
            onFindSpecialist={handleFindSpecialist}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'specialists') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <Button variant="outline" onClick={() => setCurrentView('chat')} className="mb-4">
              ← Back to Chat
            </Button>
          </div>
          <SpecialistRecommendation 
            selectedSpecialty={selectedSpecialty}
            onSchedule={handleSpecialistSchedule}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'disclaimer') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <Button variant="outline" onClick={() => setCurrentView('home')} className="mb-4">
              ← Back to Home
            </Button>
            <h1 className="text-3xl font-bold text-foreground mb-2">Medical Information & Privacy</h1>
          </div>
          <MedicalDisclaimer />
        </div>
      </div>
    );
  }

  if (currentView === 'ingestion') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 text-center">
            <Button variant="outline" onClick={() => setCurrentView('home')} className="mb-4">
              ← Back to Home
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Admin Data Ingestion</h1>
            <p className="text-muted-foreground mt-2">
              Upload medical documents to enrich the AI knowledge base.
            </p>
          </div>
          <DataIngestion />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        ></div>
        <div className="relative z-10 container mx-auto px-4 py-20 text-center text-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              AI-Powered Healthcare
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">
                At Your Fingertips
              </span>
            </h1>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Get instant symptom assessment, personalized health guidance, and seamless connection 
              to qualified healthcare providers - all powered by advanced AI technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => setCurrentView('chat')}
                className="text-lg px-8 py-4"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Start Health Assessment
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setCurrentView('disclaimer')}
                className="text-lg px-8 py-4 bg-white/10 text-white border-white/30 hover:bg-white/20"
              >
                <Shield className="mr-2 h-5 w-5" />
                Privacy & Safety
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('ingestion')}
              className="mt-6 text-white/80 hover:text-white hover:bg-white/10"
            >
              <Database className="mr-2 h-4 w-4" />
              Admin: Upload Medical Documents
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Advanced Healthcare Intelligence
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of healthcare with our AI-powered platform designed 
              for accurate, empathetic, and secure medical assistance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="shadow-medical hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Intelligent Symptom Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Advanced AI analyzes your symptoms with medical-grade accuracy, 
                  asking follow-up questions to understand your condition better.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-medical hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Stethoscope className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Expert Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Get personalized specialist recommendations and treatment guidance 
                  based on evidence-backed medical knowledge.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-medical hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Seamless Care Coordination</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Schedule appointments, connect with providers, and access human support 
                  whenever you need additional assistance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-primary-soft">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <Heart className="h-12 w-12 text-primary mr-4" />
              <h2 className="text-3xl font-bold text-primary">Trusted Healthcare Technology</h2>
            </div>
            <p className="text-lg text-muted-foreground mb-8">
              Our AI healthcare assistant is built with the highest standards of medical accuracy, 
              data privacy, and regulatory compliance to ensure your health information is protected.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-primary mb-2">HIPAA Compliant</div>
                <p className="text-sm text-muted-foreground">Full data protection compliance</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-2">24/7 Available</div>
                <p className="text-sm text-muted-foreground">Round-the-clock health support</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-2">Evidence-Based</div>
                <p className="text-sm text-muted-foreground">Medical knowledge from trusted sources</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Begin your personalized health assessment today and discover how AI can enhance your healthcare journey.
          </p>
          <Button 
            variant="hero"
            size="lg"
            onClick={() => setCurrentView('chat')}
            className="text-lg px-8 py-4"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Start Your Health Assessment
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
