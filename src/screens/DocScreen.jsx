// src/screens/DocScreen.jsx
import React, { useState } from 'react';

export default function DocScreen() {
  const [activeTab, setActiveTab] = useState('user'); // 'user' ou 'formateur'
  const [isDevMode, setIsDevMode] = useState(false); // false = Grand Public, true = Dev / Technique

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 pl-24 animate-fadeIn">
      
      {/* EN-TÊTE PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
            📚 Guide & Centre de Support
          </h2>
          <p className="text-[11px] text-indigo-200 font-medium">
            Découvrez le fonctionnement de la plateforme à votre rythme
          </p>
        </div>

        {/* INTERRUPTEUR / SWITCH COULISSANT */}
        <div className="flex items-center gap-3 bg-slate-950/60 p-2 rounded-2xl border border-slate-800 self-stretch md:self-auto justify-between md:justify-start">
          <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${!isDevMode ? 'text-emerald-400' : 'text-slate-500'}`}>
            🍃 Grand Public
          </span>
          
          <button
            onClick={() => setIsDevMode(!isDevMode)}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer ${
              isDevMode ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                isDevMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>

          <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${isDevMode ? 'text-indigo-400' : 'text-slate-500'}`}>
            💻 Développeur
          </span>
        </div>
      </div>

      {/* NAVIGATION INTER-ONGLETS (RESTREINT AUX 2 ONGLETS CORES) */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-2">
        <button 
          onClick={() => setActiveTab('user')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'user' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          👤 Espace Apprenant
        </button>
        <button 
          onClick={() => setActiveTab('formateur')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'formateur' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🧠 Espace Formateur
        </button>
      </div>


      {/* ======================================================== */}
      {/* 👤 CONTENU : ONGLET APPRENANT                            */}
      {/* ======================================================== */}
      {activeTab === 'user' && (
        <div className="space-y-6">
          {/* Bloc Objectif de la Page */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Objectif de ton Espace Apprenant</h4>
              <p className="text-xs text-emerald-900/80 mt-0.5 leading-relaxed">
                C'est ton terrain de jeu ! Cet espace te permet de réaliser tes missions, de gagner des points d'XP pour débloquer les niveaux supérieurs et de collaborer avec tes collègues de classe sur des défis d'équipe.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              
              {/* CONDITION VUE : GRAND PUBLIC */}
              {!isDevMode ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🎒 Mon Portfolio & Mes Missions
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Le portfolio est ton classeur numérique personnel. Il garde en mémoire tout ton historique et classe tes quêtes en 3 catégories simples pour t'aider à te repérer :
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium">
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
                        <strong className="block mb-1">✅ Validées (Vert)</strong> Les missions réussies qui t'ont rapporté des points d'XP.
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
                        <strong className="block mb-1">⏳ En Attente (Orange)</strong> Les défis d'équipe qui attendent que tes coéquipiers déposent leur fichier.
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                        <strong className="block mb-1">🗺️ Restantes (Gris)</strong> Le catalogue des missions que tu n'as pas encore commencées.
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
                      💡 <strong>Astuce Navigation :</strong> Un bouton <em>« Voir dans le jeu ➔ »</em> te permet de sauter instantanément du portfolio vers la bonne case de ton parcours pour ouvrir la quête voulue.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🧗 Recharger mes cours & Gravir les Niveaux
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Au démarrage, ton formateur te transmettra un code unique (ex: <code>ORANGE-LILLE-26</code>). Saisis-le dans ton profil pour charger ton arbre de compétences.
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Le passage des Paliers :</strong> Ton parcours est découpé en étages bloqués. Pour franchir un palier et cliquer sur <em>« Palier suivant ➔ »</em>, tu dois accumuler assez d'XP grâce à tes missions validées. Le jeu calcule automatiquement si ton score est suffisant !
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🤝 Le mode Co-op (Travail d'Équipe)
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Certaines quêtes portent le macaron collaboratif. Pour les réussir, vous devez déposer <strong>le même fichier joint</strong> avec tes partenaires. Dès que le dernier membre de l'équipe dépose le document, le système valide la mission en même temps pour tout le monde et distribue l'XP !
                    </p>
                  </div>
                </div>
              ) : (
                /* CONDITION VUE : DÉVELOPPEUR (TECHNIQUE) */
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">📂</span> 1. Système de Portfolio & Décodage
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Le portfolio centralise l'historique de la table <code className="font-mono text-purple-700 font-bold">productions</code>. Le contenu stocké au format JSON est décodé à la volée pour restituer le texte original soumis.
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                      <li><strong>Tri-Blocs :</strong> Filtrage par statuts : `validated` (octroi des XP), `pending` (bloqué par verrou de co-dépôt avec animation pulse CSS) et catalogue restants (hors table productions).</li>
                      <li><strong>Justificatifs :</strong> Parsing des chaînes Base64 / URL injectées dans la colonne `file_url`.</li>
                      <li><strong>Navigation Inter-Onglets :</strong> Calcul matriciel via `floorId` pour re-router l'utilisateur vers l'arbre ciblé avec pré-ouverture d'un modal quête.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">🌳</span> 2. Synchronisation Supabase & Règles d'XP
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Persistance de l'état d'avancement des utilisateurs à travers les colonnes de profils.
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                      <li><strong>Multi-Sessions :</strong> Sauvegarde dans le tableau JSONB <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">session_codes</code> de la table `profiles` (conversion automatique en MAJ).</li>
                      <li><strong>Champ <code>unlocked_floors</code> :</strong> Objet clé-valeur associant <code className="text-amber-700">"tree_uuid": max_floor_index_integ</code>.</li>
                      <li><strong>Calculateur de Verrou :</strong> Formule stricte bloquant la transition d'étage : <code className="font-mono bg-slate-800 text-slate-200 text-[10px] px-1 rounded">Score Actuel Validé &lt; (300 XP × IndexPalierSuivant)</code>.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">🤝</span> 3. Algorithme Double Dépôt Réseau
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Moteur de synchronisation synchrone pour les missions collaboratives.
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                      <li><strong>Génération de Signature :</strong> Hash unique basé sur <code className="text-[10px] bg-slate-100 px-1 font-mono">quest_id + session_code + clean_file_name</code>.</li>
                      <li><strong>Résolution de Conflit :</strong> Le premier dépôt configure l'entrée sur `pending`. Au $N$-ième dépôt (vérification du paramètre `required_partners` de la quête), une requête globale d'update bascule tous les tuples partageant le même hash sur `validated` déclenchant l'XP collective.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* BARRE LATÉRALE - CONTEXTUELLE AU MODE */}
            <div className="space-y-4">
              {!isDevMode ? (
                <div className="bg-emerald-900 text-emerald-100 p-4 rounded-2xl border border-emerald-800 space-y-3 text-xs">
                  <h4 className="font-black uppercase text-[10px] text-emerald-400 tracking-wider">💡 Résumé des règles de score</h4>
                  <ul className="space-y-2 list-inside list-disc text-emerald-200/90">
                    <li>1 Étoile (Facile) = <strong className="text-white">300 XP</strong></li>
                    <li>2 Étoiles (Moyen) = <strong className="text-white">600 XP</strong></li>
                    <li>3 Étoiles (Défi) = <strong className="text-white">900 XP</strong></li>
                  </ul>
                  <p className="text-[11px] text-emerald-300 bg-emerald-950/40 p-2 rounded-xl border border-emerald-800/50">
                    Chaque palier exige d'avoir validé l'équivalent en XP des étages précédents !
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">📊 Schéma BDD Mobilisé</h4>
                  <div className="space-y-2 text-[10px] font-mono">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800">
                      <strong className="text-slate-300">table: profiles</strong>
                      <p className="text-slate-500 mt-0.5">▪ session_codes (jsonb)</p>
                      <p className="text-emerald-400">▪ unlocked_floors (jsonb)</p>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800">
                      <strong className="text-slate-300">table: productions</strong>
                      <p className="text-amber-400 mt-0.5">▪ content (text formaté JSON)</p>
                      <p className="text-slate-500">▪ file_hash (text unique)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* 🧠 CONTENU : ONGLET FORMATEUR                            */}
      {/* ======================================================== */}
      {activeTab === 'formateur' && (
        <div className="space-y-6">
          {/* Bloc Objectif de la Page */}
          <div className="bg-purple-50 border border-purple-200 text-purple-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-800">Objectif de ton Espace Formateur (Studio)</h4>
              <p className="text-xs text-purple-900/80 mt-0.5 leading-relaxed">
                C'est votre tour de contrôle pédagogique. Cet outil vous donne la main pour imaginer de nouveaux exercices, assembler vos paliers de cours, ouvrir des classes d'élèves et valider les travaux reçus.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              
              {/* CONDITION VUE : GRAND PUBLIC */}
              {!isDevMode ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🎨 Créer et Configurer une Mission
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Depuis le catalogue de quêtes, vous pouvez rédiger l'énoncé d'une mission. Vous déterminez sa thématique globale (Environnement, RSE, Technique) ainsi que son niveau de difficulté (de 1 à 3 étoiles). Le jeu adapte lui-même la récompense d'XP en fonction des étoiles choisies.
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      🔒 <strong>Confidentialité :</strong> Vos quêtes peuvent être laissées en mode <code>private</code> (visibles par vous seul) ou partagées en mode <code>public</code> avec les autres enseignants de votre établissement.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🌲 Structurer l'Arbre des Niveaux
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      L'éditeur visuel vous permet de construire le parcours de formation. Vous créez des étages successifs (Palier 1, Palier 2, etc.) puis vous insérez dans chaque étage les missions que vous venez de créer dans votre catalogue. Cliquez sur la disquette de sauvegarde 💾 pour figer le parcours de vos classes.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🏫 Ouvrir un Code Classe & Corriger les Copies
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pour accueillir des élèves, créez une session. Cela génère un mot-clé unique (ex: <code>LILLE-RESEAU-2026</code>) lié au parcours choisi. 
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Le panneau de monitoring vous affiche en continu les textes et documents déposés par votre groupe. Vous conservez à tout moment le droit de forcer la validation d'un élève pour l'aider à avancer s'il commet une erreur de fichier.
                    </p>
                  </div>
                </div>
              ) : (
                /* CONDITION VUE : DÉVELOPPEUR (TECHNIQUE) */
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">🧠</span> 1. Usine de Quêtes & Droits d'Accès
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Gestion CRUD de la table <code className="font-mono text-purple-700">quests</code>. 
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                      <li><strong>Règle d'XP Métier :</strong> Index de difficulté couplé à un multiplicateur d'XP côté client (<code className="text-pink-600 font-mono">difficulty * 300</code>).</li>
                      <li><strong>Drapeaux Coopératifs :</strong> Injection de <code className="text-slate-800 font-mono font-bold">is_collaborative (bool)</code> et configuration de l'entier <code className="text-slate-800 font-mono font-bold">required_partners (int)</code>.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">🌲</span> 2. Sérialisation JSONB de l'Arborescence
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      L'ordonnanceur d'arbre gère la structure relationnelle de la table <code className="font-mono text-amber-700 font-bold">trees</code>.
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                      <li><strong>Persistance :</strong> Sauvegarde synchrone qui transforme l'état des composants UI en un tableau d'objets standardisé injecté dans le champ JSONB <code className="text-indigo-600 font-mono">floors</code>.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">🔗</span> 3. Tables Transverses (Permissions & Monitoring)
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Gestion des jointures utilisateur et délégation de droits d'administration.
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                      <li><strong>Shared Permissions :</strong> L'invitation d'un formateur tiers génère un enregistrement dans <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">shared_permissions</code> (mapping via `entity_id` et `shared_with_id`).</li>
                      <li><strong>Bypass Admin :</strong> Outils de modification d'état forcé agissant directement sur le champ `status` de la ligne de production de l'étudiant ciblé.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* BARRE LATÉRALE - CONTEXTUELLE AU MODE */}
            <div className="space-y-4">
              {!isDevMode ? (
                <div className="bg-purple-900 text-purple-100 p-4 rounded-2xl border border-purple-800 space-y-2 text-xs">
                  <h4 className="font-black uppercase text-[10px] text-purple-400 tracking-wider">🔒 Partage entre collègues</h4>
                  <p className="text-purple-200 leading-relaxed">
                    Si un collègue a besoin d'utiliser un de vos parcours privés, utilisez la fonction d'invitation par mail pour lui déléguer des droits de lecture sans rendre votre travail public pour toute la plateforme.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-black text-purple-400 uppercase text-[11px] tracking-wider">🗄️ Modèle de Données Studio</h4>
                  <div className="space-y-2 text-[10px] font-mono">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800">
                      <strong className="text-purple-400">table: quests</strong>
                      <p className="text-slate-400 mt-0.5">▪ owner_id (uuid)</p>
                      <p className="text-slate-400">▪ visibility ('private' | 'public')</p>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800">
                      <strong className="text-pink-400">table: shared_permissions</strong>
                      <p className="text-slate-400 mt-0.5">▪ entity_type (text)</p>
                      <p className="text-slate-400">▪ shared_with_id (uuid)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
