import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Lock } from 'lucide-react';

export const MedicalDisclaimer: React.FC = () => {
  return (
    <div className="space-y-4">
      <Alert className="border-primary/20 bg-primary-soft">
        <Shield className="h-4 w-4 text-primary" />
        <AlertDescription className="text-primary">
          <strong>Important Medical Disclaimer:</strong> This AI assistant provides general health information only. 
          It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with 
          qualified healthcare providers for medical decisions.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-secondary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">Emergency Situations</h4>
                <p className="text-sm text-muted-foreground">
                  For life-threatening emergencies, call your local emergency number immediately. 
                  Do not rely on this AI for emergency medical situations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">Privacy & Security</h4>
                <p className="text-sm text-muted-foreground">
                  Your health information is protected by encryption and strict privacy policies. 
                  We comply with healthcare data protection regulations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted">
        <CardContent className="p-4">
          <h4 className="font-semibold text-foreground mb-3">What This AI Can Help With:</h4>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Symptom assessment and guidance</li>
                <li>• General health information</li>
                <li>• Specialist recommendations</li>
                <li>• Self-care suggestions</li>
              </ul>
            </div>
            <div>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Appointment scheduling assistance</li>
                <li>• Health resource connections</li>
                <li>• Medical terminology explanations</li>
                <li>• Preventive care reminders</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};