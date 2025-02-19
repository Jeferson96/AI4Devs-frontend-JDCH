import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, Container, Spinner, Alert } from 'react-bootstrap';

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
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status" />
        <p className="mt-2">Cargando información...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <h2 className="text-center mb-4">
        {data?.interviewFlow.positionName || 'Flujo de Entrevistas'}
      </h2>

      {data?.interviewFlow.interviewFlow.interviewSteps?.length ? (
        <div className="row">
          {data.interviewFlow.interviewFlow.interviewSteps.map((step) => {
            const stepCandidates = candidates.filter(c => c.idCurrentInterviewStep === step.id);

            return (
              <div key={step.id} className="col-md-4 mb-4">
                <Card className="shadow-sm">
                  <Card.Body>
                    <Card.Title>{step.name}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                      Orden: {step.orderIndex}
                    </Card.Subtitle>

                    {stepCandidates.length > 0 ? (
                      <div className="mt-3">
                        {stepCandidates.map(candidate => (
                          <Card key={candidate.fullName} className="mb-2">
                            <Card.Body>
                              <Card.Text>
                                {candidate.fullName}<br />
                                Puntaje: {candidate.averageScore}/5
                              </Card.Text>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card.Text className="text-muted mt-2">
                        No hay candidatos en este paso
                      </Card.Text>
                    )}
                  </Card.Body>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <Alert variant="info" className="text-center">
          No se encontraron pasos en el flujo de entrevistas
        </Alert>
      )}
    </Container>
  );
};

export default Position;
