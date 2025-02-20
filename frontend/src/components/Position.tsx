import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface InterviewStep {
  id: number;
  interviewFlowId: number;
  interviewTypeId: number;
  name: string;
  orderIndex: number;
}

interface InterviewFlowData {
  id: number;
  description: string;
  interviewSteps: InterviewStep[];
}

interface InterviewFlowResponse {
  interviewFlow: {
    positionName: string;
    interviewFlow: InterviewFlowData;
  };
}

interface CandidateProgress {
  fullName: string;
  idCurrentInterviewStep: number;
  currentInterviewStep: string;
  averageScore: number;
}

interface CandidatesResponse extends Array<CandidateProgress> { }

const Position: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InterviewFlowResponse | null>(null);
  const [candidates, setCandidates] = useState<CandidatesResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [flowResponse, candidatesResponse] = await Promise.all([
          axios.get(`http://localhost:3010/positions/${id}/interviewFlow`),
          axios.get(`http://localhost:3010/positions/${id}/candidates`)
        ]);

        setData(flowResponse.data);
        setCandidates(candidatesResponse.data);
      } catch (err) {
        setError('Error al cargar los datos requeridos');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto mt-5 text-center">
        <p className="mt-2">Cargando información...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto mt-5">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-5">
      <h2 className="text-2xl font-bold text-center mb-4">
        {data?.interviewFlow.positionName || 'Flujo de Entrevistas'}
      </h2>

      {data?.interviewFlow.interviewFlow.interviewSteps?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.interviewFlow.interviewFlow.interviewSteps.map((step) => {
            const stepCandidates = candidates.filter(c => c.idCurrentInterviewStep === step.id);

            return (
              <Card key={step.id} className="p-4">
                <h3 className="text-lg font-semibold">{step.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Orden: {step.orderIndex}
                </p>

                {stepCandidates.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {stepCandidates.map(candidate => (
                      <Card key={candidate.fullName} className="p-3">
                        <p className="text-sm">
                          {candidate.fullName}<br />
                          <span className="text-muted-foreground">
                            Puntaje: {candidate.averageScore}/5
                          </span>
                        </p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    No hay candidatos en este paso
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            No se encontraron pasos en el flujo de entrevistas
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default Position;
