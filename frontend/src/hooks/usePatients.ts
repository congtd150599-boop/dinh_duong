import type { AssessmentInput } from '@dinhduong/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPatient, deletePatient, listPatients } from '../api/patients';

const PATIENTS_KEY = ['patients'];

export function usePatients() {
  return useQuery({ queryKey: PATIENTS_KEY, queryFn: listPatients });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssessmentInput) => createPatient(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PATIENTS_KEY }),
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PATIENTS_KEY }),
  });
}
