// client/src/pages/Stats.tsx
import { useEffect, useMemo, useState } from "react";
import { listWorkouts, listExercisePrs } from "../api/workouts";
import { listExercises } from "../api/exercises";

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
        minWidth: 180,
        flex: 1,
      }}
    >
      <p className="tiny-label" style={{ marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{value}</p>
      {helper && (
        <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>
          {helper}
        </p>
      )}
    </div>
  );
}

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [musclesFromWorkouts, setMusclesFromWorkouts] = useState<string[]>([]);

  const [totalExercises, setTotalExercises] = useState(0);
  const [totalPrExercises, setTotalPrExercises] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");

        const [wRes, exRes, prs] = await Promise.all([
          // apanhamos (quase) todos os treinos do utilizador
          listWorkouts({ page: 1, size: 500, sort: "id,ASC" }),
          // lista de exercícios (apenas para saber o total)
          listExercises({
            search: "",
            muscle: "",
            sort: "name,ASC",
            page: 1,
            size: 1000,
          }) as any,
          // PRs já feitos
          listExercisePrs(),
        ]);

        // treinos
        setTotalWorkouts(wRes.total ?? wRes.data.length ?? 0);
        setWorkoutDates(
          (wRes.data || [])
            .map((w: any) => w.created_at)
            .filter((d: string | null) => !!d)
        );
        setMusclesFromWorkouts(
          (wRes.data || [])
            .map((w: any) => w.muscle_group || "")
            .filter((m: string) => !!m)
        );

        // exercícios
        const exTotal =
          (exRes as any)?.total ??
          ((exRes as any)?.data?.length ?? 0);
        setTotalExercises(exTotal);

        // PRs
        setTotalPrExercises(prs.length);
      } catch (e: any) {
        console.error(e);
        setErr(
          e?.response?.data?.error ||
            "Não foi possível carregar as estatísticas."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const firstWorkout = useMemo(() => {
    if (!workoutDates.length) return null;
    const ts = workoutDates
      .map((d) => new Date(d).getTime())
      .filter((t) => t > 0);
    if (!ts.length) return null;
    return new Date(Math.min(...ts));
  }, [workoutDates]);

  const lastWorkout = useMemo(() => {
    if (!workoutDates.length) return null;
    const ts = workoutDates
      .map((d) => new Date(d).getTime())
      .filter((t) => t > 0);
    if (!ts.length) return null;
    return new Date(Math.max(...ts));
  }, [workoutDates]);

  const favoriteMuscle = useMemo(() => {
    if (!musclesFromWorkouts.length) return null;
    const counts = new Map<string, number>();
    for (const m of musclesFromWorkouts) {
      counts.set(m, (counts.get(m) || 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [m, c] of counts) {
      if (c > bestCount) {
        best = m;
        bestCount = c;
      }
    }
    return best;
  }, [musclesFromWorkouts]);

  return (
    <section className="card" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Estatísticas gerais</h2>

      {loading && <p className="muted">A carregar estatísticas…</p>}
      {err && (
        <p className="error" style={{ marginBottom: 12 }}>
          {err}
        </p>
      )}

      {!loading && !err && (
        <>
          {/* Linha 1 de cartões */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <StatCard
              label="Treinos criados"
              value={totalWorkouts}
              helper="Inclui todos os treinos registados na aplicação."
            />
            <StatCard
              label="Exercícios registados"
              value={totalExercises}
              helper="Número total de exercícios disponíveis no catálogo."
            />
            <StatCard
              label="Exercícios com PR"
              value={totalPrExercises}
              helper="Exercícios nos quais já atingiste um recorde pessoal."
            />
          </div>

          {/* Linha 2 de cartões */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <StatCard
              label="Primeiro treino"
              value={
                firstWorkout
                  ? firstWorkout.toLocaleDateString("pt-PT")
                  : "—"
              }
              helper={
                firstWorkout
                  ? "Dia em que começaste a registar treinos."
                  : "Ainda não tens treinos registados."
              }
            />
            <StatCard
              label="Último treino"
              value={
                lastWorkout
                  ? lastWorkout.toLocaleDateString("pt-PT")
                  : "—"
              }
              helper={
                lastWorkout
                  ? "Data do treino mais recente."
                  : "Ainda não tens treinos registados."
              }
            />
            <StatCard
              label="Grupo mais treinado"
              value={favoriteMuscle ? favoriteMuscle : "—"}
              helper={
                favoriteMuscle
                  ? "Com base no grupo principal definido em cada treino."
                  : "Cria mais treinos para ver esta métrica."
              }
            />
          </div>
        </>
      )}
    </section>
  );
}
