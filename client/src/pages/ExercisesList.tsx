// client/src/pages/ExercisesList.tsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  listExercises,
  deleteExercise,
  duplicateExercise,
  type Exercise,
} from "../api/exercises";
import { useToast } from "../context/ToastContext";

type Row = Exercise;

export default function ExercisesList() {
  const { showError, showSuccess } = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [sort, setSort] = useState("name,ASC");
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const muscleOptions = [
    "",
    "peito",
    "costas",
    "pernas",
    "ombros",
    "braços",
    "core",
    "corpo inteiro",
  ] as const;

  async function load() {
    setLoading(true);
    try {
      const resp = await listExercises({
        search,
        muscle,
        sort,
        page,
        size,
      });
      setRows(resp.data || []);
      setTotalPages(resp.totalPages || 1);
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao carregar exercícios.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, muscle, sort, page, size]);

  async function handleDelete(row: Row) {
    if (!confirm(`Apagar o exercício "${row.name}"?`)) return;
    try {
      await deleteExercise(row.id);
      showSuccess("Exercício apagado.");
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao apagar exercício.";
      showError(msg);
    }
  }

  async function handleDuplicate(row: Row) {
    const suggested = `Cópia de ${row.name}`;
    const name = prompt(
      "Nome da cópia (podes deixar vazio para usar o nome sugerido):",
      suggested
    );
    try {
      await duplicateExercise(row.id, name || undefined);
      showSuccess("Exercício duplicado.");
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao duplicar exercício.";
      showError(msg);
    }
  }

  return (
    <section className="card">
      <h2>Exercícios</h2>

      <div className="row gap wrap" style={{ marginBottom: 12 }}>
        <input
          placeholder="Procurar por nome…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ flex: 1, minWidth: 180 }}
        />
        <select
          value={muscle}
          onChange={(e) => {
            setPage(1);
            setMuscle(e.target.value);
          }}
        >
          <option value="">Todos os grupos</option>
          {muscleOptions
            .filter((m) => m)
            .map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name,ASC">Nome A-Z</option>
          <option value="name,DESC">Nome Z-A</option>
          <option value="id,DESC">Mais recentes</option>
          <option value="id,ASC">Mais antigos</option>
        </select>
        <NavLink to="/exercises/new" className="primary">
          + Novo exercício
        </NavLink>
      </div>

      {loading && <p className="muted">A carregar…</p>}

      {!loading && rows.length === 0 && (
        <p className="muted">Ainda não existem exercícios registados.</p>
      )}

      {!loading && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Grupo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id}>
                <td>{(page - 1) * size + idx + 1}</td>
                <td>{r.name}</td>
                <td>{r.muscle_group}</td>
                <td>
                  <NavLink
                    to={`/exercises/${r.id}/edit`}
                    className="small"
                    style={{ marginRight: 4 }}
                  >
                    Editar
                  </NavLink>
                  <button
                    className="small"
                    type="button"
                    onClick={() => handleDuplicate(r)}
                    style={{ marginRight: 4 }}
                  >
                    Duplicar
                  </button>
                  <button
                    className="small danger"
                    type="button"
                    onClick={() => handleDelete(r)}
                  >
                    Apagar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* paginação simples */}
      <div className="row between center" style={{ marginTop: 12 }}>
        <span className="tiny-label">
          Página {page} de {totalPages}
        </span>
        <div className="row gap">
          <button
            className="small"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ◀ Anterior
          </button>
          <button
            className="small"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima ▶
          </button>
        </div>
      </div>
    </section>
  );
}
