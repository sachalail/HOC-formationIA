// src/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LoginScreen from './screens/LoginScreen';
import StudioScreen from './screens/StudioScreen';
import QuestLinkerScreen from './screens/QuestLinkerScreen';
import StudentDashboardScreen from './screens/StudentDashboardScreen';
import ClientDashboardScreen from './screens/ClientDashboardScreen';
import AdminScreen from './screens/AdminScreen'; 
import DocScreen from './screens/DocScreen';

import { validateAndGradeSubmission } from './utils/validator';

// On l'attache temporairement à window pour pouvoir jouer avec dans la console !
  window.testValidator = validateAndGradeSubmission;
  window.testQuestTemplate = {
    name: "Créer un plan de décarbonation",
    desc: "Détailler 3 actions concrètes pour réduire de 20% les émissions de scope 1 d'une PME."
  };

// Définition de la charte de couleurs dynamique (Moderne, Lisible Collégiens & Pros)
const themeColors = {
  apprenant: {
    primary: 'bg-emerald-600',
    text: 'text-emerald-600',
    hover: 'hover:bg-emerald-50',
    border: 'border-emerald-200',
    accent: 'emerald',
  },
  linker: { // Créer
    primary: 'bg-violet-600',
    text: 'text-violet-600',
    hover: 'hover:bg-violet-50',
    border: 'border-violet-200',
    accent: 'violet',
  },
  formateur: { // Assigner
    primary: 'bg-blue-600',
    text: 'text-blue-600',
    hover: 'hover:bg-blue-50',
    border: 'border-blue-200',
    accent: 'blue',
  },
  client: { // Résultats / Visualiser
    primary: 'bg-amber-500',
    text: 'text-amber-500',
    hover: 'hover:bg-amber-50',
    border: 'border-amber-200',
    accent: 'amber',
  },
  admin: { // Admin
    primary: 'bg-rose-600',
    text: 'text-rose-600',
    hover: 'hover:bg-rose-50',
    border: 'border-rose-200',
    accent: 'rose',
  },
  doc: { // Doc
    primary: 'bg-slate-700',
    text: 'text-slate-700',
    hover: 'hover:bg-slate-100',
    border: 'border-slate-200',
    accent: 'slate',
  }
};

