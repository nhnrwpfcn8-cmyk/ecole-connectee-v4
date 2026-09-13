import React, { useMemo, useState } from "react";

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
    family_identifier: "",
    parent_full_name: "",
    parent_phone: "",
    parent_email: "",
    parent_address: "",
student_photo: null,
});
  

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!schoolId) {
      setError("Aucune école n'est associée à cet administrateur.");
      return;
    }

    if (
      !form.first_name ||
      !form.last_name ||
      !form.date_of_birth ||
      !form.birth_place ||
      !form.class_id ||
      !form.family_identifier ||
      !form.parent_full_name ||
      !form.parent_phone
    ) {
      setError(
        "Veuillez remplir tous les champs obligatoires."
      );
      return;
    }

    setMessage(
      "Formulaire prêt. La création automatique des comptes sera ajoutée à l'étape suivante."
    );

    if (onSuccess) {
      onSuccess();
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
          style={{ marginBottom: "20px" }}
        >
          ✅ {message}
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
            />
          </div>

          <div className="ec-field">
            <label>Nom *</label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Nom de l'élève"
            />
          </div>

          <div className="ec-field">
            <label>Date de naissance *</label>
            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
            />
          </div>

          <div className="ec-field">
            <label>Lieu de naissance *</label>
            <input
              name="birth_place"
              value={form.birth_place}
              onChange={handleChange}
              placeholder="Ex : Dakar"
            />
          </div>

          <div className="ec-field">
            <label>Classe *</label>
            <select
              name="class_id"
              value={form.class_id}
              onChange={handleChange}
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
                Classe sélectionnée : {selectedClass.name}
              </small>
            )}
          </div>
        </div>

        <div
          className="ec-panel-header"
          style={{ marginTop: "32px" }}
        >
          <div>
            <h3>Identification familiale</h3>
            <p>
              Cet identifiant permettra de relier le parent
              et l'élève.
            </p>
          </div>
        </div>
<div
  className="ec-panel-header"
  style={{ marginTop: "32px" }}
>
  <div>
    <h3>Photo de l'élève</h3>
    <p>
      Ajouter une photo récente qui sera utilisée pour la fiche et la future carte scolaire.
    </p>
  </div>
</div>

<div className="ec-form-grid">
  <div className="ec-field">
    <label>Photo de l'élève *</label>

    <input
      type="file"
      accept="image/*"
      name="student_photo"
      onChange={(event) => {
        const file = event.target.files?.[0] || null;

        setForm((current) => ({
          ...current,
          student_photo: file,
        }));
      }}
    />

    <small>
      Format conseillé : JPG ou PNG. Photo récente et claire.
    </small>
  </div>
</div>
        <div className="ec-form-grid">
          <div className="ec-field">
            <label>Identifiant familial *</label>
            <input
              name="family_identifier"
              value={form.family_identifier}
              onChange={handleChange}
              placeholder="Ex : maimouna.thiam"
            />

            <small>
              Il sera partagé entre les comptes liés à cette famille.
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
            <label>Nom complet *</label>
            <input
              name="parent_full_name"
              value={form.parent_full_name}
              onChange={handleChange}
              placeholder="Nom complet du parent"
            />
          </div>

          <div className="ec-field">
            <label>Téléphone *</label>
            <input
              name="parent_phone"
              value={form.parent_phone}
              onChange={handleChange}
              placeholder="Ex : 77 000 00 00"
            />
          </div>

          <div className="ec-field">
            <label>Email familial</label>
            <input
              type="email"
              name="parent_email"
              value={form.parent_email}
              onChange={handleChange}
              placeholder="famille@example.com"
            />
          </div>

          <div className="ec-field">
            <label>Adresse</label>
            <input
              name="parent_address"
              value={form.parent_address}
              onChange={handleChange}
              placeholder="Adresse du responsable"
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
          >
            Enregistrer l'inscription
          </button>
        </div>
      </form>
    </div>
  );
}
