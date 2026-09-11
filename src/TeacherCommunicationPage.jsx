import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

/* =========================================================
   ÉCOLE CONNECTÉE V4
   COMMUNICATION PROFESSEUR ↔ ÉLÈVE
   ========================================================= */

function formatDateTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function getStudentName(student) {
  if (!student) return "Élève";

  if (student.full_name) {
    return student.full_name;
  }

  const fullName = [student.first_name, student.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  if (student.name) {
    return student.name;
  }

  return "Élève";
}

/* =========================================================
   PAGE PRINCIPALE
   ========================================================= */

export default function TeacherCommunicationPage({
  schoolId,
  teacherId,
  classes = [],
  students = [],
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [draft, setDraft] = useState("");

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     ÉLÈVES ACCESSIBLES
     ========================================================= */

  const accessibleStudents = useMemo(() => {
    const allowedClassIds = new Set(classes.map((item) => item.id));

    return students
      .filter((student) => {
        if (!student) return false;

        if (student.active === false) {
          return false;
        }

        if (
          schoolId &&
          student.school_id &&
          student.school_id !== schoolId
        ) {
          return false;
        }

        if (
          student.class_id &&
          allowedClassIds.size > 0 &&
          !allowedClassIds.has(student.class_id)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) =>
        getStudentName(a).localeCompare(getStudentName(b), "fr", {
          sensitivity: "base",
        })
      );
  }, [classes, schoolId, students]);

  /* =========================================================
     ÉLÈVES PAR CLASSE
     ========================================================= */

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) {
      return accessibleStudents;
    }

    return accessibleStudents.filter(
      (student) => student.class_id === selectedClassId
    );
  }, [accessibleStudents, selectedClassId]);

  /* =========================================================
     MAP DES CLASSES
     ========================================================= */

  const classNameById = useMemo(() => {
    const map = new Map();

    classes.forEach((item) => {
      map.set(item.id, item.name);
    });

    return map;
  }, [classes]);

  /* =========================================================
     CONVERSATION SÉLECTIONNÉE
     ========================================================= */

  const selectedConversation = useMemo(() => {
    return (
      conversations.find(
        (conversation) =>
          conversation.id === selectedConversationId
      ) || null
    );
  }, [conversations, selectedConversationId]);

  /* =========================================================
     ÉLÈVE DE LA CONVERSATION
     ========================================================= */

  const selectedStudent = useMemo(() => {
    const studentId =
      selectedConversation?.student_id || selectedStudentId;

    return (
      accessibleStudents.find(
        (student) => student.id === studentId
      ) || null
    );
  }, [
    accessibleStudents,
    selectedConversation,
    selectedStudentId,
  ]);

  /* =========================================================
     CHARGER LES CONVERSATIONS
     ========================================================= */

  const loadConversations = useCallback(async () => {
    if (!schoolId || !teacherId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("communication_conversations")
      .select(
        `
          id,
          school_id,
          teacher_id,
          student_id,
          created_at,
          updated_at
        `
      )
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .order("updated_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Erreur chargement conversations :",
        error
      );

      setErrorMessage(
        "Impossible de charger les conversations."
      );

      setConversations([]);
    } else {
      setConversations(data || []);
    }

    setLoading(false);
  }, [schoolId, teacherId]);

  /* =========================================================
     CHARGER LES MESSAGES
     ========================================================= */

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId || !schoolId) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("communication_messages")
        .select(
          `
            id,
            conversation_id,
            school_id,
            sender_profile_id,
            message,
            read_at,
            created_at,
            updated_at
          `
        )
        .eq("conversation_id", conversationId)
        .eq("school_id", schoolId)
        .order("created_at", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Erreur chargement messages :",
          error
        );

        setErrorMessage(
          "Impossible de charger les messages."
        );

        setMessages([]);
      } else {
        setMessages(data || []);
      }

      setMessagesLoading(false);
    },
    [schoolId]
  );

  /* =========================================================
     CHARGEMENT INITIAL
     ========================================================= */

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /* =========================================================
     TEMPS RÉEL
     ========================================================= */

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return undefined;
    }

    loadMessages(selectedConversationId);

    const channel = supabase
      .channel(
        `teacher-communication-${selectedConversationId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "communication_messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          setMessages((currentMessages) => {
            if (
              currentMessages.some(
                (item) => item.id === payload.new.id
              )
            ) {
              return currentMessages;
            }

            return [
              ...currentMessages,
              payload.new,
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    loadMessages,
    selectedConversationId,
  ]);

  /* =========================================================
     OUVRIR UNE CONVERSATION
     ========================================================= */

  const openConversation = async (conversation) => {
    setErrorMessage("");

    setSelectedConversationId(conversation.id);
    setSelectedStudentId(conversation.student_id);

    const student = accessibleStudents.find(
      (item) => item.id === conversation.student_id
    );

    if (student?.class_id) {
      setSelectedClassId(student.class_id);
    }

    await loadMessages(conversation.id);
  };

  /* =========================================================
     CRÉER OU OUVRIR UNE CONVERSATION
     ========================================================= */

  const createOrOpenConversation = async () => {
    setErrorMessage("");

    if (!schoolId || !teacherId) {
      setErrorMessage(
        "Votre compte professeur n'est pas correctement configuré."
      );
      return;
    }

    if (!selectedStudentId) {
      setErrorMessage(
        "Sélectionnez d'abord un élève."
      );
      return;
    }

    const student = accessibleStudents.find(
      (item) => item.id === selectedStudentId
    );

    if (!student) {
      setErrorMessage(
        "Cet élève n'est pas accessible depuis votre compte."
      );
      return;
    }

    const { data, error } = await supabase
      .from("communication_conversations")
      .upsert(
        {
          school_id: schoolId,
          teacher_id: teacherId,
          student_id: selectedStudentId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "school_id,teacher_id,student_id",
        }
      )
      .select(
        `
          id,
          school_id,
          teacher_id,
          student_id,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Erreur création conversation :",
        error
      );

      setErrorMessage(
        "Impossible de créer la conversation."
      );

      return;
    }

    setConversations((current) => {
      const exists = current.some(
        (item) => item.id === data.id
      );

      if (exists) {
        return current.map((item) =>
          item.id === data.id
            ? {
                ...item,
                ...data,
              }
            : item
        );
      }

      return [data, ...current];
    });

    setSelectedConversationId(data.id);
    setMessages([]);

    await loadMessages(data.id);
  };

  /* =========================================================
     ENVOYER UN MESSAGE
     ========================================================= */

  const sendMessage = async (event) => {
    event.preventDefault();

    setErrorMessage("");

    const text = draft.trim();

    if (
      !text ||
      !selectedConversationId ||
      !schoolId ||
      !teacherId
    ) {
      return;
    }

    setSending(true);

    const { data, error } = await supabase
      .from("communication_messages")
      .insert({
        conversation_id:
          selectedConversationId,
        school_id: schoolId,
        sender_profile_id: teacherId,
        message: text,
        read_at: null,
      })
      .select(
        `
          id,
          conversation_id,
          school_id,
          sender_profile_id,
          message,
          read_at,
          created_at,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Erreur envoi message :",
        error
      );

      setErrorMessage(
        "Impossible d'envoyer le message."
      );

      setSending(false);
      return;
    }

    setMessages((currentMessages) => {
      if (
        currentMessages.some(
          (item) => item.id === data.id
        )
      ) {
        return currentMessages;
      }

      return [
        ...currentMessages,
        data,
      ];
    });

    setDraft("");

    const newUpdatedAt =
      data.created_at ||
      new Date().toISOString();

    const { error: conversationError } =
      await supabase
        .from("communication_conversations")
        .update({
          updated_at: newUpdatedAt,
        })
        .eq("id", selectedConversationId)
        .eq("school_id", schoolId)
        .eq("teacher_id", teacherId);

    if (conversationError) {
      console.error(
        "Erreur mise à jour conversation :",
        conversationError
      );
    }

    setConversations((current) =>
      current
        .map((item) =>
          item.id === selectedConversationId
            ? {
                ...item,
                updated_at: newUpdatedAt,
              }
            : item
        )
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        )
    );

    setSending(false);
  };

  /* =========================================================
     AFFICHAGE
     ========================================================= */

  return (
    <div>
      {/* =====================================================
          EN-TÊTE
         ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            💬 Communication
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 15,
            }}
          >
            Échangez directement avec les élèves
            de vos classes.
          </p>
        </div>
      </div>

      {/* =====================================================
          MESSAGE D'ERREUR
         ===================================================== */}

      {errorMessage && (
        <div
          style={{
            marginBottom: 18,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* =====================================================
          CONTENU
         ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(260px, 340px) minmax(0, 1fr)",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* ===================================================
            COLONNE GAUCHE
           =================================================== */}

        <div
          className="ec-card"
          style={{
            padding: 18,
          }}
        >
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: 18,
              color: "#0f172a",
            }}
          >
            Mes conversations
          </h2>

          {/* CONVERSATIONS */}

          {loading ? (
            <div
              style={{
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Chargement…
            </div>
          ) : conversations.length === 0 ? (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#f8fafc",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Aucune conversation pour le moment.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              {conversations.map((conversation) => {
                const student =
                  accessibleStudents.find(
                    (item) =>
                      item.id ===
                      conversation.student_id
                  );

                const active =
                  conversation.id ===
                  selectedConversationId;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() =>
                      openConversation(
                        conversation
                      )
                    }
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: active
                        ? "1px solid #2563eb"
                        : "1px solid #e2e8f0",
                      background: active
                        ? "#eff6ff"
                        : "#fff",
                      borderRadius: 12,
                      padding: 13,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      👨‍🎓{" "}
                      {student
                        ? getStudentName(student)
                        : "Élève"}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color: "#64748b",
                        fontSize: 12,
                      }}
                    >
                      {student?.class_id
                        ? classNameById.get(
                            student.class_id
                          ) || "Classe"
                        : "Classe"}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color: "#94a3b8",
                        fontSize: 11,
                      }}
                    >
                      {formatDateTime(
                        conversation.updated_at
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* =================================================
              NOUVELLE CONVERSATION
             ================================================= */}

          <div
            style={{
              borderTop:
                "1px solid #e2e8f0",
              marginTop: 18,
              paddingTop: 18,
            }}
          >
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: 15,
                color: "#334155",
              }}
            >
              Nouvelle conversation
            </h3>

            {/* CLASSE */}

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                Classe
              </span>

              <select
                value={selectedClassId}
                onChange={(event) => {
                  setSelectedClassId(
                    event.target.value
                  );
                  setSelectedStudentId("");
                }}
                style={{
                  height: 42,
                  border:
                    "1px solid #cbd5e1",
                  borderRadius: 9,
                  padding: "0 10px",
                  background: "#fff",
                  color: "#0f172a",
                }}
              >
                <option value="">
                  Toutes mes classes
                </option>

                {classes.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            {/* ÉLÈVE */}

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                Élève
              </span>

              <select
                value={selectedStudentId}
                onChange={(event) =>
                  setSelectedStudentId(
                    event.target.value
                  )
                }
                style={{
                  height: 42,
                  border:
                    "1px solid #cbd5e1",
                  borderRadius: 9,
                  padding: "0 10px",
                  background: "#fff",
                  color: "#0f172a",
                }}
              >
                <option value="">
                  Choisir un élève
                </option>

                {filteredStudents.map(
                  (student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {getStudentName(
                        student
                      )}
                    </option>
                  )
                )}
              </select>
            </label>

            {/* BOUTON */}

            <button
              type="button"
              onClick={
                createOrOpenConversation
              }
              style={{
                width: "100%",
                minHeight: 42,
                border: "none",
                borderRadius: 9,
                background: "#2563eb",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Ouvrir la conversation
            </button>
          </div>
        </div>

        {/* ===================================================
            ZONE CHAT
           =================================================== */}

        <div
          className="ec-card"
          style={{
            padding: 18,
            minHeight: 560,
          }}
        >
          {!selectedConversation ? (
            <div
              style={{
                minHeight: 520,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                color: "#64748b",
                padding: 24,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 48,
                    marginBottom: 10,
                  }}
                >
                  💬
                </div>

                <h2
                  style={{
                    margin: 0,
                    color: "#0f172a",
                    fontSize: 20,
                  }}
                >
                  Sélectionnez une conversation
                </h2>

                <p
                  style={{
                    margin:
                      "8px 0 0",
                    fontSize: 14,
                  }}
                >
                  Choisissez un élève à gauche
                  pour commencer à échanger.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                height: 560,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* EN-TÊTE CONVERSATION */}

              <div
                style={{
                  borderBottom:
                    "1px solid #e2e8f0",
                  paddingBottom: 14,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  👨‍🎓{" "}
                  {selectedStudent
                    ? getStudentName(
                        selectedStudent
                      )
                    : "Élève"}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  {selectedStudent?.class_id
                    ? classNameById.get(
                        selectedStudent.class_id
                      ) || "Classe"
                    : "Classe"}
                </div>
              </div>

              {/* MESSAGES */}

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding:
                    "4px 4px 14px",
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: 10,
                }}
              >
                {messagesLoading ? (
                  <div
                    style={{
                      color: "#64748b",
                      textAlign:
                        "center",
                      padding: 20,
                    }}
                  >
                    Chargement des messages…
                  </div>
                ) : messages.length === 0 ? (
                  <div
                    style={{
                      color: "#64748b",
                      textAlign:
                        "center",
                      padding: 30,
                    }}
                  >
                    Aucun message.
                    <br />
                    Vous pouvez commencer
                    la conversation.
                  </div>
                ) : (
                  messages.map((item) => {
                    const mine =
                      item.sender_profile_id ===
                      teacherId;

                    return (
                      <div
                        key={item.id}
                        style={{
                          alignSelf: mine
                            ? "flex-end"
                            : "flex-start",
                          maxWidth: "78%",
                        }}
                      >
                        <div
                          style={{
                            padding:
                              "10px 13px",
                            borderRadius: 14,
                            background: mine
                              ? "#2563eb"
                              : "#f1f5f9",
                            color: mine
                              ? "#fff"
                              : "#0f172a",
                            whiteSpace:
                              "pre-wrap",
                            wordBreak:
                              "break-word",
                          }}
                        >
                          {item.message}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: "#94a3b8",
                            textAlign:
                              mine
                                ? "right"
                                : "left",
                          }}
                        >
                          {formatDateTime(
                            item.created_at
                          )}

                          {mine &&
                          item.read_at
                            ? " · Lu"
                            : ""}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* COMPOSER */}

              <form
                onSubmit={sendMessage}
                style={{
                  borderTop:
                    "1px solid #e2e8f0",
                  paddingTop: 14,
                  display: "flex",
                  gap: 10,
                  alignItems:
                    "flex-end",
                }}
              >
                <textarea
                  value={draft}
                  onChange={(event) =>
                    setDraft(
                      event.target.value
                    )
                  }
                  placeholder="Écrire un message…"
                  rows={2}
                  disabled={sending}
                  style={{
                    flex: 1,
                    resize: "none",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: 11,
                    fontFamily:
                      "inherit",
                    fontSize: 14,
                    outline: "none",
                  }}
                />

                <button
                  type="submit"
                  disabled={
                    sending ||
                    !draft.trim()
                  }
                  style={{
                    minWidth: 100,
                    height: 44,
                    border: "none",
                    borderRadius: 10,
                    background:
                      sending ||
                      !draft.trim()
                        ? "#cbd5e1"
                        : "#2563eb",
                    color: "#fff",
                    fontWeight: 800,
                    cursor:
                      sending ||
                      !draft.trim()
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {sending
                    ? "Envoi…"
                    : "Envoyer"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
