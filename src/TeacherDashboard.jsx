import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import TeacherGradesPage from "./TeacherGradesPage";

/* =========================================================
   ÉCOLE CONNECTÉE V4
   ESPACE ENSEIGNANT
   ========================================================= */

const MENU = [
  { id: "overview", icon: "🏠", label: "Vue d'ensemble" },
  { id: "classes", icon: "🏫", label: "Mes classes" },
  { id: "students", icon: "👨‍🎓", label: "Mes élèves" },
  { id: "attendance", icon: "📋", label: "Faire l'appel" },
  { id: "behavior", icon: "⭐", label: "Comportement" },
  { id: "courses", icon: "📚", label: "Cours" },
  { id: "documents", icon: "📁", label: "Documents & médias" },
  { id: "grades", icon: "📝", label: "Notes" },
  { id: "assessments", icon: "📊", label: "Évaluations" },
  { id: "exercises", icon: "✏️", label: "Exercices" },
  { id: "communication", icon: "💬", label: "Communication" },
  { id: "profile", icon: "👤", label: "Mon profil" },
];

const CONTENT_TYPES = [
  { value: "course", label: "📚 Cours" },
  { value: "document", label: "📄 Document" },
  { value: "video", label: "🎥 Vidéo" },
  { value: "link", label: "🔗 Lien" },
];

const ATTENDANCE_STATUS = [
  { value: "present", label: "Présent", icon: "✅" },
  { value: "absent", label: "Absent", icon: "❌" },
  { value: "late", label: "En retard", icon: "⏰" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* =========================================================
   PETITS COMPOSANTS
   ========================================================= */

function PageHeader({ icon, title, description, children }) {
  return (
    <div
      className="ec-page-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 24,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          {icon} {title}
        </h1>

        {description && (
          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 15,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}

function StatCard({ icon, title, value, subtitle }) {
  return (
    <div
      className="ec-card"
      style={{
        padding: 20,
        minHeight: 130,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 30,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            {value}
          </div>

          {subtitle && (
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 30,
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder = "Choisir",
  disabled = false,
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        minWidth: 180,
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#334155",
          }}
        >
          {label}
        </span>
      )}

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        style={{
          height: 44,
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          padding: "0 12px",
          background: disabled ? "#f8fafc" : "#fff",
          color: "#0f172a",
          fontSize: 14,
          outline: "none",
        }}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#334155",
          }}
        >
          {label}
        </span>
      )}

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          height: 44,
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          padding: "0 12px",
          background: "#fff",
          color: "#0f172a",
          fontSize: 14,
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#334155",
          }}
        >
          {label}
        </span>
      )}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          padding: 12,
          background: "#fff",
          color: "#0f172a",
          fontSize: 14,
          resize: "vertical",
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

function MessageBox({ message }) {
  if (!message?.text) return null;

  return (
    <div
      style={{
        marginBottom: 18,
        padding: "12px 14px",
        borderRadius: 10,
        background:
          message.type === "error" ? "#fef2f2" : "#f0fdf4",
        border:
          message.type === "error"
            ? "1px solid #fecaca"
            : "1px solid #bbf7d0",
        color:
          message.type === "error" ? "#991b1b" : "#166534",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {message.text}
    </div>
  );
}

function StarRating({ value, onChange, size = 30 }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          style={{
            border: "none",
            background: "transparent",
            padding: 2,
            cursor: "pointer",
            fontSize: size,
            lineHeight: 1,
            opacity: star <= Number(value || 0) ? 1 : 0.25,
            filter:
              star <= Number(value || 0)
                ? "none"
                : "grayscale(1)",
          }}
        >
          ⭐
        </button>
      ))}
    </div>
  );
}

/* =========================================================
   PAGE VUE D'ENSEMBLE
   ========================================================= */

