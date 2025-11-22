// client/src/pages/PrsSummary.tsx
import { useEffect, useMemo, useState } from "react";
import {
  listExercisePrs,
  type ExercisePrSummary,
  type MuscleGroup,
} from "../api/workouts";

const muscleLabel: Record<MuscleGroup | string, string> = {
  peito: "Peito",
  costas: "Costas",
  pernas: "Pernas",
  ombros: "Ombros",
  "braços": "Braços",
  core: "Core",
  "corpo inteiro": "Corpo inteiro",
};

export default function PrsSummary() {
  const [rows, setRows] = useState<ExercisePrSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "">("");
  const [sort, setSort] = useState<"last" | "weight" | "volume">("last");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");
        const data = await listExercisePrs();
        // a API já devolve um array simples
        setRows(data || []);
      } catch (e: any) {
        console.error(e);
        setErr(e?.response?.data?.error || "Não foi possível carregar os PRs.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const muscleOptions: MuscleGroup[] = [
    "peito",
    "costas",
    "pernas",
    "ombros",
    "braços",
    "core",
    "corpo inteiro",
  ];

  const filtered = useMemo(() => {
    const txt = search.trim().toLowerCase();

    let list = rows.filter((r) => {
      if (group && r.muscle_group !== group) return false;
      if (txt && !r.exercise_name.toLowerCase().includes(txt)) return false;
      return true;
    });

    list = list.slice(); // copiar antes de ordenar

    list.sort((a, b) => {
      if (sort === "weight") {
        return (b.best_weight || 0) - (a.best_weight || 0);
      }
      if (sort === "volume") {
        return (b.best_volume || 0) - (a.best_volume || 0);
      }
      // sort === "last" (mais recente primeiro)
      const ta = a.last_ts ? new Date(a.last_ts).getTime() : 0;
      const tb = b.last_ts ? new Date(b.last_ts).getTime() : 0;
      return tb - ta;
    });

    return list;
  }, [rows, search, group, sort]);

  const totalPrs = rows.length;
  const lastPrDate = useMemo(() => {
    const dates = rows
      .map((r) => (r.last_ts ? new Date(r.last_ts).getTime() : 0))
      .filter((t) => t > 0);
    if (!dates.length) return null;
    return new Date(Math.max(...dates));
  }, [rows]);

  return (
    <section className="card" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Recordes pessoais (PRs)</h2>

      {/* Resumo rápido */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <span className="muted">
          Exercícios com PR registado: <strong>{totalPrs}</strong>
        </span>
        {lastPrDate && (
          <span className="muted">
            Último PR registado em{" "}
            <strong>
              {lastPrDate.toLocaleDateString("pt-PT")}{" "}
              {lastPrDate.toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </span>
        )}
      </div>

      {/* Filtros */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <input
          placeholder="Procurar exercício…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />

        <select
          value={group}
          onChange={(e) =>
            setGroup((e.target.value || "") as MuscleGroup | "")
          }
        >
          <option value="">Todos os grupos</option>
          {muscleOptions.map((g) => (
            <option key={g} value={g}>
              {muscleLabel[g] ?? g}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as "last" | "weight" | "volume")
          }
        >
          <option value="last">Ordenar por último PR</option>
          <option value="weight">Ordenar por carga (kg)</option>
          <option value="volume">Ordenar por volume</option>
        </select>
      </div>

      {loading && <p className="muted">A carregar PRs…</p>}
      {err && (
        <p className="error" style={{ marginTop: 8 }}>
          {err}
        </p>
      )}

      {!loading && !filtered.length && !err && (
        <p className="muted" style={{ marginTop: 8 }}>
          Ainda não tens registos de PR. Faz alguns treinos, guarda logs nas
          séries e volta aqui!
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <table className="table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Exercício</th>
              <th>Grupo</th>
              <th>PR (kg)</th>
              <th>Melhor volume</th>
              <th>Último treino</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const lastDate = r.last_ts ? new Date(r.last_ts) : null;
              return (
                <tr key={r.exercise_id}>
                  <td>{r.exercise_name}</td>
                  <td>{muscleLabel[r.muscle_group] ?? r.muscle_group}</td>
                  <td>
                    {r.best_weight ? r.best_weight.toFixed(1) : "—"}
                  </td>
                  <td>
                    {r.best_volume ? r.best_volume.toFixed(1) : "—"}
                  </td>
                  <td>
                    {lastDate
                      ? lastDate.toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
