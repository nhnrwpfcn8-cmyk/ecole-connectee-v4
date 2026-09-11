import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

export default function SecretaryTeacherCommunicationPage({
  schoolId,
  secretaryId,
}) {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] =
    useState("");
  const [conversation, setConversation] =
    useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedTeacher = useMemo(
    () =>
      teachers.find(
        (item) => item.id === selectedTeacherId
      ),
    [teachers, selectedTeacherId]
  );

  async function loadTeachers() {
    if (!schoolId || !secretaryId) return;

    const { data, error } = await supabase
      .from("teachers")
      .select("id, school_id, display_name, active")
      .eq("school_id", schoolId)
      .eq("active", true)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      setError("Impossible de charger les professeurs.");
      return;
    }

    setTeachers(data || []);

    if (!selectedTeacherId && data?.length) {
      setSelectedTeacherId(data[0].id);
    }
  }

  async function loadConversation() {
    if (
      !schoolId ||
      !secretaryId ||
      !selectedTeacherId
    ) {
      setConversation(null);
      setMessages([]);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("teacher_secretary_conversations")
      .select("*")
      .eq("school_id", schoolId)
      .eq("teacher_id", selectedTeacherId)
      .eq("secretary_id", secretaryId)
      .maybeSingle();

    if (error) {
      console.error(error);
      setError("Impossible de charger la conversation.");
      setLoading(false);
      return;
    }

    setConversation(data || null);

    if (!data) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data: messageData, error: messageError } =
      await supabase
        .from("teacher_secretary_messages")
        .select("*")
        .eq("conversation_id", data.id)
        .eq("school_id", schoolId)
        .order("created_at", {
          ascending: true,
        });

    if (messageError) {
      console.error(messageError);
      setError("Impossible de charger les messages.");
      setMessages([]);
    } else {
      setMessages(messageData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTeachers();
  }, [schoolId, secretaryId]);

  useEffect(() => {
    loadConversation();
  }, [
    schoolId,
    secretaryId,
    selectedTeacherId,
  ]);

  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(
        `secretary-teacher-${conversation.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "teacher_secretary_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((current) => {
            if (
              current.some(
                (item) =>
                  item.id === payload.new.id
              )
            ) {
              return current;
            }

            return [...current, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  async function ensureConversation() {
    if (conversation) return conversation;

    const { data, error } = await supabase
      .from("teacher_secretary_conversations")
      .insert({
        school_id: schoolId,
        teacher_id: selectedTeacherId,
        secretary_id: secretaryId,
      })
      .select()
      .single();

    if (error) throw error;

    setConversation(data);
    return data;
  }

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text || sending) return;

    if (!selectedTeacherId) {
      setError("Veuillez sélectionner un professeur.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const currentConversation =
        await ensureConversation();

      const { data, error } = await supabase
        .from("teacher_secretary_messages")
        .insert({
          conversation_id:
            currentConversation.id,
          school_id: schoolId,
          sender_profile_id: secretaryId,
          message: text,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((current) => {
        if (
          current.some(
            (item) => item.id === data.id
          )
        ) {
          return current;
        }

        return [...current, data];
      });

      setMessage("");
      setSuccess("Message envoyé.");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Impossible d'envoyer le message."
      );
    } finally {
      setSending(false);
    }
  }

  async function markAsRead(item) {
    if (!item?.id || item.read_at) return;

    if (
      item.sender_profile_id === secretaryId
    ) {
      return;
    }

    await supabase
      .from("teacher_secretary_messages")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("school_id", schoolId);
  }

  return (
    <section
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: 24,
        boxShadow:
          "0 8px 25px rgba(15,23,42,0.08)",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            color: "#0f172a",
          }}
        >
          👨‍🏫 Communication avec les professeurs
        </h2>

        <p
          style={{
            margin: "7px 0 0",
            color: "#64748b",
          }}
        >
          Échangez directement avec les professeurs
          de votre école.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 15,
            borderRadius: 10,
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: 12,
            marginBottom: 15,
            borderRadius: 10,
            background: "#dcfce7",
            color: "#166534",
          }}
        >
          ✅ {success}
        </div>
      )}

      {teachers.length === 0 ? (
        <div
          style={{
            padding: 35,
            textAlign: "center",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            color: "#64748b",
          }}
        >
          <div style={{ fontSize: 40 }}>
            👨‍🏫
          </div>

          <strong>
            Aucun professeur disponible
          </strong>

          <p>
            Aucun professeur actif n'a été trouvé
            dans votre école.
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 15 }}>
            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: 7,
              }}
            >
              Professeur
            </label>

            <select
              value={selectedTeacherId}
              onChange={(event) =>
                setSelectedTeacherId(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border:
                  "1px solid #cbd5e1",
                background: "#ffffff",
              }}
            >
              {teachers.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  Professeur
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              border:
                "1px solid #e2e8f0",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 15,
                background: "#f8fafc",
                borderBottom:
                  "1px solid #e2e8f0",
                fontWeight: 700,
              }}
            >
              👨‍🏫 Professeur
              {selectedTeacher?.active
                ? " • Actif"
                : ""}
            </div>

            <div
              style={{
                minHeight: 360,
                maxHeight: 500,
                overflowY: "auto",
                padding: 18,
                background: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    padding: 30,
                  }}
                >
                  Chargement...
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    padding: 50,
                  }}
                >
                  <div style={{ fontSize: 40 }}>
                    💬
                  </div>

                  <strong>
                    Aucun message
                  </strong>

                  <p>
                    Commencez la conversation
                    avec le professeur.
                  </p>
                </div>
              ) : (
                messages.map((item) => {
                  const mine =
                    item.sender_profile_id ===
                    secretaryId;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() =>
                        markAsRead(item)
                      }
                      style={{
                        display: "flex",
                        justifyContent: mine
                          ? "flex-end"
                          : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "75%",
                          padding:
                            "10px 14px",
                          borderRadius: mine
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                          background: mine
                            ? "#2563eb"
                            : "#ffffff",
                          color: mine
                            ? "#ffffff"
                            : "#0f172a",
                          border: mine
                            ? "none"
                            : "1px solid #e2e8f0",
                        }}
                      >
                        {!mine && (
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#2563eb",
                              marginBottom: 4,
                            }}
                          >
                            Professeur
                          </div>
                        )}

                        <div
                          style={{
                            whiteSpace:
                              "pre-wrap",
                            wordBreak:
                              "break-word",
                            lineHeight: 1.45,
                          }}
                        >
                          {item.message}
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 10,
                            opacity: 0.7,
                            textAlign: "right",
                          }}
                        >
                          {new Date(
                            item.created_at
                          ).toLocaleString(
                            "fr-FR"
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={sendMessage}
              style={{
                display: "flex",
                gap: 10,
                padding: 15,
                borderTop:
                  "1px solid #e2e8f0",
                background: "#ffffff",
              }}
            >
              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                placeholder="Écrire un message..."
                rows={2}
                style={{
                  flex: 1,
                  resize: "vertical",
                  padding: 12,
                  borderRadius: 10,
                  border:
                    "1px solid #cbd5e1",
                  fontFamily: "inherit",
                }}
              />

              <button
                type="submit"
                disabled={sending}
                style={{
                  padding: "0 20px",
                  border: "none",
                  borderRadius: 10,
                  background: sending
                    ? "#94a3b8"
                    : "#2563eb",
                  color: "#ffffff",
                  fontWeight: 700,
                }}
              >
                {sending
                  ? "..."
                  : "📤 Envoyer"}
              </button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
