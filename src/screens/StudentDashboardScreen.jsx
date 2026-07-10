// src/screens/StudentDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function StudentDashboardScreen({ trees = {}, quests = [] }) {
  const [user, setUser] = useState(null);
  const [sessionCodesList, setSessionCodesList] = useState([]); 
  const [mySessionsData, setMySessionsData] = useState([]); 
  const [selectedSessionCode, setSelectedSessionCode] = useState(null); 
  const [selectedTreeId, setSelectedTreeId] = useState(null); 
  
  const [accessCode, setAccessCode] = useState('');
  const [activeTab, setActiveTab] = useState('parcours'); 
  
  // FILTRES DE JEU
  const [filterTheme, setFilterTheme] = useState('all');
  const [filterMode, setFilterMode] = useState('all'); 
  const [portfolioFilter, setPortfolioFilter] = useState('all'); // 'all', 'validated', 'pending', 'not_started'

  // ÉTATS DE SUIVI UNIQUE
  const [unlockedFloorIndex, setUnlockedFloorIndex] = useState(0); 
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0); 
  const [triggerDropAnimation, setTriggerDropAnimation] = useState(false); 
  
  // 🛡️ ÉTAT DU PORTFOLIO ET VALIDATIONS
  const [completedQuestIds, setCompletedQuestIds] = useState(new Set());
  const [pendingCollabQuestIds, setPendingCollabQuestIds] = useState(new Set());

  // TOUTES LES PRODUCTIONS (De la session en cours ou passées)
  const [productions, setProductions] = useState([]);

  const [activeQuest, setActiveQuest] = useState(null); 
  const [livrableContent, setLivrableContent] = useState(''); 
  const [attachedFile, setAttachedFile] = useState(null);

  const POINTS_REQUIRED_PER_FLOOR = 300;

  // ✨ Helper pour encoder/décoder proprement le contenu sans polluer le texte de l'élève
  // On stocke un JSON dans la colonne `content` de Supabase pour séparer le texte du hash technique !
  const encodeProductionContent = (text, status, hash = '') => {
    return JSON.stringify({ text, status, hash });
  };

  const parseProductionContent = (rawContent) => {
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        return { text: parsed.text, status: parsed.status, hash: parsed.hash || '' };
      }
    } catch (e) {
      // Rétrocompatibilité si d'anciens rendus textuels existent encore
      if (rawContent.includes('[EN_ATTENTE_COLLAB]')) {
        return { text: rawContent.replace(/\[.*?\]/g, '').trim(), status: 'pending', hash: '' };
      }
      if (rawContent.includes('[VALIDE_COLLAB]')) {
        return { text: rawContent.replace(/\[.*?\]/g, '').trim(), status: 'validated', hash: '' };
      }
    }
    return { text: rawContent, status: 'validated', hash: '' };
  };

  // 🔑 Génération du Hash Unique d'Équipe (Fichier + Session + Quête)
  const generateLivrableHash = (questId, sessionCode, filename = '') => {
    return `collab_${questId}_${sessionCode}_${filename.replace(/[^a-zA-Z0-9]/g, '')}`.toLowerCase();
  };

  // 1. RÉCUPÉRATION DE L'UTILISATEUR ET DE SES SESSIONS
  useEffect(() => {
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);

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

  // 📥 2. SYNCHRONISATION DU PORTFOLIO EN DIRECT (Toutes les sessions confondues pour l'historique global)
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
        const parsed = parseProductionContent(p.content);
        if (parsed.status === 'pending') {
          pending.add(p.quest_id);
        } else {
          validated.add(p.quest_id);
        }
      });

      setCompletedQuestIds(validated);
      setPendingCollabQuestIds(pending);
      
      const formattedProds = prods.map(p => {
        const parsed = parseProductionContent(p.content);
        return {
          id: p.id,
          studentId: p.student_id,
          questId: p.quest_id,
          questName: p.quest_name,
          pureText: parsed.text,      // Texte propre nettoyé
          status: parsed.status,      // 'validated' ou 'pending'
          hash: parsed.hash,          // Signature de fichier
          date: new Date(p.created_at).toLocaleDateString('fr-FR'),
          file_url: p.file_url
        };
      });
      setProductions(formattedProds);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStudentProductions();
    }
  }, [user]);

  // PERSISTANCE DES ÉTAGES
  useEffect(() => {
    if (selectedTreeId && user) {
      localStorage.setItem(`ecolearn_floor_${user.id}_${selectedTreeId}`, unlockedFloorIndex.toString());
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
      .update({ session_codes: updatedSessionCodes }) 
      .eq('id', user.id);

    if (updateError) {
      alert("❌ Erreur de sauvegarde BDD.");
    } else {
      setSessionCodesList(updatedSessionCodes);
      setMySessionsData([...mySessionsData, { id: targetSession.id, session_code: targetSession.session_code, tree_id: targetSession.tree_id }]);
      setSelectedSessionCode(targetSession.session_code);
      setSelectedTreeId(targetSession.tree_id);
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

  // Les quêtes complétées de manière générale (toutes sessions) par cet élève
  const globalCompletedQuestIds = productions
    .filter(p => p.status === 'validated')
    .map(p => p.questId);

  // Score total calculé uniquement sur les quêtes validées
  const studentPoints = productions.reduce((sum, prod) => { 
    if (prod.status === 'pending') return sum;
    const originalQuest = quests.find(q => q.id === prod.questId);
    return originalQuest ? sum + getPointsByDifficulty(originalQuest.difficulty) : sum + 100; 
  }, 0);

  // 👥 SOUMISSION AVEC DOUBLE DÉPÔT RÉSEAU JUSQU'À N COÉQUIPIERS
  const handleSubmitLivrable = async (e) => {
    e.preventDefault();
    if (!livrableContent.trim()) return;
    if (completedQuestIds.has(activeQuest.id)) return;
    if (!user) return;

    const isQuestCollab = activeQuest.is_collaborative === true || activeQuest.is_collaborative === 'true';
    const reqPartners = parseInt(activeQuest.required_partners, 10) || 2; // Par défaut 2 si non spécifié
    
    let dbStatus = 'validated';
    let currentHash = '';

    if (isQuestCollab) {
      if (!attachedFile) {
        alert("⚠️ Un livrable (fichier joint) est obligatoire pour soumettre une mission en équipe.");
        return;
      }

      currentHash = generateLivrableHash(activeQuest.id, selectedSessionCode, attachedFile.name);

      // Chercher tous les autres élèves ayant déposé EXACTEMENT le même fichier dans CETTE session
      const { data: matchingSubmissions, error: checkError } = await supabase
        .from('productions')
        .select('id, student_email, content')
        .eq('quest_id', activeQuest.id);

      if (checkError) {
        alert("❌ Erreur réseau lors de la vérification.");
        return;
      }

      // Filtrer localement les dépôts qui possèdent le même hash (qu'ils soient validés ou en attente)
      const sameHashSubmissions = (matchingSubmissions || []).filter(sub => {
        const parsed = parseProductionContent(sub.content);
        return parsed.hash === currentHash;
      });

      // Le nombre total de personnes (en comptant le joueur actuel) qui auront déposé ce fichier
      const totalDepositorsCount = sameHashSubmissions.length + 1;

      if (totalDepositorsCount >= reqPartners) {
        // 🎉 Le quota est atteint ! On valide TOUT LE MONDE d'un coup (le joueur actuel ET tous les partenaires en attente)
        dbStatus = 'validated';

        // Mettre à jour les partenaires qui étaient au statut 'pending'
        for (const sub of sameHashSubmissions) {
          const parsed = parseProductionContent(sub.content);
          if (parsed.status === 'pending') {
            const updatedContent = encodeProductionContent(parsed.text, 'validated', currentHash);
            await supabase
              .from('productions')
              .update({ content: updatedContent })
              .eq('id', sub.id);
          }
        }

        alert(`🎉 Félicitations ! Vous êtes le ${totalDepositorsCount}ème coéquipier à déposer ce fichier. Le quota de ${reqPartners} partenaires est atteint ! La quête est VALIDÉE pour toute l'équipe ! 🏆`);
      } else {
        // ⏳ Le quota n'est pas encore atteint (ex: 1er sur 2, ou 2e sur 3)
        dbStatus = 'pending';
        const placesRestantes = reqPartners - totalDepositorsCount;
        alert(`⏳ Dépôt enregistré (${totalDepositorsCount}/${reqPartners}) ! La quête reste en attente. Il faut que encore ${placesRestantes} coéquipier(s) dépose(nt) exactement le même fichier ("${attachedFile.name}") pour débloquer les points.`);
      }
    }

    // Sauvegarde en Base de données au format JSON propre
    const finalDbContent = encodeProductionContent(livrableContent.trim(), dbStatus, currentHash);

    const { error } = await supabase
      .from('productions')
      .insert([
        {
          student_id: user.id,          
          student_email: user.email,    
          quest_id: activeQuest.id,     
          quest_name: activeQuest.name,
          content: finalDbContent,     
          file_url: attachedFile ? attachedFile.data : null 
        }
      ]);

    if (!error) {
      await fetchStudentProductions();
      setLivrableContent('');
      setAttachedFile(null);
    }
  };

  // 🔄 PASSERELLE D'IMPORTATION GLOBALE D'HISTORIQUE
  const handleImportPreviousProduction = async () => {
    if (completedQuestIds.has(activeQuest.id)) return;
    if (!user) return;

    // Trouver le premier rendu valide de cette quête dans TOUTES les productions de l'étudiant (sessions passées)
    const previousValidSubmission = productions.find(p => p.questId === activeQuest.id && p.status === 'validated');
    if (!previousValidSubmission) return;

    // Réencoder au format propre pour la session en cours
    const importedContent = encodeProductionContent(
      `[Importé de l'historique] ${previousValidSubmission.pureText}`,
      'validated',
      ''
    );

    const { error } = await supabase
      .from('productions')
      .insert([
        {
          student_id: user.id,
          student_email: user.email,
          quest_id: activeQuest.id,
          quest_name: activeQuest.name,
          content: importedContent,
          file_url: previousValidSubmission.file_url || null
        }
      ]);

    if (!error) {
      await fetchStudentProductions();
      alert(`🔄 Travail synchronisé avec succès dans votre session actuelle ! Points accordés.`);
    }
  };

  // Redirection intelligente vers l'arbre de jeu
  const navigateToQuestInGame = (questId) => {
    let foundSessionCode = selectedSessionCode;
    let foundTreeId = selectedTreeId;
    let foundFloorIdx = 0;
    let foundQuestObj = quests.find(q => q.id === questId);

    if (!foundQuestObj) return;

    for (const sessionItem of mySessionsData) {
      const associatedTree = trees[sessionItem.tree_id];
      if (associatedTree && associatedTree.floors) {
        const floorIndex = associatedTree.floors.findIndex(floor => (floor.quests || []).includes(questId));
        if (floorIndex !== -1) {
          foundSessionCode = sessionItem.session_code;
          foundTreeId = sessionItem.tree_id;
          foundFloorIdx = floorIndex;
          break;
        }
      }
    }

    if (foundSessionCode && foundTreeId) {
      setSelectedSessionCode(foundSessionCode);
      setSelectedTreeId(foundTreeId);
      setCurrentFloorIndex(foundFloorIdx);
      setActiveQuest(foundQuestObj);
      setActiveTab('parcours');
    } else {
      alert("💡 Pour voir cette mission dans le parcours, assurez-vous d'avoir rejoint la session correspondante.");
    }
  };

  // On exclut les lignes pures d'imports visuels pour ne pas dupliquer l'historique d'affichage
  const uniqueLivrables = productions.filter(p => !p.pureText.startsWith("[Importé"));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative">
      <style>{`
        @keyframes customBounce {
          0% { transform: translateY(-80px); opacity: 0; }
          60% { transform: translateY(0); opacity: 1; }
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
            {selectedSessionCode && <span> | Session : <strong className="text-emerald-400 font-mono">{selectedSessionCode}</strong></span>}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 gap-4">
        <button onClick={() => { setActiveTab('parcours'); setSelectedSessionCode(null); setSelectedTreeId(null); setActiveQuest(null); }} className={`pb-3 text-sm font-bold border-b-2 px-2 ${activeTab === 'parcours' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400'}`}>🌳 Mes Sessions & Parcours</button>
        <button onClick={() => { setActiveTab('portfolio'); setActiveQuest(null); }} className={`pb-3 text-sm font-bold border-b-2 px-2 ${activeTab === 'portfolio' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400'}`}>📂 Mon Portfolio ({uniqueLivrables.length})</button>
      </div>

      {/* LISTE DES SESSIONS */}
      {activeTab === 'parcours' && !selectedSessionCode && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">🧠 Vos sessions actives</h3>
              {mySessionsData.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center text-xs text-slate-400 italic">Vous n'avez rejoint aucune session.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mySessionsData.map(sessionItem => {
                    const linkedTree = trees[sessionItem.tree_id];
                    return (
                      <div key={sessionItem.session_code} className="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-6">
                        <div>
                          <span className="text-[10px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase">CODE : {sessionItem.session_code}</span>
                          <h4 className="text-sm font-black text-slate-800 mt-2.5">Arbre : {linkedTree ? linkedTree.name : `Chargement...`}</h4>
                        </div>
                        <button onClick={() => { setSelectedSessionCode(sessionItem.session_code); setSelectedTreeId(sessionItem.tree_id); }} className="w-full bg-emerald-600 hover:bg-emerald-50 text-white font-black py-3 rounded-xl text-xs transition-all cursor-pointer">🚀 Entrer dans la session</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="bg-slate-50/80 border border-slate-200/60 p-5 rounded-2xl space-y-4">
              <h4 className="font-black text-xs uppercase text-slate-800">🔑 Ajouter une session</h4>
              <form onSubmit={handleJoinSession} className="space-y-2">
                <input type="text" placeholder="Ex: ORANGE-LILLE-26" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold uppercase focus:outline-none focus:border-emerald-500" />
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-3 rounded-xl transition-all uppercase cursor-pointer">Ajouter</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ZONE DE JEU */}
      {activeTab === 'parcours' && selectedSessionCode && selectedTreeId && trees[selectedTreeId] && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3 bg-white px-4 py-3 border rounded-xl shadow-sm">
              <button onClick={() => { setSelectedSessionCode(null); setSelectedTreeId(null); setActiveQuest(null); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer">⬅️ Retour</button>
              <div className="flex items-center gap-2">
                <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)} className="bg-slate-50 border rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 cursor-pointer"><option value="all">🌱 Toutes catégories</option><option value="env">🌍 RSE</option><option value="tech">⚙️ Tech</option></select>
                <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="bg-slate-50 border rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 cursor-pointer"><option value="all">🤝 Tous les modes</option><option value="solo">👤 Missions Solo</option><option value="collab">👥 Missions Co-op (🤝)</option></select>
              </div>
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

              const filteredQuestsOnFloor = (quests.filter(q => (activeFloor.quests || []).includes(q.id))).filter(quest => {
                const matchTheme = filterTheme === 'all' || quest.theme === filterTheme;
                const isQuestCollab = quest.is_collaborative === true || quest.is_collaborative === 'true';
                const matchMode = filterMode === 'all' || (filterMode === 'collab' && isQuestCollab) || (filterMode === 'solo' && !isQuestCollab);
                return matchTheme && matchMode;
              });

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
                    <div className="text-[11px] border-b pb-2 text-slate-400 font-bold uppercase">Palier {activeFloor.floorId} — {trees[selectedTreeId].name}</div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredQuestsOnFloor.map(quest => {
                        const isSelected = activeQuest?.id === quest.id;
                        const isDoneHere = completedQuestIds.has(quest.id);
                        const isPendingHere = pendingCollabQuestIds.has(quest.id);
                        const isDoneElsewhere = globalCompletedQuestIds.includes(quest.id) && !isDoneHere;
                        const isQuestCollab = quest.is_collaborative === true || quest.is_collaborative === 'true';

                        return (
                          <button 
                            key={quest.id} 
                            onClick={() => setActiveQuest(quest)} 
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/10' 
                                : isDoneHere 
                                  ? 'bg-emerald-50/40 border-emerald-200' 
                                  : isPendingHere
                                    ? 'bg-amber-50/70 border-amber-300 animate-pulse'
                                    : isQuestCollab 
                                      ? 'bg-purple-50/40 border-purple-100 hover:bg-purple-50/80' 
                                      : 'bg-slate-50/80 border-slate-200/60 hover:bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px] font-black">
                              <span className={isQuestCollab ? "text-purple-600 uppercase" : "text-slate-400 uppercase"}>{quest.theme === 'env' ? '🌍 RSE' : '⚙️ TECH'}</span>
                              {isDoneHere && <span className="text-emerald-600">Validée ✅</span>}
                              {isPendingHere && <span className="text-amber-600 font-medium">En attente coéquipier ⏳</span>}
                              {isDoneElsewhere && <span className="text-amber-600">Historique 🔄</span>}
                              {!isDoneHere && !isPendingHere && !isDoneElsewhere && (
                                <span className={isQuestCollab ? "text-purple-600 font-mono" : "text-slate-500 font-mono"}>{isQuestCollab ? `🤝 x${quest.required_partners || 2}` : `${quest.difficulty}★`}</span>
                              )}
                            </div>
                            <h4 className={`text-xs font-bold mt-1 truncate ${isQuestCollab ? 'text-purple-950' : 'text-slate-800'}`}>{isQuestCollab && <span className="mr-1">🤝</span>}{quest.name}</h4>
                          </button>
                        );
                      })}
                    </div>

                    {safeCurrentIndex === safeUnlockedIndex && safeCurrentIndex < totalPaliers - 1 && (
                      <div className="pt-3 border-t flex items-center justify-between text-[11px]">
                        <div>{!assezDePointsPourSuivant ? <span>🔒 Il manque <strong className="text-slate-600">{pointsManquants} XP</strong></span> : <span className="text-emerald-600 font-bold">🌟 Prêt !</span>}</div>
                        <button disabled={!assezDePointsPourSuivant} onClick={() => { setTriggerDropAnimation(true); setTimeout(() => setTriggerDropAnimation(false), 600); setUnlockedFloorIndex(safeCurrentIndex + 1); setCurrentFloorIndex(safeCurrentIndex + 1); setActiveQuest(null); }} className={`font-black px-4 py-2 rounded-xl transition-all cursor-pointer ${assezDePointsPourSuivant ? 'bg-slate-950 text-white scale-105 shadow-md' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>Palier suivant ➔</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* COLONNE DE TRAVAIL CONTEXTUELLE SANS POLUTION DE TEXTE */}
          <div className="space-y-4">
            {activeQuest ? (
              <div className={`bg-white border p-5 rounded-2xl shadow-sm space-y-4 sticky top-24 ${(activeQuest.is_collaborative === true || activeQuest.is_collaborative === 'true') ? 'border-purple-200 shadow-purple-100/40' : 'border-slate-200'}`}>
                {(() => {
                  const isDoneHere = completedQuestIds.has(activeQuest.id);
                  const isPendingHere = pendingCollabQuestIds.has(activeQuest.id);
                  const isDoneElsewhere = globalCompletedQuestIds.includes(activeQuest.id) && !isDoneHere;
                  const isQuestCollab = activeQuest.is_collaborative === true || activeQuest.is_collaborative === 'true';
                  const reqPartners = parseInt(activeQuest.required_partners, 10) || 2;

                  return (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`font-bold text-[9px] px-2 py-0.5 rounded uppercase ${isDoneHere ? 'bg-emerald-100 text-emerald-800' : isPendingHere ? 'bg-amber-100 text-amber-800' : isQuestCollab ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'}`}>
                            {isDoneHere ? 'Validée' : isPendingHere ? '⏳ En attente' : isQuestCollab ? '🤝 Mission Équipe' : '👤 Solo'}
                          </span>
                          <h3 className="font-black text-slate-900 text-sm mt-1">{activeQuest.name}</h3>
                        </div>
                        <button onClick={() => setActiveQuest(null)} className="text-slate-400 text-xs font-bold">✕</button>
                      </div>

                      {isQuestCollab && !isDoneHere && !isPendingHere && (
                        <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
                          <p className="text-[11px] text-purple-900 leading-tight font-medium">
                            🔒 Double Dépôt Réseau : Cette mission requiert le dépôt du même fichier par <strong className="text-purple-700">{reqPartners} équipiers</strong> distincts pour valider les points de chacun.
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-slate-600 italic">"{activeQuest.desc}"</p>

                      {isDoneHere && <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3 text-center text-xs font-bold">✅ Mission validée avec succès ! Les points vous sont accordés.</div>}

                      {isPendingHere && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs space-y-2">
                          <p className="font-bold">⏳ En attente de coéquipiers...</p>
                          <p className="text-[11px] leading-tight opacity-90">Votre travail a bien été enregistré sans balise technique polluante. Transmettez maintenant votre fichier à vos coéquipiers pour qu'ils le déposent également.</p>
                        </div>
                      )}

                      {isDoneElsewhere && !isDoneHere && !isPendingHere && (
                        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-center space-y-3">
                          <p className="text-xs text-amber-900 font-medium">💡 Vous avez déjà validé cet exercice dans une autre session ! L'importer ?</p>
                          <button onClick={handleImportPreviousProduction} className="w-full bg-amber-600 text-white font-black py-2 rounded-xl text-xs cursor-pointer">🔄 Importer mon travail global</button>
                        </div>
                      )}

                      {!isDoneHere && !isPendingHere && !isDoneElsewhere && (
                        <form onSubmit={handleSubmitLivrable} className="space-y-3">
                          <textarea required rows="4" value={livrableContent} onChange={(e) => setLivrableContent(e.target.value)} placeholder={isQuestCollab ? "Décrivez votre livrable d'équipe ici (votre texte restera 100% pur)..." : "Votre réponse ici..."} className="w-full bg-slate-50 border rounded-xl p-3 text-xs focus:outline-none focus:border-slate-400" />
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">📁 Justificatif {isQuestCollab && <span className="text-purple-600">(Obligatoire en Co-op)</span>}</label>
                            <input type="file" required={isQuestCollab} onChange={handleFileChange} className="text-xs text-slate-500 block cursor-pointer" />
                          </div>
                          <button type="submit" className={`w-full font-bold py-2 rounded-xl text-xs cursor-pointer text-white ${isQuestCollab ? 'bg-purple-700 hover:bg-purple-600' : 'bg-slate-900 hover:bg-slate-800'}`}>💾 Déposer le livrable</button>
                        </form>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-slate-100 border border-dashed rounded-2xl p-6 text-center text-xs text-slate-400 py-12">🎯 Sélectionnez une mission.</div>
            )}
          </div>
        </div>
      )}

      {/* PORTFOLIO COMPLET - FORMAT COMPLÈTEMENT PUR SANS HASH MIXÉ */}
      {activeTab === 'portfolio' && user && (
        <div className="space-y-8">
          
          {/* BARRE DE CONTRÔLE ET FILTRE DU HUB */}
          <div className="bg-white border rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 shadow-sm">
            <div>
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                📂 Hub de Vos Missions & Historique (Format Nettoyé ✨)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Consultez vos textes purs sans balise technique, téléchargez vos pièces jointes et naviguez vers le jeu.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Affichage :</label>
              <select 
                value={portfolioFilter} 
                onChange={(e) => setPortfolioFilter(e.target.value)} 
                className="bg-slate-50 border rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer shadow-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="all">👀 Tout afficher (3 Blocs)</option>
                <option value="validated">🏆 Quêtes Validées uniquement</option>
                <option value="pending">⏳ En attente uniquement</option>
                <option value="not_started">❌ Non commencées uniquement</option>
              </select>
            </div>
          </div>

          {/* 🌟 BLOC 1 : LES QUÊTES VALIDÉES (VERT) */}
          {(portfolioFilter === 'all' || portfolioFilter === 'validated') && (
            <div className="space-y-3">
              <div className="border-b border-emerald-100 pb-2">
                <h4 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  ✅ Quêtes Validées & XP Obtenus ({uniqueLivrables.filter(p => p.status === 'validated').length})
                </h4>
              </div>
              {(() => {
                const validatedLivrables = uniqueLivrables.filter(p => p.status === 'validated');
                if (validatedLivrables.length === 0) {
                  return <div className="bg-slate-50 border border-dashed rounded-xl p-4 text-[11px] text-slate-400 italic">Aucune quête validée pour le moment.</div>;
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {validatedLivrables.map(p => {
                      const originalQuest = quests.find(q => q.id === p.questId);
                      const isQuestCollab = originalQuest?.is_collaborative === true || originalQuest?.is_collaborative === 'true';
                      return (
                        <div key={p.id} className="bg-white border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden transition-all hover:shadow-md">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-400">Code : {p.questId} {isQuestCollab && '🤝'}</span>
                              <span className="text-emerald-600">🏆 +{originalQuest ? getPointsByDifficulty(originalQuest.difficulty) : 100} XP</span>
                            </div>
                            <h5 className="font-black text-xs text-slate-800 leading-tight">{p.questName}</h5>
                            
                            {/* Rendu Propre sans code technique */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border text-[11px] space-y-2">
                              <p className="text-slate-700 font-medium">"{p.pureText}"</p>
                              {p.file_url && (
                                <a href={p.file_url} download={`livrable_${p.questId}`} className="inline-flex items-center text-[10px] font-bold text-emerald-600 hover:underline gap-1 mt-1">
                                  📁 Ouvrir la pièce jointe
                                </a>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t text-[10px] text-slate-400">
                            <span>Fait le {p.date}</span>
                            <button onClick={() => navigateToQuestInGame(p.questId)} className="text-emerald-700 hover:text-emerald-900 font-bold uppercase tracking-wider cursor-pointer text-[9px] bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100">🎯 Voir dans le Jeu ➔</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ⏳ BLOC 2 : LES QUÊTES EN ATTENTE (AMBRE) */}
          {(portfolioFilter === 'all' || portfolioFilter === 'pending') && (
            <div className="space-y-3 pt-2">
              <div className="border-b border-amber-200 pb-2">
                <h4 className="font-black text-xs text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                  ⏳ En Attente de Synchronisation Équipe ({uniqueLivrables.filter(p => p.status === 'pending').length})
                </h4>
              </div>
              {(() => {
                const pendingLivrables = uniqueLivrables.filter(p => p.status === 'pending');
                if (pendingLivrables.length === 0) {
                  return <div className="bg-slate-50 border border-dashed rounded-xl p-4 text-[11px] text-slate-400 italic">Aucun dépôt n'est bloqué en attente d'un partenaire.</div>;
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingLivrables.map(p => {
                      const originalQuest = quests.find(q => q.id === p.questId);
                      const reqPartners = originalQuest ? (parseInt(originalQuest.required_partners, 10) || 2) : 2;
                      return (
                        <div key={p.id} className="bg-white border border-amber-200 bg-amber-50/5 p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden transition-all hover:shadow-md animate-pulse">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-400" />
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-400">Code : {p.questId} 🤝</span>
                              <span className="text-amber-600 font-medium">⏳ Blocage en cours</span>
                            </div>
                            <h5 className="font-black text-xs text-amber-950 leading-tight">{p.questName}</h5>
                            
                            {/* Rendu Propre */}
                            <div className="bg-white p-2.5 rounded-xl border border-amber-100 text-[11px] space-y-2 shadow-inner">
                              <p className="text-slate-700 font-medium">"{p.pureText}"</p>
                              {p.file_url && (
                                <a href={p.file_url} download={`livrable_${p.questId}`} className="inline-flex items-center text-[10px] font-bold text-amber-600 hover:underline gap-1 mt-1">
                                  📁 Ouvrir le justificatif joint
                                </a>
                              )}
                            </div>
                            <p className="text-[10px] text-amber-800 leading-tight font-medium bg-amber-50 p-2 rounded-lg">💡 Vos équipiers doivent soumettre le même fichier pour valider cette mission à {reqPartners} joueurs.</p>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t text-[10px] text-slate-400">
                            <span>Initié le {p.date}</span>
                            <button onClick={() => navigateToQuestInGame(p.questId)} className="text-amber-700 hover:text-amber-900 font-bold uppercase tracking-wider cursor-pointer text-[9px] bg-amber-100/50 px-2 py-1 rounded hover:bg-amber-100">🎯 Voir dans le Jeu ➔</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ❌ BLOC 3 : LES QUÊTES NON COMMENCÉES (ARDOISE) */}
          {(portfolioFilter === 'all' || portfolioFilter === 'not_started') && (
            <div className="space-y-3 pt-2">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  ❌ Catalogue des Missions Restantes ({quests.filter(q => !completedQuestIds.has(q.id)).length})
                </h4>
              </div>
              {(() => {
                const pendingQuests = quests.filter(q => !completedQuestIds.has(q.id));
                if (pendingQuests.length === 0) {
                  return <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center text-xs text-emerald-800 font-bold">🎉 Félicitations ! Vous avez complété 100 % des missions disponibles de l'aventure !</div>;
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80">
                    {pendingQuests.map(q => {
                      const isQuestCollab = q.is_collaborative === true || q.is_collaborative === 'true';
                      const isStartedButPending = pendingCollabQuestIds.has(q.id);
                      return (
                        <div key={q.id} className={`bg-slate-50 border border-dashed p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:bg-white ${isQuestCollab ? 'border-purple-200 bg-purple-50/5' : 'border-slate-200'}`}>
                          <div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                              <span>{q.theme === 'env' ? '🌍 RSE' : '⚙️ TECH'} {isQuestCollab && '🤝'}</span>
                              <span className="text-slate-500 font-mono">{isQuestCollab ? `Co-op (x${q.required_partners || 2})` : `${q.difficulty}★`}</span>
                            </div>
                            <h5 className={`font-black text-xs mt-2 leading-tight ${isQuestCollab ? 'text-purple-950' : 'text-slate-700'}`}>{isQuestCollab && '🤝 '}{q.name}</h5>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 italic font-medium">"{q.desc}"</p>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t text-[10px]">
                            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">
                              {isStartedButPending ? '⏳ En attente' : '❌ Non initiée'}
                            </span>
                            <button onClick={() => navigateToQuestInGame(q.id)} className="text-slate-600 hover:text-slate-900 font-black uppercase tracking-wider cursor-pointer text-[9px] bg-slate-200/60 px-2 py-1 rounded hover:bg-slate-200">🚀 Lancer la mission ➔</button>
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
