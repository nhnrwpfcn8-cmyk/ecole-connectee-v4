import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

/**
 * Page Activités / Projets APE
 *
 * Module autonome :
 * - consultation des activités de l'APE de l'école
 * - création
 * - modification
 * - suppression
 * - bouton Retour
 * - cartes/icônes cliquables
 * - textes noirs
 *
 * IMPORTANT :
 * Cette page ne modifie aucun dashboard existant.
 * Elle sera raccordée à la navigation APE dans une étape séparée.
 */

const EMPTY_FORM = {
  title: "",
  description: "",
  activity_date: "",
  location: "",
  status: "planned",
  budget: "",
  notes: "",
};

const STATUS_LABELS = {
  planned: "Prévue",
  ongoing: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

function formatDate(value) {
  if (!value) return "Date non définie";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non définie";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAmount(value) {
  const amount = Number(value || 0);

  return (
    amount.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + " FCFA"
  );
}

export default function AdminEcoleAPEActivitiesPage({
  schoolId,
  onBack,
}) {
  const [ape, setApe] = useState(null);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadApe() {
    if (!schoolId) {
      setError("Aucune école n'est associée à cet espace.");
      return null;
    }

    const { data, error: apeError } = await supabase
      .from("school_apes")
      .select("id, school_id, name, academic_year, active")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (apeError) {
  console.error("Erreur chargement APE :", apeError);

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
      setError("Aucune APE n'est encore configurée pour cette école.");
      return null;
    }

    setApe(data);
    return data;
  }

  async function loadActivities(apeId) {
    if (!apeId) {
      setActivities([]);
      return;
    }

    const { data, error: activitiesError } = await supabase
      .from("ape_activities")
      .select(
        "id, ape_id, title, description, activity_date, location, status, budget, notes, created_by, created_at, updated_at"
      )
      .eq("ape_id", apeId)
      .order("activity_date", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (activitiesError) {
      console.error(
        "Erreur chargement activités APE :",
        activitiesError
      );
      setError("Impossible de charger les activités APE.");
      return;
    }

    setActivities(data || []);
  }

  async function loadPage() {
    setLoading(true);
    setError("");
    setMessage("");

    const loadedApe = await loadApe();

    if (loadedApe) {
      await loadActivities(loadedApe.id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [schoolId]);

  function openCreateForm() {
    setEditingActivity(null);
    setForm(EMPTY_FORM);
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(activity) {
    setEditingActivity(activity);

    setForm({
      title: activity.title || "",
      description: activity.description || "",
      activity_date: activity.activity_date || "",
      location: activity.location || "",
      status: activity.status || "planned",
      budget:
        activity.budget !== null &&
        activity.budget !== undefined
          ? String(activity.budget)
          : "",
      notes: activity.notes || "",
    });

    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingActivity(null);
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

    if (!form.title.trim()) {
      setError("Veuillez saisir le titre de l'activité.");
      return;
    }

    const budget =
      form.budget.trim() === ""
        ? 0
        : Number(form.budget);

    if (!Number.isFinite(budget) || budget < 0) {
      setError("Le budget doit être un nombre positif ou nul.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ape_id: ape.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        activity_date: form.activity_date || null,
        location: form.location.trim() || null,
        status: form.status,
        budget,
        notes: form.notes.trim() || null,
      };

      if (editingActivity) {
        const { error: updateError } = await supabase
          .from("ape_activities")
          .update(payload)
          .eq("id", editingActivity.id)
          .eq("ape_id", ape.id);

        if (updateError) throw updateError;

        setMessage("Activité APE modifiée avec succès.");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const insertPayload = {
          ...payload,
          created_by: user?.id || null,
        };

        const { error: insertError } = await supabase
          .from("ape_activities")
          .insert(insertPayload);

        if (insertError) throw insertError;

        setMessage("Activité APE créée avec succès.");
      }

      closeForm();
      await loadActivities(ape.id);
    } catch (saveError) {
      console.error(
        "Erreur enregistrement activité APE :",
        saveError
      );

      setError(
        saveError?.message ||
          "Impossible d'enregistrer l'activité."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(activity) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer l'activité « ${activity.title} » ?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("ape_activities")
      .delete()
      .eq("id", activity.id)
      .eq("ape_id", ape?.id);

    if (deleteError) {
      console.error(
        "Erreur suppression activité APE :",
        deleteError
      );

      setError(
        deleteError.message ||
          "Impossible de supprimer l'activité."
      );

      return;
    }

    setMessage("Activité APE supprimée avec succès.");

    if (ape?.id) {
      await loadActivities(ape.id);
    }
  }

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <div className="ape-page">
          <div className="ape-loading-card">
            <div className="ape-loading-icon">🏗️</div>

            <h2>Chargement des activités APE...</h2>

            <p>Préparation de votre espace.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div className="ape-page">
        <header className="ape-header">
          <div>
            <button
              type="button"
              className="ape-back-button"
              onClick={onBack}
            >
              ← Retour
            </button>

            <div className="ape-title-row">
              <button
                type="button"
                className="ape-title-icon"
                onClick={loadPage}
                title="Actualiser les activités"
                aria-label="Actualiser les activités"
              >
                🤝
              </button>

              <div>
                <h1>Activités & Projets APE</h1>

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
            className="ape-primary-button"
            onClick={openCreateForm}
          >
            ➕ Nouvelle activité
          </button>
        </header>

        {error && (
          <div className="ape-alert ape-alert-error">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="ape-alert ape-alert-success">
            ✓ {message}
          </div>
        )}

        {showForm && (
          <section className="ape-form-card">
            <div className="ape-form-header">
              <div>
                <h2>
                  {editingActivity
                    ? "Modifier l'activité"
                    : "Créer une activité"}
                </h2>

                <p>
                  Renseignez les informations du projet ou de
                  l'activité APE.
                </p>
              </div>

              <button
                type="button"
                className="ape-close-button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ape-form-grid">
                <label>
                  <span>Titre *</span>

                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Ex : Journée culturelle"
                    required
                  />
                </label>

                <label>
                  <span>Date</span>

                  <input
                    type="date"
                    name="activity_date"
                    value={form.activity_date}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>Lieu</span>

                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Ex : Salle polyvalente"
                  />
                </label>

                <label>
                  <span>Statut</span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="planned">Prévue</option>
                    <option value="ongoing">En cours</option>
                    <option value="completed">
                      Terminée
                    </option>
                    <option value="cancelled">
                      Annulée
                    </option>
                  </select>
                </label>

                <label>
                  <span>Budget (FCFA)</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="budget"
                    value={form.budget}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </label>

                <label className="ape-form-full">
                  <span>Description</span>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Décrivez l'activité..."
                  />
                </label>

                <label className="ape-form-full">
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

              <div className="ape-form-actions">
                <button
                  type="button"
                  className="ape-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="ape-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingActivity
                    ? "💾 Enregistrer les modifications"
                    : "💾 Créer l'activité"}
                </button>
              </div>
            </form>
          </section>
        )}

        {!showForm && activities.length === 0 ? (
          <section className="ape-empty-card">
            <button
              type="button"
              className="ape-empty-icon"
              onClick={openCreateForm}
              aria-label="Créer une activité"
              title="Créer une activité"
            >
              📅
            </button>

            <h2>Aucune activité APE</h2>

            <p>
              Commencez par créer une activité ou un projet
              pour l'association.
            </p>

            <button
              type="button"
              className="ape-primary-button"
              onClick={openCreateForm}
            >
              ➕ Créer la première activité
            </button>
          </section>
        ) : (
          <section className="ape-activities-grid">
            {activities.map((activity) => (
              <article
                key={activity.id}
                className="ape-activity-card"
              >
                <div className="ape-activity-top">
                  <button
                    type="button"
                    className="ape-activity-icon"
                    onClick={() =>
                      openEditForm(activity)
                    }
                    title="Modifier cette activité"
                    aria-label="Modifier cette activité"
                  >
                    📅
                  </button>

                  <span
                    className={`ape-status ape-status-${activity.status}`}
                  >
                    {STATUS_LABELS[activity.status] ||
                      activity.status}
                  </span>
                </div>

                <button
                  type="button"
                  className="ape-activity-title-button"
                  onClick={() =>
                    openEditForm(activity)
                  }
                >
                  {activity.title}
                </button>

                <p className="ape-activity-description">
                  {activity.description ||
                    "Aucune description."}
                </p>

                <div className="ape-activity-details">
                  <div>
                    <strong>📅 Date</strong>

                    <span>
                      {formatDate(
                        activity.activity_date
                      )}
                    </span>
                  </div>

                  <div>
                    <strong>📍 Lieu</strong>

                    <span>
                      {activity.location ||
                        "Lieu non défini"}
                    </span>
                  </div>

                  <div>
                    <strong>💰 Budget</strong>

                    <span>
                      {formatAmount(activity.budget)}
                    </span>
                  </div>
                </div>

                {activity.notes && (
                  <div className="ape-notes">
                    <strong>📝 Notes</strong>

                    <p>{activity.notes}</p>
                  </div>
                )}

                <div className="ape-card-actions">
                  <button
                    type="button"
                    className="ape-edit-button"
                    onClick={() =>
                      openEditForm(activity)
                    }
                  >
                    ✏️ Modifier
                  </button>

                  <button
                    type="button"
                    className="ape-delete-button"
                    onClick={() =>
                      handleDelete(activity)
                    }
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </>
  );
}

const styles = `
.ape-page {
  min-height: 100vh;
  padding: 24px;
  background: #f8fafc;
  color: #000000;
  box-sizing: border-box;
}

.ape-page *,
.ape-page h1,
.ape-page h2,
.ape-page h3,
.ape-page p,
.ape-page label,
.ape-page span,
.ape-page strong,
.ape-page button,
.ape-page input,
.ape-page textarea,
.ape-page select {
  color: #000000;
}

.ape-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.ape-back-button {
  border: 0;
  background: transparent;
  padding: 0;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.ape-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ape-title-row h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
}

.ape-title-row p {
  margin: 6px 0 0;
  opacity: 0.7;
}

.ape-title-icon,
.ape-empty-icon,
.ape-activity-icon {
  border: 0;
  cursor: pointer;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.08);
}

.ape-title-icon {
  width: 54px;
  height: 54px;
  font-size: 28px;
}

.ape-primary-button,
.ape-secondary-button,
.ape-edit-button,
.ape-delete-button {
  border-radius: 10px;
  padding: 11px 15px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #000000;
  background: #ffffff;
}

.ape-primary-button {
  background: #000000;
  color: #ffffff !important;
  border-color: #000000;
}

.ape-secondary-button {
  background: #ffffff;
}

.ape-edit-button {
  border-color: #000000;
}

.ape-delete-button {
  border-color: #000000;
}

.ape-alert {
  padding: 13px 15px;
  border-radius: 10px;
  margin-bottom: 18px;
  background: #ffffff;
  border: 1px solid #000000;
  font-weight: 600;
}

.ape-form-card,
.ape-empty-card,
.ape-activity-card,
.ape-loading-card {
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 16px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
}

.ape-form-card {
  padding: 20px;
  margin-bottom: 24px;
}

.ape-form-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.ape-form-header h2 {
  margin: 0;
}

.ape-form-header p {
  margin: 5px 0 0;
  opacity: 0.7;
}

.ape-close-button {
  width: 38px;
  height: 38px;
  border: 1px solid #000000;
  border-radius: 9px;
  background: #ffffff;
  cursor: pointer;
  font-size: 17px;
}

.ape-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.ape-form-grid label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-weight: 700;
  font-size: 14px;
}

.ape-form-grid input,
.ape-form-grid textarea,
.ape-form-grid select {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid #9ca3af;
  border-radius: 9px;
  background: #ffffff;
  font: inherit;
  color: #000000;
}

.ape-form-grid textarea {
  resize: vertical;
}

.ape-form-full {
  grid-column: 1 / -1;
}

.ape-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.ape-empty-card {
  text-align: center;
  padding: 48px 24px;
}

.ape-empty-icon {
  width: 64px;
  height: 64px;
  font-size: 32px;
  margin-bottom: 12px;
}

.ape-empty-card h2 {
  margin: 0 0 8px;
}

.ape-empty-card p {
  margin: 0 auto 20px;
  max-width: 520px;
  opacity: 0.7;
}

.ape-activities-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(280px, 1fr)
  );
  gap: 18px;
}

.ape-activity-card {
  padding: 18px;
}

.ape-activity-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.ape-activity-icon {
  width: 46px;
  height: 46px;
  font-size: 23px;
}

.ape-status {
  border: 1px solid #000000;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 800;
  background: #ffffff;
}

.ape-activity-title-button {
  display: block;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 15px 0 8px;
  font-size: 19px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}

.ape-activity-description {
  margin: 0 0 16px;
  line-height: 1.5;
  opacity: 0.75;
}

.ape-activity-details {
  display: grid;
  gap: 10px;
  padding: 13px 0;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.ape-activity-details div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.ape-activity-details span {
  text-align: right;
}

.ape-notes {
  margin-top: 13px;
  padding: 11px;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
}

.ape-notes p {
  margin: 6px 0 0;
}

.ape-card-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.ape-loading-card {
  max-width: 480px;
  margin: 80px auto;
  text-align: center;
  padding: 42px 24px;
}

.ape-loading-icon {
  font-size: 42px;
  margin-bottom: 12px;
}

.ape-loading-card h2 {
  margin: 0;
}

.ape-loading-card p {
  opacity: 0.7;
}

@media (max-width: 720px) {
  .ape-page {
    padding: 16px;
  }

  .ape-header {
    flex-direction: column;
  }

  .ape-primary-button {
    width: 100%;
  }

  .ape-form-grid {
    grid-template-columns: 1fr;
  }

  .ape-form-full {
    grid-column: auto;
  }

  .ape-form-actions {
    flex-direction: column;
  }

  .ape-form-actions button {
    width: 100%;
  }

  .ape-activity-details div {
    flex-direction: column;
    gap: 3px;
  }

  .ape-activity-details span {
    text-align: left;
  }

  .ape-card-actions button {
    flex: 1;
  }
}
`;
