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
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        marginBottom: "18px",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          border: "1px solid #e5e7eb",
          background: "#fff",
          borderRadius: "10px",
          padding: "9px 12px",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        ← Retour
      </button>

      <div>
        <h2
          style={{
            margin: 0,
            color: "#111827",
          }}
        >
          {icon} {title}
        </h2>

        {description && (
          <p
            style={{
              margin: "5px 0 0",
              color: "#6b7280",
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "16px",
        boxShadow:
          "0 2px 8px rgba(15,23,42,0.04)",
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
          color: "#6b7280",
          textAlign: "center",
          padding: "20px",
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
  const [adminMessages, setAdminMessages] =
    useState([]);
  const [notifications, setNotifications] =
    useState([]);

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

      setActiveSchoolId(
        resolvedSchoolId
      );

      if (!resolvedSchoolId) {
        setError(
          "Aucune école n'est associée à ce compte."
        );

        setChildren([]);
        setGrades([]);
        setAttendance([]);
        setBulletins([]);
        setAdminMessages([]);
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
        .eq(
          "profile_id",
          connectedUserId
        )
        .eq(
          "school_id",
          resolvedSchoolId
        )
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
        setNotifications([]);

        setError(
          "Aucun profil parent associé à ce compte."
        );

        return;
      }

      const {
        data: links,
        error: linksError,
      } = await supabase
        .from("parent_students")
        .select(
          "id,parent_id,student_id,relationship,is_primary,created_at"
        )
        .eq(
          "parent_id",
          parent.id
        );

      if (linksError) {
        throw linksError;
      }

      const studentIds = (links || [])
        .map(
          (item) => item.student_id
        )
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
          .eq(
            "school_id",
            resolvedSchoolId
          )
          .in(
            "id",
            studentIds
          );

        if (studentsError) {
          throw studentsError;
        }

        studentRows = data || [];
      }

      const classIds = [
        ...new Set(
          studentRows
            .map(
              (student) =>
                student.class_id
            )
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
          .eq(
            "school_id",
            resolvedSchoolId
          )
          .in(
            "id",
            classIds
          );

        if (classesError) {
          throw classesError;
        }

        classRows = data || [];
      }

      const classMap = new Map(
        classRows.map(
          (item) => [
            String(item.id),
            item,
          ]
        )
      );

      const childMap = new Map();

      studentRows.forEach(
        (student) => {
          const link =
            (links || []).find(
              (item) =>
                item.student_id ===
                student.id
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
                  String(
                    student.class_id
                  )
                )?.name ||
                "Classe non renseignée",

              class_level:
                classMap.get(
                  String(
                    student.class_id
                  )
                )?.level || "",
            }
          );
        }
      );

      const normalizedChildren =
        studentRows
          .map(
            (student) =>
              childMap.get(
                String(student.id)
              )
          )
          .filter(Boolean);

      setChildren(
        normalizedChildren
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
          .eq(
            "school_id",
            resolvedSchoolId
          )
          .in(
            "student_id",
            studentIds
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

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
              coefficient
            `)
            .eq(
              "school_id",
              resolvedSchoolId
            )
            .in(
              "id",
              assessmentIds
            );

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
            .eq(
              "school_id",
              resolvedSchoolId
            )
            .in(
              "id",
              subjectIds
            );

          if (subjectsError) {
            throw subjectsError;
          }

          subjectRows =
            data || [];
        }

        const subjectMap =
          new Map(
            subjectRows.map(
              (item) => [
                String(item.id),
                item,
              ]
            )
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
                  String(
                    subjectId
                  )
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

                max_score:
                  assessment?.max_score ||
                  20,

                coefficient:
                  assessment?.coefficient ||
                  1,
              };
            }
          );

        setGrades(
          normalizedGrades
        );

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
            justification,
            justified,
            created_at
          `)
          .in(
            "student_id",
            studentIds
          )
          .order(
            "attendance_date",
            {
              ascending: false,
            }
          );

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
          .eq(
            "school_id",
            resolvedSchoolId
          )
          .in(
            "student_id",
            studentIds
          )
          .in(
            "status",
            [
              "validated",
              "sent",
            ]
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

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
          read_at,
          created_at
        `)
        .eq(
          "school_id",
          resolvedSchoolId
        )
        .eq(
          "parent_id",
          parent.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (messagesError) {
        throw messagesError;
      }

      setAdminMessages(
        messages || []
      );

      const {
        data: notificationRows,
        error:
          notificationsError,
      } = await supabase
        .from(
          "parent_notifications"
        )
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
        .eq(
          "school_id",
          resolvedSchoolId
        )
        .eq(
          "parent_id",
          parent.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (notificationsError) {
        throw notificationsError;
      }

      setNotifications(
        notificationRows || []
      );
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
        .eq(
          "profile_id",
          connectedUserId
        )
        .eq(
          "school_id",
          currentSchoolId
        )
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
                "parent_notifications",
              filter:
                `parent_id=eq.${parent.id}`,
            },
            () => {
              loadParentData();
            }
          )
          .subscribe();
    }

    subscribeRealtime();

    return () => {
      active = false;

      if (channel) {
        supabase.removeChannel(
          channel
        );
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
      .from(
        "parent_notifications"
      )
      .update({
        read_at: now,
      })
      .eq(
        "id",
        notificationId
      )
      .eq(
        "school_id",
        currentSchoolId
      );

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
          item.id ===
          notificationId
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
      .from(
        "secretary_parent_messages"
      )
      .update({
        read_at: now,
      })
      .eq(
        "id",
        messageId
      )
      .eq(
        "school_id",
        currentSchoolId
      );

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
            marginBottom: "18px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#111827",
            }}
          >
            👨‍👩‍👧 Espace Parent
          </h2>

          <p
            style={{
              color: "#6b7280",
              marginBottom: 0,
            }}
          >
            Suivez la scolarité de
            vos enfants depuis un
            seul espace.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "12px",
          }}
        >
          {homeItems.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setPage(item.id)
                }
                style={{
                  textAlign: "left",
                  background: "#fff",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "16px",
                  cursor: "pointer",
                  boxShadow:
                    "0 2px 8px rgba(15,23,42,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: "25px",
                    marginBottom: "8px",
                  }}
                >
                  {item.icon}
                </div>

                <strong
                  style={{
                    color: "#111827",
                  }}
                >
                  {item.label}
                </strong>

                {item.id ===
                  "notifications" &&
                  unreadNotifications >
                    0 && (
                    <span
                      style={{
                        marginLeft: "8px",
                        color: "#dc2626",
                        fontWeight: 800,
                      }}
                    >
                      {
                        unreadNotifications
                      }
                    </span>
                  )}

                {item.id ===
                  "administrative" &&
                  unreadMessages >
                    0 && (
                    <span
                      style={{
                        marginLeft: "8px",
                        color: "#dc2626",
                        fontWeight: 800,
                      }}
                    >
                      {unreadMessages}
                    </span>
                  )}
              </button>
            )
          )}
        </div>
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
          onBack={() =>
            setPage("home")
          }
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
                        width: "52px",
                        height: "52px",
                        borderRadius:
                          "50%",
                        background:
                          "#eef2ff",
                        display: "grid",
                        placeItems:
                          "center",
                        fontSize: "24px",
                      }}
                    >
                      👦
                    </div>

                    <div>
                      <strong
                        style={{
                          color:
                            "#111827",
                          fontSize:
                            "17px",
                        }}
                      >
                        {child.first_name}{" "}
                        {child.last_name}
                      </strong>

                      <div
                        style={{
                          color:
                            "#6b7280",
                          marginTop:
                            "4px",
                        }}
                      >
                        {child.class_name}

                        {child.class_level
                          ? ` · ${child.class_level}`
                          : ""}
                      </div>

                      <div
                        style={{
                          color:
                            "#6b7280",
                          fontSize:
                            "12px",
                          marginTop:
                            "4px",
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
    return (
      <>
        <PageTitle
          icon="📊"
          title="Notes"
          description="Les résultats de vos enfants, avec leur matière."
          onBack={() =>
            setPage("home")
          }
        />

        {!grades.length ? (
          <Empty
            text="Aucune note n'est encore disponible."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {grades.map(
              (grade) => (
                <Card key={grade.id}>
                  <div
                    style={{
                      color:
                        "#4f46e5",
                      fontWeight: 800,
                      fontSize:
                        "13px",
                    }}
                  >
                    {grade.subject_name}
                  </div>

                  <h3
                    style={{
                      margin:
                        "8px 0 4px",
                      color:
                        "#111827",
                    }}
                  >
                    {grade.assessment_title}
                  </h3>

                  <div
                    style={{
                      color:
                        "#6b7280",
                      fontSize:
                        "13px",
                    }}
                  >
                    {grade.child_name}{" "}
                    ·{" "}
                    {formatDate(
                      grade.assessment_date
                    )}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "10px",
                      fontSize:
                        "22px",
                      fontWeight: 800,
                    }}
                  >
                    {formatScore(
                      grade.score,
                      grade.max_score
                    )}
                  </div>

                  {grade.appreciation && (
                    <p
                      style={{
                        color:
                          "#374151",
                      }}
                    >
                      <strong>
                        Appréciation :
                      </strong>{" "}
                      {
                        grade.appreciation
                      }
                    </p>
                  )}
                </Card>
              )
            )}
          </div>
        )}
      </>
    );
  }

  function AttendancePage() {
    return (
      <>
        <PageTitle
          icon="🕐"
          title="Présence"
          description="Suivi des présences, absences et retards."
          onBack={() =>
            setPage("home")
          }
        />

        {!attendance.length ? (
          <Empty
            text="Aucune présence enregistrée."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            {attendance.map(
              (item) => (
                <Card key={item.id}>
                  <strong>
                    {item.child_name}
                  </strong>

                  <div
                    style={{
                      color:
                        "#6b7280",
                      marginTop:
                        "4px",
                    }}
                  >
                    {formatDate(
                      item.attendance_date
                    )}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "8px",
                      fontWeight: 800,
                    }}
                  >
                    {item.status ===
                      "present" &&
                      "🟢 Présent"}

                    {item.status ===
                      "absent" &&
                      "🔴 Absent"}

                    {item.status ===
                      "late" &&
                      "🟠 En retard"}

                    {item.status ===
                      "excused" &&
                      "🔵 Excusé"}
                  </div>
                </Card>
              )
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
          onBack={() =>
            setPage("home")
          }
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
                <Card
                  key={bulletin.id}
                >
                  <strong>
                    {
                      bulletin.child_name
                    }
                  </strong>

                  <div
                    style={{
                      marginTop:
                        "6px",
                    }}
                  >
                    {
                      bulletin.trimester
                    }
                  </div>

                  <div
                    style={{
                      color:
                        "#6b7280",
                      marginTop:
                        "5px",
                    }}
                  >
                    Statut :{" "}
                    {bulletin.status}
                  </div>

                  {bulletin.pdf_url && (
                    <a
                      href={
                        bulletin.pdf_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display:
                          "inline-block",
                        marginTop:
                          "10px",
                      }}
                    >
                      📥 Ouvrir le bulletin
                    </a>
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
          description="Messages et échanges avec le secrétariat."
          onBack={() =>
            setPage("home")
          }
        />

        {!adminMessages.length ? (
          <Empty
            text="Aucun message du service administratif."
          />
        ) : (
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
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                    }}
                  >
                    <strong>
                      {item.subject}
                    </strong>

                    {!item.read_at && (
                      <span
                        style={{
                          color:
                            "#dc2626",
                          fontWeight:
                            800,
                        }}
                      >
                        Nouveau
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      color:
                        "#374151",
                      lineHeight:
                        1.5,
                    }}
                  >
                    {item.message}
                  </p>

                  <div
                    style={{
                      color:
                        "#6b7280",
                      fontSize:
                        "12px",
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
                        marginTop:
                          "10px",
                        cursor:
                          "pointer",
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

  function NotificationsPage() {
    return (
      <>
        <PageTitle
          icon="🔔"
          title="Notifications"
          description="Les informations importantes de l'école."
          onBack={() =>
            setPage("home")
          }
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
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                    }}
                  >
                    <strong>
                      {item.title}
                    </strong>

                    {!item.read_at && (
                      <span
                        style={{
                          color:
                            "#dc2626",
                          fontWeight:
                            800,
                        }}
                      >
                        Nouveau
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      color:
                        "#374151",
                      lineHeight:
                        1.5,
                    }}
                  >
                    {item.message}
                  </p>

                  <div
                    style={{
                      color:
                        "#6b7280",
                      fontSize:
                        "12px",
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
                        marginTop:
                          "10px",
                        cursor:
                          "pointer",
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
    return (
      <>
        <PageTitle
          icon="💬"
          title="Communication"
          description="Espace de communication lié à la scolarité."
          onBack={() =>
            setPage("home")
          }
        />

        <Empty
          text="La communication parent sera reliée à son module dédié."
        />
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

    if (page === "communication")
      return (
        <CommunicationPage />
      );

    if (page === "administrative")
      return (
        <AdministrativePage />
      );

    if (page === "notifications")
      return (
        <NotificationsPage />
      );

    return <HomePage />;
  }

  return (
    <div className="app-container">
      <div
        className="dashboard-card"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          className="dashboard-header"
          style={{
            alignItems: "center",
          }}
        >
          <div>
            <div className="small-logo">
              EC
            </div>

            <h1>
              École Connectée
            </h1>
          </div>

          <button
            className="logout-button"
            onClick={onLogout}
          >
            Se déconnecter
          </button>
        </div>

        <div className="welcome-section">
          <h2>
            Bonjour
            {profile?.full_name
              ? `, ${profile.full_name}`
              : ""}{" "}
            👋
          </h2>

          <p>
            👨‍👩‍👧 Parent
            {unreadNotifications >
              0 ||
            unreadMessages > 0
              ? " · 🔔 Nouvelles informations"
              : ""}
          </p>
        </div>

        {error && (
          <div
            className="error-message"
            style={{
              marginBottom: "15px",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <Card>
            <div
              style={{
                textAlign:
                  "center",
                padding: "25px",
              }}
            >
              Chargement de votre
              espace Parent...
            </div>
          </Card>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(145px,1fr))",
                gap: "8px",
                marginBottom:
                  "20px",
              }}
            >
              {MENU.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setPage(item.id)
                  }
                  style={{
                    position:
                      "relative",
                    border:
                      page === item.id
                        ? "2px solid #4f46e5"
                        : "1px solid #e5e7eb",
                    background:
                      page === item.id
                        ? "#eef2ff"
                        : "#fff",
                    borderRadius:
                      "11px",
                    padding:
                      "11px 8px",
                    cursor:
                      "pointer",
                    fontWeight: 700,
                    color:
                      "#111827",
                  }}
                >
                  <span
                    style={{
                      fontSize:
                        "19px",
                    }}
                  >
                    {item.icon}
                  </span>

                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        "4px",
                      fontSize:
                        "12px",
                    }}
                  >
                    {item.label}
                  </span>

                  {item.id ===
                    "notifications" &&
                    unreadNotifications >
                      0 && (
                      <span
                        style={{
                          position:
                            "absolute",
                          top: "5px",
                          right: "7px",
                          minWidth:
                            "19px",
                          height:
                            "19px",
                          padding:
                            "0 5px",
                          borderRadius:
                            "999px",
                          background:
                            "#dc2626",
                          color:
                            "#fff",
                          fontSize:
                            "11px",
                          display:
                            "grid",
                          placeItems:
                            "center",
                        }}
                      >
                        {
                          unreadNotifications
                        }
                      </span>
                    )}

                  {item.id ===
                    "administrative" &&
                    unreadMessages >
                      0 && (
                      <span
                        style={{
                          position:
                            "absolute",
                          top: "5px",
                          right: "7px",
                          minWidth:
                            "19px",
                          height:
                            "19px",
                          padding:
                            "0 5px",
                          borderRadius:
                            "999px",
                          background:
                            "#dc2626",
                          color:
                            "#fff",
                          fontSize:
                            "11px",
                          display:
                            "grid",
                          placeItems:
                            "center",
                        }}
                      >
                        {unreadMessages}
                      </span>
                    )}
                </button>
              ))}
            </div>

            {renderPage()}
          </>
        )}
      </div>
    </div>
  );
}
