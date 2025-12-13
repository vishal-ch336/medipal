import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Star, Phone } from 'lucide-react';

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  availability: string;
  location: string;
  distance: string;
  acceptsInsurance: boolean;
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
}

interface SpecialistRecommendationProps {
  specialists: Specialist[];
  onSchedule: (specialistId: string) => void;
}

export const SpecialistRecommendation: React.FC<SpecialistRecommendationProps> = ({
  specialists,
  onSchedule
}) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'destructive';
      case 'urgent': return 'secondary';
      case 'routine': return 'accent';
      default: return 'primary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Recommended Specialists
        </h2>
        <p className="text-muted-foreground">
          Based on your symptoms, here are the most suitable healthcare providers
        </p>
      </div>

      <div className="grid gap-4">
        {specialists.map((specialist) => (
          <Card key={specialist.id} className="shadow-card hover:shadow-medical transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{specialist.name}</CardTitle>
                  <p className="text-secondary font-medium">{specialist.specialty}</p>
                </div>
                <Badge variant={getUrgencyColor(specialist.urgencyLevel)}>
                  {specialist.urgencyLevel === 'emergency' ? 'Immediate' :
                   specialist.urgencyLevel === 'urgent' ? 'Within 24h' : 'Routine'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span>{specialist.rating}/5</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{specialist.availability}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{specialist.distance}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {specialist.acceptsInsurance ? 'Insurance Accepted' : 'Self-Pay'}
                </Badge>
                <span className="text-xs text-muted-foreground">{specialist.location}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="medical" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onSchedule(specialist.id)}
                >
                  <Calendar className="h-4 w-4" />
                  Schedule Appointment
                </Button>
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4" />
                  Call Office
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary-soft border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-1">Need immediate assistance?</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Our medical coordinators are available 24/7 to help you find the right care.
              </p>
              <Button variant="soft" size="sm">
                Connect to Human Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};