// src/screens/StudentDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function StudentDashboardScreen({ trees, quests }) {
  const [user, setUser] = useState(null);
  // On stocke la liste sous forme de tableau standard (qui sera sérialisé en JSON en BDD)
  const [sessionCodesList, setSessionCodesList] = useState([]); 
  const [mySessionsData, setMySessionsData] = useState([]); 
  const [selectedSessionCode, setSelectedSessionCode] = useState(null); 
  const [selectedTreeId, setSelectedTreeId] = useState(null); 
  
  const [accessCode, setAccessCode] = useState('');
  const [activeTab, setActiveTab] = useState('parcours'); 
  
  // FILTRES DE JEU
  const [filterTheme, setFilterTheme] = useState('all');
  const [filterPoints, setFilterPoints] = useState('all');

  // ÉTATS DE SUIVI UNIQUE
  const [unlockedFloorIndex, setUnlockedFloorIndex] = useState(0); 
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0); 
  
  // 🛡️ ÉTAT ANTI-SPAM
  const [completedQuestIds, setCompletedQuestIds] = useState(new Set());

  // PORTFOLIO EN DIRECT DEPUIS SUPABASE
  const [productions, setProductions] = useState([]);

  const [activeQuest, setActiveQuest] = useState(null); 
  const [livrableContent, setLivrableContent] = useState(''); 
  const [attachedFile, setAttachedFile] = useState(null);
  const [triggerDropAnimation, setTriggerDropAnimation] = useState(false); 

  const POINTS_REQUIRED_PER_FLOOR = 300;

  // 🔑 1. RÉCUPÉRATION DE L'UTILISATEUR ET DE SES SESSIONS (JSON)
  useEffect(() => {
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);

        // On récupère le champ JSONB 'session_codes'
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('session_codes')
          .eq('id', session.user.id)
          .single();

        if (profile?.session_codes && Array.isArray(profile.session_codes) && !profileError) {
          setSessionCodesList(profile.session_codes);
          fetchSessionsDetails(profile.session_codes);
        }
      }
    };
    getUserData();
  }, []);

  // Charger les arbres correspondants aux codes de sessions
  const fetchSessionsDetails = async (codes) => {
    if (!codes || codes.length === 0) return;

    // Correction de la requête pour matcher le type de données stocké (code ou ID)
    const { data: sessionsData, error } = await supabase
      .from('sessions')
      .select('id, session_code, tree_id')
      .in('session_code', codes);

    if (sessionsData && !error) {
      setMySessionsData(sessionsData);
    }
  };

  // 📥 2. SYNCHRONISATION DU PORTFOLIO
  const fetchStudentProductions = async () => {
    if (!user) return;

    const { data: prods, error } = await supabase
      .from('productions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (prods && !error) {
      setCompletedQuestIds(new Set(prods.map(p => p.quest_id)));
      
      const formattedProds = prods.map(p => ({
        id: p.id,
        studentId: p.student_id,
        questId: p.quest_id,
        questName: p.quest_name,
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

  // PERSISTANCE DES ÉTAGES EN LOCALSTORAGE
  useEffect(() => {
    if (selectedTreeId && user) {
      localStorage.setItem(
        `ecolearn_floor_${user.id}_${selectedTreeId}`, 
        unlockedFloorIndex.toString()
      );
    }
  }, [unlockedFloorIndex, user, selectedTreeId]);

  useEffect(() => {
    if (selectedTreeId && user) {
      const savedFloor = localStorage.getItem(`ecolearn_floor_${user.id}_${selectedTreeId}`);
      const floorIdx = savedFloor ? parseInt(savedFloor, 10) : 0;
      setUnlockedFloorIndex(floorIdx);
      setCurrentFloorIndex(0); 
      setActiveQuest(null);
    }
  }, [user, selectedTreeId]);

  // 💾 3. COUPLAGE ET ENREGISTREMENT JSON DANS SUPABASE
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

    // Vérification de l'existence de la session via le code textuel saisi
    const { data: targetSession, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_code', inputCode)
      .single();

    if (sessionError || !targetSession) {
      alert("❌ Code de session inconnu.");
      return;
    }

    // Sécurité de type : On pousse le code textuel validé par la BDD (ou targetSession.session_code)
    const updatedSessionCodes = [...sessionCodesList, targetSession.session_code];

    // Sauvegarde du tableau JSON directement dans Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ session_codes: updatedSessionCodes }) 
      .eq('id', user.id);

    if (updateError) {
      console.error("Détails erreur Supabase:", updateError.message);
      alert("❌ Erreur de sauvegarde BDD.");
    } else {
      setSessionCodesList(updatedSessionCodes);
      setMySessionsData([...mySessionsData, { id: targetSession.id, session_code: targetSession.session_code, tree_id: targetSession.tree_id }]);
      
      setSelectedSessionCode(targetSession.session_code);
      setSelectedTreeId(targetSession.tree_id);
      setCurrentFloorIndex(0);
      setAccessCode('');
      alert(`🎉 Session "${targetSession.session_code}" ajoutée ad aeternam !`);
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

  const globalCompletedQuestIds = productions.map(p => p.questId);

  const studentPoints = productions.reduce((sum, prod) => { 
    const originalQuest = quests.find(q => q.id === prod.questId);
    if (originalQuest) {
      return sum + getPointsByDifficulty(originalQuest.difficulty);
    }
    return sum + 100; 
  }, 0);

  const handleSubmitLivrable = async (e) => {
    e.preventDefault();
    if (!livrableContent.trim()) return;
    if (completedQuestIds.has(activeQuest.id)) return;
    if (!user) return;

    const pointsGagnes = getPointsByDifficulty(activeQuest.difficulty);

    const { error } = await supabase
      .from('productions')
      .insert([
        {
          student_id: user.id,          
          student_email: user.email,    
          quest_id: activeQuest.id,     
          quest_name: activeQuest.name,
          content: livrableContent,     
          file_url: attachedFile ? attachedFile.data : null 
        }
      ]);

    if (!error) {
      await fetchStudentProductions();
      alert(`🎉 Livrable envoyé ! +${pointsGagnes} XP.`);
      setLivrableContent('');
      setAttachedFile(null);
    }
  };

  const handleImportPreviousProduction = async () => {
    if (completedQuestIds.has(activeQuest.id)) return;
    if (!user) return;

    const previousSubmission = productions.find(p => p.questId === activeQuest.id);
    if (!previousSubmission) return;

    const pointsGagnes = getPointsByDifficulty(activeQuest.difficulty);

    const { error } = await supabase
      .from('productions')
      .insert([
        {
          student_id: user.id,
          student_email: user.email,
          quest_id: activeQuest.id,
          quest_name: activeQuest.name,
          content: `[Importé de l'historique] ${previousSubmission.content}`,
          file_url: previousSubmission.file_url || null
        }
      ]);

    if (!error) {
      await fetchStudentProductions();
      alert(`🔄 Travail synchronisé ! +${pointsGagnes} XP.`);
    }
  };

  const uniqueLivrables = productions.filter(p => !p.content.startsWith("[Importé"));
  const isActiveQuestDone = activeQuest ? completedQuestIds.has(activeQuest.id) : false;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative">
      <style>{`
        @keyframes customBounce {
          0% { transform: translateY(-80px); animation-timing-function: ease-in; opacity: 0; }
          60% { transform: translateY(0); animation-timing-function: ease-out; opacity: 1; }
          80% { transform: translateY(-10px); animation-timing-function: ease-in; }
          100% { transform: translateY(0); }
        }
        .animate-drop-bounce { animation: customBounce 0.6s forwards; }
      `}</style>

      {/* BANNIÈRE SCORE */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 font-black px-3 py-1.5 rounded-lg text-sm shadow">
            ✨ {studentPoints} XP TOTAL
          </div>
          <div className="text-xs text-slate-300">
            Profil : <span className="font-bold text-white">{user?.email || "Chargement..."}</span>
            {selectedSessionCode && <span> | Session active : <strong className="text-emerald-400 font-mono">{selectedSessionCode}</strong></span>}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 gap-4">
        <button onClick={() => { setActiveTab('parcours'); setSelectedSessionCode(null); setSelectedTreeId(null); setActiveQuest(null); }} className={`pb-3 text-sm font-bold border-b-2 px-2 ${activeTab === 'parcours' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400'}`}>🌳 Mes Sessions & Parcours</button>
        <button onClick={() => { setActiveTab('portfolio'); setActiveQuest(null); }} className={`pb-3 text-sm font-bold border-b-2 px-2 ${activeTab === 'portfolio' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400'}`}>📂 Mon Portfolio ({uniqueLivrables.length})</button>
      </div>

      {/* LISTE DES SESSIONS ACCESSIBLES */}
      {activeTab === 'parcours' && !selectedSessionCode && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">🧠 Vos sessions actives</h3>
              {mySessionsData.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center text-xs text-slate-400 italic font-medium">
                  Vous n'avez rejoint aucune session pour le moment. Utilisez un code d'accès à droite !
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mySessionsData.map(sessionItem => {
                    const linkedTree = trees[sessionItem.tree_id];
                    return (
                      <div key={sessionItem.session_code} className="bg-white border-2 border-slate-100 hover:border-emerald-500/30 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-6 group relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 group-hover:bg-emerald-500 transition-colors" />
                        <div>
                          <span className="text-[10px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase">CODE : {sessionItem.session_code}</span>
                          <h4 className="text-sm font-black text-slate-800 mt-2.5 leading-snug">
                            Arbre : {linkedTree ? linkedTree.name : `Chargement (${sessionItem.tree_id})`}
                          </h4>
                        </div>
                        <button 
                          onClick={() => { 
                            setSelectedSessionCode(sessionItem.session_code); 
                            setSelectedTreeId(sessionItem.tree_id); 
                          }} 
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          🚀 Entrer dans la session
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-slate-50/80 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <div>
                <h4 className="font-black text-xs uppercase tracking-wide text-slate-800 flex items-center gap-1.5">🔑 Ajouter une session</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">Saisissez un nouveau code pour ajouter un espace de formation à votre liste.</p>
              </div>
              <form onSubmit={handleJoinSession} className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Ex: ORANGE-LILLE-26" 
                  value={accessCode} 
                  onChange={(e) => setAccessCode(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold uppercase focus:outline-none focus:border-emerald-500" 
                />
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-3 rounded-xl transition-all uppercase tracking-wider shadow-sm cursor-pointer">
                  Ajouter la session
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ZONE DE JEU D'UNE SESSION ACTIVE */}
      {activeTab === 'parcours' && selectedSessionCode && selectedTreeId && trees[selectedTreeId] && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500 bg-white px-4 py-2 border rounded-xl shadow-sm">
              <button onClick={() => { setSelectedSessionCode(null); setSelectedTreeId(null); setActiveQuest(null); }} className="font-bold text-slate-400 hover:text-slate-600 cursor-pointer">⬅️ Changer de session</button>
              <span className="font-black text-slate-700 truncate">Session : <strong className="font-mono bg-slate-100 px-2 py-0.5 rounded">{selectedSessionCode}</strong></span>
            </div>

            {(() => {
              const allFloors = trees[selectedTreeId].floors || [];
              const totalPaliers = allFloors.length;
              if (totalPaliers === 0) return null;

              const safeUnlockedIndex = Math.min(unlockedFloorIndex, totalPaliers - 1);
              const safeCurrentIndex = Math.min(currentFloorIndex, safeUnlockedIndex);
              const activeFloor = allFloors[safeCurrentIndex];
              
              const nextFloorRequirement = (safeUnlockedIndex + 1) * POINTS_REQUIRED_PER_FLOOR;
              const assezDePointsPourSuivant = studentPoints >= nextFloorRequirement;
              const pointsManquants = nextFloorRequirement - studentPoints;

              return (
                <div className="flex gap-4 items-stretch">
                  <div className="flex flex-col items-center py-2 gap-3 bg-slate-100/60 px-2 rounded-xl border w-11 shrink-0">
                    {allFloors.map((floor, idx) => {
                      const isUnlocked = idx <= safeUnlockedIndex;
                      const isActive = idx === safeCurrentIndex;
                      return (
                        <button key={floor.floorId} disabled={!isUnlocked} onClick={() => { setCurrentFloorIndex(idx); setActiveQuest(null); }} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black cursor-pointer ${isActive ? 'bg-emerald-600 text-white' : isUnlocked ? 'bg-white border' : 'bg-slate-200 text-slate-400 opacity-50'}`}>{isUnlocked ? floor.floorId : '🔒'}</button>
                      );
                    })}
                  </div>

                  <div className={`flex-1 bg-white border rounded-2xl p-5 shadow-sm space-y-4 relative ${triggerDropAnimation ? 'animate-drop-bounce' : ''}`}>
                    <div className="text-[11px] border-b pb-2 text-slate-400 font-bold uppercase">Palier {activeFloor.floorId} ({trees[selectedTreeId].name})</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(quests.filter(q => (activeFloor.quests || []).includes(q.id))).map(quest => {
                        const isSelected = activeQuest?.id === quest.id;
                        const isDoneHere = completedQuestIds.has(quest.id);
                        const isDoneElsewhere = globalCompletedQuestIds.includes(quest.id) && !isDoneHere;

                        return (
                          <button key={quest.id} onClick={() => setActiveQuest(quest)} className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${isSelected ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/10' : isDoneHere ? 'bg-emerald-50/60 border-emerald-200' : isDoneElsewhere ? 'bg-amber-50/50 border-amber-300 border-dashed' : 'bg-slate-50'}`}>
                            <div className="flex justify-between items-center text-[10px] font-black">
                              <span className="text-slate-400 uppercase">{quest.theme === 'env' ? '🌍 RSE' : '⚙️ TECH'}</span>
                              {isDoneHere && <span className="text-emerald-600 font-black">Validée ✅</span>}
                              {isDoneElsewhere && <span className="text-amber-600 font-black">Historique 🔄</span>}
                              {!isDoneHere && !isDoneElsewhere && <span className="text-amber-500">{quest.difficulty}★</span>}
                            </div>
                            <h4 className="text-xs font-bold mt-0.5 text-slate-900">{quest.name}</h4>
                          </button>
                        );
                      })}
                    </div>

                    {safeCurrentIndex === safeUnlockedIndex && safeCurrentIndex < totalPaliers - 1 && (
                      <div className="pt-3 border-t flex items-center justify-between text-[11px]">
                        <div>{!assezDePointsPourSuivant ? <span>🔒 Il manque <strong className="text-slate-600">{pointsManquants} XP</strong></span> : <span className="text-emerald-600 font-bold">🌟 Prêt !</span>}</div>
                        <button disabled={!assezDePointsPourSuivant} onClick={() => { setTriggerDropAnimation(true); setTimeout(() => setTriggerDropAnimation(false), 600); setUnlockedFloorIndex(safeCurrentIndex + 1); setCurrentFloorIndex(safeCurrentIndex + 1); setActiveQuest(null); }} className={`font-black px-4 py-2 rounded-xl transition-all cursor-pointer ${assezDePointsPourSuivant ? 'bg-slate-950 text-white scale-105 shadow-md' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>Débloquer le palier suivant ➔</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* COLONNE DETRAVAIL / DETAILS DE MISSION */}
          <div className="space-y-4">
            {activeQuest ? (
              <div className="bg-white border-2 border-purple-200 p-5 rounded-2xl shadow-md space-y-4 sticky top-24">
                {(() => {
                  const isDoneHere = completedQuestIds.has(activeQuest.id);
                  const isDoneElsewhere = globalCompletedQuestIds.includes(activeQuest.id) && !isDoneHere;

                  return (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`font-bold text-[9px] px-2 py-0.5 rounded uppercase ${isDoneHere ? 'bg-emerald-100 text-emerald-800' : isDoneElsewhere ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'}`}>
                            {isDoneHere ? 'Validée' : isDoneElsewhere ? 'Dans vos archives' : 'Mission Active'}
                          </span>
                          <h3 className="font-black text-slate-900 text-sm mt-1">{activeQuest.name}</h3>
                        </div>
                        <button onClick={() => setActiveQuest(null)} className="text-slate-400 text-xs font-bold">✕</button>
                      </div>

                      <p className="text-xs text-slate-600 italic">"{activeQuest.desc}"</p>

                      {isDoneHere && (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-4 text-center text-xs font-bold">
                          ✅ Mission accomplie !
                        </div>
                      )}

                      {isDoneElsewhere && !isActiveQuestDone && (
                        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-center space-y-3">
                          <p className="text-xs text-amber-900 font-medium leading-snug">💡 Vous avez déjà résolu cet exercice dans une autre de vos sessions ! L'importer ?</p>
                          <button onClick={handleImportPreviousProduction} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-2 rounded-xl text-xs uppercase tracking-wide transition-all shadow cursor-pointer">🔄 Importer mon travail (+{getPointsByDifficulty(activeQuest.difficulty)} XP)</button>
                        </div>
                      )}

                      {!isDoneHere && !isDoneElsewhere && (
                        <form onSubmit={handleSubmitLivrable} className="space-y-3">
                          <textarea required rows="4" value={livrableContent} onChange={(e) => setLivrableContent(e.target.value)} placeholder="Collez votre réponse ou lien..." className="w-full bg-slate-50 border rounded-xl p-3 text-xs focus:border-purple-500 focus:outline-none" />
                          
                          <div className="space-y-1.5 border-t pt-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">📁 Joindre un justificatif</label>
                            <input type="file" onChange={handleFileChange} className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer" />
                            {attachedFile && <p className="text-[10px] text-emerald-600 font-bold">✓ {attachedFile.name} chargé</p>}
 Espaces de formation                      </div>

                          <button type="submit" disabled={isActiveQuestDone} className={`w-full font-bold py-2 rounded-xl text-xs uppercase mt-2 text-white transition-all cursor-pointer ${isActiveQuestDone ? 'bg-slate-300 cursor-not-allowed' : 'bg-purple-700 hover:bg-purple-600'}`}>
                            {isActiveQuestDone ? "✅ Déjà validée" : "💾 Déposer le livrable"}
                          </button>
                        </form>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-slate-100 border border-dashed rounded-2xl p-6 text-center text-xs text-slate-400 py-12">🎯 Sélectionnez une mission pour commencer.</div>
            )}
          </div>
        </div>
      )}

      {/* PORTFOLIO TECHNIQUE FILTRABLE */}
      {activeTab === 'portfolio' && user && (
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">🎛️ Centre de Tri</h3>
              <p className="text-[11px] text-slate-400">Filtrez vos travaux en temps réel.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white cursor-pointer">
                <option value="all">🌍 Toutes les catégories</option>
                <option value="env">🌱 RSE & Environnement</option>
                <option value="tech">⚙️ Code & Tech</option>
              </select>
              <select value={filterPoints} onChange={(e) => setFilterPoints(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white cursor-pointer">
                <option value="all">✨ Tous les scores</option>
                <option value="100">⭐ 100 XP</option>
                <option value="250">⭐⭐ 250 XP</option>
                <option value="500">⭐⭐⭐ 500 XP</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                🏆 Mes Réussites uniques <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-mono font-bold">{uniqueLivrables.length}</span>
              </h3>
            </div>
            {uniqueLivrables.length === 0 ? (
              <div className="bg-white border rounded-2xl p-8 text-center text-xs text-slate-400 italic font-medium">Aucun rendu trouvé en base de données.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueLivrables.filter(p => {
                  const originalQuest = quests.find(q => q.id === p.questId);
                  if (!originalQuest) return true;
                  const pts = getPointsByDifficulty(originalQuest.difficulty);
                  const matchTheme = filterTheme === 'all' || originalQuest.theme === filterTheme;
                  const matchPoints = filterPoints === 'all' || pts === parseInt(filterPoints, 10);
                  return matchTheme && matchPoints;
                }).map(p => {
                  const originalQuest = quests.find(q => q.id === p.questId);
                  const pts = originalQuest ? getPointsByDifficulty(originalQuest.difficulty) : 100;
                  return (
                    <div key={p.id} className="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
                      <div>
                        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400">
                          <span className="uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p.questId}</span>
                          <span className="text-emerald-600 font-black">+{pts} XP</span>
                        </div>
                        <h4 className="font-black text-xs text-slate-800 mt-2.5 leading-snug">{p.questName}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-3 font-medium italic">"{p.content}"</p>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium text-right font-mono">Soumis le {p.date}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}