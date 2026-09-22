import { useEffect, useMemo, useState } from "react";
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
  const [searchParent, setSearchParent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedParent = useMemo(
    () =>
      parents.find(
        (parent) => parent.id === selectedParentId
      ) || null,
    [parents, selectedParentId]
  );

  const filteredParents = useMemo(() => {
    const search = searchParent.trim().toLowerCase();

    // Ne rien afficher tant qu'aucune recherche n'est saisie
    if (!search) {
      return [];
    }

    // Rechercher uniquement par nom du parent
    return parents.filter((parent) => {
      const name = String(
        parent.full_name || ""
      ).toLowerCase();

      return name.includes(search);
    });
  }, [parents, searchParent]);

  async function loadParents() {
    if (!schoolId) {
      setError("École non configurée.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: parentsError } = await supabase
      .from("parents")
      .select(`
        id,
        profile_id,
        school_id,
        phone,
        profiles:profile_id (
          full_name,
          phone
        )
      `)
      .eq("school_id", schoolId)
      .order("created_at", {
        ascending: true,
      });

    if (parentsError) {
      console.error(
        "Erreur chargement parents :",
        parentsError
      );
      setError(
        "Impossible de charger la liste des parents."
      );
      setLoading(false);
      return;
    }

    const formattedParents = (data || []).map((parent) => ({
      id: parent.id,
      profile_id: parent.profile_id,
      school_id: parent.school_id,
      full_name:
        parent.profiles?.full_name ||
        "Parent sans nom",
      phone:
        parent.phone ||
        parent.profiles?.phone ||
        "",
      email: "",
    }));

    setParents(formattedParents);

    setLoading(false);
  }

  async function loadConversation(parentId) {
    if (!schoolId || !secretaryId || !parentId) {
      setConversation(null);
      setMessages([]);
      return;
    }

    setError("");

    const { data: existingConversation, error: conversationError } =
      await supabase
        .from("secretary_parent_conversations")
        .select("*")
        .eq("school_id", schoolId)
        .eq("secretary_id", secretaryId)
        .eq("parent_id", parentId)
        .maybeSingle();

    if (conversationError) {
      console.error(
        "Erreur conversation :",
        conversationError
      );
      setError(
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

    const { data: conversationMessages, error: messagesError } =
      await supabase
        .from("secretary_parent_messages")
        .select(`
          id,
          school_id,
          secretary_id,
          parent_id,
          subject,
          message,
          sender_type,
          read_at,
          created_at,
          conversation_id
        `)
        .eq("school_id", schoolId)
        .eq(
          "conversation_id",
          existingConversation.id
        )
        .order("created_at", {
          ascending: true,
        });

    if (messagesError) {
      console.error(
        "Erreur messages :",
        messagesError
      );
      setError(
        "Impossible de charger les messages."
      );
      return;
    }

    setMessages(conversationMessages || []);
  }

  async function ensureConversation(parentId) {
    if (!schoolId || !secretaryId || !parentId) {
      return null;
    }

    if (conversation?.id) {
      return conversation;
    }

    const { data: existingConversation, error: findError } =
      await supabase
        .from("secretary_parent_conversations")
        .select("*")
        .eq("school_id", schoolId)
        .eq("secretary_id", secretaryId)
        .eq("parent_id", parentId)
        .maybeSingle();

    if (findError) {
      console.error(
        "Erreur recherche conversation :",
        findError
      );
      throw findError;
    }

    if (existingConversation) {
      setConversation(existingConversation);
      return existingConversation;
    }

    const { data: newConversation, error: createError } =
      await supabase
        .from("secretary_parent_conversations")
        .insert({
          school_id: schoolId,
          secretary_id: secretaryId,
          parent_id: parentId,
        })
        .select("*")
        .single();

    if (createError) {
      console.error(
        "Erreur création conversation :",
        createError
      );
      throw createError;
    }

    setConversation(newConversation);

    return newConversation;
  }

  async function sendMessage() {
    const text = message.trim();

    if (!selectedParentId) {
      setError("Sélectionnez un parent.");
      return;
    }

    if (!text) {
      setError("Écrivez un message.");
      return;
    }

    if (!schoolId || !secretaryId) {
      setError("Informations de connexion manquantes.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const currentConversation =
        await ensureConversation(selectedParentId);

      if (!currentConversation?.id) {
        throw new Error(
          "Conversation introuvable."
        );
      }

      const { data: newMessage, error: insertError } =
        await supabase
          .from("secretary_parent_messages")
          .insert({
            school_id: schoolId,
            secretary_id: secretaryId,
            parent_id: selectedParentId,
            conversation_id: currentConversation.id,
            subject: "Communication",
            message: text,
            sender_type: "secretary",
          })
          .select(`
            id,
            school_id,
            secretary_id,
            parent_id,
            subject,
            message,
            sender_type,
            read_at,
            created_at,
            conversation_id
          `)
          .single();

      if (insertError) {
        console.error(
          "Erreur envoi message :",
          insertError
        );
        throw insertError;
      }

      setMessages((current) => [
        ...current,
        newMessage,
      ]);

      setMessage("");

      setSuccess(
        `Message envoyé à ${
          selectedParent?.full_name ||
          "ce parent"
        } avec succès`
      );
    } catch (sendError) {
      console.error(
        "Erreur communication parent :",
        sendError
      );

      setError(
        "Impossible d'envoyer le message."
      );
    } finally {
      setSending(false);
    }
  }
  async function editMessage(messageId, currentText) {
  if (!messageId || !schoolId || !secretaryId) {
    return;
  }

  const newText = window.prompt(
    "Modifier le message :",
    currentText
  );

  if (newText === null) {
    return;
  }

  const trimmedText = newText.trim();

  if (!trimmedText) {
    setError("Le message ne peut pas être vide.");
    return;
  }

  setError("");
  setSuccess("");

  try {
    const { data, error: updateError } = await supabase
      .from("secretary_parent_messages")
      .update({
        message: trimmedText,
      })
      .eq("id", messageId)
      .eq("school_id", schoolId)
      .eq("secretary_id", secretaryId)
      .eq("sender_type", "secretary")
      .select(`
        id,
        school_id,
        secretary_id,
        parent_id,
        subject,
        message,
        sender_type,
        read_at,
        created_at,
        conversation_id
      `)
      .single();

    if (updateError) {
      console.error(
        "Erreur modification message :",
        updateError
      );
      throw updateError;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? data : item
      )
    );

    setSuccess("Message modifié avec succès.");
  } catch (editError) {
    console.error(
      "Erreur modification communication parent :",
      editError
    );

    setError(
      editError?.message ||
        "Impossible de modifier le message."
    );
  }
}
async function deleteMessage(messageId) {
  if (!messageId || !schoolId || !secretaryId) {
    return;
  }

  const confirmed = window.confirm(
    "Voulez-vous vraiment supprimer ce message ?"
  );

  if (!confirmed) {
    return;
  }

  setError("");
  setSuccess("");

  try {
    const { error: deleteError } = await supabase
      .from("secretary_parent_messages")
      .delete()
      .eq("id", messageId)
      .eq("school_id", schoolId)
      .eq("secretary_id", secretaryId)
      .eq("sender_type", "secretary");

    if (deleteError) {
      console.error(
        "Erreur suppression message :",
        deleteError
      );
      throw deleteError;
    }

    setMessages((current) =>
      current.filter(
        (item) => item.id !== messageId
      )
    );

    setSuccess("Message supprimé avec succès.");
  } catch (deleteError) {
    console.error(
      "Erreur suppression communication parent :",
      deleteError
    );

    setError(
      deleteError?.message ||
        "Impossible de supprimer le message."
    );
  }
}  
  async function markAsRead(messageId) {
    if (!schoolId || !messageId) {
      return;
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("secretary_parent_messages")
      .update({
        read_at: now,
      })
      .eq("id", messageId)
      .eq("school_id", schoolId);

    if (updateError) {
      console.error(
        "Erreur lecture message :",
        updateError
      );
      return;
    }

    setMessages((current) =>
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

  useEffect(() => {
    loadParents();
  }, [schoolId]);

  useEffect(() => {
    setConversation(null);
    setMessages([]);

    if (selectedParentId) {
      loadConversation(selectedParentId);
    }
  }, [selectedParentId]);

  useEffect(() => {
    if (!conversation?.id) {
      return;
    }

    const channel = supabase
      .channel(
        `secretary-parent-${conversation.id}`
      )
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

            if (exists) {
              return current;
            }

            return [
              ...current,
              payload.new,
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button
          type="button"
          onClick={onBack}
          style={styles.backButton}
        >
          ← Retour
        </button>

        <div>
          <h1 style={styles.title}>
            Communication avec les parents
          </h1>

          <p style={styles.subtitle}>
            Échangez directement avec les parents de l'école.
          </p>
        </div>
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
        <div style={styles.parentsPanel}>
          <h2 style={styles.sectionTitle}>
            Parents
          </h2>

          <input
            type="text"
            value={searchParent}
            onChange={(event) =>
              setSearchParent(event.target.value)
            }
            placeholder="🔎 Rechercher un parent..."
            style={styles.searchInput}
          />

          {loading ? (
            <p style={styles.emptyText}>
              Chargement des parents...
            </p>
          ) : searchParent.trim() === "" ? (
            <p style={styles.emptyText}>
              Recherchez un parent avec son nom.
            </p>
          ) : filteredParents.length === 0 ? (
            <p style={styles.emptyText}>
              Aucun parent trouvé.
            </p>
          ) : (
            <div style={styles.parentList}>
              {filteredParents.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() =>
                    setSelectedParentId(parent.id)
                  }
                  style={{
                    ...styles.parentItem,
                    ...(selectedParentId === parent.id
                      ? styles.parentItemActive
                      : {}),
                  }}
                >
                  <div style={styles.parentName}>
                    {parent.full_name}
                  </div>

                  {parent.phone && (
                    <div style={styles.parentInfo}>
                      📞 {parent.phone}
                    </div>
                  )}

                  {parent.email && (
                    <div style={styles.parentInfo}>
                      ✉️ {parent.email}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={styles.conversationPanel}>
          {!selectedParent ? (
            <div style={styles.noSelection}>
              <div style={styles.noSelectionIcon}>
                💬
              </div>

              <h2 style={styles.noSelectionTitle}>
                Sélectionnez un parent
              </h2>

              <p style={styles.noSelectionText}>
                Choisissez un parent dans la liste pour
                consulter ou démarrer une conversation.
              </p>
            </div>
          ) : (
            <>
              <div style={styles.conversationHeader}>
                <div>
                  <h2 style={styles.conversationTitle}>
                    {selectedParent.full_name}
                  </h2>

                  {selectedParent.phone && (
                    <div style={styles.conversationInfo}>
                      📞 {selectedParent.phone}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.messages}>
                {messages.length === 0 ? (
                  <div style={styles.emptyConversation}>
                    <div style={styles.emptyConversationIcon}>
                      💬
                    </div>

                    <p>
                      Aucun message dans cette conversation.
                    </p>

                    <p>
                      Envoyez le premier message au parent.
                    </p>
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
                          onClick={() => {
                            if (
                              !item.read_at &&
                              !isSecretary
                            ) {
                              markAsRead(item.id);
                            }
                          }}
                        >
                          <div
                            style={styles.messageText}
                          >
                            {item.message}
                          </div>
                          {isSecretary && (
  <div
    style={{
      display: "flex",
      gap: "8px",
      marginTop: "8px",
    }}
  >
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        editMessage(
          item.id,
          item.message
        );
      }}
      style={{
        border: "none",
        background: "transparent",
        color: "#000000",
        padding: "2px 0",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "600",
      }}
    >
      ✏️ Modifier
    </button>

    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        deleteMessage(item.id);
      }}
      style={{
        border: "none",
        background: "transparent",
        color: "#000000",
        padding: "2px 0",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "600",
      }}
    >
      🗑️ Supprimer
    </button>
  </div>
)}
                          
                          <div
                            style={styles.messageDate}
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

              <div style={styles.composer}>
                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Écrivez votre message..."
                  style={styles.textarea}
                  rows={4}
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending}
                  style={{
                    ...styles.sendButton,
                    ...(sending
                      ? styles.sendButtonDisabled
                      : {}),
                  }}
                >
                  {sending
                    ? "Envoi..."
                    : "✉️ Envoyer"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#000000",
    padding: "24px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "24px",
  },

  backButton: {
    border: "none",
    background: "#ffffff",
    color: "#000000",
    padding: "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },

  title: {
    margin: 0,
    color: "#000000",
    fontSize: "26px",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#000000",
  },

  error: {
    background: "#fee2e2",
    color: "#000000",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },

  success: {
    background: "#dcfce7",
    color: "#000000",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "20px",
    alignItems: "stretch",
  },

  parentsPanel: {
    background: "#ffffff",
    color: "#000000",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    minHeight: "600px",
    boxSizing: "border-box",
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: "14px",
    color: "#000000",
  },

  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    outline: "none",
    marginBottom: "14px",
    fontSize: "14px",
    color: "#000000",
  },

  parentList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "520px",
    overflowY: "auto",
  },

  parentItem: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#000000",
    borderRadius: "10px",
    padding: "12px",
    cursor: "pointer",
  },

  parentItemActive: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
    color: "#000000",
  },

  parentName: {
    fontWeight: "700",
    color: "#000000",
    marginBottom: "5px",
  },

  parentInfo: {
    fontSize: "13px",
    color: "#000000",
    marginTop: "3px",
  },

  emptyText: {
    color: "#000000",
    fontSize: "14px",
  },

  conversationPanel: {
    background: "#ffffff",
    color: "#000000",
    borderRadius: "16px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    minHeight: "600px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  conversationHeader: {
    padding: "18px",
    borderBottom: "1px solid #e5e7eb",
  },

  conversationTitle: {
    margin: 0,
    color: "#000000",
  },

  conversationInfo: {
    marginTop: "5px",
    color: "#000000",
    fontSize: "13px",
  },

  messages: {
    flex: 1,
    padding: "18px",
    overflowY: "auto",
    minHeight: "350px",
    maxHeight: "500px",
    color: "#000000",
  },

  messageRow: {
    display: "flex",
    marginBottom: "10px",
  },

  messageBubble: {
    maxWidth: "70%",
    padding: "11px 14px",
    borderRadius: "14px",
    color: "#000000",
  },

  secretaryBubble: {
    background: "#2563eb",
    color: "#000000",
    borderBottomRightRadius: "4px",
  },

  parentBubble: {
    background: "#f3f4f6",
    color: "#000000",
    borderBottomLeftRadius: "4px",
  },

  messageText: {
    whiteSpace: "pre-wrap",
    lineHeight: "1.45",
    color: "#000000",
  },

  messageDate: {
    marginTop: "6px",
    fontSize: "11px",
    opacity: 0.7,
    color: "#000000",
  },

  composer: {
    borderTop: "1px solid #e5e7eb",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "12px",
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
    color: "#000000",
  },

  sendButton: {
    alignSelf: "flex-end",
    border: "none",
    background: "#2563eb",
    color: "#000000",
    padding: "11px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  sendButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    color: "#000000",
  },

  noSelection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "30px",
    color: "#000000",
  },

  noSelectionIcon: {
    fontSize: "48px",
    marginBottom: "12px",
  },

  noSelectionTitle: {
    margin: 0,
    color: "#000000",
  },

  noSelectionText: {
    color: "#000000",
    maxWidth: "450px",
    lineHeight: "1.5",
  },

  emptyConversation: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: "#000000",
  },

  emptyConversationIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    outline: "none",
    fontSize: "14px",
    color: "#000000",
  },

  messageSubject: {
    fontWeight: "700",
    marginBottom: "5px",
    color: "#000000",
  },

  blackText: {
    color: "#000000",
  },
};

export default SecretaryParentCommunicationPage;
