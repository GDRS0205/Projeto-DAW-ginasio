// client/src/api/workouts.ts
import { http } from "./http";

export type MuscleGroup =
  | "peito"
  | "costas"
  | "pernas"
  | "ombros"
  | "braços"
  | "core"
  | "corpo inteiro";

export interface Workout {
  id: number;
  name: string;
  muscle_group?: MuscleGroup;
  created_at?: string;
  notes?: string | null;
  is_favorite?: number; // 0 ou 1
}

export interface WorkoutItem {
  id: number;
  workout_id: number;
  exercise_id: number;
  name: string;
  muscle_group: MuscleGroup;
  sets: number;
  reps: number;
  weight: number;
  position?: number;
  note?: string | null;
}

export interface WorkoutListResponse {
  data: Workout[];
  total: number;
  page: number;
  size: number;
  totalPages?: number;
}

/* ---------- LISTA / CRUD DE TREINOS ---------- */

export async function listWorkouts(params: {
  page?: number;
  size?: number;
  sort?: string; // ex: "id,DESC"
  search?: string;
  group?: MuscleGroup;
  favorites?: boolean;
}): Promise<WorkoutListResponse> {
  const {
    page = 1,
    size = 10,
    sort = "id,DESC",
    search,
    group,
    favorites,
  } = params;

  const res = await http.get("/workouts", {
    params: {
      page,
      size,
      sort,
      search: search || undefined,
      group: group || undefined,
      favorites: favorites ? 1 : undefined,
    },
  });

  return res.data as WorkoutListResponse;
}

export async function createWorkout(
  name: string,
  muscle_group: MuscleGroup
): Promise<Workout> {
  const res = await http.post("/workouts", { name, muscle_group });
  return res.data;
}

export async function getWorkout(id: number): Promise<{
  id: number;
  name: string;
  notes: string | null;
  exercises: WorkoutItem[];
}> {
  const res = await http.get(`/workouts/${id}`);
  return res.data;
}

export async function updateWorkout(
  id: number,
  payload: Partial<Pick<Workout, "name" | "muscle_group" | "notes">>
): Promise<Workout> {
  const res = await http.put(`/workouts/${id}`, payload);
  return res.data;
}

export async function deleteWorkout(id: number): Promise<void> {
  await http.delete(`/workouts/${id}`);
}

export async function duplicateWorkout(
  id: number,
  newName?: string
): Promise<Workout> {
  const body = newName && newName.trim().length > 0 ? { name: newName.trim() } : {};
  const res = await http.post(`/workouts/${id}/duplicate`, body);
  return res.data as Workout;
}

/* ---------- FAVORITOS ---------- */

export async function setWorkoutFavorite(
  id: number,
  favorite: boolean
): Promise<Workout> {
  const res = await http.put(`/workouts/${id}/favorite`, {
    is_favorite: favorite ? 1 : 0,
  });
  return res.data as Workout;
}

/* ---------- ITENS DO TREINO (EXERCÍCIOS NO TREINO) ---------- */

export async function addWorkoutItem(
  workoutId: number,
  payload: { exercise_id: number; sets: number; reps: number; weight: number }
): Promise<WorkoutItem> {
  const res = await http.post(`/workouts/${workoutId}/exercises`, payload);
  return res.data;
}

export async function updateWorkoutItem(
  itemId: number,
  payload: Partial<Pick<WorkoutItem, "sets" | "reps" | "weight" | "note">>
): Promise<void> {
  await http.put(`/workouts/exercises/${itemId}`, payload);
}

export async function deleteWorkoutItem(itemId: number): Promise<void> {
  await http.delete(`/workouts/exercises/${itemId}`);
}

export async function reorderWorkoutItems(
  workoutId: number,
  itemIdsInOrder: number[]
): Promise<void> {
  await http.put(`/workouts/${workoutId}/reorder`, {
    itemIds: itemIdsInOrder,
  });
}

/* ---------- LOGS / PRS DE ITENS ---------- */

export async function addItemLog(
  itemId: number,
  payload: { sets: number; reps: number; weight: number }
) {
  const res = await http.post(`/workouts/exercises/${itemId}/log`, payload);
  return res.data;
}

export async function getItemLogs(
  itemId: number,
  limit = 3
): Promise<{
  pr: number;
  bestVolume: number;
  last: Array<{
    id: number;
    ts: string;
    sets: number;
    reps: number;
    weight: number;
  }>;
}> {
  const res = await http.get(`/workouts/exercises/${itemId}/logs`, {
    params: { limit },
  });
  return res.data;
}

/* ---------- EXPORTAR CSV ---------- */

export async function downloadWorkoutCsv(id: number): Promise<void> {
  const res = await http.get(`/workouts/${id}/csv`, {
    responseType: "blob",
  });

  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `treino-${id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- RESUMO DE PR POR EXERCÍCIO ---------- */

export type ExercisePrSummary = {
  exercise_id: number;
  exercise_name: string;
  muscle_group: MuscleGroup;
  best_weight: number;
  best_volume: number;
  last_ts: string | null;
};

export async function listExercisePrs(): Promise<ExercisePrSummary[]> {
  const res = await http.get("/workouts/prs");
  return (res.data?.data ?? []) as ExercisePrSummary[];
}

export async function getPrs() {
  const res = await http.get("/workouts/prs");
  return res.data;
}
