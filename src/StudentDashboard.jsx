import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

/* =========================================================
   STUDENT DASHBOARD
   ÉCOLE CONNECTÉE V4

   - Menus réellement cliquables
   - Navigation interne
   - Bouton Retour fonctionnel
   - Synchronisation Supabase du dossier élève
   - Synchronisation classe + établissement
   - Carte scolaire réelle
   - QR Code de la carte
   - Aucune modification/suppression pour l'élève
   - Isolation par school_id
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
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

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

/* =========================================================
   PAGE TITLE
========================================================= */

function PageTitle({
  icon,
  title,
  description,
  onBack,
}) {
  return (
    <div
      style={{
        marginBottom: "24px",
      }}
    >
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

/* =========================================================
   PLACEHOLDER
========================================================= */

function PagePlaceholder({
  icon,
  title,
  text,
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "42px",
          marginBottom: "12px",
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: "0 0 8px",
          color: "#111827",
          fontSize: "20px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#6b7280",
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      >
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   DASHBOARD CARD
========================================================= */

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
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = "#a5b4fc";
        event.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = "#e5e7eb";
        event.currentTarget.style.transform = "translateY(0)";
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

/* =========================================================
   HOME PAGE
========================================================= */

function HomePage({
  profile,
  studentLoading,
  studentError,
  onNavigate,
}) {
  const fullName = profile?.full_name || "Élève";

  return (
    <div>
      <div
        style={{
          background:
            "linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)",
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
                border: "3px solid #ffffff",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.12)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "62px",
                height: "62px",
                borderRadius: "50%",
                background: "#4f46e5",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "20px",
                flexShrink: 0,
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
                marginBottom: "4px",
              }}
            >
              Bienvenue dans votre espace
            </div>

            <h2
              style={{
                margin: 0,
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
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            padding: "12px 15px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          🔄 Synchronisation de votre dossier élève...
        </div>
      )}

      {studentError && (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            padding: "12px 15px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          ⚠️ {studentError}
        </div>
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
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        <DashboardCard
          icon="📚"
          title="Mes cours"
          description="Consulter les cours disponibles"
          onClick={() => onNavigate("courses")}
        />

        <DashboardCard
          icon="✏️"
          title="Mes exercices"
          description="Consulter les exercices"
          onClick={() => onNavigate("exercises")}
        />

        <DashboardCard
          icon="📝"
          title="Mes évaluations"
          description="Voir les évaluations"
          onClick={() => onNavigate("assessments")}
        />

        <DashboardCard
          icon="📊"
          title="Mes notes"
          description="Consulter vos résultats"
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
          description="Échanger avec votre établissement"
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
   COURSES
========================================================= */

function CoursesPage({ onBack }) {
  return (
    <div>
      <PageTitle
        icon="📚"
        title="Mes cours"
        description="Retrouvez les cours publiés par vos enseignants."
        onBack={onBack}
      />

      <PagePlaceholder
        icon="📚"
        title="Cours"
        text="Les cours seront synchronisés avec les données réelles de l'établissement."
      />
    </div>
  );
}

/* =========================================================
   EXERCISES
========================================================= */

function ExercisesPage({ onBack }) {
  return (
    <div>
      <PageTitle
        icon="✏️"
        title="Mes exercices"
        description="Retrouvez les exercices proposés par vos enseignants."
        onBack={onBack}
      />

      <PagePlaceholder
        icon="✏️"
        title="Exercices"
        text="Les exercices seront synchronisés avec les données réelles de l'élève."
      />
    </div>
  );
}

/* =========================================================
   ASSESSMENTS
========================================================= */

function AssessmentsPage({ onBack }) {
  return (
    <div>
      <PageTitle
        icon="📝"
        title="Mes évaluations"
        description="Consultez vos évaluations et leur calendrier."
        onBack={onBack}
      />

      <PagePlaceholder
        icon="📝"
        title="Évaluations"
        text="Les évaluations de l'élève seront synchronisées avec Supabase."
      />
    </div>
  );
}

/* =========================================================
   GRADES
========================================================= */

function GradesPage({ onBack }) {
  return (
    <div>
      <PageTitle
        icon="📊"
        title="Mes notes"
        description="Consultez vos notes et vos résultats scolaires."
        onBack={onBack}
      />

      <PagePlaceholder
        icon="📊"
        title="Notes"
        text="Les notes et moyennes réelles seront récupérées depuis les données de l'établissement."
      />
    </div>
  );
}

/* =========================================================
   ATTENDANCE
========================================================= */

function AttendancePage({ onBack }) {
  return (
    <div>
      <PageTitle
        icon="🕘"
        title="Mes présences"
        description="Consultez votre historique de présence et d'absence."
        onBack={onBack}
      />

      <PagePlaceholder
        icon="🕘"
        title="Présences"
        text="Les présences et absences seront synchronisées avec les données réelles de l'élève."
      />
    </div>
  );
}

/* =========================================================
   BULLETINS
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

      <PagePlaceholder
        icon="📄"
        title="Bulletins"
        text="Les bulletins de l'élève seront récupérés depuis les données de l'établissement."
      />
    </div>
  );
}

/* =========================================================
   COMMUNICATION
========================================================= */

function CommunicationPage({ onBack }) {
  return (
    <div>
      <PageTitle
        icon="💬"
        title="Communication"
        description="Retrouvez vos échanges et communications scolaires."
        onBack={onBack}
      />

      <PagePlaceholder
        icon="💬"
        title="Communication"
        text="La communication sera connectée aux données réelles de l'application."
      />
    </div>
  );
}

/* =========================================================
   CARD INFO
========================================================= */

function CardInfo({
  label,
  value,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "145px 1fr",
        gap: "10px",
        padding: "9px 0",
        borderBottom: "1px solid #e5e7eb",
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
   SCHOOL CARD
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
      ? formatDate(profile.date_of_birth)
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

  const qrData =
    `ECOLE-CONNECTEE|ELEVE|${studentCode}`;

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
            background: "#ffffff",
            border: "1px solid #dbe3ef",
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.10)",
          }}
        >
          {/* =================================================
             EN-TÊTE DE LA CARTE
          ================================================== */}

          <div
            style={{
              background:
                "linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)",
              padding: "22px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "13px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "14px",
                    background: "#ffffff",
                    border: "1px solid #dbe3ef",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "18px",
                    color: "#4f46e5",
                    flexShrink: 0,
                  }}
                >
                  EC
                </div>

                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                      fontSize: "17px",
                      wordBreak: "break-word",
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

              {/* =================================================
                 QR CODE RÉEL
              ================================================== */}

              <div
                style={{
                  width: "118px",
                  height: "118px",
                  background: "#ffffff",
                  border: "5px solid #ffffff",
                  borderRadius: "10px",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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

          {/* =================================================
             CORPS DE LA CARTE
          ================================================== */}

          <div
            style={{
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "150px minmax(0, 1fr)",
                gap: "24px",
                alignItems: "start",
              }}
            >
              {/* PHOTO */}

              <div
                style={{
                  width: "150px",
                  height: "180px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
                        marginBottom: "8px",
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

              {/* INFORMATIONS */}

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
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Élève
                  </div>

                  <div
                    style={{
                      color: "#111827",
                      fontSize: "24px",
                      fontWeight: 800,
                      marginTop: "3px",
                      wordBreak: "break-word",
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

          {/* =================================================
             PIED DE CARTE
          ================================================== */}

          <div
            style={{
              padding: "14px 20px",
              background: "#f8fafc",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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

        {/* =================================================
           ACTIONS
        ================================================== */}

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
              border: "1px solid #d1d5db",
              background: "#ffffff",
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
            onClick={() => window.print()}
            style={{
              border: "none",
              background: "#4f46e5",
              color: "#ffffff",
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

  /* =======================================================
     SYNCHRONISATION DU DOSSIER ÉLÈVE
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadStudentDossier() {
      const connectedUserId =
        profile?.id ||
        session?.user?.id;

      const schoolId =
        profile?.school_id;

      if (!connectedUserId) {
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

      /* ===================================================
         1. DOSSIER ÉLÈVE
      =================================================== */

      const {
        data: student,
        error: studentQueryError,
      } = await supabase
        .from("students")
        .select(
          `
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
          login_identifier
        `
        )
        .eq("profile_id", connectedUserId)
        .eq(
          "school_id",
          schoolId
        )
        .maybeSingle();

      if (studentQueryError) {
        console.error(
          "Erreur chargement dossier élève :",
          studentQueryError
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

      /* ===================================================
         2. CLASSE
      =================================================== */

      let classData = null;

      if (student.class_id) {
        const {
          data: classRow,
          error: classQueryError,
        } = await supabase
          .from("classes")
          .select(
            "id, name, level"
          )
          .eq(
            "id",
            student.class_id
          )
          .eq(
            "school_id",
            student.school_id
          )
          .maybeSingle();

        if (classQueryError) {
          console.error(
            "Erreur chargement classe :",
            classQueryError
          );
        } else {
          classData = classRow;
        }
      }

      /* ===================================================
         3. ÉTABLISSEMENT
      =================================================== */

      let schoolData = null;

      if (student.school_id) {
        const {
          data: schoolRow,
          error: schoolQueryError,
        } = await supabase
          .from("schools")
          .select(
            `
            id,
            name,
            address,
            city,
            phone,
            email,
            logo_url,
            stamp_url,
            signature_url
            `
          )
          .eq(
            "id",
            student.school_id
          )
          .maybeSingle();

        if (schoolQueryError) {
          console.error(
            "Erreur chargement établissement :",
            schoolQueryError
          );
        } else {
          schoolData = schoolRow;
        }
      }

      /* ===================================================
         4. PROFIL SYNCHRONISÉ
      =================================================== */

      const generatedFullName =
        `${student.first_name || ""} ${student.last_name || ""}`
          .trim();

      const synchronizedStudent = {
        ...student,

        full_name:
          generatedFullName ||
          profile?.full_name ||
          "Élève",

        class_name:
          classData?.name ||
          "",

        class_level:
          classData?.level ||
          "",

        school_name:
          schoolData?.name ||
          profile?.school_name ||
          "",

        school_logo_url:
          schoolData?.logo_url ||
          null,

        school_address:
          schoolData?.address ||
          "",

        school_city:
          schoolData?.city ||
          "",

        school_phone:
          schoolData?.phone ||
          "",

        school_email:
          schoolData?.email ||
          "",

        school_stamp_url:
          schoolData?.stamp_url ||
          null,

        school_signature_url:
          schoolData?.signature_url ||
          null,
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
     PROFIL À UTILISER DANS L'INTERFACE
  ======================================================= */

  const dashboardProfile = {
    ...(profile || {}),
    ...(studentData || {}),
  };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function navigateTo(pageId) {
    if (!MENU.some((item) => item.id === pageId)) {
      return;
    }

    setActivePage(pageId);

    setNavigationHistory((current) => [
      ...current,
      pageId,
    ]);
  }

  function goBack() {
    setNavigationHistory((current) => {
      if (current.length <= 1) {
        setActivePage("home");
        return ["home"];
      }

      const newHistory =
        current.slice(0, -1);

      const previousPage =
        newHistory[newHistory.length - 1];

      setActivePage(previousPage);

      return newHistory;
    });
  }

  function handleMenuClick(pageId) {
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
            studentLoading={studentLoading}
            studentError={studentError}
            onNavigate={navigateTo}
          />
        );

      case "courses":
        return (
          <CoursesPage
            onBack={goBack}
          />
        );

      case "exercises":
        return (
          <ExercisesPage
            onBack={goBack}
          />
        );

      case "assessments":
        return (
          <AssessmentsPage
            onBack={goBack}
          />
        );

      case "grades":
        return (
          <GradesPage
            onBack={goBack}
          />
        );

      case "attendance":
        return (
          <AttendancePage
            onBack={goBack}
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
          />
        );

      case "school-card":
        return (
          <SchoolCardPage
            profile={dashboardProfile}
            onBack={goBack}
          />
        );

      default:
        return (
          <HomePage
            profile={dashboardProfile}
            studentLoading={studentLoading}
            studentError={studentError}
            onNavigate={navigateTo}
          />
        );
    }
  }

  const currentMenu =
    MENU.find(
      (item) => item.id === activePage
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
      {/* =================================================
         HEADER MOBILE / TOP
      ================================================== */}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          minHeight: "70px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "15px",
          padding:
            "12px 18px",
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
              justifyContent: "center",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            EC
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: "#111827",
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
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentMenu.icon}{" "}
              {currentMenu.label}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          {dashboardProfile?.photo_url ? (
            <img
              src={dashboardProfile.photo_url}
              alt={fullName}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                objectFit: "cover",
                border:
                  "2px solid #e0e7ff",
              }}
            />
          ) : (
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#4f46e5",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              {getInitials(fullName)}
            </div>
          )}
        </div>
      </header>

      {/* =================================================
         CORPS
      ================================================== */}

      <div
        style={{
          flex: 1,
          display: "flex",
          width: "100%",
        }}
      >
        {/* =================================================
           SIDEBAR
        ================================================== */}

        <aside
          style={{
            width: "245px",
            background: "#ffffff",
            borderRight: "1px solid #e5e7eb",
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
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Espace Élève
          </div>

          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {MENU.map((item) => {
              const active =
                item.id === activePage;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleMenuClick(item.id)
                  }
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: "10px",
                    background: active
                      ? "#eef2ff"
                      : "transparent",
                    color: active
                      ? "#4f46e5"
                      : "#374151",
                    padding:
                      "11px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "11px",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "14px",
                    fontWeight: active
                      ? 700
                      : 500,
                  }}
                >
                  <span
                    style={{
                      width: "25px",
                      textAlign: "center",
                      fontSize: "18px",
                    }}
                  >
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>
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
                border: "1px solid #fecaca",
                background: "#fffafa",
                color: "#dc2626",
                borderRadius: "10px",
                padding:
                  "10px 12px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              🚪 Déconnexion
            </button>
          </div>
        </aside>

        {/* =================================================
           CONTENU
        ================================================== */}

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding:
              "28px",
            overflowX: "hidden",
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

      {/* =================================================
         RESPONSIVE
      ================================================== */}

      <style>
        {`
          @media (max-width: 760px) {
            .student-dashboard-mobile-fix {
              width: 100%;
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
