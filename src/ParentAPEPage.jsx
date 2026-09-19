import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAmount(value) {
  const amount = Number(value || 0);

  return `${amount.toLocaleString("fr-FR")} FCFA`;
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

function SectionTitle({ icon, title, description }) {
  return (
    <div style={{ marginBottom: "16px" }}>
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
            borderRadius: "11px",
            background: "#eef2ff",
            display: "grid",
            placeItems: "center",
            fontSize: "20px",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: "18px",
              fontWeight: 900,
            }}
          >
            {title}
          </h3>

          {description && (
            <p
              style={{
                margin: "4px 0 0",
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

function EmptyState({ icon = "📭", text }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "28px 15px",
        color: "#64748b",
      }}
    >
      <div
        style={{
          fontSize: "30px",
          marginBottom: "8px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: "14px",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function ParentAPEPage({
  schoolId,
  parentId,
  onBack,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [ape, setApe] = useState(null);
  const [member, setMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [contributions, setContributions] = useState([]);

  const [activeSection, setActiveSection] = useState("home");

  const isPresident = Boolean(
    member?.is_president === true
  );

  const isActiveMember =
    member?.status === "active";

  const visibleMembers = useMemo(
    () =>
      members.filter(
        (item) => item.status === "active"
      ),
    [members]
  );

  async function loadAPE() {
    if (!schoolId || !parentId) {
      setLoading(false);
      setError(
        "Impossible d'identifier votre école ou votre compte parent."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: apeData,
        error: apeError,
      } = await supabase
        .from("school_apes")
        .select(
          "id,school_id,name,academic_year,description,active"
        )
        .eq("school_id", schoolId)
        .maybeSingle();

      if (apeError) {
        throw apeError;
      }

      if (!apeData) {
        setApe(null);
        setMember(null);
        setMembers([]);
        setMeetings([]);
        setAnnouncements([]);
        setActivities([]);
        setContributions([]);
        setLoading(false);
        return;
      }

      setApe(apeData);

      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("ape_members")
        .select(
          "id,ape_id,parent_id,function_name,status,joined_at,notes,is_president"
        )
        .eq("ape_id", apeData.id)
        .eq("parent_id", parentId)
        .maybeSingle();

      if (memberError) {
        throw memberError;
      }

      setMember(memberData || null);

      const [
        membersResult,
        meetingsResult,
        announcementsResult,
        activitiesResult,
      ] = await Promise.all([
        supabase
          .from("ape_members")
          .select(
            "id,ape_id,parent_id,function_name,status,joined_at,notes,is_president"
          )
          .eq("ape_id", apeData.id)
          .eq("status", "active"),

        supabase
          .from("ape_meetings")
          .select(
            "id,ape_id,title,description,meeting_date,meeting_time,location,status,agenda,minutes"
          )
          .eq("ape_id", apeData.id)
          .order("meeting_date", {
            ascending: true,
          }),

        supabase
          .from("ape_announcements")
          .select(
            "id,ape_id,title,content,status,published_at,created_at"
          )
          .eq("ape_id", apeData.id)
          .eq("status", "published")
          .order("published_at", {
            ascending: false,
          }),

        supabase
          .from("ape_activities")
          .select(
            "id,ape_id,title,description,activity_date,location,status,budget,notes"
          )
          .eq("ape_id", apeData.id)
          .order("activity_date", {
            ascending: true,
          }),
      ]);

      if (membersResult.error) {
        throw membersResult.error;
      }

      if (meetingsResult.error) {
        throw meetingsResult.error;
      }

      if (announcementsResult.error) {
        throw announcementsResult.error;
      }

      if (activitiesResult.error) {
        throw activitiesResult.error;
      }

      const memberRows =
        membersResult.data || [];

      setMembers(memberRows);
      setMeetings(meetingsResult.data || []);
      setAnnouncements(
        announcementsResult.data || []
      );
      setActivities(
        activitiesResult.data || []
      );

      /*
       * Les cotisations sont visibles uniquement
       * pour le parent connecté lorsqu'il est membre.
       */
      if (memberData?.id) {
        const {
          data: contributionRows,
          error: contributionError,
        } = await supabase
          .from("ape_contributions")
          .select(
            "id,ape_id,member_id,amount_due,amount_paid,due_date,paid_at,payment_method,reference,status,notes"
          )
          .eq("ape_id", apeData.id)
          .eq("member_id", memberData.id)
          .order("created_at", {
            ascending: false,
          });

        if (contributionError) {
          throw contributionError;
        }

        setContributions(
          contributionRows || []
        );
      } else {
        setContributions([]);
      }
    } catch (err) {
      console.error(
        "Erreur chargement espace APE :",
        err
      );

      setError(
        err?.message ||
          "Impossible de charger l'espace APE."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAPE();
  }, [schoolId, parentId]);

  function goBack() {
    if (activeSection !== "home") {
      setActiveSection("home");
      return;
    }

    if (onBack) {
      onBack();
    }
  }

  function renderHeader() {
    return (
      <div
        style={{
          marginBottom: "22px",
        }}
      >
        <button
          type="button"
          onClick={goBack}
          style={{
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#000000",
            borderRadius: "10px",
            padding: "9px 13px",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "13px",
            marginBottom: "14px",
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
              width: "48px",
              height: "48px",
              borderRadius: "13px",
              background: "#eef2ff",
              display: "grid",
              placeItems: "center",
              fontSize: "24px",
            }}
          >
            🤝
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color: "#000000",
                fontSize: "23px",
                fontWeight: 900,
              }}
            >
              Espace APE
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#000000",
                fontSize: "13px",
              }}
            >
              {ape?.name ||
                "Association des Parents d'Élèves"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderNavigation() {
    const items = [
      {
        id: "home",
        icon: "🏠",
        label: "Accueil APE",
      },
      {
        id: "team",
        icon: "👥",
        label: "Équipe APE",
      },
      {
        id: "meetings",
        icon: "📅",
        label: "Réunions",
      },
      {
        id: "announcements",
        icon: "📢",
        label: "Annonces",
      },
      {
        id: "activities",
        icon: "🎯",
        label: "Activités / Projets",
      },
      {
        id: "contributions",
        icon: "💰",
        label: "Cotisations",
      },
    ];

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(145px,1fr))",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {items.map((item) => {
          const active =
            activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setActiveSection(item.id)
              }
              style={{
                border: active
                  ? "1px solid #4f46e5"
                  : "1px solid #e2e8f0",
                background: active
                  ? "#eef2ff"
                  : "#ffffff",
                color: "#000000",
                borderRadius: "12px",
                padding: "13px 10px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "12px",
                minHeight: "70px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              <span
                style={{
                  fontSize: "21px",
                }}
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderHome() {
    if (!ape) {
      return (
        <>
          <Card>
            <EmptyState
              icon="🤝"
              text="L'Association des Parents d'Élèves n'est pas encore configurée pour votre école."
            />
          </Card>
        </>
      );
    }

    return (
      <>
        <Card
          style={{
            marginBottom: "18px",
            background:
              "linear-gradient(135deg,#eef2ff,#ffffff)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: "#000000",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Association des Parents d'Élèves
              </div>

              <h3
                style={{
                  margin: "6px 0 0",
                  color: "#000000",
                  fontSize: "21px",
                  fontWeight: 900,
                }}
              >
                {ape.name}
              </h3>

              {ape.academic_year && (
                <div
                  style={{
                    marginTop: "5px",
                    color: "#000000",
                    fontSize: "13px",
                  }}
                >
                  Année scolaire :{" "}
                  {ape.academic_year}
                </div>
              )}
            </div>

            <div
              style={{
                padding: "9px 13px",
                borderRadius: "999px",
                background: isActiveMember
                  ? "#dcfce7"
                  : "#f1f5f9",
                color: "#000000",
                fontSize: "12px",
                fontWeight: 900,
              }}
            >
              {isPresident
                ? "👑 Président"
                : isActiveMember
                ? `👥 ${member.function_name}`
                : "👤 Parent"}
            </div>
          </div>
        </Card>

        {isPresident && (
          <Card
            style={{
              marginBottom: "18px",
              border:
                "1px solid #f59e0b",
              background: "#fffbeb",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  fontSize: "25px",
                }}
              >
                👑
              </div>

              <div>
                <div
                  style={{
                    color: "#000000",
                    fontWeight: 900,
                    fontSize: "15px",
                  }}
                >
                  Vous êtes le Président de l'APE
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    color: "#000000",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  Vous pourrez prochainement gérer
                  votre équipe, les fonctions des
                  membres, les réunions, les activités,
                  les annonces et le suivi de l'APE.
                </div>
              </div>
            </div>
          </Card>
        )}

        {!isActiveMember && (
          <Card
            style={{
              marginBottom: "18px",
            }}
          >
            <SectionTitle
              icon="ℹ️"
              title="Votre statut"
              description="Informations générales sur l'APE"
            />

            <div
              style={{
                color: "#000000",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              Vous êtes actuellement enregistré
              comme parent de l'école, mais vous
              n'êtes pas membre de l'équipe APE.
            </div>
          </Card>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "12px",
          }}
        >
          <Card>
            <div
              style={{
                fontSize: "25px",
              }}
            >
              👥
            </div>

            <div
              style={{
                marginTop: "8px",
                color: "#000000",
                fontSize: "24px",
                fontWeight: 900,
              }}
            >
              {visibleMembers.length}
            </div>

            <div
              style={{
                color: "#000000",
                fontSize: "12px",
              }}
            >
              Membres actifs
            </div>
          </Card>

          <Card>
            <div
              style={{
                fontSize: "25px",
              }}
            >
              📅
            </div>

            <div
              style={{
                marginTop: "8px",
                color: "#000000",
                fontSize: "24px",
                fontWeight: 900,
              }}
            >
              {meetings.length}
            </div>

            <div
              style={{
                color: "#000000",
                fontSize: "12px",
              }}
            >
              Réunions
            </div>
          </Card>

          <Card>
            <div
              style={{
                fontSize: "25px",
              }}
            >
              📢
            </div>

            <div
              style={{
                marginTop: "8px",
                color: "#000000",
                fontSize: "24px",
                fontWeight: 900,
              }}
            >
              {announcements.length}
            </div>

            <div
              style={{
                color: "#000000",
                fontSize: "12px",
              }}
            >
              Annonces
            </div>
          </Card>

          <Card>
            <div
              style={{
                fontSize: "25px",
              }}
            >
              🎯
            </div>

            <div
              style={{
                marginTop: "8px",
                color: "#000000",
                fontSize: "24px",
                fontWeight: 900,
              }}
            >
              {activities.length}
            </div>

            <div
              style={{
                color: "#000000",
                fontSize: "12px",
              }}
            >
              Activités / projets
            </div>
          </Card>
        </div>
      </>
    );
  }

  function renderTeam() {
    return (
      <Card>
        <SectionTitle
          icon="👥"
          title="Équipe APE"
          description={
            isPresident
              ? "Vous supervisez l'équipe de l'APE."
              : "Les membres actuellement enregistrés dans l'APE."
          }
        />

        {!visibleMembers.length ? (
          <EmptyState
            icon="👥"
            text="Aucun membre actif n'est encore enregistré."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            {visibleMembers.map((item) => (
              <div
                key={item.id}
                style={{
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
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
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      background:
                        item.is_president
                          ? "#fef3c7"
                          : "#eef2ff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "17px",
                    }}
                  >
                    {item.is_president
                      ? "👑"
                      : "👤"}
                  </div>

                  <div>
                    <div
                      style={{
                        color: "#000000",
                        fontWeight: 900,
                        fontSize: "13px",
                      }}
                    >
                      {item.is_president
                        ? "Président de l'APE"
                        : "Membre APE"}
                    </div>

                    <div
                      style={{
                        marginTop: "3px",
                        color: "#000000",
                        fontSize: "12px",
                      }}
                    >
                      {item.function_name}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    color: "#000000",
                    fontSize: "11px",
                  }}
                >
                  Depuis le{" "}
                  {formatDate(
                    item.joined_at
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  function renderMeetings() {
    return (
      <Card>
        <SectionTitle
          icon="📅"
          title="Réunions"
          description="Réunions et rencontres de l'APE"
        />

        {!meetings.length ? (
          <EmptyState
            icon="📅"
            text="Aucune réunion enregistrée."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                style={{
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "13px",
                  padding: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      color: "#000000",
                      fontWeight: 900,
                      fontSize: "15px",
                    }}
                  >
                    {meeting.title}
                  </div>

                  <div
                    style={{
                      color: "#000000",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    {formatDate(
                      meeting.meeting_date
                    )}
                  </div>
                </div>

                {meeting.meeting_time && (
                  <div
                    style={{
                      marginTop: "7px",
                      color: "#000000",
                      fontSize: "12px",
                    }}
                  >
                    🕐 {meeting.meeting_time}
                  </div>
                )}

                {meeting.location && (
                  <div
                    style={{
                      marginTop: "5px",
                      color: "#000000",
                      fontSize: "12px",
                    }}
                  >
                    📍 {meeting.location}
                  </div>
                )}

                {meeting.description && (
                  <div
                    style={{
                      marginTop: "10px",
                      color: "#000000",
                      fontSize: "13px",
                      lineHeight: 1.55,
                    }}
                  >
                    {meeting.description}
                  </div>
                )}

                {meeting.agenda && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      background: "#f8fafc",
                      borderRadius: "10px",
                      color: "#000000",
                      fontSize: "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Ordre du jour :</strong>
                    <br />
                    {meeting.agenda}
                  </div>
                )}

                {meeting.minutes && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      background: "#f8fafc",
                      borderRadius: "10px",
                      color: "#000000",
                      fontSize: "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Compte rendu :</strong>
                    <br />
                    {meeting.minutes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  function renderAnnouncements() {
    return (
      <Card>
        <SectionTitle
          icon="📢"
          title="Annonces"
          description="Informations publiées par l'APE"
        />

        {!announcements.length ? (
          <EmptyState
            icon="📢"
            text="Aucune annonce publiée pour le moment."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {announcements.map(
              (announcement) => (
                <div
                  key={announcement.id}
                  style={{
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: "13px",
                    padding: "15px",
                  }}
                >
                  <div
                    style={{
                      color: "#000000",
                      fontWeight: 900,
                      fontSize: "15px",
                    }}
                  >
                    {announcement.title}
                  </div>

                  <div
                    style={{
                      marginTop: "5px",
                      color: "#000000",
                      fontSize: "11px",
                    }}
                  >
                    Publié le{" "}
                    {formatDate(
                      announcement.published_at ||
                        announcement.created_at
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      color: "#000000",
                      fontSize: "13px",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {announcement.content}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card>
    );
  }

  function renderActivities() {
    return (
      <Card>
        <SectionTitle
          icon="🎯"
          title="Activités / Projets"
          description="Activités et projets de l'APE"
        />

        {!activities.length ? (
          <EmptyState
            icon="🎯"
            text="Aucune activité ou projet enregistré."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {activities.map((activity) => (
              <div
                key={activity.id}
                style={{
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "13px",
                  padding: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      color: "#000000",
                      fontWeight: 900,
                      fontSize: "15px",
                    }}
                  >
                    {activity.title}
                  </div>

                  <div
                    style={{
                      color: "#000000",
                      fontSize: "11px",
                      fontWeight: 800,
                    }}
                  >
                    {activity.status}
                  </div>
                </div>

                {activity.activity_date && (
                  <div
                    style={{
                      marginTop: "7px",
                      color: "#000000",
                      fontSize: "12px",
                    }}
                  >
                    📅{" "}
                    {formatDate(
                      activity.activity_date
                    )}
                  </div>
                )}

                {activity.location && (
                  <div
                    style={{
                      marginTop: "5px",
                      color: "#000000",
                      fontSize: "12px",
                    }}
                  >
                    📍 {activity.location}
                  </div>
                )}

                {activity.description && (
                  <div
                    style={{
                      marginTop: "10px",
                      color: "#000000",
                      fontSize: "13px",
                      lineHeight: 1.55,
                    }}
                  >
                    {activity.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  function renderContributions() {
    if (!isActiveMember) {
      return (
        <Card>
          <SectionTitle
            icon="💰"
            title="Cotisations"
            description="Suivi des cotisations APE"
          />

          <EmptyState
            icon="💰"
            text="Les cotisations APE sont accessibles aux membres de l'association."
          />
        </Card>
      );
    }

    return (
      <Card>
        <SectionTitle
          icon="💰"
          title="Mes cotisations"
          description="Suivi de vos cotisations auprès de l'APE"
        />

        {!contributions.length ? (
          <EmptyState
            icon="💰"
            text="Aucune cotisation enregistrée pour votre compte."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {contributions.map(
              (contribution) => {
                const remaining = Math.max(
                  Number(
                    contribution.amount_due ||
                      0
                  ) -
                    Number(
                      contribution.amount_paid ||
                        0
                    ),
                  0
                );

                return (
                  <div
                    key={contribution.id}
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: "13px",
                      padding: "15px",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit,minmax(150px,1fr))",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "11px",
                          }}
                        >
                          Montant demandé
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            color: "#000000",
                            fontWeight: 900,
                          }}
                        >
                          {formatAmount(
                            contribution.amount_due
                          )}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "11px",
                          }}
                        >
                          Montant payé
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            color: "#000000",
                            fontWeight: 900,
                          }}
                        >
                          {formatAmount(
                            contribution.amount_paid
                          )}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "11px",
                          }}
                        >
                          Reste
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            color: "#000000",
                            fontWeight: 900,
                          }}
                        >
                          {formatAmount(
                            remaining
                          )}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "11px",
                          }}
                        >
                          Statut
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            color: "#000000",
                            fontWeight: 900,
                          }}
                        >
                          {contribution.status}
                        </div>
                      </div>
                    </div>

                    {contribution.due_date && (
                      <div
                        style={{
                          marginTop: "12px",
                          color: "#000000",
                          fontSize: "12px",
                        }}
                      >
                        📅 Échéance :{" "}
                        {formatDate(
                          contribution.due_date
                        )}
                      </div>
                    )}

                    {contribution.paid_at && (
                      <div
                        style={{
                          marginTop: "5px",
                          color: "#000000",
                          fontSize: "12px",
                        }}
                      >
                        ✓ Paiement enregistré le{" "}
                        {formatDate(
                          contribution.paid_at
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </Card>
    );
  }

  function renderSection() {
    if (activeSection === "team") {
      return renderTeam();
    }

    if (activeSection === "meetings") {
      return renderMeetings();
    }

    if (activeSection === "announcements") {
      return renderAnnouncements();
    }

    if (activeSection === "activities") {
      return renderActivities();
    }

    if (activeSection === "contributions") {
      return renderContributions();
    }

    return renderHome();
  }

  if (loading) {
    return (
      <div
        style={{
          color: "#000000",
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              border:
                "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#000000",
              borderRadius: "10px",
              padding: "9px 13px",
              cursor: "pointer",
              fontWeight: 800,
              marginBottom: "15px",
            }}
          >
            ← Retour
          </button>
        )}

        <Card>
          <EmptyState
            icon="⏳"
            text="Chargement de votre espace APE..."
          />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              border:
                "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#000000",
              borderRadius: "10px",
              padding: "9px 13px",
              cursor: "pointer",
              fontWeight: 800,
              marginBottom: "15px",
            }}
          >
            ← Retour
          </button>
        )}

        <Card>
          <div
            style={{
              color: "#000000",
              fontWeight: 800,
              marginBottom: "12px",
            }}
          >
            ⚠️ {error}
          </div>

          <button
            type="button"
            onClick={loadAPE}
            style={{
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#000000",
              borderRadius: "10px",
              padding: "9px 13px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            🔄 Réessayer
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        color: "#000000",
      }}
    >
      {renderHeader()}

      {renderNavigation()}

      {renderSection()}
    </div>
  );
}
