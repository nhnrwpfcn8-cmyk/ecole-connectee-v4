import React, { useState } from "react";

/* =========================================================
   STUDENT DASHBOARD
   Version interface
   - Menus réellement cliquables
   - Navigation interne
   - Bouton Retour fonctionnel
   - Aucune modification/suppression pour l'élève
   - Pas encore de synchronisation Supabase
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

/* =========================================================
   PAGE TITLE
========================================================= */

function PageTitle({ icon, title, description, onBack }) {
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

function PagePlaceholder({ icon, title, text }) {
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
          </div>
        </div>
      </div>

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
        text="Les cours de l'élève seront synchronisés avec les données de l'établissement à l'étape suivante."
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
        text="Les exercices seront synchronisés avec les données réelles de l'élève à l'étape suivante."
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
        text="Les évaluations de l'élève seront synchronisées avec Supabase à l'étape suivante."
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
        text="Les notes et moyennes réelles seront récupérées depuis les données de l'établissement à l'étape suivante."
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
        text="Les présences et absences seront synchronisées avec les données réelles de l'élève à l'étape suivante."
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
        text="Les bulletins de l'élève seront récupérés depuis les données de l'établissement à l'étape suivante."
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
        text="La communication sera connectée aux données réelles de l'application à l'étape suivante."
      />
    </div>
  );
}

/* =========================================================
   SCHOOL CARD
========================================================= */

