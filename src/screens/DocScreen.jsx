// src/screens/DocScreen.jsx
import React, { useState } from 'react';

export default function DocScreen() {
  const [activeTab, setActiveTab] = useState('user'); // 'user', 'formateur', 'drh', 'admin', 'bdd'
  const [isDevMode, setIsDevMode] = useState(false); // false = Public, true = Dev
  
  // Épices Bonus : États de simulation interactive pour les formulaires reproduits
  const [simulatedQuestName, setSimulatedQuestName] = useState('Éco-gestes au bureau');
  const [simulatedQuestTheme, setSimulatedQuestTheme] = useState('env');
  const [simulatedQuestType, setSimulatedQuestType] = useState('normal');
  const [simulatedIsCollab, setSimulatedIsCollab] = useState(true);
  const [simulatedPartners, setSimulatedPartners] = useState(3);
  const [simulatedSessionCode, setSimulatedSessionCode] = useState('AIRBUS-LILLE-26');
  const [simulatedLivrable, setSimulatedLivrable] = useState('Livrable_Groupe4_RSE.pdf');
  const [showFormPreview, setShowFormPreview] = useState(null); // 'quest', 'session', 'livrable' ou null

  // Forcer l'onglet BDD à se fermer si l'utilisateur quitte le mode Dev
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
            Cartographie des fonctionnalités, guides utilisateurs et architecture technique de la plateforme
          </p>
        </div>

        {/* LE TOGGLE RE-NOMMÉ : Public // Dev */}
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

      {/* NAVIGATION PRINCIPALE (LES ONGLETS) */}
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

        {/* L'ONGLET BASE DE DONNÉES APPARAÎT UNIQUEMENT SI LE MODE DEV EST ACTIF */}
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
                Centraliser la progression gamifiée de l'élève. Il rejoint une session de cours, accomplit des défis pédagogiques individuels ou groupés, acquiert des points d'XP et débloque ses paliers d'apprentissage de façon persistante.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              
              {/* SECTION REJOINDRE UNE SESSION */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🔑 Accès aux Salles de Cours & Inscription
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      L'élève saisit un code d'accès unique fourni par son formateur. Le tableau de bord vérifie l'existence de la session dans Supabase, l'ajoute à son profil et télécharge instantanément l'arbre de compétences associé.
                    </p>
                  </div>
                  
                  {/* DESIGN ORIGINAL REPRODUIT (Bouton d'action non-cliquable ou avec bonus démo) */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Design Composant</span>
                    <button 
                      onClick={() => { setSimulatedSessionCode('AIRBUS-LILLE-26'); setShowFormPreview('session'); }}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer shadow-xs"
                    >
                      Ajouter !
                    </button>
                  </div>
                </div>

                {isDevMode && (
                  <div className="text-[11px] bg-slate-900 text-slate-300 rounded-xl p-3 font-mono space-y-1 border border-slate-800">
                    <p className="text-emerald-400 font-bold">🧠 Mécanique d'écriture back-end :</p>
                    <p>• Déclencheur : <code className="text-pink-400 font-bold">handleJoinSession(e)</code></p>
                    <p>• Contrôle : Évite les doublons via une vérification locale sur le tableau de chaînes <code className="text-indigo-400">sessionCodesList</code>.</p>
                    <p>• Mutation : Modifie le champ <code className="text-amber-400">session_codes</code> (Type JSONB) de l'utilisateur ciblé dans la table <code className="text-purple-400">profiles</code>.</p>
                  </div>
                )}
              </div>

              {/* SECTION RECHARGER ET GRAPPILLER LES NIVEAUX */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🧗 Système de Palier & Barème Mathématique d'XP
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Chaque niveau du parcours réclame un quota strict de points d'XP accumulés uniquement via les quêtes déjà validées par l'équipe pédagogique.
                    </p>
                    <div className="pt-2">
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                        Calculateur natif : 1★ = 100 XP • 2★ = 250 XP • 3★ = 500 XP
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Design Composant</span>
                    <button className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider opacity-60 cursor-not-allowed shadow-xs">
                      Palier suivant ➔
                    </button>
                  </div>
                </div>

                {isDevMode && (
                  <div className="text-[11px] bg-slate-900 text-slate-300 rounded-xl p-3 font-mono space-y-1 border border-slate-800">
                    <p className="text-purple-400 font-bold">💾 Persistance du Déblocage :</p>
                    <p>• Fonction : <code className="text-pink-400">handleUnlockNextFloor(nextFloorIdx)</code></p>
                    <p>• Mutation BDD : Met à jour dynamiquement la colonne native <code className="text-emerald-400">unlocked_floors</code> (objet clé-valeur JSONB rattachant l'UUID de l'arbre à l'index débloqué maximum : <code className="text-amber-400">{"{ [treeId]: maxUnlockedFloorIndex }"}</code>).</p>
                    <p>• Animation : Déclenche la classe CSS <code className="text-indigo-400">.animate-drop-bounce</code> pendant 600ms lors du franchissement de palier.</p>
                  </div>
                )}
              </div>

              {/* SECTION SOUVENIR DES RENDUS / DOUBLE DÉPÔT CO-OP */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🤝 Moteur de Co-dépôt Réseau pour Missions d'Équipe
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pour les quêtes collaboratives, la validation requiert que plusieurs coéquipiers de la même session envoient le même fichier joint. Le système calcule un code de hachage unique.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Design Composant</span>
                    <button 
                      onClick={() => { setSimulatedLivrable('Dossier_RSE_Final.pdf'); setShowFormPreview('livrable'); }}
                      className="bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer shadow-xs"
                    >
                      Soumettre le livrable
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-medium pt-1">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-900">
                    <strong className="block text-amber-800 mb-0.5">⏳ Statut En Attente (`pending`)</strong>
                    Le fichier a été envoyé, mais le quota requis de coéquipiers n'est pas encore atteint. Le badge clignote en mode réseau.
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900">
                    <strong className="block text-emerald-800 mb-0.5">🏆 Statut Validé (`validated`)</strong>
                    Dès que le dernier partenaire requis dépose le fichier, l'algorithme met à jour automatiquement toutes les lignes liées à ce hash en base.
                  </div>
                </div>

                {isDevMode && (
                  <div className="text-[11px] bg-slate-900 text-slate-300 rounded-xl p-3 font-mono space-y-1 border border-slate-800">
                    <p className="text-amber-400 font-bold">⚓ Algorithme de Cryptage & Vérification :</p>
                    <p>• Générateur de Hash : <code className="text-pink-400">generateLivrableHash(questId, sessionCode, filename)</code></p>
                    <p>• Structure de l'empreinte : <code className="text-slate-400">collab_uuid_code-session_nomfichier</code></p>
                    <p>• Traitement Supabase : Interroge la table <code className="text-purple-400">productions</code>, compte les correspondances de hash et bascule l'état de <code className="text-orange-400">'pending'</code> à <code className="text-emerald-400">'validated'</code> pour l'ensemble du groupe.</p>
                  </div>
                )}
              </div>

            </div>

            {/* BARRE LATÉRALE DE DROITE (INFOS UTILES & APERÇUS BONUS) */}
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3 shadow-md">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-400">📊 Variables Globales Mobilisées</h4>
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block font-sans">Points Requis / Étage</span>
                    <span className="text-white font-bold">POINTS_REQUIRED_PER_FLOOR = 300</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block font-sans">Fonction d'encodage JSON</span>
                    <span className="text-indigo-400 text-[10px] font-bold">encodeProductionContent(text, status, hash)</span>
                  </div>
                </div>
              </div>

              {/* BONUS : BOÎTE DE DIALOGUE INTERACTIVE SIMULANT LE FORMULAIRE DE L'APPRENANT */}
              {showFormPreview === 'session' && (
                <div className="bg-white border-2 border-slate-950 p-4 rounded-2xl shadow-lg space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-indigo-600">Simulateur : Entrée Session</span>
                    <button onClick={() => setShowFormPreview(null)} className="text-slate-400 text-xs font-bold hover:text-slate-600">✕</button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold mb-0.5">Code saisi par l'apprenant :</label>
                      <input type="text" value={simulatedSessionCode} onChange={(e) => setSimulatedSessionCode(e.target.value.toUpperCase())} className="w-full border rounded-lg p-2 font-mono font-bold bg-slate-50 text-slate-800 uppercase" />
                    </div>
                    <button onClick={() => { alert(`Appel Supabase simulé !\nInsertion du code : "${simulatedSessionCode}" dans profiles.session_codes`); setShowFormPreview(null); }} className="w-full bg-slate-900 text-white font-bold py-1.5 rounded-lg uppercase tracking-wide text-[10px]">
                      Simuler handleJoinSession()
                    </button>
                  </div>
                </div>
              )}

              {showFormPreview === 'livrable' && (
                <div className="bg-white border-2 border-purple-600 p-4 rounded-2xl shadow-lg space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-purple-700">Simulateur : Co-dépôt Fichier</span>
                    <button onClick={() => setShowFormPreview(null)} className="text-slate-400 text-xs font-bold hover:text-slate-600">✕</button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold mb-0.5">Nom du fichier chargé :</label>
                      <input type="text" value={simulatedLivrable} onChange={(e) => setSimulatedLivrable(e.target.value)} className="w-full border rounded-lg p-2 font-mono text-slate-700 bg-slate-50" />
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg text-[10px] font-mono text-slate-600">
                      <strong>Hash calculé en direct :</strong> <br/>
                      collab_quest123_lille2026_{simulatedLivrable.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}
                    </div>
                    <button onClick={() => { alert(`Vérification des doublons sur le groupe terminée !\nFichier enregistré sous le statut 'pending' ou 'validated'.`); setShowFormPreview(null); }} className="w-full bg-purple-700 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase">
                      Simuler l'analyse réseau
                    </button>
                  </div>
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
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-800">Objectif de l'Espace Formateur (Studio)</h4>
              <p className="text-xs text-purple-900/80 mt-0.5 leading-relaxed">
                Fournir les interfaces de modélisation et d'ingénierie aux professeurs. Il permet d'agencer visuellement l'arbre des paliers (floors), de configurer les options collaboratives et d'initialiser les sessions de cours.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              
              {/* SECTION CREATION DE MISSION & PARAMÈTRES AVANCÉS */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🎨 Création de Quêtes & Calibration Collaborative
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      L'ingénieur pédagogique configure l'énoncé, sélectionne la thématique, la difficulté et peut activer le drapeau coopératif en spécifiant le nombre d'équipiers indispensables.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Design Composant</span>
                    <button 
                      onClick={() => { setSimulatedQuestName('Audit Énergétique Industriel'); setSimulatedQuestTheme('tech'); setShowFormPreview('quest'); }}
                      className="bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer shadow-xs"
                    >
                      Créer la mission
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">🏷️ social</div>
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">🍃 env</div>
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">💻 tech</div>
                  <div className="p-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-100">🔥 boss (3★)</div>
                </div>

                {isDevMode && (
                  <div className="text-[11px] bg-slate-900 text-slate-300 rounded-xl p-3 font-mono space-y-1 border border-slate-800">
                    <p className="text-purple-400 font-bold">🧱 Injection de données Supabase :</p>
                    <p>• Variable : <code className="text-pink-400">is_collaborative</code> (booléen) et <code className="text-pink-400">required_partners</code> (entier).</p>
                    <p>• Automatisme : Le type 'boss' ou 'miniboss' calibre de façon stricte l'indicateur de difficulté (1 à 3) qui régit ensuite l'octroi des points.</p>
                  </div>
                )}
              </div>

              {/* SECTION ULTRA BONUS CALCULEUR AUTOMATIQUE */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      🔥 Fonctionnalité Ultra Bonus : Recalcul de Contrainte
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Dès qu'un formateur lie ou retire des exercices au sein d'un palier, le système scanne l'intégralité du parcours, repère la valeur <code className="text-purple-700 font-bold">required_partners</code> la plus élevée des quêtes intégrées, et recalcule dynamiquement la taille maximale d'équipe requise pour l'arbre.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Design Composant</span>
                    <button className="bg-purple-100 text-purple-700 text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-purple-200 shadow-2xs cursor-default">
                      💾 Synchroniser l'Arbre
                    </button>
                  </div>
                </div>

                {isDevMode && (
                  <div className="text-[11px] bg-slate-900 text-slate-300 rounded-xl p-3 font-mono space-y-1 border border-slate-800">
                    <p className="text-emerald-400 font-bold">🧮 Logique algorithmique interne :</p>
                    <p>• Déclencheur automatique : <code className="text-pink-400">recalculateAndSaveMaxTeamConstraint(treeId, floorsArray)</code></p>
                    <p>• Méthode : Utilise un <code className="text-indigo-400">.reduce()</code> JavaScript pour extraire le maximum d'équipiers exigés et l'enregistre en BDD dans la colonne <code className="text-amber-400">max_team_constraint</code> de la table <code className="text-purple-400">trees</code>.</p>
                  </div>
                )}
              </div>

            </div>

            {/* BARRE LATÉRALE COMPOSANT INTERACTIF STUDIO */}
            <div className="space-y-4">
              {showFormPreview === 'quest' && (
                <div className="bg-white border-2 border-purple-950 p-4 rounded-2xl shadow-lg space-y-3 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-purple-700">Simulateur : Modale Studio</span>
                    <button onClick={() => setShowFormPreview(null)} className="text-slate-400 text-xs font-bold hover:text-slate-600">✕</button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-500 font-bold text-[11px]">Intitulé de la mission :</label>
                      <input type="text" value={simulatedQuestName} onChange={(e) => setSimulatedQuestName(e.target.value)} className="w-full border rounded-lg p-2 font-medium bg-slate-50" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-500 font-bold text-[10px]">Thématique :</label>
                        <select value={simulatedQuestTheme} onChange={(e) => setSimulatedQuestTheme(e.target.value)} className="w-full border rounded-lg p-1.5 bg-slate-50 font-bold">
                          <option value="social">Social</option>
                          <option value="env">Environnement</option>
                          <option value="tech">Technique</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold text-[10px]">Type de quête :</label>
                        <select value={simulatedQuestType} onChange={(e) => setSimulatedQuestType(e.target.value)} className="w-full border rounded-lg p-1.5 bg-slate-50 font-bold">
                          <option value="normal">Standard (1★)</option>
                          <option value="miniboss">Miniboss (2★)</option>
                          <option value="boss">Boss (3★)</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                      <label className="text-[10px] font-bold text-purple-900">👥 Mission Collaborative ?</label>
                      <input type="checkbox" checked={simulatedIsCollab} onChange={(e) => setSimulatedIsCollab(e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
                    </div>
                    {simulatedIsCollab && (
                      <div>
                        <label className="block text-slate-500 font-bold text-[10px]">Quota d'équipiers requis :</label>
                        <input type="number" min="2" max="10" value={simulatedPartners} onChange={(e) => setSimulatedPartners(parseInt(e.target.value) || 2)} className="w-full border rounded-lg p-1.5 bg-slate-50 font-mono font-bold" />
                      </div>
                    )}
                    <button onClick={() => { alert(`Création enregistrée !\n• Nom : ${simulatedQuestName}\n• Coop : ${simulatedIsCollab ? 'Oui (' + simulatedPartners + ' joueurs)' : 'Non'}`); setShowFormPreview(null); }} className="w-full bg-purple-700 text-white font-black py-2 rounded-xl text-[10px] uppercase tracking-wide">
                      Injecter dans quests & rafraîchir
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-purple-900 text-purple-100 p-4 rounded-2xl border border-purple-800 text-xs space-y-2 shadow-sm">
                <h4 className="font-black uppercase text-[9px] text-purple-300 tracking-wider">💡 Gestion des Filtres (Pool de droite)</h4>
                <p className="text-[11px] text-purple-200/90 leading-relaxed">
                  Le catalogue de droite utilise trois states simultanés pour affiner la recherche visuelle de l'enseignant : <code className="text-white bg-purple-950/60 px-1 rounded">searchQuery</code>, <code className="text-white bg-purple-950/60 px-1 rounded">filterTheme</code> et <code className="text-white bg-purple-950/60 px-1 rounded">filterDifficulty</code>.
                </p>
              </div>
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
                Offrir aux directeurs de comptes et aux auditeurs RSE un tableau de bord analytique macro. Ils suivent l'évolution globale des scores de compétences, visualisent les taux d'engagement et auditent les productions sans aucun droit de modification.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              🔒 Sécurisation des Accès & Isolation des Livrables
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Les profils ayant la mention <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono font-bold">"client"</code> ou <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono font-bold">"drh"</code> se voient attribuer des identifiants stockés dans le tableau <code className="text-slate-800 font-bold">drh_ids</code> d'une session. L'isolation stricte par politiques de sécurité empêche toute injection de faux rapports.
            </p>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* ⚡ CONTENU : 4. SUPER ADMIN                              */}
      {/* ======================================================== */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 text-red-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-800">Objectif de l'Espace Super Admin</h4>
              <p className="text-xs text-red-900/80 mt-0.5 leading-relaxed">
                Assurer la maintenance de niveau 3 et le débogage applicatif directement en production. Il permet de pallier un incident technique lié au recalcul des points ou de nettoyer manuellement une entrée corrompue.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              🛠️ Système d'Impersonation & Prise de Contrôle Sécurisée
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              L'outil d'impersonation permet d'outrepasser l'identité locale en injectant l'UUID d'un apprenant ou d'un formateur ciblé dans le state applicatif global, afin de reproduire exactement le bug visuel rencontré par l'usager sans requérir ses identifiants secrets.
            </p>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* 🗄️ CONTENU : 5. ARCHITECTURE BASE DE DONNÉES             */}
      {/* ======================================================== */}
      {activeTab === 'bdd' && isDevMode && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🗄️</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Cartographie Structurée & Dictionnaire de Données Supabase</h4>
              <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                Spécifications techniques des relations PostgreSQL exploitées au sein des écrans Studio et Dashboard. Les objets complexes de type JSONB permettent une flexibilité totale dans la gestion des paliers et des codes d'accès.
              </p>
            </div>
          </div>
          
          <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-[11px] font-mono shadow-sm">
            <span className="text-slate-400 font-bold font-sans">Tags de Typage Natif :</span>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-bold border border-purple-800">uuid</span>
            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-bold border border-blue-800">text</span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800">jsonb</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">bool</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="p-3 pl-5 w-1/4">Table PostgreSQL</th>
                    <th className="p-3 w-1/4">Nom Colonne</th>
                    <th className="p-3 w-1/5">Type de données</th>
                    <th className="p-3 pr-5">Spécificités / Contraintes Métier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {/* TABLE QUESTS */}
                  <tr className="bg-slate-100 font-sans text-xs font-black text-slate-900">
                    <td colSpan="4" className="p-2.5 pl-5">📌 Table : quests (Catalogue de missions)</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60"><td className="p-3 pl-5 text-slate-400">quests</td><td className="p-3 font-bold text-slate-900">id</td><td><span className="text-purple-700 font-bold">uuid</span></td><td className="p-3 font-sans text-slate-500">Clé Primaire (`PK`), générée de façon aléatoire.</td></tr>
                  <tr className="hover:bg-slate-50/60"><td className="p-3 pl-5 text-slate-400">quests</td><td className="p-3 font-bold text-emerald-700">is_collaborative</td><td><span className="text-emerald-700 font-bold">bool</span></td><td className="p-3 font-sans text-slate-500">Drapeau d'activation du système de co-dépôt pour les équipes.</td></tr>
                  <tr className="hover:bg-slate-50/60"><td className="p-3 pl-5 text-slate-400">quests</td><td className="p-3 font-bold text-slate-900">required_partners</td><td><span className="text-slate-900 font-bold">int4</span></td><td className="p-3 font-sans text-slate-500">Seuil minimum de coéquipiers requis (Par défaut: 2).</td></tr>
                  
                  {/* TABLE TREES */}
                  <tr className="bg-slate-100 font-sans text-xs font-black text-slate-900">
                    <td colSpan="4" className="p-2.5 pl-5 border-t border-slate-200">📌 Table : trees (Arbres de compétences)</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60"><td className="p-3 pl-5 text-slate-400">trees</td><td className="p-3 font-bold text-amber-700">floors</td><td><span className="text-amber-700 font-bold">jsonb</span></td><td className="p-3 font-sans text-slate-500">Tableau d'objets contenant l'agencement, les modes (static/random) et les IDs de quêtes rattachés.</td></tr>
                  <tr className="hover:bg-slate-50/60"><td className="p-3 pl-5 text-slate-400">trees</td><td className="p-3 font-bold text-purple-700">max_team_constraint</td><td><span className="text-slate-900 font-bold">int4</span></td><td className="p-3 font-sans text-slate-500">Taille de groupe maximale, calculée automatiquement par l'Ultra Bonus.</td></tr>

                  {/* TABLE PRODUCTIONS */}
                  <tr className="bg-slate-100 font-sans text-xs font-black text-slate-900">
                    <td colSpan="4" className="p-2.5 pl-5 border-t border-slate-200">📌 Table : productions (Rendus et justificatifs)</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60"><td className="p-3 pl-5 text-slate-400">productions</td><td className="p-3 font-bold text-amber-700">content</td><td><span className="text-blue-700 font-bold">text / jsonb</span></td><td className="p-3 font-sans text-slate-500">Stocke la chaîne stringifiée contenant le texte, le statut (pending/validated) et l'empreinte de hash.</td></tr>
                  <tr className="hover:bg-slate-50/60"><td className="p-3 pl-5 text-slate-400">productions</td><td className="p-3 font-bold text-blue-700">file_url</td><td><span className="text-blue-700 font-bold">text</span></td><td className="p-3 font-sans text-slate-500">Contient l'URL ou la chaîne de données Base64 de la pièce jointe obligatoire pour la co-op.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
