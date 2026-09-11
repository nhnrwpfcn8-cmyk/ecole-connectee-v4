import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const TEACHER_CONTENT_BUCKET = "teacher-content";

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
  const [questionOptions, setQuestionOptions] = useState([
    "",
    "",
    "",
    "",
  ]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileLink, setFileLink] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
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

  useEffect(() => {
    if (selectedExercise?.file_url) {
      createFileLink(selectedExercise.file_url);
    } else {
      setFileLink("");
    }
  }, [selectedExercise?.file_url]);

  const selectedClassName = useMemo(() => {
    return (
      classes.find(
        (item) => String(item.id) === String(selectedClass)
      )?.name || ""
    );
  }, [classes, selectedClass]);

  const selectedSubjectName = useMemo(() => {
    return (
      subjects.find(
        (item) => String(item.id) === String(selectedSubject)
      )?.name || ""
    );
  }, [subjects, selectedSubject]);

  async function loadExercises() {
    if (!schoolId || !teacherId) return;

    setLoading(true);
    setMessage("");

    let query = supabase
      .from("exercises")
      .select(
        "id, school_id, teacher_id, class_id, subject_id, title, description, instructions, duration_minutes, published, due_at, file_url, file_name, created_at, updated_at"
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

    setSelectedFile(null);
    setFileUrl("");
    setFileName("");
    setFileLink("");

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

    setSelectedFile(null);
    setFileUrl(exercise.file_url || "");
    setFileName(exercise.file_name || "");
    setFileLink("");

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

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setMessage("");
  }

  function sanitizeFileName(name) {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  function buildFilePath(exerciseId, file) {
    const safeName = sanitizeFileName(file.name);
    const uniqueName = `${Date.now()}_${safeName}`;

    return `${schoolId}/${teacherId}/exercises/${exerciseId}/${uniqueName}`;
  }

  async function createFileLink(storagePath) {
    if (!storagePath) {
      setFileLink("");
      return;
    }

    // Si file_url contient déjà une URL complète,
    // on l'utilise directement.
    if (
      storagePath.startsWith("http://") ||
      storagePath.startsWith("https://")
    ) {
      setFileLink(storagePath);
      return;
    }

    const { data, error } = await supabase.storage
      .from(TEACHER_CONTENT_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    if (error) {
      console.error("Erreur création URL fichier :", error);
      setFileLink("");
      return;
    }

    setFileLink(data?.signedUrl || "");
  }

  async function uploadExerciseFile(exercise) {
    if (!selectedFile) {
      return {
        success: true,
        exercise,
      };
    }

    if (!exercise?.id) {
      setMessage("Enregistrez d'abord l'exercice.");
      return {
        success: false,
        exercise,
      };
    }

    if (!schoolId || !teacherId) {
      setMessage("Informations professeur ou école manquantes.");
      return {
        success: false,
        exercise,
      };
    }

    setUploadingFile(true);
    setMessage("");

    const oldFilePath = exercise.file_url || "";
    const newFilePath = buildFilePath(exercise.id, selectedFile);

    const { error: uploadError } = await supabase.storage
      .from(TEACHER_CONTENT_BUCKET)
      .upload(newFilePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Erreur upload fichier :", uploadError);
      setMessage(
        "Impossible d'envoyer le fichier. Vérifiez le fichier puis réessayez."
      );
      setUploadingFile(false);

      return {
        success: false,
        exercise,
      };
    }

    const { data: updatedExercise, error: updateError } =
      await supabase
        .from("exercises")
        .update({
          file_url: newFilePath,
          file_name: selectedFile.name,
        })
        .eq("id", exercise.id)
        .eq("school_id", schoolId)
        .eq("teacher_id", teacherId)
        .select()
        .single();

    if (updateError) {
      console.error(
        "Erreur association fichier à l'exercice :",
        updateError
      );

      // On supprime le nouveau fichier si l'association DB échoue.
      await supabase.storage
        .from(TEACHER_CONTENT_BUCKET)
        .remove([newFilePath]);

      setMessage(
        "Le fichier a été envoyé mais n'a pas pu être associé à l'exercice."
      );

      setUploadingFile(false);

      return {
        success: false,
        exercise,
      };
    }

    // Une fois le nouveau fichier correctement associé,
    // on supprime l'ancien fichier s'il appartenait au Storage.
    if (
      oldFilePath &&
      !oldFilePath.startsWith("http://") &&
      !oldFilePath.startsWith("https://") &&
      oldFilePath !== newFilePath
    ) {
      const { error: deleteOldError } = await supabase.storage
        .from(TEACHER_CONTENT_BUCKET)
        .remove([oldFilePath]);

      if (deleteOldError) {
        console.warn(
          "Ancien fichier non supprimé :",
          deleteOldError
        );
      }
    }

    setSelectedFile(null);
    setFileUrl(updatedExercise.file_url || "");
    setFileName(updatedExercise.file_name || "");
    setSelectedExercise(updatedExercise);

    await createFileLink(updatedExercise.file_url);

    setUploadingFile(false);

    return {
      success: true,
      exercise: updatedExercise,
    };
  }

  async function deleteExerciseFile() {
    if (!selectedExercise?.id) {
      return;
    }

    const confirmed = window.confirm(
      "Supprimer le document attaché à cet exercice ?"
    );

    if (!confirmed) return;

    setUploadingFile(true);
    setMessage("");

    const currentFilePath = selectedExercise.file_url || "";

    if (
      currentFilePath &&
      !currentFilePath.startsWith("http://") &&
      !currentFilePath.startsWith("https://")
    ) {
      const { error: storageError } = await supabase.storage
        .from(TEACHER_CONTENT_BUCKET)
        .remove([currentFilePath]);

      if (storageError) {
        console.error(
          "Erreur suppression fichier Storage :",
          storageError
        );
        setMessage(
          "Impossible de supprimer le document du stockage."
        );
        setUploadingFile(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from("exercises")
      .update({
        file_url: null,
        file_name: null,
      })
      .eq("id", selectedExercise.id)
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .select()
      .single();

    if (error) {
      console.error(
        "Erreur suppression référence fichier :",
        error
      );
      setMessage(
        "Impossible de supprimer le document de l'exercice."
      );
      setUploadingFile(false);
      return;
    }

    setSelectedExercise(data);
    setFileUrl("");
    setFileName("");
    setFileLink("");
    setSelectedFile(null);

    await loadExercises();

    setMessage("Document supprimé avec succès.");
    setUploadingFile(false);
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
      due_at: dueAt
        ? new Date(dueAt).toISOString()
        : null,
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
      console.error(
        "Erreur sauvegarde exercice :",
        result.error
      );
      setMessage(
        "Erreur lors de l'enregistrement de l'exercice."
      );
      setSaving(false);
      return;
    }

    let savedExercise = result.data;

    setSelectedExercise(savedExercise);

    if (!selectedExercise) {
      setQuestions([]);
    }

    // Si un nouveau fichier a été choisi,
    // on l'envoie après avoir créé/enregistré l'exercice.
    if (selectedFile) {
      const uploadResult = await uploadExerciseFile(savedExercise);

      if (!uploadResult.success) {
        await loadExercises();
        setSaving(false);
        return;
      }

      savedExercise = uploadResult.exercise;
    } else {
      setFileUrl(savedExercise.file_url || "");
      setFileName(savedExercise.file_name || "");

      if (savedExercise.file_url) {
        await createFileLink(savedExercise.file_url);
      } else {
        setFileLink("");
      }
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
        ? Math.max(
            ...questions.map(
              (item) => Number(item.position) || 0
            )
          ) + 1
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
      console.error(
        "Erreur suppression question :",
        error
      );
      setMessage("Impossible de supprimer la question.");
      return;
    }

    setQuestions((current) =>
      current.filter(
        (question) => question.id !== questionId
      )
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
      setMessage(
        "Impossible de modifier la publication."
      );
      return;
    }

    setExercises((current) =>
      current.map((item) =>
        item.id === exercise.id ? data : item
      )
    );

    if (selectedExercise?.id === exercise.id) {
      setSelectedExercise(data);

      if (data.file_url) {
        await createFileLink(data.file_url);
      }
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
      console.error(
        "Erreur suppression exercice :",
        error
      );
      setMessage("Impossible de supprimer l'exercice.");
      return;
    }

    // Le fichier Storage est supprimé après la suppression
    // de l'exercice si son chemin est connu.
    if (
      exercise.file_url &&
      !exercise.file_url.startsWith("http://") &&
      !exercise.file_url.startsWith("https://")
    ) {
      const { error: storageError } = await supabase.storage
        .from(TEACHER_CONTENT_BUCKET)
        .remove([exercise.file_url]);

      if (storageError) {
        console.warn(
          "Fichier Storage non supprimé après suppression exercice :",
          storageError
        );
      }
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

          <p
            style={{
              marginTop: "8px",
              color: "#666",
            }}
          >
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
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
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
            style={{
              width: "100%",
              padding: "10px",
            }}
          >
            <option value="">
              Choisir une classe
            </option>

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
            style={{
              width: "100%",
              padding: "10px",
            }}
          >
            <option value="">
              Choisir une matière
            </option>

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
          gridTemplateColumns:
            "minmax(280px, 0.8fr) minmax(400px, 1.2fr)",
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
            <p>
              Aucun exercice pour cette classe et cette
              matière.
            </p>
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

                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "13px",
                  }}
                >
                  {exercise.published
                    ? "🟢 Publié"
                    : "🟡 Brouillon"}
                </div>

                {exercise.file_name && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "13px",
                    }}
                  >
                    📎 {exercise.file_name}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() =>
                      editExercise(exercise)
                    }
                  >
                    Modifier
                  </button>

                  <button
                    onClick={() =>
                      togglePublished(exercise)
                    }
                  >
                    {exercise.published
                      ? "Dépublier"
                      : "Publier"}
                  </button>

                  <button
                    onClick={() =>
                      deleteExercise(exercise)
                    }
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

          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            <div>
              <label>Titre</label>

              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Ex : Les fractions"
                style={{
                  width: "100%",
                  padding: "10px",
                }}
              />
            </div>

            <div>
              <label>Description</label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Décrivez l'exercice..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                }}
              />
            </div>

            <div>
              <label>Consignes</label>

              <textarea
                value={instructions}
                onChange={(event) =>
                  setInstructions(
                    event.target.value
                  )
                }
                placeholder="Consignes données aux élèves..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                }}
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
                    setDurationMinutes(
                      event.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                  }}
                />
              </div>

              <div>
                <label>Date limite</label>

                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) =>
                    setDueAt(event.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                  }}
                />
              </div>
            </div>

            {/* ================================
                DOCUMENT DE L'EXERCICE
               ================================= */}
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "14px",
                background: "#fafafa",
              }}
            >
              <h4
                style={{
                  marginTop: 0,
                  marginBottom: "8px",
                }}
              >
                📎 Document de l'exercice
              </h4>

              <p
                style={{
                  marginTop: 0,
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                Ajoutez un PDF, Word, Excel,
                PowerPoint ou autre document.
              </p>

              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.odt,.ods"
                onChange={handleFileChange}
                style={{
                  width: "100%",
                }}
              />

              {selectedFile && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#eef6ff",
                  }}
                >
                  📄 Nouveau fichier :
                  <strong
                    style={{
                      marginLeft: "5px",
                    }}
                  >
                    {selectedFile.name}
                  </strong>
                </div>
              )}

              {fileName && !selectedFile && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#f0fdf4",
                  }}
                >
                  📎 Document actuel :
                  <strong
                    style={{
                      marginLeft: "5px",
                    }}
                  >
                    {fileName}
                  </strong>

                  {fileLink && (
                    <div
                      style={{
                        marginTop: "8px",
                      }}
                    >
                      <a
                        href={fileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📥 Ouvrir le document
                      </a>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={deleteExerciseFile}
                    disabled={uploadingFile}
                    style={{
                      marginTop: "10px",
                    }}
                  >
                    {uploadingFile
                      ? "Suppression..."
                      : "🗑️ Supprimer le document"}
                  </button>
                </div>
              )}

              {uploadingFile && (
                <p
                  style={{
                    marginBottom: 0,
                    color: "#666",
                  }}
                >
                  ☁️ Envoi du document...
                </p>
              )}
            </div>

            <button
              onClick={saveExercise}
              disabled={saving || uploadingFile}
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
                    {index + 1}.{" "}
                    {question.question}
                  </strong>

                  <div
                    style={{
                      marginTop: "6px",
                    }}
                  >
                    Type : {question.question_type}
                  </div>

                  <div>
                    Points : {question.points}
                  </div>

                  {Array.isArray(
                    question.options
                  ) &&
                    question.options.length > 0 && (
                      <ul>
                        {question.options.map(
                          (
                            option,
                            optionIndex
                          ) => (
                            <li
                              key={
                                optionIndex
                              }
                            >
                              {option}
                            </li>
                          )
                        )}
                      </ul>
                    )}

                  <button
                    onClick={() =>
                      deleteQuestion(
                        question.id
                      )
                    }
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

                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <textarea
                    value={questionText}
                    onChange={(event) =>
                      setQuestionText(
                        event.target.value
                      )
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
                      setQuestionType(
                        event.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                    }}
                  >
                    <option value="text">
                      Texte
                    </option>

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
                      setQuestionPoints(
                        event.target.value
                      )
                    }
                    placeholder="Points"
                    style={{
                      width: "100%",
                      padding: "10px",
                    }}
                  />

                  {(questionType ===
                    "multiple_choice" ||
                    questionType ===
                      "single_choice") && (
                    <div>
                      <label>
                        Choix de réponse
                      </label>

                      {questionOptions.map(
                        (
                          option,
                          index
                        ) => (
                          <input
                            key={index}
                            value={option}
                            onChange={(
                              event
                            ) => {
                              const updated = [
                                ...questionOptions,
                              ];

                              updated[index] =
                                event.target.value;

                              setQuestionOptions(
                                updated
                              );
                            }}
                            placeholder={`Choix ${
                              index + 1
                            }`}
                            style={{
                              width: "100%",
                              padding: "10px",
                              marginTop:
                                "8px",
                            }}
                          />
                        )
                      )}
                    </div>
                  )}

                  <button
                    onClick={addQuestion}
                  >
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