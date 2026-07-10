// src/screens/DocScreen.jsx
import React, { useState } from 'react';

export default function DocScreen() {
  const [activeTab, setActiveTab] = useState('user'); // 'user', 'formateur', 'drh', 'admin', 'bdd'
  const [isDevMode, setIsDevMode] = useState(false); // false = Public (Version simplifiée), true = Dev (Technique)
  
  // États de simulation interactive pour les formulaires reproduits
  const [simulatedQuestName, setSimulatedQuestName] = useState('Éco-gestes au bureau');
  const [simulatedQuestTheme, setSimulatedQuestTheme] = useState('env');
  const [simulatedQuestType, setSimulatedQuestType] = useState('normal');
  const [simulatedIsCollab, setSimulatedIsCollab] = useState(true);
  const [simulatedPartners, setSimulatedPartners] = useState(3);
  const [simulatedSessionCode, setSimulatedSessionCode] = useState('AIRBUS-LILLE-26');
  const [simulatedLivrable, setSimulatedLivrable] = useState('Livrable_Groupe4_RSE.pdf');
  const [showFormPreview, setShowFormPreview] = useState(null); // 'quest', 'session', 'livrable' ou null

  // Désactive l'onglet BDD si l'utilisateur quitte le mode Dev
  const toggleDevMode = () => {
    const nextDevMode = !isDevMode;
    setIsDevMode(nextDevMode);
    if (!nextDevMode && activeTab === 'bdd') {
      setActiveTab('user');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 pl-24 animate-fadeIn">
      
      {/* EN-TÊTE PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
            📚 Centre de Documentation & Spécifications
          </h2>
          <p className="text-[11px] text-indigo-200 font-medium">
            Cartographie des fonctionnalités, guides utilisateurs et architecture de la base de données
          </p>
        </div>

        {/* INTERRUPTEUR : Public // Dev */}
        <div className="flex items-center gap-3 bg-slate-950/60 p-2 rounded-2xl border border-slate-800 self-stretch md:self-auto justify-between md:justify-start">
          <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${!isDevMode ? 'text-emerald-400' : 'text-slate-500'}`}>
            🍃 Public
          </span>
          
          <button
            onClick={toggleDevMode}
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
            💻 Dev
          </span>
        </div>
      </div>

      {/* NAVIGATION PRINCIPALE */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-2">
        <button 
          onClick={() => setActiveTab('user')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'user' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          👤 Apprenant (StudentDashboard)
        </button>
        <button 
          onClick={() => setActiveTab('formateur')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'formateur' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🧠 Formateur (StudioScreen)
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

        {/* N'apparaît que si Dev Mode est activé */}
        {isDevMode && (
          <button 
            onClick={() => setActiveTab('bdd')} 
            className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer animate-fadeIn ${
              activeTab === 'bdd' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-amber-600 font-extrabold'
            }`}
          >
            🗄️ Architecture BDD
          </button>
        )}
      </div>


      {/* ======================================================== */}
      {/* 👤 CONTENU : 1. APPRENANT (StudentDashboardScreen)       */}
      {/* ======================================================== */}
      {activeTab === 'user' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Objectif de l'Espace Apprenant</h4>
              <p className="text-xs text-emerald-900/80 mt-0.5 leading-relaxed">
                Centraliser la progression de l'élève. Il rejoint une session de cours, accomplit des défis pédagogiques individuels ou en groupe, gagne des points d'XP et débloque ses paliers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              
              {/* ACCÈS AUX SALLES */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🔑 Accès aux Salles de Cours & Inscription
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      L'élève saisit un code d'accès unique fourni par son formateur pour rejoindre instantanément son arbre de compétences.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => { setSimulatedSessionCode('AIRBUS-LILLE-26'); setShowFormPreview('session'); }}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer"
                    >
                      Ajouter !
                    </button>
                  </div>
                </div>

                {/* VERSION VULGARISÉE COLLÉGIEN */}
                <div className="text-[11px] bg-emerald-900/5 text-emerald-950 p-3 rounded-xl border border-emerald-100/60">
                  <p className="font-bold text-emerald-800">🗣️ Version simple (Pour tout comprendre) :</p>
                  <p className="mt-1 text-slate-600">C'est comme quand tu tapes un code secret ou une invitation pour rejoindre un serveur ou une partie personnalisée dans ton jeu vidéo préféré ! Sauf qu'ici, la partie, c'est ton cours.</p>
                </div>

                {isDevMode && (
                  <div className="text-[11px] bg-slate-900 text-slate-300 rounded-xl p-3 font-mono space-y-1 border border-slate-800">
                    <p className="text-emerald-400 font-bold">🧠 Mécanique technique (Dev) :</p>
                    <p>• Fonction : <code className="text-pink-400">handleJoinSession(e)</code></p>
                    <p>• Mutation : Modifie le tableau JSONB <code className="text-amber-400">session_codes</code> dans <code className="text-purple-400">profiles</code>.</p>
                  </div>
                )}
              </div>

              {/* BARÈME D'XP */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🧗 Système de Palier & Barème d'XP
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Chaque niveau du parcours réclame un quota strict de points d'XP (1★ = 100 XP • 2★ = 250 XP • 3★ = 500 XP).
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col items-center gap-1.5 shrink-0">
                    <button className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider opacity-60 cursor-not-allowed">
                      Palier suivant ➔
                    </button>
                  </div>
                </div>

                <div className="text-[11px] bg-emerald-900/5 text-emerald-950 p-3 rounded-xl border border-emerald-100/60">
                  <p className="font-bold text-emerald-800">🗣️ Version simple :</p>
                  <p className="mt-1 text-slate-600">Plus tu réussis de missions difficiles (les quêtes à 3 étoiles), plus tu gagnes de gros points d'expérience (XP). Dès que ta jauge est pleine, tu passes au niveau supérieur (étage suivant).</p>
                </div>
              </div>

              {/* CO-DÉPÔT COOP */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🤝 Système de Co-dépôt pour Missions d'Équipe
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pour valider une quête de groupe, plusieurs coéquipiers doivent envoyer le même fichier joint pour confirmer leur coopération.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => { setSimulatedLivrable('Dossier_RSE_Final.pdf'); setShowFormPreview('livrable'); }}
                      className="bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer"
                    >
                      Soumettre
                    </button>
                  </div>
                </div>

                <div className="text-[11px] bg-emerald-900/5 text-emerald-950 p-3 rounded-xl border border-emerald-100/60">
                  <p className="font-bold text-emerald-800">🗣️ Version simple :</p>
                  <p className="mt-1 text-slate-600">C'est une mission en multijoueur coopératif ! Le site attend que tous les membres du groupe aient déposé le même travail. Tant qu'il manque un joueur, la mission reste "En attente".</p>
                </div>
              </div>

            </div>

            {/* MODALES INTERACTIVES */}
            <div className="space-y-4">
              {showFormPreview === 'session' && (
                <div className="bg-white border-2 border-slate-950 p-4 rounded-2xl shadow-lg space-y-3 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-indigo-600">Simulateur : Code Session</span>
                    <button onClick={() => setShowFormPreview(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
                  </div>
                  <input type="text" value={simulatedSessionCode} onChange={(e) => setSimulatedSessionCode(e.target.value.toUpperCase())} className="w-full border rounded-lg p-2 font-mono bg-slate-50 uppercase text-center font-bold" />
                  <button onClick={() => { alert(`Code "${simulatedSessionCode}" ajouté avec succès !`); setShowFormPreview(null); }} className="w-full bg-slate-900 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase">Valider l'entrée</button>
                </div>
              )}

              {showFormPreview === 'livrable' && (
                <div className="bg-white border-2 border-purple-600 p-4 rounded-2xl shadow-lg space-y-3 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-purple-700">Simulateur : Rendu Fichier</span>
                    <button onClick={() => setShowFormPreview(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
                  </div>
                  <input type="text" value={simulatedLivrable} onChange={(e) => setSimulatedLivrable(e.target.value)} className="w-full border rounded-lg p-2 font-mono bg-slate-50 text-slate-700" />
                  <button onClick={() => { alert(`Fichier envoyé.`); setShowFormPreview(null); }} className="w-full bg-purple-700 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase">Envoyer l'archive</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* 🧠 CONTENU : 2. FORMATEUR (StudioScreen)                 */}
      {/* ======================================================== */}
      {activeTab === 'formateur' && (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 text-purple-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-800">Objectif de l'Espace Formateur</h4>
              <p className="text-xs text-purple-900/80 mt-0.5 leading-relaxed">
                Permettre aux professeurs de créer l'arbre de compétences, d'ajouter des quêtes personnalisées et d'ouvrir des sessions de cours.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🎨 Création de Quêtes & Calibration
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      L'enseignant configure l'intitulé de l'exercice, choisit son thème (Social, Environnement, Technique) et définit s'il s'agit d'une quête d'équipe ou solo.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => { setSimulatedQuestName('Audit Énergétique'); setShowFormPreview('quest'); }}
                      className="bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer"
                    >
                      Créer
                    </button>
                  </div>
                </div>

                <div className="text-[11px] bg-purple-900/5 text-purple-950 p-3 rounded-xl border border-purple-100/60">
                  <p className="font-bold text-purple-800">🗣️ Version simple :</p>
                  <p className="mt-1 text-slate-600">Ici, le professeur est comme un "créateur de niveau" ou un maître du jeu. Il invente l'histoire de la quête, choisit sa difficulté et décide si vous devez la faire tout seul ou à plusieurs.</p>
                </div>
              </div>

            </div>

            <div className="space-y-4">
              {showFormPreview === 'quest' && (
                <div className="bg-white border-2 border-purple-950 p-4 rounded-2xl shadow-lg space-y-3 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-purple-700">Simulateur : Nouvelle Mission</span>
                    <button onClick={() => setShowFormPreview(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold text-[10px] mb-1">Nom de la mission :</label>
                    <input type="text" value={simulatedQuestName} onChange={(e) => setSimulatedQuestName(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                    <span className="text-[10px] font-bold">Mode d'équipe ?</span>
                    <input type="checkbox" checked={simulatedIsCollab} onChange={(e) => setSimulatedIsCollab(e.target.checked)} />
                  </div>
                  <button onClick={() => { alert(`Quête enregistrée !`); setShowFormPreview(null); }} className="w-full bg-purple-700 text-white font-black py-1.5 rounded-lg text-[10px] uppercase">Générer la quête</button>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900">📊 Suivi Macro & Tableaux de Bord RSE</h3>
            <p className="text-xs text-slate-600">
              Permet aux entreprises partenaires de regarder les scores globaux et d'auditer les projets terminés sans pouvoir les modifier.
            </p>

            <div className="text-[11px] bg-blue-900/5 text-blue-950 p-3 rounded-xl border border-blue-100/60">
              <p className="font-bold text-blue-800">🗣️ Version simple :</p>
              <p className="mt-1 text-slate-600">C'est le mode spectateur ! Les directeurs de l'école ou de l'entreprise se connectent pour voir les statistiques (les moyennes de la classe, les taux de réussite) et voir si tout le monde travaille bien.</p>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* ⚡ CONTENU : 4. SUPER ADMIN                              */}
      {/* ======================================================== */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900">🛠️ Outil d'Impersonation & Maintenance</h3>
            <p className="text-xs text-slate-600">
              Réservé aux développeurs en chef pour réparer un compte bloqué en simulant précisément l'interface d'un utilisateur.
            </p>

            <div className="text-[11px] bg-red-900/5 text-red-950 p-3 rounded-xl border border-red-100/60">
              <p className="font-bold text-red-800">🗣️ Version simple :</p>
              <p className="mt-1 text-slate-600">C'est le bouton "Super-Pouvoir". Si un élève a son compte complètement bloqué à cause d'un bug informatique, l'administrateur peut entrer dans son compte pour aller réparer la panne directement.</p>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* 🗄️ CONTENU : 5. ARCHITECTURE BASE DE DONNÉES             */}
      {/* ======================================================== */}
      {activeTab === 'bdd' && isDevMode && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bloc Objectif */}
          <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🗄️</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Objectif de la Cartographie Relationnelle BDD</h4>
              <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                Fournir le dictionnaire de données et les spécifications techniques de l'infrastructure Supabase. Cet onglet détaille les types PostgreSQL natifs, les contraintes de clés (PK/FK/UK), les valeurs par défaut et la modélisation des objets complexes JSONB.
              </p>
            </div>
          </div>
          
          {/* Légende du code couleur */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="text-slate-700 font-bold font-sans">🎨 Code Couleur des Types :</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 inline-block"></span><span className="text-purple-700 font-bold">uuid</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block"></span><span className="text-blue-700 font-bold">text</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block"></span><span className="text-amber-700 font-bold">jsonb</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-100 border border-pink-300 inline-block"></span><span className="text-pink-700 font-bold">boolean / integer / bigint</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-400 inline-block"></span><span className="text-slate-700 font-bold">timestamp</span></span>
          </div>

          {/* TABLEAU COMPLET RE-STRUCTURÉ */}
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

                  {/* SECTION : PRODUCTIONS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800">
                      📂 TABLE : productions <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Rendus de livrables et historiques d'exercices)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">productions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() <span className="text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 px-1 rounded font-bold">PRIMARY KEY</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">created_at</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">timestamp with tz</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">now()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">student_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">(Foreign Key ➔ profiles.id)</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">student_email</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">quest_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">quest_name</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-amber-700 font-bold">content</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-amber-600 font-sans font-bold">null <span className="font-normal text-slate-500">(Contient le JSON stringifié de la quête)</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">file_url</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">file_hash</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">session_code</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>

                  {/* SECTION : PROFILES */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      👤 TABLE : profiles <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Utilisateurs, permissions rôles et sauvegardes de paliers)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">profiles</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() <span className="text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 px-1 rounded font-bold">PK / Link Auth.users</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-slate-700">email</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-slate-700">role</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-indigo-600 font-bold">'user'::text</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-amber-700 font-bold">session_codes</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-purple-600 font-bold">'[]'::jsonb</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-emerald-600 font-bold">unlocked_floors</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-purple-600 font-bold">'{"{}"}'::jsonb</td></tr>

                  {/* SECTION : QUESTS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      ⚔️ TABLE : quests <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Catalogue des missions de jeu configurables par le Studio)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">quests</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">desc</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">theme</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">difficulty</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">owner_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">visibility</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">'private'::text</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">name</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-indigo-600 font-bold">is_collaborative</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">boolean</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-indigo-600 font-sans font-bold">false</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-indigo-600 font-bold">required_partners</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">integer</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-indigo-600 font-sans font-bold">1</td></tr>

                  {/* SECTION : SESSIONS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      🏫 TABLE : sessions <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Instances de cours reliant un groupe d'élèves à un arbre de paliers)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">sessions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">bigint</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">Identity <span className="text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 px-1 rounded font-bold">PK</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-emerald-600 font-bold">session_code</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans"><span className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded font-bold">UNIQUE KEY</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-slate-700">tree_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-slate-700">manager_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-slate-700">created_by</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-purple-600 font-bold">drh_ids</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-purple-600 font-bold">'[]'::jsonb</td></tr>

                  {/* SECTION : SHARED PERMISSIONS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      🔗 TABLE : shared_permissions <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Passerelle de partage d'arbres ou de quêtes privées inter-formateurs)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">shared_permissions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">bigint</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">shared_permissions</td><td className="p-3 text-slate-700">entity_type</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">shared_permissions</td><td className="p-3 text-slate-700">entity_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">shared_permissions</td><td className="p-3 text-slate-700">shared_with_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>

                  {/* SECTION : TREES */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      🌲 TABLE : trees <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Architecture structurelle des parcours ordonnés par étages)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">trees</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-slate-700">name</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-purple-600 font-bold">floors</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-slate-700">owner_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-slate-700">visibility</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">'private'::text</td></tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* Schémas Objets JSONB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-emerald-400 font-bold block border-b border-slate-800 pb-1">⚙️ profiles.unlocked_floors</span>
              <pre className="text-pink-400 text-[11px] overflow-x-auto">
{`{
  "3b2d56a1-8761-410c...": 2,
  "a8f7612c-1102-991b...": 0
}`}
              </pre>
            </div>
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-purple-400 font-bold block border-b border-slate-800 pb-1">🌲 trees.floors</span>
              <pre className="text-indigo-300 text-[11px] overflow-x-auto">
{`[
  {
    "floorId": 1,
    "quests": ["8076be11-...", "129a00b4-..."]
  }
]`}
              </pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
