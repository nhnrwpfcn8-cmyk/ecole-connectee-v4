import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

/* =========================================================
   STUDENT DASHBOARD
   ÉCOLE CONNECTÉE V4

   CONSERVÉ :
   - Accueil
   - Cours
   - Exercices
   - Évaluations
   - Notes
   - Bulletins
   - Carte scolaire + QR Code
   - Navigation
   - Bouton Retour
   - Déconnexion
   - Isolation par school_id
   - Aucun bouton modifier/supprimer

   AJOUTÉ :
   - Présences réelles
   - Communication réelle
   - Compteur de messages non lus
========================================================= */

const MENU = [
  { id: "home", label: "Accueil", icon: "🏠" },
  { id: "courses", label: "Cours", icon: "📚" },
  { id: "exercises", label: "Exercices", icon: "✏️" },
  { id: "assessments", label: "Évaluations", icon: "📝" },
  { id: "grades", label: "Notes", icon: "📊" },
  { id: "attendance", label: "Présences", icon: "🕘" },
  { id: "bulletins", label: "Bulletins", icon: "📄" },
  { id: "communication", label: "Communication", icon: "💬" },
  { id: "school-card", label: "Carte scolaire", icon: "🎫" },
];

/* =========================================================
   HELPERS
========================================================= */

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "E";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(dateValue) {
  if (!dateValue) return "Non renseignée";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("fr-FR");
}

