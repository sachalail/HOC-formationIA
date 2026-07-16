// src/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LoginScreen from './screens/LoginScreen';
import StudioScreen from './screens/StudioScreen';
import QuestLinkerScreen from './screens/QuestLinkerScreen'; // <-- NOUVEL IMPORT
import StudentDashboardScreen from './screens/StudentDashboardScreen';
import ClientDashboardScreen from './screens/ClientDashboardScreen';
import AdminScreen from './screens/AdminScreen'; 
import DocScreen from './screens/DocScreen';

export default function App() {
  const [trees, setTrees] = useState({});
  const [quests, setQuests] = useState([]);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('user'); 
  const [isManager, setIsManager] = useState(false); 
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('apprenant'); 

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

      // B. NOUVEAU : On vérifie SI ton ID est présent dans les drh_ids d'une session
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
          // 🤝 FIX: Conservation des données collaboratives après actualisation de la page
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
            // 🤝 FIX: Conservation de la contrainte maximale d'équipe sur l'arbre après actualisation
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
      case 'formateur': return "Espace Formateur & Administration";
      case 'linker': return "Liaison & Catalogue de Quêtes"; // <-- SOUS-TITRE NOUVEL ÉCRAN
      case 'apprenant': return "Espace Apprenant & Progression";
      case 'client': return "Espace Décideur & Suivi RH";
      case 'admin': return "Panel Super Administration";
      case 'doc': return "Guide & Documentation du Jour";
      default: return "Espace Formateur & Administration";
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      
      {impersonatedUser && (
        <div className="bg-amber-500 text-slate-950 px-6 py-2.5 text-center text-xs font-black uppercase tracking-wider flex justify-between items-center z-50 sticky top-0 shadow-md">
          <span className="flex items-center gap-1.5">⚠️ INFILTRATION EN COURS : Vous agissez à la place de <strong className="underline font-black font-mono">{impersonatedUser.email}</strong></span>
          <button 
            onClick={() => handleImpersonate(null)} 
            className="bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
          >
            Quitter l'infiltration
          </button>
        </div>
      )}

      {/* HEADER DE NAVIGATION GLOBAL */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌳</span>
          <div>
            <h1 className="text-sm font-black text-slate-950 uppercase tracking-wide">HOC - Formation</h1>
            <p className="text-[10px] text-purple-600 font-extrabold uppercase tracking-tight">{getDynamicSubtitle()}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
          <button onClick={() => setCurrentScreen('apprenant')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${currentScreen === 'apprenant' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'}`}>🎮 Apprenant</button>

          {(userRole === 'formateur' || userRole === 'admin') && (
            <>
              <button onClick={() => setCurrentScreen('formateur')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${currentScreen === 'formateur' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'}`}>🛠️ Studio (Concepteur)</button>
              <button onClick={() => setCurrentScreen('linker')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${currentScreen === 'linker' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'}`}>🔗 Liaison & Catalogue</button>
            </>
          )}

          {(isManager || userRole === 'admin') && (
            <button onClick={() => setCurrentScreen('client')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${currentScreen === 'client' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'}`}>📊 Client (DRH)</button>
          )}

          {userRole === 'admin' && (
            <button onClick={() => setCurrentScreen('admin')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${currentScreen === 'admin' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600'}`}>👑 Admin</button>
          )}

          {activeUser?.email && (
            <>
              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              <span className="text-[11px] font-mono font-bold text-slate-500 px-1 truncate max-w-[180px]" title={activeUser.email}>
                {activeUser.email}
              </span>
            </>
          )}

          <div className="w-[1px] h-4 bg-slate-200 mx-1" />
          
          {/* 📄 NOUVEAU BOUTON DOC - Placé juste avant le bouton de déconnexion */}
          <button 
            onClick={() => setCurrentScreen('doc')} 
            className={`p-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              currentScreen === 'doc' ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-200'
            }`}
            title="Accéder à la Doc du Jour"
          >
            📄 Doc
          </button>

          <button 
            onClick={handleSignOutRequest} 
            className="p-1.5 rounded-lg text-xs font-black text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            title="Se déconnecter / Changer de compte"
          >
            🚪
          </button>
        </div>
      </header>

      {/* ZONE D'AFFICHAGE DE L'ÉCRAN ACTIF */}
      <main className="transition-all duration-200">
        {currentScreen === 'formateur' && (
          <StudioScreen 
            trees={trees} 
            setTrees={setTrees} 
            quests={quests} 
            setQuests={setQuests} 
          />
        )}
        {/* RENDU DE L'ÉCRAN DE LIAISON ET CATALOGUE */}
        {currentScreen === 'linker' && (
          <QuestLinkerScreen 
            trees={trees} 
            setTrees={setTrees} 
            quests={quests} 
            setQuests={setQuests} 
          />
        )}
        {currentScreen === 'apprenant' && <StudentDashboardScreen user={activeUser} trees={trees} quests={quests} />}
        {currentScreen === 'client' && <ClientDashboardScreen user={activeUser} trees={trees} quests={quests} />}
        {currentScreen === 'admin' && <AdminScreen onImpersonate={handleImpersonate} />}
        {currentScreen === 'doc' && <DocScreen />}
      </main>

    </div>
  );
}
