// client/src/api/exercises.ts
import { http } from "./http";

export type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  description?: string | null;
  media_url?: string | null;
};

type Paged<T> = {
  data: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

function toServerSort(sort?: string) {
  if (!sort) return "name,ASC";
  if (sort.includes(":")) {
    const [c, d] = sort.split(":");
    return `${c},${String(d || "asc").toUpperCase()}`;
  }
  return sort;
}

export async function listExercises(params?: {
  search?: string;
  muscle?: string;
  sort?: string;
  page?: number;
  size?: number;
}): Promise<Paged<Exercise>> {
  const { data } = await http.get("/exercises", {
    params: {
      ...params,
      sort: toServerSort(params?.sort),
    },
  });
  return data;
}

export async function getExercise(id: number): Promise<Exercise> {
  const { data } = await http.get(`/exercises/${id}`);
  return data;
}

export async function createExercise(payload: {
  name: string;
  muscle_group: string;
  description?: string | null;
}) {
  const { data } = await http.post("/exercises", payload);
  return data as Exercise;
}

export async function updateExercise(
  id: number,
  payload: Partial<{ name: string; muscle_group: string; description: string | null }>
) {
  const { data } = await http.put(`/exercises/${id}`, payload);
  return data as Exercise;
}

export async function deleteExercise(id: number) {
  const { data } = await http.delete(`/exercises/${id}`);
  return data as { ok: boolean };
}

export async function listPopularExercises(limit = 6) {
  const { data } = await http.get("/exercises/popular", { params: { limit } });
  return data as { data: (Exercise & { times_used?: number })[] };
}

// 🔁 NOVO – duplicar exercício
export async function duplicateExercise(
  id: number,
  newName?: string
): Promise<Exercise> {
  const body =
    newName && newName.trim().length > 0 ? { name: newName.trim() } : {};
  const { data } = await http.post(`/exercises/${id}/duplicate`, body);
  return data as Exercise;
}
