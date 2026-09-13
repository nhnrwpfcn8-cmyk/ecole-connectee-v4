import { supabase } from "./supabase";

const BUCKET = "student-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function extensionFromType(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function validateStudentPhoto(file) {
  if (!file) return null;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      "La photo doit être au format JPG, PNG ou WebP."
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "La photo ne doit pas dépasser 5 Mo."
    );
  }

  return file;
}

/**
 * Enregistre la photo d'un élève dans le stockage privé.
 *
 * Le chemin utilisé est :
 * schoolId/studentId/photo.extension
 *
 * Cela permet de respecter l'isolation entre les écoles.
 */
export async function uploadStudentPhoto({
  schoolId,
  studentId,
  file,
}) {
  if (!schoolId || !studentId) {
    throw new Error(
      "École ou élève non identifié."
    );
  }

  validateStudentPhoto(file);

  if (!file) {
    return {
      path: null,
      signedUrl: null,
    };
  }

  const extension = extensionFromType(file.type);

  const path =
    `${schoolId}/${studentId}/photo.${extension}`;

  const { error: uploadError } =
    await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true,
      });

  if (uploadError) {
    throw new Error(
      uploadError.message ||
        "Impossible d'envoyer la photo de l'élève."
    );
  }

  const { error: updateError } =
    await supabase
      .from("students")
      .update({
        photo_url: path,
      })
      .eq("id", studentId)
      .eq("school_id", schoolId);

  if (updateError) {
    await supabase.storage
      .from(BUCKET)
      .remove([path]);

    throw new Error(
      updateError.message ||
        "Impossible d'enregistrer la photo de l'élève."
    );
  }

  const {
    data: signedData,
    error: signedError,
  } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(
      path,
      60 * 60
    );

  if (signedError) {
    return {
      path,
      signedUrl: null,
      warning:
        "La photo a été enregistrée, mais son aperçu sécurisé n'a pas pu être généré.",
    };
  }

  return {
    path,
    signedUrl:
      signedData?.signedUrl || null,
  };
}

/**
 * Génère une URL temporaire sécurisée
 * pour afficher une photo stockée dans le bucket privé.
 */
export async function getStudentPhotoUrl(
  photoPath
) {
  if (!photoPath) return null;

  // Compatibilité avec une ancienne URL complète.
  if (/^https?:\/\//i.test(photoPath)) {
    return photoPath;
  }

  const {
    data,
    error,
  } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(
      photoPath,
      60 * 60
    );

  if (error) {
    console.error(
      "Erreur URL photo élève :",
      error
    );

    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Supprime une photo du stockage.
 */
export async function deleteStudentPhoto(
  photoPath
) {
  if (
    !photoPath ||
    /^https?:\/\//i.test(photoPath)
  ) {
    return;
  }

  const { error } =
    await supabase.storage
      .from(BUCKET)
      .remove([photoPath]);

  if (error) {
    console.error(
      "Erreur suppression photo élève :",
      error
    );
  }
}
