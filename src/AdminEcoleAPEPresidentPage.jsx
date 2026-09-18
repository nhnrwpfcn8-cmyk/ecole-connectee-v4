import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const EMPTY_FORM = {
  parent_id: "",
};

export default function AdminEcoleAPEPresidentPage({ schoolId, onBack }) {
  const [ape, setApe] = useState(null);
  const [parents, setParents] = useState([]);
  const [president, setPresident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadPage() {
    setLoading(true);
    setError("");
    setMessage("");

    if (!schoolId) {
      setError("Aucune école n'est associée à cet espace.");
      setLoading(false);
      return;
    }

    const { data: apeData, error: apeError } = await supabase
      .from("school_apes")
      .select("id, school_id, name, academic_year, active")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (apeError) {
      setError(apeError.message || "Impossible de charger l'APE.");
      setLoading(false);
      return;
    }

    if (!apeData) {
      setError("Aucune APE n'est encore configurée pour cette école.");
      setLoading(false);
      return;
    }

    setApe(apeData);

    const [
      { data: parentData, error: parentError },
      { data: presidentData, error: presidentError },
    ] = await Promise.all([
      supabase
        .from("parents")
        .select("id, full_name, phone, email, active")
        .eq("school_id", schoolId)
        .eq("active", true)
        .order("full_name", { ascending: true }),

      supabase
        .from("ape_members")
        .select("id, parent_id, function_name, status, joined_at")
        .eq("ape_id", apeData.id)
        .eq("is_president", true)
        .maybeSingle(),
    ]);

    if (parentError) {
      setError(
        parentError.message || "Impossible de charger la liste des parents."
      );
      setLoading(false);
      return;
    }

    if (presidentError) {
      setError(
        presidentError.message || "Impossible de charger le Président."
      );
      setLoading(false);
      return;
    }

    const parentList = parentData || [];

    setParents(parentList);
    setPresident(presidentData || null);

    setForm({
      parent_id: presidentData?.parent_id || "",
    });

    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [schoolId]);

  const presidentParent = useMemo(() => {
    if (!president) return null;

    return (
      parents.find((parent) => parent.id === president.parent_id) || null
    );
  }, [parents, president]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!ape?.id) {
      setError("Aucune APE n'est disponible pour cette école.");
      return;
    }

    if (!form.parent_id) {
      setError(
        "Veuillez sélectionner le parent qui sera Président de l'APE."
      );
      return;
    }

    if (president?.parent_id === form.parent_id) {
      setMessage("Ce parent est déjà Président de l'APE.");
      return;
    }

    setSaving(true);

    try {
      /*
       * Si un Président existe déjà, on le remplace.
       * Le même compte parent reste utilisé : aucun nouveau
       * compte d'authentification n'est créé ici.
       */
      if (president?.id) {
        const { error: updateError } = await supabase
          .from("ape_members")
          .update({
            parent_id: form.parent_id,
            function_name: "Président",
            is_president: true,
            status: "active",
          })
          .eq("id", president.id)
          .eq("ape_id", ape.id);

        if (updateError) {
          throw updateError;
        }

        setMessage("Président de l'APE remplacé avec succès.");
      } else {
        /*
         * Première désignation du Président.
         */
        const { error: insertError } = await supabase
          .from("ape_members")
          .insert({
            ape_id: ape.id,
            parent_id: form.parent_id,
            function_name: "Président",
            is_president: true,
            status: "active",
            joined_at: new Date().toISOString().slice(0, 10),
          });

        if (insertError) {
          throw insertError;
        }

        setMessage("Président de l'APE désigné avec succès.");
      }

      await loadPage();
    } catch (saveError) {
      console.error(
        "Erreur lors de la désignation du Président APE :",
        saveError
      );

      setError(
        saveError?.message ||
          "Impossible de désigner le Président de l'APE."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <div className="ape-president-page">
          <div className="ape-president-loading">
            <div className="ape-president-loading-icon">👑</div>

            <h2>Chargement de l'APE...</h2>

            <p>
              Préparation de la désignation du Président.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div className="ape-president-page">

        {/* EN-TÊTE */}
        <header className="ape-president-header">

          <div>

            {/* BOUTON RETOUR */}
            <button
              type="button"
              className="ape-president-back"
              onClick={onBack}
            >
              ← Retour
            </button>

            <div className="ape-president-title-row">

              {/* ICÔNE CLIQUABLE / ACTUALISER */}
              <button
                type="button"
                className="ape-president-title-icon"
                onClick={loadPage}
                title="Actualiser"
                aria-label="Actualiser"
              >
                👑
              </button>

              <div>
                <h1>Président de l'APE</h1>

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

        </header>

        {/* MESSAGE ERREUR */}
        {error && (
          <div className="ape-president-alert error">
            ⚠️ {error}
          </div>
        )}

        {/* MESSAGE SUCCÈS */}
        {message && (
          <div className="ape-president-alert success">
            ✓ {message}
          </div>
        )}

        {/* PRÉSIDENT ACTUEL */}
        <section className="ape-president-current">

          <div className="ape-president-card">

            <div className="ape-president-card-icon">
              👑
            </div>

            <div>

              <span className="ape-president-label">
                Président actuel
              </span>

              <h2>
                {presidentParent?.full_name ||
                  "Aucun Président désigné"}
              </h2>

              {presidentParent && (
                <p>
                  {presidentParent.phone ||
                    presidentParent.email ||
                    "Parent enregistré dans l'école"}
                </p>
              )}

            </div>

          </div>

        </section>

        {/* FORMULAIRE */}
        <section className="ape-president-form-card">

          <div className="ape-president-section-heading">

            <div>

              <h2>
                {president
                  ? "Changer le Président"
                  : "Désigner le Président"}
              </h2>

              <p>
                Sélectionnez un parent déjà enregistré
                dans cette école. Le Président constituera
                ensuite lui-même son équipe APE.
              </p>

            </div>

          </div>

          <form onSubmit={handleSubmit}>

            <label htmlFor="ape-president-parent">
              Parent
            </label>

            <select
              id="ape-president-parent"
              value={form.parent_id}
              onChange={(event) =>
                setForm({
                  parent_id: event.target.value,
                })
              }
              disabled={saving}
              required
            >

              <option value="">
                Choisir un parent...
              </option>

              {parents.map((parent) => (
                <option
                  key={parent.id}
                  value={parent.id}
                >
                  {parent.full_name}

                  {parent.phone
                    ? ` — ${parent.phone}`
                    : ""}
                </option>
              ))}

            </select>

            {/* INFORMATION */}
            <div className="ape-president-note">

              ℹ️ Le Président utilise son compte parent
              habituel. Il pourra ensuite créer son équipe
              et attribuer les fonctions aux autres parents.

            </div>

            {/* BOUTON */}
            <button
              type="submit"
              className="ape-president-submit"
              disabled={
                saving || parents.length === 0
              }
            >
              {saving
                ? "Enregistrement..."
                : president
                ? "👑 Remplacer le Président"
                : "👑 Désigner comme Président"}
            </button>

          </form>

        </section>

        {/* INFORMATION COMPLÉMENTAIRE */}
        <section className="ape-president-info-card">

          <div className="ape-president-info-icon">
            ℹ️
          </div>

          <div>

            <h3>
              Organisation de l'APE
            </h3>

            <p>
              L'administration de l'école désigne
              uniquement le Président de l'APE.
              Les autres membres de l'équipe seront
              ajoutés directement par le Président.
            </p>

            <p>
              Le Président pourra ensuite attribuer
              les fonctions telles que Vice-président,
              Secrétaire, Trésorier, Communication ou
              Responsable activités.
            </p>

          </div>

        </section>

      </div>
    </>
  );
}

const styles = `
.ape-president-page {
  min-height: 100%;
  padding: 24px;
  color: #000;
  background: #fff;
}

.ape-president-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.ape-president-back,
.ape-president-title-icon {
  color: #000;
  background: #fff;
  border: 1px solid #d1d5db;
  cursor: pointer;
}

.ape-president-back {
  padding: 8px 12px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-weight: 700;
}

.ape-president-back:hover,
.ape-president-title-icon:hover {
  background: #f3f4f6;
}

.ape-president-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ape-president-title-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  font-size: 25px;
}

.ape-president-title-row h1 {
  margin: 0;
  color: #000;
  font-size: 28px;
}

.ape-president-title-row p,
.ape-president-section-heading p,
.ape-president-card p {
  margin: 5px 0 0;
  color: #000;
}

.ape-president-alert {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 16px;
  color: #000;
}

.ape-president-alert.error {
  border: 1px solid #fca5a5;
  background: #fff;
}

.ape-president-alert.success {
  border: 1px solid #86efac;
  background: #fff;
}

.ape-president-current,
.ape-president-form-card,
.ape-president-info-card {
  border: 1px solid #d1d5db;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  background: #fff;
}

.ape-president-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ape-president-card-icon {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  border: 1px solid #d1d5db;
  font-size: 28px;
}

.ape-president-label {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  color: #000;
}

.ape-president-card h2,
.ape-president-section-heading h2 {
  margin: 4px 0 0;
  color: #000;
}

.ape-president-form-card form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ape-president-form-card label {
  font-weight: 700;
  color: #000;
}

.ape-president-form-card select {
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid #9ca3af;
  border-radius: 10px;
  color: #000;
  background: #fff;
  font-size: 16px;
}

.ape-president-form-card select:focus {
  outline: 2px solid #000;
  outline-offset: 1px;
}

.ape-president-note {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  margin-top: 4px;
  color: #000;
  background: #fff;
  line-height: 1.5;
}

.ape-president-submit {
  margin-top: 8px;
  min-height: 46px;
  border: 1px solid #000;
  border-radius: 10px;
  background: #fff;
  color: #000;
  font-weight: 800;
  cursor: pointer;
}

.ape-president-submit:hover:not(:disabled) {
  background: #000;
  color: #fff;
}

.ape-president-submit:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.ape-president-info-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.ape-president-info-icon {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 20px;
}

.ape-president-info-card h3 {
  margin: 0;
  color: #000;
}

.ape-president-info-card p {
  margin: 8px 0 0;
  color: #000;
  line-height: 1.5;
}

.ape-president-loading {
  min-height: 50vh;
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
  color: #000;
}

.ape-president-loading h2 {
  margin: 8px 0 4px;
  color: #000;
}

.ape-president-loading p {
  margin: 0;
  color: #000;
}

.ape-president-loading-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

@media (max-width: 640px) {
  .ape-president-page {
    padding: 16px;
  }

  .ape-president-title-row h1 {
    font-size: 22px;
  }

  .ape-president-card {
    align-items: flex-start;
  }

  .ape-president-info-card {
    flex-direction: column;
  }
}
`;
