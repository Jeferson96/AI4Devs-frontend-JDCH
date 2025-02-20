/**
 * @fileoverview Componente Position - Gestiona el tablero Kanban de candidatos
 * Permite visualizar y gestionar el flujo de entrevistas de una posición,
 * con funcionalidad de arrastrar y soltar para mover candidatos entre etapas.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { useToast } from "../hooks/use-toast";
import { ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";

// Interfaces que definen la estructura de datos
/** Representa una etapa en el flujo de entrevistas */
interface InterviewStep {
  id: number;
  interviewFlowId: number;
  interviewTypeId: number;
  name: string;
  orderIndex: number;
}

/** Define la estructura del flujo de entrevistas */
interface InterviewFlowData {
  id: number;
  description: string;
  interviewSteps: InterviewStep[];
}

/** Respuesta del servidor para el flujo de entrevistas */
interface InterviewFlowResponse {
  interviewFlow: {
    positionName: string;
    interviewFlow: InterviewFlowData;
  };
}

/** Información de progreso de un candidato */
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

/**
 * Componente de carga que se muestra mientras se obtienen los datos
 */
const LoadingSpinner: React.FC = () => (
  <div className="container mx-auto mt-5 text-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
    <p className="mt-2">Cargando información...</p>
  </div>
);

/**
 * Componente para mostrar mensajes de error
 * @param {string} message - Mensaje de error a mostrar
 */
const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <div className="container mx-auto mt-5">
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  </div>
);

/**
 * Componente que representa una tarjeta de candidato en el tablero
 * @param {CandidateProgress} candidate - Datos del candidato
 * @param {Object} provided - Props proporcionados por react-beautiful-dnd
 * @param {Object} snapshot - Estado del drag and drop
 */
const CandidateCard: React.FC<{
  candidate: CandidateProgress;
  provided: any;
  snapshot: any;
}> = ({ candidate, provided, snapshot }) => (
  <div
    ref={provided.innerRef}
    {...provided.draggableProps}
    {...provided.dragHandleProps}
  >
    <Card className={`p-3 ${snapshot.isDragging ? 'shadow-lg' : ''}`}>
      <p className="text-sm font-medium">
        {`${candidate.firstName} ${candidate.lastName}`}
      </p>
      <p className="text-xs text-muted-foreground">
        Puntaje: {candidate.averageScore}/5
      </p>
    </Card>
  </div>
);

/**
 * Componente principal que gestiona el tablero Kanban de candidatos
 * Permite visualizar y mover candidatos entre diferentes etapas del proceso
 */
const Position: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InterviewFlowResponse | null>(null);
  const [candidates, setCandidates] = useState<CandidateProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Obtiene los datos del flujo de entrevistas y candidatos del servidor
   * @returns {Promise<void>}
   */
  const fetchData = useCallback(async () => {
    try {
      // Realiza peticiones paralelas para optimizar el tiempo de carga
      const [flowResponse, candidatesResponse] = await Promise.all([
        axios.get(`http://localhost:3010/positions/${id}/interviewFlow`),
        axios.get(`http://localhost:3010/positions/${id}/candidates`)
      ]);

      setData(flowResponse.data);
      // Filtra candidatos inválidos (sin ID)
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
  }, [id]);

  // Carga inicial de datos
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Maneja el evento de finalización de arrastre de una tarjeta
   * Actualiza la etapa del candidato tanto en el estado local como en el servidor
   * @param {DropResult} result - Resultado del evento de arrastre
   */
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;
    const candidateId = parseInt(draggableId.split('-')[1]);
    const candidate = candidates.find(c => c.candidateId === candidateId);

    if (!candidate) {
      console.error('No se encontró el candidato', { candidateId, candidates });
      return;
    }

    const newStepId = parseInt(destination.droppableId);

    try {
      // Actualización optimista del estado
      const updatedCandidates = candidates.map(c => 
        c.candidateId === candidateId 
          ? { ...c, currentInterviewStep: data?.interviewFlow.interviewFlow.interviewSteps.find(
              step => step.id === newStepId
            )?.name || c.currentInterviewStep } 
          : c
      );
      setCandidates(updatedCandidates);

      // Actualización en el servidor
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
      // Recargar datos en caso de error
      await fetchData();
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;

  // Ordena los pasos por orderIndex para mantener consistencia visual
  const sortedSteps = [...(data?.interviewFlow.interviewFlow.interviewSteps || [])].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  return (
    <div className="container mx-auto mt-5 px-4">
      {/* Barra de navegación superior */}
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

      {/* Tablero Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSteps.map((step) => (
            <Droppable key={`step-${step.id}`} droppableId={String(step.id)}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="min-h-[200px]"
                >
                  <Card className={`p-4 h-full ${snapshot.isDraggingOver ? 'bg-secondary' : ''}`}>
                    <h3 className="text-lg font-semibold mb-3">{step.name}</h3>
                    <div className="space-y-2">
                      {/* Lista de candidatos en la etapa actual */}
                      {candidates
                        .filter(c => c.currentInterviewStep === step.name)
                        .map((candidate, index) => (
                          <Draggable
                            key={`candidate-${candidate.candidateId}`}
                            draggableId={`candidate-${candidate.candidateId}`}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <CandidateCard
                                candidate={candidate}
                                provided={provided}
                                snapshot={snapshot}
                              />
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