function formatDateTime(dateValue) {
  if (!dateValue) return "Non renseigné";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatScore(score) {
  if (score === null || score === undefined || score === "") {
    return "—";
  }

  const number = Number(score);

  if (Number.isNaN(number)) {
    return String(score);
  }

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(2);
}

/* =========================================================
   UI HELPERS
========================================================= */

function PageTitle({
  icon,
  title,
  description,
  onBack,
}) {
  return (
    <div style={{ marginBottom: "24px" }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#374151",
            padding: "9px 14px",
            borderRadius: "9px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "18px",
          }}
        >
          ← Retour
        </button>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#eef2ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "23px",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "25px",
              color: "#111827",
            }}
          >
            {title}
          </h2>

          {description && (
            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingBox({ text = "Chargement..." }) {
  return (
    <div
      style={{
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        color: "#1d4ed8",
        padding: "14px 16px",
        borderRadius: "10px",
        fontSize: "14px",
      }}
    >
      🔄 {text}
    </div>
  );
}

function ErrorBox({ text }) {
  if (!text) return null;

  return (
    <div
      style={{
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        color: "#9a3412",
        padding: "14px 16px",
        borderRadius: "10px",
        marginBottom: "16px",
        fontSize: "14px",
      }}
    >
      ⚠️ {text}
    </div>
  );
}

function EmptyBox({ icon, title, text }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "35px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "42px",
          marginBottom: "10px",
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: "0 0 7px",
          color: "#111827",
          fontSize: "18px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#6b7280",
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function DashboardCard({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: "14px",
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "12px",
            background: "#eef2ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div>
          <div
            style={{
              fontWeight: 700,
              color: "#111827",
              fontSize: "16px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: "4px",
              color: "#6b7280",
              fontSize: "13px",
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

function SubjectFilter({
  subjects,
  selectedSubjectId,
  onChange,
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ color: "#374151" }}>
          📚 Matière :
        </strong>

        <select
          value={selectedSubjectId}
          onChange={(event) =>
            onChange(event.target.value)
          }
          style={{
            minWidth: "220px",
            maxWidth: "100%",
            border: "1px solid #d1d5db",
            borderRadius: "9px",
            padding: "10px 12px",
            background: "#ffffff",
            color: "#111827",
            fontSize: "14px",
          }}
        >
          <option value="all">
            Toutes les matières
          </option>

          {subjects.map((subject) => (
            <option
              key={String(subject.id)}
              value={String(subject.id)}
            >
              {subject.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SubjectBadge({ name }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 9px",
        borderRadius: "999px",
        background: "#eef2ff",
        color: "#4338ca",
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      📚 {name || "Matière non renseignée"}
    </span>
  );
}

/* =========================================================
   ACCUEIL
========================================================= */

function HomePage({
  profile,
  studentLoading,
  studentError,
  onNavigate,
  contentCounts,
}) {
  const fullName =
    profile?.full_name || "Élève";

  return (
    <div>
      <div
        style={{
          background:
            "linear-gradient(135deg,#eef2ff 0%,#ffffff 100%)",
          border: "1px solid #e0e7ff",
          borderRadius: "16px",
          padding: "26px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {profile?.photo_url ? (
            <img
              src={profile.photo_url}
              alt={fullName}
              style={{
                width: "62px",
                height: "62px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #fff",
              }}
            />
          ) : (
            <div
              style={{
                width: "62px",
                height: "62px",
                borderRadius: "50%",
                background: "#4f46e5",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "20px",
              }}
            >
              {getInitials(fullName)}
            </div>
          )}

          <div>
            <div
              style={{
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Bienvenue dans votre espace
            </div>

            <h2
              style={{
                margin: "4px 0 0",
                color: "#111827",
                fontSize: "25px",
              }}
            >
              {fullName}
            </h2>

            <div
              style={{
                marginTop: "5px",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              Espace Élève — École Connectée
            </div>

            {profile?.class_name && (
              <div
                style={{
                  marginTop: "4px",
                  color: "#4f46e5",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Classe : {profile.class_name}
              </div>
            )}
          </div>
        </div>
      </div>

      {studentLoading && (
        <div style={{ marginBottom: "20px" }}>
          <LoadingBox text="Synchronisation de votre dossier élève..." />
        </div>
      )}

      {studentError && (
        <ErrorBox text={studentError} />
      )}

      <h3
        style={{
          margin: "0 0 15px",
          color: "#111827",
          fontSize: "19px",
        }}
      >
        Accès rapides
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "14px",
        }}
      >
        <DashboardCard
          icon="📚"
          title={`Mes cours (${contentCounts.courses})`}
          description="Cours publiés dans vos matières"
          onClick={() => onNavigate("courses")}
        />

        <DashboardCard
          icon="✏️"
          title={`Mes exercices (${contentCounts.exercises})`}
          description="Exercices de vos matières"
          onClick={() => onNavigate("exercises")}
        />

        <DashboardCard
          icon="📝"
          title={`Mes évaluations (${contentCounts.assessments})`}
          description="Évaluations de votre classe"
          onClick={() => onNavigate("assessments")}
        />

        <DashboardCard
          icon="📊"
          title={`Mes notes (${contentCounts.grades})`}
          description="Vos résultats par matière"
          onClick={() => onNavigate("grades")}
        />

        <DashboardCard
          icon="🕘"
          title="Mes présences"
          description="Voir vos présences et absences"
          onClick={() => onNavigate("attendance")}
        />

        <DashboardCard
          icon="📄"
          title="Mes bulletins"
          description="Consulter vos bulletins"
          onClick={() => onNavigate("bulletins")}
        />

        <DashboardCard
          icon="💬"
          title="Communication"
          description="Échanger avec vos enseignants"
          onClick={() => onNavigate("communication")}
        />

        <DashboardCard
          icon="🎫"
          title="Carte scolaire"
          description="Voir votre carte scolaire"
          onClick={() => onNavigate("school-card")}
        />
      </div>
    </div>
  );
}

/* =========================================================
   COURS
========================================================= */

function CoursesPage({
  onBack,
  courses,
  subjects,
  loading,
  error,
}) {
  const [selectedSubjectId, setSelectedSubjectId] =
    useState("all");

  const filteredCourses = useMemo(() => {
    if (selectedSubjectId === "all") {
      return courses;
    }

    return courses.filter(
      (course) =>
        String(course.subject_id) ===
        String(selectedSubjectId)
    );
  }, [courses, selectedSubjectId]);

  return (
    <div>
      <PageTitle
        icon="📚"
        title="Mes cours"
        description="Les cours publiés pour votre classe, organisés par matière."
        onBack={onBack}
      />

      <SubjectFilter
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onChange={setSelectedSubjectId}
      />

      <ErrorBox text={error} />

      {loading ? (
        <LoadingBox text="Chargement des cours..." />
      ) : !filteredCourses.length ? (
        <EmptyBox
          icon="📚"
          title="Aucun cours"
          text="Aucun cours publié n'est disponible pour votre classe."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(280px,1fr))",
            gap: "16px",
          }}
        >
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <SubjectBadge
                name={course.subject_name}
              />

              <h3
                style={{
                  margin: "13px 0 7px",
                  color: "#111827",
                  fontSize: "18px",
                }}
              >
                {course.title || "Cours sans titre"}
              </h3>

              {course.description && (
                <p
                  style={{
                    margin: "0 0 12px",
                    color: "#6b7280",
                    fontSize: "14px",
                    lineHeight: 1.5,
                  }}
                >
                  {course.description}
                </p>
              )}

              <div
                style={{
                  color: "#6b7280",
                  fontSize: "12px",
                  marginBottom: "13px",
                }}
              >
                📅 {formatDate(course.created_at)}
              </div>

              {course.content_type && (
                <div
                  style={{
                    marginBottom: "12px",
                    color: "#374151",
                    fontSize: "13px",
                  }}
                >
                  Type :{" "}
                  <strong>
                    {course.content_type}
                  </strong>
                </div>
              )}

              <div
  style={{
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  }}
>
  {course.file_url && (
    <a
      href={course.file_signed_url || "#"}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => {
        if (!course.file_signed_url) {
          event.preventDefault();
        }
      }}
      style={{
        textDecoration: "none",
        background: course.file_signed_url
          ? "#4f46e5"
          : "#9ca3af",
        color: "#fff",
        padding: "9px 13px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 700,
        cursor: course.file_signed_url
          ? "pointer"
          : "not-allowed",
      }}
    >
      📎 Ouvrir le fichier
    </a>
  )}

  {course.content_url &&
    course.content_type === "link" && (
      <a
        href={course.content_url}
        target="_blank"
        rel="noreferrer"
        style={{
          textDecoration: "none",
          background: "#eef2ff",
          color: "#4338ca",
          padding: "9px 13px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        🔗 Ouvrir le lien
      </a>
    )}
</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   EXERCICES
========================================================= */
function AssessmentsPage({
  assessments = [],
  subjects = [],
  onBack,
}) {
  const [selectedSubjectId, setSelectedSubjectId] =
    useState("all");

  const filteredAssessments =
    selectedSubjectId === "all"
      ? assessments
      : assessments.filter(
          (assessment) =>
            String(assessment.subject_id) ===
            String(selectedSubjectId)
        );

  return (
    <div>
      <PageTitle
        icon="📝"
        title="Mes évaluations"
        description="Les évaluations publiées pour votre classe"
        onBack={onBack}
      />

      <SubjectFilter
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onChange={setSelectedSubjectId}
      />

      {!filteredAssessments.length ? (
        <EmptyBox
          icon="📝"
          title="Aucune évaluation"
          text="Aucune évaluation publiée n'est disponible pour votre classe."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gap: "14px",
          }}
        >
          {filteredAssessments.map(
            (assessment) => (
              <div
                key={assessment.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: "0 0 8px",
                        color: "#111827",
                        fontSize: "18px",
                      }}
                    >
                      {assessment.title ||
                        "Évaluation"}
                    </h3>

                    <SubjectBadge
                      name={
                        assessment.subject_name
                      }
                    />
                  </div>

                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: "999px",
                      background: "#eef2ff",
                      color: "#4338ca",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {assessment.assessment_type ||
                      "Évaluation"}
                  </span>
                </div>

                {assessment.description && (
                  <p
                    style={{
                      margin: "14px 0",
                      color: "#4b5563",
                      fontSize: "14px",
                      lineHeight: 1.5,
                    }}
                  >
                    {assessment.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginTop: "12px",
                  }}
                >
                  <span
                    style={{
                      padding: "7px 10px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      color: "#374151",
                      fontSize: "13px",
                    }}
                  >
                    📅{" "}
                    {formatDate(
                      assessment.evaluation_date
                    )}
                  </span>

                  <span
                    style={{
                      padding: "7px 10px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      color: "#374151",
                      fontSize: "13px",
                    }}
                  >
                    🎯 Note maximale :{" "}
                    {assessment.max_score ?? 20}
                  </span>

                  <span
                    style={{
                      padding: "7px 10px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      color: "#374151",
                      fontSize: "13px",
                    }}
                  >
                    Coefficient :{" "}
                    {assessment.coefficient ?? 1}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ExercisesPage({
  onBack,
  exercises,
  subjects,
  loading,
  error,
}) {
  const [selectedSubjectId, setSelectedSubjectId] =
    useState("all");

  const filteredExercises = useMemo(() => {
    if (selectedSubjectId === "all") {
      return exercises;
    }

    return exercises.filter(
      (exercise) =>
        String(exercise.subject_id) ===
        String(selectedSubjectId)
    );
  }, [exercises, selectedSubjectId]);

  return (
    <div>
      <PageTitle
        icon="✏️"
        title="Mes exercices"
        description="Les exercices publiés pour votre classe."
        onBack={onBack}
      />

      <SubjectFilter
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onChange={setSelectedSubjectId}
      />

      <ErrorBox text={error} />

      {loading ? (
        <LoadingBox text="Chargement des exercices..." />
      ) : !filteredExercises.length ? (
        <EmptyBox
          icon="✏️"
          title="Aucun exercice"
          text="Aucun exercice publié n'est disponible pour votre classe."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(280px,1fr))",
            gap: "16px",
          }}
        >
          {filteredExercises.map((exercise) => (
            <div
              key={exercise.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <SubjectBadge
                name={exercise.subject_name}
              />

              <h3
                style={{
                  margin: "13px 0 7px",
                  color: "#111827",
                  fontSize: "18px",
                }}
              >
                {exercise.title || "Exercice sans titre"}
              </h3>

              {exercise.description && (
                <p
                  style={{
                    margin: "0 0 10px",
                    color: "#6b7280",
                    fontSize: "14px",
                    lineHeight: 1.5,
                  }}
                >
                  {exercise.description}
                </p>
              )}

              {exercise.instructions && (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "9px",
                    padding: "11px",
                    marginBottom: "12px",
                    color: "#374151",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Instructions :</strong>{" "}
                  {exercise.instructions}
                </div>
              )}

              <div
                style={{
                  color: "#6b7280",
                  fontSize: "12px",
                  marginBottom: "13px",
                }}
              >
                {exercise.duration_minutes && (
                  <div>
                    ⏱️ Durée :{" "}
                    {exercise.duration_minutes} min
                  </div>
                )}

                {exercise.due_at && (
                  <div>
                    📅 À rendre avant :{" "}
                    {formatDateTime(
                      exercise.due_at
                    )}
                  </div>
                )}
              </div>

              {exercise.file_url && (
                <a
                  href={exercise.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    textDecoration: "none",
                    background: "#4f46e5",
                    color: "#fff",
                    padding: "9px 13px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  📎 Ouvrir l'exercice
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ÉVALUATIONS
========================================================= */

function AssignmentsPage({
  teachers,
  classes,
  subjects,
}) {
  const [selectedTeacher, setSelectedTeacher] =
    useState("");

  const [selectedClass, setSelectedClass] =
    useState("");

  const [selectedSubject, setSelectedSubject] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [savingClass, setSavingClass] =
    useState(false);

  const [savingSubject, setSavingSubject] =
    useState(false);

  async function assignClass() {
    setMessage("");

    if (!selectedTeacher || !selectedClass) {
      setMessage(
        "Sélectionnez un enseignant et une classe."
      );
      return;
    }

    setSavingClass(true);

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "school_admin_assign_teacher_class",
        {
          p_teacher_id: selectedTeacher,
          p_class_id: selectedClass,
        }
      );

      if (error) {
        console.error(
          "Erreur affectation classe :",
          error
        );

        throw new Error(
          error.message ||
          "Impossible d'effectuer l'affectation."
        );
      }

      if (!data?.success) {
        throw new Error(
          "L'affectation n'a pas été enregistrée."
        );
      }

      setMessage(
        "✅ Classe affectée avec succès."
      );

      /*
       * On garde la sélection pour permettre
       * d'ajouter rapidement une autre affectation.
       */
    } catch (error) {
      console.error(
        "Erreur affectation classe :",
        error
      );

      setMessage(
        `❌ ${
          error.message ||
          "Impossible d'effectuer l'affectation."
        }`
      );
    } finally {
      setSavingClass(false);
    }
  }

  async function assignSubject() {
    setMessage("");

    if (!selectedTeacher || !selectedSubject) {
      setMessage(
        "Sélectionnez un enseignant et une matière."
      );
      return;
    }

    setSavingSubject(true);

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "school_admin_assign_teacher_subject",
        {
          p_teacher_id: selectedTeacher,
          p_subject_id: Number(selectedSubject),
        }
      );

      if (error) {
        console.error(
          "Erreur affectation matière :",
          error
        );

        throw new Error(
          error.message ||
          "Impossible d'affecter la matière."
        );
      }

      if (!data?.success) {
        throw new Error(
          "L'affectation de la matière n'a pas été enregistrée."
        );
      }

      setMessage(
        "✅ Matière affectée avec succès."
      );
    } catch (error) {
      console.error(
        "Erreur affectation matière :",
        error
      );

      setMessage(
        `❌ ${
          error.message ||
          "Impossible d'affecter la matière."
        }`
      );
    } finally {
      setSavingSubject(false);
    }
  }

  return (
    <div className="ec-page">

      <div className="ec-page-heading">
        <div>
          <span className="ec-eyebrow">
            ORGANISATION
          </span>

          <h2>
            Affectations
          </h2>

          <p>
            Affectez les enseignants aux classes
            et aux matières de votre établissement.
          </p>
        </div>
      </div>

      <div className="ec-panel">

        <div className="ec-form assignment-form">

          {message && (
            <div className="ec-form-info">
              <span>ℹ️</span>
              <p>{message}</p>
            </div>
          )}

          <SelectInput
            label="Enseignant"
            value={selectedTeacher}
            onChange={setSelectedTeacher}
            options={(teachers || []).map(
              (item) => ({
                value: item.id,
                label: item.display_name,
              })
            )}
            placeholder="Choisir un enseignant"
            disabled={
              savingClass ||
              savingSubject
            }
          />

          <SelectInput
            label="Classe"
            value={selectedClass}
            onChange={setSelectedClass}
            options={(classes || []).map(
              (item) => ({
                value: item.id,
                label: item.name,
              })
            )}
            placeholder="Choisir une classe"
            disabled={
              savingClass ||
              savingSubject
            }
          />

          <button
            type="button"
            className="ec-btn ec-btn-primary"
            onClick={assignClass}
            disabled={savingClass}
          >
            {savingClass
              ? "⏳ Enregistrement..."
              : "🔗 Affecter à la classe"}
          </button>

          <div className="ec-divider" />

          <SelectInput
            label="Matière"
            value={selectedSubject}
            onChange={setSelectedSubject}
            options={(subjects || []).map(
              (item) => ({
                value: String(item.id),
                label: item.name,
              })
            )}
            placeholder="Choisir une matière"
            disabled={
              savingClass ||
              savingSubject
            }
          />

          <button
            type="button"
            className="ec-btn ec-btn-primary"
            onClick={assignSubject}
            disabled={savingSubject}
          >
            {savingSubject
              ? "⏳ Enregistrement..."
              : "📚 Affecter la matière"}
          </button>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   NOTES
========================================================= */

function GradesPage({
  onBack,
  grades,
  subjects,
  loading,
  error,
}) {
  const [selectedSubjectId, setSelectedSubjectId] =
    useState("all");

  const filteredGrades = useMemo(() => {
    if (selectedSubjectId === "all") {
      return grades;
    }

    return grades.filter(
      (grade) =>
        String(grade.subject_id) ===
        String(selectedSubjectId)
    );
  }, [grades, selectedSubjectId]);

  const subjectAverages = useMemo(() => {
    const result = {};

    filteredGrades.forEach((grade) => {
      const subjectId =
        String(
          grade.subject_id || "unknown"
        );

      const score = Number(grade.score);

      if (Number.isNaN(score)) return;

      const maxScore =
        Number(grade.max_score) || 20;

      const scoreOn20 =
        maxScore > 0
          ? (score / maxScore) * 20
          : score;

      if (!result[subjectId]) {
        result[subjectId] = {
          total: 0,
          count: 0,
          name:
            grade.subject_name ||
            "Matière non renseignée",
        };
      }

      result[subjectId].total += scoreOn20;
      result[subjectId].count += 1;
    });

    return Object.values(result).map(
      (item) => ({
        ...item,
        average:
          item.count > 0
            ? item.total / item.count
            : 0,
      })
    );
  }, [filteredGrades]);

  return (
    <div>
      <PageTitle
        icon="📊"
        title="Mes notes"
        description="Vos résultats scolaires par matière."
        onBack={onBack}
      />

      <SubjectFilter
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onChange={setSelectedSubjectId}
      />

      <ErrorBox text={error} />

      {loading ? (
        <LoadingBox text="Chargement de vos notes..." />
      ) : !filteredGrades.length ? (
        <EmptyBox
          icon="📊"
          title="Aucune note"
          text="Aucune note n'est encore disponible."
        />
      ) : (
        <>
          {subjectAverages.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(210px,1fr))",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              {subjectAverages.map((item) => (
                <div
                  key={item.name}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    MATIÈRE
                  </div>

                  <div
                    style={{
                      color: "#111827",
                      fontWeight: 800,
                      fontSize: "15px",
                      marginBottom: "8px",
                    }}
                  >
                    {item.name}
                  </div>

                  <div
                    style={{
                      color: "#4f46e5",
                      fontSize: "24px",
                      fontWeight: 800,
                    }}
                  >
                    {item.average.toFixed(2)} / 20
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {filteredGrades.map((grade) => (
              <div
                key={grade.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "13px",
                  padding: "17px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <SubjectBadge
                      name={grade.subject_name}
                    />

                    <h3
                      style={{
                        margin: "10px 0 4px",
                        color: "#111827",
                        fontSize: "17px",
                      }}
                    >
                      {grade.assessment_title ||
                        "Évaluation"}
                    </h3>

                    {grade.assessment_date && (
                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: "12px",
                        }}
                      >
                        📅{" "}
                        {formatDate(
                          grade.assessment_date
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      minWidth: "100px",
                      textAlign: "center",
                      background: "#eef2ff",
                      borderRadius: "10px",
                      padding: "10px 13px",
                    }}
                  >
                    <div
                      style={{
                        color: "#4338ca",
                        fontSize: "22px",
                        fontWeight: 800,
                      }}
                    >
                      {formatScore(grade.score)}
                    </div>

                    <div
                      style={{
                        color: "#6b7280",
                        fontSize: "11px",
                      }}
                    >
                      /{" "}
                      {formatScore(
                        grade.max_score
                      )}
                    </div>
                  </div>
                </div>

                {(grade.appreciation ||
                  grade.comment ||
                  grade.stars) && (
                  <div
                    style={{
                      marginTop: "13px",
                      borderTop:
                        "1px solid #f1f5f9",
                      paddingTop: "12px",
                    }}
                  >
                    {grade.stars && (
                      <div
                        style={{
                          marginBottom: "6px",
                        }}
                      >
                        {"⭐".repeat(
                          Math.min(
                            5,
                            Math.max(
                              0,
                              Number(
                                grade.stars
                              )
                            )
                          )
                        )}
                      </div>
                    )}

                    {grade.appreciation && (
                      <div
                        style={{
                          color: "#374151",
                          fontSize: "13px",
                          marginBottom: "5px",
                        }}
                      >
                        <strong>
                          Appréciation :
                        </strong>{" "}
                        {grade.appreciation}
                      </div>
                    )}

                    {grade.comment && (
                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: "13px",
                        }}
                      >
                        {grade.comment}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   PRÉSENCES — ACTIVÉ
========================================================= */

function AttendancePage({
  onBack,
  attendance,
  loading,
  error,
}) {
  const counts = useMemo(() => {
    return {
      present: attendance.filter(
        (item) => item.status === "present"
      ).length,

      absent: attendance.filter(
        (item) => item.status === "absent"
      ).length,

      late: attendance.filter(
        (item) => item.status === "late"
      ).length,

      excused: attendance.filter(
        (item) => item.status === "excused"
      ).length,
    };
  }, [attendance]);

  function statusLabel(status) {
    if (status === "present") return "Présent";
    if (status === "absent") return "Absent";
    if (status === "late") return "Retard";
    if (status === "excused") return "Justifié";
    return status || "Non renseigné";
  }

  function statusStyle(status) {
    if (status === "present") {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (status === "absent") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (status === "late") {
      return {
        background: "#fef3c7",
        color: "#92400e",
      };
    }

    return {
      background: "#dbeafe",
      color: "#1e40af",
    };
  }

  return (
    <div>
      <PageTitle
        icon="🕘"
        title="Mes présences"
        description="Consultez votre historique de présence, absence et retard."
        onBack={onBack}
      />

      <ErrorBox text={error} />

      {loading ? (
        <LoadingBox text="Chargement de vos présences..." />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ color: "#166534" }}>
                🟢 Présents
              </div>

              <strong
                style={{
                  display: "block",
                  fontSize: "25px",
                  marginTop: "5px",
                }}
              >
                {counts.present}
              </strong>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ color: "#991b1b" }}>
                🔴 Absents
              </div>

              <strong
                style={{
                  display: "block",
                  fontSize: "25px",
                  marginTop: "5px",
                }}
              >
                {counts.absent}
              </strong>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ color: "#92400e" }}>
                🟠 Retards
              </div>

              <strong
                style={{
                  display: "block",
                  fontSize: "25px",
                  marginTop: "5px",
                }}
              >
                {counts.late}
              </strong>
            </div>
          </div>

          {!attendance.length ? (
            <EmptyBox
              icon="🕘"
              title="Aucune présence enregistrée"
              text="Votre historique de présence apparaîtra ici lorsque l'école enregistrera vos présences."
            />
          ) : (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "15px 18px",
                  borderBottom:
                    "1px solid #e5e7eb",
                  fontWeight: 800,
                  color: "#111827",
                }}
              >
                Historique des présences
              </div>

              <div
                style={{
                  display: "grid",
                }}
              >
                {attendance.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "15px",
                      padding: "14px 18px",
                      borderBottom:
                        "1px solid #f1f5f9",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong
  style={{
    display: "block",
    color: "#111827",
  }}
>
  {formatDate(
    item.attendance_date
  )}
</strong>

<div
  style={{
    marginTop: "4px",
    fontSize: "12px",
    color: "#374151",
  }}
>
  <strong>Entrée :</strong>{" "}
  {item.entry_at
    ? formatDateTime(item.entry_at)
    : "—"}
</div>

<div
  style={{
    fontSize: "12px",
    color: "#374151",
  }}
>
  <strong>Sortie :</strong>{" "}
  {item.exit_at
    ? formatDateTime(item.exit_at)
    : "—"}
</div>

{item.justification && (
                        <span
                          style={{
                            color: "#6b7280",
                            fontSize: "12px",
                          }}
                        >
                          {item.justification}
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        ...statusStyle(
                          item.status
                        ),
                        padding:
                          "6px 10px",
                        borderRadius:
                          "999px",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {statusLabel(
                        item.status
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* =========================================================
   BULLETINS — CONSERVÉ
========================================================= */

function BulletinsPage({ onBack }) {
  return (
    <div>
      <PageTitle
        icon="📄"
        title="Mes bulletins"
        description="Consultez vos bulletins scolaires."
        onBack={onBack}
      />

      <EmptyBox
        icon="📄"
        title="Bulletins"
        text="Les bulletins de l'élève restent disponibles dans cet espace."
      />
    </div>
  );
}

/* =========================================================
   COMMUNICATION — ACTIVÉE
========================================================= */

function CommunicationPage({
  onBack,
  conversations,
  messages,
  selectedConversation,
  onSelectConversation,
  newMessage,
  onNewMessage,
  onSendMessage,
  sending,
  loading,
  error,
  onMarkRead,
  currentUserId,
}) {
  const conversationList =
    conversations || [];

  const messageList =
    messages || [];

  const selectedConversationId =
    selectedConversation?.id;

  const selectedMessages =
    messageList.filter(
      (message) =>
        String(message.conversation_id) ===
        String(selectedConversationId)
    );
useEffect(() => {
  if (!onMarkRead) return;

  selectedMessages.forEach((message) => {
    const isMine =
      String(message.sender_profile_id) ===
      String(currentUserId);

    if (!message.read_at && !isMine) {
      onMarkRead(message.id);
    }
  });
}, [
  selectedConversationId,
  selectedMessages,
  currentUserId,
  onMarkRead,
]);
  return (
    <div>
      <PageTitle
        icon="💬"
        title="Communication"
        description="Vos échanges avec vos enseignants."
        onBack={onBack}
      />

      <ErrorBox text={error} />

      {loading ? (
        <LoadingBox
          text="Chargement de vos conversations..."
        />
      ) : !conversationList.length ? (
        <EmptyBox
          icon="💬"
          title="Aucune conversation"
          text="Vous n'avez pas encore de conversation avec un enseignant."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(220px, 0.8fr) minmax(0, 1.5fr)",
            gap: "16px",
          }}
        >
          {/* LISTE DES ENSEIGNANTS */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "12px",
              height: "fit-content",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: "#111827",
                marginBottom: "10px",
              }}
            >
              👨‍🏫 Mes enseignants
            </div>

            <div
              style={{
                display: "grid",
                gap: "8px",
              }}
            >
              {conversationList.map(
                (conversation) => {
                  const active =
                    String(
                      conversation.id
                    ) ===
                    String(
                      selectedConversationId
                    );

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() =>
                        onSelectConversation(
                          conversation
                        )
                      }
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: active
                          ? "1px solid #4f46e5"
                          : "1px solid #e5e7eb",
                        background: active
                          ? "#eef2ff"
                          : "#ffffff",
                        borderRadius: "12px",
                        padding: "12px",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          color: "#111827",
                        }}
                      >
                        {conversation.teacher_name ||
                          "Enseignant"}
                      </div>

                      {conversation.unread_count >
                        0 && (
                        <div
                          style={{
                            marginTop: "5px",
                            color: "#dc2626",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          🔴{" "}
                          {conversation.unread_count}{" "}
                          nouveau
                          {conversation.unread_count >
                          1
                            ? "x"
                            : ""}{" "}
                          message
                          {conversation.unread_count >
                          1
                            ? "s"
                            : ""}
                        </div>
                      )}

                      {conversation.last_message && (
                        <div
                          style={{
                            marginTop: "5px",
                            color: "#6b7280",
                            fontSize: "12px",
                            overflow: "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            conversation
                              .last_message.message
                          }
                        </div>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* CHAT */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              overflow: "hidden",
              minHeight: "500px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {!selectedConversation ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                <div
                  style={{
                    fontSize: "40px",
                    marginBottom: "10px",
                  }}
                >
                  💬
                </div>

                <div
                  style={{
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  Sélectionnez un enseignant
                </div>
              </div>
            ) : (
              <>
                {/* EN-TÊTE DU CHAT */}
                <div
                  style={{
                    padding: "15px 17px",
                    borderBottom:
                      "1px solid #e5e7eb",
                    background: "#f9fafb",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  >
                    👨‍🏫{" "}
                    {selectedConversation.teacher_name ||
                      "Enseignant"}
                  </div>

                  <div
                    style={{
                      marginTop: "3px",
                      fontSize: "12px",
                      color: "#6b7280",
                    }}
                  >
                    Conversation avec votre enseignant
                  </div>
                </div>

                {/* MESSAGES */}
                <div
                  style={{
                    flex: 1,
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    overflowY: "auto",
                    minHeight: "320px",
                    maxHeight: "450px",
                  }}
                >
                  {!selectedMessages.length ? (
                    <div
                      style={{
                        margin: "auto",
                        textAlign: "center",
                        color: "#6b7280",
                        padding: "30px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "34px",
                          marginBottom: "8px",
                        }}
                      >
                        💬
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                        }}
                      >
                        Aucun message
                      </div>

                      <div
                        style={{
                          fontSize: "13px",
                          marginTop: "5px",
                        }}
                      >
                        Commencez la conversation.
                      </div>
                    </div>
                  ) : (
                    selectedMessages.map(
                      (message) => {
                        const isMine =
                          String(
                            message.sender_profile_id
                          ) ===
                          String(currentUserId);

                        const unread =
                          !message.read_at &&
                          !isMine;

                        return (
                          <div
                            key={message.id}
                            style={{
                              display: "flex",
                              justifyContent:
                                isMine
                                  ? "flex-end"
                                  : "flex-start",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "78%",
                                padding:
                                  "10px 13px",
                                borderRadius:
                                  isMine
                                    ? "16px 16px 4px 16px"
                                    : "16px 16px 16px 4px",
                                background:
                                  isMine
                                    ? "#4f46e5"
                                    : "#f3f4f6",
                                color:
                                  isMine
                                    ? "#ffffff"
                                    : "#111827",
                              }}
                            >
                              {!isMine && (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    marginBottom:
                                      "4px",
                                    color: "#4f46e5",
                                  }}
                                >
                                  {message.teacher_name ||
                                    "Enseignant"}
                                </div>
                              )}

                              <div
                                style={{
                                  fontSize: "14px",
                                  lineHeight: 1.5,
                                  whiteSpace:
                                    "pre-wrap",
                                }}
                              >
                                {message.message}
                              </div>

                              <div
                                style={{
                                  marginTop: "5px",
                                  fontSize: "10px",
                                  opacity: 0.7,
                                  textAlign:
                                    "right",
                                }}
                              >
                                {formatDateTime(
                                  message.created_at
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )
                  )}
                </div>

                {/* ZONE D'ÉCRITURE */}
                <div
                  style={{
                    borderTop:
                      "1px solid #e5e7eb",
                    padding: "12px",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "flex-end",
                    }}
                  >
                    <textarea
                      value={newMessage}
                      onChange={(event) =>
                        onNewMessage(
                          event.target.value
                        )
                      }
                      placeholder="Écrire un message..."
                      rows={2}
                      disabled={sending}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();

                          if (
                            newMessage.trim() &&
                            !sending
                          ) {
                            onSendMessage();
                          }
                        }
                      }}
                      style={{
                        flex: 1,
                        resize: "none",
                        border:
                          "1px solid #d1d5db",
                        borderRadius: "12px",
                        padding: "10px 12px",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />

                    <button
                      type="button"
                      onClick={onSendMessage}
                      disabled={
                        sending ||
                        !newMessage.trim()
                      }
                      className="ec-btn ec-btn-primary"
                      style={{
                        minHeight: "46px",
                      }}
                    >
                      {sending
                        ? "⏳"
                        : "📤 Envoyer"}
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "10px",
                      color: "#9ca3af",
                    }}
                  >
                    Entrée pour envoyer •
                    Maj + Entrée pour une nouvelle ligne
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CARD INFO
========================================================= */

function CardInfo({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "145px 1fr",
        gap: "10px",
        padding: "9px 0",
        borderBottom:
          "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#111827",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        {value || "Non renseigné"}
      </div>
    </div>
  );
}

/* =========================================================
   CARTE SCOLAIRE — CONSERVÉE
========================================================= */

function SchoolCardPage({
  profile,
  onBack,
}) {
  const fullName =
    profile?.full_name || "Élève";

  const schoolName =
    profile?.school_name ||
    "École Connectée";

  const studentCode =
    profile?.student_code ||
    profile?.matricule ||
    "Non renseigné";

  const className =
    profile?.class_name ||
    "Non renseignée";

  const birthDate =
    profile?.date_of_birth
      ? formatDate(
          profile.date_of_birth
        )
      : "Non renseignée";

  const schoolYear =
    profile?.school_year ||
    "2026 - 2027";

  const photoUrl =
    profile?.photo_url || null;

  const schoolAddress =
    profile?.school_address ||
    profile?.school_city ||
    "";

  const qrData = profile?.qr_token || "";

  return (
    <div>
      <PageTitle
        icon="🎫"
        title="Carte scolaire"
        description="Votre carte d'identité scolaire."
        onBack={onBack}
      />

      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#fff",
            border:
              "1px solid #dbe3ef",
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow:
              "0 10px 30px rgba(15,23,42,.10)",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg,#eef2ff 0%,#fff 100%)",
              padding: "22px",
              borderBottom:
                "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "13px",
                }}
              >
                <div
                  style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "14px",
                    background: "#fff",
                    border:
                      "1px solid #dbe3ef",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    fontWeight: 800,
                    color: "#4f46e5",
                  }}
                >
                  EC
                </div>

                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                      fontSize: "17px",
                    }}
                  >
                    {schoolName}
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      color: "#4f46e5",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    CARTE D'IDENTITÉ SCOLAIRE
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: "118px",
                  height: "118px",
                  background: "#fff",
                  border: "5px solid #fff",
                  borderRadius: "10px",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(
                    qrData
                  )}`}
                  alt={`QR Code de ${fullName}`}
                  style={{
                    width: "108px",
                    height: "108px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "150px minmax(0,1fr)",
                gap: "24px",
              }}
            >
              <div
                style={{
                  width: "150px",
                  height: "180px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border:
                    "1px solid #d1d5db",
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={fullName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "46px",
                      }}
                    >
                      👤
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      Photo
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    marginBottom: "13px",
                  }}
                >
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    ÉLÈVE
                  </div>

                  <div
                    style={{
                      color: "#111827",
                      fontSize: "24px",
                      fontWeight: 800,
                      marginTop: "3px",
                    }}
                  >
                    {fullName}
                  </div>
                </div>

                <CardInfo
                  label="Date de naissance"
                  value={birthDate}
                />

                <CardInfo
                  label="Matricule"
                  value={studentCode}
                />

                <CardInfo
                  label="Classe"
                  value={className}
                />

                <CardInfo
                  label="Année scolaire"
                  value={schoolYear}
                />

                <CardInfo
                  label="Établissement"
                  value={schoolName}
                />

                {schoolAddress && (
                  <CardInfo
                    label="Adresse"
                    value={schoolAddress}
                  />
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "14px 20px",
              background: "#f8fafc",
              borderTop:
                "1px solid #e5e7eb",
              display: "flex",
              justifyContent:
                "space-between",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "12px",
              }}
            >
              École Connectée — Carte scolaire numérique
            </div>

            <div
              style={{
                color: "#4f46e5",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              QR Code sécurisé
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "18px",
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              border:
                "1px solid #d1d5db",
              background: "#fff",
              color: "#374151",
              padding: "11px 18px",
              borderRadius: "9px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Fermer
          </button>

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            style={{
              border: "none",
              background: "#4f46e5",
              color: "#fff",
              padding: "11px 18px",
              borderRadius: "9px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🖨️ Imprimer la carte
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STUDENT DASHBOARD
========================================================= */

export default function StudentDashboard({
  profile,
  session,
  onLogout,
}) {
  const [activePage, setActivePage] =
    useState("home");

  const [navigationHistory, setNavigationHistory] =
    useState(["home"]);

  const [studentData, setStudentData] =
    useState(null);

  const [studentLoading, setStudentLoading] =
    useState(true);

  const [studentError, setStudentError] =
    useState("");

  const [subjects, setSubjects] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [exercises, setExercises] =
    useState([]);

  const [assessments, setAssessments] =
    useState([]);

  const [grades, setGrades] =
    useState([]);

  const [academicLoading, setAcademicLoading] =
    useState(false);

  const [academicError, setAcademicError] =
    useState("");

  /* =======================================================
     NOUVEAU : PRÉSENCES
  ======================================================= */

  const [attendance, setAttendance] =
    useState([]);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [attendanceError, setAttendanceError] =
    useState("");

  /* =========================================================
   COMMUNICATION ÉLÈVE
   PROFESSEUR ↔ ÉLÈVE
========================================================= */

const [communicationConversations, setCommunicationConversations] =
  useState([]);

const [communicationMessages, setCommunicationMessages] =
  useState([]);

const [selectedCommunicationConversation, setSelectedCommunicationConversation] =
  useState(null);

const [communicationLoading, setCommunicationLoading] =
  useState(false);

const [communicationError, setCommunicationError] =
  useState("");

const [communicationSending, setCommunicationSending] =
  useState(false);

const [communicationNewMessage, setCommunicationNewMessage] =
  useState("");

const [unreadCommunicationCount, setUnreadCommunicationCount] =
  useState(0);


/* =========================================================
   CHARGER LES CONVERSATIONS + MESSAGES
========================================================= */

async function loadCommunication() {
  const connectedUserId =
    profile?.id || session?.user?.id;

  const schoolId =
    profile?.school_id;

  if (!connectedUserId || !schoolId) {
    return;
  }

   setCommunicationError("");

  try {
    /*
     * Retrouver l'élève connecté.
     */
    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("students")
      .select(`
        id,
        profile_id,
        school_id,
        active
      `)
      .eq("profile_id", connectedUserId)
      .eq("school_id", schoolId)
      .eq("active", true)
      .maybeSingle();

    if (studentError) {
      throw studentError;
    }

    if (!student) {
      setCommunicationConversations([]);
      setCommunicationMessages([]);
      setUnreadCommunicationCount(0);
      setCommunicationError(
        "Votre dossier élève n'a pas été trouvé."
      );
      return;
    }

    /*
     * Récupérer les conversations de l'élève.
     *
     * IMPORTANT :
     * On ne dépend PAS des messages.
     * Une conversation peut donc être affichée
     * même si elle contient encore 0 message.
     */
    const {
      data: conversationRows,
      error: conversationError,
    } = await supabase
      .from("communication_conversations")
      .select(`
        id,
        school_id,
        teacher_id,
        student_id,
        created_at,
        updated_at
      `)
      .eq("student_id", student.id)
      .eq("school_id", schoolId)
      .order("updated_at", {
        ascending: false,
      });

    if (conversationError) {
      throw conversationError;
    }

    const rows =
      conversationRows || [];

    /*
     * Récupérer les professeurs associés
     * aux conversations.
     */
    const teacherIds = [
      ...new Set(
        rows
          .map(
            (conversation) =>
              conversation.teacher_id
          )
          .filter(Boolean)
          .map(String)
      ),
    ];

    let teacherMap = new Map();

    if (teacherIds.length > 0) {
      const {
        data: teacherRows,
        error: teacherError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          school_id,
          full_name,
          role,
          active
        `)
        .eq("school_id", schoolId)
        .eq("role", "teacher")
        .eq("active", true)
        .in("id", teacherIds);

      if (teacherError) {
        throw teacherError;
      }

      teacherMap = new Map(
        (teacherRows || []).map(
          (teacher) => [
            String(teacher.id),
            teacher,
          ]
        )
      );
    }

    /*
     * Préparer les conversations.
     */
    const normalizedConversations =
      rows.map((conversation) => {
        const teacher =
          teacherMap.get(
            String(
              conversation.teacher_id
            )
          );

        return {
          ...conversation,

          teacher_name:
            teacher?.full_name ||
            "Enseignant",

          teacher_id:
            conversation.teacher_id,

          last_message: null,

          unread_count: 0,
        };
      });

    /*
     * Charger les messages uniquement
     * s'il existe des conversations.
     */
    let normalizedMessages = [];

    const conversationIds =
      rows
        .map(
          (conversation) =>
            conversation.id
        )
        .filter(Boolean);

    if (conversationIds.length > 0) {
      const {
        data: messageRows,
        error: messagesError,
      } = await supabase
        .from("communication_messages")
        .select(`
          id,
          conversation_id,
          school_id,
          sender_profile_id,
          message,
          read_at,
          created_at,
          updated_at
        `)
        .eq("school_id", schoolId)
        .in(
          "conversation_id",
          conversationIds
        )
        .order("created_at", {
          ascending: true,
        });

      if (messagesError) {
        throw messagesError;
      }

      normalizedMessages =
        (messageRows || []).map(
          (message) => {
            const conversation =
              rows.find(
                (item) =>
                  String(item.id) ===
                  String(
                    message.conversation_id
                  )
              );

            const teacher =
              teacherMap.get(
                String(
                  conversation?.teacher_id
                )
              );

            return {
              ...message,

              teacher_name:
                teacher?.full_name ||
                "Enseignant",

              teacher_id:
                conversation?.teacher_id ||
                null,
            };
          }
        );
    }

    /*
     * Calculer le dernier message
     * et le nombre de messages non lus
     * pour chaque conversation.
     */
    const conversationsWithStats =
      normalizedConversations.map(
        (conversation) => {
          const conversationMessages =
            normalizedMessages.filter(
              (message) =>
                String(
                  message.conversation_id
                ) ===
                String(
                  conversation.id
                )
            );

          const lastMessage =
            conversationMessages[
              conversationMessages.length - 1
            ];

          const unreadCount =
            conversationMessages.filter(
              (message) =>
                !message.read_at &&
                String(
                  message.sender_profile_id
                ) !==
                  String(
                    connectedUserId
                  )
            ).length;

          return {
            ...conversation,

            last_message:
              lastMessage || null,

            unread_count:
              unreadCount,
          };
        }
      );

    /*
     * Nombre total de messages non lus.
     */
    const totalUnread =
      normalizedMessages.filter(
        (message) =>
          !message.read_at &&
          String(
            message.sender_profile_id
          ) !==
            String(connectedUserId)
      ).length;

    setCommunicationConversations(
      conversationsWithStats
    );

    setCommunicationMessages(
      normalizedMessages
    );

    setUnreadCommunicationCount(
      totalUnread
    );

    /*
     * Si aucune conversation n'était
     * sélectionnée, on sélectionne
     * automatiquement la première.
     */
    if (
      !selectedCommunicationConversation &&
      conversationsWithStats.length > 0
    ) {
      setSelectedCommunicationConversation(
        conversationsWithStats[0]
      );
    } else if (
      selectedCommunicationConversation
    ) {
      const updatedSelected =
        conversationsWithStats.find(
          (conversation) =>
            String(
              conversation.id
            ) ===
            String(
              selectedCommunicationConversation.id
            )
        );

      if (updatedSelected) {
        setSelectedCommunicationConversation(
          updatedSelected
        );
      }
    }
  } catch (err) {
    console.error(
      "Erreur communication élève :",
      err
    );

    setCommunicationError(
      err?.message ||
        "Impossible de charger votre communication."
    );
  } finally {
    setCommunicationLoading(false);
  }
}


/* =========================================================
   CHARGEMENT INITIAL + ACTUALISATION
========================================================= */

useEffect(() => {
  loadCommunication();

  /*
   * Actualisation automatique toutes les 5 secondes.
   * Cela permet à l'élève de recevoir les nouveaux
   * messages du professeur sans recharger la page.
   */
  const interval = setInterval(
    () => {
      loadCommunication();
    },
    5000
  );

  return () => {
    clearInterval(interval);
  };
}, [
  profile?.id,
  profile?.school_id,
  session?.user?.id,
]);


/* =========================================================
   MARQUER UN MESSAGE COMME LU
========================================================= */

async function markCommunicationMessageAsRead(
  messageId
) {
  const connectedUserId =
    profile?.id || session?.user?.id;

  const schoolId =
    profile?.school_id;

  if (
    !messageId ||
    !connectedUserId ||
    !schoolId
  ) {
    return;
  }

  const currentMessage =
    communicationMessages.find(
      (item) =>
        String(item.id) ===
        String(messageId)
    );

  if (!currentMessage) {
    return;
  }

  /*
   * Si déjà lu ou envoyé par l'élève,
   * aucune action nécessaire.
   */
  if (
    currentMessage.read_at ||
    String(
      currentMessage.sender_profile_id
    ) ===
      String(connectedUserId)
  ) {
    return;
  }

  const now =
    new Date().toISOString();

  const {
    error,
  } = await supabase
    .from("communication_messages")
    .update({
      read_at: now,
    })
    .eq("id", messageId)
    .eq("school_id", schoolId);

  if (error) {
    console.error(
      "Erreur lecture message :",
      error
    );

    return;
  }

  setCommunicationMessages(
    (current) =>
      current.map((item) =>
        String(item.id) ===
        String(messageId)
          ? {
              ...item,
              read_at: now,
            }
          : item
      )
  );

  /*
   * Recalculer le compteur.
   */
  setUnreadCommunicationCount(
    (current) =>
      Math.max(0, current - 1)
  );

  /*
   * Actualiser la conversation.
   */
  await loadCommunication();
}
async function sendCommunicationMessage() {
  const connectedUserId =
    profile?.id || session?.user?.id;

  const schoolId = profile?.school_id;

  const conversationId =
    selectedCommunicationConversation?.id;

  const messageText =
    communicationNewMessage.trim();

  if (
    !connectedUserId ||
    !schoolId ||
    !conversationId ||
    !messageText
  ) {
    return;
  }

  setCommunicationSending(true);
  setCommunicationError("");

  try {
    const { data, error } = await supabase
      .from("communication_messages")
      .insert({
        conversation_id: conversationId,
        school_id: schoolId,
        sender_profile_id: connectedUserId,
        message: messageText,
      })
      .select(`
        id,
        conversation_id,
        school_id,
        sender_profile_id,
        message,
        read_at,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    const teacherName =
      selectedCommunicationConversation?.teacher_name ||
      "Enseignant";

    const newMessage = {
      ...data,
      teacher_name: teacherName,
      teacher_id:
        selectedCommunicationConversation?.teacher_id ||
        null,
    };

    setCommunicationMessages((current) => [
      ...current,
      newMessage,
    ]);

    setCommunicationConversations((current) =>
      current.map((conversation) =>
        String(conversation.id) ===
        String(conversationId)
          ? {
              ...conversation,
              last_message: newMessage,
              updated_at: newMessage.created_at,
            }
          : conversation
      )
    );

    setCommunicationNewMessage("");
  } catch (err) {
    console.error(
      "Erreur envoi message élève :",
      err
    );

    setCommunicationError(
      err?.message ||
        "Impossible d'envoyer le message."
    );
  } finally {
    setCommunicationSending(false);
  }
}

/* =========================================================
   ENVOYER UN MESSAGE
========================================================= */

async function sendCommunicationMessage() {
  const connectedUserId =
    profile?.id || session?.user?.id;

  const schoolId =
    profile?.school_id;

  const conversation =
    selectedCommunicationConversation;

  const text =
    communicationNewMessage.trim();

  if (
    !connectedUserId ||
    !schoolId ||
    !conversation ||
    !text
  ) {
    return;
  }

  setCommunicationSending(true);
  setCommunicationError("");

  try {
    const {
      error,
    } = await supabase
      .from("communication_messages")
      .insert({
        conversation_id:
          conversation.id,

        school_id:
          schoolId,

        sender_profile_id:
          connectedUserId,

        message:
          text,

        read_at:
          null,
      });

    if (error) {
      throw error;
    }

    setCommunicationNewMessage("");

    /*
     * Recharger immédiatement
     * la conversation après l'envoi.
     */
    await loadCommunication();
  } catch (err) {
    console.error(
      "Erreur envoi message élève :",
      err
    );

    setCommunicationError(
      err?.message ||
        "Impossible d'envoyer le message."
    );
  } finally {
    setCommunicationSending(false);
  }
}

  /* =======================================================
     DOSSIER ÉLÈVE
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadStudentDossier() {
      const connectedUserId =
        profile?.id || session?.user?.id;

      const schoolId =
        profile?.school_id;

      if (!connectedUserId || !schoolId) {
        if (!cancelled) {
          setStudentLoading(false);
          setStudentError(
            "Impossible d'identifier le compte élève connecté."
          );
        }
        return;
      }

      setStudentLoading(true);
      setStudentError("");

      const {
        data: student,
        error,
      } = await supabase
        .from("students")
        .select(`
          id,
          profile_id,
          school_id,
          class_id,
          first_name,
          last_name,
          student_code,
          photo_url,
          active,
          created_at,
          date_of_birth,
          birth_place,
          family_identifier,
          login_identifier,
          qr_token
        `)
        .eq("profile_id", connectedUserId)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (error) {
        console.error(
          "Erreur dossier élève :",
          error
        );

        if (!cancelled) {
          setStudentError(
            "Impossible de charger votre dossier élève."
          );
          setStudentLoading(false);
        }

        return;
      }

      if (!student) {
        if (!cancelled) {
          setStudentError(
            "Dossier élève introuvable pour ce compte."
          );
          setStudentLoading(false);
        }

        return;
      }

      let classData = null;

      if (student.class_id) {
        const { data } =
          await supabase
            .from("classes")
            .select("id,name,level")
            .eq("id", student.class_id)
            .eq("school_id", student.school_id)
            .maybeSingle();

        classData = data || null;
      }

      let schoolData = null;

      if (student.school_id) {
        const { data } =
          await supabase
            .from("schools")
            .select(`
              id,
              name,
              address,
              city,
              phone,
              email,
              logo_url,
              stamp_url,
              signature_url
            `)
            .eq("id", student.school_id)
            .maybeSingle();

        schoolData = data || null;
      }

      const generatedFullName =
        `${student.first_name || ""} ${student.last_name || ""}`.trim();

      const synchronizedStudent = {
        ...student,

        full_name:
          generatedFullName ||
          profile?.full_name ||
          "Élève",

        class_name:
          classData?.name || "",

        class_level:
          classData?.level || "",

        school_name:
          schoolData?.name ||
          profile?.school_name ||
          "",

        school_logo_url:
          schoolData?.logo_url || null,

        school_address:
          schoolData?.address || "",

        school_city:
          schoolData?.city || "",

        school_phone:
          schoolData?.phone || "",

        school_email:
          schoolData?.email || "",

        school_stamp_url:
          schoolData?.stamp_url || null,

        school_signature_url:
          schoolData?.signature_url || null,
      };

      if (!cancelled) {
        setStudentData(
          synchronizedStudent
        );
        setStudentLoading(false);
        setStudentError("");
      }
    }

    loadStudentDossier();

    return () => {
      cancelled = true;
    };
  }, [
    profile?.id,
    profile?.school_id,
    session?.user?.id,
  ]);

  /* =======================================================
     DONNÉES ACADÉMIQUES — CONSERVÉES
  ======================================================= */

    useEffect(() => {
    let cancelled = false;

    async function loadAcademicData() {
      const connectedUserId =
        profile?.id || session?.user?.id;

      const schoolId =
        profile?.school_id;

      if (!connectedUserId || !schoolId) {
        return;
      }

      setAcademicLoading(true);
      setAcademicError("");

      const {
        data: student,
        error: studentErrorQuery,
      } = await supabase
        .from("students")
        .select(
          "id,profile_id,school_id,class_id"
        )
        .eq("profile_id", connectedUserId)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (studentErrorQuery || !student) {
        if (!cancelled) {
          setAcademicError(
            "Impossible de récupérer les données scolaires."
          );
          setAcademicLoading(false);
        }
        return;
      }

      const {
        data: subjectRows,
      } = await supabase
        .from("subjects")
        .select("id,name,school_id")
        .eq("school_id", schoolId)
        .order("name");

      const subjectList =
        subjectRows || [];

      const subjectMap =
        new Map(
          subjectList.map(
            (subject) => [
              String(subject.id),
              subject,
            ]
          )
        );

      let courseRows = [];

      if (student.class_id) {
        const { data } =
          await supabase
            .from("learning_contents")
            .select(`
              id,
              school_id,
              teacher_id,
              class_id,
              subject_id,
              title,
              description,
              content_type,
              content_url,
              file_url,
              thumbnail_url,
              published,
              created_at,
              updated_at
            `)
            .eq("school_id", schoolId)
            .eq("class_id", student.class_id)
            .eq("published", true)
            .order("created_at", {
              ascending: false,
            });

        courseRows = data || [];
      }

      const normalizedCourses =
        await Promise.all(
          courseRows.map(async (course) => {
            let fileSignedUrl = null;

            if (course.file_url) {
              const {
                data: signedData,
                error: signedError,
              } = await supabase.storage
                .from("teacher-content")
                .createSignedUrl(
                  course.file_url,
                  3600
                );

              if (
                !signedError &&
                signedData?.signedUrl
              ) {
                fileSignedUrl =
                  signedData.signedUrl;
              } else if (signedError) {
                console.error(
                  "Erreur URL sécurisée du fichier :",
                  signedError
                );
              }
            }

            return {
              ...course,

              subject_name:
                subjectMap.get(
                  String(course.subject_id)
                )?.name ||
                "Matière non renseignée",

              file_signed_url:
                fileSignedUrl,
            };
          })
        );

      let exerciseRows = [];

      if (student.class_id) {
        const { data } =
          await supabase
            .from("exercises")
            .select(`
              id,
              school_id,
              teacher_id,
              class_id,
              subject_id,
              title,
              description,
              instructions,
              duration_minutes,
              published,
              due_at,
              created_at,
              updated_at,
              file_url,
              file_name
            `)
            .eq("school_id", schoolId)
            .eq("class_id", student.class_id)
            .eq("published", true)
            .order("created_at", {
              ascending: false,
            });

        exerciseRows = data || [];
      }

      const normalizedExercises =
        exerciseRows.map((exercise) => ({
          ...exercise,

          subject_name:
            subjectMap.get(
              String(exercise.subject_id)
            )?.name ||
            "Matière non renseignée",
        }));

      let assessmentRows = [];

      if (student.class_id) {
        const { data } =
          await supabase
            .from("assessments")
            .select(`
              id,
              school_id,
              teacher_id,
              class_id,
              subject_id,
              title,
              description,
              assessment_type,
              max_score,
              evaluation_date,
              coefficient,
              published,
              created_at,
              updated_at,
              trimester,
              assessment_slot
            `)
            .eq("school_id", schoolId)
            .eq("class_id", student.class_id)
            .eq("published", true)
            .order("evaluation_date", {
              ascending: true,
            });

        assessmentRows = data || [];
      }

      const normalizedAssessments =
        assessmentRows.map(
          (assessment) => ({
            ...assessment,

            subject_name:
              subjectMap.get(
                String(
                  assessment.subject_id
                )
              )?.name ||
              "Matière non renseignée",
          })
        );

      const studentIdentifiers = [
        student.id,
        student.profile_id,
      ].filter(Boolean);

      let gradeRows = [];

      if (studentIdentifiers.length) {
        const { data } =
          await supabase
            .from("grades")
            .select(`
              id,
              assessment_id,
              student_id,
              teacher_id,
              school_id,
              score,
              appreciation,
              stars,
              comment,
              created_at,
              updated_at
            `)
            .eq("school_id", schoolId)
            .in(
              "student_id",
              studentIdentifiers
            )
            .order("created_at", {
              ascending: false,
            });

        gradeRows = data || [];
      }

      const assessmentMap =
        new Map(
          normalizedAssessments.map(
            (assessment) => [
              String(assessment.id),
              assessment,
            ]
          )
        );

      const normalizedGrades =
  gradeRows.map((grade) => {
    const assessment =
      assessmentMap.get(
        String(grade.assessment_id)
      );

    const subjectId =
      grade.subject_id ??
      assessment?.subject_id ??
      null;

    const subject =
      subjectMap.get(
        String(subjectId)
      );

    return {
      ...grade,

      subject_id: subjectId,

      subject_name:
        subject?.name ||
        assessment?.subject_name ||
        "Matière non renseignée",

      assessment_title:
        assessment?.title ||
        "Évaluation",

      assessment_date:
        grade.evaluation_date ??
        assessment?.evaluation_date ??
        null,

      max_score:
        grade.max_score ??
        assessment?.max_score ??
        20,

      coefficient:
        grade.coefficient ??
        assessment?.coefficient ??
        1,
    };
  });

if (!cancelled) {
  setSubjects(subjectList);
  setCourses(normalizedCourses);
  setExercises(normalizedExercises);
  setAssessments(
    normalizedAssessments
  );
  setGrades(normalizedGrades);
  setAcademicLoading(false);
}
}

loadAcademicData();

return () => {
  cancelled = true;
};
}, [
profile?.id,
profile?.school_id,
session?.user?.id,
]);

// REALTIME : actualiser automatiquement
// les contenus scolaires et les notes
useEffect(() => {
const connectedUserId =
  profile?.id || session?.user?.id;

const schoolId =
  profile?.school_id;

if (!connectedUserId || !schoolId) {
  return;
}

const refreshAcademicData = async () => {
  try {
    const {
      data: studentData,
      error: studentError,
    } = await supabase
      .from("students")
      .select(
        "id,profile_id,school_id,class_id"
      )
      .eq("profile_id", connectedUserId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (studentError || !studentData) {
      console.error(
        "Erreur actualisation élève :",
        studentError
      );
      return;
    }

    const { data: subjectRows } =
      await supabase
        .from("subjects")
        .select("id,name,school_id")
        .eq("school_id", schoolId)
        .order("name");

    const subjectList =
      subjectRows || [];

    const subjectMap =
      new Map(
        subjectList.map(
          (subject) => [
            String(subject.id),
            subject,
          ]
        )
      );

    let courseRows = [];
    let exerciseRows = [];
    let assessmentRows = [];
    let gradeRows = [];

    if (studentData.class_id) {
      const { data: courses } =
        await supabase
          .from("learning_contents")
          .select(`
            id,
            school_id,
            teacher_id,
            class_id,
            subject_id,
            title,
            description,
            content_type,
            content_url,
            file_url,
            thumbnail_url,
            published,
            created_at,
            updated_at
          `)
          .eq("school_id", schoolId)
          .eq(
            "class_id",
            studentData.class_id
          )
          .eq("published", true)
          .order("created_at", {
            ascending: false,
          });

      courseRows = courses || [];

      const { data: exercises } =
        await supabase
          .from("exercises")
          .select(`
            id,
            school_id,
            teacher_id,
            class_id,
            subject_id,
            title,
            description,
            instructions,
            duration_minutes,
            published,
            due_at,
            created_at,
            updated_at,
            file_url,
            file_name
          `)
          .eq("school_id", schoolId)
          .eq(
            "class_id",
            studentData.class_id
          )
          .eq("published", true)
          .order("created_at", {
            ascending: false,
          });

      exerciseRows = exercises || [];

      const { data: assessments } =
        await supabase
          .from("assessments")
          .select(`
            id,
            school_id,
            teacher_id,
            class_id,
            subject_id,
            title,
            description,
            assessment_type,
            max_score,
            evaluation_date,
            coefficient,
            published,
            created_at,
            updated_at,
            trimester,
            assessment_slot
          `)
          .eq("school_id", schoolId)
          .eq(
            "class_id",
            studentData.class_id
          )
          .eq("published", true)
          .order("evaluation_date", {
            ascending: true,
          });

      assessmentRows =
        assessments || [];
    }

    const studentIdentifiers = [
      studentData.id,
      studentData.profile_id,
    ].filter(Boolean);

    if (studentIdentifiers.length) {
      const { data: grades } =
        await supabase
          .from("grades")
          .select(`
            id,
            assessment_id,
            student_id,
            teacher_id,
            school_id,
            score,
            appreciation,
            stars,
            comment,
            created_at,
            updated_at
          `)
          .eq("school_id", schoolId)
          .in(
            "student_id",
            studentIdentifiers
          )
          .order("created_at", {
            ascending: false,
          });

      gradeRows = grades || [];
    }

    const normalizedCourses =
      await Promise.all(
        courseRows.map(
          async (course) => {
            let fileSignedUrl = null;

            if (course.file_url) {
              const {
                data: signedData,
                error: signedError,
              } =
                await supabase.storage
                  .from(
                    "teacher-content"
                  )
                  .createSignedUrl(
                    course.file_url,
                    3600
                  );

              if (
                !signedError &&
                signedData?.signedUrl
              ) {
                fileSignedUrl =
                  signedData.signedUrl;
              }
            }

            return {
              ...course,

              subject_name:
                subjectMap.get(
                  String(
                    course.subject_id
                  )
                )?.name ||
                "Matière non renseignée",

              file_signed_url:
                fileSignedUrl,
            };
          }
        )
      );

    const normalizedExercises =
      exerciseRows.map(
        (exercise) => ({
          ...exercise,

          subject_name:
            subjectMap.get(
              String(
                exercise.subject_id
              )
            )?.name ||
            "Matière non renseignée",
        })
      );

    const normalizedAssessments =
      assessmentRows.map(
        (assessment) => ({
          ...assessment,

          subject_name:
            subjectMap.get(
              String(
                assessment.subject_id
              )
            )?.name ||
            "Matière non renseignée",
        })
      );

    /*
     * IMPORTANT :
     * On garde normalizedAssessments limité
     * aux évaluations publiées pour l'espace élève.
     *
     * Mais pour les notes, on récupère aussi
     * les évaluations directement liées aux notes,
     * même si elles ne sont pas publiées.
     */
    const gradeAssessmentIds = [
      ...new Set(
        gradeRows
          .map(
            (grade) =>
              grade.assessment_id
          )
          .filter(Boolean)
          .map(String)
      ),
    ];

    let gradeAssessmentRows = [];

    if (gradeAssessmentIds.length) {
      const {
        data: gradeAssessments,
        error:
          gradeAssessmentsError,
      } = await supabase
        .from("assessments")
        .select(`
          id,
          school_id,
          teacher_id,
          class_id,
          subject_id,
          title,
          max_score,
          evaluation_date,
          coefficient
        `)
        .eq(
          "school_id",
          schoolId
        )
        .in(
          "id",
          gradeAssessmentIds
        );

      if (gradeAssessmentsError) {
        console.error(
          "Erreur récupération des évaluations liées aux notes :",
          gradeAssessmentsError
        );
      }

      gradeAssessmentRows =
        gradeAssessments || [];
    }

    /*
     * On combine :
     * - les évaluations publiées
     * - les évaluations liées aux notes
     */
    const assessmentMap =
      new Map(
        [
          ...normalizedAssessments,

          ...gradeAssessmentRows.map(
            (assessment) => ({
              ...assessment,

              subject_name:
                subjectMap.get(
                  String(
                    assessment.subject_id
                  )
                )?.name ||
                "Matière non renseignée",
            })
          ),
        ].map(
          (assessment) => [
            String(
              assessment.id
            ),
            assessment,
          ]
        )
      );

    const normalizedGrades =
      gradeRows.map((grade) => {
        const assessment =
          assessmentMap.get(
            String(
              grade.assessment_id
            )
          );

        const subjectId =
          grade.subject_id ??
          assessment?.subject_id ??
          null;

        const subject =
          subjectMap.get(
            String(subjectId)
          );

        return {
          ...grade,

          subject_id:
            subjectId,

          subject_name:
            subject?.name ||
            assessment?.subject_name ||
            "Matière non renseignée",

          assessment_title:
            assessment?.title ||
            "Évaluation",

          assessment_date:
            grade.evaluation_date ??
            assessment?.evaluation_date ??
            null,

          max_score:
            grade.max_score ??
            assessment?.max_score ??
            20,

          coefficient:
            grade.coefficient ??
            assessment?.coefficient ??
            1,
        };
      });

    setSubjects(subjectList);

    setCourses(
      normalizedCourses
    );

    setExercises(
      normalizedExercises
    );

    setAssessments(
      normalizedAssessments
    );

    setGrades(
      normalizedGrades
    );

    console.log(
      "Contenus scolaires et notes actualisés automatiquement."
    );
  } catch (error) {
    console.error(
      "Erreur Realtime École Connectée :",
      error
    );
  }
};

const channel =
  supabase
    .channel(
      `student-academic-${schoolId}-${connectedUserId}`
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "learning_contents",
        filter: `school_id=eq.${schoolId}`,
      },
      () => {
        refreshAcademicData();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "exercises",
        filter: `school_id=eq.${schoolId}`,
      },
      () => {
        refreshAcademicData();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "assessments",
        filter: `school_id=eq.${schoolId}`,
      },
      () => {
        refreshAcademicData();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "grades",
        filter: `school_id=eq.${schoolId}`,
      },
      () => {
        refreshAcademicData();
      }
    )
    .subscribe();

return () => {
  supabase.removeChannel(
    channel
  );
};
}, [
profile?.id,
profile?.school_id,
session?.user?.id,
]);
  /* =======================================================
     PRÉSENCES — NOUVELLE FONCTION
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      const connectedUserId =
        profile?.id || session?.user?.id;

      const schoolId =
        profile?.school_id;

      if (!connectedUserId || !schoolId) {
        return;
      }

      setAttendanceLoading(true);
      setAttendanceError("");

      const { data: student, error: studentError } =
        await supabase
          .from("students")
          .select(
            "id,profile_id,school_id,class_id"
          )
          .eq("profile_id", connectedUserId)
          .eq("school_id", schoolId)
          .maybeSingle();

      if (studentError || !student) {
        if (!cancelled) {
          setAttendance([]);
          setAttendanceError(
            "Impossible de retrouver votre dossier de présence."
          );
          setAttendanceLoading(false);
        }
        return;
      }

      let query = supabase
        .from("attendance")
        .select(`
          id,
          student_id,
          class_id,
          attendance_date,
          status,
          justification,
          justified,
          created_at
        `)
        .eq("student_id", student.id)
        .eq("class_id", student.class_id)
        .order("attendance_date", {
          ascending: false,
        });

      const { data, error } =
        await query;

      if (error) {
        console.error(
          "Erreur chargement présences :",
          error
        );

        if (!cancelled) {
          setAttendance([]);
          setAttendanceError(
            "Impossible de charger vos présences."
          );
          setAttendanceLoading(false);
        }

        return;
      }

      if (!cancelled) {
        setAttendance(data || []);
        setAttendanceLoading(false);
      }
    }

    loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [
    profile?.id,
    profile?.school_id,
    session?.user?.id,
  ]);

  /* =======================================================
   COMMUNICATION — NOUVELLE FONCTION
   Élève ↔ Professeur
======================================================= */

useEffect(() => {
  let cancelled = false;

  async function loadCommunication() {
    const connectedUserId =
      profile?.id || session?.user?.id;

    const schoolId =
      profile?.school_id;

    if (!connectedUserId || !schoolId) {
      return;
    }

    setCommunicationLoading(true);
    setCommunicationError("");

    /* =====================================================
       RETROUVER LE DOSSIER ÉLÈVE
    ===================================================== */

    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("students")
      .select(
        "id,profile_id,school_id"
      )
      .eq("profile_id", connectedUserId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (studentError || !student) {
      if (!cancelled) {
        setCommunicationMessages([]);
        setUnreadCommunicationCount(0);
        setCommunicationError(
          "Impossible de retrouver votre espace de communication."
        );
        setCommunicationLoading(false);
      }

      return;
    }

    /* =====================================================
       CONVERSATIONS DE L'ÉLÈVE
    ===================================================== */

    const {
      data: conversations,
      error: conversationsError,
    } = await supabase
      .from("communication_conversations")
      .select(`
        id,
        school_id,
        teacher_id,
        student_id,
        created_at,
        updated_at
      `)
      .eq("student_id", student.id)
      .eq("school_id", schoolId)
      .order("updated_at", {
        ascending: false,
      });

    if (conversationsError) {
      console.error(
        "Erreur conversations :",
        conversationsError
      );

      if (!cancelled) {
        setCommunicationMessages([]);
        setUnreadCommunicationCount(0);
        setCommunicationError(
          "Impossible de charger vos conversations."
        );
        setCommunicationLoading(false);
      }

      return;
    }

    const conversationRows =
      conversations || [];

    if (!conversationRows.length) {
      if (!cancelled) {
        setCommunicationMessages([]);
        setUnreadCommunicationCount(0);
        setCommunicationLoading(false);
      }

      return;
    }

    const conversationIds =
      conversationRows.map(
        (item) => item.id
      );

    /* =====================================================
       PROFESSEURS
       IMPORTANT :
       Les enseignants sont dans profiles,
       pas dans une table teachers.
    ===================================================== */

    const teacherIds = [
      ...new Set(
        conversationRows
          .map(
            (item) => item.teacher_id
          )
          .filter(Boolean)
      ),
    ];

    let teacherMap = new Map();

    if (teacherIds.length) {
      const {
        data: teacherRows,
        error: teacherError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          school_id,
          full_name,
          role,
          active
        `)
        .eq("school_id", schoolId)
        .eq("role", "teacher")
        .in("id", teacherIds);

      if (teacherError) {
        console.error(
          "Erreur chargement enseignants :",
          teacherError
        );
      }

      teacherMap = new Map(
        (teacherRows || []).map(
          (teacher) => [
            String(teacher.id),
            teacher,
          ]
        )
      );
    }

    /* =====================================================
       MESSAGES
    ===================================================== */

    const {
      data: messages,
      error: messagesError,
    } = await supabase
      .from("communication_messages")
      .select(`
        id,
        conversation_id,
        school_id,
        sender_profile_id,
        message,
        read_at,
        created_at,
        updated_at
      `)
      .eq("school_id", schoolId)
      .in(
        "conversation_id",
        conversationIds
      )
      .order("created_at", {
        ascending: false,
      });

    if (messagesError) {
      console.error(
        "Erreur messages :",
        messagesError
      );

      if (!cancelled) {
        setCommunicationMessages([]);
        setUnreadCommunicationCount(0);
        setCommunicationError(
          "Impossible de charger vos messages."
        );
        setCommunicationLoading(false);
      }

      return;
    }

    /* =====================================================
       ASSOCIATION MESSAGE ↔ CONVERSATION ↔ PROFESSEUR
    ===================================================== */

    const conversationMap =
      new Map(
        conversationRows.map(
          (conversation) => [
            String(conversation.id),
            conversation,
          ]
        )
      );

    const normalizedMessages =
      (messages || []).map(
        (message) => {
          const conversation =
            conversationMap.get(
              String(
                message.conversation_id
              )
            );

          const teacher =
            teacherMap.get(
              String(
                conversation?.teacher_id
              )
            );

          return {
            ...message,

            teacher_name:
              teacher?.full_name ||
              "Enseignant",

            teacher_id:
              conversation?.teacher_id ||
              null,
          };
        }
      );

    /* =====================================================
       COMPTEUR DES MESSAGES NON LUS
       Exemple : 1
    ===================================================== */

    const unreadCount =
      normalizedMessages.filter(
        (message) =>
          !message.read_at &&
          message.sender_profile_id !==
            connectedUserId
      ).length;

    if (!cancelled) {
      setCommunicationMessages(
        normalizedMessages
      );

      setUnreadCommunicationCount(
        unreadCount
      );

      setCommunicationLoading(false);
    }
  }

  loadCommunication();

  return () => {
    cancelled = true;
  };
}, [
  profile?.id,
  profile?.school_id,
  session?.user?.id,
]);

  /* =======================================================
     MARQUER UN MESSAGE COMME LU
  ======================================================= */

  async function markCommunicationMessageAsRead(
    messageId
  ) {
    const connectedUserId =
      profile?.id || session?.user?.id;

    const schoolId =
      profile?.school_id;

    if (
      !messageId ||
      !connectedUserId ||
      !schoolId
    ) {
      return;
    }

    const currentMessage =
      communicationMessages.find(
        (item) =>
          String(item.id) ===
          String(messageId)
      );

    if (
      !currentMessage ||
      currentMessage.read_at ||
      currentMessage.sender_profile_id ===
        connectedUserId
    ) {
      return;
    }

    const now =
      new Date().toISOString();

    const { error } =
      await supabase
        .from("communication_messages")
        .update({
          read_at: now,
        })
        .eq("id", messageId)
        .eq("school_id", schoolId);

    if (error) {
      console.error(
        "Erreur lecture message :",
        error
      );
      return;
    }

    setCommunicationMessages(
      (current) =>
        current.map((item) =>
          String(item.id) ===
          String(messageId)
            ? {
                ...item,
                read_at: now,
              }
            : item
        )
    );

    setUnreadCommunicationCount(
      (current) =>
        Math.max(0, current - 1)
    );
  }

  /* =======================================================
     PROFIL SYNCHRONISÉ
  ======================================================= */

  const dashboardProfile = {
    ...(profile || {}),
    ...(studentData || {}),
  };

  /* =======================================================
     COMPTEURS
  ======================================================= */

  const contentCounts = {
    courses: courses.length,
    exercises: exercises.length,
    assessments: assessments.length,
    grades: grades.length,
  };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function navigateTo(pageId) {
    if (
      !MENU.some(
        (item) => item.id === pageId
      )
    ) {
      return;
    }

    setActivePage(pageId);

    setNavigationHistory(
      (current) => [
        ...current,
        pageId,
      ]
    );
  }

  function goBack() {
    setNavigationHistory(
      (current) => {
        if (current.length <= 1) {
          setActivePage("home");
          return ["home"];
        }

        const newHistory =
          current.slice(0, -1);

        const previousPage =
          newHistory[
            newHistory.length - 1
          ];

        setActivePage(
          previousPage
        );

        return newHistory;
      }
    );
  }

  function handleMenuClick(
    pageId
  ) {
    if (pageId === activePage) {
      return;
    }

    navigateTo(pageId);
  }

  /* =======================================================
     PAGE ACTUELLE
  ======================================================= */

  function renderPage() {
    switch (activePage) {
      case "home":
        return (
          <HomePage
            profile={dashboardProfile}
            studentLoading={
              studentLoading
            }
            studentError={
              studentError
            }
            onNavigate={
              navigateTo
            }
            contentCounts={
              contentCounts
            }
          />
        );

      case "courses":
        return (
          <CoursesPage
            onBack={goBack}
            courses={courses}
            subjects={subjects}
            loading={
              academicLoading
            }
            error={
              academicError
            }
          />
        );

      case "exercises":
        return (
          <ExercisesPage
            onBack={goBack}
            exercises={exercises}
            subjects={subjects}
            loading={
              academicLoading
            }
            error={
              academicError
            }
          />
        );

      case "assessments":
        return (
          <AssessmentsPage
            onBack={goBack}
            assessments={
              assessments
            }
            subjects={subjects}
            loading={
              academicLoading
            }
            error={
              academicError
            }
          />
        );

      case "grades":
        return (
          <GradesPage
            onBack={goBack}
            grades={grades}
            subjects={subjects}
            loading={
              academicLoading
            }
            error={
              academicError
            }
          />
        );

      case "attendance":
        return (
          <AttendancePage
            onBack={goBack}
            attendance={
              attendance
            }
            loading={
              attendanceLoading
            }
            error={
              attendanceError
            }
          />
        );

      case "bulletins":
        return (
          <BulletinsPage
            onBack={goBack}
          />
        );

      case "communication":
  return (
    <CommunicationPage
      onBack={goBack}

      conversations={
        communicationConversations
      }

      messages={
        communicationMessages
      }

      selectedConversation={
        selectedCommunicationConversation
      }

      onSelectConversation={
        setSelectedCommunicationConversation
      }

      newMessage={
        communicationNewMessage
      }

      onNewMessage={
        setCommunicationNewMessage
      }

      onSendMessage={
        sendCommunicationMessage
      }

      sending={
        communicationSending
      }

      loading={
        communicationLoading
      }

      error={
        communicationError
      }

      onMarkRead={
        markCommunicationMessageAsRead
      }

      currentUserId={
        profile?.id ||
        session?.user?.id
      }
    />
  );

      case "school-card":
        return (
          <SchoolCardPage
            profile={
              dashboardProfile
            }
            onBack={goBack}
          />
        );

      default:
        return (
          <HomePage
            profile={
              dashboardProfile
            }
            studentLoading={
              studentLoading
            }
            studentError={
              studentError
            }
            onNavigate={
              navigateTo
            }
            contentCounts={
              contentCounts
            }
          />
        );
    }
  }

  const currentMenu =
    MENU.find(
      (item) =>
        item.id === activePage
    ) || MENU[0];

  const fullName =
    dashboardProfile?.full_name ||
    "Élève";

  /* =======================================================
     INTERFACE
  ======================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#111827",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "#fff",
          borderBottom:
            "1px solid #e5e7eb",
          minHeight: "70px",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "15px",
          padding: "12px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#eef2ff",
              color: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              fontWeight: 800,
            }}
          >
            EC
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: "15px",
              }}
            >
              École Connectée
            </div>

            <div
              style={{
                color: "#6b7280",
                fontSize: "12px",
                marginTop: "2px",
              }}
            >
              {currentMenu.icon}{" "}
              {currentMenu.label}
            </div>
          </div>
        </div>

        <div>
          {dashboardProfile?.photo_url ? (
            <img
              src={
                dashboardProfile.photo_url
              }
              alt={fullName}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#4f46e5",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              {getInitials(
                fullName
              )}
            </div>
          )}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          width: "100%",
        }}
      >
        <aside
          style={{
            width: "245px",
            background: "#fff",
            borderRight:
              "1px solid #e5e7eb",
            padding: "18px 12px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding:
                "8px 10px 14px",
              color: "#6b7280",
              fontSize: "11px",
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.08em",
            }}
          >
            Espace Élève
          </div>

          <nav
            style={{
              display: "flex",
              flexDirection:
                "column",
              gap: "5px",
            }}
          >
            {MENU.map((item) => {
              const active =
                item.id ===
                activePage;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleMenuClick(
                      item.id
                    )
                  }
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: "10px",
                    background:
                      active
                        ? "#eef2ff"
                        : "transparent",
                    color:
                      active
                        ? "#4f46e5"
                        : "#374151",
                    padding:
                      "11px 12px",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "11px",
                    cursor:
                      "pointer",
                    textAlign: "left",
                    fontSize: "14px",
                    fontWeight:
                      active
                        ? 700
                        : 500,
                  }}
                >
                  <span
                    style={{
                      width: "25px",
                      textAlign:
                        "center",
                      fontSize:
                        "18px",
                    }}
                  >
                    {item.icon}
                  </span>

                  <span
                    style={{
                      flex: 1,
                    }}
                  >
                    {item.label}
                  </span>

                  {item.id ===
                    "communication" &&
                    unreadCommunicationCount >
                      0 && (
                      <span
                        style={{
                          minWidth: "22px",
                          height: "22px",
                          padding:
                            "0 6px",
                          borderRadius:
                            "999px",
                          background:
                            "#dc2626",
                          color: "#fff",
                          display: "inline-flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontSize:
                            "11px",
                          fontWeight:
                            800,
                        }}
                      >
                        {unreadCommunicationCount}
                      </span>
                    )}
                </button>
              );
            })}
          </nav>

          <div
            style={{
              marginTop: "25px",
              borderTop:
                "1px solid #e5e7eb",
              paddingTop: "15px",
            }}
          >
            <button
              type="button"
              onClick={onLogout}
              style={{
                width: "100%",
                border:
                  "1px solid #fecaca",
                background:
                  "#fffafa",
                color:
                  "#dc2626",
                borderRadius:
                  "10px",
                padding:
                  "10px 12px",
                cursor:
                  "pointer",
                fontSize:
                  "14px",
                fontWeight:
                  700,
              }}
            >
              🚪 Déconnexion
            </button>
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "28px",
            overflowX:
              "hidden",
          }}
        >
          <div
            style={{
              maxWidth: "1180px",
              margin: "0 auto",
            }}
          >
            {renderPage()}
          </div>
        </main>
      </div>

      <style>
        {`
          @media (max-width: 760px) {
            aside {
              width: 205px !important;
            }

            main {
              padding: 18px !important;
            }
          }

          @media print {
            body {
              background: #ffffff !important;
            }

            header,
            aside,
            button {
              display: none !important;
            }

            main {
              padding: 0 !important;
            }
          }
        `}
      </style>
    </div>
  );
}
