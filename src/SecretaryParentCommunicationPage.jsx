import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function SecretaryParentCommunicationPage({
  schoolId,
  secretaryId,
  onBack,
}) {
  const [parents, setParents] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!schoolId || !secretaryId) return;
    loadParents();
  }, [schoolId, secretaryId]);

  useEffect(() => {
    if (!schoolId || !secretaryId || !selectedParentId) {
      setConversation(null);
      setMessages([]);
      return;
    }

    loadConversation();
  }, [schoolId, secretaryId, selectedParentId]);

  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`secretary-parent-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "secretary_parent_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((current) => {
            const exists = current.some(
              (item) => item.id === payload.new.id
            );

            if (exists) return current;

            return [...current, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  async function loadParents() {
    setLoading(true);
    setError("");

    const { data, error: parentsError } = await supabase
      .from("parents")
      .select(`
        id,
        full_name,
        phone,
        email,
        active
      `)
      .eq("school_id", schoolId)
      .order("full_name");

    if (parentsError) {
      console.error(
        "Erreur chargement parents :",
        parentsError
      );

      setError(
        parentsError.message ||
          "Impossible de charger les parents."
      );

      setParents([]);
    } else {
      setParents(data || []);
    }

    setLoading(false);
  }

  async function loadConversation() {
    setError("");
    setSuccess("");

    const {
      data: existingConversation,
      error: conversationError,
    } = await supabase
      .from("secretary_parent_conversations")
      .select(`
        id,
        school_id,
        secretary_id,
        parent_id,
        created_at,
        updated_at
      `)
      .eq("school_id", schoolId)
      .eq("secretary_id", secretaryId)
      .eq("parent_id", selectedParentId)
      .maybeSingle();

    if (conversationError) {
      console.error(
        "Erreur conversation :",
        conversationError
      );

      setConversation(null);
      setMessages([]);

      setError(
        conversationError.message ||
          "Impossible de charger la conversation."
      );

      return;
    }

    if (!existingConversation) {
      setConversation(null);
      setMessages([]);
      return;
    }

    setConversation(existingConversation);

    const {
      data: conversationMessages,
      error: messagesError,
    } = await supabase
      .from("secretary_parent_messages")
      .select(`
        id,
        conversation_id,
        school_id,
        secretary_id,
        parent_id,
        subject,
        message,
        sender_type,
        read_at,
        created_at
      `)
      .eq("conversation_id", existingConversation.id)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error(
        "Erreur messages :",
        messagesError
      );

      setMessages([]);

      setError(
        messagesError.message ||
          "Impossible de charger les messages."
      );

      return;
    }

    setMessages(conversationMessages || []);
  }

  async function ensureConversation() {
    if (conversation) {
      return conversation;
    }

    const { data, error: createError } = await supabase
      .from("secretary_parent_conversations")
      .insert({
        school_id: schoolId,
        secretary_id: secretaryId,
        parent_id: selectedParentId,
      })
      .select(`
        id,
        school_id,
        secretary_id,
        parent_id,
        created_at,
        updated_at
      `)
      .single();

    if (createError) {
      console.error(
        "Erreur création conversation :",
        createError
      );

      throw createError;
    }

    setConversation(data);

    return data;
  }

  async function sendMessage(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const text = message.trim();

    if (!selectedParentId) {
      setError("Veuillez sélectionner un parent.");
      return;
    }

    if (!text) {
      setError("Veuillez écrire un message.");
      return;
    }

    setSending(true);

    try {
      const currentConversation =
        await ensureConversation();

      const { error: insertError } = await supabase
        .from("secretary_parent_messages")
        .insert({
          conversation_id: currentConversation.id,
          school_id: schoolId,
          secretary_id: secretaryId,
          parent_id: selectedParentId,
          subject: "Communication",
          message: text,
          sender_type: "secretary",
        });

      if (insertError) {
        throw insertError;
      }

      setMessage("");

      setSuccess("Message envoyé avec succès.");

      await loadConversation();
    } catch (err) {
      console.error(
        "Erreur envoi message secrétaire-parent :",
        err
      );

      setError(
        err?.message ||
          "Impossible d'envoyer le message."
      );
    } finally {
      setSending(false);
    }
  }

  const selectedParent = parents.find(
    (parent) => parent.id === selectedParentId
  );

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          Chargement des parents...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            💬 Communication avec les parents
          </h2>

          <p style={styles.subtitle}>
            Échange direct entre le secrétariat et les parents.
          </p>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={styles.backButton}
          >
            ← Retour
          </button>
        )}
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {success && (
        <div style={styles.success}>
          {success}
        </div>
      )}

      <div style={styles.layout}>
        <div style={styles.parentsCard}>
          <h3 style={styles.sectionTitle}>
            👨‍👩‍👧 Parents
          </h3>

          {parents.length === 0 ? (
            <p style={styles.muted}>
              Aucun parent trouvé dans cette école.
            </p>
          ) : (
            <div style={styles.parentsList}>
              {parents.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() =>
                    setSelectedParentId(parent.id)
                  }
                  style={{
                    ...styles.parentButton,
                    ...(selectedParentId === parent.id
                      ? styles.parentButtonActive
                      : {}),
                  }}
                >
                  <strong>
                    {parent.full_name}
                  </strong>

                  {parent.phone && (
                    <span style={styles.parentInfo}>
                      {parent.phone}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={styles.chatCard}>
          {!selectedParent ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                💬
              </div>

              <h3>
                Sélectionnez un parent
              </h3>

              <p style={styles.muted}>
                Choisissez un parent pour ouvrir ou créer
                sa conversation.
              </p>
            </div>
          ) : (
            <>
              <div style={styles.chatHeader}>
                <div>
                  <h3 style={styles.sectionTitle}>
                    {selectedParent.full_name}
                  </h3>

                  {selectedParent.email && (
                    <div style={styles.muted}>
                      {selectedParent.email}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.messages}>
                {messages.length === 0 ? (
                  <div style={styles.emptyMessages}>
                    Aucun message dans cette conversation.
                  </div>
                ) : (
                  messages.map((item) => {
                    const isSecretary =
                      item.sender_type === "secretary";

                    return (
                      <div
                        key={item.id}
                        style={{
                          ...styles.messageRow,
                          justifyContent: isSecretary
                            ? "flex-end"
                            : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            ...styles.messageBubble,
                            ...(isSecretary
                              ? styles.secretaryBubble
                              : styles.parentBubble),
                          }}
                        >
                          <div>
                            {item.message}
                          </div>

                          <div style={styles.messageDate}>
                            {item.created_at
                              ? new Date(
                                  item.created_at
                                ).toLocaleString("fr-FR")
                              : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={sendMessage}
                style={styles.form}
              >
                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Écrivez votre message..."
                  rows={4}
                  style={styles.textarea}
                />

                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    ...styles.sendButton,
                    opacity: sending ? 0.6 : 1,
                  }}
                >
                  {sending
                    ? "Envoi..."
                    : "✉️ Envoyer"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
    boxSizing: "border-box",
    color: "#000000",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
    color: "#000000",
  },

  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 800,
    color: "#000000",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#000000",
    fontSize: "14px",
  },

  backButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#000000",
    borderRadius: "9px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "15px",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "15px",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: "18px",
  },

  parentsCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "15px",
    color: "#000000",
  },

  chatCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflow: "hidden",
    minHeight: "600px",
    display: "flex",
    flexDirection: "column",
    color: "#000000",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 800,
    color: "#000000",
  },

  parentsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "15px",
  },

  parentButton: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#000000",
    borderRadius: "10px",
    padding: "11px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  parentButtonActive: {
    background: "#eef2ff",
    border: "1px solid #6366f1",
    color: "#000000",
  },

  parentInfo: {
    color: "#000000",
    fontSize: "12px",
  },

  chatHeader: {
    padding: "16px",
    borderBottom: "1px solid #e2e8f0",
    color: "#000000",
  },

  messages: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    background: "#f8fafc",
    minHeight: "350px",
    color: "#000000",
  },

  messageRow: {
    display: "flex",
    marginBottom: "10px",
  },

  messageBubble: {
    maxWidth: "75%",
    padding: "10px 13px",
    borderRadius: "12px",
    fontSize: "14px",
    lineHeight: 1.45,
  },

  secretaryBubble: {
    background: "#4f46e5",
    color: "#ffffff",
  },

  parentBubble: {
    background: "#e2e8f0",
    color: "#000000",
  },

  messageDate: {
    marginTop: "6px",
    fontSize: "10px",
    opacity: 0.7,
  },

  form: {
    padding: "15px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    color: "#000000",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#000000",
    borderRadius: "9px",
    padding: "10px 12px",
    fontSize: "14px",
    resize: "vertical",
  },

  sendButton: {
    border: "none",
    background: "#4f46e5",
    color: "#ffffff",
    borderRadius: "9px",
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 800,
  },

  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px",
    textAlign: "center",
    color: "#000000",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  emptyMessages: {
    textAlign: "center",
    color: "#000000",
    padding: "30px",
  },

  muted: {
    color: "#000000",
    fontSize: "13px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    color: "#000000",
  },
};

export default SecretaryParentCommunicationPage;
