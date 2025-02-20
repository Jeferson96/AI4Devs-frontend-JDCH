import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { useToast } from "../hooks/use-toast";
import { ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";

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
  candidateId: number;
  applicationId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentInterviewStep: string;
  averageScore: number;
}

const Position: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InterviewFlowResponse | null>(null);
  const [candidates, setCandidates] = useState<CandidateProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [flowResponse, candidatesResponse] = await Promise.all([
          axios.get(`http://localhost:3010/positions/${id}/interviewFlow`),
          axios.get(`http://localhost:3010/positions/${id}/candidates`)
        ]);

        setData(flowResponse.data);
        // Verificar que cada candidato tenga un ID válido
        const validCandidates = candidatesResponse.data.filter(
          (candidate: CandidateProgress) => candidate.candidateId != null
        );
        setCandidates(validCandidates);
      } catch (err) {
        setError('Error al cargar los datos requeridos');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;
    const candidateId = parseInt(draggableId.split('-')[1]);

    // Encuentra el candidato usando el ID
    const candidate = candidates.find(c => c.candidateId === candidateId);

    if (!candidate) {
      console.error('No se encontró el candidato', { candidateId, candidates });
      return;
    }

    const newStepId = parseInt(destination.droppableId);

    try {
      // Optimistic update
      const updatedCandidates = candidates.map(c => 
        c.candidateId === candidateId 
          ? { ...c, currentInterviewStep: data?.interviewFlow.interviewFlow.interviewSteps.find(
              step => step.id === newStepId
            )?.name || c.currentInterviewStep } 
          : c
      );
      setCandidates(updatedCandidates);

      // Realizar la actualización en el servidor
      const response = await axios.put(`http://localhost:3010/candidates/${candidateId}/stage`, {
        applicationId: candidate.applicationId,
        currentInterviewStep: newStepId
      });

      toast({
        title: "Éxito",
        description: response.data.message,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la etapa del candidato",
      });
      
      // Recargar datos originales
      const candidatesResponse = await axios.get(`http://localhost:3010/positions/${id}/candidates`);
      setCandidates(candidatesResponse.data);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto mt-5 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
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
    <div className="container mx-auto mt-5 px-4">
      <div className="flex items-center justify-start mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2"
          onClick={() => navigate('/positions')}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-2xl font-bold">
          {data?.interviewFlow.positionName || 'Flujo de Entrevistas'}
        </h2>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.interviewFlow.interviewFlow.interviewSteps.map((step) => (
            <Droppable key={`step-${step.id}`} droppableId={String(step.id)}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="min-h-[200px]"
                >
                  <Card className={`p-4 h-full ${snapshot.isDraggingOver ? 'bg-secondary' : ''}`}>
                    <h3 className="text-lg font-semibold mb-3">{step.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Orden: {step.orderIndex}
                    </p>

                    <div className="space-y-2">
                      {candidates
                        .filter(c => c.currentInterviewStep === step.name)
                        .map((candidate, index) => (
                          <Draggable
                            key={`candidate-${candidate.candidateId}`}
                            draggableId={`candidate-${candidate.candidateId}`}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <Card
                                  className={`p-3 ${
                                    snapshot.isDragging ? 'shadow-lg' : ''
                                  }`}
                                >
                                  <p className="text-sm font-medium">
                                    {`${candidate.firstName} ${candidate.lastName}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Puntaje: {candidate.averageScore}/5
                                  </p>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                    </div>
                    {provided.placeholder}
                  </Card>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Position;
