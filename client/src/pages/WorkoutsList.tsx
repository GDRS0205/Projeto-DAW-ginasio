// client/src/pages/WorkoutsList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listWorkouts,
  createWorkout,
  deleteWorkout,
  duplicateWorkout,
  setWorkoutFavorite,
  type Workout,
  type MuscleGroup,
} from "../api/workouts";
import { useToast } from "../context/ToastContext";

type Row = Workout;

export default function WorkoutsList() {
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("corpo inteiro");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"" | MuscleGroup>("");
  const [sort, setSort] = useState("id,DESC");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const muscleOptions: MuscleGroup[] = [
    "peito",
    "costas",
    "pernas",
    "ombros",
    "braços",
    "core",
    "corpo inteiro",
  ];

  async function load() {
    setLoading(true);
    try {
      const resp = await listWorkouts({
        page,
        size,
        sort,
        search,
        group: groupFilter || undefined,
        favorites: favoritesOnly,
      });
      setRows(resp.data || []);
      setTotalPages(resp.totalPages || 1);
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao carregar treinos.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, sort, search, groupFilter, favoritesOnly]);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      showError("Indica um nome para o treino.");
      return;
    }
    try {
      const created = await createWorkout(trimmed, muscleGroup);
      showSuccess("Treino criado.");
      setName("");
      // ir para o treino criado
      navigate(`/workouts/${created.id}`);
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao criar treino.";
      showError(msg);
    }
  }

  async function handleDelete(row: Row) {
    if (!confirm(`Apagar o treino "${row.name}"?`)) return;
    try {
      await deleteWorkout(row.id);
      showSuccess("Treino apagado.");
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao apagar treino.";
      showError(msg);
    }
  }

  async function handleDuplicate(row: Row) {
    const suggested = `Cópia de ${row.name}`;
    const newName = prompt(
      "Nome da cópia (podes deixar vazio para usar o nome sugerido):",
      suggested
    );
    try {
      const created = await duplicateWorkout(row.id, newName || undefined);
      showSuccess("Treino duplicado.");
      navigate(`/workouts/${created.id}`);
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao duplicar treino.";
      showError(msg);
    }
  }

  async function handleToggleFavorite(row: Row) {
    const current = Boolean(row.is_favorite);
    try {
      const updated = await setWorkoutFavorite(row.id, !current);
      setRows((prev) =>
        prev.map((w) =>
          w.id === row.id ? { ...w, is_favorite: updated.is_favorite } : w
        )
      );
      showSuccess(
        updated.is_favorite
          ? "Treino marcado como favorito."
          : "Favorito removido."
      );
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || "Erro ao atualizar favorito do treino.";
      showError(msg);
    }
  }

  return (
    <section className="card">
      <h2>Treinos</h2>

      {/* criar novo treino */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Criar novo treino</h3>
        <div className="row gap wrap">
          <input
            placeholder="Nome do treino (ex: Peito & tríceps)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 2, minWidth: 200 }}
          />
          <select
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
            style={{ flex: 1, minWidth: 160 }}
          >
            {muscleOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button onClick={handleCreate}>Criar treino</button>
        </div>
      </div>

      {/* filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row gap wrap">
          <input
            placeholder="Procurar treino por nome…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            style={{ flex: 2, minWidth: 200 }}
          />
          <select
            value={groupFilter}
            onChange={(e) => {
              setPage(1);
              setGroupFilter(e.target.value as "" | MuscleGroup);
            }}
          >
            <option value="">Todos os grupos</option>
            {muscleOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="id,DESC">Mais recentes</option>
            <option value="id,ASC">Mais antigos</option>
            <option value="name,ASC">Nome A-Z</option>
            <option value="name,DESC">Nome Z-A</option>
          </select>
          <select
            value={size}
            onChange={(e) => {
              setPage(1);
              setSize(Number(e.target.value) || 10);
            }}
          >
            <option value={5}>5 por página</option>
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
          </select>
        </div>

        <label
          style={{
            marginTop: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => {
              setPage(1);
              setFavoritesOnly(e.target.checked);
            }}
          />
          Só favoritos
        </label>
      </div>

      {/* tabela */}
      {loading && <p className="muted">A carregar…</p>}

      {!loading && rows.length === 0 && (
        <p className="muted">Ainda não tens treinos registados.</p>
      )}

      {!loading && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Grupo principal</th>
              <th>Criado em</th>
              <th>Favorito</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w, idx) => (
              <tr key={w.id}>
                <td>{(page - 1) * size + idx + 1}</td>
                <td>
                  <button
                    type="button"
                    className="link-like"
                    onClick={() => navigate(`/workouts/${w.id}`)}
                  >
                    {w.name}
                  </button>
                </td>
                <td>{w.muscle_group}</td>
                <td>
                  {w.created_at
                    ? new Date(w.created_at).toLocaleDateString("pt-PT")
                    : "—"}
                </td>
                <td>
                  <button
                    type="button"
                    className="small"
                    onClick={() => handleToggleFavorite(w)}
                    // ⭐ Aqui deixamos a estrela amarela quando é favorito
                    style={{
                      fontSize: 18,
                      lineHeight: 1,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: w.is_favorite ? "#facc15" : "#cccccc",
                    }}
                    aria-label={
                      w.is_favorite
                        ? "Remover dos favoritos"
                        : "Marcar como favorito"
                    }
                  >
                    {w.is_favorite ? "★" : "☆"}
                  </button>
                </td>
                <td>
                  <button
                    className="small"
                    type="button"
                    onClick={() => navigate(`/workouts/${w.id}`)}
                    style={{ marginRight: 4 }}
                  >
                    Abrir
                  </button>
                  <button
                    className="small"
                    type="button"
                    onClick={() => handleDuplicate(w)}
                    style={{ marginRight: 4 }}
                  >
                    Duplicar
                  </button>
                  <button
                    className="small danger"
                    type="button"
                    onClick={() => handleDelete(w)}
                  >
                    Apagar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* paginação */}
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