function SchoolCardPage({ profile, onBack }) {
  const fullName = profile?.full_name || "Élève";

  const schoolName =
    profile?.school_name || "Maison des Anges";

  const studentCode =
    profile?.student_code ||
    profile?.matricule ||
    "ELV-BWDNAY";

  const className =
    profile?.class_name ||
    "5èmeA";

  const birthDate =
    profile?.date_of_birth ||
    "09/05/2024";

  const schoolYear =
    profile?.school_year ||
    "2026 - 2027";

  const photoUrl =
    profile?.photo_url || null;

  return (
    <div>
      <PageTitle
        icon="🎫"
        title="Carte scolaire"
        description="Votre carte d'identité scolaire numérique."
        onBack={onBack}
      />

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginBottom: "18px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#374151",
            padding: "10px 16px",
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
            background: "#4b5563",
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: "9px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          🖨️ Imprimer la carte
        </button>
      </div>

      {/* =====================================================
          CARTE D'IDENTITÉ SCOLAIRE
      ====================================================== */}

      <div
        style={{
          maxWidth: "920px",
          margin: "0 auto",
          background:
            "linear-gradient(135deg, #fffaf0 0%, #ffffff 55%, #f8f5ff 100%)",
          border: "1px solid #e5d9c8",
          borderRadius: "22px",
          padding: "28px",
          boxShadow:
            "0 12px 35px rgba(0,0,0,0.10)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* =================================================
            EN-TÊTE
        ================================================== */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            {/* Logo EC */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "14px",
                background:
                  "linear-gradient(135deg, #4b5563, #6b7280)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "20px",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              EC
            </div>

            <div>
              <div
                style={{
                  fontSize: "23px",
                  fontWeight: 800,
                  color: "#4b5563",
                }}
              >
                {schoolName}
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "13px",
                  color: "#6b7280",
                  letterSpacing: "0.5px",
                }}
              >
                CARTE D'IDENTITÉ SCOLAIRE
              </div>
            </div>
          </div>

          {/* =================================================
              VRAI QR CODE ÉLÈVE
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
                `ECOLE-CONNECTEE|ELEVE|${studentCode}`
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

        {/* =================================================
            CORPS DE LA CARTE
        ================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "170px minmax(0, 1fr)",
            gap: "28px",
            alignItems: "start",
          }}
        >
          {/* PHOTO */}
          <div>
            <div
              style={{
                width: "150px",
                height: "185px",
                borderRadius: "12px",
                border: "1px solid #d6d3d1",
                background: "#f5f5f4",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`Photo de ${fullName}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "20px",
                    fontWeight: 600,
                  }}
                >
                  Photo
                </span>
              )}
            </div>
          </div>

          {/* INFORMATIONS */}
          <div>
            <div
              style={{
                textAlign: "center",
                marginBottom: "22px",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  color: "#6b7280",
                  fontWeight: 600,
                }}
              >
                Élève / Élève
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#374151",
                  letterSpacing: "0.5px",
                }}
              >
                {fullName.toUpperCase()}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "20px 45px",
              }}
            >
              <CardInfo
                label="DATE DE NAISSANCE"
                value={birthDate}
              />

              <CardInfo
                label="MATRICULE"
                value={studentCode}
              />

              <CardInfo
                label="CLASSE"
                value={className}
              />

              <CardInfo
                label="ANNÉE SCOLAIRE"
                value={schoolYear}
              />

              <CardInfo
                label="ÉTABLISSEMENT"
                value={schoolName}
              />
            </div>
          </div>
        </div>

        {/* =================================================
            PIED DE CARTE
        ================================================== */}

        <div
          style={{
            marginTop: "25px",
            paddingTop: "12px",
            borderTop:
              "1px solid rgba(107,114,128,0.20)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "#9ca3af",
            }}
          >
            École Connectée • Document officiel
          </div>

          <div
            style={{
              fontSize: "10px",
              color: "#9ca3af",
            }}
          >
            QR • identification élève
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INFORMATIONS DE LA CARTE
========================================================= */

function CardInfo({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#9ca3af",
          letterSpacing: "0.7px",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "#4b5563",
        }}
      >
        {value || "—"}
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
  const [activePage, setActivePage] = useState("home");

  /*
   * Historique de navigation.
   *
   * Cela permet au bouton "Retour" de revenir à la page
   * précédente plutôt que de forcer systématiquement
   * le retour à l'accueil.
   */
  const [history, setHistory] = useState([]);

  const navigateTo = (pageId) => {
    if (!pageId || pageId === activePage) return;

    setHistory((previous) => [
      ...previous,
      activePage,
    ]);

    setActivePage(pageId);
  };

  const goBack = () => {
    setHistory((previous) => {
      if (!previous.length) {
        setActivePage("home");
        return [];
      }

      const newHistory = [...previous];
      const previousPage =
        newHistory.pop() || "home";

      setActivePage(previousPage);

      return newHistory;
    });
  };

  const handleLogout = async () => {
    if (typeof onLogout === "function") {
      await onLogout();
    }
  };

  const currentMenu =
    MENU.find((item) => item.id === activePage) ||
    MENU[0];

  const renderPage = () => {
    switch (activePage) {
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
            profile={profile}
            onBack={goBack}
          />
        );

      case "home":
      default:
        return (
          <HomePage
            profile={profile}
            onNavigate={navigateTo}
          />
        );
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        color: "#111827",
      }}
    >
      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "250px",
          background: "#111827",
          color: "#ffffff",
          padding: "18px 14px",
          overflowY: "auto",
          zIndex: 20,
        }}
      >
        <div
          style={{
            padding: "10px 10px 20px",
            borderBottom:
              "1px solid rgba(255,255,255,0.1)",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
            }}
          >
            École Connectée
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "12px",
              color: "#9ca3af",
            }}
          >
            Espace Élève
          </div>
        </div>

        <nav
          style={{
            display: "grid",
            gap: "5px",
          }}
        >
          {MENU.map((item) => {
            const isActive =
              activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "9px",
                  padding: "11px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "11px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: isActive
                    ? "#ffffff"
                    : "#d1d5db",
                  background: isActive
                    ? "#4f46e5"
                    : "transparent",
                  fontSize: "14px",
                  fontWeight: isActive
                    ? 700
                    : 500,
                }}
              >
                <span
                  style={{
                    width: "25px",
                    textAlign: "center",
                    fontSize: "17px",
                  }}
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Déconnexion */}

        <div
          style={{
            marginTop: "20px",
            paddingTop: "14px",
            borderTop:
              "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              border:
                "1px solid rgba(255,255,255,0.15)",
              borderRadius: "9px",
              padding: "11px 12px",
              background: "transparent",
              color: "#fca5a5",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main
        style={{
          marginLeft: "250px",
          minHeight: "100vh",
        }}
      >
        {/* HEADER */}

        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#ffffff",
            borderBottom:
              "1px solid #e5e7eb",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "15px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Espace Élève
            </div>

            <div
              style={{
                fontWeight: 700,
                fontSize: "17px",
                color: "#111827",
                marginTop: "2px",
              }}
            >
              {currentMenu.icon}{" "}
              {currentMenu.label}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "#eef2ff",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              {getInitials(
                profile?.full_name || "Élève"
              )}
            </div>

            <div
              style={{
                display: "none",
              }}
            >
              {session?.user?.email}
            </div>
          </div>
        </header>

        {/* CONTENT */}

        <section
          style={{
            padding: "26px",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {renderPage()}
        </section>
      </main>
    </div>
  );
}