function OverviewPage({
  teacher,
  school,
  classes,
  students,
  subjects,
  contents,
}) {
  return (
    <>
      <PageHeader
        icon="📚"
        title="Mon espace enseignant"
        description={`Bienvenue ${teacher?.display_name || "dans votre espace enseignant"}.`}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          icon="🏫"
          title="Mes classes"
          value={classes.length}
          subtitle="Classes affectées"
        />

        <StatCard
          icon="👨‍🎓"
          title="Mes élèves"
          value={students.length}
          subtitle="Élèves accessibles"
        />

        <StatCard
          icon="📚"
          title="Matières"
          value={subjects.length}
          subtitle="Matières enseignées"
        />

        <StatCard
          icon="📁"
          title="Contenus"
          value={contents.length}
          subtitle="Cours, documents et médias"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 2fr) minmax(280px, 1fr)",
          gap: 18,
        }}
      >
        <div className="ec-card" style={{ padding: 22 }}>
          <h2
            style={{
              marginTop: 0,
              color: "#0f172a",
              fontSize: 20,
            }}
          >
            🏫 Mes classes
          </h2>

          {classes.length === 0 ? (
            <EmptyState text="Aucune classe ne vous est encore affectée." />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {classes.map((item) => {
                const count = students.filter(
                  (student) => student.class_id === item.id
                ).length;

                return (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: 18,
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      📁 {item.name}
                    </div>

                    {item.level && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        {item.level}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 12,
                        fontWeight: 700,
                        color: "#334155",
                      }}
                    >
                      👨‍🎓 {count} élève{count !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ec-card" style={{ padding: 22 }}>
          <h2
            style={{
              marginTop: 0,
              color: "#0f172a",
              fontSize: 20,
            }}
          >
            🏫 Mon établissement
          </h2>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "#f8fafc",
            }}
          >
            <strong
              style={{
                display: "block",
                color: "#0f172a",
                fontSize: 17,
              }}
            >
              {school?.name || "École Connectée"}
            </strong>

            {school?.city && (
              <div
                style={{
                  marginTop: 6,
                  color: "#64748b",
                }}
              >
                📍 {school.city}
              </div>
            )}

            {school?.phone && (
              <div
                style={{
                  marginTop: 5,
                  color: "#64748b",
                }}
              >
                📞 {school.phone}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   PAGE CLASSES
   ========================================================= */

function ClassesPage({
  classes,
  students,
  subjects,
  selectedClassId,
  setSelectedClassId,
}) {
  const selectedClass = classes.find(
    (item) => item.id === selectedClassId
  );

  const classStudents = students.filter(
    (student) => student.class_id === selectedClassId
  );

  return (
    <>
      <PageHeader
        icon="🏫"
        title="Mes classes"
        description="Vous ne voyez ici que les classes qui vous sont affectées."
      />

      {!selectedClassId ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
          }}
        >
          {classes.map((item) => {
            const count = students.filter(
              (student) => student.class_id === item.id
            ).length;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedClassId(item.id)}
                style={{
                  textAlign: "left",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 20,
                  background: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(15,23,42,.05)",
                }}
              >
                <div
                  style={{
                    fontSize: 38,
                    marginBottom: 12,
                  }}
                >
                  📁
                </div>

                <div
                  style={{
                    fontWeight: 800,
                    color: "#0f172a",
                    fontSize: 18,
                  }}
                >
                  {item.name}
                </div>

                {item.level && (
                  <div
                    style={{
                      marginTop: 5,
                      color: "#64748b",
                    }}
                  >
                    {item.level}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 14,
                    color: "#334155",
                    fontWeight: 700,
                  }}
                >
                  👨‍🎓 {count} élève{count !== 1 ? "s" : ""}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setSelectedClassId("")}
            style={{
              border: "none",
              background: "#f1f5f9",
              borderRadius: 9,
              padding: "9px 13px",
              cursor: "pointer",
              color: "#334155",
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            ← Retour à mes classes
          </button>

          <div className="ec-card" style={{ padding: 22 }}>
            <h2
              style={{
                marginTop: 0,
                color: "#0f172a",
              }}
            >
              📁 {selectedClass?.name}
            </h2>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              <span className="ec-badge">
                👨‍🎓 {classStudents.length} élèves
              </span>

              <span className="ec-badge">
                📚 {subjects.length} matière
                {subjects.length !== 1 ? "s" : ""}
              </span>
            </div>

            <StudentTable
              students={classStudents}
              classes={classes}
              showClass={false}
            />
          </div>
        </>
      )}
    </>
  );
}

/* =========================================================
   TABLE ÉLÈVES
   ========================================================= */

function StudentTable({
  students,
  classes,
  showClass = true,
}) {
  if (!students.length) {
    return (
      <EmptyState text="Aucun élève dans cette classe." />
    );
  }

  return (
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
            <th style={thStyle}>Élève</th>
            <th style={thStyle}>Identifiant</th>

            {showClass && (
              <th style={thStyle}>Classe</th>
            )}

            <th style={thStyle}>Statut</th>
          </tr>
        </thead>

        <tbody>
          {students.map((student) => {
            const className =
              classes.find(
                (item) => item.id === student.class_id
              )?.name || "—";

            return (
              <tr key={student.id}>
                <td style={tdStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt=""
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: "#e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        👨‍🎓
                      </div>
                    )}

                    <strong>
                      {student.first_name}{" "}
                      {student.last_name}
                    </strong>
                  </div>
                </td>

                <td style={tdStyle}>
                  {student.student_code || "—"}
                </td>

                {showClass && (
                  <td style={tdStyle}>{className}</td>
                )}

                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: student.active
                        ? "#dcfce7"
                        : "#fee2e2",
                      color: student.active
                        ? "#166534"
                        : "#991b1b",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {student.active
                      ? "Actif"
                      : "Inactif"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: 13,
};

const tdStyle = {
  padding: "13px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 14,
};

/* =========================================================
   PAGE ÉLÈVES
   ========================================================= */

function StudentsPage({
  students,
  classes,
  search,
  setSearch,
  selectedClassId,
  setSelectedClassId,
}) {
  const filteredStudents = useMemo(() => {
    const query = normalizeName(search);

    return students.filter((student) => {
      const matchesClass =
        !selectedClassId ||
        student.class_id === selectedClassId;

      if (!matchesClass) return false;

      if (!query) return true;

      return normalizeName(
        `${student.first_name} ${student.last_name} ${student.student_code || ""}`
      ).includes(query);
    });
  }, [
    students,
    search,
    selectedClassId,
  ]);

  return (
    <>
      <PageHeader
        icon="👨‍🎓"
        title="Mes élèves"
        description="Les élèves affichés sont uniquement ceux de vos classes affectées."
      />

      <div
        className="ec-card"
        style={{
          padding: 18,
          marginBottom: 18,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <div style={{ flex: "1 1 260px" }}>
          <TextInput
            label="Rechercher"
            value={search}
            onChange={setSearch}
            placeholder="Nom, prénom ou identifiant..."
          />
        </div>

        <SelectInput
          label="Classe"
          value={selectedClassId}
          onChange={setSelectedClassId}
          options={classes.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          placeholder="Toutes mes classes"
        />
      </div>

      <div className="ec-card" style={{ padding: 20 }}>
        <StudentTable
          students={filteredStudents}
          classes={classes}
          showClass={true}
        />
      </div>
    </>
  );
}

/* =========================================================
   PAGE APPEL
   ========================================================= */
function GradesPage({
  schoolId,
  teacherId,
  classes,
  students,
  subjects,
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTrimester, setSelectedTrimester] = useState("trimestre_1");
  const [assessmentId, setAssessmentId] = useState("");
  const [assessments, setAssessments] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const classStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.class_id === selectedClass &&
          student.active !== false
      ),
    [students, selectedClass]
  );

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

  useEffect(() => {
    if (assessmentId) {
      loadGrades(assessmentId);
    } else {
      setGrades({});
    }
  }, [assessmentId]);

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
    "id, school_id, teacher_id, class_id, subject_id, title, description, assessment_type, trimester, max_score, evaluation_date, coefficient, published, created_at, updated_at"
  )
  .eq("school_id", schoolId)
  .eq("teacher_id", teacherId)
  .eq("class_id", selectedClass)
  .eq("trimester", selectedTrimester)
  .order("evaluation_date", { ascending: false });

    if (selectedSubject) {
      query = query.eq("subject_id", Number(selectedSubject));
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      console.error("Erreur chargement évaluations :", error);
      setMessage({
        type: "error",
        text: "Impossible de charger les évaluations.",
      });
      return;
    }

    setAssessments(data || []);

    if (data?.length && !assessmentId) {
      setAssessmentId(data[0].id);
    }

    if (!data?.length) {
      setAssessmentId("");
      setGrades({});
    }
  }

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
      console.error("Erreur chargement notes :", error);
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

  const selectedAssessment = assessments.find(
    (item) => item.id === assessmentId
  );

  async function saveGrade(studentId, value) {
  if (!selectedAssessment || !schoolId || !teacherId) return;

  if (value === "") {
    return;
  }

  const numericScore = Number(value);

  if (
    Number.isNaN(numericScore) ||
    numericScore < 0 ||
    numericScore > Number(selectedAssessment.max_score)
  ) {
    setMessage({
      type: "error",
      text: `La note doit être comprise entre 0 et ${selectedAssessment.max_score}.`,
    });
    return;
  }

  setSaving(true);
  setMessage(null);

  const existing = grades[studentId];

  const payload = {
    assessment_id: selectedAssessment.id,
    student_id: studentId,
    teacher_id: teacherId,
    school_id: schoolId,
    score: numericScore,
    appreciation: existing?.appreciation || null,
    stars: existing?.stars || null,
    comment: existing?.comment || null,
  };

  let data = null;
  let error = null;

  /*
   * Nouvelle note
   */
  if (!existing?.id) {
    const result = await supabase
      .from("grades")
      .insert(payload)
      .select()
      .single();

    data = result.data;
    error = result.error;
  }

  /*
   * Note déjà existante : modification
   */
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
    console.error("Erreur enregistrement note :", error);

    setMessage({
      type: "error",
      text: error.message || "Impossible d'enregistrer la note.",
    });

    return;
  }

  if (!data) {
    setMessage({
      type: "error",
      text: "La note n'a pas pu être enregistrée dans la base de données.",
    });

    return;
  }

  setGrades((current) => ({
    ...current,
    [studentId]: data,
  }));

  setMessage({
    type: "success",
    text: "Note enregistrée et synchronisée avec l'Admin École.",
  });
}

  async function deleteGrade(studentId) {
    const existing = grades[studentId];

    if (!existing?.id) return;

    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette note ?"
    );

    if (!confirmed) return;

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
      console.error("Erreur suppression note :", error);
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
      text: "Note supprimée.",
    });
  }

  async function createAssessment() {
    if (
      !schoolId ||
      !teacherId ||
      !selectedClass ||
      !selectedSubject
    ) {
      setMessage({
        type: "error",
        text: "Sélectionnez une classe et une matière.",
      });
      return;
    }

    const title = window.prompt(
      "Nom de l'évaluation :",
      "Évaluation"
    );

    if (!title?.trim()) return;

    const type = window.prompt(
      "Type d'évaluation :",
      "Devoir"
    );

    if (!type?.trim()) return;

    const maxScoreInput = window.prompt(
      "Note maximale :",
      "20"
    );

    const maxScore = Number(maxScoreInput);

    if (!maxScore || maxScore <= 0) {
      setMessage({
        type: "error",
        text: "La note maximale doit être supérieure à 0.",
      });
      return;
    }

    const coefficientInput = window.prompt(
      "Coefficient :",
      "1"
    );

    const coefficient = Number(coefficientInput) || 1;

    const evaluationDate =
      window.prompt(
        "Date de l'évaluation (AAAA-MM-JJ) :",
        new Date().toISOString().slice(0, 10)
      ) || new Date().toISOString().slice(0, 10);

    setSaving(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        school_id: schoolId,
        teacher_id: teacherId,
        class_id: selectedClass,
        subject_id: Number(selectedSubject),
        title: title.trim(),
        description: null,
        assessment_type: String(type || "evaluation")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, ""),
        max_score: maxScore,
        evaluation_date: evaluationDate,
        coefficient,
        trimester: selectedTrimester,
        published: false,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error("Erreur création évaluation :", error);
      setMessage({
        type: "error",
        text: error.message || "Impossible de créer l'évaluation.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Évaluation créée en brouillon.",
    });

    await loadAssessments();

    if (data?.id) {
      setAssessmentId(data.id);
    }
  }

  async function submitAssessment() {
    if (!selectedAssessment) return;

    const confirmed = window.confirm(
      "Soumettre cette évaluation et ses notes à l'Admin École ?"
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("assessments")
      .update({
        published: true,
      })
      .eq("id", selectedAssessment.id)
      .eq("teacher_id", teacherId)
      .eq("school_id", schoolId)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error("Erreur soumission :", error);
      setMessage({
        type: "error",
        text: "Impossible de soumettre l'évaluation.",
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
      text: "Évaluation soumise à l'Admin École.",
    });
  }

  const selectedClassName =
    classes.find((item) => item.id === selectedClass)?.name ||
    "Classe";

  const selectedSubjectName =
    subjects.find(
      (item) => String(item.id) === String(selectedSubject)
    )?.name || "Matière";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
            }}
          >
            📝 Notes
          </h2>

          <p
            style={{
              marginTop: 6,
              color: "#64748b",
            }}
          >
            Saisie, modification et synchronisation des notes.
          </p>
        </div>

        <button
          type="button"
          onClick={createAssessment}
          disabled={saving || !selectedClass || !selectedSubject}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: 10,
            background: "#0f172a",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          + Nouvelle évaluation
        </button>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 700,
              color: "#334155",
            }}
          >
            Classe
          </label>

          <select
            value={selectedClass}
            onChange={(event) => {
              setSelectedClass(event.target.value);
              setAssessmentId("");
            }}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              background: "#fff",
            }}
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 700,
              color: "#334155",
            }}
          >
            Matière
          </label>

          <select
            value={selectedSubject}
            onChange={(event) => {
              setSelectedSubject(event.target.value);
              setAssessmentId("");
            }}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              background: "#fff",
            }}
          >
            {subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>
<div>
  <label
    style={{
      display: "block",
      marginBottom: 6,
      fontWeight: 700,
      color: "#334155",
    }}
  >
    Trimestre
  </label>

  <select
    value={selectedTrimester}
    onChange={(event) => {
      setSelectedTrimester(event.target.value);
      setAssessmentId("");
    }}
    style={{
      width: "100%",
      padding: 10,
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      color: "#0f172a",
      background: "#fff",
    }}
  >
    <option value="trimestre_1">Trimestre 1</option>
    <option value="trimestre_2">Trimestre 2</option>
    <option value="trimestre_3">Trimestre 3</option>
  </select>
</div>
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                color: "#0f172a",
              }}
            >
              Évaluations
            </h3>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
              }}
            >
              {selectedClassName} · {selectedSubjectName}
            </p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>
            Chargement des évaluations...
          </p>
        ) : assessments.length === 0 ? (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: "#64748b",
              background: "#f8fafc",
              borderRadius: 10,
            }}
          >
            Aucune évaluation pour cette classe et cette matière.
            <br />
            Cliquez sur « Nouvelle évaluation » pour commencer.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {assessments.map((assessment) => (
              <button
                key={assessment.id}
                type="button"
                onClick={() => setAssessmentId(assessment.id)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 10,
                  border:
                    assessment.id === assessmentId
                      ? "2px solid #0f172a"
                      : "1px solid #e2e8f0",
                  background:
                    assessment.id === assessmentId
                      ? "#f8fafc"
                      : "#fff",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ color: "#0f172a" }}>
                    {assessment.title}
                  </strong>

                  <span
                    style={{
                      color: assessment.published
                        ? "#166534"
                        : "#92400e",
                      fontWeight: 700,
                    }}
                  >
                    {assessment.published
                      ? "Soumise"
                      : "Brouillon"}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: "#64748b",
                    fontSize: 14,
                  }}
                >
                  {assessment.assessment_type} ·{" "}
{assessment.trimester === "trimestre_1"
  ? "Trimestre 1"
  : assessment.trimester === "trimestre_2"
  ? "Trimestre 2"
  : "Trimestre 3"}{" "}
