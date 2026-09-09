import React, { useState } from "react";
import { supabase } from "./lib/supabase";

/* =========================================================
   MENU PROFESSEUR
========================================================= */

const MENU = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    icon: "📊",
  },
  {
    id: "classes",
    label: "Mes classes",
    icon: "🏫",
  },
  {
    id: "students",
    label: "Mes élèves",
    icon: "🎓",
  },
  {
    id: "attendance",
    label: "Faire l'appel",
    icon: "✅",
  },
  {
    id: "grades",
    label: "Notes",
    icon: "📝",
  },
  {
    id: "assessments",
    label: "Évaluations",
    icon: "📋",
  },
  {
    id: "courses",
    label: "Cours & exercices",
    icon: "📚",
  },
  {
    id: "documents",
    label: "Documents",
    icon: "📁",
  },
  {
    id: "communication",
    label: "Communication",
    icon: "💬",
  },
  {
    id: "profile",
    label: "Mon profil",
    icon: "👤",
  },
];

/* =========================================================
   COMPOSANT
========================================================= */

export default function TeacherDashboard({
  profile,
  session,
  onLogout,
}) {
  const [activePage, setActivePage] = useState("overview");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const teacherName =
    profile?.full_name || "Enseignant";

  /* =======================================================
     DECONNEXION
  ======================================================= */

  async function handleLogout() {
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erreur déconnexion :", error);
      setMessage("Impossible de se déconnecter.");
      return;
    }

    if (onLogout) {
      onLogout();
    }
  }

  /* =======================================================
     CONTENU DES PAGES
  ======================================================= */

  function renderPage() {
    if (activePage === "overview") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>Vue d'ensemble</h2>
              <p>
                Bienvenue dans votre espace professeur.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
              marginTop: "24px",
            }}
          >
            <div className="ec-card">
              <div style={{ fontSize: "30px" }}>🏫</div>
              <h3>Mes classes</h3>
              <p>
                Les classes qui vous sont affectées.
              </p>
            </div>

            <div className="ec-card">
              <div style={{ fontSize: "30px" }}>🎓</div>
              <h3>Mes élèves</h3>
              <p>
                Les élèves de vos classes.
              </p>
            </div>

            <div className="ec-card">
              <div style={{ fontSize: "30px" }}>📝</div>
              <h3>Notes</h3>
              <p>
                Saisir et transmettre les notes.
              </p>
            </div>

            <div className="ec-card">
              <div style={{ fontSize: "30px" }}>📋</div>
              <h3>Évaluations</h3>
              <p>
                Créer et gérer vos évaluations.
              </p>
            </div>
          </div>

          <div
            className="ec-card"
            style={{ marginTop: "24px" }}
          >
            <h3>📌 Fonctionnement des notes</h3>

            <p>
              Les notes saisies par l'enseignant suivent le
              processus :
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                alignItems: "center",
                marginTop: "16px",
              }}
            >
              <span className="ec-badge">
                Brouillon
              </span>

              <span>→</span>

              <span className="ec-badge">
                Soumis
              </span>

              <span>→</span>

              <span className="ec-badge">
                Validation Admin École
              </span>

              <span>→</span>

              <span className="ec-badge">
                Bulletin
              </span>

              <span>→</span>

              <span className="ec-badge">
                Parent
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "classes") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>🏫 Mes classes</h2>
              <p>
                Les classes auxquelles vous êtes affecté.
              </p>
            </div>
          </div>

          <div className="ec-card">
            <h3>Classes</h3>

            <p>
              Les classes affectées par l'Admin École
              apparaîtront ici.
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "24px",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              📁 Les classes seront chargées depuis
              Supabase.
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "students") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>🎓 Mes élèves</h2>
              <p>
                Les élèves de vos classes uniquement.
              </p>
            </div>
          </div>

          <div className="ec-card">
            <h3>Liste des élèves</h3>

            <p>
              Seuls les élèves appartenant à vos classes
              seront affichés.
            </p>
          </div>
        </div>
      );
    }

    if (activePage === "attendance") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>✅ Faire l'appel</h2>
              <p>
                Effectuer le pointage des élèves.
              </p>
            </div>
          </div>

          <div className="ec-card">
            <h3>Feuille d'appel</h3>

            <p>
              Sélectionnez une classe pour effectuer
              l'appel.
            </p>
          </div>
        </div>
      );
    }

    if (activePage === "grades") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>📝 Notes</h2>
              <p>
                Saisir, enregistrer et transmettre les
                notes.
              </p>
            </div>
          </div>

          <div className="ec-card">
            <h3>Tableau de notes</h3>

            <p>
              Le tableau affichera uniquement les élèves
              de vos classes et les matières qui vous sont
              affectées.
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                borderRadius: "12px",
                background: "#f8fafc",
              }}
            >
              <strong>
                Workflow :
              </strong>

              <br />

              Brouillon → Soumis → Validation Admin École
            </div>
          </div>
        </div>
      );
    }

    if (activePage === "assessments") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>📋 Évaluations</h2>
              <p>
                Créer et gérer les évaluations.
              </p>
            </div>
          </div>

          <div className="ec-card">
            <h3>Mes évaluations</h3>

            <p>
              Les évaluations seront liées à vos classes,
              vos matières et vos élèves.
            </p>
          </div>
        </div>
      );
    }

    if (activePage === "courses") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>📚 Cours & exercices</h2>
              <p>
                Publier des cours, exercices et ressources.
              </p>
            </div>
          </div>

          <div className="ec-card">
            <h3>Contenu pédagogique</h3>

            <p>
              Vous pourrez publier des leçons, exercices,
              liens, vidéos et autres ressources pour vos
              classes.
            </p>
          </div>
        </div>
      );
    }

    if (activePage === "documents") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>📁 Documents</h2>
              <p>
                Documents pédagogiques destinés à vos
                classes.
              </p>
            </div>
          </div>

          <div className="ec-card">
            <h3>Mes documents</h3>

            <p>
              Les documents seront organisés par classe et
              matière.
            </p>
          </div>
        </div>
      );
    }

    if (activePage === "communication") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>💬 Communication</h2>
              <p>
                Communiquer avec les élèves et les parents.
              </p>
            </div>
          </div>

          <div className="ec-card">
            <h3>Messagerie</h3>

            <p>
              La communication professeur ↔ élève et les
              communications autorisées avec les parents
              seront disponibles ici.
            </p>
          </div>
        </div>
      );
    }

    if (activePage === "profile") {
      return (
        <div>
          <div className="ec-page-header">
            <div>
              <h2>👤 Mon profil</h2>
              <p>
                Informations de votre compte enseignant.
              </p>
            </div>
          </div>

          <div className="ec-card">
            <h3>{teacherName}</h3>

            <div style={{ marginTop: "16px" }}>
              <p>
                <strong>Nom :</strong>{" "}
                {profile?.full_name || "-"}
              </p>

              <p>
                <strong>Rôle :</strong> Enseignant
              </p>

              <p>
                <strong>École :</strong>{" "}
                {profile?.school_id || "-"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  /* =======================================================
     AFFICHAGE PRINCIPAL
  ======================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
      }}
    >
      {/* SIDEBAR */}

      <aside
        style={{
          width: "260px",
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          padding: "20px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            marginBottom: "28px",
            paddingBottom: "20px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontWeight: "800",
              fontSize: "22px",
            }}
          >
            EC
          </div>

          <h2
            style={{
              margin: "8px 0 4px",
            }}
          >
            École Connectée
          </h2>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Espace Professeur
          </p>
        </div>

        <nav>
          {MENU.map((item) => {
            const active =
              activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActivePage(item.id);
                  setMessage("");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  marginBottom: "6px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  background: active
                    ? "#e2e8f0"
                    : "transparent",
                  color: "#0f172a",
                  fontWeight: active
                    ? "700"
                    : "500",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: "100%",
            marginTop: "24px",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            cursor: "pointer",
            color: "#0f172a",
            fontWeight: "600",
          }}
        >
          Se déconnecter
        </button>
      </aside>

      {/* CONTENU */}

      <main
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* HEADER */}

        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "18px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div>
            <strong>
              Bonjour, {teacherName} 👋
            </strong>

            <div
              style={{
                color: "#64748b",
                fontSize: "14px",
                marginTop: "4px",
              }}
            >
              Espace Enseignant
            </div>
          </div>

          <div
            style={{
              padding: "8px 12px",
              borderRadius: "999px",
              background: "#f1f5f9",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            👨‍🏫 Enseignant
          </div>
        </header>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              margin: "20px 28px 0",
              padding: "12px 16px",
              borderRadius: "10px",
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            {message}
          </div>
        )}

        {/* PAGE */}

        <section
          style={{
            padding: "28px",
          }}
        >
          {loading ? (
            <div className="ec-card">
              Chargement...
            </div>
          ) : (
            renderPage()
          )}
        </section>
      </main>
    </div>
  );
}