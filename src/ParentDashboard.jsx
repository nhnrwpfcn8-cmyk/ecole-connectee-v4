import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import ParentDoc from "./ParentDoc";
import ParentAPEPage from "./ParentAPEPage";

const MENU = [
  { id: "home", icon: "🏠", label: "Accueil" },
  { id: "children", icon: "👦", label: "Mes enfants" },
  { id: "grades", icon: "📊", label: "Notes" },
  { id: "attendance", icon: "🕐", label: "Présence" },
  { id: "bulletins", icon: "📄", label: "Bulletins" },
  { id: "documents", icon: "📁", label: "Mes documents" },
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
{ id: "ape", label: "APE", icon: "🤝" },
];

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatScore(value, max = 20) {
  const score = Number(value);
  const maximum = Number(max) || 20;

  if (Number.isNaN(score)) return "—";

  return `${score} / ${maximum}`;
}

function PageTitle({
  icon,
  title,
  description,
  onBack,
}) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          border: "1px solid #e2e8f0",
          background: "#ffffff",
          color: "#334155",
          borderRadius: "10px",
          padding: "9px 13px",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "13px",
          marginBottom: "14px",
          boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
        }}
      >
        ← Retour
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "13px",
            background: "#eef2ff",
            display: "grid",
            placeItems: "center",
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
              color: "#0f172a",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            {title}
          </h2>

          {description && (
            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: "13px",
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

function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "18px",
        boxShadow: "0 3px 12px rgba(15,23,42,0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Empty({ text }) {
  return (
    <Card>
      <div
        style={{
          color: "#64748b",
          textAlign: "center",
          padding: "24px 15px",
          fontSize: "14px",
        }}
      >
        {text}
      </div>
    </Card>
  );
}

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
  const [adminMeetings, setAdminMeetings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentParentId, setCurrentParentId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyLoadingId, setReplyLoadingId] = useState(null);

  const [activeSchoolId, setActiveSchoolId] =
    useState(profile?.school_id || null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const schoolId =
    activeSchoolId || profile?.school_id;

  const unreadNotifications = useMemo(
    () =>
      notifications.filter(
        (item) => !item.read_at
      ).length,
    [notifications]
  );

  const unreadMessages = useMemo(
    () =>
      adminMessages.filter(
        (item) => !item.read_at
      ).length,
    [adminMessages]
  );

  async function loadParentData() {
    const connectedUserId =
      session?.user?.id || profile?.id;

    if (!connectedUserId) {
      setLoading(false);
      setError(
        "Impossible d'identifier le compte connecté."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: freshProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id,school_id,full_name,role,active"
        )
        .eq("id", connectedUserId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const resolvedSchoolId =
        freshProfile?.school_id ||
        profile?.school_id ||
        null;

      setActiveSchoolId(resolvedSchoolId);

      if (!resolvedSchoolId) {
        setError(
          "Aucune école n'est associée à ce compte."
        );

        setChildren([]);
        setGrades([]);
        setAttendance([]);
        setBulletins([]);
        setAdminMessages([]);
        setAdminAnnouncements([]);
        setNotifications([]);

        return;
      }

      if (
        freshProfile?.role &&
        freshProfile.role !== "parent"
      ) {
        setError(
          "Ce compte n'est pas configuré comme compte parent."
        );

        return;
      }

      const {
        data: parent,
        error: parentError,
      } = await supabase
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
        setChildren([]);
        setGrades([]);
        setAttendance([]);
        setBulletins([]);
        setAdminMessages([]);
        setAdminAnnouncements([]);
        setNotifications([]);

        setError(
          "Aucun profil parent associé à ce compte."
        );

        return;
      }

      setCurrentParentId(parent.id);

      const {
        data: links,
        error: linksError,
      } = await supabase
        .from("parent_students")
        .select(
          "id,parent_id,student_id,relationship,is_primary,created_at"
        )
        .eq("parent_id", parent.id);

      if (linksError) {
        throw linksError;
      }

      const studentIds = (links || [])
        .map((item) => item.student_id)
        .filter(Boolean);

      let studentRows = [];

      if (studentIds.length) {
        const {
          data,
          error: studentsError,
        } = await supabase
          .from("students")
          .select(
            "id,profile_id,school_id,class_id,first_name,last_name,student_code,photo_url,active"
          )
          .eq("school_id", resolvedSchoolId)
          .in("id", studentIds);

        if (studentsError) {
          throw studentsError;
        }

        studentRows = data || [];
      }

      const classIds = [
        ...new Set(
          studentRows
            .map((student) => student.class_id)
            .filter(Boolean)
        ),
      ];

      let classRows = [];

      if (classIds.length) {
        const {
          data,
          error: classesError,
        } = await supabase
          .from("classes")
          .select(
            "id,name,level,school_id"
          )
          .eq("school_id", resolvedSchoolId)
          .in("id", classIds);

        if (classesError) {
          throw classesError;
        }

        classRows = data || [];
      }

      const classMap = new Map(
        classRows.map((item) => [
          String(item.id),
          item,
        ])
      );

      const childMap = new Map();

      studentRows.forEach((student) => {
        const link =
          (links || []).find(
            (item) =>
              item.student_id === student.id
          );

        childMap.set(
          String(student.id),
          {
            ...student,

            relationship:
              link?.relationship ||
              "Parent",

            is_primary:
              link?.is_primary ||
              false,

            class_name:
              classMap.get(
                String(student.class_id)
              )?.name ||
              "Classe non renseignée",

            class_level:
              classMap.get(
                String(student.class_id)
              )?.level || "",
          }
        );
      });

      const normalizedChildren =
        studentRows
          .map(
            (student) =>
              childMap.get(
                String(student.id)
              )
          )
          .filter(Boolean);

      setChildren(normalizedChildren);

      /*
       * =====================================================
       * INFORMATIONS DU SERVICE ADMINISTRATIF
       * =====================================================
       *
       * Les informations sont filtrées par :
       * - school_id de l'école du parent
       * - tous les parents
       * - les classes des enfants du parent
       * - le parent connecté
       *
       * Aucune information d'une autre école n'est conservée.
       */

      const {
        data: announcementRows,
        error: announcementsError,
      } = await supabase
        .from("secretary_parent_announcements")
        .select(`
          id,
          school_id,
          secretary_id,
          target_type,
          target_class_id,
          target_parent_id,
          title,
          message,
          published_at,
          created_at
        `)
        .eq("school_id", resolvedSchoolId)
        .order("published_at", {
          ascending: false,
        });

      if (announcementsError) {
        throw announcementsError;
      }

      const childClassIds = new Set(
        studentRows
          .map((student) =>
            student.class_id
              ? String(student.class_id)
              : null
          )
          .filter(Boolean)
      );

      const visibleAnnouncements =
        (announcementRows || []).filter(
          (announcement) => {
            const targetType =
              String(
                announcement.target_type ||
                  ""
              ).toLowerCase();

            if (
              targetType === "all" ||
              targetType ===
                "all_parents" ||
              targetType ===
                "parents"
            ) {
              return true;
            }

            if (
              targetType === "class" ||
              targetType ===
                "classe"
            ) {
              return (
                announcement.target_class_id &&
                childClassIds.has(
                  String(
                    announcement.target_class_id
                  )
                )
              );
            }

            if (
              targetType === "parent" ||
              targetType ===
                "individual"
            ) {
              return (
                announcement.target_parent_id ===
                parent.id
              );
            }

            return false;
          }
        );

      setAdminAnnouncements(
        visibleAnnouncements
      );

      if (studentIds.length) {
        const {
          data: gradeRows,
          error: gradesError,
        } = await supabase
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
          .eq("school_id", resolvedSchoolId)
          .in("student_id", studentIds)
          .order("created_at", {
            ascending: false,
          });

        if (gradesError) {
          throw gradesError;
        }

        const assessmentIds = [
          ...new Set(
            (gradeRows || [])
              .map(
                (grade) =>
                  grade.assessment_id
              )
              .filter(Boolean)
          ),
        ];

        let assessmentRows = [];

        if (assessmentIds.length) {
          const {
  data,
  error:
    assessmentsError,
} = await supabase
  .from("assessments")
  .select(`
    id,
    school_id,
    class_id,
    subject_id,
    title,
    max_score,
    evaluation_date,
    coefficient,
    trimester
  `)
  .eq("school_id", resolvedSchoolId)
  .in("id", assessmentIds);

          if (assessmentsError) {
            throw assessmentsError;
          }

          assessmentRows = data || [];
        }

        const subjectIds = [
          ...new Set(
            assessmentRows
              .map(
                (item) =>
                  item.subject_id
              )
              .filter(Boolean)
          ),
        ];

        let subjectRows = [];

        if (subjectIds.length) {
          const {
            data,
            error: subjectsError,
          } = await supabase
            .from("subjects")
            .select(
              "id,name,school_id"
            )
            .eq("school_id", resolvedSchoolId)
            .in("id", subjectIds);

          if (subjectsError) {
            throw subjectsError;
          }

          subjectRows = data || [];
        }

        const subjectMap =
          new Map(
            subjectRows.map((item) => [
              String(item.id),
              item,
            ])
          );

        const assessmentMap =
          new Map(
            assessmentRows.map(
              (item) => [
                String(item.id),
                {
                  ...item,
                  subject_name:
                    subjectMap.get(
                      String(
                        item.subject_id
                      )
                    )?.name ||
                    "Matière non renseignée",
                },
              ]
            )
          );

        const normalizedGrades =
          (gradeRows || []).map(
            (grade) => {
              const assessment =
                assessmentMap.get(
                  String(
                    grade.assessment_id
                  )
                );

              const child =
                childMap.get(
                  String(
                    grade.student_id
                  )
                );

              const subjectId =
                assessment?.subject_id ||
                null;

              const subject =
                subjectMap.get(
                  String(subjectId)
                );

              return {
                ...grade,

                child_name: child
                  ? `${child.first_name} ${child.last_name}`
                  : "Élève",

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
                  assessment?.evaluation_date ||
                  null,

                trimester:
  assessment?.trimester ||
  null,
                
                max_score:
                  assessment?.max_score ||
                  20,

                coefficient:
                  assessment?.coefficient ||
                  1,
              };
            }
          );

                setGrades(normalizedGrades);

        const {
          data: attendanceRows,
          error: attendanceError,
        } = await supabase
          .from("attendance")
          .select(`
            id,
            student_id,
            class_id,
            attendance_date,
            status,
            entry_at,
            exit_at,
            justification,
            justified,
            created_at
          `)
          .in("student_id", studentIds)
          .order("attendance_date", {
            ascending: false,
          });

        if (attendanceError) {
          throw attendanceError;
        }

        setAttendance(
          (attendanceRows || []).map(
            (item) => {
              const child =
                childMap.get(
                  String(
                    item.student_id
                  )
                );

              return {
                ...item,

                child_name: child
                  ? `${child.first_name} ${child.last_name}`
                  : "Élève",
              };
            }
          )
        );

        const {
          data: bulletinRows,
          error: bulletinsError,
        } = await supabase
          .from("bulletins")
          .select(`
            id,
            school_id,
            student_id,
            trimester,
            status,
            pdf_url,
            generated_at,
            validated_at,
            sent_at,
            created_at,
            updated_at
          `)
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

        setBulletins(
          (bulletinRows || []).map(
            (item) => {
              const child =
                childMap.get(
                  String(
                    item.student_id
                  )
                );

              return {
                ...item,

                child_name: child
                  ? `${child.first_name} ${child.last_name}`
                  : "Élève",
              };
            }
          )
        );
      } else {
        setGrades([]);
        setAttendance([]);
        setBulletins([]);
      }

      const {
        data: messages,
        error: messagesError,
      } = await supabase
        .from(
          "secretary_parent_messages"
        )
        .select(`
  id,
  school_id,
  secretary_id,
  parent_id,
  subject,
  message,
  sender_type,
  conversation_id,
  read_at,
  created_at
`)
        .eq("school_id", resolvedSchoolId)
        .eq("parent_id", parent.id)
        .order("created_at", {
          ascending: false,
        });

      if (messagesError) {
        throw messagesError;
      }

      setAdminMessages(messages || []);

      const {
        data: notificationRows,
        error:
          notificationsError,
      } = await supabase
        .from("parent_notifications")
        .select(`
          id,
          school_id,
          parent_id,
          title,
          message,
          type,
          reference_id,
          read_at,
          created_at,
          bulletin_id
        `)
        .eq("school_id", resolvedSchoolId)
        .eq("parent_id", parent.id)
        .order("created_at", {
          ascending: false,
        });

      if (notificationsError) {
        throw notificationsError;
      }

      // NOUVEAU : CONVOCATIONS
      const {
        data: meetingRows,
        error: meetingsError,
      } = await supabase
        .from("secretary_parent_meetings")
        .select(
          "id,school_id,secretary_id,parent_id,student_id,reason,meeting_date,meeting_time,status,notes,created_at"
        )
        .eq("school_id", resolvedSchoolId)
        .eq("parent_id", parent.id)
        .order("meeting_date", {
          ascending: true,
        })
        .order("meeting_time", {
          ascending: true,
        });

      if (meetingsError) {
        throw meetingsError;
      }

      setAdminMeetings(meetingRows || []);

      setNotifications(notificationRows || []);
    } catch (err) {
      console.error(
        "Erreur espace Parent :",
        err
      );

      const errorMessage =
        err?.message ||
        err?.details ||
        err?.hint ||
        "Erreur inconnue";

      setError(
        `Impossible de charger votre espace Parent : ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParentData();
  }, [
    profile?.id,
    profile?.school_id,
    session?.user?.id,
  ]);

  useEffect(() => {
  const connectedUserId =
    session?.user?.id ||
    profile?.id;

  const currentSchoolId =
    activeSchoolId ||
    profile?.school_id;

  if (
    !connectedUserId ||
    !currentSchoolId
  ) {
    return;
  }

  let channel = null;
  let active = true;

  async function subscribeRealtime() {
    const {
      data: parent,
    } = await supabase
      .from("parents")
      .select("id")
      .eq("profile_id", connectedUserId)
      .eq("school_id", currentSchoolId)
      .maybeSingle();

    if (
      !active ||
      !parent?.id
    ) {
      return;
    }

    channel =
      supabase
        .channel(
          `parent-dashboard-${currentSchoolId}-${parent.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "secretary_parent_messages",
            filter:
              `parent_id=eq.${parent.id}`,
          },
          () => {
            loadParentData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "secretary_parent_announcements",
            filter:
              `school_id=eq.${currentSchoolId}`,
          },
          () => {
            loadParentData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "parent_notifications",
            filter:
              `parent_id=eq.${parent.id}`,
          },
          (payload) => {
            if (!active) {
              return;
            }

            if (payload.eventType === "INSERT") {
              setNotifications((current) => {
                const exists = current.some(
                  (notification) =>
                    notification.id === payload.new?.id
                );

                if (exists) {
                  return current;
                }

                return [
                  payload.new,
                  ...current,
                ].sort(
                  (a, b) =>
                    new Date(b.created_at || 0) -
                    new Date(a.created_at || 0)
                );
              });

              return;
            }

            if (payload.eventType === "UPDATE") {
              setNotifications((current) =>
                current
                  .map((notification) =>
                    notification.id === payload.new?.id
                      ? payload.new
                      : notification
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.created_at || 0) -
                      new Date(a.created_at || 0)
                  )
              );

              return;
            }

            if (payload.eventType === "DELETE") {
              setNotifications((current) =>
                current.filter(
                  (notification) =>
                    notification.id !== payload.old?.id
                )
              );
            }
          }
        )
        .subscribe();
  }

  subscribeRealtime();

  return () => {
    active = false;

    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, [
  profile?.id,
  profile?.school_id,
  session?.user?.id,
  activeSchoolId,
]);
  async function markNotificationRead(
    notificationId
  ) {
    const currentSchoolId =
      activeSchoolId ||
      profile?.school_id;

    const now =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabase
      .from("parent_notifications")
      .update({
        read_at: now,
      })
      .eq("id", notificationId)
      .eq("school_id", currentSchoolId);

    if (updateError) {
      console.error(
        "Erreur notification :",
        updateError
      );
      return;
    }

    setNotifications(
      (current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                read_at: now,
              }
            : item
        )
    );
  }

  async function markMessageRead(
    messageId
  ) {
    const currentSchoolId =
      activeSchoolId ||
      profile?.school_id;

    const now =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabase
      .from("secretary_parent_messages")
      .update({
        read_at: now,
      })
      .eq("id", messageId)
      .eq("school_id", currentSchoolId);

    if (updateError) {
      console.error(
        "Erreur message :",
        updateError
      );
      return;
    }

    setAdminMessages(
      (current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                read_at: now,
              }
            : item
        )
    );
  }

  async function sendReply(messageItem) {
    const text = String(
      replyDrafts[messageItem.id] || ""
    ).trim();

    if (!text) return;

    if (!currentParentId || !schoolId) {
      return;
    }

    setReplyLoadingId(messageItem.id);

    try {
      const { error: insertError } = await supabase
        .from("secretary_parent_messages")
        .insert({
          school_id: schoolId,
          secretary_id: messageItem.secretary_id,
          parent_id: currentParentId,
          subject: messageItem.subject,
          message: text,
          sender_type: "parent",
          conversation_id: messageItem.conversation_id || null,
        });

      if (insertError) {
        throw insertError;
      }

      setReplyDrafts((current) => ({
        ...current,
        [messageItem.id]: "",
      }));

      await loadParentData();
    } catch (error) {
      console.error(
        "Erreur lors de l'envoi de la réponse :",
        error
      );
    } finally {
      setReplyLoadingId(null);
    }
  }
    async function editParentMessage(messageId, newText) {
    const text = String(newText || "").trim();

    if (!text) return;

    if (!currentParentId || !schoolId) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("secretary_parent_messages")
        .update({
          message: text,
        })
        .eq("id", messageId)
        .eq("school_id", schoolId)
        .eq("parent_id", currentParentId)
        .eq("sender_type", "parent");

      if (updateError) {
        throw updateError;
      }

      await loadParentData();
    } catch (error) {
      console.error(
        "Erreur lors de la modification du message :",
        error
      );
    }
  }
  async function deleteParentMessage(messageId) {
    if (!currentParentId || !schoolId) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("secretary_parent_messages")
        .delete()
        .eq("id", messageId)
        .eq("school_id", schoolId)
        .eq("parent_id", currentParentId)
        .eq("sender_type", "parent");

      if (deleteError) {
        throw deleteError;
      }

      await loadParentData();
    } catch (error) {
      console.error(
        "Erreur lors de la suppression du message :",
        error
      );
    }
  }
  /*
   * =====================================================
   * OUVERTURE DU BULLETIN
   * =====================================================
   *
   * Le bulletin actuellement enregistré dans pdf_url
   * peut être un document HTML sous la forme :
   *
   * data:text/html;charset=utf-8,...
   *
   * Certains navigateurs peuvent afficher une page
   * blanche lorsqu'un tel lien est ouvert directement.
   *
   * On ouvre donc une nouvelle fenêtre puis on écrit
   * directement le HTML décodé dans cette fenêtre.
   *
   * Les URL classiques continuent à fonctionner normalement.
   */
  function openBulletin(bulletin) {
    const url = bulletin?.pdf_url;

    if (!url) {
      return;
    }

    try {
      if (
        typeof url === "string" &&
        url.startsWith("data:text/html")
      ) {
        const printWindow =
          window.open("", "_blank");

        if (!printWindow) {
          window.alert(
            "Impossible d'ouvrir le bulletin. Autorisez les fenêtres contextuelles pour ce site."
          );
          return;
        }

        const commaIndex = url.indexOf(",");

        if (commaIndex === -1) {
          printWindow.close();
          window.location.href = url;
          return;
        }

        const encodedHtml =
          url.slice(commaIndex + 1);

        const html =
          decodeURIComponent(encodedHtml);

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        return;
      }

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Erreur lors de l'ouverture du bulletin :",
        error
      );

      try {
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      } catch (fallbackError) {
        console.error(
          "Erreur ouverture bulletin secours :",
          fallbackError
        );
      }
    }
  }

  function HomePage() {
    const homeItems =
      MENU.filter(
        (item) =>
          item.id !== "home"
      );

    return (
      <>
        <div
          style={{
            background:
              "linear-gradient(135deg,#eef2ff 0%,#f8fafc 55%,#ffffff 100%)",
            border: "1px solid #e0e7ff",
            borderRadius: "18px",
            padding: "22px",
            marginBottom: "20px",
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
                width: "58px",
                height: "58px",
                borderRadius: "16px",
                background: "#4f46e5",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: "28px",
                boxShadow:
                  "0 6px 18px rgba(79,70,229,0.25)",
              }}
            >
              👨‍👩‍👧
            </div>

            <div>
              <div
                style={{
                  color: "#4f46e5",
                  fontWeight: 800,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Espace Parent
              </div>

              <h2
                style={{
                  margin: "3px 0 4px",
                  color: "#0f172a",
                  fontSize: "22px",
                }}
              >
                Bonjour
                {profile?.full_name
                  ? `, ${profile.full_name}`
                  : ""}{" "}
                👋
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Suivez la scolarité de
                vos enfants depuis un
                seul espace.
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setPage("children")
            }
            style={{
              textAlign: "left",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "18px",
              cursor: "pointer",
              boxShadow:
                "0 3px 12px rgba(15,23,42,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "25px",
                marginBottom: "9px",
              }}
            >
              👦
            </div>

            <div
              style={{
                fontSize: "25px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {children.length}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "13px",
                marginTop: "3px",
              }}
            >
              Enfant
              {children.length > 1
                ? "s"
                : ""}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setPage("grades")
            }
            style={{
              textAlign: "left",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "18px",
              cursor: "pointer",
              boxShadow:
                "0 3px 12px rgba(15,23,42,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "25px",
                marginBottom: "9px",
              }}
            >
              📊
            </div>

            <div
              style={{
                fontSize: "25px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {grades.length}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "13px",
                marginTop: "3px",
              }}
            >
              Note
              {grades.length > 1
                ? "s"
                : ""}{" "}
              disponible
              {grades.length > 1
                ? "s"
                : ""}{" "}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setPage("attendance")
            }
            style={{
              textAlign: "left",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "18px",
              cursor: "pointer",
              boxShadow:
                "0 3px 12px rgba(15,23,42,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "25px",
                marginBottom: "9px",
              }}
            >
              🕐
            </div>

            <div
              style={{
                fontSize: "25px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {attendance.length}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "13px",
                marginTop: "3px",
              }}
            >
              Présence
              {attendance.length > 1
                ? "s"
                : ""}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setPage("notifications")
            }
            style={{
              textAlign: "left",
              background: "#fff",
              border:
                unreadNotifications > 0
                  ? "2px solid #fecaca"
                  : "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "18px",
              cursor: "pointer",
              boxShadow:
                "0 3px 12px rgba(15,23,42,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "25px",
                marginBottom: "9px",
              }}
            >
              🔔
            </div>

            <div
              style={{
                fontSize: "25px",
                fontWeight: 800,
                color:
                  unreadNotifications > 0
                    ? "#dc2626"
                    : "#0f172a",
              }}
            >
              {unreadNotifications}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "13px",
                marginTop: "3px",
              }}
            >
              Nouvelle
              {unreadNotifications > 1
                ? "s"
                : ""}{" "}
              information
              {unreadNotifications > 1
                ? "s"
                : ""}
            </div>
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: "18px",
              }}
            >
              👦 Mes enfants
            </h3>

            <p
              style={{
                margin: "4px 0 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              Consultez rapidement leur
              situation scolaire.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setPage("children")
            }
            style={{
              border: "none",
              background: "transparent",
              color: "#4f46e5",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Voir tout →
          </button>
        </div>

        {!children.length ? (
          <Empty
            text="Aucun enfant n'est encore rattaché à votre compte."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {children.map(
              (child) => (
                <Card key={child.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "54px",
                        height: "54px",
                        borderRadius: "15px",
                        background: "#eef2ff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "25px",
                        flexShrink: 0,
                      }}
                    >
                      👦
                    </div>

                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <strong
                        style={{
                          color: "#0f172a",
                          fontSize: "17px",
                        }}
                      >
                        {child.first_name}{" "}
                        {child.last_name}
                      </strong>

                      <div
                        style={{
                          color: "#64748b",
                          marginTop: "5px",
                          fontSize: "13px",
                        }}
                      >
                        🎓{" "}
                        {child.class_name}

                        {child.class_level
                          ? ` · ${child.class_level}`
                          : ""}
                      </div>

                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        Relation :{" "}
                        {child.relationship}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            )}
          </div>
        )}

        {(unreadMessages > 0 ||
          adminAnnouncements.length > 0) && (
          <button
            type="button"
            onClick={() =>
              setPage("administrative")
            }
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "14px 16px",
              borderRadius: "14px",
              border: "1px solid #fde68a",
              background: "#fffbeb",
              color: "#92400e",
              textAlign: "left",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🏢 Service administratif —{" "}
            {unreadMessages > 0
              ? `${unreadMessages} nouveau${
                  unreadMessages > 1
                    ? "x"
                    : ""
                } message${
                  unreadMessages > 1
                    ? "s"
                    : ""
                }`
              : `${adminAnnouncements.length} information${
                  adminAnnouncements.length > 1
                    ? "s"
                    : ""
                } disponible${
                  adminAnnouncements.length > 1
                    ? "s"
                    : ""
                }`}{" "}
            →
          </button>
        )}
      </>
    );
  }

  function ChildrenPage() {
    return (
      <>
        <PageTitle
          icon="👦"
          title="Mes enfants"
          description="Les élèves rattachés à votre compte parent."
          onBack={() => setPage("home")}
        />

        {!children.length ? (
          <Empty
            text="Aucun enfant n'est encore rattaché à votre compte."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {children.map(
              (child) => (
                <Card key={child.id}>
                  <div
                    style={{
                      display: "flex",
                      gap: "14px",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "58px",
                        height: "58px",
                        borderRadius: "16px",
                        background: "#eef2ff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "25px",
                        flexShrink: 0,
                      }}
                    >
                      👦
                    </div>

                    <div>
                      <strong
                        style={{
                          color: "#0f172a",
                          fontSize: "17px",
                        }}
                      >
                        {child.first_name}{" "}
                        {child.last_name}
                      </strong>

                      <div
                        style={{
                          color: "#64748b",
                          marginTop: "5px",
                        }}
                      >
                        🎓{" "}
                        {child.class_name}

                        {child.class_level
                          ? ` · ${child.class_level}`
                          : ""}
                      </div>

                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: "12px",
                          marginTop: "5px",
                        }}
                      >
                        Relation :{" "}
                        {child.relationship}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            )}
          </div>
        )}
      </>
    );
  }

 function GradesPage() {
    const groupedGrades = grades.reduce(
      (groups, grade) => {
        const trimester =
          grade.trimester ||
          grade.assessment_trimester ||
          "non_classe";

        if (!groups[trimester]) {
          groups[trimester] = [];
        }

        groups[trimester].push(grade);

        return groups;
      },
      {}
    );

    const trimesterOrder = {
      trimestre_1: 1,
      trimestre_2: 2,
      trimestre_3: 3,
    };

    const trimesterLabels = {
      trimestre_1: "Trimestre 1",
      trimestre_2: "Trimestre 2",
      trimestre_3: "Trimestre 3",
      non_classe: "Trimestre non précisé",
    };

    const groupedTrimesters =
      Object.entries(groupedGrades).sort(
        ([trimesterA], [trimesterB]) => {
          const orderA =
            trimesterOrder[trimesterA] || 99;

          const orderB =
            trimesterOrder[trimesterB] || 99;

          return orderA - orderB;
        }
      );

    return (
      <>
        <PageTitle
          icon="📊"
          title="Notes"
          description="Les résultats de vos enfants, avec leur matière."
          onBack={() => setPage("home")}
        />

        {!grades.length ? (
          <Empty
            text="Aucune note n'est encore disponible."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {groupedTrimesters.map(
              ([trimester, trimesterGrades]) => (
                <div
                  key={trimester}
                  style={{
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  <Card>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 900,
                        color: "#0f172a",
                        marginBottom: "4px",
                      }}
                    >
                      📚{" "}
                      {trimesterLabels[
                        trimester
                      ] ||
                        trimester}
                    </div>

                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "13px",
                      }}
                    >
                      {trimesterGrades.length}{" "}
                      note
                      {trimesterGrades.length >
                      1
                        ? "s"
                        : ""}
                    </div>
                  </Card>

                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    {trimesterGrades.map(
                      (grade) => (
                        <Card key={grade.id}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "flex-start",
                              gap: "12px",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color:
                                    "#4f46e5",
                                  fontWeight:
                                    800,
                                  fontSize:
                                    "13px",
                                }}
                              >
                                📚{" "}
                                {
                                  grade.subject_name
                                }
                              </div>

                              <h3
                                style={{
                                  margin:
                                    "7px 0 4px",
                                  color:
                                    "#0f172a",
                                  fontSize:
                                    "17px",
                                }}
                              >
                                {
                                  grade.assessment_title
                                }
                              </h3>

                              <div
                                style={{
                                  color:
                                    "#64748b",
                                  fontSize:
                                    "13px",
                                }}
                              >
                                {
                                  grade.child_name
                                }{" "}
                                ·{" "}
                                {formatDate(
                                  grade.assessment_date
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                background:
                                  "#eef2ff",
                                color:
                                  "#4338ca",
                                borderRadius:
                                  "12px",
                                padding:
                                  "9px 12px",
                                fontWeight:
                                  900,
                                fontSize:
                                  "16px",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatScore(
                                grade.score,
                                grade.max_score
                              )}
                            </div>
                          </div>

                          {grade.appreciation && (
                            <div
                              style={{
                                marginTop:
                                  "13px",
                                padding:
                                  "11px 13px",
                                borderRadius:
                                  "10px",
                                background:
                                  "#f8fafc",
                                color:
                                  "#475569",
                                fontSize:
                                  "13px",
                              }}
                            >
                              <strong>
                                Appréciation :
                              </strong>{" "}
                              {
                                grade.appreciation
                              }
                            </div>
                          )}
                        </Card>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </>
    );
  } 
 function AttendancePage() {
    const groupedAttendance = attendance.reduce(
      (groups, item) => {
        const date = new Date(
          item.attendance_date
        );

        if (Number.isNaN(date.getTime())) {
          return groups;
        }

        const monthKey =
          `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;

        if (!groups[monthKey]) {
          groups[monthKey] = {
            year: date.getFullYear(),
            month: date.getMonth(),
            items: [],
          };
        }

        groups[monthKey].items.push(item);

        return groups;
      },
      {}
    );

    const groupedMonths = Object.entries(
      groupedAttendance
    ).sort(
      ([, a], [, b]) => {
        const dateA = new Date(
          a.year,
          a.month,
          1
        );

        const dateB = new Date(
          b.year,
          b.month,
          1
        );

        return dateB - dateA;
      }
    );

    return (
      <>
        <PageTitle
          icon="🕐"
          title="Présence"
          description="Suivi des présences, absences et retards."
          onBack={() => setPage("home")}
        />

        {!attendance.length ? (
          <Empty
            text="Aucune présence enregistrée."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            {groupedMonths.map(
              ([monthKey, group]) => {
                const presentCount =
                  group.items.filter(
                    (item) =>
                      item.status === "present"
                  ).length;

                const absentCount =
                  group.items.filter(
                    (item) =>
                      item.status === "absent"
                  ).length;

                const lateCount =
                  group.items.filter(
                    (item) =>
                      item.status === "late"
                  ).length;

                const excusedCount =
                  group.items.filter(
                    (item) =>
                      item.status === "excused"
                  ).length;

                const excludedCount =
                  group.items.filter(
                    (item) =>
                      item.status === "excluded"
                  ).length;

                const monthLabel =
                  new Date(
                    group.year,
                    group.month,
                    1
                  ).toLocaleDateString(
                    "fr-FR",
                    {
                      month: "long",
                      year: "numeric",
                    }
                  );

                return (
                  <div
                    key={monthKey}
                    style={{
                      display: "grid",
                      gap: "10px",
                    }}
                  >
                    <Card>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 900,
                          color: "#0f172a",
                          textTransform:
                            "capitalize",
                          marginBottom: "12px",
                        }}
                      >
                        🗓️ {monthLabel}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px",
                            borderRadius: "10px",
                            background: "#f0fdf4",
                            color: "#166534",
                            fontWeight: 800,
                            fontSize: "13px",
                          }}
                        >
                          🟢 Présences
                          <div
                            style={{
                              fontSize: "20px",
                              marginTop: "3px",
                            }}
                          >
                            {presentCount}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "10px",
                            borderRadius: "10px",
                            background: "#fef2f2",
                            color: "#991b1b",
                            fontWeight: 800,
                            fontSize: "13px",
                          }}
                        >
                          🔴 Absences
                          <div
                            style={{
                              fontSize: "20px",
                              marginTop: "3px",
                            }}
                          >
                            {absentCount}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "10px",
                            borderRadius: "10px",
                            background: "#fff7ed",
                            color: "#9a3412",
                            fontWeight: 800,
                            fontSize: "13px",
                          }}
                        >
                          🟠 Retards
                          <div
                            style={{
                              fontSize: "20px",
                              marginTop: "3px",
                            }}
                          >
                            {lateCount}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "10px",
                            borderRadius: "10px",
                            background: "#eff6ff",
                            color: "#1e40af",
                            fontWeight: 800,
                            fontSize: "13px",
                          }}
                        >
                          🔵 Excusés
                          <div
                            style={{
                              fontSize: "20px",
                              marginTop: "3px",
                            }}
                          >
                            {excusedCount}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "10px",
                            borderRadius: "10px",
                            background: "#f5f3ff",
                            color: "#6d28d9",
                            fontWeight: 800,
                            fontSize: "13px",
                          }}
                        >
                          🚫 Exclusions
                          <div
                            style={{
                              fontSize: "20px",
                              marginTop: "3px",
                            }}
                          >
                            {excludedCount}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <div
                      style={{
                        display: "grid",
                        gap: "8px",
                      }}
                    >
                      {group.items.map(
                        (item) => {
                          const itemDate =
                            new Date(
                              item.attendance_date
                            );

                          const dayLabel =
                            !Number.isNaN(
                              itemDate.getTime()
                            )
                              ? itemDate.toLocaleDateString(
                                  "fr-FR",
                                  {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  }
                                )
                              : formatDate(
                                  item.attendance_date
                                );

                          const formatTime = (
                            value
                          ) => {
                            if (!value) {
                              return null;
                            }

                            const timeDate =
                              new Date(value);

                            if (
                              Number.isNaN(
                                timeDate.getTime()
                              )
                            ) {
                              return null;
                            }

                            return timeDate.toLocaleTimeString(
                              "fr-FR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            );
                          };

                          const entryTime =
                            formatTime(
                              item.entry_at
                            );

                          const exitTime =
                            formatTime(
                              item.exit_at
                            );

                          const statusLabel =
                            item.status ===
                            "present"
                              ? "🟢 Présent"
                              : item.status ===
                                "absent"
                              ? "🔴 Absent"
                              : item.status ===
                                "late"
                              ? "🟠 En retard"
                              : item.status ===
                                "excused"
                              ? "🔵 Excusé"
                              : item.status ===
                                "excluded"
                              ? "🚫 Exclusion"
                              : item.status;

                          return (
                            <Card key={item.id}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems:
                                    "flex-start",
                                  gap: "12px",
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                  }}
                                >
                                  <strong
                                    style={{
                                      color:
                                        "#0f172a",
                                    }}
                                  >
                                    {
                                      item.child_name
                                    }
                                  </strong>

                                  <div
                                    style={{
                                      color:
                                        "#0f172a",
                                      marginTop:
                                        "4px",
                                      fontSize:
                                        "13px",
                                      fontWeight:
                                        700,
                                      textTransform:
                                        "capitalize",
                                    }}
                                  >
                                    📅 {dayLabel}
                                  </div>

                                  <div
                                    style={{
                                      color:
                                        "#64748b",
                                      marginTop:
                                        "2px",
                                      fontSize:
                                        "12px",
                                    }}
                                  >
                                    {formatDate(
                                      item.attendance_date
                                    )}
                                  </div>

                                  {(entryTime ||
                                    exitTime) && (
                                    <div
                                      style={{
                                        display:
                                          "grid",
                                        gap:
                                          "4px",
                                        marginTop:
                                          "10px",
                                        padding:
                                          "8px 10px",
                                        borderRadius:
                                          "10px",
                                        background:
                                          "#f8fafc",
                                        fontSize:
                                          "13px",
                                      }}
                                    >
                                      {entryTime && (
                                        <div
                                          style={{
                                            color:
                                              "#166534",
                                            fontWeight:
                                              700,
                                          }}
                                        >
                                          🕐 Entrée :{" "}
                                          {
                                            entryTime
                                          }
                                        </div>
                                      )}

                                      {exitTime && (
                                        <div
                                          style={{
                                            color:
                                              "#1e40af",
                                            fontWeight:
                                              700,
                                          }}
                                        >
                                          🚪 Sortie :{" "}
                                          {
                                            exitTime
                                          }
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {(item.status ===
                                    "late" ||
                                    item.status ===
                                      "excluded" ||
                                    item.status ===
                                      "absent" ||
                                    item.status ===
                                      "excused") &&
                                    item.justification && (
                                      <div
                                        style={{
                                          marginTop:
                                            "8px",
                                          padding:
                                            "8px 10px",
                                          borderRadius:
                                            "10px",
                                          background:
                                            "#fffbeb",
                                          color:
                                            "#92400e",
                                          fontSize:
                                            "13px",
                                          fontWeight:
                                            600,
                                        }}
                                      >
                                        📝 Motif :{" "}
                                        {
                                          item.justification
                                        }
                                      </div>
                                    )}
                                </div>

                                <div
                                  style={{
                                    fontWeight: 800,
                                    fontSize:
                                      "13px",
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {statusLabel}
                                </div>
                              </div>
                            </Card>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </>
    );
  }
  function BulletinsPage() {
    return (
      <>
        <PageTitle
          icon="📄"
          title="Bulletins"
          description="Bulletins validés et transmis par l'école."
          onBack={() => setPage("home")}
        />

        {!bulletins.length ? (
          <Empty
            text="Aucun bulletin disponible."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {bulletins.map(
              (bulletin) => (
                <Card key={bulletin.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "#f1f5f9",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "21px",
                      }}
                    >
                      📄
                    </div>

                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <strong
                        style={{
                          color: "#0f172a",
                        }}
                      >
                        {bulletin.child_name}
                      </strong>

                      <div
                        style={{
                          marginTop: "5px",
                          color: "#475569",
                          fontSize: "13px",
                        }}
                      >
                        {bulletin.trimester}
                      </div>

                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        Statut :{" "}
                        {bulletin.status}
                      </div>
                    </div>
                  </div>

                  {bulletin.pdf_url && (
                    <button
                      type="button"
                      onClick={() =>
                        openBulletin(bulletin)
                      }
                      style={{
                        display: "inline-flex",
                        marginTop: "13px",
                        padding: "10px 13px",
                        borderRadius: "10px",
                        border: "none",
                        background: "#eef2ff",
                        color: "#4338ca",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: "13px",
                      }}
                    >
                      📥 Ouvrir le bulletin
                    </button>
                  )}
                </Card>
              )
            )}
          </div>
        )}
      </>
    );
  }

  function AdministrativePage() {
    return (
      <>
        <PageTitle
          icon="🏢"
          title="Service administratif"
          description="Informations et échanges avec le secrétariat."
          onBack={() => setPage("home")}
        />

        {adminAnnouncements.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h3
              style={{
                margin: "0 0 12px",
                color: "#0f172a",
                fontSize: "17px",
              }}
            >
              📢 Informations de l'administration
            </h3>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {adminAnnouncements.map(
                (item) => (
                  <Card key={item.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        alignItems: "flex-start",
                      }}
                    >
                      <strong
                        style={{
                          color: "#0f172a",
                          fontSize: "16px",
                        }}
                      >
                        {item.title}
                      </strong>

                      <span
                        style={{
                          color: "#4f46e5",
                          fontWeight: 800,
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        📢 Information
                      </span>
                    </div>

                    <p
                      style={{
                        margin:
                          "12px 0 10px",
                        color: "#475569",
                        lineHeight: 1.6,
                        fontSize: "14px",
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {item.message}
                    </p>

                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                      }}
                    >
                      Publiée le{" "}
                      {formatDate(
                        item.published_at ||
                          item.created_at
                      )}
                    </div>
                  </Card>
                )
              )}
            </div>
          </div>
        )}

        {/* CONVOCATIONS */}
        {adminMeetings.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h3
              style={{
                margin: "0 0 12px",
                color: "#0f172a",
                fontSize: "17px",
              }}
            >
              📅 Convocations
            </h3>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {adminMeetings.map((meeting) => {
                const child = children.find(
                  (item) =>
                    item.id === meeting.student_id
                );

                return (
                  <Card key={meeting.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        alignItems: "flex-start",
                      }}
                    >
                      <strong
                        style={{
                          color: "#0f172a",
                          fontSize: "16px",
                        }}
                      >
                        📅 Convocation
                      </strong>

                      <span
                        style={{
                          color: "#4f46e5",
                          fontWeight: 800,
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {meeting.status ||
                          "À venir"}
                      </span>
                    </div>

                    <p
                      style={{
                        margin:
                          "12px 0 10px",
                        color: "#475569",
                        lineHeight: 1.6,
                        fontSize: "14px",
                      }}
                    >
                      <strong>Motif :</strong>{" "}
                      {meeting.reason ||
                        "Non renseigné"}
                    </p>

                    {child && (
                      <p
                        style={{
                          margin:
                            "0 0 10px",
                          color: "#475569",
                          lineHeight: 1.6,
                          fontSize: "14px",
                        }}
                      >
                        <strong>Élève :</strong>{" "}
                        {child.first_name}{" "}
                        {child.last_name}
                      </p>
                    )}

                    <p
                      style={{
                        margin:
                          "0 0 10px",
                        color: "#475569",
                        lineHeight: 1.6,
                        fontSize: "14px",
                      }}
                    >
                      <strong>Date :</strong>{" "}
                      {meeting.meeting_date
                        ? new Date(
                            `${meeting.meeting_date}T00:00:00`
                          ).toLocaleDateString(
                            "fr-FR"
                          )
                        : "Non renseignée"}
                    </p>

                    {meeting.meeting_time && (
                      <p
                        style={{
                          margin:
                            "0 0 10px",
                          color: "#475569",
                          lineHeight: 1.6,
                          fontSize: "14px",
                        }}
                      >
                        <strong>Heure :</strong>{" "}
                        {String(
                          meeting.meeting_time
                        ).slice(0, 5)}
                      </p>
                    )}

                    {meeting.notes && (
                      <p
                        style={{
                          margin: 0,
                          color: "#475569",
                          lineHeight: 1.6,
                          fontSize: "14px",
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        <strong>Notes :</strong>{" "}
                        {meeting.notes}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {adminMessages.length > 0 && (
          <div>
            <h3
              style={{
                margin: "0 0 12px",
                color: "#0f172a",
                fontSize: "17px",
              }}
            >
              💬 Messages du secrétariat
            </h3>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {adminMessages.map(
                (item) => (
                  <Card key={item.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <strong
                        style={{
                          color: "#0f172a",
                        }}
                      >
                        {item.subject}
                      </strong>

                      {!item.read_at && (
                        <span
                          style={{
                            color: "#dc2626",
                            fontWeight: 800,
                            fontSize: "12px",
                          }}
                        >
                          Nouveau
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        color: "#475569",
                        lineHeight: 1.6,
                        fontSize: "14px",
                      }}
                    >
                      {item.message}
                    </p>

                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                      }}
                    >
                      {formatDate(
                        item.created_at
                      )}
                    </div>

                    {!item.read_at && (
                      <button
                        type="button"
                        onClick={() =>
                          markMessageRead(
                            item.id
                          )
                        }
                        style={{
                          marginTop: "11px",
                          border:
                            "1px solid #c7d2fe",
                          background:
                            "#eef2ff",
                          color: "#4338ca",
                          borderRadius: "9px",
                          padding:
                            "9px 12px",
                          cursor: "pointer",
                          fontWeight: 800,
                          fontSize: "12px",
                        }}
                      >
                        ✓ Marquer comme lu
                      </button>
                    )}
                  </Card>
                )
              )}
            </div>
          </div>
        )}

        {!adminAnnouncements.length &&
          !adminMeetings.length &&
          !adminMessages.length && (
            <Empty
              text="Aucune information, convocation ou message du service administratif."
            />
          )}
      </>
    );
  }

  function NotificationsPage() {
    return (
      <>
        <PageTitle
          icon="🔔"
          title="Notifications"
          description="Les informations importantes de l'école."
          onBack={() => setPage("home")}
        />

        {!notifications.length ? (
          <Empty
            text="Aucune notification."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {notifications.map(
              (item) => (
                <Card key={item.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <strong
                      style={{
                        color: "#0f172a",
                      }}
                    >
                      {item.title}
                    </strong>

                    {!item.read_at && (
                      <span
                        style={{
                          color: "#dc2626",
                          fontWeight: 800,
                          fontSize: "12px",
                        }}
                      >
                        Nouveau
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      color: "#475569",
                      lineHeight: 1.6,
                      fontSize: "14px",
                    }}
                  >
                    {item.message}
                  </p>

                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: "12px",
                    }}
                  >
                    {formatDate(
                      item.created_at
                    )}
                  </div>

                  {!item.read_at && (
                    <button
                      type="button"
                      onClick={() =>
                        markNotificationRead(
                          item.id
                        )
                      }
                      style={{
                        marginTop: "11px",
                        border:
                          "1px solid #c7d2fe",
                        background:
                          "#eef2ff",
                        color: "#4338ca",
                        borderRadius: "9px",
                        padding:
                          "9px 12px",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: "12px",
                      }}
                    >
                      ✓ Marquer comme lu
                    </button>
                  )}
                </Card>
              )
            )}
          </div>
        )}
      </>
    );
  }

  function CommunicationPage() {
    const orderedMessages = [...adminMessages].reverse();
    const lastMessage =
      adminMessages[adminMessages.length - 1];

    const handleEditParentMessage = async (item) => {
      const newText = window.prompt(
        "Modifier votre message :",
        item.message || ""
      );

      if (newText === null) {
        return;
      }

      const text = String(newText).trim();

      if (!text || text === item.message) {
        return;
      }

      await editParentMessage(item.id, text);
    };

    return (
      <>
        <PageTitle
          icon="💬"
          title="Communication"
          description="Échangez avec le service administratif de l'école."
          onBack={() => setPage("home")}
        />

        {!adminMessages.length ? (
          <Empty
            text="Aucun message reçu du service administratif."
          />
        ) : (
          <Card
            style={{
              padding: 0,
              overflow: "hidden",
              background: "#f8fafc",
            }}
          >
            {/* EN-TÊTE DE LA CONVERSATION */}
            <div
              style={{
                padding: "16px 18px",
                background: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "#eef2ff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                🏢
              </div>

              <div>
                <div
                  style={{
                    color: "#0f172a",
                    fontWeight: 900,
                    fontSize: "15px",
                  }}
                >
                  Service administratif
                </div>

                <div
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    marginTop: "2px",
                  }}
                >
                  Communication avec votre école
                </div>
              </div>
            </div>

            {/* MESSAGES */}
            <div
              style={{
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                maxHeight: "600px",
                overflowY: "auto",
              }}
            >
              {orderedMessages.map((item) => {
                const isParent =
                  item.sender_type === "parent";

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: isParent
                        ? "flex-end"
                        : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isParent
                          ? "flex-end"
                          : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "#64748b",
                          marginBottom: "4px",
                          padding: "0 6px",
                        }}
                      >
                        {isParent
                          ? "Vous"
                          : "Service administratif"}
                      </div>

                      <div
                        style={{
                          background: isParent
                            ? "#4f46e5"
                            : "#ffffff",
                          color: isParent
                            ? "#ffffff"
                            : "#0f172a",
                          border: isParent
                            ? "none"
                            : "1px solid #e2e8f0",
                          borderRadius: isParent
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                          padding: "12px 14px",
                          boxShadow:
                            "0 2px 6px rgba(15,23,42,0.06)",
                        }}
                      >
                        {item.subject && (
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: "13px",
                              marginBottom: "6px",
                              color: isParent
                                ? "#ffffff"
                                : "#4338ca",
                            }}
                          >
                            {item.subject}
                          </div>
                        )}

                        <div
                          style={{
                            fontSize: "14px",
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.message}
                        </div>

                        <div
                          style={{
                            marginTop: "7px",
                            fontSize: "10px",
                            color: isParent
                              ? "rgba(255,255,255,0.75)"
                              : "#94a3b8",
                            textAlign: "right",
                          }}
                        >
                          {formatDate(item.created_at)}
                        </div>
                      </div>

                      {/* ACTION MODIFIER UNIQUEMENT POUR LE PARENT */}
                      {isParent && (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "4px",
      marginTop: "6px",
    }}
  >
    <button
      type="button"
      onClick={() =>
        handleEditParentMessage(item)
      }
      style={{
        border: "none",
        background: "transparent",
        color: "#4338ca",
        cursor: "pointer",
        fontSize: "11px",
        fontWeight: 800,
        padding: "2px 6px",
      }}
    >
      ✏️ Modifier
    </button>

    <button
      type="button"
      onClick={async () => {
        const confirmed = window.confirm(
          "Voulez-vous vraiment supprimer ce message ?"
        );

        if (!confirmed) {
          return;
        }

        await deleteParentMessage(item.id);
      }}
      style={{
        border: "none",
        background: "transparent",
        color: "#dc2626",
        cursor: "pointer",
        fontSize: "11px",
        fontWeight: 800,
        padding: "2px 6px",
      }}
    >
      🗑️ Supprimer
    </button>
  </div>
)}

                      {!isParent &&
                        !item.read_at && (
                          <button
                            type="button"
                            onClick={() =>
                              markMessageRead(item.id)
                            }
                            style={{
                              marginTop: "6px",
                              border: "none",
                              background: "transparent",
                              color: "#4338ca",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "2px 6px",
                            }}
                          >
                            ✓ Marquer comme lu
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ZONE DE RÉPONSE */}
            {lastMessage && (
              <div
                style={{
                  padding: "14px 16px",
                  background: "#ffffff",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#64748b",
                    marginBottom: "7px",
                  }}
                >
                  Répondre au service administratif
                </div>

                <textarea
                  value={replyDrafts[lastMessage.id] || ""}
                  onChange={(e) =>
                    setReplyDrafts((current) => ({
                      ...current,
                      [lastMessage.id]: e.target.value,
                    }))
                  }
                  placeholder="Écrivez votre message..."
                  rows={3}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    padding: "11px 12px",
                    fontSize: "14px",
                    color: "#0f172a",
                    background: "#f8fafc",
                    resize: "vertical",
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      sendReply(lastMessage)
                    }
                    disabled={
                      replyLoadingId === lastMessage.id
                    }
                    style={{
                      border: "none",
                      background: "#4f46e5",
                      color: "#ffffff",
                      borderRadius: "10px",
                      padding: "10px 16px",
                      cursor:
                        replyLoadingId === lastMessage.id
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: 800,
                      fontSize: "13px",
                      opacity:
                        replyLoadingId === lastMessage.id
                          ? 0.6
                          : 1,
                    }}
                  >
                    {replyLoadingId === lastMessage.id
                      ? "Envoi..."
                      : "➤ Envoyer"}
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </>
    );
  }

  function renderPage() {
    if (page === "home")
      return <HomePage />;

    if (page === "children")
      return <ChildrenPage />;

    if (page === "grades")
      return <GradesPage />;

    if (page === "attendance")
      return <AttendancePage />;

    if (page === "bulletins")
      return <BulletinsPage />;

    if (page === "documents")
      return (
        <ParentDoc
          schoolId={schoolId}
          parentId={currentParentId}
          onBack={() => setPage("home")}
        />
      );

    if (page === "communication")
      return CommunicationPage();

    if (page === "administrative")
      return <AdministrativePage />;

    if (page === "notifications")
      return <NotificationsPage />;
if (page === "ape")
  return (
    <ParentAPEPage
      schoolId={schoolId}
      parentId={currentParentId}
      onBack={() => setPage("home")}
    />
  );
    return <HomePage />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        color: "#0f172a",
      }}
    >
      <aside
        style={{
          width: "250px",
          minWidth: "250px",
          minHeight: "100vh",
          background: "#ffffff",
          borderRight:
            "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          boxShadow:
            "2px 0 12px rgba(15,23,42,0.04)",
          zIndex: 20,
        }}
      >
        <div
          style={{
            padding: "22px 18px",
            borderBottom:
              "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#4f46e5",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                fontSize: "14px",
                boxShadow:
                  "0 5px 15px rgba(79,70,229,0.25)",
                flexShrink: 0,
              }}
            >
              EC
            </div>

            <div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                École Connectée
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  marginTop: "2px",
                }}
              >
                Espace Parent
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "18px",
            borderBottom:
              "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#eef2ff",
                color: "#4338ca",
                display: "grid",
                placeItems: "center",
                fontSize: "19px",
                flexShrink: 0,
              }}
            >
              👨‍👩‍👧
            </div>

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "#0f172a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile?.full_name ||
                  "Parent"}
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  marginTop: "2px",
                }}
              >
                Parent
              </div>
            </div>
          </div>
        </div>

        <nav
          style={{
            flex: 1,
            padding: "14px 10px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 900,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "5px 10px 10px",
            }}
          >
            Navigation
          </div>

          <div
            style={{
              display: "grid",
              gap: "4px",
            }}
          >
            {MENU.map((item) => {
              const active =
                page === item.id;

              const hasNotificationBadge =
                item.id ===
                  "notifications" &&
                unreadNotifications > 0;

              const hasMessageBadge =
                item.id ===
                  "administrative" &&
                unreadMessages > 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setPage(item.id)
                  }
                  style={{
                    position: "relative",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "11px",
                    border: "none",
                    borderRadius: "10px",
                    padding: "11px 12px",
                    background: active
                      ? "#eef2ff"
                      : "transparent",
                    color: active
                      ? "#4338ca"
                      : "#475569",
                    fontWeight: active
                      ? 800
                      : 650,
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: "24px",
                      textAlign: "center",
                      fontSize: "18px",
                      flexShrink: 0,
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

                  {hasNotificationBadge && (
                    <span
                      style={{
                        minWidth: "20px",
                        height: "20px",
                        padding: "0 5px",
                        borderRadius: "999px",
                        background: "#dc2626",
                        color: "#ffffff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "10px",
                        fontWeight: 900,
                      }}
                    >
                      {unreadNotifications}
                    </span>
                  )}

                  {hasMessageBadge && (
                    <span
                      style={{
                        minWidth: "20px",
                        height: "20px",
                        padding: "0 5px",
                        borderRadius: "999px",
                        background: "#dc2626",
                        color: "#ffffff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "10px",
                        fontWeight: 900,
                      }}
                    >
                      {unreadMessages}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div
          style={{
            padding: "15px",
            borderTop:
              "1px solid #e2e8f0",
            marginTop: "auto",
          }}
        >
          <button
            type="button"
            onClick={onLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "11px 14px",
              borderRadius: "10px",
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#dc2626",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: "17px",
              }}
            >
              🚪
            </span>

            <span>
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: "100vh",
          background: "#f8fafc",
        }}
      >
        <header
          style={{
            background: "#ffffff",
            borderBottom:
              "1px solid #e2e8f0",
            padding: "18px 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                color: "#4f46e5",
                fontSize: "11px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              ESPACE PARENT
            </div>

            <h1
              style={{
                margin: "4px 0 0",
                fontSize: "22px",
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              Bonjour
              {profile?.full_name
                ? `, ${profile.full_name}`
                : ""}{" "}
              👋
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            <span>👨‍👩‍👧</span>
            <span>Parent</span>
          </div>
        </header>

        {error && (
          <div
            className="error-message"
            style={{
              margin: "18px 26px 0",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: "26px",
            }}
          >
            <Card>
              <div
                style={{
                  textAlign: "center",
                  padding: "35px 20px",
                  color: "#64748b",
                }}
              >
                Chargement de votre
                espace Parent...
              </div>
            </Card>
          </div>
        ) : (
          <div
            style={{
              padding: "24px 26px 35px",
              maxWidth: "1250px",
            }}
          >
            {renderPage()}
          </div>
        )}
      </main>
    </div>
  );
}