· / {assessment.max_score} · Coef.{" "}
{assessment.coefficient} ·{" "}
{assessment.evaluation_date}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedAssessment && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
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
                {selectedClassName} · {selectedSubjectName} ·{" "}
{selectedAssessment.trimester === "trimestre_1"
  ? "Trimestre 1"
  : selectedAssessment.trimester === "trimestre_2"
  ? "Trimestre 2"
  : "Trimestre 3"}{" "}
· note sur {selectedAssessment.max_score}
              </p>
            </div>

            {!selectedAssessment.published && (
              <button
                type="button"
                onClick={submitAssessment}
                disabled={saving}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  borderRadius: 9,
                  background: "#166534",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                📤 Soumettre à l'Admin
              </button>
            )}
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
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 850,
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
                        textAlign: "left",
                        padding: 12,
                        color: "#334155",
                      }}
                    >
                      Appréciation
                    </th>

                    <th
                      style={{
                        textAlign: "left",
                        padding: 12,
                        color: "#334155",
                      }}
                    >
                      Commentaire
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
                    const grade = grades[student.id];

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
                          {student.first_name}{" "}
                          {student.last_name}

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
                            max={selectedAssessment.max_score}
                            step="0.01"
                            value={
                              grade?.score ?? ""
                            }
                            onChange={(event) => {
                              const value =
                                event.target.value;

                              setGrades((current) => ({
                                ...current,
                                [student.id]: {
                                  ...(current[student.id] || {}),
                                  score: value,
                                },
                              }));
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
                            / {selectedAssessment.max_score}
                          </span>
                        </td>

                        <td style={{ padding: 12 }}>
                          <input
                            type="text"
                            value={
                              grade?.appreciation || ""
                            }
                            onChange={(event) =>
                              setGrades((current) => ({
                                ...current,
                                [student.id]: {
                                  ...(current[student.id] || {}),
                                  appreciation:
                                    event.target.value,
                                },
                              }))
                            }
                            onBlur={(event) =>
                              updateGrade(
                                student.id,
                                "appreciation",
                                event.target.value
                              )
                            }
                            placeholder="Ex : Très bien"
                            style={{
                              width: 170,
                              padding: 9,
                              border:
                                "1px solid #cbd5e1",
                              borderRadius: 8,
                              color: "#0f172a",
                              background: "#fff",
                            }}
                          />
                        </td>

                        <td style={{ padding: 12 }}>
                          <input
                            type="text"
                            value={
                              grade?.comment || ""
                            }
                            onChange={(event) =>
                              setGrades((current) => ({
                                ...current,
                                [student.id]: {
                                  ...(current[student.id] || {}),
                                  comment:
                                    event.target.value,
                                },
                              }))
                            }
                            onBlur={(event) =>
                              updateGrade(
                                student.id,
                                "comment",
                                event.target.value
                              )
                            }
                            placeholder="Commentaire"
                            style={{
                              width: 220,
                              padding: 9,
                              border:
                                "1px solid #cbd5e1",
                              borderRadius: 8,
                              color: "#0f172a",
                              background: "#fff",
                            }}
                          />
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
                                deleteGrade(student.id)
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
                                cursor: "pointer",
                              }}
                            >
                              🗑️
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
        </div>
      )}
    </div>
  );
}
function AttendancePage({
  schoolId,
  teacherId,
  classes,
  students,
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(today());
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState(null);

  const classStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.class_id === selectedClass &&
          student.active !== false
      ),
    [students, selectedClass]
  );

  useEffect(() => {
    if (!selectedClass && classes.length) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (!selectedClass || !selectedDate) {
      setAttendance({});
      return;
    }

    loadAttendance();
  }, [selectedClass, selectedDate]);

  async function loadAttendance() {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("attendance")
      .select(
        "id, student_id, class_id, attendance_date, status, justification, justified"
      )
      .eq("class_id", selectedClass)
      .eq("attendance_date", selectedDate);

    if (error) {
      console.error("Erreur chargement présence :", error);

      setMessage({
        type: "error",
        text:
          "Impossible de charger les présences : " +
          error.message,
      });

      setLoading(false);
      return;
    }

    const mapped = {};

    (data || []).forEach((item) => {
      mapped[item.student_id] = item;
    });

    setAttendance(mapped);
    setLoading(false);
  }

  async function saveAttendance(student, status) {
    if (!teacherId || !schoolId) return;

    setSavingId(student.id);
    setMessage(null);

    const current = attendance[student.id];

    const payload = {
      student_id: student.id,
      class_id: selectedClass,
      attendance_date: selectedDate,
      status,
      justification: current?.justification || null,
      justified: current?.justified || false,
    };

    const { data, error } = await supabase
      .from("attendance")
      .upsert(payload, {
        onConflict: "student_id,attendance_date",
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Erreur sauvegarde présence :",
        error
      );

      setMessage({
        type: "error",
        text:
          "Impossible d'enregistrer la présence : " +
          error.message,
      });

      setSavingId(null);
      return;
    }
async function deleteAttendance(student) {
  const current = attendance[student.id];

  if (!current?.id) {
    setMessage({
      type: "error",
      text: "Aucune présence enregistrée à supprimer.",
    });
    return;
  }

  const confirmed = window.confirm(
    `Supprimer la présence de ${student.first_name} ${student.last_name} pour le ${formatDate(selectedDate)} ?`
  );

  if (!confirmed) return;

  setSavingId(student.id);
  setMessage(null);

  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("id", current.id);

  if (error) {
    console.error("Erreur suppression présence :", error);

    setMessage({
      type: "error",
      text:
        "Impossible de supprimer la présence : " +
        error.message,
    });

    setSavingId(null);
    return;
  }

  setAttendance((previous) => {
    const next = { ...previous };
    delete next[student.id];
    return next;
  });

  setMessage({
    type: "success",
    text: `Présence de ${student.first_name} ${student.last_name} supprimée.`,
  });

  setSavingId(null);
}
    setAttendance((previous) => ({
      ...previous,
      [student.id]: data,
    }));

    setMessage({
      type: "success",
      text: "Présence enregistrée.",
    });

    setSavingId(null);
  }

  const selectedClassName =
    classes.find((item) => item.id === selectedClass)
      ?.name || "";

  return (
    <>
      <PageHeader
        icon="📋"
        title="Faire l'appel"
        description="Enregistrez les présences de vos élèves."
      />

      <MessageBox message={message} />

      <div
        className="ec-card"
        style={{
          padding: 18,
          marginBottom: 18,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <SelectInput
          label="Classe"
          value={selectedClass}
          onChange={setSelectedClass}
          options={classes.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          placeholder="Choisir une classe"
        />

        <TextInput
          label="Date"
          type="date"
          value={selectedDate}
          onChange={setSelectedDate}
        />
      </div>

      <div className="ec-card" style={{ padding: 20 }}>
        <h2
          style={{
            marginTop: 0,
            color: "#0f172a",
          }}
        >
          📋 Appel — {selectedClassName}
        </h2>

        {loading ? (
          <LoadingSmall text="Chargement des présences..." />
        ) : classStudents.length === 0 ? (
          <EmptyState
            text={
              selectedClass
                ? "Aucun élève actif dans cette classe."
                : "Choisissez une classe."
            }
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 760,
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={thStyle}>Élève</th>
                  <th style={thStyle}>Présence</th>
                  <th style={thStyle}>État</th>
                </tr>
              </thead>

              <tbody>
                {classStudents.map((student) => {
                  const current =
                    attendance[student.id];

                  return (
                    <tr key={student.id}>
                      <td style={tdStyle}>
                        <strong>
                          {student.first_name}{" "}
                          {student.last_name}
                        </strong>

                        {student.student_code && (
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 12,
                              color: "#64748b",
                            }}
                          >
                            {student.student_code}
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",
                            gap: 7,
                            flexWrap: "wrap",
                          }}
                        >
                          {ATTENDANCE_STATUS.map(
                            (status) => (
                              <button
                                key={status.value}
                                type="button"
                                disabled={
                                  savingId === student.id
                                }
                                onClick={() =>
                                  saveAttendance(
                                    student,
                                    status.value
                                  )
                                }
                                style={{
                                  border:
                                    current?.status ===
                                    status.value
                                      ? "2px solid #0f172a"
                                      : "1px solid #cbd5e1",
                                  background:
                                    current?.status ===
                                    status.value
                                      ? "#e2e8f0"
                                      : "#fff",
                                  borderRadius: 9,
                                  padding:
                                    "7px 10px",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  color: "#334155",
                                }}
                              >
                                {status.icon}{" "}
                                {status.label}
                              </button>
                            )
                          )}
                        </div>
                      </td>

                      <td style={tdStyle}>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    }}
  >
    {savingId === student.id ? (
      <span
        style={{
          color: "#64748b",
          fontSize: 13,
        }}
      >
        Enregistrement...
      </span>
    ) : current?.status ? (
      <>
        <span
          style={{
            fontWeight: 700,
          }}
        >
          {
            ATTENDANCE_STATUS.find(
              (item) => item.value === current.status
            )?.label
          }
        </span>

        <button
          type="button"
          onClick={() => deleteAttendance(student)}
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 8,
            padding: "7px 10px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          🗑️ Supprimer
        </button>
      </>
    ) : (
      <span
        style={{
          color: "#94a3b8",
        }}
      >
        Non renseigné
      </span>
    )}
  </div>
</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================
   PAGE COMPORTEMENT
   ========================================================= */

function BehaviorPage({
  schoolId,
  teacherId,
  classes,
  students,
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(today());
  const [behaviors, setBehaviors] = useState({});
  const [comments, setComments] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const classStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.class_id === selectedClass &&
          student.active !== false
      ),
    [students, selectedClass]
  );

  useEffect(() => {
    if (!selectedClass && classes.length) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (!selectedClass || !selectedDate) {
      setBehaviors({});
      setComments({});
      return;
    }

    loadBehaviors();
  }, [selectedClass, selectedDate]);

  async function loadBehaviors() {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("student_behavior")
      .select(
        "id, student_id, class_id, rating, comment, behavior_date"
      )
      .eq("teacher_id", teacherId)
      .eq("school_id", schoolId)
      .eq("class_id", selectedClass)
      .eq("behavior_date", selectedDate);

    if (error) {
      console.error(
        "Erreur chargement comportement :",
        error
      );

      setMessage({
        type: "error",
        text:
          "Impossible de charger les observations : " +
          error.message,
      });

      setLoading(false);
      return;
    }

    const ratingMap = {};
    const commentMap = {};

    (data || []).forEach((item) => {
      ratingMap[item.student_id] = item.rating;
      commentMap[item.student_id] =
        item.comment || "";
    });

    setBehaviors(ratingMap);
    setComments(commentMap);
    setLoading(false);
  }

  async function saveBehavior(student) {
    if (!teacherId || !schoolId || !selectedClass) {
      return;
    }

    const rating = Number(
      behaviors[student.id] || 0
    );

    if (rating < 1 || rating > 5) {
      setMessage({
        type: "error",
        text:
          "Veuillez sélectionner entre 1 et 5 étoiles pour cet élève.",
      });
      return;
    }

    setSavingId(student.id);
    setMessage(null);

    const payload = {
      school_id: schoolId,
      teacher_id: teacherId,
      student_id: student.id,
      class_id: selectedClass,
      rating,
      comment: comments[student.id] || null,
      behavior_date: selectedDate,
    };

    const { data, error } = await supabase
      .from("student_behavior")
      .upsert(payload, {
        onConflict:
          "teacher_id,student_id,behavior_date",
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Erreur sauvegarde comportement :",
        error
      );

      setMessage({
        type: "error",
        text:
          "Impossible d'enregistrer le comportement : " +
          error.message,
      });

      setSavingId(null);
      return;
    }

    setBehaviors((previous) => ({
      ...previous,
      [student.id]: data.rating,
    }));

    setComments((previous) => ({
      ...previous,
      [student.id]: data.comment || "",
    }));

    setMessage({
      type: "success",
      text: `Observation de ${student.first_name} ${student.last_name} enregistrée.`,
    });

    setSavingId(null);
  }

  const selectedClassName =
    classes.find((item) => item.id === selectedClass)
      ?.name || "";

  return (
    <>
      <PageHeader
        icon="⭐"
        title="Comportement des élèves"
        description="Évaluez le comportement de chaque élève avec 1 à 5 étoiles et ajoutez une observation."
      />

      <MessageBox message={message} />

      <div
        className="ec-card"
        style={{
          padding: 18,
          marginBottom: 18,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <SelectInput
          label="Classe"
          value={selectedClass}
          onChange={setSelectedClass}
          options={classes.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          placeholder="Choisir une classe"
        />

        <TextInput
          label="Date"
          type="date"
          value={selectedDate}
          onChange={setSelectedDate}
        />
      </div>

      <div className="ec-card" style={{ padding: 20 }}>
        <h2
          style={{
            marginTop: 0,
            color: "#0f172a",
          }}
        >
          ⭐ Évaluation comportementale —{" "}
          {selectedClassName}
        </h2>

        {loading ? (
          <LoadingSmall text="Chargement des observations..." />
        ) : classStudents.length === 0 ? (
          <EmptyState
            text={
              selectedClass
                ? "Aucun élève actif dans cette classe."
                : "Choisissez une classe."
            }
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {classStudents.map((student) => (
              <div
                key={student.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 17,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(180px, .8fr) minmax(220px, 1fr) minmax(220px, 2fr) auto",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        display: "block",
                        color: "#0f172a",
                      }}
                    >
                      {student.first_name}{" "}
                      {student.last_name}
                    </strong>

                    {student.student_code && (
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: 12,
                        }}
                      >
                        {student.student_code}
                      </span>
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        fontWeight: 700,
                        marginBottom: 5,
                      }}
                    >
                      Note comportement
                    </div>

                    <StarRating
                      value={
                        behaviors[student.id] || 0
                      }
                      onChange={(value) =>
                        setBehaviors((previous) => ({
                          ...previous,
                          [student.id]: value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={
                        comments[student.id] || ""
                      }
                      onChange={(event) =>
                        setComments((previous) => ({
                          ...previous,
                          [student.id]:
                            event.target.value,
                        }))
                      }
                      placeholder="Observation sur le comportement..."
                      style={{
                        height: 42,
                        width: "100%",
                        boxSizing: "border-box",
                        border:
                          "1px solid #cbd5e1",
                        borderRadius: 9,
                        padding: "0 11px",
                        outline: "none",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={savingId === student.id}
                    onClick={() =>
                      saveBehavior(student)
                    }
                    style={{
                      border: "none",
                      borderRadius: 9,
                      padding: "10px 14px",
                      background: "#0f172a",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      opacity:
                        savingId === student.id
                          ? 0.6
                          : 1,
                    }}
                  >
                    {savingId === student.id
                      ? "Enregistrement..."
                      : "💾 Enregistrer"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================
   PAGE COURS
   ========================================================= */

function CoursesPage({
  schoolId,
  teacherId,
  classes,
  subjects,
  contents,
  onRefresh,
}) {
  const [selectedClass, setSelectedClass] =
    useState("");
  const [selectedSubject, setSelectedSubject] =
    useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [published, setPublished] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const courses = contents.filter(
    (item) => item.content_type === "course"
  );

  async function createCourse(event) {
    event.preventDefault();

    if (!selectedClass) {
      setMessage({
        type: "error",
        text: "Veuillez choisir une classe.",
      });
      return;
    }

    if (!title.trim()) {
      setMessage({
        type: "error",
        text: "Veuillez saisir le titre du cours.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload = {
      school_id: schoolId,
      teacher_id: teacherId,
      class_id: selectedClass,
      subject_id: selectedSubject
        ? Number(selectedSubject)
        : null,
      title: title.trim(),
      description: description.trim() || null,
      content_type: "course",
      content_url: null,
      file_url: null,
      thumbnail_url: null,
      published,
    };

    const { error } = await supabase
      .from("learning_contents")
      .insert(payload);

    if (error) {
      console.error(
        "Erreur création cours :",
        error
      );

      setMessage({
        type: "error",
        text:
          "Impossible de créer le cours : " +
          error.message,
      });

      setSaving(false);
      return;
    }

    setTitle("");
    setDescription("");
    setSelectedSubject("");
    setPublished(false);

    setMessage({
      type: "success",
      text: "Cours créé avec succès.",
    });

    await onRefresh();
    setSaving(false);
  }

  return (
    <>
      <PageHeader
        icon="📚"
        title="Mes cours"
        description="Créez et publiez vos cours pour vos classes."
      />

      <MessageBox message={message} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(300px, 1fr) minmax(300px, 1fr)",
          gap: 18,
        }}
      >
        <form
          className="ec-card"
          style={{
            padding: 20,
          }}
          onSubmit={createCourse}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#0f172a",
            }}
          >
            ➕ Nouveau cours
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <SelectInput
              label="Classe"
              value={selectedClass}
              onChange={setSelectedClass}
              options={classes.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              placeholder="Choisir une classe"
            />

            <SelectInput
              label="Matière"
              value={selectedSubject}
              onChange={setSelectedSubject}
              options={subjects.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              placeholder="Choisir une matière"
            />

            <TextInput
              label="Titre"
              value={title}
              onChange={setTitle}
              placeholder="Ex : Les fractions"
              required
            />

            <TextArea
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Décrivez le contenu du cours..."
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={published}
                onChange={(event) =>
                  setPublished(event.target.checked)
                }
              />

              <span
                style={{
                  color: "#334155",
                  fontWeight: 700,
                }}
              >
                Publier immédiatement
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="ec-btn ec-btn-primary"
              style={{
                marginTop: 5,
              }}
            >
              {saving
                ? "Création..."
                : "📚 Créer le cours"}
            </button>
          </div>
        </form>

        <div
          className="ec-card"
          style={{
            padding: 20,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#0f172a",
            }}
          >
            📚 Mes cours
          </h2>

          {courses.length === 0 ? (
            <EmptyState text="Aucun cours créé pour le moment." />
          ) : (
            <ContentList
              contents={courses}
              classes={classes}
              subjects={subjects}
            />
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   PAGE DOCUMENTS / VIDÉOS / LIENS
   ========================================================= */

function DocumentsPage({
  schoolId,
  teacherId,
  classes,
  subjects,
  contents,
  onRefresh,
}) {
  const [contentType, setContentType] =
    useState("document");
  const [selectedClass, setSelectedClass] =
    useState("");
  const [selectedSubject, setSelectedSubject] =
    useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [externalUrl, setExternalUrl] =
    useState("");
  const [selectedFile, setSelectedFile] =
    useState(null);
  const [published, setPublished] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const mediaContents = contents.filter(
    (item) =>
      item.content_type === "document" ||
      item.content_type === "video" ||
      item.content_type === "link"
  );

  function resetForm() {
    setTitle("");
    setDescription("");
    setExternalUrl("");
    setSelectedFile(null);
    setPublished(false);

    const input =
      document.getElementById(
        "teacher-content-file"
      );

    if (input) {
      input.value = "";
    }
  }

  async function uploadFile(file) {
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 180);

    const path = `${schoolId}/${teacherId}/${makeId()}-${safeName}`;

    const { error } = await supabase.storage
      .from("teacher-content")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return path;
  }

  async function createContent(event) {
    event.preventDefault();

    if (!selectedClass) {
      setMessage({
        type: "error",
        text: "Veuillez choisir une classe.",
      });
      return;
    }

    if (!title.trim()) {
      setMessage({
        type: "error",
        text: "Veuillez saisir un titre.",
      });
      return;
    }

    if (
      (contentType === "document" ||
        contentType === "video") &&
      !selectedFile
    ) {
      setMessage({
        type: "error",
        text:
          contentType === "video"
            ? "Veuillez choisir une vidéo."
            : "Veuillez choisir un document.",
      });
      return;
    }

    if (
      contentType === "link" &&
      !externalUrl.trim()
    ) {
      setMessage({
        type: "error",
        text: "Veuillez saisir le lien.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    let uploadedPath = null;

    try {
      if (
        contentType === "document" ||
        contentType === "video"
      ) {
        uploadedPath = await uploadFile(
          selectedFile
        );
      }

      const payload = {
        school_id: schoolId,
        teacher_id: teacherId,
        class_id: selectedClass,
        subject_id: selectedSubject
          ? Number(selectedSubject)
          : null,
        title: title.trim(),
        description:
          description.trim() || null,
        content_type: contentType,
        content_url:
          contentType === "link"
            ? externalUrl.trim()
            : uploadedPath,
        file_url:
          uploadedPath || null,
        thumbnail_url: null,
        published,
      };

      const { error } = await supabase
        .from("learning_contents")
        .insert(payload);

      if (error) {
        if (uploadedPath) {
          await supabase.storage
            .from("teacher-content")
            .remove([uploadedPath]);
        }

        throw error;
      }

      resetForm();

      setMessage({
        type: "success",
        text:
          contentType === "document"
            ? "Document ajouté avec succès."
            : contentType === "video"
            ? "Vidéo ajoutée avec succès."
            : "Lien ajouté avec succès.",
      });

      await onRefresh();
    } catch (error) {
      console.error(
        "Erreur création contenu :",
        error
      );

      setMessage({
        type: "error",
        text:
          "Impossible d'ajouter le contenu : " +
          (error?.message || "Erreur inconnue"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        icon="📁"
        title="Documents & médias"
        description="Ajoutez des documents, vidéos et liens à vos classes."
      />

      <MessageBox message={message} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(320px, 1fr) minmax(320px, 1fr)",
          gap: 18,
        }}
      >
        <form
          className="ec-card"
          style={{ padding: 20 }}
          onSubmit={createContent}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#0f172a",
            }}
          >
            ➕ Ajouter un contenu
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <SelectInput
              label="Type de contenu"
              value={contentType}
              onChange={setContentType}
              options={CONTENT_TYPES}
              placeholder="Choisir"
            />

            <SelectInput
              label="Classe"
              value={selectedClass}
              onChange={setSelectedClass}
              options={classes.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              placeholder="Choisir une classe"
            />

            <SelectInput
              label="Matière"
              value={selectedSubject}
              onChange={setSelectedSubject}
              options={subjects.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              placeholder="Choisir une matière"
            />

            <TextInput
              label="Titre"
              value={title}
              onChange={setTitle}
              placeholder={
                contentType === "video"
                  ? "Ex : Explication des fractions"
                  : contentType === "link"
                  ? "Ex : Vidéo YouTube sur les fractions"
                  : "Ex : Cours sur les fractions"
              }
              required
            />

            <TextArea
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Description du contenu..."
              rows={3}
            />

            {contentType === "link" ? (
              <TextInput
                label="Lien externe"
                value={externalUrl}
                onChange={setExternalUrl}
                placeholder="https://..."
                type="url"
                required
              />
            ) : (
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  {contentType === "video"
                    ? "Vidéo"
                    : "Document"}
                </span>

                <input
                  id="teacher-content-file"
                  type="file"
                  accept={
                    contentType === "video"
                      ? "video/mp4,video/webm,video/quicktime"
                      : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
                  }
                  onChange={(event) =>
                    setSelectedFile(
                      event.target.files?.[0] ||
                        null
                    )
                  }
                  style={{
                    padding: 10,
                    border:
                      "1px solid #cbd5e1",
                    borderRadius: 10,
                    background: "#fff",
                  }}
                />

                {selectedFile && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    📎 {selectedFile.name}
                  </span>
                )}
              </label>
            )}

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={published}
                onChange={(event) =>
                  setPublished(event.target.checked)
                }
              />

              <span
                style={{
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Publier immédiatement
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="ec-btn ec-btn-primary"
            >
              {saving
                ? "Enregistrement..."
                : contentType === "video"
                ? "🎥 Ajouter la vidéo"
                : contentType === "link"
                ? "🔗 Ajouter le lien"
                : "📄 Ajouter le document"}
            </button>
          </div>
        </form>

        <div
          className="ec-card"
          style={{ padding: 20 }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#0f172a",
            }}
          >
            📁 Mes contenus
          </h2>

          {mediaContents.length === 0 ? (
            <EmptyState text="Aucun document, vidéo ou lien pour le moment." />
          ) : (
            <ContentList
              contents={mediaContents}
              classes={classes}
              subjects={subjects}
            />
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   LISTE DES CONTENUS
   ========================================================= */

function ContentList({
  contents,
  classes,
  subjects,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 11,
      }}
    >
      {contents.map((content) => {
        const className =
          classes.find(
            (item) => item.id === content.class_id
          )?.name || "Classe";

        const subjectName =
          subjects.find(
            (item) =>
              String(item.id) ===
              String(content.subject_id)
          )?.name || "";

        const icon =
          content.content_type === "course"
            ? "📚"
            : content.content_type === "video"
            ? "🎥"
            : content.content_type === "link"
            ? "🔗"
            : "📄";

        return (
          <div
            key={content.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 14,
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {icon} {content.title}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color: "#64748b",
                    fontSize: 12,
                  }}
                >
                  {className}
                  {subjectName
                    ? ` • ${subjectName}`
                    : ""}
                </div>
              </div>

              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: content.published
                    ? "#dcfce7"
                    : "#fef3c7",
                  color: content.published
                    ? "#166534"
                    : "#92400e",
                  fontSize: 11,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {content.published
                  ? "Publié"
                  : "Brouillon"}
              </span>
            </div>

            {content.description && (
              <p
                style={{
                  margin: "9px 0 0",
                  fontSize: 13,
                  color: "#475569",
                }}
              >
                {content.description}
              </p>
            )}

            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              Créé le {formatDate(content.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   MODULES EN ATTENTE
   ========================================================= */

function ComingSoonPage({
  icon,
  title,
  description,
}) {
  return (
    <>
      <PageHeader
        icon={icon}
        title={title}
        description={description}
      />

      <div
        className="ec-card"
        style={{
          padding: 45,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 55,
            marginBottom: 15,
          }}
        >
          {icon}
        </div>

        <h2
          style={{
            margin: "0 0 10px",
            color: "#0f172a",
          }}
        >
          Module en préparation
        </h2>

        <p
          style={{
            color: "#64748b",
            maxWidth: 600,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Ce module sera activé progressivement sans
          modifier les fonctionnalités déjà
          opérationnelles.
        </p>
      </div>
    </>
  );
}

/* =========================================================
   PROFIL
   ========================================================= */

function ProfilePage({
  profile,
  teacher,
  school,
  subjects,
  classes,
}) {
  return (
    <>
      <PageHeader
        icon="👤"
        title="Mon profil"
        description="Informations de votre compte enseignant."
      />

      <div
        className="ec-card"
        style={{
          padding: 24,
          maxWidth: 850,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            👨‍🏫
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color: "#0f172a",
              }}
            >
              {teacher?.display_name ||
                profile?.full_name ||
                "Enseignant"}
            </h2>

            <div
              style={{
                marginTop: 5,
                color: "#64748b",
              }}
            >
              👨‍🏫 Enseignant
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          <InfoBox
            label="Nom complet"
            value={
              teacher?.display_name ||
              profile?.full_name ||
              "—"
            }
          />

          <InfoBox
            label="Téléphone"
            value={profile?.phone || "—"}
          />

          <InfoBox
            label="Identifiant du compte"
            value={profile?.username || "Compte enseignant"}
          />

          <InfoBox
            label="Établissement"
            value={school?.name || "—"}
          />

          <InfoBox
            label="École ID"
            value={school?.id || profile?.school_id || "—"}
          />

          <InfoBox
            label="Rôle"
            value="teacher"
          />
        </div>

        <div
          style={{
            marginTop: 25,
          }}
        >
          <h3
            style={{
              color: "#0f172a",
            }}
          >
            📚 Matières enseignées
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {subjects.length === 0 ? (
              <span style={{ color: "#64748b" }}>
                Aucune matière affectée.
              </span>
            ) : (
              subjects.map((subject) => (
                <span
                  key={subject.id}
                  className="ec-badge"
                >
                  📚 {subject.name}
                </span>
              ))
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 25,
          }}
        >
          <h3
            style={{
              color: "#0f172a",
            }}
          >
            🏫 Classes affectées
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {classes.length === 0 ? (
              <span style={{ color: "#64748b" }}>
                Aucune classe affectée.
              </span>
            ) : (
              classes.map((item) => (
                <span
                  key={item.id}
                  className="ec-badge"
                >
                  📁 {item.name}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function InfoBox({ label, value }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 11,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "#0f172a",
          fontWeight: 700,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   ÉTATS
   ========================================================= */

function EmptyState({ text }) {
  return (
    <div
      style={{
        padding: 30,
        textAlign: "center",
        color: "#64748b",
        background: "#f8fafc",
        borderRadius: 12,
      }}
    >
      {text}
    </div>
  );
}

function LoadingSmall({ text }) {
  return (
    <div
      style={{
        padding: 25,
        textAlign: "center",
        color: "#64748b",
      }}
    >
      ⏳ {text}
    </div>
  );
}

/* =========================================================
   COMPOSANT PRINCIPAL
   ========================================================= */

export default function TeacherDashboard({
  profile,
  session,
  onLogout,
}) {
  const teacherId =
    profile?.id || session?.user?.id || "";

  const schoolId = profile?.school_id || "";

  const [activePage, setActivePage] =
    useState("overview");

  const [teacher, setTeacher] =
    useState(null);

  const [school, setSchool] =
    useState(null);

  const [classes, setClasses] =
    useState([]);

  const [subjects, setSubjects] =
    useState([]);

  const [students, setStudents] =
    useState([]);

  const [teacherSubjectIds, setTeacherSubjectIds] =
    useState([]);

  const [contents, setContents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [globalError, setGlobalError] =
    useState("");

  const [selectedClassId, setSelectedClassId] =
    useState("");

  const [studentSearch, setStudentSearch] =
    useState("");

  const [studentClassFilter, setStudentClassFilter] =
    useState("");

  /* ---------------------------------------------------------
     CHARGEMENT ESPACE PROFESSEUR
     --------------------------------------------------------- */

  async function loadTeacherSpace() {
    if (!teacherId || !schoolId) {
      setGlobalError(
        "Votre compte enseignant n'est pas rattaché à une école."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setGlobalError("");

    try {
      /* -----------------------------------------------------
         PROFESSEUR
         ----------------------------------------------------- */

      const {
        data: teacherData,
        error: teacherError,
      } = await supabase
        .from("teachers")
        .select(
          "id, school_id, display_name, active, created_at"
        )
        .eq("id", teacherId)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (teacherError) {
        throw teacherError;
      }

      if (!teacherData) {
        throw new Error(
          "Aucun profil enseignant correspondant à votre compte et à votre école."
        );
      }

      setTeacher(teacherData);

      /* -----------------------------------------------------
         ÉCOLE
         ----------------------------------------------------- */

      const {
        data: schoolData,
        error: schoolError,
      } = await supabase
        .from("schools")
        .select(
          "id, name, address, city, phone, email, logo_url, active"
        )
        .eq("id", schoolId)
        .maybeSingle();

      if (schoolError) {
        throw schoolError;
      }

      setSchool(schoolData || null);

      /* -----------------------------------------------------
         CLASSES AFFECTÉES
         ----------------------------------------------------- */

      const {
        data: teacherClassRows,
        error: teacherClassError,
      } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .eq("teacher_id", teacherId);

      if (teacherClassError) {
        throw teacherClassError;
      }

      const classIds = [
        ...new Set(
          (teacherClassRows || [])
            .map((item) => item.class_id)
            .filter(Boolean)
        ),
      ];

      let classData = [];

      if (classIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("classes")
          .select(
            "id, school_id, name, level, created_at"
          )
          .eq("school_id", schoolId)
          .in("id", classIds)
          .order("name", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        classData = data || [];
      }

      setClasses(classData);

      /* -----------------------------------------------------
         MATIÈRES AFFECTÉES
         ----------------------------------------------------- */

      const {
        data: teacherSubjectRows,
        error: teacherSubjectError,
      } = await supabase
        .from("teacher_subjects")
        .select("subject_id")
        .eq("teacher_id", teacherId);

      if (teacherSubjectError) {
        throw teacherSubjectError;
      }

      const subjectIds = [
        ...new Set(
          (teacherSubjectRows || [])
            .map((item) => item.subject_id)
            .filter(Boolean)
        ),
      ];

      setTeacherSubjectIds(subjectIds);

      let subjectData = [];

      if (subjectIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("subjects")
          .select(
            "id, name, school_id, created_at"
          )
          .in("id", subjectIds)
          .order("name", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        subjectData = data || [];
      }

      setSubjects(subjectData);

      /* -----------------------------------------------------
         ÉLÈVES DES CLASSES DU PROFESSEUR
         ----------------------------------------------------- */

      let studentData = [];

      if (classIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("students")
          .select(
            "id, profile_id, school_id, class_id, first_name, last_name, student_code, photo_url, active, created_at"
          )
          .eq("school_id", schoolId)
          .in("class_id", classIds)
          .order("last_name", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        studentData = data || [];
      }

      setStudents(studentData);

      /* -----------------------------------------------------
         CONTENUS PÉDAGOGIQUES
         ----------------------------------------------------- */

      const {
        data: contentData,
        error: contentError,
      } = await supabase
        .from("learning_contents")
        .select(
          "id, school_id, teacher_id, class_id, subject_id, title, description, content_type, content_url, file_url, thumbnail_url, published, created_at, updated_at"
        )
        .eq("school_id", schoolId)
        .eq("teacher_id", teacherId)
        .order("created_at", {
          ascending: false,
        });

      if (contentError) {
        console.warn(
          "Contenus pédagogiques :",
          contentError.message
        );

        setContents([]);
      } else {
        setContents(contentData || []);
      }

      if (
        !selectedClassId &&
        classData.length > 0
      ) {
        setSelectedClassId(classData[0].id);
      }
    } catch (error) {
      console.error(
        "Erreur chargement espace enseignant :",
        error
      );

      setGlobalError(
        error?.message ||
          "Impossible de charger votre espace enseignant."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeacherSpace();
  }, [teacherId, schoolId]);

  /* ---------------------------------------------------------
     REFRESH CONTENUS
     --------------------------------------------------------- */

  async function refreshContents() {
    if (!schoolId || !teacherId) return;

    const {
      data,
      error,
    } = await supabase
      .from("learning_contents")
      .select(
        "id, school_id, teacher_id, class_id, subject_id, title, description, content_type, content_url, file_url, thumbnail_url, published, created_at, updated_at"
      )
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Erreur actualisation contenus :",
        error
      );
      return;
    }

    setContents(data || []);
  }

  /* ---------------------------------------------------------
     DÉCONNEXION
     --------------------------------------------------------- */

  async function handleLogout() {
    try {
      if (onLogout) {
        await onLogout();
        return;
      }

      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Erreur déconnexion :",
        error
      );
    }
  }

  /* ---------------------------------------------------------
     RENDU PAGE
     --------------------------------------------------------- */

  function renderPage() {
    switch (activePage) {
      case "overview":
        return (
          <OverviewPage
            teacher={teacher}
            school={school}
            classes={classes}
            students={students}
            subjects={subjects}
            contents={contents}
          />
        );

      case "classes":
        return (
          <ClassesPage
            classes={classes}
            students={students}
            subjects={subjects}
            selectedClassId={selectedClassId}
            setSelectedClassId={
              setSelectedClassId
            }
          />
        );

      case "students":
        return (
          <StudentsPage
            students={students}
            classes={classes}
            search={studentSearch}
            setSearch={setStudentSearch}
            selectedClassId={
              studentClassFilter
            }
            setSelectedClassId={
              setStudentClassFilter
            }
          />
        );

      case "attendance":
        return (
          <AttendancePage
            schoolId={schoolId}
            teacherId={teacherId}
            classes={classes}
            students={students}
          />
        );

      case "behavior":
        return (
          <BehaviorPage
            schoolId={schoolId}
            teacherId={teacherId}
            classes={classes}
            students={students}
          />
        );

      case "courses":
        return (
          <CoursesPage
            schoolId={schoolId}
            teacherId={teacherId}
            classes={classes}
            subjects={subjects}
            contents={contents}
            onRefresh={refreshContents}
          />
        );

      case "documents":
        return (
          <DocumentsPage
            schoolId={schoolId}
            teacherId={teacherId}
            classes={classes}
            subjects={subjects}
            contents={contents}
            onRefresh={refreshContents}
          />
        );

      case "grades":
  return (
    <TeacherGradesPage
      schoolId={schoolId}
      teacherId={teacherId}
      classes={classes}
      students={students}
      subjects={subjects}
    />
  );

      case "assessments":
  return (
    <GradesPage
      schoolId={schoolId}
      teacherId={teacherId}
      classes={classes}
      students={students}
      subjects={subjects}
    />
  );

      case "exercises":
        return (
          <ComingSoonPage
            icon="✏️"
            title="Exercices"
            description="Création des exercices et questions."
          />
        );

      case "communication":
        return (
          <ComingSoonPage
            icon="💬"
            title="Communication"
            description="Communication professeur ↔ élèves et parents."
          />
        );

      case "profile":
        return (
          <ProfilePage
            profile={profile}
            teacher={teacher}
            school={school}
            subjects={subjects}
            classes={classes}
          />
        );

      default:
        return (
          <OverviewPage
            teacher={teacher}
            school={school}
            classes={classes}
            students={students}
            subjects={subjects}
            contents={contents}
          />
        );
    }
  }

  /* ---------------------------------------------------------
     CHARGEMENT
     --------------------------------------------------------- */

  if (loading) {
    return (
      <div
        className="ec-loading"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          className="ec-spinner"
        />

        <h2
          style={{
            color: "#0f172a",
          }}
        >
          Chargement de votre espace enseignant...
        </h2>

        <p
          style={{
            color: "#64748b",
          }}
        >
          Préparation de vos classes et de vos élèves.
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------
     ERREUR
     --------------------------------------------------------- */

  if (globalError) {
    return (
      <div
        className="ec-error-screen"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          className="ec-error-card"
          style={{
            maxWidth: 600,
            textAlign: "center",
          }}
        >
          <div
            className="ec-error-icon"
            style={{
              fontSize: 50,
            }}
          >
            ⚠️
          </div>

          <h2>
            Impossible de charger votre espace
          </h2>

          <p>{globalError}</p>

          <button
            className="ec-btn ec-btn-primary"
            onClick={() => {
              setGlobalError("");
              loadTeacherSpace();
            }}
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     APPLICATION
     --------------------------------------------------------- */

  return (
  <div className="school-admin-layout">
    {/* =====================================================
        SIDEBAR V4
        ===================================================== */}

    <aside className="school-admin-sidebar">
      <div className="school-admin-brand">
        <div className="school-admin-logo">
          EC
        </div>

        <div>
          <strong>École Connectée</strong>
          <span>Espace enseignant</span>
        </div>
      </div>

      <div className="school-admin-school">
        <div className="school-admin-school-label">
          Enseignant
        </div>

        <div className="school-admin-school-name">
          {teacher?.display_name ||
            profile?.full_name ||
            "Enseignant"}
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          {school?.name ||
            "Établissement scolaire"}
        </div>
      </div>

      <nav className="school-admin-nav">
        {MENU.map((item) => {
          const active = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              className={`school-admin-nav-item ${
                active ? "active" : ""
              }`}
            >
              <span className="school-admin-nav-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="school-admin-sidebar-bottom">
        <button
          type="button"
          onClick={handleLogout}
          className="school-admin-logout"
        >
          🚪 Déconnexion
        </button>
      </div>
    </aside>

    {/* =====================================================
        CONTENU PRINCIPAL V4
        ===================================================== */}

    <main className="school-admin-main">
      <header className="school-admin-topbar">
        <div className="school-admin-page-title">
          <span>📚</span>
          <div>
            <h1>Mon espace enseignant</h1>
            <p>
              {teacher?.display_name ||
                profile?.full_name ||
                "Enseignant"}
            </p>
          </div>
        </div>

        <div className="school-admin-user">
          <div className="school-admin-avatar">
            {(teacher?.display_name ||
              profile?.full_name ||
              "E")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="school-admin-user-info">
            <strong>
              {teacher?.display_name ||
                profile?.full_name ||
                "Enseignant"}
            </strong>

            <span>Enseignant</span>
          </div>
        </div>
      </header>

      <div className="school-admin-content">
        {renderPage()}
      </div>
    </main>
  </div>
);
}