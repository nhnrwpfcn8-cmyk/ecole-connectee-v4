import React, { useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

export default function AdminEcoleInscriptionsPage({
  schoolId,
  classes = [],
  onSuccess,
}) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    birth_place: "",
    class_id: "",
    student_code: "",
    family_identifier: "",
    parent_full_name: "",
    parent_phone: "",
    parent_email: "",
    parent_address: "",
    student_photo: null,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === form.class_id),
    [classes, form.class_id]
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");
    setCredentials(null);

    if (!schoolId) {
      setError("Aucune école n'est associée à cet administrateur.");
      return;
    }

    if (
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.date_of_birth ||
      !form.birth_place.trim() ||
      !form.class_id ||
      !form.family_identifier.trim() ||
      !form.parent_full_name.trim() ||
      !form.parent_phone.trim()
    ) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (
      form.parent_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parent_email)
    ) {
      setError("L'adresse email du parent n'est pas valide.");
      return;
    }

    try {
      setLoading(true);

      /*
       * Le mot de passe n'est pas envoyé par le formulaire.
       * La fonction Supabase génère les identifiants automatiquement.
       */
      const { data, error: functionError } =
        await supabase.functions.invoke("create-family-enrollment", {
          body: {
            firstName: form.first_name.trim(),
            lastName: form.last_name.trim(),
            dateOfBirth: form.date_of_birth,
            birthPlace: form.birth_place.trim(),
            classId: form.class_id,
            studentCode: form.student_code.trim(),
            familyIdentifier: form.family_identifier.trim(),
            parentFullName: form.parent_full_name.trim(),
            parentPhone: form.parent_phone.trim(),
            parentEmail: form.parent_email.trim().toLowerCase(),
            parentAddress: form.parent_address.trim(),
          },
        });

      if (functionError) {
        throw new Error(
          functionError.message || "Impossible de créer l'inscription."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error || "La création de l'inscription a échoué."
        );
      }

      setMessage(
        data.message ||
          "L'élève et son responsable ont été créés avec succès."
      );

      if (data.credentials) {
        setCredentials(data.credentials);
      }

      setForm({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        birth_place: "",
        class_id: "",
        student_code: "",
        family_identifier: "",
        parent_full_name: "",
        parent_phone: "",
        parent_email: "",
        parent_address: "",
        student_photo: null,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Erreur inscription :", err);

      setError(
        err?.message ||
          "Une erreur est survenue lors de l'inscription."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ec-page">
      <div className="ec-page-header">
        <div>
          <span className="ec-eyebrow">
            INSCRIPTIONS
          </span>

          <h2>
            Nouvelle inscription élève
          </h2>

          <p>
            Enregistrer l'élève et sa famille dans votre établissement.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="ec-error-card"
          style={{ marginBottom: "20px" }}
        >
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div
          className="ec-panel"
          style={{
            marginBottom: "20px",
            border: "1px solid #22c55e",
          }}
        >
          ✅ {message}
        </div>
      )}

      {credentials && (
        <div
          className="ec-panel"
          style={{
            marginBottom: "20px",
            border: "1px solid #3b82f6",
          }}
        >
          <div className="ec-panel-header">
            <div>
              <h3>🔐 Identifiants générés</h3>
              <p>
                Conservez ces informations pour les remettre à la famille.
              </p>
            </div>
          </div>

          <div className="ec-form-grid">
            {credentials.student && (
              <div className="ec-field">
                <label>Compte élève</label>

                <div>
                  <strong>
                    Identifiant :
                  </strong>{" "}
                  {credentials.student.login}
                </div>

                <div>
                  <strong>
                    Code :
                  </strong>{" "}
                  {credentials.student.password}
                </div>
              </div>
            )}

            {credentials.parent && (
              <div className="ec-field">
                <label>Compte parent</label>

                <div>
                  <strong>
                    Identifiant :
                  </strong>{" "}
                  {credentials.parent.login}
                </div>

                <div>
                  <strong>
                    Code :
                  </strong>{" "}
                  {credentials.parent.password}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="ec-panel"
      >
        <div className="ec-panel-header">
          <div>
            <h3>Informations de l'élève</h3>
            <p>
              Informations scolaires et état civil
            </p>
          </div>
        </div>

        <div className="ec-form-grid">
          <div className="ec-field">
            <label>Prénom *</label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              placeholder="Prénom de l'élève"
              disabled={loading}
            />
          </div>

          <div className="ec-field">
            <label>Nom *</label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Nom de l'élève"
              disabled={loading}
            />
          </div>

          <div className="ec-field">
            <label>Date de naissance *</label>
            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="ec-field">
            <label>Lieu de naissance *</label>
            <input
              name="birth_place"
              value={form.birth_place}
              onChange={handleChange}
              placeholder="Ex : Dakar"
              disabled={loading}
            />
          </div>

          <div className="ec-field">
            <label>Classe *</label>

            <select
              name="class_id"
              value={form.class_id}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">
                Choisir une classe
              </option>

              {classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>

            {selectedClass && (
              <small>
                Classe sélectionnée :{" "}
                {selectedClass.name}
              </small>
            )}
          </div>

          <div className="ec-field">
            <label>Matricule élève</label>

            <input
              name="student_code"
              value={form.student_code}
              onChange={handleChange}
              placeholder="Ex : EC-2026-001"
              disabled={loading}
            />

            <small>
              Laissez vide pour laisser le système le gérer.
            </small>
          </div>
        </div>

        <div
          className="ec-panel-header"
          style={{ marginTop: "32px" }}
        >
          <div>
            <h3>Photo de l'élève</h3>

            <p>
              Ajouter une photo récente pour la future carte scolaire.
            </p>
          </div>
        </div>

        <div className="ec-form-grid">
          <div className="ec-field">
            <label>Photo de l'élève</label>

            <input
              type="file"
              accept="image/*"
              name="student_photo"
              onChange={(event) => {
                const file =
                  event.target.files?.[0] || null;

                setForm((current) => ({
                  ...current,
                  student_photo: file,
                }));
              }}
              disabled={loading}
            />

            <small>
              JPG ou PNG conseillé.
            </small>
          </div>
        </div>

        <div
          className="ec-panel-header"
          style={{ marginTop: "32px" }}
        >
          <div>
            <h3>Identification familiale</h3>

            <p>
              Identifiant permettant de relier les comptes de la famille.
            </p>
          </div>
        </div>

        <div className="ec-form-grid">
          <div className="ec-field">
            <label>
              Identifiant familial *
            </label>

            <input
              name="family_identifier"
              value={form.family_identifier}
              onChange={handleChange}
              placeholder="Ex : maimouna.thiam"
              disabled={loading}
            />

            <small>
              Cet identifiant sera commun aux comptes liés à cette famille.
            </small>
          </div>
        </div>

        <div
          className="ec-panel-header"
          style={{ marginTop: "32px" }}
        >
          <div>
            <h3>Parent / Responsable</h3>

            <p>
              Informations du responsable légal.
            </p>
          </div>
        </div>

        <div className="ec-form-grid">
          <div className="ec-field">
            <label>
              Nom complet *
            </label>

            <input
              name="parent_full_name"
              value={form.parent_full_name}
              onChange={handleChange}
              placeholder="Nom complet du parent"
              disabled={loading}
            />
          </div>

          <div className="ec-field">
            <label>
              Téléphone *
            </label>

            <input
              name="parent_phone"
              value={form.parent_phone}
              onChange={handleChange}
              placeholder="Ex : 77 000 00 00"
              disabled={loading}
            />
          </div>

          <div className="ec-field">
            <label>
              Email familial
            </label>

            <input
              type="email"
              name="parent_email"
              value={form.parent_email}
              onChange={handleChange}
              placeholder="famille@example.com"
              disabled={loading}
            />

            <small>
              Facultatif pour cette première version.
            </small>
          </div>

          <div className="ec-field">
            <label>
              Adresse
            </label>

            <input
              name="parent_address"
              value={form.parent_address}
              onChange={handleChange}
              placeholder="Adresse du responsable"
              disabled={loading}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "32px",
          }}
        >
          <button
            type="submit"
            className="ec-btn ec-btn-primary"
            disabled={loading}
          >
            {loading
              ? "Création en cours..."
              : "Enregistrer l'inscription"}
          </button>
        </div>
      </form>
    </div>
  );
}
