import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const TRIMESTERS = [
  { value: "trimestre_1", label: "Trimestre 1" },
  { value: "trimestre_2", label: "Trimestre 2" },
  { value: "trimestre_3", label: "Trimestre 3" },
];

const SLOTS = [
  { value: "devoir_1", label: "Devoir 1", type: "devoir" },
  { value: "devoir_2", label: "Devoir 2", type: "devoir" },
  { value: "composition", label: "Composition", type: "composition" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function TeacherAssessmentsPage({
  schoolId,
  teacherId,
  classes = [],
  subjects = [],
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTrimester, setSelectedTrimester] =
    useState("trimestre_1");

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!selectedClass && classes.length) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (!selectedSubject && subjects.length) {
      setSelectedSubject(String(subjects[0].id));
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    loadAssessments();
  }, [
    selectedClass,
    selectedSubject,
    selectedTrimester,
    schoolId,
    teacherId,
  ]);

  async function loadAssessments() {
    if (
      !schoolId ||
      !teacherId ||
      !selectedClass ||
      !selectedSubject
    ) {
      setAssessments([]);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("assessments")
      .select(
        "id, school_id, teacher_id, class_id, subject_id, title, assessment_type, assessment_slot, trimester, max_score, evaluation_date, coefficient, published"
      )
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .eq("class_id", selectedClass)
      .eq("subject_id", Number(selectedSubject))
      .eq("trimester", selectedTrimester)
      .order("evaluation_date", { ascending: true });

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "Impossible de charger les évaluations.",
      });
      return;
    }

    setAssessments(data || []);
  }

  const slotAssessments = useMemo(() => {
    const result = {};

    SLOTS.forEach((slot) => {
      result[slot.value] = assessments.find(
        (assessment) =>
          assessment.assessment_slot === slot.value
      );
    });

    return result;
  }, [assessments]);

  const className =
    classes.find((item) => item.id === selectedClass)?.name ||
    "Classe";

  const subjectName =
    subjects.find(
      (item) => String(item.id) === String(selectedSubject)
    )?.name || "Matière";

  async function createAssessment(slot) {
    if (!selectedClass || !selectedSubject) {
      setMessage({
        type: "error",
        text: "Sélectionnez une classe et une matière.",
      });
      return;
    }

    if (slotAssessments[slot.value]) {
      setMessage({
        type: "error",
        text: `${slot.label} existe déjà pour ce trimestre.`,
      });
      return;
    }

    const title = window.prompt(
      `Nom de ${slot.label.toLowerCase()} :`,
      slot.label
    );

    if (!title?.trim()) return;

    const maxScore = Number(
      window.prompt("Note maximale :", "20")
    );

    if (!maxScore || maxScore <= 0) {
      setMessage({
        type: "error",
        text: "La note maximale doit être supérieure à 0.",
      });
      return;
    }

    const coefficient = Number(
      window.prompt(
        `Coefficient de ${slot.label.toLowerCase()} :`,
        "1"
      )
    );

    if (!coefficient || coefficient <= 0) {
      setMessage({
        type: "error",
        text: "Le coefficient doit être supérieur à 0.",
      });
      return;
    }

    const evaluationDate =
      window.prompt(
        "Date de l'évaluation (AAAA-MM-JJ) :",
        today()
      ) || today();

    setSaving(true);

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        school_id: schoolId,
        teacher_id: teacherId,
        class_id: selectedClass,
        subject_id: Number(selectedSubject),

        title: title.trim(),

        assessment_type: slot.type,
        assessment_slot: slot.value,

        trimester: selectedTrimester,

        max_score: maxScore,
        coefficient,
        evaluation_date: evaluationDate,

        published: false,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error.message ||
          "Impossible de créer l'évaluation.",
      });

      return;
    }

    setAssessments((current) => [
      ...current,
      data,
    ]);

    setMessage({
      type: "success",
      text: `${slot.label} créée en brouillon.`,
    });
  }

  async function submitAssessment(assessment) {
    if (!assessment) return;

    if (
      !window.confirm(
        `Soumettre ${assessment.title} à l'Admin École ?`
      )
    ) {
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("assessments")
      .update({
        published: true,
      })
      .eq("id", assessment.id)
      .eq("teacher_id", teacherId)
      .eq("school_id", schoolId)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          "Impossible de soumettre l'évaluation.",
      });

      return;
    }

    setAssessments((current) =>
      current.map((item) =>
        item.id === data.id ? data : item
      )
    );

    setMessage({
      type: "success",
      text:
        "Évaluation soumise à l'Admin École.",
    });
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            margin: 0,
            color: "#0f172a",
          }}
        >
          📊 Évaluations
        </h2>

        <p style={{ color: "#64748b" }}>
          {className} · {subjectName}
        </p>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 18,
            padding: 12,
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <label>
          <strong>Classe</strong>

          <select
            value={selectedClass}
            onChange={(e) =>
              setSelectedClass(e.target.value)
            }
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            {classes.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <strong>Matière</strong>

          <select
            value={selectedSubject}
            onChange={(e) =>
              setSelectedSubject(e.target.value)
            }
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            {subjects.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <strong>Trimestre</strong>

          <select
            value={selectedTrimester}
            onChange={(e) =>
              setSelectedTrimester(e.target.value)
            }
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            {TRIMESTERS.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p>Chargement des évaluations...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {SLOTS.map((slot) => {
            const assessment =
              slotAssessments[slot.value];

            return (
              <div
                key={slot.value}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: "#0f172a",
                  }}
                >
                  {slot.label}
                </h3>

                {!assessment ? (
                  <button
                    type="button"
                    onClick={() =>
                      createAssessment(slot)
                    }
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: 11,
                      border: "none",
                      borderRadius: 9,
                      background: "#0f172a",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    + Créer {slot.label}
                  </button>
                ) : (
                  <>
                    <strong>
                      {assessment.title}
                    </strong>

                    <p
                      style={{
                        color: "#64748b",
                        fontSize: 14,
                      }}
                    >
                      / {assessment.max_score}
                      {" · "}
                      Coef. {assessment.coefficient}
                      {" · "}
                      {assessment.evaluation_date}
                    </p>

                    <p
                      style={{
                        fontWeight: 700,
                        color:
                          assessment.published
                            ? "#166534"
                            : "#92400e",
                      }}
                    >
                      {assessment.published
                        ? "Soumise"
                        : "Brouillon"}
                    </p>

                    {!assessment.published && (
                      <button
                        type="button"
                        onClick={() =>
                          submitAssessment(
                            assessment
                          )
                        }
                        disabled={saving}
                        style={{
                          width: "100%",
                          padding: 11,
                          border: "none",
                          borderRadius: 9,
                          background: "#0f172a",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        Soumettre à l'Admin École
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
