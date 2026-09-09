import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const MENU = [
  { id: "overview", label: "Vue d'ensemble", icon: "🏠" },
  { id: "classes", label: "Mes classes", icon: "📚" },
  { id: "students", label: "Mes élèves", icon: "👨‍🎓" },
  { id: "attendance", label: "Faire l'appel", icon: "📅" },
  { id: "grades", label: "Notes", icon: "📊" },
  { id: "assessments", label: "Évaluations", icon: "📝" },
  { id: "courses", label: "Cours", icon: "📖" },
  { id: "documents", label: "Documents", icon: "📄" },
  { id: "communication", label: "Communication", icon: "💬" },
  { id: "profile", label: "Mon profil", icon: "👤" },
];

export default function TeacherDashboard({
  profile,
  session,
  onLogout,
}) {
  const [activePage, setActivePage] = useState("overview");

  const [teacher, setTeacher] = useState(null);
  const [school, setSchool] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedClass, setSelectedClass] = useState(null);

  const teacherId = profile?.id || session?.user?.id || null;
  const schoolId = profile?.school_id || null;

  /*
   * ---------------------------------------------------------
   * CHARGEMENT DE L'ESPACE ENSEIGNANT
   * ---------------------------------------------------------
   *
   * Sécurité :
   * - l'enseignant doit être rattaché à son école
   * - ses classes viennent uniquement de teacher_classes
   * - ses matières viennent uniquement de teacher_subjects
   * - ses élèves viennent uniquement de ses classes
   */

  useEffect(() => {
    if (!teacherId || !schoolId) {
      setLoading(false);
      setError(
        "Votre compte enseignant n'est pas correctement rattaché à une école."
      );
      return;
    }

    loadTeacherSpace();
  }, [teacherId, schoolId]);

  async function loadTeacherSpace() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      /*
       * 1. ENSEIGNANT
       *
       * teachers.id = profiles.id
       */
      const {
        data: teacherData,
        error: teacherError,
      } = await supabase
        .from("teachers")
        .select(
          `
            id,
            school_id,
            display_name,
            active,
            created_at
          `
        )
        .eq("id", teacherId)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (teacherError) {
        throw teacherError;
      }

      if (!teacherData) {
        setTeacher(null);
        setClasses([]);
        setSubjects([]);
        setStudents([]);

        setError(
          "Aucun profil enseignant correspondant à votre compte et à votre école n'a été trouvé."
        );

        setLoading(false);
        return;
      }

      setTeacher(teacherData);

      /*
       * 2. ÉCOLE
       */
      const {
        data: schoolData,
        error: schoolError,
      } = await supabase
        .from("schools")
        .select("id, name")
        .eq("id", schoolId)
        .maybeSingle();

      if (!schoolError) {
        setSchool(schoolData || null);
      }

      /*
       * 3. CLASSES AFFECTÉES À L'ENSEIGNANT
       *
       * teacher_classes.teacher_id
       * teacher_classes.class_id
       */
      const {
        data: teacherClassRows,
        error: teacherClassesError,
      } = await supabase
        .from("teacher_classes")
        .select("teacher_id, class_id")
        .eq("teacher_id", teacherId);

      if (teacherClassesError) {
        throw teacherClassesError;
      }

      const classIds = [
        ...new Set(
          (teacherClassRows || [])
            .map((row) => row.class_id)
            .filter(Boolean)
        ),
      ];

      let classData = [];

      if (classIds.length > 0) {
        const {
          data,
          error: classError,
        } = await supabase
          .from("classes")
          .select(
            `
              id,
              school_id,
              name,
              level,
              created_at
            `
          )
          .in("id", classIds)
          .eq("school_id", schoolId)
          .order("name", { ascending: true });

        if (classError) {
          throw classError;
        }

        classData = data || [];
      }

      setClasses(classData);

      /*
       * 4. MATIÈRES AFFECTÉES À L'ENSEIGNANT
       *
       * teacher_subjects.teacher_id
       * teacher_subjects.subject_id
       *
       * La table subjects est utilisée comme référentiel.
       */
      const {
        data: teacherSubjectRows,
        error: teacherSubjectsError,
      } = await supabase
        .from("teacher_subjects")
        .select("teacher_id, subject_id")
        .eq("teacher_id", teacherId);

      if (teacherSubjectsError) {
        throw teacherSubjectsError;
      }

      const subjectIds = [
        ...new Set(
          (teacherSubjectRows || [])
            .map((row) => row.subject_id)
            .filter(Boolean)
        ),
      ];

      let subjectData = [];

      if (subjectIds.length > 0) {
        const {
          data,
          error: subjectError,
        } = await supabase
          .from("subjects")
          .select("id, name, created_at")
          .in("id", subjectIds)
          .order("name", { ascending: true });

        if (subjectError) {
          throw subjectError;
        }

        subjectData = data || [];
      }

      setSubjects(subjectData);

      /*
       * 5. ÉLÈVES
       *
       * IMPORTANT :
       * On ne charge PAS tous les élèves de l'école.
       *
       * On utilise uniquement les class_id des classes
       * affectées à cet enseignant.
       */
      if (classData.length > 0) {
        const assignedClassIds = classData.map((item) => item.id);

        const {
          data: studentData,
          error: studentsError,
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
              created_at
            `
          )
          .eq("school_id", schoolId)
          .in("class_id", assignedClassIds)
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true });

        if (studentsError) {
          throw studentsError;
        }

        setStudents(studentData || []);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error(
        "Erreur chargement espace enseignant :",
        err
      );

      setError(
        err?.message ||
          "Une erreur est survenue pendant le chargement de votre espace enseignant."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * DONNÉES CALCULÉES
   * ---------------------------------------------------------
   */

  const studentsByClass = useMemo(() => {
    const result = {};

    classes.forEach((item) => {
      result[item.id] = [];
    });

    students.forEach((student) => {
      if (!result[student.class_id]) {
        result[student.class_id] = [];
      }

      result[student.class_id].push(student);
    });

    return result;
  }, [classes, students]);

  const teacherName =
    teacher?.display_name ||
    profile?.full_name ||
    "Enseignant";

  const schoolName =
    school?.name ||
    "École non renseignée";

  const subjectNames = subjects.map(
    (subject) => subject.name
  );

  const totalStudents = students.length;
  const totalClasses = classes.length;
  const totalSubjects = subjects.length;

  function classNameFor(classId) {
    return (
      classes.find((item) => item.id === classId)?.name ||
      "Classe inconnue"
    );
  }

  function classLevelFor(classId) {
    return (
      classes.find((item) => item.id === classId)?.level ||
      ""
    );
  }

  function showPage(page) {
    setActivePage(page);
    setSelectedClass(null);
    setMessage("");
    setError("");
  }

  function logout() {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    supabase.auth.signOut();
  }

  /*
   * ---------------------------------------------------------
   * CHARGEMENT
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          className="ec-card"
          style={{
            maxWidth: 500,
            width: "100%",
            textAlign: "center",
            padding: 40,
          }}
        >
          <div
            style={{
              fontSize: 42,
              marginBottom: 16,
            }}
          >
            📚
          </div>

          <h2
            style={{
              margin: 0,
              marginBottom: 10,
            }}
          >
            Chargement de votre espace enseignant
          </h2>

          <p
            style={{
              color: "#64748b",
              margin: 0,
            }}
          >
            Nous récupérons vos classes, matières et élèves...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * PAGE D'ERREUR
   * ---------------------------------------------------------
   */

  if (error && !teacher) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          padding: 24,
        }}
      >
        <div
          className="ec-card"
          style={{
            maxWidth: 700,
            margin: "60px auto",
            padding: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 25,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 38,
                  marginBottom: 8,
                }}
              >
                ⚠️
              </div>

              <h2 style={{ margin: 0 }}>
                Espace enseignant
              </h2>
            </div>

            <button
              onClick={logout}
              style={buttonSecondaryStyle}
            >
              Se déconnecter
            </button>
          </div>

          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: 16,
              borderRadius: 12,
            }}
          >
            {error}
          </div>

          <button
            onClick={loadTeacherSpace}
            style={{
              ...buttonPrimaryStyle,
              marginTop: 20,
            }}
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * INTERFACE PRINCIPALE
   * ---------------------------------------------------------
   */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#0f172a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              EC
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                Mon espace enseignant
              </h1>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  marginTop: 3,
                }}
              >
                {schoolName}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {teacherName}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Enseignant
              </div>
            </div>

            <button
              onClick={logout}
              style={buttonSecondaryStyle}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          minHeight: "calc(100vh - 81px)",
        }}
      >
        {/* SIDEBAR */}
        <aside
          style={{
            width: 250,
            padding: "24px 14px",
            borderRight: "1px solid #e2e8f0",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#94a3b8",
              textTransform: "uppercase",
              padding: "0 12px",
              marginBottom: 10,
              letterSpacing: 0.6,
            }}
          >
            Mon espace
          </div>

          <nav>
            {MENU.map((item) => {
              const active =
                activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => showPage(item.id)}
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: 10,
                    padding: "11px 12px",
                    marginBottom: 5,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: active
                      ? "#e2e8f0"
                      : "transparent",
                    color: "#0f172a",
                    fontWeight: active ? 700 : 500,
                    fontSize: 14,
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* CONTENU */}
        <main
          style={{
            flex: 1,
            padding: 28,
            minWidth: 0,
          }}
        >
          {message && (
            <div
              style={{
                marginBottom: 18,
                padding: 13,
                borderRadius: 10,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
              }}
            >
              {message}
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: 18,
                padding: 13,
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
              }}
            >
              {error}
            </div>
          )}

          {activePage === "overview" &&
            renderOverview()}

          {activePage === "classes" &&
            renderClasses()}

          {activePage === "students" &&
            renderStudents()}

          {activePage === "attendance" &&
            renderComingSoon(
              "📅 Faire l'appel",
              "L'appel sera disponible directement depuis vos classes."
            )}

          {activePage === "grades" &&
            renderComingSoon(
              "📊 Notes",
              "La saisie des notes sera reliée aux évaluations et au workflow brouillon → soumis → validation."
            )}

          {activePage === "assessments" &&
            renderComingSoon(
              "📝 Évaluations",
              "Vous pourrez créer et gérer vos évaluations pour les classes et matières qui vous sont affectées."
            )}

          {activePage === "courses" &&
            renderComingSoon(
              "📖 Cours",
              "Vous pourrez publier vos cours pour vos classes."
            )}

          {activePage === "documents" &&
            renderComingSoon(
              "📄 Documents",
              "Vous pourrez ajouter des documents pédagogiques pour vos élèves."
            )}

          {activePage === "communication" &&
            renderComingSoon(
              "💬 Communication",
              "La communication avec les élèves et les parents sera accessible depuis votre espace enseignant."
            )}

          {activePage === "profile" &&
            renderProfile()}
        </main>
      </div>
    </div>
  );

  /*
   * ---------------------------------------------------------
   * VUE D'ENSEMBLE
   * ---------------------------------------------------------
   */

  function renderOverview() {
    return (
      <>
        <div className="ec-page-header">
          <div>
            <h2 style={{ marginBottom: 6 }}>
              Bonjour, {teacherName} 👋
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              Bienvenue dans votre espace enseignant.
            </p>
          </div>
        </div>

        {/* IDENTITÉ */}
        <div
          className="ec-card"
          style={{
            padding: 22,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={teacherName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 28,
                  }}
                >
                  👨‍🏫
                </span>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  marginBottom: 5,
                }}
              >
                {teacherName}
              </h3>

              <div
                style={{
                  color: "#64748b",
                  marginBottom: 8,
                }}
              >
                {schoolName}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 7,
                }}
              >
                {subjects.length > 0 ? (
                  subjects.map((subject) => (
                    <span
                      key={subject.id}
                      className="ec-badge"
                    >
                      📚 {subject.name}
                    </span>
                  ))
                ) : (
                  <span
                    style={{
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    Aucune matière affectée pour le moment
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STATISTIQUES */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <StatCard
            icon="📚"
            title="Mes classes"
            value={totalClasses}
            onClick={() => showPage("classes")}
          />

          <StatCard
            icon="👨‍🎓"
            title="Mes élèves"
            value={totalStudents}
            onClick={() => showPage("students")}
          />

          <StatCard
            icon="📖"
            title="Mes matières"
            value={totalSubjects}
            onClick={() => showPage("profile")}
          />
        </div>

        {/* CLASSES */}
        <div
          className="ec-card"
          style={{
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                Mes classes
              </h3>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                Classes qui vous sont affectées.
              </p>
            </div>

            <button
              onClick={() => showPage("classes")}
              style={buttonSecondaryStyle}
            >
              Voir tout
            </button>
          </div>

          {classes.length === 0 ? (
            <EmptyState
              icon="📁"
              title="Aucune classe affectée"
              text="Votre administrateur école doit encore vous affecter à une ou plusieurs classes."
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(230px, 1fr))",
                gap: 14,
              }}
            >
              {classes.map((item) => (
                <ClassCard
                  key={item.id}
                  item={item}
                  studentsCount={
                    studentsByClass[item.id]
                      ?.length || 0
                  }
                  onClick={() => {
                    setSelectedClass(item);
                    setActivePage("classes");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * MES CLASSES
   * ---------------------------------------------------------
   */

  function renderClasses() {
    if (selectedClass) {
      return renderSelectedClass();
    }

    return (
      <>
        <div className="ec-page-header">
          <div>
            <h2 style={{ marginBottom: 6 }}>
              📚 Mes classes
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              Voici uniquement les classes qui vous
              sont affectées.
            </p>
          </div>
        </div>

        {classes.length === 0 ? (
          <div
            className="ec-card"
            style={{
              padding: 30,
            }}
          >
            <EmptyState
              icon="📁"
              title="Aucune classe affectée"
              text="Vous n'avez actuellement aucune classe affectée."
            />
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            {classes.map((item) => (
              <ClassCard
                key={item.id}
                item={item}
                studentsCount={
                  studentsByClass[item.id]
                    ?.length || 0
                }
                onClick={() => {
                  setSelectedClass(item);
                }}
              />
            ))}
          </div>
        )}
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * DÉTAIL D'UNE CLASSE
   * ---------------------------------------------------------
   */

  function renderSelectedClass() {
    const classStudents =
      studentsByClass[selectedClass.id] || [];

    return (
      <>
        <div
          style={{
            marginBottom: 20,
          }}
        >
          <button
            onClick={() => setSelectedClass(null)}
            style={{
              ...buttonSecondaryStyle,
              marginBottom: 16,
            }}
          >
            ← Retour à mes classes
          </button>

          <div className="ec-page-header">
            <div>
              <h2 style={{ marginBottom: 6 }}>
                📁 {selectedClass.name}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                }}
              >
                {selectedClass.level
                  ? `${selectedClass.level} • `
                  : ""}
                {classStudents.length} élève
                {classStudents.length > 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>
        </div>

        {/* INFORMATIONS CLASSE */}
        <div
          className="ec-card"
          style={{
            padding: 22,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 18,
            }}
          >
            <InfoItem
              label="Classe"
              value={selectedClass.name}
            />

            <InfoItem
              label="Niveau"
              value={
                selectedClass.level ||
                "Non renseigné"
              }
            />

            <InfoItem
              label="Enseignant"
              value={teacherName}
            />

            <InfoItem
              label="Matière(s)"
              value={
                subjectNames.length > 0
                  ? subjectNames.join(", ")
                  : "Aucune matière"
              }
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div
          className="ec-card"
          style={{
            padding: 22,
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 15,
            }}
          >
            Actions
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <ActionButton
              icon="📅"
              label="Faire l'appel"
              onClick={() =>
                setActivePage("attendance")
              }
            />

            <ActionButton
              icon="📊"
              label="Saisir les notes"
              onClick={() =>
                setActivePage("grades")
              }
            />

            <ActionButton
              icon="📝"
              label="Créer une évaluation"
              onClick={() =>
                setActivePage("assessments")
              }
            />

            <ActionButton
              icon="📖"
              label="Ajouter un cours"
              onClick={() =>
                setActivePage("courses")
              }
            />

            <ActionButton
              icon="📄"
              label="Ajouter un document"
              onClick={() =>
                setActivePage("documents")
              }
            />

            <ActionButton
              icon="💬"
              label="Communiquer"
              onClick={() =>
                setActivePage("communication")
              }
            />
          </div>
        </div>

        {/* ÉLÈVES */}
        <div
          className="ec-card"
          style={{
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                👨‍🎓 Élèves de {selectedClass.name}
              </h3>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                Liste limitée aux élèves de cette classe.
              </p>
            </div>

            <span className="ec-badge">
              {classStudents.length} élève
              {classStudents.length > 1
                ? "s"
                : ""}
            </span>
          </div>

          {classStudents.length === 0 ? (
            <EmptyState
              icon="👨‍🎓"
              title="Aucun élève"
              text="Aucun élève n'est actuellement rattaché à cette classe."
            />
          ) : (
            <StudentTable
              students={classStudents}
            />
          )}
        </div>
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * MES ÉLÈVES
   * ---------------------------------------------------------
   */

  function renderStudents() {
    return (
      <>
        <div className="ec-page-header">
          <div>
            <h2 style={{ marginBottom: 6 }}>
              👨‍🎓 Mes élèves
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              Vous voyez uniquement les élèves de vos
              classes affectées.
            </p>
          </div>
        </div>

        {classes.length === 0 ? (
          <div
            className="ec-card"
            style={{
              padding: 30,
            }}
          >
            <EmptyState
              icon="👨‍🎓"
              title="Aucun élève à afficher"
              text="Aucune classe ne vous est actuellement affectée."
            />
          </div>
        ) : (
          <>
            {/* DOSSIERS PAR CLASSE */}
            <div
              className="ec-card"
              style={{
                padding: 22,
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 15,
                }}
              >
                📁 Mes classes
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                {classes.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedClass(item);
                      setActivePage("students");
                    }}
                    style={{
                      textAlign: "left",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: 18,
                      background: "#ffffff",
                      cursor: "pointer",
                      color: "#0f172a",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 30,
                        marginBottom: 10,
                      }}
                    >
                      📁
                    </div>

                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 17,
                        color: "#0f172a",
                      }}
                    >
                      {item.name}
                    </div>

                    {item.level && (
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 13,
                          marginTop: 4,
                        }}
                      >
                        {item.level}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 10,
                        color: "#475569",
                        fontSize: 13,
                      }}
                    >
                      👨‍🎓{" "}
                      {studentsByClass[item.id]
                        ?.length || 0}{" "}
                      élève
                      {(studentsByClass[item.id]
                        ?.length || 0) > 1
                        ? "s"
                        : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* LISTE GLOBALE */}
            <div
              className="ec-card"
              style={{
                padding: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>
                    Tous mes élèves
                  </h3>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#64748b",
                      fontSize: 13,
                    }}
                  >
                    {totalStudents} élève
                    {totalStudents > 1
                      ? "s"
                      : ""}{" "}
                    dans vos classes.
                  </p>
                </div>
              </div>

              {students.length === 0 ? (
                <EmptyState
                  icon="👨‍🎓"
                  title="Aucun élève"
                  text="Les élèves apparaîtront ici lorsqu'ils seront affectés à vos classes."
                />
              ) : (
                <StudentTable
                  students={students}
                  showClass
                />
              )}
            </div>
          </>
        )}
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * PROFIL
   * ---------------------------------------------------------
   */

  function renderProfile() {
    return (
      <>
        <div className="ec-page-header">
          <div>
            <h2 style={{ marginBottom: 6 }}>
              👤 Mon profil enseignant
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              Informations de votre compte enseignant.
            </p>
          </div>
        </div>

        <div
          className="ec-card"
          style={{
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 25,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 38,
              }}
            >
              👨‍🏫
            </div>

            <div>
              <h2 style={{ margin: 0 }}>
                {teacherName}
              </h2>

              <div
                style={{
                  color: "#64748b",
                  marginTop: 5,
                }}
              >
                Enseignant • {schoolName}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 16,
            }}
          >
            <ProfileField
              label="Nom et prénom"
              value={teacherName}
            />

            <ProfileField
              label="Identifiant du compte"
              value={teacher?.id || profile?.id || "—"}
            />

            <ProfileField
              label="Rôle"
              value="Enseignant"
            />

            <ProfileField
              label="École"
              value={schoolName}
            />

            <ProfileField
              label="School ID"
              value={schoolId || "—"}
            />

            <ProfileField
              label="Matière(s)"
              value={
                subjectNames.length > 0
                  ? subjectNames.join(", ")
                  : "Aucune matière affectée"
              }
            />

            <ProfileField
              label="Classe(s)"
              value={
                classes.length > 0
                  ? classes
                      .map((item) => item.name)
                      .join(", ")
                  : "Aucune classe affectée"
              }
            />
          </div>
        </div>
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * MODULES À VENIR
   * ---------------------------------------------------------
   */

  function renderComingSoon(title, text) {
    return (
      <>
        <div className="ec-page-header">
          <div>
            <h2 style={{ marginBottom: 6 }}>
              {title}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              {text}
            </p>
          </div>
        </div>

        <div
          className="ec-card"
          style={{
            padding: 40,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 15,
            }}
          >
            🚧
          </div>

          <h3 style={{ marginBottom: 8 }}>
            Module en préparation
          </h3>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              maxWidth: 600,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Ce module sera connecté aux données
            Supabase de votre école dans la prochaine
            étape, sans modifier vos classes, élèves ou
            affectations existantes.
          </p>
        </div>
      </>
    );
  }
}

/*
 * ---------------------------------------------------------
 * COMPOSANTS VISUELS
 * ---------------------------------------------------------
 */

function StatCard({
  icon,
  title,
  value,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 20,
        background: "#ffffff",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: 28,
          marginBottom: 12,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#64748b",
          fontSize: 13,
          marginBottom: 4,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#0f172a",
        }}
      >
        {value}
      </div>
    </button>
  );
}

function ClassCard({
  item,
  studentsCount,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 20,
        background: "#ffffff",
        cursor: "pointer",
        textAlign: "left",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          fontSize: 34,
          marginBottom: 12,
        }}
      >
        📁
      </div>

      <div
        style={{
          fontWeight: 800,
          fontSize: 18,
          color: "#0f172a",
        }}
      >
        {item.name}
      </div>

      {item.level && (
        <div
          style={{
            color: "#64748b",
            fontSize: 13,
            marginTop: 4,
          }}
        >
          {item.level}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          color: "#475569",
          fontSize: 13,
        }}
      >
        👨‍🎓 {studentsCount} élève
        {studentsCount > 1 ? "s" : ""}
      </div>

      <div
        style={{
          marginTop: 12,
          color: "#334155",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        Ouvrir la classe →
      </div>
    </button>
  );
}

function StudentTable({
  students,
  showClass = false,
}) {
  return (
    <div
      style={{
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 650,
        }}
      >
        <thead>
          <tr>
            <th style={tableHeaderStyle}>
              Élève
            </th>

            <th style={tableHeaderStyle}>
              Code élève
            </th>

            {showClass && (
              <th style={tableHeaderStyle}>
                Classe
              </th>
            )}

            <th style={tableHeaderStyle}>
              Statut
            </th>
          </tr>
        </thead>

        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td style={tableCellStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      "👤"
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      {student.last_name || ""}{" "}
                      {student.first_name || ""}
                    </div>
                  </div>
                </div>
              </td>

              <td style={tableCellStyle}>
                {student.student_code || "—"}
              </td>

              {showClass && (
                <td style={tableCellStyle}>
                  {classNameForStudent(
                    student.class_id
                  )}
                </td>
              )}

              <td style={tableCellStyle}>
                <span
                  style={{
                    display: "inline-flex",
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: student.active
                      ? "#dcfce7"
                      : "#f1f5f9",
                    color: student.active
                      ? "#166534"
                      : "#64748b",
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
          ))}
        </tbody>
      </table>
    </div>
  );

  function classNameForStudent(classId) {
    /*
     * Cette fonction ne connaît pas les classes du
     * dashboard. Elle est remplacée par le texte
     * "Classe affectée" si nécessaire dans la vue
     * globale.
     *
     * Le détail de la classe reste disponible dans
     * les dossiers "Mes classes".
     */
    return classId || "—";
  }
}

function EmptyState({
  icon,
  title,
  text,
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 30,
      }}
    >
      <div
        style={{
          fontSize: 42,
          marginBottom: 12,
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: 0,
          marginBottom: 7,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#64748b",
        }}
      >
        {text}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "#64748b",
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding: 15,
        border: "1px solid #e2e8f0",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#64748b",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 700,
          color: "#0f172a",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        background: "#ffffff",
        padding: "13px 14px",
        cursor: "pointer",
        color: "#0f172a",
        fontWeight: 700,
        textAlign: "left",
      }}
    >
      {icon} {label}
    </button>
  );
}

/*
 * ---------------------------------------------------------
 * STYLES
 * ---------------------------------------------------------
 */

const buttonPrimaryStyle = {
  border: "none",
  borderRadius: 10,
  padding: "11px 16px",
  background: "#0f172a",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const buttonSecondaryStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 700,
};

const tableHeaderStyle = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: 12,
  textTransform: "uppercase",
};

const tableCellStyle = {
  padding: "13px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  fontSize: 14,
};