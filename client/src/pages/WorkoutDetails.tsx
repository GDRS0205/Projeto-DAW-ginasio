// client/src/pages/WorkoutDetails.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getWorkout,
  addWorkoutItem,
  updateWorkoutItem,
  deleteWorkoutItem,
  deleteWorkout,
  downloadWorkoutCsv,
  reorderWorkoutItems,
  addItemLog,
  getItemLogs,
  updateWorkout,
  type WorkoutItem,
  type MuscleGroup,
} from "../api/workouts";
import { listExercises, listPopularExercises, type Exercise } from "../api/exercises";
import { http } from "../api/http";
import { useToast } from "../context/ToastContext";

type ExerciseOption = { id: number; name: string; muscle_group: string };

export default function WorkoutDetails() {
  const { id } = useParams();
  const workoutId = Number(id);
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  // treino
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("corpo inteiro");
  const [workoutNote, setWorkoutNote] = useState("");
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // catálogo e filtros
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [catalog, setCatalog] = useState<ExerciseOption[]>([]);
  const [popular, setPopular] = useState<ExerciseOption[]>([]);

  // form adicionar
  const [selectedExercise, setSelectedExercise] = useState<number | "">("");
  const [sets, setSets] = useState<number>(3);
  const [reps, setReps] = useState<number>(10);
  const [weight, setWeight] = useState<number>(0);

  // logs
  const [logsByItem, setLogsByItem] = useState<
    Record<
      number,
      {
        pr: number;
        bestVolume: number;
        last: Array<{
          id: number;
          ts: string;
          sets: number;
          reps: number;
          weight: number;
        }>;
      }
    >
  >({});

  // drag & drop
  const dragId = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const muscleOptions: MuscleGroup[] = [
    "peito",
    "costas",
    "pernas",
    "ombros",
    "braços",
    "core",
    "corpo inteiro",
  ];

  // carrega treino + catálogo inicial + populares
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getWorkout(workoutId),
      listExercises({
        search: "",
        muscle: "",
        sort: "name,ASC",
        page: 1,
        size: 1000,
      }),
      listPopularExercises(6).catch(
        () =>
          ({ data: [] as Exercise[] } as {
            data: Exercise[];
          })
      ),
    ])
      .then(([wk, ex, pop]) => {
        setName((wk as any)?.name ?? "");
        setMuscleGroup(
          ((wk as any)?.muscle_group as MuscleGroup) ?? "corpo inteiro"
        );
        setWorkoutNote((wk as any)?.notes ?? "");
        setItems(
          Array.isArray((wk as any)?.exercises) ? (wk as any).exercises : []
        );

        // catálogo completo
        setCatalog(
          ((ex.data || []) as Exercise[]).map((e: Exercise) => ({
            id: e.id,
            name: e.name,
            muscle_group: e.muscle_group,
          }))
        );

        // populares
        setPopular(
          ((pop.data || []) as Exercise[]).map((e: Exercise) => ({
            id: e.id,
            name: e.name,
            muscle_group: e.muscle_group,
          }))
        );
      })
      .catch((e: any) => {
        const msg = e?.response?.data?.error || "Erro a carregar treino.";
        setErr(msg);
        showError(msg);
      })
      .finally(() => setLoading(false));
  }, [workoutId, showError]);

  // catálogo filtrado
  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    const g = group.trim().toLowerCase();
    return (catalog || []).filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q)) &&
        (!g || e.muscle_group.toLowerCase() === g)
    );
  }, [catalog, query, group]);

  // volume total
  const totalVolume = useMemo(
    () =>
      (Array.isArray(items) ? items : []).reduce(
        (s, it) =>
          s +
          Math.max(1, it.sets ?? 1) *
            Math.max(1, it.reps ?? 1) *
            Math.max(0, it.weight ?? 0),
        0
      ),
    [items]
  );

  // guardar nome / grupo do treino
  async function saveWorkoutHeader() {
    try {
      const payload: Partial<{
        name: string;
        muscle_group: MuscleGroup;
      }> = {
        name: name.trim(),
        muscle_group: muscleGroup,
      };
      await updateWorkout(workoutId, payload);
      showSuccess("Dados do treino atualizados.");
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao atualizar o treino.";
      showError(msg);
    }
  }

  // adicionar item
  async function onAdd() {
    if (!selectedExercise) {
      showError("Escolhe um exercício primeiro.");
      return;
    }
    try {
      const it = await addWorkoutItem(workoutId, {
        exercise_id: Number(selectedExercise),
        sets: Math.max(1, sets),
        reps: Math.max(1, reps),
        weight: Math.max(0, weight),
      });
      setItems((old) => (Array.isArray(old) ? [...old, it] : [it]));
      setSelectedExercise("");
      showSuccess("Exercício adicionado ao treino.");
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao adicionar exercício.";
      showError(msg);
    }
  }

  // atualizar item
  async function onUpdate(itemId: number, patch: Partial<WorkoutItem>) {
    const target = (items || []).find((i) => i.id === itemId);
    if (!target) return;
    const payload = {
      sets: Math.max(1, patch.sets ?? target.sets),
      reps: Math.max(1, patch.reps ?? target.reps),
      weight: Math.max(0, patch.weight ?? target.weight),
      note: patch.note ?? target.note ?? null,
    };
    try {
      await updateWorkoutItem(itemId, payload);
      setItems((old) => old.map((i) => (i.id === itemId ? { ...i, ...payload } : i)));
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao atualizar exercício.";
      showError(msg);
    }
  }

  async function saveWorkoutNote() {
    try {
      await http.put(`/workouts/${workoutId}/note`, { note: workoutNote });
      showSuccess("Notas do treino guardadas.");
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao guardar nota do treino.";
      showError(msg);
    }
  }

  async function onDeleteItem(itemId: number) {
    if (!confirm("Remover este exercício do treino?")) return;
    try {
      await deleteWorkoutItem(itemId);
      setItems((old) => old.filter((i) => i.id !== itemId));
      const copy = { ...logsByItem };
      delete copy[itemId];
      setLogsByItem(copy);
      showSuccess("Exercício removido do treino.");
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao remover exercício.";
      showError(msg);
    }
  }

  async function onDeleteWorkout() {
    if (!confirm(`Apagar o treino "${name}"?`)) return;
    try {
      await deleteWorkout(workoutId);
      showSuccess("Treino apagado.");
      navigate("/workouts");
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao apagar treino.";
      showError(msg);
    }
  }

  async function onLog(item: WorkoutItem) {
    try {
      await addItemLog(item.id, {
        sets: item.sets,
        reps: item.reps,
        weight: item.weight,
      });
      const fresh = await getItemLogs(item.id, 3);
      setLogsByItem((m) => ({ ...m, [item.id]: fresh }));
      showSuccess("Série registada.");
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao registar histórico.";
      showError(msg);
    }
  }

  // drag & drop
  function handleDragStart(
    e: React.DragEvent<HTMLTableRowElement>,
    id: number
  ) {
    dragId.current = id;
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(
    e: React.DragEvent<HTMLTableRowElement>,
    overId: number
  ) {
    e.preventDefault();
    const fromId = dragId.current;
    setDragging(null);
    dragId.current = null;
    if (fromId == null || fromId === overId) return;

    const current = items.slice();
    const fromIndex = current.findIndex((i) => i.id === fromId);
    const toIndex = current.findIndex((i) => i.id === overId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    setItems(current);

    try {
      await reorderWorkoutItems(
        workoutId,
        current.map((i) => i.id)
      );
    } catch (e: any) {
      setItems(items);
      const msg =
        e?.response?.data?.error || "Falha ao guardar a nova ordem do treino.";
      showError(msg);
    }
  }

  if (loading)
    return (
      <p className="muted" style={{ padding: 24 }}>
        ⏳ A carregar…
      </p>
    );
  if (err)
    return (
      <p className="error" style={{ padding: 24 }}>
        ⚠ {err}
      </p>
    );

  return (
    <section className="card" style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div className="row between center" style={{ marginBottom: 12 }}>
        <button onClick={() => navigate(-1)}>← Voltar</button>

        <div className="col" style={{ flex: 1, margin: "0 16px" }}>
          <label className="tiny-label">Nome do treino</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do treino"
          />
          <div style={{ marginTop: 6 }}>
            <label className="tiny-label">Grupo principal</label>
            <select
              value={muscleGroup}
              onChange={(e) =>
                setMuscleGroup(e.target.value as MuscleGroup)
              }
            >
              {muscleOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button
            style={{ marginTop: 8, alignSelf: "flex-start" }}
            onClick={saveWorkoutHeader}
          >
            Guardar detalhes do treino
          </button>
        </div>

        <div className="row gap">
          <button onClick={() => downloadWorkoutCsv(workoutId)}>
            Exportar CSV
          </button>
          <button className="danger" onClick={onDeleteWorkout}>
            Apagar treino
          </button>
        </div>
      </div>

      {/* Notas do treino */}
      <div className="col" style={{ marginTop: 8 }}>
        <label className="tiny-label">Observações</label>
        <textarea
          placeholder="Notas sobre o treino..."
          value={workoutNote}
          onChange={(e) => setWorkoutNote(e.target.value)}
          rows={3}
        />
        <button
          style={{ marginTop: 6, alignSelf: "flex-end" }}
          onClick={saveWorkoutNote}
        >
          Guardar notas
        </button>
      </div>

      {/* Volume total */}
      <p className="muted" style={{ marginTop: 8 }}>
        Volume total estimado: <strong>{totalVolume.toFixed(1)} kg·reps</strong>
      </p>

      {/* Catálogo / adicionar exercício */}
      <div
        className="card"
        style={{
          marginTop: 12,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Adicionar exercício ao treino</h3>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            placeholder="Procurar exercício…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">Todos os grupos</option>
            {muscleOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedExercise === "" ? "" : String(selectedExercise)}
            onChange={(e) =>
              setSelectedExercise(e.target.value ? Number(e.target.value) : "")
            }
            style={{ minWidth: 220 }}
          >
            <option value="">Escolhe exercício…</option>
            {filteredCatalog.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.muscle_group})
              </option>
            ))}
          </select>

          <div className="mini-number-field">
            <label>Séries</label>
            <input
              type="number"
              min={1}
              value={sets}
              onChange={(e) => setSets(Number(e.target.value) || 1)}
            />
          </div>

          <div className="mini-number-field">
            <label>Reps</label>
            <input
              type="number"
              min={1}
              value={reps}
              onChange={(e) => setReps(Number(e.target.value) || 1)}
            />
          </div>

          <div className="mini-number-field">
            <label>Peso (kg)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value) || 0)}
            />
          </div>

          <button onClick={onAdd}>Adicionar</button>
        </div>

        {/* populares */}
        {popular.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <p className="tiny-label" style={{ marginBottom: 4 }}>
              Exercícios populares:
            </p>
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 13 }}
            >
              {popular.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="ghost"
                  style={{ padding: "3px 8px" }}
                  onClick={() => setSelectedExercise(p.id)}
                >
                  {p.name} ({p.muscle_group})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabela de exercícios do treino */}
      <h3 style={{ marginTop: 18 }}>Exercícios no treino</h3>
      {items.length === 0 && (
        <p className="muted">Ainda não adicionaste exercícios a este treino.</p>
      )}

      {items.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Exercício</th>
              <th>Grupo</th>
              <th>Séries</th>
              <th>Reps</th>
              <th>Peso (kg)</th>
              <th>Notas</th>
              <th>Histórico</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const logs = logsByItem[it.id];
              return (
                <tr
                  key={it.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, it.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, it.id)}
                  style={
                    dragging === it.id
                      ? { opacity: 0.5, border: "1px dashed #94a3b8" }
                      : undefined
                  }
                >
                  <td>{idx + 1}</td>
                  <td>{it.name}</td>
                  <td>{it.muscle_group}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={it.sets}
                      onChange={(e) =>
                        onUpdate(it.id, { sets: Number(e.target.value) || 1 })
                      }
                      style={{ width: 60 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={it.reps}
                      onChange={(e) =>
                        onUpdate(it.id, { reps: Number(e.target.value) || 1 })
                      }
                      style={{ width: 60 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={it.weight}
                      onChange={(e) =>
                        onUpdate(it.id, {
                          weight: Number(e.target.value) || 0,
                        })
                      }
                      style={{ width: 80 }}
                    />
                  </td>
                  <td>
                    <textarea
                      rows={2}
                      value={it.note ?? ""}
                      onChange={(e) =>
                        onUpdate(it.id, { note: e.target.value })
                      }
                      style={{ minWidth: 160 }}
                    />
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {logs ? (
                      <div>
                        <div>
                          <strong>PR:</strong>{" "}
                          {logs.pr ? `${logs.pr.toFixed(1)} kg` : "—"}
                        </div>
                        <div>
                          <strong>Melhor volume:</strong>{" "}
                          {logs.bestVolume
                            ? logs.bestVolume.toFixed(1)
                            : "—"}
                        </div>
                        {logs.last && logs.last.length > 0 && (
                          <ul style={{ paddingLeft: 16, margin: "4px 0" }}>
                            {logs.last.map((l) => (
                              <li key={l.id}>
                                {new Date(l.ts).toLocaleDateString("pt-PT")} –{" "}
                                {l.sets}×{l.reps} @ {l.weight}kg
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="small"
                        onClick={() =>
                          getItemLogs(it.id, 3).then((fresh) =>
                            setLogsByItem((m) => ({ ...m, [it.id]: fresh }))
                          )
                        }
                      >
                        Ver histórico
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="small"
                      onClick={() => onLog(it)}
                    >
                      Registar série
                    </button>
                    <button
                      type="button"
                      className="small danger"
                      onClick={() => onDeleteItem(it.id)}
                    >
                      Remover
                    </button>
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
