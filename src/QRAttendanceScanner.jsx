import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";

export default function QRAttendanceScanner({
  profile,
  onBack,
}) {
  const scannerRef = useRef(null);
  const scannerStartedRef = useRef(false);
  const processingRef = useRef(false);

  const [eventType, setEventType] = useState("entry");
  const [scannerReady, setScannerReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastStudent, setLastStudent] = useState(null);

  async function stopScanner() {
    const scanner = scannerRef.current;

    if (!scanner || !scannerStartedRef.current) {
      return;
    }

    try {
      await scanner.stop();
    } catch (err) {
      console.warn("Arrêt scanner :", err);
    }

    try {
      scanner.clear();
    } catch (err) {
      console.warn("Nettoyage scanner :", err);
    }

    scannerStartedRef.current = false;
    setScannerReady(false);
  }

  async function registerAttendance(qrToken) {
    if (!qrToken || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "register_qr_attendance",
        {
          p_qr_token: qrToken,
          p_event: eventType,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Le pointage n'a pas pu être enregistré."
        );
      }

      setLastStudent({
        name:
          data.student_name ||
          "Élève",
        event:
          data.event ||
          eventType,
        eventAt:
          data.event_at ||
          null,
        duplicate:
          data.duplicate === true,
      });

      if (data.duplicate) {
        setMessage(
          `${data.student_name || "Élève"} : ce pointage a déjà été enregistré.`
        );
      } else {
        setMessage(
          eventType === "entry"
            ? `Entrée enregistrée pour ${data.student_name || "l'élève"}.`
            : `Sortie enregistrée pour ${data.student_name || "l'élève"}.`
        );
      }
    } catch (err) {
      console.error(
        "Erreur pointage QR :",
        err
      );

      setError(
        err?.message ||
          "Impossible d'enregistrer le pointage."
      );
    } finally {
      setLoading(false);

      setTimeout(() => {
        processingRef.current = false;
      }, 800);
    }
  }

  async function startScanner() {
    setError("");
    setMessage("");

    if (!window.isSecureContext) {
      setError(
        "La caméra nécessite une connexion HTTPS."
      );
      return;
    }

    try {
      const {
        Html5Qrcode,
      } = await import("html5-qrcode");

      const scanner = new Html5Qrcode(
        "qr-reader"
      );

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await registerAttendance(
            decodedText
          );
        },
        () => {
          // Les erreurs de lecture normales
          // sont ignorées pour éviter d'afficher
          // un message à chaque image.
        }
      );

      scannerStartedRef.current = true;
      setScannerReady(true);
    } catch (err) {
      console.error(
        "Erreur démarrage caméra :",
        err
      );

      setScannerReady(false);

      if (
        String(err?.message || "")
          .toLowerCase()
          .includes("permission")
      ) {
        setError(
          "L'accès à la caméra a été refusé. Autorisez la caméra dans les réglages du navigateur."
        );
      } else {
        setError(
          "Impossible d'ouvrir la caméra. Vérifiez que votre téléphone autorise l'accès à la caméra."
        );
      }
    }
  }

  async function changeEventType(type) {
    setEventType(type);
    setMessage("");
    setError("");
    setLastStudent(null);

    if (scannerStartedRef.current) {
      await stopScanner();

      setTimeout(() => {
        startScanner();
      }, 200);
    }
  }

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  function formatEventDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(
      "fr-FR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "20px",
        color: "#000",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
        }}
      >
        {/* RETOUR */}

        <button
          type="button"
          onClick={async () => {
            await stopScanner();

            if (onBack) {
              onBack();
            }
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "#000",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            padding: "8px 0",
            marginBottom: "12px",
          }}
        >
          ← Retour
        </button>

        {/* EN-TÊTE */}

        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "22px",
            marginBottom: "16px",
            boxShadow:
              "0 4px 18px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "8px",
            }}
          >
            📷
          </div>

          <h1
            style={{
              margin: "0 0 8px",
              color: "#000",
              fontSize: "26px",
            }}
          >
            Scanner QR Élève
          </h1>

          <p
            style={{
              margin: 0,
              color: "#000",
              lineHeight: 1.5,
            }}
          >
            Scannez le QR code de l'élève
            avec la caméra du téléphone pour
            enregistrer son entrée ou sa sortie.
          </p>
        </div>

        {/* TYPE DE POINTAGE */}

        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "18px",
            marginBottom: "16px",
            boxShadow:
              "0 4px 18px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: "18px",
              color: "#000",
            }}
          >
            Type de pointage
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                changeEventType("entry")
              }
              style={{
                padding: "15px",
                borderRadius: "12px",
                border:
                  eventType === "entry"
                    ? "2px solid #000"
                    : "1px solid #ddd",
                background:
                  eventType === "entry"
                    ? "#e8f7ee"
                    : "#fff",
                color: "#000",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              🟢
              <br />
              Entrée
            </button>

            <button
              type="button"
              onClick={() =>
                changeEventType("exit")
              }
              style={{
                padding: "15px",
                borderRadius: "12px",
                border:
                  eventType === "exit"
                    ? "2px solid #000"
                    : "1px solid #ddd",
                background:
                  eventType === "exit"
                    ? "#fff1e8"
                    : "#fff",
                color: "#000",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              🔴
              <br />
              Sortie
            </button>
          </div>
        </div>

        {/* SCANNER */}

        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "18px",
            marginBottom: "16px",
            boxShadow:
              "0 4px 18px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: "14px",
            }}
          >
            <strong
              style={{
                color: "#000",
                fontSize: "18px",
              }}
            >
              {eventType === "entry"
                ? "Scanner une entrée"
                : "Scanner une sortie"}
            </strong>

            <p
              style={{
                margin:
                  "6px 0 0",
                color: "#000",
                fontSize: "14px",
              }}
            >
              Placez le QR code devant
              la caméra.
            </p>
          </div>

          <div
            id="qr-reader"
            style={{
              width: "100%",
              maxWidth: "500px",
              margin: "0 auto",
              overflow: "hidden",
              borderRadius: "14px",
            }}
          />

          {!scannerReady &&
            !loading && (
              <button
                type="button"
                onClick={startScanner}
                style={{
                  width: "100%",
                  marginTop: "14px",
                  padding: "14px",
                  border: "none",
                  borderRadius: "12px",
                  background: "#000",
                  color: "#fff",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                📷 Ouvrir la caméra
              </button>
            )}

          {scannerReady && (
            <div
              style={{
                textAlign: "center",
                marginTop: "12px",
                fontSize: "14px",
                color: "#000",
              }}
            >
              🟢 Caméra active
            </div>
          )}
        </div>

        {/* CHARGEMENT */}

        {loading && (
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "18px",
              marginBottom: "16px",
              textAlign: "center",
              color: "#000",
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.08)",
            }}
          >
            ⏳ Enregistrement du pointage...
          </div>
        )}

        {/* SUCCÈS */}

        {message && (
          <div
            style={{
              background: "#e8f7ee",
              border:
                "1px solid #9bd6ad",
              borderRadius: "18px",
              padding: "18px",
              marginBottom: "16px",
              color: "#000",
            }}
          >
            <strong>
              ✅ {message}
            </strong>

            {lastStudent && (
              <div
                style={{
                  marginTop: "10px",
                  lineHeight: 1.6,
                }}
              >
                <div>
                  <strong>Élève :</strong>{" "}
                  {lastStudent.name}
                </div>

                <div>
                  <strong>
                    Type :
                  </strong>{" "}
                  {lastStudent.event ===
                  "entry"
                    ? "Entrée"
                    : "Sortie"}
                </div>

                {lastStudent.eventAt && (
                  <div>
                    <strong>
                      Heure :
                    </strong>{" "}
                    {formatEventDate(
                      lastStudent.eventAt
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ERREUR */}

        {error && (
          <div
            style={{
              background: "#fff0f0",
              border:
                "1px solid #e0a0a0",
              borderRadius: "18px",
              padding: "18px",
              color: "#000",
              marginBottom: "16px",
            }}
          >
            <strong>
              ⚠️ {error}
            </strong>
          </div>
        )}

        {/* INFORMATIONS */}

        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "18px",
            color: "#000",
            boxShadow:
              "0 4px 18px rgba(0,0,0,0.08)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#000",
            }}
          >
            🔐 Pointage sécurisé
          </h3>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.6,
              color: "#000",
            }}
          >
            Le QR code est vérifié par
            École Connectée. Le pointage est
            automatiquement rattaché à
            l'école de l'élève et une
            notification est envoyée aux
            parents associés.
          </p>

          {profile?.full_name && (
            <p
              style={{
                marginBottom: 0,
                marginTop: "12px",
                fontSize: "14px",
                color: "#000",
              }}
            >
              Scanner utilisé par :{" "}
              <strong>
                {profile.full_name}
              </strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
