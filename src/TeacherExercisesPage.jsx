import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

export default function TeacherExercisesPage({
  schoolId,
  teacherId,
  classes = [],
  subjects = [],
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [dueAt, setDueAt] = useState("");

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("text");
  const [questionPoints, setQuestionPoints] = useState("1");
  const [questionOptions, setQuestionOptions] = useState(["", "", "", ""]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      setSelectedClass(String(classes[0].id));
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (!selectedSubject && subjects.length > 0) {
      setSelectedSubject(String(subjects[0].id));
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    loadExercises();
  }, [schoolId, teacherId, selectedClass, selectedSubject]);

  const selectedClassName = useMemo(() => {
    return (
      classes.find((item) => String(item.id) === String(selectedClass))
        ?.name || ""
    );
  }, [classes, selectedClass]);

  const selectedSubjectName = useMemo(() => {
    return (
      subjects.find((item) => String(item.id) === String(selectedSubject))
        ?.name || ""
    );
  }, [subjects, selectedSubject]);

  async function loadExercises() {
    if (!schoolId || !teacherId) return;

    setLoading(true);
    setMessage("");

    let query = supabase
      .from("exercises")
      .select(
        "id, school_id, teacher_id, class_id, subject_id, title, description, instructions, duration_minutes, published, due_at, created_at, updated_at"
      )
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (selectedClass) {
      query = query.eq("class_id", selectedClass);
    }

    if (selectedSubject) {
      query = query.eq("subject_id", selectedSubject);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur chargement exercices :", error);
      setMessage("Impossible de charger les exercices.");
      setExercises([]);
    } else {
      setExercises(data || []);
    }

    setLoading(false);
  }

  function resetForm() {
    setSelectedExercise(null);
    setTitle("");
    setDescription("");
    setInstructions("");
    setDurationMinutes("");
    setDueAt("");
    setQuestions([]);
    resetQuestionForm();
    setMessage("");
  }

  function resetQuestionForm() {
    setQuestionText("");
    setQuestionType("text");
    setQuestionPoints("1");
    setQuestionOptions(["", "", "", ""]);
  }

  function editExercise(exercise) {
    setSelectedExercise(exercise);
    setTitle(exercise.title || "");
    setDescription(exercise.description || "");
    setInstructions(exercise.instructions || "");
    setDurationMinutes(exercise.duration_minutes ?? "");
    setDueAt(
      exercise.due_at
        ? new Date(exercise.due_at).toISOString().slice(0, 16)
        : ""
    );

    loadQuestions(exercise.id);
    setMessage("");
  }

  async function loadQuestions(exerciseId) {
    const { data, error } = await supabase
      .from("exercise_questions")
      .select(
        "id, exercise_id, position, question, question_type, options, correct_answer, points"
      )
      .eq("exercise_id", exerciseId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Erreur chargement questions :", error);
      setQuestions([]);
      setMessage("Impossible de charger les questions.");
      return;
    }

    setQuestions(data || []);
  }

  async function saveExercise() {
    if (!schoolId || !teacherId) {
      setMessage("Informations professeur ou école manquantes.");
      return;
    }

    if (!selectedClass) {
      setMessage("Veuillez sélectionner une classe.");
      return;
    }

    if (!selectedSubject) {
      setMessage("Veuillez sélectionner une matière.");
      return;
    }

    if (!title.trim()) {
      setMessage("Veuillez saisir le titre de l'exercice.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      school_id: schoolId,
      teacher_id: teacherId,
      class_id: selectedClass,
      subject_id: selectedSubject,
      title: title.trim(),
      description: description.trim() || null,
      instructions: instructions.trim() || null,
      duration_minutes: durationMinutes
        ? Number(durationMinutes)
        : null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    };

    let result;

    if (selectedExercise) {
      result = await supabase
        .from("exercises")
        .update(payload)
        .eq("id", selectedExercise.id)
        .eq("school_id", schoolId)
        .eq("teacher_id", teacherId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("exercises")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      console.error("Erreur sauvegarde exercice :", result.error);
      setMessage("Erreur lors de l'enregistrement de l'exercice.");
      setSaving(false);
      return;
    }

    setSelectedExercise(result.data);

    if (!selectedExercise) {
      setQuestions([]);
    }

    await loadExercises();

    setMessage(
      selectedExercise
        ? "Exercice modifié avec succès."
        : "Exercice créé avec succès."
    );

    setSaving(false);
  }

  async function addQuestion() {
    if (!selectedExercise) {
      setMessage("Enregistrez d'abord l'exercice.");
      return;
    }

    if (!questionText.trim()) {
      setMessage("Veuillez saisir la question.");
      return;
    }

    const points = Number(questionPoints);

    if (!Number.isFinite(points) || points <= 0) {
      setMessage("Le nombre de points doit être supérieur à 0.");
      return;
    }

    let options = null;

    if (
      questionType === "multiple_choice" ||
      questionType === "single_choice"
    ) {
      options = questionOptions
        .map((option) => option.trim())
        .filter(Boolean);

      if (options.length < 2) {
        setMessage("Ajoutez au moins deux choix.");
        return;
      }
    }

    if (questionType === "true_false") {
      options = ["Vrai", "Faux"];
    }

    const position =
      questions.length > 0
        ? Math.max(...questions.map((item) => Number(item.position) || 0)) + 1
        : 1;

    const payload = {
      exercise_id: selectedExercise.id,
      position,
      question: questionText.trim(),
      question_type: questionType,
      options,
      correct_answer: null,
      points,
    };

    const { data, error } = await supabase
      .from("exercise_questions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Erreur ajout question :", error);
      setMessage("Impossible d'ajouter la question.");
      return;
    }

    setQuestions((current) => [...current, data]);
    resetQuestionForm();
    setMessage("Question ajoutée.");
  }

  async function deleteQuestion(questionId) {
    const { error } = await supabase
      .from("exercise_questions")
      .delete()
      .eq("id", questionId)
      .eq("exercise_id", selectedExercise.id);

    if (error) {
      console.error("Erreur suppression question :", error);
      setMessage("Impossible de supprimer la question.");
      return;
    }

    setQuestions((current) =>
      current.filter((question) => question.id !== questionId)
    );

    setMessage("Question supprimée.");
  }

  async function togglePublished(exercise) {
    const nextPublished = !exercise.published;

    const { data, error } = await supabase
      .from("exercises")
      .update({
        published: nextPublished,
      })
      .eq("id", exercise.id)
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .select()
      .single();

    if (error) {
      console.error("Erreur publication :", error);
      setMessage("Impossible de modifier la publication.");
      return;
    }

    setExercises((current) =>
      current.map((item) =>
        item.id === exercise.id ? data : item
      )
    );

    if (selectedExercise?.id === exercise.id) {
      setSelectedExercise(data);
    }

    setMessage(
      nextPublished
        ? "Exercice publié."
        : "Exercice remis en brouillon."
    );
  }

  async function deleteExercise(exercise) {
    const confirmed = window.confirm(
      `Supprimer l'exercice « ${exercise.title} » ?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("exercises")
      .delete()
      .eq("id", exercise.id)
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId);

    if (error) {
      console.error("Erreur suppression exercice :", error);
      setMessage("Impossible de supprimer l'exercice.");
      return;
    }

    if (selectedExercise?.id === exercise.id) {
      resetForm();
    }

    await loadExercises();
    setMessage("Exercice supprimé.");
  }

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>✏️ Exercices</h2>
          <p style={{ marginTop: "8px", color: "#666" }}>
            Créez, gérez et publiez vos exercices.
          </p>
        </div>

        <button onClick={resetForm}>
          + Nouvel exercice
        </button>
      </div>

      {message && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px",
            borderRadius: "8px",
            background: "#f3f4f6",
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <label>Classe</label>
          <select
            value={selectedClass}
            onChange={(event) => {
              setSelectedClass(event.target.value);
              resetForm();
            }}
            style={{ width: "100%", padding: "10px" }}
          >
            <option value="">Choisir une classe</option>

            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Matière</label>
          <select
            value={selectedSubject}
            onChange={(event) => {
              setSelectedSubject(event.target.value);
              resetForm();
            }}
            style={{ width: "100%", padding: "10px" }}
          >
            <option value="">Choisir une matière</option>

            {subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 0.8fr) minmax(400px, 1.2fr)",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <h3>Mes exercices</h3>

          {loading && <p>Chargement...</p>}

          {!loading && exercises.length === 0 && (
            <p>Aucun exercice pour cette classe et cette matière.</p>
          )}

          {!loading &&
            exercises.map((exercise) => (
              <div
                key={exercise.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "14px",
                  marginBottom: "12px",
                }}
              >
                <strong>{exercise.title}</strong>

                <div style={{ marginTop: "6px", fontSize: "13px" }}>
                  {exercise.published ? "🟢 Publié" : "🟡 Brouillon"}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <button onClick={() => editExercise(exercise)}>
                    Modifier
                  </button>

                  <button
                    onClick={() => togglePublished(exercise)}
                  >
                    {exercise.published ? "Dépublier" : "Publier"}
                  </button>

                  <button
                    onClick={() => deleteExercise(exercise)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
        </section>

        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <h3>
            {selectedExercise
              ? "Modifier l'exercice"
              : "Nouvel exercice"}
          </h3>

          <p style={{ color: "#666" }}>
            {selectedClassName || "Classe"} —{" "}
            {selectedSubjectName || "Matière"}
          </p>

          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label>Titre</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex : Les fractions"
                style={{ width: "100%", padding: "10px" }}
              />
            </div>

            <div>
              <label>Description</label>
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Décrivez l'exercice..."
                rows={3}
                style={{ width: "100%", padding: "10px" }}
              />
            </div>

            <div>
              <label>Consignes</label>
              <textarea
                value={instructions}
                onChange={(event) =>
                  setInstructions(event.target.value)
                }
                placeholder="Consignes données aux élèves..."
                rows={3}
                style={{ width: "100%", padding: "10px" }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label>Durée (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(event.target.value)
                  }
                  style={{ width: "100%", padding: "10px" }}
                />
              </div>

              <div>
                <label>Date limite</label>
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  style={{ width: "100%", padding: "10px" }}
                />
              </div>
            </div>

            <button
              onClick={saveExercise}
              disabled={saving}
            >
              {saving
                ? "Enregistrement..."
                : selectedExercise
                ? "Enregistrer les modifications"
                : "Enregistrer l'exercice"}
            </button>
          </div>

          {selectedExercise && (
            <div style={{ marginTop: "30px" }}>
              <h3>Questions</h3>

              {questions.length === 0 && (
                <p>Aucune question ajoutée.</p>
              )}

              {questions.map((question, index) => (
                <div
                  key={question.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    padding: "14px",
                    marginBottom: "12px",
                  }}
                >
                  <strong>
                    {index + 1}. {question.question}
                  </strong>

                  <div style={{ marginTop: "6px" }}>
                    Type : {question.question_type}
                  </div>

                  <div>
                    Points : {question.points}
                  </div>

                  {Array.isArray(question.options) &&
                    question.options.length > 0 && (
                      <ul>
                        {question.options.map((option, optionIndex) => (
                          <li key={optionIndex}>{option}</li>
                        ))}
                      </ul>
                    )}

                  <button
                    onClick={() => deleteQuestion(question.id)}
                  >
                    Supprimer la question
                  </button>
                </div>
              ))}

              <div
                style={{
                  marginTop: "20px",
                  padding: "16px",
                  borderRadius: "10px",
                  background: "#f8f8f8",
                }}
              >
                <h4>Ajouter une question</h4>

                <div style={{ display: "grid", gap: "12px" }}>
                  <textarea
                    value={questionText}
                    onChange={(event) =>
                      setQuestionText(event.target.value)
                    }
                    placeholder="Saisissez votre question..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px",
                    }}
                  />

                  <select
                    value={questionType}
                    onChange={(event) =>
                      setQuestionType(event.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                    }}
                  >
                    <option value="text">Texte</option>
                    <option value="multiple_choice">
                      Choix multiple
                    </option>
                    <option value="single_choice">
                      Choix unique
                    </option>
                    <option value="true_false">
                      Vrai / Faux
                    </option>
                    <option value="short_answer">
                      Réponse courte
                    </option>
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={questionPoints}
                    onChange={(event) =>
                      setQuestionPoints(event.target.value)
                    }
                    placeholder="Points"
                    style={{
                      width: "100%",
                      padding: "10px",
                    }}
                  />

                  {(questionType === "multiple_choice" ||
                    questionType === "single_choice") && (
                    <div>
                      <label>Choix de réponse</label>

                      {questionOptions.map((option, index) => (
                        <input
                          key={index}
                          value={option}
                          onChange={(event) => {
                            const updated = [...questionOptions];
                            updated[index] = event.target.value;
                            setQuestionOptions(updated);
                          }}
                          placeholder={`Choix ${index + 1}`}
                          style={{
                            width: "100%",
                            padding: "10px",
                            marginTop: "8px",
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <button onClick={addQuestion}>
                    + Ajouter la question
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}