import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

export default function TeacherSecretaryCommunicationPage({
  schoolId,
  teacherId,
}) {
  const [secretaries, setSecretaries] = useState([]);
  const [selectedSecretaryId, setSelectedSecretaryId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedSecretary = useMemo(
    () =>
      secretaries.find(
        (item) => item.id === selectedSecretaryId
      ),
    [secretaries, selectedSecretaryId]
  );

  async function loadSecretaries() {
    if (!schoolId || !teacherId) return;

    const { data, error } = await supabase
      .from("secretaries")
      .select("id, profile_id, school_id, active")
      .eq("school_id", schoolId)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setError("Impossible de charger les secrétaires.");
      return;
    }

    setSecretaries(data || []);

    if (!selectedSecretaryId && data?.length) {
      setSelectedSecretaryId(data[0].id);
    }
  }

  async function loadConversation() {
    if (!schoolId || !teacherId || !selectedSecretaryId) {
      setConversation(null);
      setMessages([]);
      return;
    }

    setLoading(true);
    setError("");

    const { data: conversationData, error: conversationError } =
      await supabase
        .from("teacher_secretary_conversations")
        .select("*")
        .eq("school_id", schoolId)
        .eq("teacher_id", teacherId)
        .eq("secretary_id", selectedSecretaryId)
        .maybeSingle();

    if (conversationError) {
      console.error(conversationError);
      setError("Impossible de charger la conversation.");
      setLoading(false);
      return;
    }

    setConversation(conversationData || null);

    if (!conversationData) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data: messageData, error: messageError } =
      await supabase
        .from("teacher_secretary_messages")
        .select("*")
        .eq("conversation_id", conversationData.id)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: true });

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
    loadSecretaries();
  }, [schoolId, teacherId]);

  useEffect(() => {
    loadConversation();
  }, [schoolId, teacherId, selectedSecretaryId]);

  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(
        `teacher-secretary-${conversation.id}`
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
                (item) => item.id === payload.new.id
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
        teacher_id: teacherId,
        secretary_id: selectedSecretaryId,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }

    setConversation(data);
    return data;
  }

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text || sending) return;

    if (!selectedSecretaryId) {
      setError("Veuillez sélectionner un secrétaire.");
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
          conversation_id: currentConversation.id,
          school_id: schoolId,
          sender_profile_id: teacherId,
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
    if (!item?.id) return;

    if (
      item.sender_profile_id === teacherId ||
      item.read_at
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
      <div
        style={{
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            color: "#0f172a",
          }}
        >
          📢 Communication avec le Secrétariat
        </h2>

        <p
          style={{
            margin: "7px 0 0",
            color: "#64748b",
          }}
        >
          Échangez directement avec le secrétariat
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

      {secretaries.length === 0 ? (
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
            👤
          </div>

          <strong>
            Aucun secrétaire disponible
          </strong>

          <p>
            Aucun secrétaire actif n'a été trouvé
            dans votre école.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              marginBottom: 15,
            }}
          >
            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: 7,
              }}
            >
              Secrétaire
            </label>

            <select
              value={selectedSecretaryId}
              onChange={(event) =>
                setSelectedSecretaryId(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
              }}
            >
              {secretaries.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  Secrétariat
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              border: "1px solid #e2e8f0",
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
              👤 Secrétariat
              {selectedSecretary?.active
                ? " • En ligne"
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
                    avec le secrétariat.
                  </p>
                </div>
              ) : (
                messages.map((item) => {
                  const mine =
                    item.sender_profile_id ===
                    teacherId;

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
                          boxShadow:
                            "0 1px 3px rgba(15,23,42,0.08)",
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
                            Secrétariat
                          </div>
                        )}

                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
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
                          ).toLocaleString("fr-FR")}
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
                  setMessage(event.target.value)
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
                  alignSelf: "stretch",
                  padding: "0 20px",
                  border: "none",
                  borderRadius: 10,
                  background: sending
                    ? "#94a3b8"
                    : "#2563eb",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: sending
                    ? "not-allowed"
                    : "pointer",
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
