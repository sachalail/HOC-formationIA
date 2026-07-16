// src/utils/validator.js

/**
 * ÉTAPE 1 : Analyse statistique locale (Détection de charabia / répétitions)
 * @param {string} text 
 * @returns {{isValid: boolean, reason?: string}}
 */
function checkGibberishAndNgrams(text) {
  const cleanText = text.trim().toLowerCase();
  
  if (cleanText.length < 10) {
    return { isValid: false, reason: "Le rendu est trop court pour être analysé (minimum 10 caractères)." };
  }

  // 1. Détection de caractères répétés anormalement (ex: aaaaaa, fff, zzz)
  const repetitionRegex = /([a-z])\1{3,}/g; // 4 fois la même lettre d'affilée
  if (repetitionRegex.test(cleanText)) {
    return { isValid: false, reason: "Répétitions de caractères suspectes détectées." };
  }

  // 2. Ratio voyelles/consonnes (dans une vraie langue, il est équilibré, généralement entre 25% et 65% de voyelles)
  const letters = cleanText.replace(/[^a-zâäàéèùêëîïôöûü]/g, '');
  if (letters.length > 0) {
    const vowels = letters.match(/[aeiouyâäàéèùêëîïôöûü]/g) || [];
    const vowelRatio = vowels.length / letters.length;
    if (vowelRatio < 0.20 || vowelRatio > 0.70) {
      return { isValid: false, reason: "Structure linguistique incohérente (ratio voyelles/consonnes anormal)." };
    }
  }

  // 3. Détection de keyboard-smashing typique (consonnes impossibles en français)
  const suspectTrigrams = /(qsd|dfg|fzf|vzz|xcv|vvv|zzz|fgh|qsp)/g;
  if (suspectTrigrams.test(cleanText)) {
    return { isValid: false, reason: "Combinaisons de touches suspectes détectées." };
  }

  return { isValid: true };
}

/**
 * ÉTAPE 2 : Dictionnaire et taux de mots valides
 * @param {string} text 
 * @returns {{isValid: boolean, ratio: number, reason?: string}}
 */
function checkDictionaryRatio(text) {
  // Mini dictionnaire des mots de structure et mots hyper fréquents en français (environ 100 mots outils)
  const frenchCommonWords = new Set([
    "le", "la", "les", "de", "des", "un", "une", "et", "en", "que", "est", "une", "pour", "dans", "plus", 
    "ce", "cette", "ces", "qui", "avec", "tout", "aux", "sur", "mais", "pas", "nous", "vous", "ils", "elles",
    "je", "tu", "il", "elle", "on", "faire", "fait", "mon", "ma", "mes", "votre", "notre", "leur", "leurs",
    "y", "ou", "où", "par", "dans", "sans", "sous", "bien", "très", "avec", "comme", "alors", "donc", "si",
    "quand", "depuis", "pendant", "après", "avant", "être", "avoir", "aller", "pouvoir", "vouloir", "devoir",
    "projet", "analyse", "action", "impact", "solution", "équipe", "travail", "client", "entreprise", "stratégie"
  ]);

  // Découpage en mots (on enlève la ponctuation)
  const words = text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1); // on ignore les lettres isolées sauf exceptions

  if (words.length === 0) {
    return { isValid: false, ratio: 0, reason: "Aucun mot identifiable." };
  }

  // Calcul du taux de mots connus/cohérents
  let knownCount = 0;
  words.forEach(word => {
    // Si le mot est dans notre liste commune OU s'il respecte une règle de morphologie française simple 
    // (par exemple, pas de suites de 4 consonnes de suite et terminaisons courantes comme -er, -é, -ment, -ation, -s, -e)
    const isCommon = frenchCommonWords.has(word);
    const hasCoherentStructure = !/[bcdfghjklmnpqrstvwxz]{4,}/.test(word); // pas de bloc de 4 consonnes
    
    if (isCommon || hasCoherentStructure) {
      knownCount++;
    }
  });

  const ratio = knownCount / words.length;

  // Si moins de 70% des mots ont une structure cohérente ou sont connus
  if (ratio < 0.70) {
    return { isValid: false, ratio, reason: "Trop de mots inexistants ou mal orthographiés détectés." };
  }

  return { isValid: true, ratio };
}

/**
 * ÉTAPE 3 : Analyse sémantique & LLM (Appel API de complétion)
 * @param {string} content - Le texte soumis par l'étudiant
 * @param {object} quest - Les informations de la quête (nom, description, consignes attendues)
 * @returns {Promise<{score: number, feedback: string, reasons: string[]}>}
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
    // Exemple d'appel Supabase Edge Function ou d'API directement (OpenAI / Gemini / Mistral)
    // À adapter selon la clé ou l'Edge Function que vous utilisez
    const { data, error } = await supabase.functions.invoke('grade-submission', {
      body: { prompt }
    });

    if (error) throw error;
    return data; // Attend un retour de type { score, feedback, pointsDAmelioration }

  } catch (err) {
    console.error("Erreur lors de l'appel à l'IA pour la notation :", err);
    
    // Système de secours (Fallback) basique si l'IA ne répond pas
    const fallbackScore = Math.min(100, Math.round(content.length / 10)); // Score au prorata de la longueur
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
 * FONCTION PRINCIPALE DE VALIDATION ET NOTATION (Pipeline complet en 3 étapes)
 * @param {string} content - Rendu de l'étudiant
 * @param {object} quest - Quête en cours d'évaluation ({ name, desc })
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

  // Étape 1 : Filtre de charabia
  const step1 = checkGibberishAndNgrams(content);
  if (!step1.isValid) {
    return {
      isValid: false,
      score: 0,
      feedback: `Validation refusée : ${step1.reason}`,
      reasons: [step1.reason]
    };
  }

  // Étape 2 : Filtre de dictionnaire / mots valides
  const step2 = checkDictionaryRatio(content);
  if (!step2.isValid) {
    return {
      isValid: false,
      score: 0,
      feedback: `Validation refusée : ${step2.reason}`,
      reasons: [step2.reason]
    };
  }

  // Étape 3 : Évaluation intelligente et notation par IA
  const evaluation = await callLLMForGradingAndCoaching(content, quest);

  return {
    isValid: evaluation.score >= 50, // Seuil de réussite à 50/100 par exemple
    score: evaluation.score,
    feedback: evaluation.feedback,
    reasons: evaluation.pointsDAmelioration || []
  };
}