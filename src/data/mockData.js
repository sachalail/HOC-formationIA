// src/data/mockData.js

// 1. Banque globale de quêtes enrichie de la propriété
export const questDatabase = [
  { id: "soc_1", name: "Analyse d'Accord", theme: "social", difficulty: 1, isBoss: false, isMiniboss: false, desc: "Isoler et analyser les 3 points structurants d'un projet d'accord d'entreprise sur le télétravail généré par IA.", ownerId: "global", sharing: { type: "global", allowedUsers: [] } },
  { id: "soc_2", name: "Traducteur RH", theme: "social", difficulty: 1, isBoss: false, isMiniboss: false, desc: "Traduire et vulgariser les acronymes complexes présents dans un plan de réorganisation d'effectifs.", ownerId: "global", sharing: { type: "global", allowedUsers: [] } },
  { id: "soc_5", name: "Grille de Salaire", theme: "social", difficulty: 3, isBoss: false, isMiniboss: false, desc: "Générer une formule comparative des écarts de rémunération H/F sans divulguer de données de l'entreprise.", ownerId: "formateur_eloi", sharing: { type: "private", allowedUsers: ["formateur_eloi"] } },
  { id: "boss_5", name: "BOSS ÉTAPE 5 : Comité d'Approbation", theme: "social", difficulty: 3, isBoss: true, isMiniboss: false, desc: "Défendre son analyse des impacts technologiques face à une simulation d'objections de la direction générale.", ownerId: "global", sharing: { type: "global", allowedUsers: [] } },
  { id: "env_1", name: "Décryptage RSE", theme: "env", difficulty: 1, isBoss: false, isMiniboss: false, desc: "Extraire à l'aide d'un prompt ciblé les engagements chiffrés et indicateurs d'émissions carbone du bilan annuel.", ownerId: "global", sharing: { type: "global", allowedUsers: [] } },
  { id: "env_3", name: "Impact Serveurs", theme: "env", difficulty: 2, isBoss: false, isMiniboss: false, desc: "Évaluer l'empreinte écologique générée par la migration des services serveurs de l'entreprise vers le Cloud public.", ownerId: "global", sharing: { type: "global", allowedUsers: [] } },
  { id: "tech_1", name: "Prompt Secrétariat", theme: "tech", difficulty: 1, isBoss: false, isMiniboss: false, desc: "Créer une trame d'invite standardisée pour structurer automatiquement les ordres du jour complexes.", ownerId: "global", sharing: { type: "global", allowedUsers: [] } },
  { id: "tech_4", name: "Tri des Incidents", theme: "tech", difficulty: 2, isBoss: false, isMiniboss: false, desc: "Classer des flux massifs de pannes ou d'anomalies internes par niveau de critique opérationnelle.", ownerId: "global", sharing: { type: "global", allowedUsers: [] } },
  { id: "mini_p3", name: "MINIBOSS P3 : JUMP TECHNIQUE", theme: "env", difficulty: 2, isBoss: false, isMiniboss: true, desc: "[PROJECTION DIRECTE AU PALIER 5] Soumettre une politique d'achats à un stress-test climatique complet.", ownerId: "global", sharing: { type: "global", allowedUsers: [] } }
];

// 2. Arbres initiaux avec gestion de la propriété et allowedUsers
export const initialTrees = {
  "tree_debutant": {
    id: "tree_debutant",
    name: "Parcours IA Initial (Débutant)",
    ownerId: "global",
    sharing: { type: "global", allowedUsers: [] },
    floors: [
      { floorId: 1, mode: "static", quests: ["soc_1", "env_1"] }, 
      { floorId: 2, mode: "static", quests: ["soc_2", "tech_1"] },
      { floorId: 3, mode: "random", pool: ["env_3", "mini_p3"], count: 1, quests: [] }, 
      { floorId: 4, mode: "static", quests: ["tech_4"] },
      { floorId: 5, mode: "static", quests: ["boss_5"] }
    ]
  },
  "tree_prive_eloi": {
    id: "tree_prive_eloi",
    name: "Mon Arbre Secret RH - Éloi",
    ownerId: "formateur_eloi",
    sharing: { type: "private", allowedUsers: ["formateur_eloi"] },
    floors: [
      { floorId: 1, mode: "static", quests: ["soc_1", "soc_5"] }
    ]
  },
  "tree_partage_lucie": {
    id: "tree_partage_lucie",
    name: "Méthode IA Lucie (Partagée avec Éloi)",
    ownerId: "formateur_lucie",
    sharing: { type: "shared", allowedUsers: ["formateur_lucie", "formateur_eloi"] },
    floors: [
      { floorId: 1, mode: "static", quests: ["tech_1", "tech_4"] }
    ]
  }
};

// 3. Comptes utilisateurs simulés (Pour changer de profil à la volée)
export const initialUsers = [
  { id: "u1", name: "Sacha L. (Apprenant)", currentFloorId: 1, assignedTreeId: "tree_debutant", validatedQuests: [], elo: 0, deliverables: {}, currentSelection: [] }
];

export const simulationFormateurs = [
  { uid: "formateur_eloi", name: "Éloi (Moi)", email: "eloi@orange.fr" },
  { uid: "formateur_lucie", name: "Lucie (Collègue)", email: "lucie@orange.fr" },
  { uid: "formateur_jean", name: "Jean (Nouvel arrivant)", email: "jean@orange.fr" }
];

// 4. Liste simulée des invitations en attente
export const initialInvitations = [
  { id: "inv_1", treeId: "tree_partage_lucie", treeName: "Méthode IA Lucie", senderId: "formateur_lucie", senderName: "Lucie", receiverId: "formateur_eloi", status: "pending" }
];