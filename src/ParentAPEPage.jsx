import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const TEAM_FUNCTIONS = [
  "Vice-président",
  "Secrétaire",
  "Trésorier",
  "Communication",
  "Responsable activités",
  "Membre",
];

const EMPTY_TEAM_FORM = {
  parent_id: "",
  function_name: "Membre",
};

export default function ParentAPEPage({
  schoolId,
  parentId,
  onBack,
}) {
  const [loading, setLoading] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);

  const [ape, setApe] = useState(null);
  const [member, setMember] = useState(null);

  const [members, setMembers] = useState([]);
  const [parents, setParents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [contributions, setContributions] = useState([]);

  const [section, setSection] = useState("home");

  const [teamForm, setTeamForm] = useState(EMPTY_TEAM_FORM);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [teamMessage, setTeamMessage] = useState("");

  const isPresident = Boolean(member?.is_president === true);
  const isActiveMember = member?.status === "active";

  const parentMap = useMemo(() => {
    const map = {};

    parents.forEach((parent) => {
      map[parent.id] = parent;
    });

    return map;
  }, [parents]);

  const availableParents = useMemo(() => {
    const existingParentIds = new Set(
      members.map((item) => item.parent_id)
    );

    return parents.filter(
      (parent) => !existingParentIds.has(parent.id)
    );
  }, [parents, members]);

  const currentTeamMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.is_president && !b.is_president) return -1;
      if (!a.is_president && b.is_president) return 1;

      const nameA =
        parentMap[a.parent_id]?.full_name || "";

      const nameB =
        parentMap[b.parent_id]?.full_name || "";

      return nameA.localeCompare(nameB);
    });
  }, [members, parentMap]);

  async function loadAPE() {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setTeamMessage("");

      /*
       * =====================================================
       * IDENTIFICATION DU PARENT CONNECTÉ
       * =====================================================
       *
       * On utilise directement auth.uid() afin de ne pas
       * dépendre uniquement du parentId transmis par
       * ParentDashboard.
       *
       * Chemin :
       * compte connecté
       * → auth.uid()
       * → parents.profile_id
       * → parent.id
       */

      const {
        data: {
          user,
        },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const connectedUserId =
        user?.id || null;

      if (!connectedUserId) {
        setApe(null);
        setMember(null);
        setMembers([]);
        setParents([]);
        setMeetings([]);
        setAnnouncements([]);
        setActivities([]);
        setContributions([]);

        setTeamMessage(
          "Impossible d'identifier le compte parent connecté."
        );

        return;
      }

      const {
        data: connectedParent,
        error: parentError,
      } = await supabase
        .from("parents")
        .select(
          "id,profile_id,school_id,full_name,phone,email,address,active"
        )
        .eq("profile_id", connectedUserId)
        .eq("school_id", schoolId)
        .eq("active", true)
        .maybeSingle();

      if (parentError) {
        throw parentError;
      }

      /*
       * Si le parent connecté n'est pas retrouvé,
       * on utilise uniquement parentId comme secours.
       */
      const resolvedParentId =
        connectedParent?.id || parentId || null;

      if (!resolvedParentId) {
        setApe(null);
        setMember(null);
        setMembers([]);
        setParents([]);
        setMeetings([]);
        setAnnouncements([]);
        setActivities([]);
        setContributions([]);

        setTeamMessage(
          "Aucun profil parent associé à ce compte."
        );

        return;
      }

      const { data: apeData, error: apeError } =
        await supabase
          .from("school_apes")
          .select(
            "id, school_id, name, academic_year, description, active"
          )
          .eq("school_id", schoolId)
          .maybeSingle();

      if (apeError) throw apeError;

      setApe(apeData || null);

      if (!apeData) {
        setMember(null);
        setMembers([]);
        setParents([]);
        setMeetings([]);
        setAnnouncements([]);
        setActivities([]);
        setContributions([]);
        return;
      }

      /*
       * =====================================================
       * CHARGEMENT DES DONNÉES APE
       * =====================================================
       */

      const [
        memberResult,
        membersResult,
        parentsResult,
        meetingsResult,
        announcementsResult,
        activitiesResult,
      ] = await Promise.all([
        supabase
          .from("ape_members")
          .select(
            "id, ape_id, parent_id, function_name, status, joined_at, notes, is_president"
          )
          .eq("ape_id", apeData.id)
          .eq("parent_id", resolvedParentId)
          .maybeSingle(),

        supabase
          .from("ape_members")
          .select(
            "id, ape_id, parent_id, function_name, status, joined_at, notes, is_president"
          )
          .eq("ape_id", apeData.id)
          .eq("status", "active")
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("parents")
          .select(
            "id, school_id, full_name, phone, email, active"
          )
          .eq("school_id", schoolId)
          .eq("active", true)
          .order("full_name", {
            ascending: true,
          }),

        supabase
          .from("ape_meetings")
          .select(
            "id, ape_id, title, description, meeting_date, meeting_time, location, status, agenda, minutes"
          )
          .eq("ape_id", apeData.id)
          .order("meeting_date", {
            ascending: true,
          }),

        supabase
          .from("ape_announcements")
          .select(
            "id, ape_id, title, content, status, published_at, created_at"
          )
          .eq("ape_id", apeData.id)
          .eq("status", "published")
          .order("published_at", {
            ascending: false,
            nullsFirst: false,
          }),

        supabase
          .from("ape_activities")
          .select(
            "id, ape_id, title, description, activity_date, location, status, budget, notes"
          )
          .eq("ape_id", apeData.id)
          .order("activity_date", {
            ascending: true,
          }),
      ]);

      if (memberResult.error) {
        throw memberResult.error;
      }

      if (membersResult.error) {
        throw membersResult.error;
      }

      if (parentsResult.error) {
        throw parentsResult.error;
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

      setMember(memberResult.data || null);
      setMembers(membersResult.data || []);
      setParents(parentsResult.data || []);
      setMeetings(meetingsResult.data || []);
      setAnnouncements(announcementsResult.data || []);
      setActivities(activitiesResult.data || []);

      /*
       * =====================================================
       * COTISATIONS DU MEMBRE CONNECTÉ
       * =====================================================
       */

      if (memberResult.data) {
        const {
          data: contributionData,
          error: contributionError,
        } = await supabase
          .from("ape_contributions")
          .select(
            "id, ape_id, member_id, amount_due, amount_paid, due_date, paid_at, payment_method, reference, status, notes"
          )
          .eq("ape_id", apeData.id)
          .eq("member_id", memberResult.data.id)
          .order("created_at", {
            ascending: false,
          });

        if (contributionError) {
          throw contributionError;
        }

        setContributions(
          contributionData || []
        );
      } else {
        setContributions([]);
      }
    } catch (error) {
      console.error(
        "Erreur chargement APE :",
        error
      );

      setTeamMessage(
        error?.message ||
          "Impossible de charger l'espace APE."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAPE();
  }, [schoolId, parentId]);

  function resetTeamForm() {
    setTeamForm(EMPTY_TEAM_FORM);
    setEditingMemberId(null);
  }

  function startEditMember(teamMember) {
    if (!isPresident) return;
    if (teamMember.is_president) return;

    setTeamMessage("");

    setEditingMemberId(teamMember.id);

    setTeamForm({
      parent_id: teamMember.parent_id,
      function_name:
        teamMember.function_name || "Membre",
    });

    setSection("team");
  }

  async function saveTeamMember(event) {
    event.preventDefault();

    if (!isPresident || !ape) return;

    if (!teamForm.function_name) {
      setTeamMessage(
        "Veuillez choisir une fonction."
      );
      return;
    }

    if (!editingMemberId && !teamForm.parent_id) {
      setTeamMessage(
        "Veuillez sélectionner un parent."
      );
      return;
    }

    try {
      setSavingTeam(true);
      setTeamMessage("");

      if (editingMemberId) {
        const { error } = await supabase
          .from("ape_members")
          .update({
            function_name:
              teamForm.function_name,
            status: "active",
          })
          .eq("id", editingMemberId)
          .eq("ape_id", ape.id)
          .eq("is_president", false);

        if (error) throw error;

        setTeamMessage(
          "Fonction du membre modifiée avec succès."
        );
      } else {
        const { error } = await supabase
          .from("ape_members")
          .insert({
            ape_id: ape.id,
            parent_id: teamForm.parent_id,
            function_name:
              teamForm.function_name,
            status: "active",
            joined_at: new Date()
              .toISOString()
              .slice(0, 10),
            is_president: false,
          });

        if (error) throw error;

        setTeamMessage(
          "Membre ajouté avec succès."
        );
      }

      resetTeamForm();
      await loadAPE();
    } catch (error) {
      console.error(
        "Erreur équipe APE :",
        error
      );

      if (error?.code === "23505") {
        setTeamMessage(
          "Ce parent fait déjà partie de l'équipe APE."
        );
      } else {
        setTeamMessage(
          error?.message ||
            "Impossible d'enregistrer le membre."
        );
      }
    } finally {
      setSavingTeam(false);
    }
  }

  async function deleteTeamMember(teamMember) {
    if (!isPresident) return;
    if (teamMember.is_president) return;

    const parentName =
      parentMap[teamMember.parent_id]?.full_name ||
      "ce membre";

    const confirmed = window.confirm(
      `Voulez-vous vraiment retirer ${parentName} de l'équipe APE ?`
    );

    if (!confirmed) return;

    try {
      setSavingTeam(true);
      setTeamMessage("");

      const { error } = await supabase
        .from("ape_members")
        .delete()
        .eq("id", teamMember.id)
        .eq("ape_id", ape.id)
        .eq("is_president", false);

      if (error) throw error;

      if (editingMemberId === teamMember.id) {
        resetTeamForm();
      }

      setTeamMessage(
        "Membre retiré de l'équipe APE."
      );

      await loadAPE();
    } catch (error) {
      console.error(
        "Erreur suppression membre :",
        error
      );

      setTeamMessage(
        error?.message ||
          "Impossible de retirer ce membre."
      );
    } finally {
      setSavingTeam(false);
    }
  }

  function renderHome() {
    return (
      <div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#000",
            }}
          >
            🤝{" "}
            {ape?.name ||
              "Association des Parents d'Élèves"}
          </h2>

          {ape?.academic_year && (
            <p style={{ color: "#000" }}>
              Année scolaire :{" "}
              <strong>
                {ape.academic_year}
              </strong>
            </p>
          )}

          {ape?.description && (
            <p style={{ color: "#000" }}>
              {ape.description}
            </p>
          )}

          {member ? (
            <div
              style={{
                marginTop: "18px",
                padding: "16px",
                borderRadius: "12px",
                background: "#f5f5f5",
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  color: "#000",
                  fontWeight: 700,
                }}
              >
                Votre statut APE
              </p>

              <p
                style={{
                  margin: "4px 0",
                  color: "#000",
                }}
              >
                Fonction :{" "}
                <strong>
                  {member.is_president
                    ? "Président"
                    : member.function_name}
                </strong>
              </p>

              <p
                style={{
                  margin: "4px 0",
                  color: "#000",
                }}
              >
                Statut :{" "}
                <strong>
                  {member.status === "active"
                    ? "Actif"
                    : member.status}
                </strong>
              </p>

              {isPresident && (
                <p
                  style={{
                    marginTop: "12px",
                    marginBottom: 0,
                    color: "#000",
                  }}
                >
                  👑 Vous êtes Président de l'APE.
                  Vous pouvez gérer les membres de
                  votre équipe et leurs fonctions.
                </p>
              )}
            </div>
          ) : (
            <div
              style={{
                marginTop: "18px",
                padding: "16px",
                borderRadius: "12px",
                background: "#f5f5f5",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#000",
                }}
              >
                Vous n'êtes pas actuellement membre
                de l'équipe APE.
              </p>
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
          }}
        >
          <button
            type="button"
            onClick={() => setSection("team")}
            style={cardStyle}
          >
            <span style={iconStyle}>👥</span>

            <strong style={blackText}>
              Équipe APE
            </strong>

            <span style={smallText}>
              Membres et fonctions
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSection("meetings")
            }
            style={cardStyle}
          >
            <span style={iconStyle}>📅</span>

            <strong style={blackText}>
              Réunions
            </strong>

            <span style={smallText}>
              Réunions et comptes rendus
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSection("announcements")
            }
            style={cardStyle}
          >
            <span style={iconStyle}>📢</span>

            <strong style={blackText}>
              Annonces
            </strong>

            <span style={smallText}>
              Communications de l'APE
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSection("activities")
            }
            style={cardStyle}
          >
            <span style={iconStyle}>🎯</span>

            <strong style={blackText}>
              Activités / Projets
            </strong>

            <span style={smallText}>
              Projets de l'association
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSection("contributions")
            }
            style={cardStyle}
          >
            <span style={iconStyle}>💰</span>

            <strong style={blackText}>
              Cotisations
            </strong>

            <span style={smallText}>
              Suivi des cotisations
            </span>
          </button>
        </div>
      </div>
    );
  }

  function renderTeam() {
    return (
      <div>
        <div style={sectionHeaderStyle}>
          <div>
            <h2
              style={{
                margin: 0,
                color: "#000",
              }}
            >
              👥 Équipe APE
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#000",
              }}
            >
              Les membres de l'équipe et leurs
              fonctions.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAPE}
            style={iconButtonStyle}
            title="Actualiser"
          >
            🔄
          </button>
        </div>

        {isPresident && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "16px",
              padding: "18px",
              marginBottom: "20px",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#000",
              }}
            >
              {editingMemberId
                ? "✏️ Modifier la fonction"
                : "➕ Ajouter un membre"}
            </h3>

            <form
              onSubmit={saveTeamMember}
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {!editingMemberId ? (
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      color: "#000",
                      fontWeight: 600,
                    }}
                  >
                    Parent
                  </label>

                  <select
                    value={teamForm.parent_id}
                    onChange={(event) =>
                      setTeamForm((current) => ({
                        ...current,
                        parent_id:
                          event.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="">
                      Choisir un parent
                    </option>

                    {availableParents.map(
                      (parent) => (
                        <option
                          key={parent.id}
                          value={parent.id}
                        >
                          {parent.full_name}
                        </option>
                      )
                    )}
                  </select>

                  {availableParents.length ===
                    0 && (
                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "#000",
                        fontSize: "14px",
                      }}
                    >
                      Tous les parents actifs
                      sont déjà membres de
                      l'équipe APE.
                    </p>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: "12px",
                    background: "#f5f5f5",
                    borderRadius: "10px",
                    color: "#000",
                  }}
                >
                  <strong>
                    {parentMap[
                      teamForm.parent_id
                    ]?.full_name ||
                      "Membre"}
                  </strong>
                </div>
              )}

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    color: "#000",
                    fontWeight: 600,
                  }}
                >
                  Fonction
                </label>

                <select
                  value={teamForm.function_name}
                  onChange={(event) =>
                    setTeamForm((current) => ({
                      ...current,
                      function_name:
                        event.target.value,
                    }))
                  }
                  style={inputStyle}
                >
                  {TEAM_FUNCTIONS.map(
                    (functionName) => (
                      <option
                        key={functionName}
                        value={functionName}
                      >
                        {functionName}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  disabled={
                    savingTeam ||
                    (!editingMemberId &&
                      !teamForm.parent_id)
                  }
                  style={primaryButtonStyle}
                >
                  {savingTeam
                    ? "Enregistrement..."
                    : editingMemberId
                    ? "💾 Enregistrer"
                    : "➕ Ajouter"}
                </button>

                {editingMemberId && (
                  <button
                    type="button"
                    onClick={resetTeamForm}
                    style={secondaryButtonStyle}
                  >
                    ✖ Annuler
                  </button>
                )}
              </div>
            </form>

            {teamMessage && (
              <p
                style={{
                  marginBottom: 0,
                  marginTop: "12px",
                  color: "#000",
                }}
              >
                {teamMessage}
              </p>
            )}
          </div>
        )}

        {!isPresident && teamMessage && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "16px",
              color: "#000",
            }}
          >
            {teamMessage}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: "12px",
          }}
        >
          {currentTeamMembers.length === 0 ? (
            <div style={emptyStyle}>
              Aucun membre de l'équipe APE
              actuellement.
            </div>
          ) : (
            currentTeamMembers.map(
              (teamMember) => {
                const parent =
                  parentMap[
                    teamMember.parent_id
                  ];

                const president =
                  teamMember.is_president === true;

                return (
                  <div
                    key={teamMember.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "14px",
                      padding: "16px",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#000",
                          fontWeight: 700,
                          fontSize: "17px",
                        }}
                      >
                        {parent?.full_name ||
                          "Parent APE"}
                      </div>

                      <div
                        style={{
                          color: "#000",
                          marginTop: "4px",
                        }}
                      >
                        {president
                          ? "👑 Président"
                          : teamMember.function_name ||
                            "Membre"}
                      </div>

                      {parent?.phone && (
                        <div
                          style={{
                            color: "#000",
                            marginTop: "4px",
                            fontSize: "14px",
                          }}
                        >
                          📞 {parent.phone}
                        </div>
                      )}
                    </div>

                    {isPresident &&
                      !president && (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              startEditMember(
                                teamMember
                              )
                            }
                            style={
                              smallActionButtonStyle
                            }
                            title="Modifier"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteTeamMember(
                                teamMember
                              )
                            }
                            style={
                              smallActionButtonStyle
                            }
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                  </div>
                );
              }
            )
          )}
        </div>
      </div>
    );
  }

  function renderMeetings() {
    return (
      <div>
        <div style={sectionHeaderStyle}>
          <div>
            <h2
              style={{
                margin: 0,
                color: "#000",
              }}
            >
              📅 Réunions APE
            </h2>
          </div>

          <button
            type="button"
            onClick={loadAPE}
            style={iconButtonStyle}
            title="Actualiser"
          >
            🔄
          </button>
        </div>

        {meetings.length === 0 ? (
          <div style={emptyStyle}>
            Aucune réunion APE enregistrée.
          </div>
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
                style={itemStyle}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: "#000",
                  }}
                >
                  {meeting.title}
                </h3>

                <p style={blackText}>
                  📅 {meeting.meeting_date}
                  {meeting.meeting_time
                    ? ` à ${meeting.meeting_time}`
                    : ""}
                </p>

                {meeting.location && (
                  <p style={blackText}>
                    📍 {meeting.location}
                  </p>
                )}

                {meeting.description && (
                  <p style={blackText}>
                    {meeting.description}
                  </p>
                )}

                {meeting.agenda && (
                  <p style={blackText}>
                    <strong>
                      Ordre du jour :
                    </strong>{" "}
                    {meeting.agenda}
                  </p>
                )}

                {meeting.minutes && (
                  <p style={blackText}>
                    <strong>
                      Compte rendu :
                    </strong>{" "}
                    {meeting.minutes}
                  </p>
                )}

                <p style={blackText}>
                  Statut :{" "}
                  <strong>
                    {meeting.status}
                  </strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderAnnouncements() {
    return (
      <div>
        <div style={sectionHeaderStyle}>
          <div>
            <h2
              style={{
                margin: 0,
                color: "#000",
              }}
            >
              📢 Annonces APE
            </h2>
          </div>

          <button
            type="button"
            onClick={loadAPE}
            style={iconButtonStyle}
            title="Actualiser"
          >
            🔄
          </button>
        </div>

        {announcements.length === 0 ? (
          <div style={emptyStyle}>
            Aucune annonce publiée.
          </div>
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
                  style={itemStyle}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      color: "#000",
                    }}
                  >
                    {announcement.title}
                  </h3>

                  <p
                    style={{
                      ...blackText,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {announcement.content}
                  </p>

                  {announcement.published_at && (
                    <p
                      style={{
                        marginBottom: 0,
                        color: "#000",
                        fontSize: "13px",
                      }}
                    >
                      Publiée le{" "}
                      {new Date(
                        announcement.published_at
                      ).toLocaleDateString(
                        "fr-FR"
                      )}
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  function renderActivities() {
    return (
      <div>
        <div style={sectionHeaderStyle}>
          <div>
            <h2
              style={{
                margin: 0,
                color: "#000",
              }}
            >
              🎯 Activités / Projets
            </h2>
          </div>

          <button
            type="button"
            onClick={loadAPE}
            style={iconButtonStyle}
            title="Actualiser"
          >
            🔄
          </button>
        </div>

        {activities.length === 0 ? (
          <div style={emptyStyle}>
            Aucune activité ou projet
            enregistré.
          </div>
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
                style={itemStyle}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: "#000",
                  }}
                >
                  {activity.title}
                </h3>

                {activity.description && (
                  <p style={blackText}>
                    {activity.description}
                  </p>
                )}

                {activity.activity_date && (
                  <p style={blackText}>
                    📅 {activity.activity_date}
                  </p>
                )}

                {activity.location && (
                  <p style={blackText}>
                    📍 {activity.location}
                  </p>
                )}

                <p style={blackText}>
                  Statut :{" "}
                  <strong>
                    {activity.status}
                  </strong>
                </p>

                {activity.budget !== null &&
                  activity.budget !== undefined && (
                    <p style={blackText}>
                      Budget :{" "}
                      <strong>
                        {Number(
                          activity.budget
                        ).toLocaleString(
                          "fr-FR"
                        )}{" "}
                        FCFA
                      </strong>
                    </p>
                  )}

                {activity.notes && (
                  <p style={blackText}>
                    <strong>Notes :</strong>{" "}
                    {activity.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderContributions() {
    return (
      <div>
        <div style={sectionHeaderStyle}>
          <div>
            <h2
              style={{
                margin: 0,
                color: "#000",
              }}
            >
              💰 Cotisations
            </h2>
          </div>

          <button
            type="button"
            onClick={loadAPE}
            style={iconButtonStyle}
            title="Actualiser"
          >
            🔄
          </button>
        </div>

        {!isActiveMember ? (
          <div style={emptyStyle}>
            Les informations de cotisation sont
            disponibles pour les membres de
            l'APE.
          </div>
        ) : contributions.length === 0 ? (
          <div style={emptyStyle}>
            Aucune cotisation enregistrée pour
            votre compte.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {contributions.map(
              (contribution) => (
                <div
                  key={contribution.id}
                  style={itemStyle}
                >
                  <p style={blackText}>
                    Montant dû :{" "}
                    <strong>
                      {Number(
                        contribution.amount_due ||
                          0
                      ).toLocaleString(
                        "fr-FR"
                      )}{" "}
                      FCFA
                    </strong>
                  </p>

                  <p style={blackText}>
                    Montant payé :{" "}
                    <strong>
                      {Number(
                        contribution.amount_paid ||
                          0
                      ).toLocaleString(
                        "fr-FR"
                      )}{" "}
                      FCFA
                    </strong>
                  </p>

                  {contribution.due_date && (
                    <p style={blackText}>
                      Échéance :{" "}
                      {contribution.due_date}
                    </p>
                  )}

                  <p style={blackText}>
                    Statut :{" "}
                    <strong>
                      {contribution.status}
                    </strong>
                  </p>

                  {contribution.payment_method && (
                    <p style={blackText}>
                      Mode de paiement :{" "}
                      {
                        contribution.payment_method
                      }
                    </p>
                  )}

                  {contribution.reference && (
                    <p style={blackText}>
                      Référence :{" "}
                      {contribution.reference}
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  function renderCurrentSection() {
    switch (section) {
      case "team":
        return renderTeam();

      case "meetings":
        return renderMeetings();

      case "announcements":
        return renderAnnouncements();

      case "activities":
        return renderActivities();

      case "contributions":
        return renderContributions();

      case "home":
      default:
        return renderHome();
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "20px",
          color: "#000",
        }}
      >
        Chargement de l'espace APE...
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div
        style={{
          padding: "20px",
          color: "#000",
        }}
      >
        École introuvable.
      </div>
    );
  }

  if (!ape) {
    return (
      <div
        style={{
          padding: "20px",
          color: "#000",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={backButtonStyle}
        >
          ← Retour
        </button>

        <div
          style={{
            marginTop: "20px",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#000",
            }}
          >
            🤝 APE
          </h2>

          <p style={blackText}>
            L'Association des Parents d'Élèves
            n'est pas encore configurée pour
            cette école.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        color: "#000",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={backButtonStyle}
      >
        ← Retour
      </button>

      {section !== "home" && (
        <button
          type="button"
          onClick={() => setSection("home")}
          style={{
            ...backButtonStyle,
            marginLeft: "8px",
          }}
        >
          🏠 Accueil APE
        </button>
      )}

      <div
        style={{
          marginTop: "20px",
        }}
      >
        {renderCurrentSection()}
      </div>
    </div>
  );
}

const blackText = {
  color: "#000",
};

const smallText = {
  color: "#000",
  fontSize: "14px",
  marginTop: "5px",
};

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "16px",
  padding: "18px",
  background: "#fff",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "5px",
  textAlign: "left",
};

const iconStyle = {
  fontSize: "28px",
  marginBottom: "4px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const iconButtonStyle = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  background: "#fff",
  color: "#000",
  padding: "9px 12px",
  cursor: "pointer",
  fontSize: "18px",
};

const backButtonStyle = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  background: "#fff",
  color: "#000",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

const primaryButtonStyle = {
  border: "1px solid #000",
  borderRadius: "10px",
  background: "#fff",
  color: "#000",
  padding: "10px 15px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  background: "#fff",
  color: "#000",
  padding: "10px 15px",
  cursor: "pointer",
  fontWeight: 600,
};

const smallActionButtonStyle = {
  border: "1px solid #ccc",
  borderRadius: "9px",
  background: "#fff",
  color: "#000",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "17px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #ccc",
  borderRadius: "10px",
  padding: "11px 12px",
  background: "#fff",
  color: "#000",
};

const itemStyle = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "14px",
  padding: "16px",
};

const emptyStyle = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "14px",
  padding: "18px",
  color: "#000",
};