export default function App() {
  const [trees, setTrees] = useState({});
  const [quests, setQuests] = useState([]);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('user'); 
  const [isManager, setIsManager] = useState(false); 
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('apprenant'); 
  
  // État pour gérer l'ouverture/fermeture du menu vertical de gauche
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // État d'infiltration d'utilisateur réel Supabase
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  // 1. Gestion de la session d'authentification
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfileAndContext(session.user);
      else setLoadingProfile(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfileAndContext(session.user);
      } else {
        setUserRole('user');
        setIsManager(false);
        setImpersonatedUser(null); 
        setLoadingProfile(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Récupération des rôles réels depuis Supabase
  const fetchProfileAndContext = async (user) => {
    try {
      setLoadingProfile(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role); 
      }

      // A. On vérifie si tu es le manager d'une session
      const { data: managedSessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('manager_id', user.id)
        .limit(1);

      // B. On vérifie SI ton ID est présent dans les drh_ids d'une session
      const { data: hrSessions } = await supabase
        .from('sessions')
        .select('id')
        .contains('drh_ids', JSON.stringify([user.id]))
        .limit(1);

      const isSessionManager = managedSessions && managedSessions.length > 0;
      const isSessionHR = hrSessions && hrSessions.length > 0;

      // Tu as l'accès si tu es manager de la session OU si tu t'es assigné les droits RH
      setIsManager(isSessionManager || isSessionHR);

      await loadSupabaseData();

    } catch (err) {
      console.error("Erreur d'initialisation du contexte utilisateur:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // 3. Chargement global initial des parcours et missions réels
  const loadSupabaseData = async () => {
    try {
      const { data: dbQuests } = await supabase.from('quests').select('*');
      if (dbQuests) {
        const formattedQuests = dbQuests.map(q => ({
          id: q.id,
          name: q.name,
          desc: q.desc,
          theme: q.theme,
          difficulty: q.difficulty,
          ownerId: q.owner_id,
          is_collaborative: q.is_collaborative,
          required_partners: q.required_partners,
          sharing: { type: q.visibility || 'private', allowedUsers: [q.owner_id] },
          required_deliverable: q.required_deliverable
        }));
        setQuests(formattedQuests);
      }

      const { data: dbTrees } = await supabase.from('trees').select('*');
      if (dbTrees) {
        const treesMap = {};
        dbTrees.forEach(t => {
          treesMap[t.id] = {
            id: t.id,
            name: t.name,
            ownerId: t.owner_id,
            floors: t.floors || [],
            max_team_constraint: t.max_team_constraint || 1,
            sharing: { type: t.visibility === 'public' ? 'global' : 'private', allowedUsers: [t.owner_id] }
          };
        });
        setTrees(treesMap);
      }
    } catch (err) {
      console.error("Erreur de chargement global Supabase:", err);
    }
  };

  // Déclenchement de l'usurpation depuis l'AdminScreen
  const handleImpersonate = (userProfile) => {
    setImpersonatedUser(userProfile);
    if (userProfile) {
      alert(`🎭 Mode infiltration activé : Vous naviguez maintenant sous l'identité de ${userProfile.email}`);
    }
  };

  // Gestion du clic de déconnexion avec invite de changement de compte
  const handleSignOutRequest = () => {
    const changeAccount = window.confirm("Souhaitez-vous vous déconnecter pour changer de compte ?");
    if (changeAccount) {
      supabase.auth.signOut();
    }
  };

  // Logique du sous-titre dynamique dépendante de currentScreen
  const getDynamicSubtitle = () => {
    switch (currentScreen) {
      case 'formateur': return "Assigner";
      case 'linker': return "Créer";
      case 'apprenant': return "Apprenant";
      case 'client': return "Résultats";
      case 'admin': return "Admin";
      case 'doc': return "Doc";
      default: return "Assigner";
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase font-black tracking-widest text-slate-400">Authentification réelle sécurisée...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  // Mutation contextuelle de l'utilisateur actif
  const activeUser = impersonatedUser 
    ? { ...session.user, id: impersonatedUser.id, email: impersonatedUser.email, isImpersonated: true } 
    : session.user;

  // Récupération du jeu de couleurs de la page courante
  const currentTheme = themeColors[currentScreen] || themeColors.apprenant;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      
      {/* ────────────────────────────────────────────────────────────────────────
          MENU VERTICAL DE GAUCHE (DÉPLIABLE)
          ──────────────────────────────────────────────────────────────────────── */}
      <aside 
        className={`bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-40 flex flex-col justify-between transition-all duration-300 shadow-sm ${
          isSidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* En-tête du menu */}
        <div>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between overflow-hidden">
            {isSidebarOpen ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-xl">🌳</span>
                <div>
                  <h1 className="text-sm font-black text-slate-950 uppercase tracking-wide">HOC</h1>
                  <p className={`text-[10px] font-extrabold uppercase tracking-tight transition-colors duration-300 ${currentTheme.text}`}>
                    {getDynamicSubtitle()}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-xl mx-auto">🌳</span>
            )}

            {/* Bouton pour replier / déplier */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 text-xs font-bold transition-all cursor-pointer"
              title={isSidebarOpen ? "Replier le menu" : "Déplier le menu"}
            >
              {isSidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          {/* Navigation / Liens */}
          <nav className="p-3 space-y-1.5 flex flex-col">
            {/* Apprenant (Vert) */}
            <button 
              onClick={() => setCurrentScreen('apprenant')} 
              className={`flex items-center gap-3 w-full rounded-xl text-xs font-black p-3 transition-all cursor-pointer ${
                currentScreen === 'apprenant' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'
              }`}
              title="Apprenant"
            >
              <span className="text-sm">🎮</span>
              {isSidebarOpen && <span className="truncate">Apprenant</span>}
            </button>

            {/* Créer (Anciennement QuestLinkerScreen / Concepteur) - Violet */}
            {(userRole === 'formateur' || userRole === 'admin') && (
              <button 
                onClick={() => setCurrentScreen('linker')} 
                className={`flex items-center gap-3 w-full rounded-xl text-xs font-black p-3 transition-all cursor-pointer ${
                  currentScreen === 'linker' 
                    ? 'bg-violet-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-violet-50 hover:text-violet-600'
                }`}
                title="Créer"
              >
                <span className="text-sm">🔗</span>
                {isSidebarOpen && <span className="truncate">Créer</span>}
              </button>
            )}

            {/* Assigner (Anciennement StudioScreen / Éditeur de parcours) - Bleu */}
            {(userRole === 'formateur' || userRole === 'admin') && (
              <button 
                onClick={() => setCurrentScreen('formateur')} 
                className={`flex items-center gap-3 w-full rounded-xl text-xs font-black p-3 transition-all cursor-pointer ${
                  currentScreen === 'formateur' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
                title="Assigner"
              >
                <span className="text-sm">🛠️</span>
                {isSidebarOpen && <span className="truncate">Assigner</span>}
              </button>
            )}

            {/* Résultats (Anciennement Client/DRH) - Jaune/Orangé */}
            {(isManager || userRole === 'admin') && (
              <button 
                onClick={() => setCurrentScreen('client')} 
                className={`flex items-center gap-3 w-full rounded-xl text-xs font-black p-3 transition-all cursor-pointer ${
                  currentScreen === 'client' 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-amber-50 hover:text-amber-600'
                }`}
                title="Résultats"
              >
                <span className="text-sm">📊</span>
                {isSidebarOpen && <span className="truncate">Résultats</span>}
              </button>
            )}

            {/* Admin - Rouge */}
            {userRole === 'admin' && (
              <button 
                onClick={() => setCurrentScreen('admin')} 
                className={`flex items-center gap-3 w-full rounded-xl text-xs font-black p-3 transition-all cursor-pointer ${
                  currentScreen === 'admin' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                }`}
                title="Admin"
              >
                <span className="text-sm">👑</span>
                {isSidebarOpen && <span className="truncate">Admin</span>}
              </button>
            )}
          </nav>
        </div>

        {/* Section bas de menu : Doc, profil & Déconnexion */}
        <div className="p-3 border-t border-slate-100 space-y-1.5 bg-slate-50/50">
          
          {/* Nouveau bouton Doc (Relocalisé de bas droite à ici) */}
          <button 
            onClick={() => setCurrentScreen('doc')} 
            className={`flex items-center gap-3 w-full rounded-xl text-xs font-black p-3 transition-all cursor-pointer ${
              currentScreen === 'doc' 
                ? 'bg-slate-700 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Documentation"
          >
            <span className="text-sm">📄</span>
            {isSidebarOpen && <span>Documentation</span>}
          </button>

          {isSidebarOpen && activeUser?.email && (
            <div className="px-2 py-1.5 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden text-[10px] font-mono font-bold text-slate-500 truncate" title={activeUser.email}>
              {activeUser.email}
            </div>
          )}

          <button 
            onClick={handleSignOutRequest} 
            className="flex items-center gap-3 w-full rounded-xl text-xs font-black p-3 text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            title="Se déconnecter"
          >
            <span className="text-sm">🚪</span>
            {isSidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────────────────────
          ZONE DE CONTENU PRINCIPALE (Ajustée selon la largeur du menu vertical)
          ──────────────────────────────────────────────────────────────────────── */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: isSidebarOpen ? '16rem' : '4rem' }}
      >
        {/* Bandeau d'alerte en cas d'infiltration */}
        {impersonatedUser && (
          <div className="bg-amber-500 text-slate-950 px-6 py-2.5 text-center text-xs font-black uppercase tracking-wider flex justify-between items-center z-30 sticky top-0 shadow-md">
            <span className="flex items-center gap-1.5">⚠️ INFILTRATION EN COURS : Vous agissez à la place de <strong className="underline font-black font-mono">{impersonatedUser.email}</strong></span>
            <button 
              onClick={() => handleImpersonate(null)} 
              className="bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
            >
              Quitter l'infiltration
            </button>
          </div>
        )}

        {/* ZONE D'AFFICHAGE DE L'ÉCRAN ACTIF (Avec variables de thèmes transmises au besoin) */}
        <main className="p-8 transition-all duration-200">
          {currentScreen === 'formateur' && (
            <StudioScreen 
              trees={trees} 
              setTrees={setTrees} 
              quests={quests} 
              setQuests={setQuests} 
              theme={currentTheme} // Permet de propager la charte de couleurs
            />
          )}
          {currentScreen === 'linker' && (
            <QuestLinkerScreen 
              trees={trees} 
              setTrees={setTrees} 
              quests={quests} 
              setQuests={setQuests} 
              theme={currentTheme}
            />
          )}
          {currentScreen === 'apprenant' && (
            <StudentDashboardScreen 
              user={activeUser} 
              trees={trees} 
              quests={quests} 
              theme={currentTheme}
            />
          )}
          {currentScreen === 'client' && (
            <ClientDashboardScreen 
              user={activeUser} 
              trees={trees} 
              quests={quests} 
              theme={currentTheme}
            />
          )}
          {currentScreen === 'admin' && (
            <AdminScreen 
              onImpersonate={handleImpersonate} 
              theme={currentTheme}
            />
          )}
          {currentScreen === 'doc' && (
            <DocScreen 
              theme={currentTheme}
            />
          )}
        </main>
      </div>

    </div>
  );
}
