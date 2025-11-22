import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createExercise,
  getExercise,
  updateExercise,
} from "../api/exercises";
import type { Exercise } from "../api/exercises";

export default function ExerciseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  // estado do formulário
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // carregar dados quando é edição
  useEffect(() => {
    if (!editing) return;
    setLoading(true);
    getExercise(Number(id))
      .then((ex: Exercise) => {
        setName(ex.name);
        setMuscle(ex.muscle_group);
        setDescription(ex.description ?? "");
      })
      .catch((e: any) => {
        setError(e?.response?.data?.error || "Não foi possível carregar o exercício.");
      })
      .finally(() => setLoading(false));
  }, [editing, id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !muscle.trim()) {
      setError("Nome e Grupo Muscular são obrigatórios.");
      return;
    }

    try {
      setLoading(true);
      if (editing) {
        await updateExercise(Number(id), {
          name: name.trim(),
          muscle_group: muscle.trim(),
          description: description || null,
        });
      } else {
        await createExercise({
          name: name.trim(),
          muscle_group: muscle.trim(),
          description: description || null,
        });
      }
      navigate("/exercises");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Erro ao gravar o exercício.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card form-card">
      <h2>{editing ? "Editar Exercício" : "Novo Exercício"}</h2>

      {error && <p className="error" style={{ marginBottom: 12 }}>⚠ {error}</p>}
      {loading && <p className="muted" style={{ marginBottom: 12 }}>⏳ A carregar…</p>}

      <form className="form" onSubmit={onSubmit} noValidate>
        <label>
          Nome *
          <input
            placeholder="Ex.: Supino Plano"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <small className="help">Nome do exercício tal como será mostrado nas listas.</small>
        </label>

        <label>
          Grupo Muscular *
          <input
            placeholder="Ex.: Peito"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
            required
          />
          <small className="help">Peito, costas, pernas, ombros, braços, core…</small>
        </label>

        <label className="full">
          Descrição
          <textarea
            rows={5}
            placeholder="Notas sobre execução, postura, variações, máquinas, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="actions">
          <button type="button" onClick={() => navigate("/exercises")}>
            Cancelar
          </button>
          <button className="primary" type="submit">
            {editing ? "Guardar" : "Criar"}
          </button>
        </div>
      </form>
    </section>
  );
}
