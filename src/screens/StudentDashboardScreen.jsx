// src/screens/StudentDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function StudentDashboardScreen({ formations = {}, modules = [] }) {
  const [user, setUser] = useState(null);
  const [sessionCodesList, setSessionCodesList] = useState([]); 
  const [mySessionsData, setMySessionsData] = useState([]); 
  const [selectedSessionCode, setSelectedSessionCode] = useState(null); 
  const [selectedFormationId, setSelectedFormationId] = useState(null); 
  
  const [accessCode, setAccessCode] = useState('');
  const [activeTab, setActiveTab] = useState('parcours'); 
  
  // FILTRES DE SÉLECTION
  const [filterTheme, setFilterTheme] = useState('all');
  const [filterMode, setFilterMode] = useState('all'); 
  const [portfolioFilter, setPortfolioFilter] = useState('all'); // 'all', 'validated', 'pending', 'not_started'

  // ÉTATS DE SUIVI UNIQUE
  const [unlockedFloorIndex, setUnlockedFloorIndex] = useState(0); 
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0); 
  const [triggerDropAnimation, setTriggerDropAnimation] = useState(false); 
  
  // 🛡️ ÉTAT ANTI-SPAM
  const [completedModuleIds, setCompletedModuleIds] = useState(new Set());
  const [pendingCollabModuleIds, setPendingCollabModuleIds] = useState(new Set());

  // PORTFOLIO EN DIRECT DEPUIS SUPABASE
  const [productions, setProductions] = useState([]);

  const [activeModule, setActiveModule] = useState(null); 
  const [livrableContent, setLivrableContent] = useState(''); 
  const [attachedFile, setAttachedFile] = useState(null);

  // ✨ ÉTAT DE PERSISTANCE GLOBAL DU PARCOURS (Évite le bug de reset au refresh)
  const [allUnlockedFloors, setAllUnlockedFloors] = useState({});

  // 1. RÉCUPÉRATION DE L'UTILISATEUR ET DE SES SESSIONS
  useEffect(() => {
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('session_codes, unlocked_floors')
          .eq('id', session.user.id)
          .single();

        if (profile && !profileError) {
          if (profile.session_codes && Array.isArray(profile.session_codes)) {
            setSessionCodesList(profile.session_codes);
            fetchSessionsDetails(profile.session_codes);
          }
          setAllUnlockedFloors(profile.unlocked_floors || {});
        }
      }
    };
    getUserData();
  }, []);

  const fetchSessionsDetails = async (codes) => {
    if (!codes || codes.length === 0) return;

    const { data: sessionsData, error } = await supabase
      .from('sessions')
      .select('id, session_code, tree_id')
      .in('session_code', codes);

    if (sessionsData && !error) {
      setMySessionsData(sessionsData);
    }
  };

  // 📥 2. SYNCHRONISATION DU PORTFOLIO ET DES VALIDATIONS
  const fetchStudentProductions = async () => {
    if (!user) return;

    const { data: prods, error } = await supabase
      .from('productions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (prods && !error) {
      const validated = new Set();
      const pending = new Set();

      prods.forEach(p => {
        if (p.content.includes('[EN_ATTENTE_COLLAB]')) {
          pending.add(p.quest_id); // correspond techniquement à module_id
        } else {
          validated.add(p.quest_id);
        }
      });

      setCompletedModuleIds(validated);
      setPendingCollabModuleIds(pending);
      
      const formattedProds = prods.map(p => ({
        id: p.id,
        studentId: p.student_id,
        moduleId: p.quest_id,
        moduleName: p.quest_name,
        content: p.content,
        date: new Date(p.created_at).toLocaleDateString('fr-FR'),
        file_url: p.file_url
      }));
      setProductions(formattedProds);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStudentProductions();
    }
  }, [user]);

  // PERSISTANCE DES ÉTAGES VIA LE JSONB REQUIS DANS LES RÈGLES
  useEffect(() => {
    const syncFloorToSupabase = async () => {
      if (selectedFormationId && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('unlocked_floors')
          .eq('id', user.id)
          .single();

        const currentFloorsObj = profile?.unlocked_floors || {};
        currentFloorsObj[selectedFormationId] = unlockedFloorIndex;

        await supabase
          .from('profiles')
          .update({ unlocked_floors: currentFloorsObj })
          .eq('id', user.id);

        setAllUnlockedFloors(currentFloorsObj);
      }
    };
    syncFloorToSupabase();
  }, [unlockedFloorIndex, user, selectedFormationId]);

  useEffect(() => {
    const loadFloorFromSupabase = async () => {
      if (selectedFormationId && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('unlocked_floors')
          .eq('id', user.id)
          .single();

        const currentFloorsObj = profile?.unlocked_floors || {};
        const savedFloor = currentFloorsObj[selectedFormationId];
        const floorIdx = savedFloor ? parseInt(savedFloor, 10) : 0;
        
        setUnlockedFloorIndex(floorIdx);
        setCurrentFloorIndex(floorIdx); // Se positionner directement sur le dernier palier débloqué à la sélection
        setActiveModule(null);
      }
    };
    loadFloorFromSupabase();
  }, [user, selectedFormationId]);

  const handleJoinSession = async (e) => {
    e.preventDefault();
    const inputCode = accessCode.trim().toUpperCase();
    
    if (!inputCode) return;
    if (!user) { alert("❌ Session introuvable."); return; }

    if (sessionCodesList.includes(inputCode)) {
      alert("💡 Vous suivez déjà cette session !");
      setAccessCode('');
      return;
    }

    const { data: targetSession, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_code', inputCode)
      .single();

    if (sessionError || !targetSession) {
      alert("❌ Code de session inconnu.");
      return;
    }

    const updatedSessionCodes = [...sessionCodesList, targetSession.session_code];

    const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      session_codes: updatedSessionCodes 
    })
    .eq('id', user.id);

    if (updateError) throw updateError;
    else {
      setSessionCodesList(updatedSessionCodes);
      setMySessionsData([...mySessionsData, { id: targetSession.id, session_code: targetSession.session_code, tree_id: targetSession.tree_id }]);
      setSelectedSessionCode(targetSession.session_code);
      setSelectedFormationId(targetSession.tree_id);
      setCurrentFloorIndex(0);
      setAccessCode('');
      alert(`🎉 Session "${targetSession.session_code}" ajoutée !`);
    }
  };

  const getPointsByDifficulty = (difficulty) => {
    const numericDifficulty = parseInt(difficulty, 10);
    if (numericDifficulty === 3) return 500;
    if (numericDifficulty === 2) return 250;
    return 100;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedFile({ 
        name: file.name, 
        size: (file.size / 1024).toFixed(1) + " KB", 
        data: reader.result 
      });
    };
    reader.readAsDataURL(file);
  };

  const globalCompletedModuleIds = productions
    .filter(p => !p.content.includes('[EN_ATTENTE_COLLAB]'))
    .map(p => p.moduleId);

  const studentPoints = productions.reduce((sum, prod) => { 
    if (prod.content.includes('[EN_ATTENTE_COLLAB]')) return sum;
    const originalModule = modules.find(m => m.id === prod.moduleId);
    return originalModule ? sum + getPointsByDifficulty(originalModule.difficulty) : sum + 100; 
  }, 0);

  const handleSubmitLivrable = async (e) => {
    e.preventDefault();
    if (!livrableContent.trim()) return;
    if (completedModuleIds.has(activeModule.id)) return;
    if (!user) return;

    const isModuleCollab = activeModule.is_collaborative === true || activeModule.is_collaborative === 'true';
    let finalContent = livrableContent;

    if (isModuleCollab) {
      if (!attachedFile) {
        alert("⚠️ Un livrable (fichier joint) est obligatoire pour soumettre un module en équipe.");
        return;
      }

      const currentHash = generateLivrableHash(activeModule.id, selectedSessionCode, attachedFile.name);

      const { data: matchingPartners, error: checkError } = await supabase
        .from('productions')
        .select('id, student_email, content')
        .eq('quest_id', activeModule.id)
        .ilike('content', `%${currentHash}%`);

      if (checkError) {
        alert("❌ Erreur réseau lors de la vérification.");
        return;
      }

      const partnerSubmission = matchingPartners?.find(p => p.content.includes('[EN_ATTENTE_COLLAB]'));

      if (partnerSubmission) {
        const updatedPartnerContent = partnerSubmission.content.replace('[EN_ATTENTE_COLLAB]', '[VALIDE_COLLAB]');
        
        await supabase
          .from('productions')
          .update({ content: updatedPartnerContent })
          .eq('id', partnerSubmission.id);

        finalContent = `[VALIDE_COLLAB][Hash : ${currentHash}] ${livrableContent}`;
        alert(`🤝 Collaboration réussie ! Votre coéquipier (${partnerSubmission.student_email}) avait mis ce travail en attente. Le module est désormais validé pour vous deux ! 🎉`);
      } else {
        finalContent = `[EN_ATTENTE_COLLAB][Hash : ${currentHash}] ${livrableContent}`;
        alert(`⏳ Dépôt enregistré ! Cependant, comme vous êtes le premier de l'équipe à soumettre ce fichier ("${attachedFile.name}"), le module reste en attente de synchronisation. Il ne sera validé que lorsqu'un de vos coéquipiers aura déposé exactement le même fichier.`);
      }
    }

    const { error } = await supabase
      .from('productions')
      .insert([
        {
          student_id: user.id,          
          student_email: user.email,    
          quest_id: activeModule.id,     
          quest_name: activeModule.name,
          content: finalContent,     
          file_url: attachedFile ? attachedFile.data : null 
        }
      ]);

    if (!error) {
      await fetchStudentProductions();
      setLivrableContent('');
      setAttachedFile(null);
    }
  };

  const handleImportPreviousProduction = async () => {
    if (completedModuleIds.has(activeModule.id)) return;
    if (!user) return;

    const previousSubmission = productions.find(p => p.moduleId === activeModule.id && !p.content.includes('[EN_ATTENTE_COLLAB]'));
    if (!previousSubmission) return;

    const { error } = await supabase
      .from('productions')
      .insert([
        {
          student_id: user.id,
          student_email: user.email,
          quest_id: activeModule.id,
          quest_name: activeModule.name,
          content: `[Importé de l'historique] ${previousSubmission.content}`,
          file_url: previousSubmission.file_url || null
        }
      ]);

    if (!error) {
      await fetchStudentProductions();
      alert(`🔄 Travail synchronisé !`);
    }
  };

  // UNIQUE HASH GENERATOR
  const generateLivrableHash = (moduleId, sessionCode, filename = '') => {
    return `collab_${moduleId}_${sessionCode}_${filename.replace(/[^a-zA-Z0-9]/g, '')}`.toLowerCase();
  };

  // NAVIGATION DEPUIS LE PORTFOLIO DIRECTEMENT VERS LE BON PALIER
  const navigateToModuleInGame = (moduleId) => {
    let foundSessionCode = null;
    let foundFormationId = null;
    let foundFloorIdx = -1;
    let foundModuleObj = modules.find(m => m.id === moduleId);

    if (!foundModuleObj) return;

    // Rechercher dans toutes les sessions de l'utilisateur où ce module est localisé
    for (const sessionItem of mySessionsData) {
      const associatedFormation = formations[sessionItem.tree_id];
      if (associatedFormation && associatedFormation.floors) {
        const floorIndex = associatedFormation.floors.findIndex(floor => 
          (floor.quests || []).map(id => String(id)).includes(String(moduleId))
        );
        if (floorIndex !== -1) {
          foundSessionCode = sessionItem.session_code;
          foundFormationId = sessionItem.tree_id;
          foundFloorIdx = floorIndex;
          break;
        }
      }
    }

    if (foundSessionCode && foundFormationId && foundFloorIdx !== -1) {
      setSelectedSessionCode(foundSessionCode);
      setSelectedFormationId(foundFormationId);
      
      // On s'assure d'abord de mettre à jour l'étage pour que la vue s'ajuste
      setCurrentFloorIndex(foundFloorIdx);
      setActiveModule(foundModuleObj);
      setActiveTab('parcours'); 
    } else {
      alert("💡 Pour voir ce module, assurez-vous d'avoir rejoint la session de formation correspondante.");
    }
  };

  const uniqueLivrables = productions.filter(p => !p.content.startsWith("[Importé"));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative text-slate-800 antialiased bg-white">
      <style>{`
        @keyframes customBounce {
          0% { transform: translateY(-80px); opacity: 0; }
          60% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(0); }
        }
        .animate-drop-bounce { animation: customBounce 0.6s forwards; }
      `}</style>

      {/* BANNIÈRE PROGRESSION ET SCORE */}
      <div className="bg-slate-50 border border-slate-200 text-slate-800 p-5 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white font-black px-4 py-1.5 rounded-xl text-xs font-mono shadow-sm">
            ✨ {studentPoints} XP TOTAL
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Profil : <span className="font-bold text-slate-800">{user?.email || "Chargement..."}</span>
            {selectedSessionCode && <span> | Session : <strong className="text-emerald-700 font-mono">{selectedSessionCode}</strong></span>}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 gap-4">
        <button onClick={() => { setActiveTab('parcours'); setSelectedSessionCode(null); setSelectedFormationId(null); setActiveModule(null); }} className={`pb-3 text-sm font-bold border-b-2 px-2 transition-all cursor-pointer ${activeTab === 'parcours' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>📚 Mes Sessions & Parcours</button>
        <button onClick={() => { setActiveTab('portfolio'); setActiveModule(null); }} className={`pb-3 text-sm font-bold border-b-2 px-2 transition-all cursor-pointer ${activeTab === 'portfolio' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Mon Portfolio ({uniqueLivrables.length})</button>
      </div>

      {/* LISTE DES SESSIONS */}
      {activeTab === 'parcours' && !selectedSessionCode && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          
          {/* ENCART REJOINDRE UNE SESSION */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-black text-xs uppercase text-slate-800 flex items-center gap-2">🔑 Rejoindre une session</h4>
              <p className="text-[11px] text-slate-400 font-medium">Saisissez le code fourni par votre formateur pour rejoindre un nouveau parcours.</p>
            </div>
            <form onSubmit={handleJoinSession} className="flex gap-2 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Ex: ORANGE-LILLE-26" 
                value={accessCode} 
                onChange={(e) => setAccessCode(e.target.value)} 
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold uppercase focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 w-full md:w-64" 
              />
              <button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-6 py-2.5 rounded-xl transition-all uppercase cursor-pointer shadow-sm whitespace-nowrap"
              >
                Rejoindre
              </button>
            </form>
          </div>

          <hr className="border-slate-100" />

          {/* LISTE DES SESSIONS ACTIVES */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Vos sessions actives</h3>
            {mySessionsData.length === 0 ? (
              <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 p-12 rounded-2xl text-center text-xs text-slate-400 italic">
                Vous n'avez rejoint aucune session pour le moment. Utilisez l'encart ci-dessus pour commencer !
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mySessionsData.map(sessionItem => {
                  const linkedFormation = formations[sessionItem.tree_id];
                  return (
                    <div key={sessionItem.session_code} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-6 hover:border-emerald-500 transition-all">
                      <div>
                        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded font-mono font-bold uppercase">CODE : {sessionItem.session_code}</span>
                        <h4 className="text-sm font-black text-slate-800 mt-3">Formation : {linkedFormation ? linkedFormation.name : `Chargement...`}</h4>
                      </div>
                      <button onClick={() => { setSelectedSessionCode(sessionItem.session_code); setSelectedFormationId(sessionItem.tree_id); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition-all cursor-pointer shadow-sm">🚀 Entrer dans la session</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PARCOURS EN COURS */}
      {activeTab === 'parcours' && selectedSessionCode && selectedFormationId && formations[selectedFormationId] && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3 bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-sm">
              <button onClick={() => { setSelectedSessionCode(null); setSelectedFormationId(null); setActiveModule(null); }} className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer">⬅️ Retour aux parcours</button>
              <div className="flex items-center gap-2">
                <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-none"><option value="all">🌱 Toutes thématiques</option><option value="env">🌍 RSE / Climat</option><option value="tech">⚙️ Outils Digitaux</option></select>
                <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-none"><option value="all">👥 Tous formats</option><option value="solo">👤 Solo uniquement</option><option value="collab">🤝 Équipe uniquement</option></select>
              </div>
            </div>

            {(() => {
              const selectedFormation = formations[selectedFormationId];
              const allFloors = selectedFormation.floors || [];
              const safeUnlockedIndex = typeof allUnlockedFloors[selectedFormationId] !== 'undefined' ? parseInt(allUnlockedFloors[selectedFormationId], 10) : unlockedFloorIndex;
              const safeCurrentIndex = Math.min(currentFloorIndex, allFloors.length - 1);
              const activeFloor = allFloors[safeCurrentIndex];

              if (!activeFloor) return null;

              const activeFloorModules = (activeFloor.quests || []).map(id => modules.find(m => m.id === id)).filter(Boolean);
              const filteredModulesOnFloor = activeFloorModules.filter(m => {
                if (filterTheme !== 'all' && m.theme !== filterTheme) return false;
                if (filterMode === 'solo' && (m.is_collaborative === true || m.is_collaborative === 'true')) return false;
                if (filterMode === 'collab' && m.is_collaborative !== true && m.is_collaborative !== 'true') return false;
                return true;
              });

              // ANCIENNE MÉCANIQUE BASÉE SUR LES POINTS (GARDÉE EN COMMENTAIRE)
              // const POINTS_REQUIRED_PER_FLOOR = 300;
              // const currentFloorPoints = activeFloorModules.reduce((sum, m) => {
              //   if (completedModuleIds.has(m.id)) {
              //     return sum + getPointsByDifficulty(m.difficulty);
              //   }
              //   return sum;
              // }, 0);
              // const isFloorPassed = currentFloorPoints >= POINTS_REQUIRED_PER_FLOOR;

              // NOUVELLE MÉCANIQUE : Pour valider un palier, toutes les quêtes (modules) du palier doivent être validées
              const isFloorPassed = activeFloorModules.every(m => completedModuleIds.has(m.id));

              const isFloorViewLocked = safeCurrentIndex > safeUnlockedIndex;

              const handleUnlockNextFloor = async () => {
                if (isFloorPassed && safeCurrentIndex === safeUnlockedIndex) {
                  const nextIdx = safeUnlockedIndex + 1;
                  setUnlockedFloorIndex(nextIdx);
                  setCurrentFloorIndex(nextIdx);
                  setActiveModule(null);
                  setTriggerDropAnimation(true);
                  setTimeout(() => setTriggerDropAnimation(false), 800);
                }
              };

              return (
                <div className="flex gap-4 items-start">
                  {/* BARRE DE PALIERS */}
                  <div className="flex flex-col gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 w-11 shrink-0">
                    {allFloors.map((floor, idx) => {
                      const isUnlocked = idx <= safeUnlockedIndex;
                      const isActive = idx === safeCurrentIndex;
                      return (
                        <button key={floor.floorId} onClick={() => { setCurrentFloorIndex(idx); setActiveModule(null); }} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black cursor-pointer transition-all ${isActive ? 'bg-emerald-600 text-white shadow-md' : isUnlocked ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-slate-100 text-slate-300 opacity-40 cursor-not-allowed'}`}>{isUnlocked ? floor.floorId : '🔒'}</button>
                      );
                    })}
                  </div>

                  {/* CARTE DE CONTENU DU PALIER */}
                  <div className={`flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative ${triggerDropAnimation ? 'animate-drop-bounce' : ''}`}>
                    <div className="text-[11px] border-b border-slate-100 pb-2 text-slate-400 font-bold uppercase tracking-wider">Palier {activeFloor.floorId} — {selectedFormation.name}</div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                      {isFloorViewLocked && (
                        <div className="absolute inset-0 bg-slate-50/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-3 text-center rounded-xl">
                          <div className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl shadow-md border border-slate-700">
                            🔒 Verrouillé - Complétez d'abord le Palier {safeUnlockedIndex}
                          </div>
                        </div>
                      )}

                      {filteredModulesOnFloor.map(moduleItem => {
                        const isSelected = activeModule?.id === moduleItem.id;
                        const isDoneHere = completedModuleIds.has(moduleItem.id);
                        const isPendingHere = pendingCollabModuleIds.has(moduleItem.id);
                        const isDoneElsewhere = globalCompletedModuleIds.includes(moduleItem.id) && !isDoneHere;
                        const isModuleCollab = moduleItem.is_collaborative === true || moduleItem.is_collaborative === 'true';

                        return (
                          <button key={moduleItem.id} disabled={isFloorViewLocked} onClick={() => { setActiveModule(moduleItem); setLivrableContent(''); setAttachedFile(null); }} className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${isDoneHere ? 'bg-emerald-50/10 border-emerald-100 opacity-80' : isSelected ? 'bg-slate-50/50 border-emerald-500 ring-4 ring-emerald-500/5' : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'}`}>
                            <div>
                              <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400">
                                <span>{moduleItem.theme === 'env' ? '🌍 RSE' : '⚙️ TECH'}</span>
                                <span className={isModuleCollab ? 'text-teal-600' : 'text-slate-500'}>{isModuleCollab ? '👥 EQUIPE' : '👤 SOLO'}</span>
                              </div>
                              <h4 className="font-bold text-xs text-slate-800 mt-1 leading-snug">{moduleItem.name}</h4>
                            </div>
                            <div className="flex justify-between items-center w-full">
                              <span className="text-[9px] font-black font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{getPointsByDifficulty(moduleItem.difficulty)} XP</span>
                              {isDoneHere ? (
                                <span className="text-emerald-700 font-mono font-bold text-[9px] bg-emerald-50 px-2 py-0.5 rounded">Validé ✓</span>
                              ) : isPendingHere ? (
                                <span className="text-amber-700 font-mono font-bold text-[9px] bg-amber-50 px-2 py-0.5 rounded border border-amber-100">En attente ⏳</span>
                              ) : isDoneElsewhere ? (
                                <span className="text-emerald-700 font-mono font-bold text-[9px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Synchronisé 🔄</span>
                              ) : (
                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Lancer ➔</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* BARRE DE PROGRESSION DU PALIER */}
                    {!isFloorViewLocked && (
                      <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-1/2 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 font-mono">
                            <span>Modules complétés : {activeFloorModules.filter(m => completedModuleIds.has(m.id)).length} / {activeFloorModules.length}</span>
                            <span className={isFloorPassed ? 'text-emerald-600 font-bold' : ''}>{isFloorPassed ? 'Palier validé !' : 'En cours...'}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(activeFloorModules.filter(m => completedModuleIds.has(m.id)).length / activeFloorModules.length) * 100}%` }} />
                          </div>
                        </div>

                        {safeCurrentIndex === safeUnlockedIndex && (
                          <button disabled={!isFloorPassed} onClick={handleUnlockNextFloor} className={`px-4 py-2 text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-sm ${isFloorPassed ? 'bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>Palier suivant ➔</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ZONE DE REMISE DU TRAVAIL */}
          <div className="space-y-4">
            {activeModule ? (
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 sticky top-24">
                {(() => {
                  const isDoneHere = completedModuleIds.has(activeModule.id);
                  const isPendingHere = pendingCollabModuleIds.has(activeModule.id);
                  const isDoneElsewhere = globalCompletedModuleIds.includes(activeModule.id) && !isDoneHere;
                  const isModuleCollab = activeModule.is_collaborative === true || activeModule.is_collaborative === 'true';

                  return (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`font-bold text-[9px] px-2 py-0.5 rounded uppercase ${isDoneHere ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : isPendingHere ? 'bg-amber-50 text-amber-800 border border-amber-100' : isModuleCollab ? 'bg-teal-50 text-teal-800 border border-teal-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                            {isDoneHere ? 'Validé' : isPendingHere ? '⏳ En attente' : isModuleCollab ? '🤝 Travail en Équipe' : '👤 Solo'}
                          </span>
                          <h3 className="font-black text-slate-900 text-sm mt-2">{activeModule.name}</h3>
                        </div>
                        <button onClick={() => setActiveModule(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold font-mono">✕</button>
                      </div>

                      {isModuleCollab && !isDoneHere && !isPendingHere && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-[11px] text-slate-600 leading-tight font-medium">
                            🔒 <strong>Consigne d'équipe :</strong> Le premier à déposer enregistre le livrable en attente. Il sera validé automatiquement dès qu'un coéquipier déposera <strong>exactement le même fichier</strong>.
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-slate-600 italic bg-slate-50 border border-slate-100 p-3 rounded-xl">"{activeModule.desc}"</p>

                      {isDoneElsewhere ? (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
                          <p className="text-xs text-slate-800 font-bold leading-normal">🔄 Vous avez déjà réalisé ce module dans une autre session. Souhaitez-vous importer vos réponses ?</p>
                          <button onClick={handleImportPreviousProduction} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black py-2.5 px-4 rounded-xl transition-all w-full cursor-pointer shadow-sm">Importer mon travail précédent</button>
                        </div>
                      ) : isDoneHere ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-xs text-emerald-800 font-bold">
                          🎉 Module validé avec succès !
                        </div>
                      ) : isPendingHere ? (
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center space-y-2">
                          <p className="text-xs text-amber-900 font-medium">⏳ En attente de synchronisation d'un partenaire d'équipe.</p>
                          <span className="inline-block text-[10px] bg-white text-slate-400 px-2 py-1 rounded font-mono border border-slate-100">Réf : {activeModule.id}</span>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitLivrable} className="space-y-4">
                          <textarea rows="4" required value={livrableContent} onChange={(e) => setLivrableContent(e.target.value)} placeholder="Saisissez votre réponse ou contribution pédagogique ici..." className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:border-slate-400 focus:ring-1 focus:ring-slate-300 focus:outline-none placeholder:text-slate-300" />
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">📁 Justificatif / Fichier {isModuleCollab && <span className="text-teal-600 font-bold">(Obligatoire)</span>}</label>
                            <input type="file" required={isModuleCollab} onChange={handleFileChange} className="text-xs text-slate-500 block cursor-pointer" />
                          </div>
                          <button type="submit" className={`w-full font-bold py-3 rounded-xl text-xs cursor-pointer text-white shadow-sm transition-all ${isModuleCollab ? 'bg-teal-600 hover:bg-teal-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>💾 Enregistrer le livrable</button>
                        </form>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400 py-12">🎯 Sélectionnez un module à gauche.</div>
            )}
          </div>
        </div>
      )}

      {/* PORTFOLIO DES RENDUS */}
      {activeTab === 'portfolio' && user && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap justify-between items-center gap-4 shadow-sm">
            <div>
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2"> 📂 Vos Livrables & Historique </h3>
              <p className="text-[11px] text-slate-400 font-medium">Consultez vos rendus, téléchargez vos fichiers justificatifs et localisez vos modules en un clic.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase font-mono">Affichage :</label>
              <select value={portfolioFilter} onChange={(e) => setPortfolioFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer shadow-sm focus:outline-none"><option value="all">📁 Tout voir</option><option value="validated">✅ Validés</option><option value="pending">⏳ En attente équipe</option><option value="not_started">❌ Non commencés (Catalogue)</option></select>
            </div>
          </div>

          {/* ✅ BLOC 1 : MODULES VALIDÉS */}
          {(portfolioFilter === 'all' || portfolioFilter === 'validated') && (
            <div className="space-y-3">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-black text-xs text-slate-600 uppercase tracking-wider flex items-center gap-1.5"> ✅ Validés & Validés ({uniqueLivrables.filter(p => !p.content.includes('[EN_ATTENTE_COLLAB]')).length}) </h4>
              </div>
              {(() => {
                const validatedLivrables = uniqueLivrables.filter(p => !p.content.includes('[EN_ATTENTE_COLLAB]'));
                if (validatedLivrables.length === 0) {
                  return <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-[11px] text-slate-400 italic">Aucun module n'est validé pour le moment.</div>;
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {validatedLivrables.map(p => {
                      return (
                        <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:border-slate-300 transition-all relative">
                          <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">Validé</span>
                          <div className="space-y-2 pr-12">
                            <h5 className="font-bold text-xs text-slate-800 leading-snug">{p.moduleName}</h5>
                            <p className="text-[11px] text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded-lg font-medium leading-relaxed">"{p.content.replace('[VALIDE_COLLAB]', '[COLLAB VALIDÉ]')}"</p>
                            {p.file_url && (
                              <a href={p.file_url} download={`livrable_${p.moduleId}`} className="inline-flex items-center text-[10px] font-bold text-emerald-600 hover:underline gap-1 mt-1"> 📁 Ouvrir la pièce jointe </a>
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                            <span>Soumis le {p.date}</span>
                            <button onClick={() => navigateToModuleInGame(p.moduleId)} className="text-slate-700 hover:text-slate-900 font-bold uppercase tracking-wider cursor-pointer text-[9px] bg-slate-50 px-2.5 py-1 rounded hover:bg-slate-100">🎯 Voir dans le Parcours ➔</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ⏳ BLOC 2 : MODULES EN ATTENTE */}
          {(portfolioFilter === 'all' || portfolioFilter === 'pending') && (
            <div className="space-y-3 pt-2">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-black text-xs text-amber-700 uppercase tracking-wider flex items-center gap-1.5"> ⏳ En Attente de Synchronisation Équipe ({uniqueLivrables.filter(p => p.content.includes('[EN_ATTENTE_COLLAB]')).length}) </h4>
              </div>
              {(() => {
                const pendingLivrables = uniqueLivrables.filter(p => p.content.includes('[EN_ATTENTE_COLLAB]'));
                if (pendingLivrables.length === 0) {
                  return <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-[11px] text-slate-400 italic">Aucun dépôt n'est bloqué en attente de validation d'un partenaire.</div>;
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingLivrables.map(p => (
                      <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm relative">
                        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">En attente</span>
                        <div className="space-y-2 pr-16">
                          <h5 className="font-bold text-xs text-slate-800 leading-snug">{p.moduleName}</h5>
                          <p className="text-[11px] text-amber-800 line-clamp-3 bg-amber-50/20 p-2 rounded-lg font-medium leading-relaxed">"{p.content.replace('[EN_ATTENTE_COLLAB]', '')}"</p>
                          {p.file_url && (
                            <div className="text-[10px] text-slate-400 font-medium">📄 Fichier déposé : <strong className="text-slate-600 font-mono font-bold">Inclus</strong></div>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                          <span>Déposé le {p.date}</span>
                          <button onClick={() => navigateToModuleInGame(p.moduleId)} className="text-amber-700 hover:text-amber-900 font-bold uppercase tracking-wider cursor-pointer text-[9px] bg-amber-50 px-2.5 py-1 rounded">🎯 Voir dans le Parcours ➔</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ❌ BLOC 3 : MODULES NON ACCESSIBLES / RESTANTS */}
          {(portfolioFilter === 'all' || portfolioFilter === 'not_started') && (
            <div className="space-y-3 pt-2">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-black text-xs text-slate-500 uppercase tracking-wider"> ❌ Restants de mes Formations </h4>
              </div>
              {(() => {
                const joinedFormationIds = mySessionsData.map(s => s.tree_id).filter(Boolean);
                const pendingModules = modules.filter(m => {
                  const isNotDone = !completedModuleIds.has(m.id);
                  const isInJoinedFormations = joinedFormationIds.some(formationId => {
                    const formation = formations[formationId];
                    const floors = formation?.floors || [];
                    return floors.some(floor => (floor.quests || []).map(id => String(id)).includes(String(m.id)));
                  });
                  return isNotDone && isInJoinedFormations;
                });

                if (pendingModules.length === 0) {
                  return <div className="bg-emerald-50/10 border border-emerald-100 p-5 rounded-2xl text-center text-xs text-emerald-800 font-bold">🎉 Félicitations ! Vous avez validé tous les modules de vos formations !</div>;
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingModules.map(m => {
                      const isModuleCollab = m.is_collaborative === true || m.is_collaborative === 'true';
                      const isStartedButPending = pendingCollabModuleIds.has(m.id);

                      let isModuleLockedInCatalogue = true;
                      for (const sItem of mySessionsData) {
                        const targetFormation = formations[sItem.tree_id];
                        if (targetFormation && targetFormation.floors) {
                          const currentSavedFloor = allUnlockedFloors[sItem.tree_id];
                          const savedFloorIdx = currentSavedFloor ? parseInt(currentSavedFloor, 10) : 0;
                          const floorIdxForModule = targetFormation.floors.findIndex(f => (f.quests || []).map(id => String(id)).includes(String(m.id)));
                          
                          if (floorIdxForModule !== -1 && floorIdxForModule <= savedFloorIdx) {
                            isModuleLockedInCatalogue = false;
                            break;
                          }
                        }
                      }

                      return (
                        <div key={m.id} className={`bg-white border rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:border-slate-300 transition-all relative ${isModuleLockedInCatalogue ? 'border-slate-100 opacity-60 bg-slate-50/50' : 'border-slate-200'}`}>
                          {isModuleLockedInCatalogue && (
                            <div className="absolute top-3 right-3 text-[9px] font-black tracking-wider text-slate-400 bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded uppercase">🔒 Palier Verrouillé</div>
                          )}
                          <div>
                            <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-400">
                              <span>{m.theme === 'env' ? '🌍 RSE' : '⚙️ TECH'}</span>
                              <span className={isModuleCollab ? 'text-teal-600' : 'text-slate-500'}>{isModuleCollab ? '🤝 ÉQUIPE' : '👤 SOLO'}</span>
                            </div>
                            <h5 className={`font-black text-xs mt-2 leading-tight ${isModuleCollab ? 'text-slate-800' : 'text-slate-700'}`}>{isModuleCollab && <span className="mr-1">🤝</span>}{m.name}</h5>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 italic font-medium">"{m.desc}"</p>
                          </div>
                          
                          <div className={`flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] ${isModuleLockedInCatalogue ? 'opacity-20' : ''}`}>
                            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">
                              {isStartedButPending ? '⏳ En attente' : '❌ Non initié'}
                            </span>
                            <button 
                              disabled={isModuleLockedInCatalogue}
                              onClick={() => navigateToModuleInGame(m.id)} 
                              className="text-slate-600 hover:text-slate-900 font-black uppercase tracking-wider cursor-pointer text-[9px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded hover:bg-slate-100 disabled:opacity-30"
                            >
                              🚀 Ouvrir le module ➔
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
