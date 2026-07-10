// src/screens/DocScreen.jsx
import React, { useState } from 'react';

export default function DocScreen() {
  const [activeTab, setActiveTab] = useState('user'); // 'user', 'formateur', 'drh', 'admin', 'bdd'
  const [isDevMode, setIsDevMode] = useState(false); // false = Grand Public, true = Dev / Technique

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 pl-24 animate-fadeIn">
      
      {/* EN-TÊTE PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
            📚 Centre de Documentation & Guides
          </h2>
          <p className="text-[11px] text-indigo-200 font-medium">
            Cartographie des fonctionnalités, guides utilisateurs et architecture de données
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

      {/* NAVIGATION PRINCIPALE DE LA DOCUMENTATION (LES 5 ONGLETS) */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-2">
        <button 
          onClick={() => setActiveTab('user')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'user' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          👤 Apprenant (User)
        </button>
        <button 
          onClick={() => setActiveTab('formateur')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'formateur' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🧠 Formateur (Studio)
        </button>
        <button 
          onClick={() => setActiveTab('drh')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'drh' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          💼 Espace DRH / Client
        </button>
        <button 
          onClick={() => setActiveTab('admin')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'admin' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ⚡ Super Admin
        </button>
        <button 
          onClick={() => setActiveTab('bdd')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'bdd' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🗄️ Architecture BDD
        </button>
      </div>


      {/* ======================================================== */}
      {/* 👤 CONTENU : 1. APPRENANT (USER)                         */}
      {/* ======================================================== */}
      {activeTab === 'user' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Objectif de l'Espace Apprenant</h4>
              <p className="text-xs text-emerald-900/80 mt-0.5 leading-relaxed">
                Permettre à l'élève de s'engager de manière autonome dans son parcours gamifié. Cet espace centralise la complétion des quêtes, le déblocage dynamique des paliers par calcul d'XP, la soumission de justificatifs et le suivi collaboratif via le moteur de co-dépôt en temps réel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              {!isDevMode ? (
                /* VUE GRAND PUBLIC */
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
                      Au démarrage, saisissez le code unique transmis par votre formateur. L'association se fait automatiquement et charge votre arbre de compétences personnalisé.
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Le passage des Paliers :</strong> Ton parcours est découpé en étages bloqués. Pour franchir un palier et cliquer sur <em>« Palier suivant ➔ »</em>, tu dois accumuler assez d'XP grâce à tes missions validées. Le jeu calcule si ton score actuel est suffisant.
                    </p>
                  </div>
                </div>
              ) : (
                /* VUE DÉVELOPPEUR */
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">📂</span> 1. Système de Portfolio & Hub de Suivi Clean
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Le portfolio centralise l'intégralité de l'historique des productions de l'élève. Le contenu brut stocké en base de données au format JSON est décodé à la volée.
                    </p>
                    <ul className="space-y-2 text-xs text-slate-600 pl-1">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✔</span>
                        <span><strong>Architecture Tri-Blocs :</strong> Séparation étanche entre les quêtes <strong>Validées</strong> (Vert - octroi des XP), les quêtes <strong>En Attente</strong> (Ambre - bloquées par le Double Dépôt Réseau avec animation CSS pulse) et le <strong>Catalogue Restant</strong> (Ardoise).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✔</span>
                        <span><strong>Gestion des Justificatifs :</strong> Injection et décodage d'un lien de téléchargement direct (`📁 Ouvrir la pièce jointe`) basé sur la chaîne de données Base64 / URL présente dans la table `productions`.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">🎯</span>
                        <span><strong>Navigation Inter-Onglets :</strong> Le bouton <em>« Voir dans le jeu ➔ »</em> scanne les sessions de l'apprenant, détecte l'arbre associé, calcule l'index exact du palier (`floorId`), rebascule l'élève sur l'onglet Parcours et pré-ouvre la quête cible.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">🌳</span> 2. Sessions & Progression Persistante Supabase
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-600 pl-1">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✔</span>
                        <span><strong>Rattachement Multi-Sessions :</strong> Formulaire d'entrée avec mise en majuscules automatique. L'association écrit dans la colonne `session_codes` (JSONB) de la table `profiles`.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✔</span>
                        <span><strong>Colonne Native `unlocked_floors` :</strong> Stockage structuré de la progression sous forme d'objet clé-valeur associant l'ID de l'arbre à l'index maximum débloqué par l'élève : {`{ "tree_uuid_1": 2, "tree_uuid_2": 0 }`}.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✔</span>
                        <span><strong>Déblocage de Palier à Conditions :</strong> Calcul mathématique strict de la somme des points XP accumulés **uniquement via les quêtes validées**. Le bouton « Palier suivant ➔ » reste verrouillé tant que le score actuel est inférieur à la formule : 300 XP × IndexPalierSuivant.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {isDevMode ? (
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">📊 Schéma BDD Mobilisé</h4>
                  <div className="space-y-2 text-[11px] font-mono">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800">
                      <strong className="text-slate-300">table: profiles</strong>
                      <p className="text-slate-500 text-[10px] mt-0.5">▪ session_codes (jsonb)</p>
                      <p className="text-emerald-400 text-[10px]">▪ unlocked_floors (jsonb)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-900 text-emerald-100 p-4 rounded-2xl border border-emerald-800 text-xs space-y-2">
                  <h4 className="font-black uppercase text-[10px] text-emerald-400 tracking-wider">💡 Guide des Étoiles</h4>
                  <p>1★ = 300 XP • 2★ = 600 XP • 3★ = 900 XP</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* 🧠 CONTENU : 2. FORMATEUR (STUDIO)                        */}
      {/* ======================================================== */}
      {activeTab === 'formateur' && (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 text-purple-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-800">Objectif de l'Espace Formateur (Studio)</h4>
              <p className="text-xs text-purple-900/80 mt-0.5 leading-relaxed">
                Fournir une boîte à outils de conception et d'ingénierie pédagogique. Cet écran permet aux formateurs d'éditer le catalogue d'exercices, d'agencer visuellement l'arbre des paliers, d'instancier des codes classes (sessions de cours) et de monitorer/valider manuellement les rendus d'élèves.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              {!isDevMode ? (
                /* VUE GRAND PUBLIC */
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🎨 Créer et Configurer une Mission
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Depuis le catalogue de quêtes, vous pouvez rédiger l'énoncé d'une mission. Vous déterminez sa thématique globale (Environnement, RSE, Technique) ainsi que son niveau de difficulté (de 1 à 3 étoiles). Le jeu adapte lui-même la récompense d'XP.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🌲 Structurer l'Arbre des Niveaux
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      L'éditeur visuel vous permet de construire le parcours de formation. Vous créez des étages successifs (Palier 1, Palier 2, etc.) puis vous insérez dans chaque étage les missions correspondantes.
                    </p>
                  </div>
                </div>
              ) : (
                /* VUE DÉVELOPPEUR */
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">🧠</span> 1. Gestion & Conception des Quêtes (Le Catalogue)
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-600 pl-1">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">✔</span>
                        <span><strong>Formulaire de Création :</strong> Saisie du nom, description, thématique (tag coloré) et difficulté (1★ à 3★) qui calibre automatiquement le barème d'XP (Difficulté × 300 XP).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">✔</span>
                        <span><strong>Configuration Réseau Co-op :</strong> Activation du drapeau <code className="bg-slate-100 px-1 rounded text-pink-600 font-mono">is_collaborative</code> et définition du seuil de coéquipiers requis via <code className="bg-slate-100 px-1 rounded text-pink-600 font-mono">required_partners</code>.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="text-base">🌲</span> 2. Éditeur d'Arbre Augmenté & Paliers
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Interface visuelle d'ordonnancement pour structurer la progression pédagogique des parcours : injection directe des UUIDs au sein de la structure JSONB <code className="bg-slate-100 px-1 rounded text-amber-700 font-mono">floors</code> de la table <code className="text-purple-700 font-bold">trees</code>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {isDevMode && (
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-black text-purple-400 uppercase text-[11px] tracking-wider">🗄️ Modèle de Données Studio</h4>
                  <div className="space-y-2 text-[10px] font-mono">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800">
                      <strong className="text-purple-400">table: quests</strong>
                      <p className="text-slate-400 mt-0.5">▪ is_collaborative (bool)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* 💼 CONTENU : 3. DRH / CLIENT                             */}
      {/* ======================================================== */}
      {activeTab === 'drh' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-800">Objectif de l'Espace DRH / Client</h4>
              <p className="text-xs text-blue-900/80 mt-0.5 leading-relaxed">
                Fournir aux donneurs d'ordres, managers RSE et responsables de comptes une console analytique en lecture seule. Cet espace permet de mesurer le ROI de la formation en suivant les volumes d'XP générés, les taux de complétion par équipe et de consulter les livrables finaux sans aucun risque d'altération des données.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="text-base">💼</span> Console Analytique d'Entreprise
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Destiné aux commanditaires des formations (DRH, Managers RSE), cet écran offre une vision macro et analytique de la progression des collaborateurs sans droit d'édition.
                </p>
                {isDevMode && (
                  <p className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    🔒 Sécurité : Lecture analytique pure, isolation stricte via clauses RLS pour éviter tout effet de bord d'écriture.
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {isDevMode && (
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 text-xs">
                  <h4 className="font-black text-blue-400 uppercase text-[11px]">🔐 Restriction RLS & Rôles</h4>
                  <p className="text-slate-400 font-mono text-[10px] leading-tight mt-1">
                    Les profils possédant le rôle <code className="text-blue-300">"client"</code> sont rattachés aux sessions via le champ <code className="text-slate-300">drh_ids</code> (JSONB).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* ⚡ CONTENU : 4. SUPER ADMIN                              */}
      {/* ======================================================== */}
      {activeTab === 'admin' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-red-50 border border-red-200 text-red-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-800">Objectif de l'Espace Super Admin</h4>
              <p className="text-xs text-red-900/80 mt-0.5 leading-relaxed">
                Garantir la maintenance technique, le support de niveau 3 et le diagnostic en conditions réelles. L'outil d'impersonation permet d'infiltrer le compte d'un élève ou formateur pour debugger un blocage d'XP, nettoyer un historique défaillant ou ajuster manuellement les lignes de progression.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="text-base">⚡</span> Système d'Infiltration & Supervision Globale
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Le panneau d'administration suprême permet de piloter la plateforme de bout en bout et de diagnostiquer les incidents en situation réelle.
                </p>
                {isDevMode && (
                  <p className="text-[11px] font-mono text-red-700 bg-red-50/50 p-2 rounded-lg border border-red-100">
                    🛠️ <strong>Mécanique d'Impersonation :</strong> Substitution temporaire des variables globales de session JWT pour simuler l'état local exact d'un UID utilisateur.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* 🗄️ CONTENU : 5. ARCHITECTURE BASE DE DONNÉES             */}
      {/* ======================================================== */}
      {activeTab === 'bdd' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Objectif de la Cartographie Relationnelle BDD</h4>
              <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                Fournir le dictionnaire de données et les spécifications techniques de l'infrastructure Supabase. Cet onglet détaille les types PostgreSQL natifs, les contraintes de clés (PK/FK/UK), les valeurs par défaut et la modélisation des objets complexes JSONB.
              </p>
            </div>
          </div>
          
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="text-slate-700 font-bold font-sans">🎨 Code Couleur des Types :</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 inline-block"></span><span className="text-purple-700 font-bold">uuid</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block"></span><span className="text-blue-700 font-bold">text</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block"></span><span className="text-amber-700 font-bold">jsonb</span></span>
          </div>

          {/* TABLEAU COMPLET SCHÉMA POSTGRES */}
          <div className="bg-white border border-slate-300 rounded-3xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="p-3 pl-4 w-1/5">Table</th>
                    <th className="p-3 w-1/5">Colonne</th>
                    <th className="p-3 w-1/5">Type PostgreSQL</th>
                    <th className="p-3 text-center w-32">Null Accepté</th>
                    <th className="p-3 pr-4">Valeur par défaut / Contraintes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 bg-gradient-to-r from-slate-900 to-slate-800">📂 TABLE : productions</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">productions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-amber-700 font-bold">content</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">Contenu JSON stringifié</td></tr>
                  
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">👤 TABLE : profiles</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">profiles</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">PK / Link Auth.users</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-emerald-600 font-bold">unlocked_floors</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-purple-600 font-bold">'{"{}"}'::jsonb</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
