import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

export default function TeacherGradesPage({
  schoolId,
  teacherId,
  classes,
  students,
  subjects,
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTrimester, setSelectedTrimester] =
    useState("trimestre_1");

  const [assessmentId, setAssessmentId] = useState("");
  const [assessments, setAssessments] = useState([]);
  const [grades, setGrades] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  /* =====================================================
     CLASSE PAR DÉFAUT
     ===================================================== */

  useEffect(() => {
    if (!selectedClass && classes?.length) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  /* =====================================================
     MATIÈRE PAR DÉFAUT
     ===================================================== */

  useEffect(() => {
    if (!selectedSubject && subjects?.length) {
      setSelectedSubject(String(subjects[0].id));
    }
  }, [subjects, selectedSubject]);

  /* =====================================================
     CHARGER LES ÉVALUATIONS
     ===================================================== */

  useEffect(() => {
    setAssessmentId("");
    setGrades({});
    loadAssessments();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedClass,
    selectedSubject,
    selectedTrimester,
    schoolId,
    teacherId,
  ]);

  async function loadAssessments() {
    if (!schoolId || !teacherId || !selectedClass) {
      setAssessments([]);
      return;
    }

    setLoading(true);
    setMessage(null);

    let query = supabase
  .from("assessments")
  .select(
    "id, school_id, teacher_id, class_id, subject_id, title, description, assessment_type, assessment_slot, trimester, max_score, evaluation_date, coefficient, published, created_at, updated_at"
  )
  .eq("school_id", schoolId)
  .eq("teacher_id", teacherId)
  .eq("class_id", selectedClass)
  .eq("trimester", selectedTrimester)
  .in("assessment_slot", [
    "devoir_1",
    "devoir_2",
    "composition",
  ]);

    if (selectedSubject) {
      query = query.eq(
        "subject_id",
        Number(selectedSubject)
      );
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      console.error(
        "Erreur chargement évaluations :",
        error
      );

      setAssessments([]);

      setMessage({
        type: "error",
        text: "Impossible de charger les évaluations.",
      });

      return;
    }

    setAssessments(data || []);

    // IMPORTANT :
    // aucune évaluation n'est automatiquement sélectionnée.
    setAssessmentId("");
  }

  /* =====================================================
     CHARGER LES NOTES DE L'ÉVALUATION
     ===================================================== */

  useEffect(() => {
    if (!assessmentId) {
      setGrades({});
      return;
    }

    loadGrades(assessmentId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, schoolId, teacherId]);

  async function loadGrades(id) {
    if (!id || !schoolId || !teacherId) {
      setGrades({});
      return;
    }

    const { data, error } = await supabase
      .from("grades")
      .select(
        "id, assessment_id, student_id, teacher_id, school_id, score, appreciation, stars, comment, created_at, updated_at"
      )
      .eq("assessment_id", id)
      .eq("teacher_id", teacherId)
      .eq("school_id", schoolId);

    if (error) {
      console.error(
        "Erreur chargement notes :",
        error
      );

      setMessage({
        type: "error",
        text: "Impossible de charger les notes.",
      });

      return;
    }

    const mapped = {};

    (data || []).forEach((grade) => {
      mapped[grade.student_id] = grade;
    });

    setGrades(mapped);
  }

  /* =====================================================
     ÉVALUATION SÉLECTIONNÉE
     ===================================================== */

  const selectedAssessment = assessments.find(
    (assessment) => assessment.id === assessmentId
  );

  /* =====================================================
     ÉLÈVES CONCERNÉS
     ===================================================== */

  const classStudents = useMemo(() => {
    if (!selectedAssessment) {
      return [];
    }

    return (students || []).filter(
      (student) =>
        student.class_id === selectedAssessment.class_id &&
        student.active !== false
    );
  }, [students, selectedAssessment]);

  /* =====================================================
     ENREGISTRER / MODIFIER UNE NOTE
     ===================================================== */

  async function saveGrade(studentId, value) {
    if (
      !selectedAssessment ||
      !schoolId ||
      !teacherId ||
      value === ""
    ) {
      return;
    }

    const numericScore = Number(value);
    const maxScore = Number(
      selectedAssessment.max_score
    );

    if (
      Number.isNaN(numericScore) ||
      numericScore < 0 ||
      numericScore > maxScore
    ) {
      setMessage({
        type: "error",
        text: `La note doit être comprise entre 0 et ${maxScore}.`,
      });

      return;
    }

    setSaving(true);
    setMessage(null);

    const existing = grades[studentId];

    let data = null;
    let error = null;

    /* -----------------------------
       NOUVELLE NOTE
       ----------------------------- */

    if (!existing?.id) {
      const result = await supabase
        .from("grades")
        .insert({
          assessment_id: selectedAssessment.id,
          student_id: studentId,
          teacher_id: teacherId,
          school_id: schoolId,
          score: numericScore,
          appreciation: null,
          stars: null,
          comment: null,
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    /* -----------------------------
       MODIFICATION NOTE EXISTANTE
       ----------------------------- */

    else {
      const result = await supabase
        .from("grades")
        .update({
          score: numericScore,
        })
        .eq("id", existing.id)
        .eq("teacher_id", teacherId)
        .eq("school_id", schoolId)
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    setSaving(false);

    if (error) {
      console.error(
        "Erreur enregistrement note :",
        error
      );

      setMessage({
        type: "error",
        text:
          error.message ||
          "Impossible d'enregistrer la note.",
      });

      return;
    }

    if (!data) {
      setMessage({
        type: "error",
        text: "La note n'a pas pu être enregistrée.",
      });

      return;
    }

    setGrades((current) => ({
      ...current,
      [studentId]: data,
    }));

    setMessage({
      type: "success",
      text:
        "Note enregistrée et synchronisée avec l'Admin École.",
    });
  }

  /* =====================================================
     SUPPRIMER UNE NOTE
     ===================================================== */

  async function deleteGrade(studentId) {
    const existing = grades[studentId];

    if (!existing?.id) {
      return;
    }

    if (
      !window.confirm(
        "Voulez-vous vraiment supprimer cette note ?"
      )
    ) {
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("grades")
      .delete()
      .eq("id", existing.id)
      .eq("teacher_id", teacherId)
      .eq("school_id", schoolId);

    setSaving(false);

    if (error) {
      console.error(
        "Erreur suppression note :",
        error
      );

      setMessage({
        type: "error",
        text: "Impossible de supprimer cette note.",
      });

      return;
    }

    setGrades((current) => {
      const next = { ...current };

      delete next[studentId];

      return next;
    });

    setMessage({
      type: "success",
      text:
        "Note supprimée et synchronisée avec l'Admin École.",
    });
  }

  /* =====================================================
     NOMS CLASSE / MATIÈRE
     ===================================================== */

  const selectedClassName =
    classes?.find(
      (item) => item.id === selectedClass
    )?.name || "Classe";

  const selectedSubjectName =
    subjects?.find(
      (item) =>
        String(item.id) ===
        String(selectedSubject)
    )?.name || "Matière";

  const trimesterLabel =
    selectedTrimester === "trimestre_1"
      ? "Trimestre 1"
      : selectedTrimester === "trimestre_2"
      ? "Trimestre 2"
      : "Trimestre 3";

  /* =====================================================
     AFFICHAGE
     ===================================================== */

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "#0f172a" }}>
          📝 Notes
        </h2>

        <p
          style={{
            marginTop: 6,
            color: "#64748b",
          }}
        >
          Saisir, modifier et synchroniser les notes
          d'une évaluation existante.
        </p>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background:
              message.type === "error"
                ? "#fee2e2"
                : "#dcfce7",
            color:
              message.type === "error"
                ? "#991b1b"
                : "#166534",
          }}
        >
          {message.text}
        </div>
      )}

      {/* FILTRES */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#334155",
            }}
          >
            Classe
          </span>

          <select
            value={selectedClass}
            onChange={(event) =>
              setSelectedClass(event.target.value)
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            {classes?.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#334155",
            }}
          >
            Matière
          </span>

          <select
            value={selectedSubject}
            onChange={(event) =>
              setSelectedSubject(event.target.value)
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            {subjects?.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#334155",
            }}
          >
            Trimestre
          </span>

          <select
            value={selectedTrimester}
            onChange={(event) =>
              setSelectedTrimester(event.target.value)
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            <option value="trimestre_1">
              Trimestre 1
            </option>

            <option value="trimestre_2">
              Trimestre 2
            </option>

            <option value="trimestre_3">
              Trimestre 3
            </option>
          </select>
        </label>

        {/* ÉVALUATION EXISTANTE */}

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#334155",
            }}
          >
            Évaluation
          </span>

          <select
            value={assessmentId}
            onChange={(event) =>
              setAssessmentId(event.target.value)
            }
            disabled={
              loading || assessments.length === 0
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            <option value="">
              {loading
                ? "Chargement..."
                : "Sélectionner une évaluation"}
            </option>

            {assessments.map((assessment) => (
              <option
                key={assessment.id}
                value={assessment.id}
              >
                {assessment.title} — /
                {assessment.max_score}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* TABLEAU DES NOTES */}

      <div
        className="ec-card"
        style={{ padding: 20 }}
      >
        {!selectedAssessment ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "#64748b",
              background: "#f8fafc",
              borderRadius: 10,
            }}
          >
            {assessments.length === 0
              ? `Aucune évaluation pour ${selectedClassName} · ${selectedSubjectName} · ${trimesterLabel}.`
              : "Sélectionnez une évaluation existante pour afficher les élèves concernés."}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <h3
                style={{
                  margin: 0,
                  color: "#0f172a",
                }}
              >
                {selectedAssessment.title}
              </h3>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                }}
              >
                {selectedClassName} ·{" "}
                {selectedSubjectName} ·{" "}
                {trimesterLabel} · note sur{" "}
                {selectedAssessment.max_score}
              </p>
            </div>

            {classStudents.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  background: "#f8fafc",
                  borderRadius: 10,
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                Aucun élève actif dans cette classe.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 620,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f8fafc",
                      }}
                    >
                      <th
                        style={{
                          textAlign: "left",
                          padding: 12,
                          color: "#334155",
                        }}
                      >
                        Élève
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: 12,
                          color: "#334155",
                        }}
                      >
                        Note
                      </th>

                      <th
                        style={{
                          padding: 12,
                          color: "#334155",
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {classStudents.map((student) => {
                      const grade =
                        grades[student.id];

                      const studentName =
                        student.full_name ||
                        `${student.first_name || ""} ${
                          student.last_name || ""
                        }`.trim() ||
                        "Élève";

                      return (
                        <tr
                          key={student.id}
                          style={{
                            borderTop:
                              "1px solid #e2e8f0",
                          }}
                        >
                          <td
                            style={{
                              padding: 12,
                              color: "#0f172a",
                              fontWeight: 700,
                            }}
                          >
                            {studentName}

                            <div
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                fontWeight: 400,
                                marginTop: 3,
                              }}
                            >
                              {student.student_code || ""}
                            </div>
                          </td>

                          <td style={{ padding: 12 }}>
                            <input
                              type="number"
                              min="0"
                              max={
                                selectedAssessment.max_score
                              }
                              step="0.01"
                              value={
                                grade?.score ?? ""
                              }
                              disabled={saving}
                              onChange={(event) => {
                                const value =
                                  event.target.value;

                                setGrades(
                                  (current) => ({
                                    ...current,
                                    [student.id]: {
                                      ...(current[
                                        student.id
                                      ] || {}),
                                      score: value,
                                    },
                                  })
                                );
                              }}
                              onBlur={(event) =>
                                saveGrade(
                                  student.id,
                                  event.target.value
                                )
                              }
                              style={{
                                width: 90,
                                padding: 9,
                                border:
                                  "1px solid #cbd5e1",
                                borderRadius: 8,
                                color: "#0f172a",
                                background: "#fff",
                              }}
                            />

                            <span
                              style={{
                                marginLeft: 6,
                                color: "#64748b",
                              }}
                            >
                              /{" "}
                              {
                                selectedAssessment.max_score
                              }
                            </span>
                          </td>

                          <td
                            style={{
                              padding: 12,
                              textAlign: "center",
                            }}
                          >
                            {grade?.id ? (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteGrade(
                                    student.id
                                  )
                                }
                                disabled={saving}
                                style={{
                                  padding:
                                    "8px 10px",
                                  border: "none",
                                  borderRadius: 8,
                                  background:
                                    "#fee2e2",
                                  color: "#991b1b",
                                  cursor:
                                    "pointer",
                                }}
                              >
                                🗑️ Supprimer
                              </button>
                            ) : (
                              <span
                                style={{
                                  color: "#94a3b8",
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background: "#f8fafc",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              💡 Les notes enregistrées sont immédiatement
              disponibles pour l'Admin École de la même école.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
