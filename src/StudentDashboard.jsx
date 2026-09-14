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
   Utilisé temporairement avant la synchronisation Supabase
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
  return (
    <div>
      <PageTitle
        icon="🎫"
        title="Carte scolaire"
        description="Votre carte scolaire numérique."
        onBack={onBack}
      />

      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "18px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #312e81, #4f46e5)",
            color: "#ffffff",
            padding: "22px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              opacity: 0.85,
            }}
          >
            ÉCOLE CONNECTÉE
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            CARTE SCOLAIRE
          </div>
        </div>

        <div
          style={{
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "#eef2ff",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "22px",
              }}
            >
              {getInitials(profile?.full_name || "Élève")}
            </div>

            <div>
              <div
                style={{
                  color: "#6b7280",
                  fontSize: "12px",
                }}
              >
                Élève
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#111827",
                  marginTop: "3px",
                }}
              >
                {profile?.full_name || "Élève"}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            <div
              style={{
                padding: "12px",
                borderRadius: "10px",
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                Identifiant
              </div>

              <div
                style={{
                  marginTop: "3px",
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {profile?.username || "—"}
              </div>
            </div>

            <div
              style={{
                padding: "12px",
                borderRadius: "10px",
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                Statut
              </div>

              <div
                style={{
                  marginTop: "3px",
                  fontWeight: 600,
                  color: "#16a34a",
                }}
              >
                Élève actif
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "18px",
              borderRadius: "12px",
              background: "#f9fafb",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginBottom: "8px",
              }}
            >
              QR Code scolaire
            </div>

            <div
              style={{
                width: "130px",
                height: "130px",
                margin: "0 auto",
                border: "2px dashed #c7d2fe",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6366f1",
                fontSize: "13px",
                padding: "10px",
              }}
            >
              QR CODE
            </div>

            <p
              style={{
                margin: "10px 0 0",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Le QR code sera connecté au système de carte scolaire à l'étape suivante.
            </p>
          </div>
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
            borderBottom: "1px solid rgba(255,255,255,0.1)",
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
              border: "1px solid rgba(255,255,255,0.15)",
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
            borderBottom: "1px solid #e5e7eb",
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
