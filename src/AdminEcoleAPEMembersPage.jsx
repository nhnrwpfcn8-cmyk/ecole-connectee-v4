import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

/**
 * Page Membres APE
 *
 * - Affiche les membres de l'APE de l'école
 * - Ajout d'un parent existant
 * - Attribution d'une fonction
 * - Modification
 * - Suppression
 * - Un seul Président
 * - Bouton Retour
 * - Icônes cliquables
 * - Textes noirs
 *
 * IMPORTANT :
 * Cette page ne modifie aucun dashboard existant.
 */

const EMPTY_FORM = {
  parent_id: "",
  function_name: "Membre",
  status: "active",
  joined_at: "",
  notes: "",
};

const FUNCTION_OPTIONS = [
  "Président",
  "Vice-président",
  "Secrétaire",
  "Secrétaire adjoint",
  "Trésorier",
  "Trésorier adjoint",
  "Membre",
];

const STATUS_LABELS = {
  active: "Actif",
  inactive: "Inactif",
  suspended: "Suspendu",
};

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getInitial(value) {
  return (
    String(value || "P")
      .trim()
      .charAt(0)
      .toUpperCase() || "P"
  );
}

export default function AdminEcoleAPEMembersPage({
  schoolId,
  onBack,
}) {
  const [ape, setApe] = useState(null);
  const [parents, setParents] = useState([]);
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadApe() {
    if (!schoolId) {
      setError(
        "Aucune école n'est associée à cet espace."
      );
      return null;
    }

    const { data, error: apeError } = await supabase
      .from("school_apes")
      .select(
        "id, school_id, name, academic_year, active"
      )
      .eq("school_id", schoolId)
      .maybeSingle();

    if (apeError) {
      console.error(
        "Erreur chargement APE :",
        apeError
      );

      setError(
        `Impossible de charger l'APE : ${
          apeError.message ||
          apeError.details ||
          apeError.hint ||
          "Erreur inconnue"
        }`
      );

      return null;
    }

    if (!data) {
      setError(
        "Aucune APE n'est encore configurée pour cette école."
      );
      return null;
    }

    setApe(data);

    return data;
  }

  async function loadParents() {
    if (!schoolId) {
      setParents([]);
      return;
    }

    const { data, error: parentsError } = await supabase
      .from("parents")
      .select(
        "id, school_id, full_name, phone, email, active"
      )
      .eq("school_id", schoolId)
      .eq("active", true)
      .order("full_name", {
        ascending: true,
      });

    if (parentsError) {
      console.error(
        "Erreur chargement parents APE :",
        parentsError
      );

      setError(
        `Impossible de charger les parents : ${
          parentsError.message ||
          parentsError.details ||
          parentsError.hint ||
          "Erreur inconnue"
        }`
      );

      return;
    }

    setParents(data || []);
  }

  async function loadMembers(apeId) {
    if (!apeId) {
      setMembers([]);
      return;
    }

    const { data, error: membersError } = await supabase
      .from("ape_members")
      .select(
        "id, ape_id, parent_id, function_name, status, joined_at, notes, created_at, updated_at"
      )
      .eq("ape_id", apeId)
      .order("function_name", {
        ascending: true,
      })
      .order("joined_at", {
        ascending: true,
      });

    if (membersError) {
      console.error(
        "Erreur chargement membres APE :",
        membersError
      );

      setError(
        `Impossible de charger les membres APE : ${
          membersError.message ||
          membersError.details ||
          membersError.hint ||
          "Erreur inconnue"
        }`
      );

      return;
    }

    setMembers(data || []);
  }

  async function loadPage() {
    setLoading(true);
    setError("");
    setMessage("");

    const loadedApe = await loadApe();

    if (loadedApe) {
      await Promise.all([
        loadParents(),
        loadMembers(loadedApe.id),
      ]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [schoolId]);

  const parentMap = useMemo(() => {
    const map = new Map();

    parents.forEach((parent) => {
      map.set(parent.id, parent);
    });

    return map;
  }, [parents]);

  const availableParents = useMemo(() => {
    const memberParentIds = new Set(
      members.map((member) => member.parent_id)
    );

    return parents.filter(
      (parent) => !memberParentIds.has(parent.id)
    );
  }, [parents, members]);

  const presidentExists = useMemo(() => {
    return members.some(
      (member) =>
        member.function_name === "Président" &&
        member.status !== "inactive"
    );
  }, [members]);

  function openCreateForm() {
    setEditingMember(null);

    setForm({
      ...EMPTY_FORM,
      joined_at: new Date()
        .toISOString()
        .slice(0, 10),
    });

    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(member) {
    setEditingMember(member);

    setForm({
      parent_id: member.parent_id || "",
      function_name:
        member.function_name || "Membre",
      status: member.status || "active",
      joined_at: member.joined_at || "",
      notes: member.notes || "",
    });

    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingMember(null);
    setForm(EMPTY_FORM);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!ape?.id) {
      setError("APE introuvable pour cette école.");
      return;
    }

    if (!editingMember && !form.parent_id) {
      setError(
        "Veuillez sélectionner un parent."
      );
      return;
    }

    if (!form.function_name) {
      setError(
        "Veuillez sélectionner une fonction."
      );
      return;
    }

    if (
      form.function_name === "Président" &&
      !editingMember &&
      presidentExists
    ) {
      setError(
        "Un Président est déjà enregistré pour cette APE."
      );
      return;
    }

    if (
      form.function_name === "Président" &&
      editingMember &&
      members.some(
        (member) =>
          member.id !== editingMember.id &&
          member.function_name === "Président" &&
          member.status !== "inactive"
      )
    ) {
      setError(
        "Un autre Président est déjà enregistré pour cette APE."
      );
      return;
    }

    setSaving(true);

    try {
      if (editingMember) {
        const payload = {
          function_name: form.function_name,
          status: form.status,
          joined_at:
            form.joined_at || null,
          notes:
            form.notes.trim() || null,
        };

        const {
          error: updateError,
        } = await supabase
          .from("ape_members")
          .update(payload)
          .eq("id", editingMember.id)
          .eq("ape_id", ape.id);

        if (updateError) {
          throw updateError;
        }

        setMessage(
          "Membre APE modifié avec succès."
        );
      } else {
        const payload = {
          ape_id: ape.id,
          parent_id: form.parent_id,
          function_name: form.function_name,
          status: form.status,
          joined_at:
            form.joined_at ||
            new Date()
              .toISOString()
              .slice(0, 10),
          notes:
            form.notes.trim() || null,
        };

        const {
          error: insertError,
        } = await supabase
          .from("ape_members")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setMessage(
          "Membre APE ajouté avec succès."
        );
      }

      closeForm();
      await loadMembers(ape.id);
    } catch (saveError) {
      console.error(
        "Erreur enregistrement membre APE :",
        saveError
      );

      setError(
        saveError?.message ||
          "Impossible d'enregistrer le membre APE."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member) {
    const parent =
      parentMap.get(member.parent_id);

    const parentName =
      parent?.full_name || "ce membre";

    const confirmed = window.confirm(
      `Voulez-vous vraiment retirer ${parentName} de l'APE ?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingId(member.id);

    try {
      const { error: deleteError } =
        await supabase
          .from("ape_members")
          .delete()
          .eq("id", member.id)
          .eq("ape_id", ape?.id);

      if (deleteError) {
        throw deleteError;
      }

      setMessage(
        "Membre retiré de l'APE avec succès."
      );

      if (ape?.id) {
        await loadMembers(ape.id);
      }
    } catch (deleteError) {
      console.error(
        "Erreur suppression membre APE :",
        deleteError
      );

      setError(
        deleteError?.message ||
          "Impossible de retirer le membre de l'APE."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <div className="ape-members-page">
          <div className="ape-members-loading">
            <div className="ape-members-loading-icon">
              👥
            </div>

            <h2>
              Chargement des membres APE...
            </h2>

            <p>
              Préparation de votre espace.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div className="ape-members-page">
        <header className="ape-members-header">
          <div>
            <button
              type="button"
              className="ape-members-back"
              onClick={onBack}
            >
              ← Retour
            </button>

            <div className="ape-members-title-row">
              <button
                type="button"
                className="ape-members-title-icon"
                onClick={loadPage}
                title="Actualiser les membres"
                aria-label="Actualiser les membres"
              >
                👥
              </button>

              <div>
                <h1>Membres de l'APE</h1>

                <p>
                  {ape?.name ||
                    "Association des Parents d'Élèves"}

                  {ape?.academic_year
                    ? ` • ${ape.academic_year}`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="ape-members-primary"
            onClick={openCreateForm}
            disabled={
              availableParents.length === 0
            }
          >
            ➕ Ajouter un membre
          </button>
        </header>

        {error && (
          <div className="ape-members-alert ape-members-alert-error">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="ape-members-alert ape-members-alert-success">
            ✓ {message}
          </div>
        )}

        <section className="ape-members-summary">
          <button
            type="button"
            className="ape-members-summary-card"
            onClick={loadPage}
          >
            <span className="ape-members-summary-icon">
              👥
            </span>

            <span>
              <small>Total membres</small>
              <strong>{members.length}</strong>
            </span>
          </button>

          <button
            type="button"
            className="ape-members-summary-card"
            onClick={() => {
              const president =
                members.find(
                  (member) =>
                    member.function_name ===
                      "Président" &&
                    member.status !== "inactive"
                );

              if (president) {
                openEditForm(president);
              } else {
                openCreateForm();
              }
            }}
          >
            <span className="ape-members-summary-icon">
              👑
            </span>

            <span>
              <small>Président</small>

              <strong>
                {presidentExists
                  ? "Désigné"
                  : "À désigner"}
              </strong>
            </span>
          </button>

          <button
            type="button"
            className="ape-members-summary-card"
            onClick={openCreateForm}
            disabled={
              availableParents.length === 0
            }
          >
            <span className="ape-members-summary-icon">
              👨‍👩‍👧
            </span>

            <span>
              <small>Parents disponibles</small>
              <strong>
                {availableParents.length}
              </strong>
            </span>
          </button>
        </section>

        {showForm && (
          <section className="ape-members-form-card">
            <div className="ape-members-form-header">
              <div>
                <h2>
                  {editingMember
                    ? "Modifier le membre"
                    : "Ajouter un membre à l'APE"}
                </h2>

                <p>
                  Sélectionnez un parent déjà enregistré
                  dans cette école.
                </p>
              </div>

              <button
                type="button"
                className="ape-members-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {!editingMember && (
                <label className="ape-members-field">
                  <span>Parent *</span>

                  <select
                    name="parent_id"
                    value={form.parent_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Sélectionner un parent
                    </option>

                    {availableParents.map(
                      (parent) => (
                        <option
                          key={parent.id}
                          value={parent.id}
                        >
                          {parent.full_name}
                          {parent.phone
                            ? ` — ${parent.phone}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}

              {editingMember && (
                <div className="ape-members-current-parent">
                  <span>Parent</span>

                  <strong>
                    {parentMap.get(
                      editingMember.parent_id
                    )?.full_name ||
                      "Parent non trouvé"}
                  </strong>
                </div>
              )}

              <div className="ape-members-form-grid">
                <label className="ape-members-field">
                  <span>Fonction *</span>

                  <select
                    name="function_name"
                    value={form.function_name}
                    onChange={handleChange}
                    required
                  >
                    {FUNCTION_OPTIONS.map(
                      (functionName) => (
                        <option
                          key={functionName}
                          value={functionName}
                        >
                          {functionName}
                          {functionName ===
                          "Président"
                            ? " 👑"
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="ape-members-field">
                  <span>Statut</span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="active">
                      Actif
                    </option>

                    <option value="inactive">
                      Inactif
                    </option>

                    <option value="suspended">
                      Suspendu
                    </option>
                  </select>
                </label>

                <label className="ape-members-field">
                  <span>Date d'adhésion</span>

                  <input
                    type="date"
                    name="joined_at"
                    value={form.joined_at}
                    onChange={handleChange}
                  />
                </label>

                <label className="ape-members-field ape-members-field-full">
                  <span>Notes</span>

                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Informations complémentaires..."
                  />
                </label>
              </div>

              <div className="ape-members-form-actions">
                <button
                  type="button"
                  className="ape-members-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="ape-members-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingMember
                    ? "💾 Enregistrer"
                    : "💾 Ajouter le membre"}
                </button>
              </div>
            </form>
          </section>
        )}

        {members.length === 0 ? (
          <section className="ape-members-empty">
            <button
              type="button"
              className="ape-members-empty-icon"
              onClick={openCreateForm}
              aria-label="Ajouter un membre"
              title="Ajouter un membre"
              disabled={
                availableParents.length === 0
              }
            >
              👥
            </button>

            <h2>
              Aucun membre APE
            </h2>

            <p>
              Commencez par ajouter un parent déjà
              enregistré dans votre établissement.
            </p>

            <button
              type="button"
              className="ape-members-primary"
              onClick={openCreateForm}
              disabled={
                availableParents.length === 0
              }
            >
              ➕ Ajouter le premier membre
            </button>

            {availableParents.length === 0 && (
              <p className="ape-members-muted">
                Aucun parent actif disponible dans cette
                école.
              </p>
            )}
          </section>
        ) : (
          <section className="ape-members-grid">
            {members.map((member) => {
              const parent =
                parentMap.get(member.parent_id);

              const isPresident =
                member.function_name ===
                "Président";

              return (
                <article
                  key={member.id}
                  className={`ape-member-card ${
                    isPresident
                      ? "ape-member-president"
                      : ""
                  }`}
                >
                  <div className="ape-member-top">
                    <button
                      type="button"
                      className="ape-member-avatar"
                      onClick={() =>
                        openEditForm(member)
                      }
                      title="Modifier ce membre"
                      aria-label="Modifier ce membre"
                    >
                      {isPresident
                        ? "👑"
                        : getInitial(
                            parent?.full_name
                          )}
                    </button>

                    <span
                      className={`ape-member-status ape-member-status-${member.status}`}
                    >
                      {STATUS_LABELS[
                        member.status
                      ] || member.status}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="ape-member-name-button"
                    onClick={() =>
                      openEditForm(member)
                    }
                  >
                    {parent?.full_name ||
                      "Parent non trouvé"}
                  </button>

                  <div className="ape-member-function">
                    {isPresident
                      ? "👑 Président"
                      : member.function_name}
                  </div>

                  <div className="ape-member-details">
                    <div>
                      <strong>📞 Téléphone</strong>

                      <span>
                        {parent?.phone ||
                          "Non renseigné"}
                      </span>
                    </div>

                    <div>
                      <strong>✉️ Email</strong>

                      <span>
                        {parent?.email ||
                          "Non renseigné"}
                      </span>
                    </div>

                    <div>
                      <strong>📅 Adhésion</strong>

                      <span>
                        {formatDate(
                          member.joined_at
                        )}
                      </span>
                    </div>
                  </div>

                  {member.notes && (
                    <div className="ape-member-notes">
                      <strong>📝 Notes</strong>

                      <p>{member.notes}</p>
                    </div>
                  )}

                  <div className="ape-member-actions">
                    <button
                      type="button"
                      className="ape-members-edit"
                      onClick={() =>
                        openEditForm(member)
                      }
                    >
                      ✏️ Modifier
                    </button>

                    <button
                      type="button"
                      className="ape-members-delete"
                      onClick={() =>
                        handleDelete(member)
                      }
                      disabled={
                        deletingId === member.id
                      }
                    >
                      {deletingId === member.id
                        ? "Suppression..."
                        : "🗑️ Retirer"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </>
  );
}

const styles = `
.ape-members-page {
  min-height: 100vh;
  padding: 24px;
  background: #f8fafc;
  color: #000000;
  box-sizing: border-box;
}

.ape-members-page *,
.ape-members-page h1,
.ape-members-page h2,
.ape-members-page h3,
.ape-members-page p,
.ape-members-page label,
.ape-members-page span,
.ape-members-page strong,
.ape-members-page button,
.ape-members-page input,
.ape-members-page textarea,
.ape-members-page select {
  color: #000000;
  box-sizing: border-box;
}

.ape-members-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.ape-members-back {
  border: 0;
  background: transparent;
  padding: 0;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.ape-members-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ape-members-title-icon,
.ape-members-summary-card,
.ape-members-avatar,
.ape-members-empty-icon {
  border: 0;
  cursor: pointer;
  background: #ffffff;
}

.ape-members-title-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  box-shadow: 0 3px 14px rgba(0,0,0,.08);
  font-size: 27px;
}

.ape-members-title-row h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
}

.ape-members-title-row p {
  margin: 6px 0 0;
  color: #000000;
  opacity: .65;
}

.ape-members-primary,
.ape-members-secondary,
.ape-members-edit,
.ape-members-delete {
  border-radius: 10px;
  padding: 11px 15px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid #000000;
  background: #ffffff;
}

.ape-members-primary {
  background: #000000;
  color: #ffffff !important;
  border-color: #000000;
}

.ape-members-primary:disabled,
.ape-members-secondary:disabled,
.ape-members-edit:disabled,
.ape-members-delete:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.ape-members-alert {
  padding: 13px 15px;
  border-radius: 10px;
  margin-bottom: 18px;
  background: #ffffff;
  border: 1px solid #000000;
  font-weight: 700;
}

.ape-members-alert-error {
  border-color: #000000;
}

.ape-members-alert-success {
  border-color: #000000;
}

.ape-members-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 15px;
  margin-bottom: 22px;
}

.ape-members-summary-card {
  display: flex;
  align-items: center;
  gap: 13px;
  text-align: left;
  border: 1px solid #d1d5db;
  border-radius: 15px;
  padding: 17px;
  box-shadow: 0 4px 16px rgba(0,0,0,.05);
}

.ape-members-summary-card:hover {
  transform: translateY(-1px);
}

.ape-members-summary-card:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.ape-members-summary-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 22px;
}

.ape-members-summary-card small,
.ape-members-summary-card strong {
  display: block;
}

.ape-members-summary-card small {
  font-size: 11px;
  opacity: .65;
}

.ape-members-summary-card strong {
  margin-top: 3px;
  font-size: 21px;
}

.ape-members-form-card,
.ape-members-empty,
.ape-member-card,
.ape-members-loading {
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 16px;
  box-shadow: 0 4px 18px rgba(0,0,0,.06);
}

.ape-members-form-card {
  padding: 20px;
  margin-bottom: 22px;
}

.ape-members-form-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.ape-members-form-header h2 {
  margin: 0;
  font-size: 20px;
}

.ape-members-form-header p {
  margin: 5px 0 0;
  opacity: .65;
}

.ape-members-close {
  width: 38px;
  height: 38px;
  border: 1px solid #000000;
  border-radius: 9px;
  background: #ffffff;
  cursor: pointer;
  font-size: 17px;
}

.ape-members-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.ape-members-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 16px;
}

.ape-members-field-full {
  grid-column: 1 / -1;
}

.ape-members-field input,
.ape-members-field select,
.ape-members-field textarea {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid #9ca3af;
  border-radius: 9px;
  background: #ffffff;
  color: #000000 !important;
  font: inherit;
  outline: none;
}

.ape-members-field textarea {
  resize: vertical;
}

.ape-members-current-parent {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 17px;
  padding: 13px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #f9fafb;
}

.ape-members-current-parent span {
  font-size: 11px;
  opacity: .6;
}

.ape-members-current-parent strong {
  font-size: 14px;
}

.ape-members-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.ape-members-empty {
  text-align: center;
  padding: 48px 24px;
}

.ape-members-empty-icon {
  width: 65px;
  height: 65px;
  border-radius: 15px;
  box-shadow: 0 3px 14px rgba(0,0,0,.08);
  font-size: 31px;
  margin-bottom: 12px;
}

.ape-members-empty h2 {
  margin: 0 0 8px;
}

.ape-members-empty p {
  max-width: 560px;
  margin: 0 auto 20px;
  opacity: .65;
}

.ape-members-muted {
  font-size: 12px;
  margin-top: 15px !important;
}

.ape-members-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(285px, 1fr)
  );
  gap: 18px;
}

.ape-member-card {
  padding: 18px;
}

.ape-member-president {
  border: 2px solid #000000;
}

.ape-member-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ape-members-avatar {
  width: 52px;
  height: 52px;
  border-radius: 15px;
  border: 1px solid #000000;
  font-size: 22px;
  font-weight: 900;
}

.ape-member-status {
  border: 1px solid #000000;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 900;
  background: #ffffff;
}

.ape-member-name-button {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 15px 0 5px;
  font-size: 19px;
  font-weight: 900;
  text-align: left;
  cursor: pointer;
}

.ape-member-function {
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 15px;
}

.ape-member-details {
  display: grid;
  gap: 10px;
  padding: 13px 0;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.ape-member-details div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.ape-member-details strong {
  font-size: 12px;
}

.ape-member-details span {
  font-size: 12px;
  text-align: right;
  opacity: .7;
}

.ape-member-notes {
  margin-top: 13px;
  padding: 11px;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
}

.ape-member-notes strong {
  font-size: 12px;
}

.ape-member-notes p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
}

.ape-member-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.ape-members-edit,
.ape-members-delete {
  flex: 1;
}

.ape-members-edit:hover,
.ape-members-delete:hover,
.ape-members-secondary:hover {
  background: #f3f4f6;
}

.ape-members-loading {
  max-width: 480px;
  margin: 80px auto;
  text-align: center;
  padding: 42px 24px;
}

.ape-members-loading-icon {
  font-size: 42px;
  margin-bottom: 12px;
}

.ape-members-loading h2 {
  margin: 0;
}

.ape-members-loading p {
  opacity: .65;
}

@media (max-width: 760px) {
  .ape-members-page {
    padding: 16px;
  }

  .ape-members-header {
    flex-direction: column;
  }

  .ape-members-primary {
    width: 100%;
  }

  .ape-members-summary {
    grid-template-columns: 1fr;
  }

  .ape-members-form-grid {
    grid-template-columns: 1fr;
  }

  .ape-members-field-full {
    grid-column: auto;
  }

  .ape-members-form-actions {
    flex-direction: column;
  }

  .ape-members-form-actions button {
    width: 100%;
  }

  .ape-member-details div {
    flex-direction: column;
    gap: 3px;
  }

  .ape-member-details span {
    text-align: left;
  }

  .ape-member-actions {
    flex-direction: column;
  }

  .ape-member-actions button {
    width: 100%;
  }
}
`;
