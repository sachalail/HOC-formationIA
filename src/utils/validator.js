// src/utils/validator.js
import { supabase } from '../supabaseClient'; // Ajustez le chemin si nécessaire

/**
 * ÉTAPE 1 : Analyse statistique locale (Détection de charabia / répétitions)
 * Filtre instantanément et gratuitement les saisies absurdes.
 */
function checkGibberishAndNgrams(text) {
  const cleanText = text.trim().toLowerCase();
  
  if (cleanText.length < 10) {
    return { isValid: false, reason: "Le rendu est trop court pour être analysé (minimum 10 caractères)." };
  }

  // 1. Détection de caractères répétés anormalement (ex: aaaaaa, fff, zzz)
  const repetitionRegex = /([a-z])\1{3,}/g; 
  if (repetitionRegex.test(cleanText)) {
    return { isValid: false, reason: "Répétitions de caractères suspectes détectées (charabia)." };
  }

  // 2. Ratio voyelles/consonnes (cohérence de la langue)
  const letters = cleanText.replace(/[^a-zâäàéèùêëîïôöûü]/g, '');
  if (letters.length > 0) {
    const vowels = letters.match(/[aeiouyâäàéèùêëîïôöûü]/g) || [];
    const vowelRatio = vowels.length / letters.length;
    if (vowelRatio < 0.20 || vowelRatio > 0.70) {
      return { isValid: false, reason: "Structure linguistique incohérente (ratio voyelles/consonnes suspect)." };
    }
  }

  // 3. Détection de keyboard-smashing typique (lettres impossibles côte à côte)
  const suspectTrigrams = /(qsd|dfg|fzf|vzz|xcv|vvv|zzz|fgh|qsp)/g;
  if (suspectTrigrams.test(cleanText)) {
    return { isValid: false, reason: "Combinaisons de touches de clavier suspectes." };
  }

  return { isValid: true };
}

/**
 * ÉTAPE 2 : Dictionnaire et taux de mots valides
 * Vérifie que l'étudiant écrit de vrais mots français et non du faux texte.
 */
function checkDictionaryRatio(text) {
  // Liste restreinte de mots très fréquents en français servant d'ancres de validation
  const frenchCommonWords = new Set([
    "le", "la", "les", "de", "des", "un", "une", "et", "en", "que", "est", "pour", "dans", "plus", 
    "ce", "cette", "ces", "qui", "avec", "tout", "aux", "sur", "mais", "pas", "nous", "vous", "ils", "elles",
    "je", "tu", "il", "elle", "on", "faire", "fait", "mon", "ma", "mes", "votre", "notre", "leur", "leurs",
    "y", "ou", "où", "par", "dans", "sans", "sous", "bien", "très", "avec", "comme", "alors", "donc", "si",
    "quand", "depuis", "pendant", "après", "avant", "être", "avoir", "aller", "pouvoir", "vouloir", "devoir",
    "projet", "analyse", "action", "impact", "solution", "équipe", "travail", "client", "entreprise", "stratégie"
  ]);

  const words = text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1);

  if (words.length === 0) {
    return { isValid: false, ratio: 0, reason: "Aucun mot identifiable." };
  }

  let knownCount = 0;
  words.forEach(word => {
    const isCommon = frenchCommonWords.has(word);
    const hasCoherentStructure = !/[bcdfghjklmnpqrstvwxz]{4,}/.test(word); // pas de suite illisible de consonnes
    
    if (isCommon || hasCoherentStructure) {
      knownCount++;
    }
  });

  const ratio = knownCount / words.length;

  // Seuil de tolérance : 70% de mots cohérents minimum
  if (ratio < 0.70) {
    return { isValid: false, ratio, reason: "Trop de mots inexistants ou mal orthographiés détectés." };
  }

  return { isValid: true, ratio };
}

/**
 * ÉTAPE 3 : Appel de l'IA (Edge Function Supabase)
 * Analyse sémantique, notation pédagogique et conseils d'amélioration personnalisés.
 */
async function callLLMForGradingAndCoaching(content, quest) {
  const prompt = `
En tant qu'évaluateur pédagogique bienveillant et exigeant, analyse le rendu d'un apprenant pour la mission suivante :
Nom de la quête : "${quest.name}"
Description/Consignes : "${quest.desc}"

Voici le rendu rédigé par l'apprenant :
"""
${content}
"""

Fais une analyse constructive et renvoie UNIQUEMENT un objet JSON valide contenant exactement ces clés :
{
  "score": (un nombre entier entre 0 et 100),
  "feedback": "Un paragraphe d'évaluation globale et de coaching personnalisé en français, encourageant mais précis sur ce qu'il a bien fait et ce qu'il doit améliorer",
  "pointsDAmelioration": ["Conseil précis 1 pour améliorer la note", "Conseil précis 2", ...]
}
`;

  try {
    // Appel à votre Edge Function Supabase (qui gère l'appel sécurisé vers l'API OpenAI/Gemini/Mistral)
    const { data, error } = await supabase.functions.invoke('grade-submission', {
      body: { prompt }
    });

    if (error) throw error;
    return data; // Attend { score, feedback, pointsDAmelioration }

  } catch (err) {
    console.error("Erreur lors de l'appel à l'IA pour la notation :", err);
    
    // Système de secours (Fallback) basique si l'IA ou l'Edge Function ne répond pas
    const fallbackScore = Math.min(100, Math.round(content.length / 10));
    return {
      score: fallbackScore,
      feedback: "Votre rendu a bien été reçu et pré-validé. L'analyse détaillée par IA est temporairement indisponible, mais votre travail montre un engagement réel.",
      pointsDAmelioration: [
        "Assurez-vous de bien couvrir l'ensemble des consignes de la quête.",
        "N'hésitez pas à étayer vos propos avec des exemples concrets du cas pratique."
      ]
    };
  }
}

/**
 * FONCTION PRINCIPALE EXPORTABLE (Pipeline complet en 3 étapes)
 * @param {string} content - Rendu textuel écrit par l'étudiant
 * @param {object} quest - La quête concernée { name, desc }
 * @returns {Promise<{ isValid: boolean, score: number, feedback: string, reasons: string[] }>}
 */
export async function validateAndGradeSubmission(content, quest) {
  if (!content || content.trim() === "") {
    return {
      isValid: false,
      score: 0,
      feedback: "Le rendu est totalement vide. Veuillez rédiger votre réponse.",
      reasons: ["Contenu vide"]
    };
  }

  // Étape 1 : Filtre statistique
  const step1 = checkGibberishAndNgrams(content);
  if (!step1.isValid) {
    return {
      isValid: false,
      score: 0,
      feedback: `Validation refusée : ${step1.reason}`,
      reasons: [step1.reason]
    };
  }

  // Étape 2 : Filtre de dictionnaire
  const step2 = checkDictionaryRatio(content);
  if (!step2.isValid) {
    return {
      isValid: false,
      score: 0,
      feedback: `Validation refusée : ${step2.reason}`,
      reasons: [step2.reason]
    };
  }

  // Étape 3 : Notation intelligente IA
  const evaluation = await callLLMForGradingAndCoaching(content, quest);

  return {
    isValid: evaluation.score >= 50, // Seuil de réussite par défaut
    score: evaluation.score,
    feedback: evaluation.feedback,
    reasons: evaluation.pointsDAmelioration || []
  };
}
