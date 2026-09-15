import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
const MENU = [
  { id: "home", icon: "🏠", label: "Accueil" },
  { id: "children", icon: "👦", label: "Mes enfants" },
  { id: "grades", icon: "📊", label: "Notes" },
  { id: "attendance", icon: "🕐", label: "Présence" },
  { id: "bulletins", icon: "📄", label: "Bulletins" },
  { id: "communication", icon: "💬", label: "Communication" },
  {
    id: "administrative",
    icon: "🏢",
    label: "Service administratif",
  },
  {
    id: "notifications",
    icon: "🔔",
    label: "Notifications",
  },
];
export default function ParentDashboard({
  profile,
  session,
  onLogout,
}) {
  const [page, setPage] = useState("home");
  const [children, setChildren] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeSchoolId, setActiveSchoolId] = useState(
    profile?.school_id || null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const schoolId = activeSchoolId || profile?.school_id;
  const unreadNotifications = useMemo(
    () =>
      notifications.filter((notification) => !notification.read_at)
        .length,
    [notifications]
  );
  const unreadMessages = useMemo(
    () => adminMessages.filter((message) => !message.read_at).length,
    [adminMessages]
  );
  const loadParentData = async () => {
    setLoading(true);
    setError("");
    try {
      const connectedUserId =
        session?.user?.id || profile?.id || null;
      if (!connectedUserId) {
        throw new Error("Utilisateur connecté introuvable.");
      }
      /*
       * 1. Récupération du profil connecté
       */
      const { data: freshProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id,school_id,full_name,role,active"
          )
          .eq("id", connectedUserId)
          .maybeSingle();
      if (profileError) {
        throw profileError;
      }
      if (!freshProfile) {
        throw new Error("Profil parent introuvable.");
      }
      if (freshProfile.role !== "parent") {
        throw new Error(
          "Le compte connecté n'est pas configuré comme parent."
        );
      }
      const resolvedSchoolId =
        freshProfile.school_id ||
        profile?.school_id ||
        null;
      if (!resolvedSchoolId) {
        throw new Error(
          "École du parent introuvable."
        );
      }
      setActiveSchoolId(resolvedSchoolId);
      /*
       * 2. Récupération du parent correspondant au profil
       */
      const { data: parent, error: parentError } =
        await supabase
          .from("parents")
          .select(
            "id,profile_id,school_id,full_name,phone,email,address,active"
          )
          .eq("profile_id", connectedUserId)
          .eq("school_id", resolvedSchoolId)
          .maybeSingle();
      if (parentError) {
        throw parentError;
      }
      if (!parent) {
        throw new Error(
          "Fiche parent introuvable."
        );
      }
      /*
       * 3. Récupération des enfants liés au parent
       */
      const { data: parentLinks, error: linksError } =
        await supabase
          .from("parent_students")
          .select(
            "id,parent_id,student_id,relationship,is_primary"
          )
          .eq("parent_id", parent.id);
      if (linksError) {
        throw linksError;
      }
      const studentIds = [
        ...new Set(
          (parentLinks || [])
            .map((link) => link.student_id)
            .filter(Boolean)
        ),
      ];
      let loadedChildren = [];
      if (studentIds.length > 0) {
        /*
         * 4. Récupération des enfants
         */
        const { data: studentRows, error: studentsError } =
          await supabase
            .from("students")
            .select(
              "id,profile_id,school_id,class_id,first_name,last_name,student_code,photo_url,active,date_of_birth,birth_place"
            )
            .eq("school_id", resolvedSchoolId)
            .in("id", studentIds);
        if (studentsError) {
          throw studentsError;
        }
        const classIds = [
          ...new Set(
            (studentRows || [])
              .map((student) => student.class_id)
              .filter(Boolean)
          ),
        ];
        let classMap = {};
        if (classIds.length > 0) {
          const { data: classRows, error: classesError } =
            await supabase
              .from("classes")
              .select(
                "id,school_id,name,level"
              )
              .eq("school_id", resolvedSchoolId)
              .in("id", classIds);
          if (classesError) {
            throw classesError;
          }
          classMap = Object.fromEntries(
            (classRows || []).map((item) => [
              item.id,
              item,
            ])
          );
        }
        loadedChildren = (studentRows || []).map(
          (student) => {
            const link = (parentLinks || []).find(
              (item) =>
                item.student_id === student.id
            );
            const studentClass =
              student.class_id
                ? classMap[student.class_id]
                : null;
            return {
              ...student,
              relationship:
                link?.relationship || "",
              is_primary:
                link?.is_primary || false,
              class_name:
                studentClass?.name || "",
              class_level:
                studentClass?.level || "",
            };
          }
        );
      }
      setChildren(loadedChildren);
      /*
       * 5. Notes
       */
      if (studentIds.length > 0) {
        const [
          gradesResponse,
          assessmentsResponse,
          subjectsResponse,
        ] = await Promise.all([
          supabase
            .from("grades")
            .select("*")
            .eq("school_id", resolvedSchoolId)
            .in("student_id", studentIds),
          supabase
            .from("assessments")
            .select("*")
            .eq("school_id", resolvedSchoolId),
          supabase
            .from("subjects")
            .select("*")
            .eq("school_id", resolvedSchoolId),
        ]);
        if (gradesResponse.error) {
          throw gradesResponse.error;
        }
        if (assessmentsResponse.error) {
          throw assessmentsResponse.error;
        }
        if (subjectsResponse.error) {
          throw subjectsResponse.error;
        }
        const assessmentsMap = Object.fromEntries(
          (assessmentsResponse.data || []).map(
            (item) => [item.id, item]
          )
        );
        const subjectsMap = Object.fromEntries(
          (subjectsResponse.data || []).map(
            (item) => [item.id, item]
          )
        );
        const childMap = Object.fromEntries(
          loadedChildren.map((child) => [
            child.id,
            child,
          ])
        );
        const normalizedGrades = (
          gradesResponse.data || []
        ).map((grade) => {
          const assessment =
            assessmentsMap[grade.assessment_id];
          const subject =
            subjectsMap[
              grade.subject_id ||
                assessment?.subject_id
            ];
          const child =
            childMap[grade.student_id];
          return {
            ...grade,
            assessment,
            subject,
            child_name: child
              ? `${child.first_name} ${child.last_name}`
              : "",
          };
        });
        setGrades(normalizedGrades);
        /*
         * 6. Présence
         */
        const { data: attendanceRows, error: attendanceError } =
  await supabase
    .from("attendance")
    .select("*")
    .in("student_id", studentIds);
        if (attendanceError) {
          throw attendanceError;
        }
        const normalizedAttendance = (
          attendanceRows || []
        ).map((item) => {
          const child =
            childMap[item.student_id];
          return {
            ...item,
            child_name: child
              ? `${child.first_name} ${child.last_name}`
              : "",
          };
        });
        setAttendance(normalizedAttendance);
        /*
         * 7. Bulletins
         */
        const { data: bulletinRows, error: bulletinsError } =
          await supabase
            .from("bulletins")
            .select("*")
            .eq("school_id", resolvedSchoolId)
            .in("student_id", studentIds)
            .in("status", [
              "validated",
              "sent",
            ])
            .order("created_at", {
              ascending: false,
            });
        if (bulletinsError) {
          throw bulletinsError;
        }
        const normalizedBulletins = (
          bulletinRows || []
        ).map((bulletin) => {
          const child =
            childMap[bulletin.student_id];
          return {
            ...bulletin,
            child_name: child
              ? `${child.first_name} ${child.last_name}`
              : "",
          };
        });
        setBulletins(normalizedBulletins);
      } else {
        setGrades([]);
        setAttendance([]);
        setBulletins([]);
      }
      /*
       * 8. Messages du service administratif
       */
      const { data: messageRows, error: messagesError } =
        await supabase
          .from("secretary_parent_messages")
          .select("*")
          .eq("school_id", resolvedSchoolId)
          .eq("parent_id", parent.id)
          .order("created_at", {
            ascending: false,
          });
      if (messagesError) {
        throw messagesError;
      }
      setAdminMessages(messageRows || []);
      /*
       * 9. INFORMATIONS ADMINISTRATIVES
       *
       * Le parent reçoit :
       * - les annonces destinées à tous les parents ;
       * - les annonces destinées à la classe de son enfant ;
       * - les annonces destinées directement à ce parent.
       *
       * Toutes les annonces sont obligatoirement limitées
       * à l'école du parent.
       */
      const { data: announcementRows, error: announcementsError } =
        await supabase
          .from("secretary_parent_announcements")
          .select(
            "id,school_id,secretary_id,target_type,target_class_id,target_parent_id,title,message,published_at,created_at"
          )
          .eq("school_id", resolvedSchoolId)
          .order("published_at", {
            ascending: false,
          });
      if (announcementsError) {
        throw announcementsError;
      }
      const childClassIds = [
        ...new Set(
          loadedChildren
            .map((child) => child.class_id)
            .filter(Boolean)
        ),
      ];
      const visibleAnnouncements = (
        announcementRows || []
      ).filter((announcement) => {
        /*
         * Tous les parents
         */
        if (
          announcement.target_type === "all"
        ) {
          return true;
        }
        /*
         * Parent précis
         */
        if (
          announcement.target_type === "parent"
        ) {
          return (
            announcement.target_parent_id ===
            parent.id
          );
        }
        /*
         * Classe précise
         */
        if (
          announcement.target_type === "class"
        ) {
          return childClassIds.includes(
            announcement.target_class_id
          );
        }
        return false;
      });
      setAdminAnnouncements(
        visibleAnnouncements
      );
      /*
       * 10. Notifications parent
       */
      const { data: notificationRows, error: notificationsError } =
        await supabase
          .from("parent_notifications")
          .select("*")
          .eq("school_id", resolvedSchoolId)
          .eq("parent_id", parent.id)
          .order("created_at", {
            ascending: false,
          });
      if (notificationsError) {
        throw notificationsError;
      }
      setNotifications(
        notificationRows || []
      );
    } catch (err) {
      console.error(
        "Erreur ParentDashboard:",
        err
      );
      setError(
        err?.message ||
          "Impossible de charger les données du parent."
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadParentData();
  }, [
    session?.user?.id,
    profile?.id,
    profile?.school_id,
  ]);
  /*
   * Realtime :
   * - messages administratifs
   * - informations administratives
   * - notifications
   */
  useEffect(() => {
    const connectedUserId =
      session?.user?.id || profile?.id || null;
    const currentSchoolId =
      activeSchoolId || profile?.school_id;
    if (
      !connectedUserId ||
      !currentSchoolId
    ) {
      return undefined;
    }
    let messageChannel = null;
    let announcementChannel = null;
    let notificationChannel = null;
    const setupRealtime = async () => {
      /*
       * Retrouver le parent connecté
       */
      const { data: parent } =
        await supabase
          .from("parents")
          .select("id")
          .eq("profile_id", connectedUserId)
          .eq("school_id", currentSchoolId)
          .maybeSingle();
      if (!parent) {
        return;
      }
      /*
       * Messages
       */
      messageChannel = supabase
        .channel(
          `parent-secretary-messages-${parent.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "secretary_parent_messages",
            filter: `parent_id=eq.${parent.id}`,
          },
          () => {
            loadParentData();
          }
        )
        .subscribe();
      /*
       * Informations administratives
       */
      announcementChannel = supabase
        .channel(
          `parent-secretary-announcements-${parent.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "secretary_parent_announcements",
            filter: `school_id=eq.${currentSchoolId}`,
          },
          () => {
            loadParentData();
          }
        )
        .subscribe();
      /*
       * Notifications
       */
      notificationChannel = supabase
        .channel(
          `parent-notifications-${parent.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "parent_notifications",
            filter: `parent_id=eq.${parent.id}`,
          },
          () => {
            loadParentData();
          }
        )
        .subscribe();
    };
    setupRealtime();
    return () => {
      if (messageChannel) {
        supabase.removeChannel(
          messageChannel
        );
      }
      if (announcementChannel) {
        supabase.removeChannel(
          announcementChannel
        );
      }
      if (notificationChannel) {
        supabase.removeChannel(
          notificationChannel
        );
      }
    };
  }, [
    session?.user?.id,
    profile?.id,
    activeSchoolId,
    profile?.school_id,
  ]);
  const markNotificationRead = async (
    notificationId
  ) => {
    if (!schoolId) return;
    const { error: updateError } =
      await supabase
        .from("parent_notifications")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .eq("school_id", schoolId);
    if (updateError) {
      console.error(
        "Erreur lecture notification:",
        updateError
      );
      return;
    }
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              read_at:
                new Date().toISOString(),
            }
          : notification
      )
    );
  };
  const markMessageRead = async (
    messageId
  ) => {
    if (!schoolId) return;
    const { error: updateError } =
      await supabase
        .from("secretary_parent_messages")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("school_id", schoolId);
    if (updateError) {
      console.error(
        "Erreur lecture message:",
        updateError
      );
      return;
    }
    setAdminMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              read_at:
                new Date().toISOString(),
            }
          : message
      )
    );
  };
  /*
   * =========================
   * PAGES
   * =========================
   */
  const HomePage = () => {
    return (
      <div>
        <h1
          style={{
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Bienvenue dans votre espace parent
        </h1>
        <p
          style={{
            color: "#4b5563",
            marginBottom: 24,
          }}
        >
          Suivez la scolarité de vos enfants.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div className="card">
            <div className="card-title">
              👦 Enfants
            </div>
            <div className="card-value">
              {children.length}
            </div>
          </div>
          <div className="card">
            <div className="card-title">
              📊 Notes
            </div>
            <div className="card-value">
              {grades.length}
            </div>
          </div>
          <div className="card">
            <div className="card-title">
              🕐 Présences
            </div>
            <div className="card-value">
              {attendance.length}
            </div>
          </div>
          <div className="card">
            <div className="card-title">
              🔔 Notifications
            </div>
            <div className="card-value">
              {unreadNotifications}
            </div>
          </div>
        </div>
        {unreadMessages > 0 && (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "#eef6ff",
              border: "1px solid #bfdbfe",
              marginBottom: 24,
              color: "#111827",
            }}
          >
            <strong>
              🏢 Service administratif
            </strong>
            <div style={{ marginTop: 6 }}>
              Vous avez{" "}
              <strong>
                {unreadMessages}
              </strong>{" "}
              message
              {unreadMessages > 1
                ? "s"
                : ""}{" "}
              non lu
              {unreadMessages > 1
                ? "s"
                : ""}.
            </div>
            <button
              type="button"
              onClick={() =>
                setPage("administrative")
              }
              style={{
                marginTop: 12,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                padding:
                  "10px 14px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Voir le service administratif
            </button>
          </div>
        )}
        <div className="card">
          <h2
            style={{
              color: "#111827",
              marginTop: 0,
            }}
          >
            Mes enfants
          </h2>
          {children.length === 0 ? (
            <p style={{ color: "#4b5563" }}>
              Aucun enfant associé à ce compte.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {children.map((child) => (
                <div
                  key={child.id}
                  style={{
                    padding: 14,
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 10,
                  }}
                >
                  <strong
                    style={{
                      color: "#111827",
                    }}
                  >
                    {child.first_name}{" "}
                    {child.last_name}
                  </strong>
                  <div
                    style={{
                      color: "#4b5563",
                      marginTop: 4,
                    }}
                  >
                    {child.class_name ||
                      "Classe non renseignée"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  const ChildrenPage = () => {
    return (
      <div>
        <h1 style={{ color: "#111827" }}>
          Mes enfants
        </h1>
        {children.length === 0 ? (
          <div className="card">
            <p style={{ color: "#4b5563" }}>
              Aucun enfant associé à ce compte.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {children.map((child) => (
              <div
                className="card"
                key={child.id}
              >
                <h2
                  style={{
                    color: "#111827",
                    marginTop: 0,
                  }}
                >
                  {child.first_name}{" "}
                  {child.last_name}
                </h2>
                <p
                  style={{
                    color: "#4b5563",
                  }}
                >
                  Classe :{" "}
                  {child.class_name ||
                    "Non renseignée"}
                </p>
                {child.class_level && (
                  <p
                    style={{
                      color: "#4b5563",
                    }}
                  >
                    Niveau :{" "}
                    {child.class_level}
                  </p>
                )}
                {child.student_code && (
                  <p
                    style={{
                      color: "#4b5563",
                    }}
                  >
                    Matricule :{" "}
                    {child.student_code}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const GradesPage = () => {
    return (
      <div>
        <h1 style={{ color: "#111827" }}>
          Notes
        </h1>
        {grades.length === 0 ? (
          <div className="card">
            <p style={{ color: "#4b5563" }}>
              Aucune note disponible.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {grades.map((grade) => (
              <div
                className="card"
                key={grade.id}
              >
                <strong
                  style={{
                    color: "#111827",
                  }}
                >
                  {grade.child_name ||
                    "Élève"}
                </strong>
                <div
                  style={{
                    color: "#374151",
                    marginTop: 6,
                  }}
                >
                  Matière :{" "}
                  {grade.subject?.name ||
                    "Non renseignée"}
                </div>
                <div
                  style={{
                    color: "#374151",
                    marginTop: 4,
                  }}
                >
                  Évaluation :{" "}
                  {grade.assessment?.title ||
                    grade.assessment?.name ||
                    "Non renseignée"}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#111827",
                    marginTop: 10,
                  }}
                >
                  {grade.score ??
                    grade.grade ??
                    "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const AttendancePage = () => {
    return (
      <div>
        <h1 style={{ color: "#111827" }}>
          Présence
        </h1>
        {attendance.length === 0 ? (
          <div className="card">
            <p style={{ color: "#4b5563" }}>
              Aucune donnée de présence disponible.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {attendance.map((item) => (
              <div
                className="card"
                key={item.id}
              >
                <strong
                  style={{
                    color: "#111827",
                  }}
                >
                  {item.child_name ||
                    "Élève"}
                </strong>
                <div
                  style={{
                    color: "#4b5563",
                    marginTop: 6,
                  }}
                >
                  Date :{" "}
                  {item.date ||
                    item.attendance_date ||
                    "-"}
                </div>
                <div
                  style={{
                    color: "#4b5563",
                    marginTop: 4,
                  }}
                >
                  Statut :{" "}
                  {item.status ||
                    "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const BulletinsPage = () => {
    return (
      <div>
        <h1 style={{ color: "#111827" }}>
          Bulletins
        </h1>
        {bulletins.length === 0 ? (
          <div className="card">
            <p style={{ color: "#4b5563" }}>
              Aucun bulletin disponible.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {bulletins.map((bulletin) => (
              <div
                className="card"
                key={bulletin.id}
              >
                <strong
                  style={{
                    color: "#111827",
                  }}
                >
                  {bulletin.child_name ||
                    "Élève"}
                </strong>
                <div
                  style={{
                    color: "#4b5563",
                    marginTop: 6,
                  }}
                >
                  {bulletin.title ||
                    "Bulletin scolaire"}
                </div>
                <div
                  style={{
                    color: "#4b5563",
                    marginTop: 4,
                  }}
                >
                  Statut :{" "}
                  {bulletin.status ||
                    "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  /*
   * =========================
   * SERVICE ADMINISTRATIF
   * =========================
   */
  const AdministrativePage = () => {
    return (
      <div>
        <h1
          style={{
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Service administratif
        </h1>
        <p
          style={{
            color: "#4b5563",
            marginBottom: 24,
          }}
        >
          Informations et échanges avec le
          service administratif de votre école.
        </p>
        {/* INFORMATIONS PUBLIEES PAR LE SECRETARIAT */}
        <div
          className="card"
          style={{
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              color: "#111827",
              marginTop: 0,
            }}
          >
            📢 Informations administratives
          </h2>
          {adminAnnouncements.length === 0 ? (
            <p style={{ color: "#4b5563" }}>
              Aucune information administrative
              disponible.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {adminAnnouncements.map(
                (announcement) => (
                  <div
                    key={announcement.id}
                    style={{
                      padding: 16,
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: 12,
                      background:
                        "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        alignItems:
                          "flex-start",
                      }}
                    >
                      <strong
                        style={{
                          color: "#111827",
                          fontSize: 17,
                        }}
                      >
                        {announcement.title}
                      </strong>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {announcement.published_at
                          ? new Date(
                              announcement.published_at
                            ).toLocaleDateString(
                              "fr-FR"
                            )
                          : ""}
                      </span>
                    </div>
                    <p
                      style={{
                        color: "#374151",
                        marginBottom: 0,
                        whiteSpace:
                          "pre-wrap",
                        lineHeight: 1.6,
                      }}
                    >
                      {announcement.message}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
        {/* MESSAGES DU SECRETARIAT */}
        <div className="card">
          <h2
            style={{
              color: "#111827",
              marginTop: 0,
            }}
          >
            💬 Messages du service administratif
          </h2>
          {adminMessages.length === 0 ? (
            <p style={{ color: "#4b5563" }}>
              Aucun message du service
              administratif.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {adminMessages.map(
                (message) => (
                  <div
                    key={message.id}
                    style={{
                      padding: 16,
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: 12,
                      background:
                        message.read_at
                          ? "#ffffff"
                          : "#eff6ff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        alignItems:
                          "flex-start",
                      }}
                    >
                      <strong
                        style={{
                          color: "#111827",
                        }}
                      >
                        {message.subject}
                      </strong>
                      {!message.read_at && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#2563eb",
                          }}
                        >
                          Nouveau
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        color: "#374151",
                        whiteSpace:
                          "pre-wrap",
                        lineHeight: 1.6,
                      }}
                    >
                      {message.message}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                        }}
                      >
                        {message.created_at
                          ? new Date(
                              message.created_at
                            ).toLocaleString(
                              "fr-FR"
                            )
                          : ""}
                      </span>
                      {!message.read_at && (
                        <button
                          type="button"
                          onClick={() =>
                            markMessageRead(
                              message.id
                            )
                          }
                          style={{
                            border:
                              "1px solid #2563eb",
                            background:
                              "#ffffff",
                            color:
                              "#2563eb",
                            padding:
                              "8px 12px",
                            borderRadius: 8,
                            cursor:
                              "pointer",
                          }}
                        >
                          Marquer comme lu
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  const CommunicationPage = () => {
    return (
      <div>
        <h1 style={{ color: "#111827" }}>
          Communication
        </h1>
        <div className="card">
          <p style={{ color: "#4b5563" }}>
            La communication sera disponible
            prochainement.
          </p>
        </div>
      </div>
    );
  };
  const NotificationsPage = () => {
    return (
      <div>
        <h1 style={{ color: "#111827" }}>
          Notifications
        </h1>
        {notifications.length === 0 ? (
          <div className="card">
            <p style={{ color: "#4b5563" }}>
              Aucune notification.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {notifications.map(
              (notification) => (
                <div
                  className="card"
                  key={notification.id}
                  style={{
                    background:
                      notification.read_at
                        ? "#ffffff"
                        : "#eff6ff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                    }}
                  >
                    <strong
                      style={{
                        color: "#111827",
                      }}
                    >
                      {notification.title ||
                        "Notification"}
                    </strong>
                    {!notification.read_at && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#2563eb",
                        }}
                      >
                        Nouveau
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      color: "#374151",
                      whiteSpace:
                        "pre-wrap",
                    }}
                  >
                    {notification.message ||
                      notification.body ||
                      ""}
                  </p>
                  {!notification.read_at && (
                    <button
                      type="button"
                      onClick={() =>
                        markNotificationRead(
                          notification.id
                        )
                      }
                      style={{
                        border:
                          "1px solid #2563eb",
                        background:
                          "#ffffff",
                        color:
                          "#2563eb",
                        padding:
                          "8px 12px",
                        borderRadius: 8,
                        cursor:
                          "pointer",
                      }}
                    >
                      Marquer comme lu
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  };
  const renderPage = () => {
    switch (page) {
      case "home":
        return <HomePage />;
      case "children":
        return <ChildrenPage />;
      case "grades":
        return <GradesPage />;
      case "attendance":
        return <AttendancePage />;
      case "bulletins":
        return <BulletinsPage />;
      case "communication":
        return <CommunicationPage />;
      case "administrative":
        return <AdministrativePage />;
      case "notifications":
        return <NotificationsPage />;
      default:
        return <HomePage />;
    }
  };
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#111827",
        }}
      >
        Chargement de votre espace parent...
      </div>
    );
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        color: "#111827",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: 250,
          background: "#ffffff",
          borderRight:
            "1px solid #e5e7eb",
          padding: 18,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 24,
            color: "#111827",
          }}
        >
          École Connectée
        </div>
        <div
          style={{
            marginBottom: 18,
            padding: 12,
            borderRadius: 10,
            background: "#f9fafb",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {profile?.full_name ||
              "Parent"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginTop: 4,
            }}
          >
            Parent
          </div>
        </div>
        <nav
          style={{
            display: "grid",
            gap: 6,
          }}
        >
          {MENU.map((item) => {
            const active =
              page === item.id;
            const badge =
              item.id ===
              "notifications"
                ? unreadNotifications
                : item.id ===
                  "administrative"
                ? unreadMessages
                : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setPage(item.id)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: 10,
                  width: "100%",
                  padding:
                    "11px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: active
                    ? "#e5edff"
                    : "transparent",
                  color: "#111827",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: active
                    ? 700
                    : 500,
                }}
              >
                <span>
                  {item.icon}{" "}
                  {item.label}
                </span>
                {badge > 0 && (
                  <span
                    style={{
                      minWidth: 22,
                      height: 22,
                      borderRadius: 999,
                      background:
                        "#dc2626",
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={onLogout}
          style={{
            width: "100%",
            marginTop: 24,
            padding: 11,
            borderRadius: 9,
            border:
              "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#111827",
            cursor: "pointer",
          }}
        >
          Déconnexion
        </button>
      </aside>
      {/* CONTENU */}
      <main
        style={{
          flex: 1,
          padding: 24,
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: 18,
              padding: 14,
              borderRadius: 10,
              background: "#fef2f2",
              border:
                "1px solid #fecaca",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}
        {renderPage()}
      </main>
      <style>{`
        .card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px;
          box-sizing: border-box;
        }
        .card-title {
          color: #4b5563;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .card-value {
          color: #111827;
          font-size: 28px;
          font-weight: 800;
        }
        @media (max-width: 800px) {
          aside {
            width: 210px !important;
          }
          main {
            padding: 16px !important;
          }
        }
        @media (max-width: 650px) {
          body {
            overflow-x: hidden;
          }
          aside {
            width: 100% !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            border-right: none !important;
            border-top: 1px solid #e5e7eb;
            padding: 8px !important;
          }
          aside > div:first-child,
          aside > div:nth-child(2),
          aside > button:last-child {
            display: none;
          }
          aside nav {
            display: grid !important;
            grid-template-columns: repeat(
              4,
              1fr
            );
            gap: 4px !important;
          }
          aside nav button {
            justify-content: center !important;
            text-align: center !important;
            padding: 8px 4px !important;
            font-size: 11px !important;
          }
          main {
            padding-bottom: 90px !important;
          }
        }
      `}</style>
    </div>
  );
}
