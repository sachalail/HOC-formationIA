// src/screens/StudioScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const getQuestBadgeStyle = (quest) => {
  if (!quest) return "bg-slate-50 text-slate-700 border-slate-200";
  if (Number(quest.difficulty) === 3) return "bg-orange-50 text-orange-700 border-orange-200";
  if (Number(quest.difficulty) === 2) return "bg-red-50 text-red-700 border-red-200";
  switch (quest.theme) {
    case 'social': return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case 'env': return "bg-teal-50 text-teal-700 border-teal-200";
    case 'tech': return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export default function StudioScreen({ trees = {}, setTrees, quests = [], setQuests }) {
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Navigation par onglet interne au Studio
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' ou 'sessions'
  
  // États de sélection
  const [activeTreeId, setActiveTreeId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  
  // Modale active ('quest', 'tree', 'session', 'tree_browser' ou null)
  const [activeModal, setActiveModal] = useState(null); 

  // États des formulaires
  const [newQuestName, setNewQuestName] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');
  const [newQuestTheme, setNewQuestTheme] = useState('social');
  const [newQuestType, setNewQuestType] = useState('normal'); 
  const [newSessionCode, setNewSessionCode] = useState('');
  const [newTreeName, setNewTreeName] = useState('');
  const [newFloorMode, setNewFloorMode] = useState('static');

  // AJOUT DES ÉTATS POUR LE MODE COLLABORATIF
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [requiredPartners, setRequiredPartners] = useState(2);

  // Recherche RH & Cache de correspondance ID -> Email
  const [drhSearchQuery, setDrhSearchQuery] = useState('');
  const [drhSuggestions, setDrhSuggestions] = useState([]);

  // Recherche et filtres du Pool de Missions (à droite)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTheme, setFilterTheme] = useState('all'); 
  const [filterDifficulty, setFilterDifficulty] = useState('all'); 

  // ✨ NOUVEAUX ÉTATS POUR LA GESTION ET EXPLORATION DES ARBRES
  const [treeBrowserTab, setTreeBrowserTab] = useState('local'); // 'local' ou 'shared'
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

  // 1. CHARGEMENT INITIAL (USER, ARBRES & SESSIONS DEPUIS LA BDD)
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        fetchSessions(session.user.id);
        fetchTrees(); // Chargement global pour récupérer aussi les publics
      }
    };
    fetchInitialData();
  }, []);

  const fetchSessions = async (userId) => {
    const { data, error } = await supabase.from('sessions').select('*').eq('created_by', userId);
    if (data && !error) {
      setSessions(data);
      if (data.length > 0) setActiveSessionId(data[0].id);
      
      const allDrhIds = data.flatMap(s => s.drh_ids || []);
      if (allDrhIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', allDrhIds);
        if (profiles) {
          const emailCache = JSON.parse(localStorage.getItem('drh_emails') || '{}');
          profiles.forEach(p => { emailCache[p.id] = p.email; });
          localStorage.setItem('drh_emails', JSON.stringify(emailCache));
        }
      }
    }
  };

  const fetchTrees = async () => {
    // Modification pour charger les siens ET les arbres publics (partagés)
    const { data, error } = await supabase
      .from('trees')
      .select('*');

    if (data && !error && data.length > 0) {
      const treesMap = {};
      data.forEach(t => { treesMap[t.id] = t; });
      if (typeof setTrees === 'function') setTrees(treesMap);
      
      // Sélectionner par défaut le premier arbre possédé s'il n'y en a pas d'actif
      if (!activeTreeId) {
        const firstOwned = data.find(t => t.owner_id === currentUserId) || data[0];
        setActiveTreeId(firstOwned.id);
      }
    }
  };

  const currentTree = trees[activeTreeId];
  const currentSession = sessions.find(s => String(s.id) === String(activeSessionId));

  // Vérification de propriété de l'arbre actif
  const isOwnerOfCurrentTree = currentTree && currentTree.owner_id === currentUserId;

  // RECHERCHE DYNAMIQUE DE DRH AVEC FILTRAGE DES DOUBLONS
  useEffect(() => {
    const searchDRH = async () => {
      if (drhSearchQuery.trim().length < 2) {
        setDrhSuggestions([]);
        return;
      }
      
      try {
        let query = supabase
          .from('profiles')
          .select('id, email, role')
          .ilike('email', `%${drhSearchQuery}%`);

        const currentDrhIds = Array.isArray(currentSession?.drh_ids) 
          ? currentSession.drh_ids.filter(id => id && String(id).trim() !== "")
          : [];

        if (currentDrhIds.length > 0) {
          query = query.not('id', 'in', `(${currentDrhIds.join(',')})`);
        }

        const { data, error } = await query.limit(5);
        if (data && !error) setDrhSuggestions(data);
      } catch (err) {
        console.error("Erreur lors de la recherche des DRH :", err);
      }
    };

    const delayDebounce = setTimeout(() => searchDRH(), 300);
    return () => clearTimeout(delayDebounce);
  }, [drhSearchQuery, currentSession?.drh_ids]);

  // FILTRAGE DES QUÊTES ACCESSIBLES (POOL DE DROITE)
  const safeQuestsList = quests || [];
  const filteredQuests = safeQuestsList.filter(q => {
    if (!q) return false;
    const matchesSearch = (q.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (q.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = filterTheme === 'all' || q.theme === filterTheme;
    const matchesDifficulty = filterDifficulty === 'all' || Number(q.difficulty) === Number(filterDifficulty);
    return matchesSearch && matchesTheme && matchesDifficulty;
  }).sort((a, b) => (a.theme || '').localeCompare(b.theme || ''));  

  // Calcul automatique de la contrainte maximale d'équipe sur l'arbre
  const recalculateAndSaveMaxTeamConstraint = async (treeId, floorsArray) => {
    if (!treeId || !floorsArray) return;
    const attachedQuestIds = floorsArray.flatMap(f => f.quests || []);
    const linkedQuests = safeQuestsList.filter(q => attachedQuestIds.includes(q.id));

    const maxConstraint = linkedQuests.reduce((max, q) => {
      if (q.is_collaborative || q.is_collaborative === 'true') {
        return Math.max(max, Number(q.required_partners) || 2);
      }
      return max;
    }, 1);

    await supabase
      .from('trees')
      .update({ max_team_constraint: maxConstraint })
      .eq('id', treeId);

    if (typeof setTrees === 'function') {
      setTrees(prev => {
        if (!prev[treeId]) return prev;
        return {
          ...prev,
          [treeId]: { ...prev[treeId], max_team_constraint: maxConstraint }
        };
      });
    }
  };

  // 2. LOGIQUE DE SAUVEGARDE ET SYNCHRONISATION SUPABASE
  const handleSaveChanges = async () => {
    if (activeTab === 'tree' && currentTree) {
      if (!isOwnerOfCurrentTree) {
        alert("⚠️ Vous ne pouvez pas modifier cet arbre car vous n'en êtes pas le propriétaire. Faites-en une copie locale !");
        return;
      }

      const { error } = await supabase
        .from('trees')
        .update({ floors: currentTree.floors || [] })
        .eq('id', currentTree.id);

      if (error) {
        alert(`❌ Erreur sauvegarde Arbre : ${error.message}`);
      } else {
        await recalculateAndSaveMaxTeamConstraint(currentTree.id, currentTree.floors);
        alert(`🎉 Arbre "${currentTree.name}" et ses paliers synchronisés sur Supabase !`);
      }
    } 
    
    if (activeTab === 'sessions' && currentSession) {
      const { error } = await supabase
        .from('sessions')
        .update({
          tree_id: currentSession.tree_id,
          drh_ids: currentSession.drh_ids || []
        })
        .eq('id', currentSession.id);

      if (error) alert(`❌ Erreur sauvegarde Session : ${error.message}`);
      else alert(`🎉 Session "${currentSession.session_code}" enregistrée avec succès !`);
    }
  };

  // ✨ LOGIQUE DE PARTAGE DE L'ARBRE (Passage en visibilité public)
  const handleShareTree = async () => {
    if (!currentTree) return;
    if (!isOwnerOfCurrentTree) {
      alert("⚠️ Vous devez être le propriétaire de l'arbre pour pouvoir le partager.");
      return;
    }

    const { error } = await supabase
      .from('trees')
      .update({ visibility: 'public' })
      .eq('id', currentTree.id);

    if (error) {
      alert(`❌ Erreur lors du partage : ${error.message}`);
    } else {
      if (typeof setTrees === 'function') {
        setTrees(prev => ({
          ...prev,
          [currentTree.id]: { ...prev[currentTree.id], visibility: 'public' }
        }));
      }
      alert(`🌍 L'arbre "${currentTree.name}" est désormais partagé et accessible à l'ensemble de la communauté !`);
    }
  };

  // ✨ LOGIQUE DE DUPLICATION D'UN ARBRE PARTAGÉ EN LOCAL
  const handleDuplicateTreeAsLocal = async (treeToCopy) => {
    if (!treeToCopy) return;

    const { data, error } = await supabase
      .from('trees')
      .insert([{ 
        name: `${treeToCopy.name} (Copie locale)`, 
        owner_id: currentUserId, 
        floors: treeToCopy.floors || [], 
        visibility: 'private', 
        max_team_constraint: treeToCopy.max_team_constraint || 1 
      }])
      .select().single();

    if (error) {
      alert(`⚠️ Erreur lors de la copie : ${error.message}`);
      return;
    }

    if (typeof setTrees === 'function') {
      setTrees(prev => ({ ...prev, [data.id]: data }));
    }
    setActiveTreeId(data.id);
    setActiveModal(null);
    alert(`📥 Une copie locale éditable de l'arbre "${treeToCopy.name}" a été ajoutée à votre espace !`);
  };

  // MODIFICATION DE L'ARBRE DANS LE STATE LOCAL
  const updateCurrentTreeInState = (updatedFields) => {
    if (!currentTree) return;
    if (!isOwnerOfCurrentTree) return; // Sécurité anti-mutation locale si non-propriétaire
    if (typeof setTrees === 'function') {
      setTrees(prev => ({
        ...prev,
        [activeTreeId]: { ...currentTree, ...updatedFields }
      }));
    }
  };

  const updateCurrentSessionInState = (updatedFields) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updatedFields } : s));
  };

  // LOGIQUE INTERACTIVE DES PALIERS (FLOORS)
  const handleAddFloor = () => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const floors = currentTree.floors ? [...currentTree.floors] : [];
    const nextFloorId = floors.length > 0 ? Math.max(...floors.map(f => f.floorId || 0)) + 1 : 1;

    const updatedFloors = [...floors, { 
      floorId: nextFloorId, 
      mode: newFloorMode, 
      quests: [], 
      count: 2, 
      allowedDifficulties: [1, 2, 3]
    }];

    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  const handleRemoveFloor = (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.filter(f => f.floorId !== floorId);
    
    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  const toggleFloorMode = (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({
      floors: currentTree.floors.map(f => 
        f.floorId === floorId ? { ...f, mode: f.mode === 'static' ? 'random' : 'static' } : f
      )
    });
  };

  const handleCountChange = (floorId, val) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const numericVal = Math.max(1, parseInt(val, 10) || 1);
    updateCurrentTreeInState({
      floors: currentTree.floors.map(f => f.floorId === floorId ? { ...f, count: numericVal } : f)
    });
  };

  const handleToggleDifficultyInFloor = (floorId, diffLevel) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({
      floors: currentTree.floors.map(f => {
        if (f.floorId !== floorId) return f;
        const currentDiffs = f.allowedDifficulties || [1, 2, 3];
        const nextDiffs = currentDiffs.includes(Number(diffLevel))
          ? currentDiffs.filter(d => Number(d) !== Number(diffLevel))
          : [...currentDiffs, Number(diffLevel)];
        return { ...f, allowedDifficulties: nextDiffs.map(d => Number(d)) };
      })
    });
  };

  const handleToggleQuestInFloor = (floorId, questId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    
    const updatedFloors = currentTree.floors.map(f => {
      if (f.floorId !== floorId) return f;
      const currentQuests = f.quests || [];
      return {
        ...f,
        quests: currentQuests.includes(questId) ? currentQuests.filter(id => id !== questId) : [...currentQuests, questId]
      };
    });

    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  // ACTIONS DE CRÉATION (MODALES)
  const handleCreateTree = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTreeName.trim()) return;

    // ✨ CORRECTION SÉCURISÉE : Ajout explicite de max_user à 100 par défaut (résout le blocage de création)
    const { data, error } = await supabase
      .from('trees')
      .insert([{ 
        name: newTreeName.trim(), 
        owner_id: currentUserId, 
        floors: [], 
        visibility: 'private', 
        max_team_constraint: 1,
        max_user: 100 
      }])
      .select().single();

    if (error) { alert(`⚠️ Erreur : ${error.message}`); return; }
    
    if (typeof setTrees === 'function') {
      setTrees(prev => ({ ...prev, [data.id]: data }));
    }
    setActiveTreeId(data.id);
    setNewTreeName('');
    setActiveModal(null);
  };

  const handleCreateQuest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newQuestName || !newQuestDesc) return;
    const calculatedDifficulty = newQuestType === 'boss' ? 3 : newQuestType === 'miniboss' ? 2 : 1;

    const { data, error } = await supabase
      .from('quests')
      .insert([{ 
        name: newQuestName, 
        desc: newQuestDesc, 
        theme: newQuestTheme, 
        difficulty: String(calculatedDifficulty), 
        owner_id: currentUserId, 
        visibility: 'private',
        is_collaborative: isCollaborative,
        required_partners: isCollaborative ? (requiredPartners || 2) : 2
      }])
      .select().single(); 

    if (error) { alert(`⚠️ Erreur : ${error.message}`); return; }
    if (typeof setQuests === 'function') setQuests(prev => [...(prev || []), data]);

    setNewQuestName(''); 
    setNewQuestDesc(''); 
    setIsCollaborative(false);
    setRequiredPartners(2);
    setActiveModal(null);
  };

  const handleCreateSession = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const code = newSessionCode.trim().toUpperCase();
    if (!code) return;

    const { data, error } = await supabase
      .from('sessions')
      .insert([{ session_code: code, created_by: currentUserId, manager_id: currentUserId, tree_id: activeTreeId || null, drh_ids: [] }])
      .select().single();

    if (error) { alert(`⚠️ Erreur : ${error.message}`); return; }
    setSessions(prev => [...prev, data]);
    setActiveSessionId(data.id);
    setNewSessionCode(''); setActiveModal(null);
  };

  // GESTION DES RECHERCHES ET AJOUTS DE GESTIONNAIRES
  const handleAddDRH = (drhUser) => {
    if (!currentSession) return;
    const currentDrhIds = currentSession.drh_ids || [];
    if (currentDrhIds.includes(drhUser.id)) return;

    updateCurrentSessionInState({ drh_ids: [...currentDrhIds, drhUser.id] });

    const emailCache = JSON.parse(localStorage.getItem('drh_emails') || '{}');
    emailCache[drhUser.id] = drhUser.email;
    localStorage.setItem('drh_emails', JSON.stringify(emailCache));

    setDrhSearchQuery(''); 
    setDrhSuggestions([]);
  };

  const handleRemoveDRH = (drhId) => {
    if (!currentSession) return;
    updateCurrentSessionInState({ drh_ids: (currentSession.drh_ids || []).filter(id => id !== drhId) });
  };

  // Filtrage de la liste pour l'explorateur d'arbres
  const filteredBrowsedTrees = Object.values(trees || {}).filter(t => {
    if (!t) return false;
    const matchesSearch = (t.name || '').toLowerCase().includes(treeSearchQuery.toLowerCase());
    if (treeBrowserTab === 'local') {
      return matchesSearch && t.owner_id === currentUserId;
    } else {
      return matchesSearch && t.visibility === 'public';
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative">
      
      {/* SÉLECTEUR D'ONGLETS ET EN-TÊTE PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button 
            onClick={() => setActiveTab('tree')}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'tree' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            🌳 Architecture de l'Arbre
          </button>
          <button 
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'sessions' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            🔗 Liaison des Sessions locales ({sessions.length})
          </button>
        </div>

        {activeTab === 'tree' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs font-bold w-full sm:w-auto">
            {currentTree && (
              <span className="text-purple-700 font-black bg-purple-100/80 px-3 py-1.5 rounded-lg border border-purple-200 shadow-2xs">
                🤝 Taille max. requise du groupe : <span className="text-sm font-black text-purple-900">{currentTree.max_team_constraint || 1}</span> { (currentTree.max_team_constraint || 1) > 1 ? 'apprenants' : 'apprenant (Solo)' }
              </span>
            )}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 whitespace-nowrap">Arbre actif :</span>
              {/* ✨ REMPLACEMENT DU SELECT PAR UN BOUTON DE POP-UP D'EXPLORATION GLOBALE */}
              <button
                onClick={() => setActiveModal('tree_browser')}
                className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-purple-900 text-left font-bold min-w-[180px] flex justify-between items-center transition-all hover:bg-purple-100"
              >
                <span className="truncate">{currentTree ? currentTree.name : "-- Choisir un arbre --"}</span>
                <span className="text-[10px] ml-2">🔍 Ouvrir...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INDICATION DE LECTURE SEULE SI NON-PROPRIÉTAIRE */}
      {activeTab === 'tree' && currentTree && !isOwnerOfCurrentTree && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-bold flex justify-between items-center shadow-xs">
          <span>🔒 Vous visualisez cet arbre en mode Lecture Seule (Propriétaire distant). Vous ne pourrez pas enregistrer de modifications dessus.</span>
          <button 
            onClick={() => handleDuplicateTreeAsLocal(currentTree)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wide transition-all"
          >
            📥 Dupliquer en local
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ESPACE DE TRAVAIL (GAUCHE & CENTRE) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ONGLET A : ÉDITEUR D'ARBRE ET DE SES PALIERS */}
          {activeTab === 'tree' && (
            currentTree ? (
              <div className="space-y-4">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">⚙️ Configuration des paliers de : {currentTree.name}</div>
                
                {(currentTree.floors || []).map((floor) => {
                  const allowedDiffs = (floor.allowedDifficulties || [1, 2, 3]).map(d => Number(d));
                  return (
                    <div key={floor.floorId} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      
                      <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3 gap-3">
                        <div className="flex items-center gap-3">
                          <span className="bg-purple-700 text-white font-extrabold px-2.5 py-1 text-xs rounded-lg shadow-sm">PALIER {floor.floorId}</span>
                          
                          <button 
                            disabled={!isOwnerOfCurrentTree}
                            onClick={() => toggleFloorMode(floor.floorId)} 
                            className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                              floor.mode === 'static' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            } disabled:opacity-60`}
                          >
                            {floor.mode === 'static' ? '📌 Statique' : '🎲 Aléatoire'}
                          </button>

                          <div className="flex items-center bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 gap-1.5" title="Difficultés autorisées">
                            {[1, 2, 3].map(level => {
                              const isChecked = allowedDiffs.includes(Number(level));
                              return (
                                <button
                                  key={level}
                                  disabled={!isOwnerOfCurrentTree}
                                  onClick={() => handleToggleDifficultyInFloor(floor.floorId, level)}
                                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black transition-all ${
                                    isChecked ? 'bg-amber-400 text-amber-950 border border-amber-500 shadow-sm scale-110' : 'text-slate-400 hover:bg-slate-200'
                                  } disabled:opacity-40`}
                                >
                                  {level}★
                                </button>
                              );
                            })}
                          </div>

                          {floor.mode === 'random' && (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-900">
                              <span>🎯 Pioche :</span>
                              <input 
                                type="number" min="1"
                                disabled={!isOwnerOfCurrentTree}
                                value={floor.count !== undefined ? floor.count : 2} 
                                onChange={(e) => handleCountChange(floor.floorId, e.target.value)}
                                className="w-10 bg-white border border-amber-300 rounded text-center py-0.5 font-black text-slate-900 disabled:bg-slate-100"
                              />
                              <span className="text-[11px] opacity-75 font-medium">missions</span>
                            </div>
                          )}
                        </div>
                        
                        {isOwnerOfCurrentTree && (
                          <button onClick={() => handleRemoveFloor(floor.floorId)} className="text-slate-400 hover:text-red-500 text-xs font-bold">Supprimer</button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-500 uppercase">
                          {floor.mode === 'static' ? 'Missions sélectionnées obligatoires :' : `Pool pour tirage aléatoire (${(floor.quests || []).length}) :`}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {safeQuestsList
                            .filter(q => q && allowedDiffs.includes(Number(q.difficulty)))
                            .map(quest => {
                              const isSelected = (floor.quests || []).includes(quest.id);
                              const isQuestCollab = quest.is_collaborative || quest.is_collaborative === 'true' || quest.is_collaborative === true;
                              return (
                                <button 
                                  key={quest.id} 
                                  disabled={!isOwnerOfCurrentTree}
                                  onClick={() => handleToggleQuestInFloor(floor.floorId, quest.id)} 
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
                                    isSelected 
                                      ? isQuestCollab 
                                        ? 'bg-purple-800 text-white border-purple-950 shadow-sm font-bold ring-2 ring-purple-300 ring-offset-1' 
                                        : 'bg-purple-700 text-white border-purple-800 shadow-sm font-bold' 
                                      : isQuestCollab 
                                        ? 'bg-purple-5 text-purple-800 border-purple-200 hover:bg-purple-100 font-semibold' 
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  } disabled:opacity-80 disabled:cursor-not-allowed`}
                                >
                                  <span>{quest.name}</span>
                                  {isQuestCollab && (
                                    <span className={`px-1 rounded text-[10px] uppercase font-black ${isSelected ? 'bg-purple-950 text-purple-300' : 'bg-purple-200 text-purple-900'}`}>
                                      🤝 {quest.required_partners || 2}p
                                    </span>
                                  )}
                                  <span className="text-[10px] opacity-60">({quest.difficulty}★)</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                    </div>
                  );
                })}

                {isOwnerOfCurrentTree ? (
                  <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-600">Prochain palier :</label>
                      <select value={newFloorMode} onChange={(e) => setNewFloorMode(e.target.value)} className="bg-white border rounded-lg text-xs p-2 font-semibold">
                        <option value="static">📌 Statique</option>
                        <option value="random">🎲 Aléatoire</option>
                      </select>
                    </div>
                    <button onClick={handleAddFloor} className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-5 py-2.5 rounded-lg">➕ Insérer un Palier dans l'Arbre</button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="bg-white border p-12 rounded-xl text-center text-slate-400 text-xs font-semibold">Ouvrez l'explorateur ou créez votre premier Arbre pédagogique via la barre latérale gauche 🌳</div>
            )
          )}

          {/* CONTENU ONGLET 2 : GESTION DES SESSIONS & CALENDRIER TIMELINE */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* COLONNE CALENDRIER DES SESSIONS REGROUPÉES PAR JOURNÉE */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border rounded-2xl p-4 space-y-4 shadow-sm">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">📅 Calendrier de Formation</h3>
                <button 
                  type="button"
                  onClick={() => { 
                    if (Object.keys(trees).length === 0) { alert("Créez d'abord un arbre !"); return; } 
                    setSelectedTreeId(Object.keys(trees)[0]); 
                    setActiveModal('session'); 
                  }} 
                  className="text-[10px] bg-slate-900 text-white font-bold px-2 py-1 rounded hover:bg-slate-800 cursor-pointer"
                >
                  ➕ Créer
                </button>
              </div>

              {Object.keys(sessionsByDate).length === 0 ? (
                <p className="text-xs text-slate-400 italic p-2 text-center">Aucune session enregistrée.</p>
              ) : (
                <div className="space-y-4">
                  {Object.keys(sessionsByDate).sort().map(dateStr => (
                    <div key={dateStr} className="space-y-1.5">
                      <div className="text-[10px] font-black text-purple-900 uppercase tracking-wider bg-purple-50 px-2 py-1 rounded">
                        🗓️ {new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="space-y-1 pl-1">
                        {sessionsByDate[dateStr].map(session => {
                          const linkedTree = trees[session.tree_id];
                          const blockCount = session.timeline_blocks?.length || 0;
                          return (
                            <button 
                              key={session.id} 
                              type="button"
                              onClick={() => setSelectedSession(session)}
                              className={`w-full text-left p-3 border rounded-xl text-xs transition-all flex flex-col gap-1.5 shadow-xs cursor-pointer ${selectedSession?.id === session.id ? 'border-purple-600 bg-purple-50/30 ring-1 ring-purple-600/10' : 'bg-white hover:border-slate-300'}`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-mono font-bold bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] tracking-wide uppercase">{session.session_code}</span>
                                <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">{blockCount} blocs</span>
                              </div>
                              <span className="font-bold text-slate-700 truncate">Arbre : {linkedTree ? linkedTree.name : 'Inconnu'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PANNEAU DE CONFIGURATION DU PLANNING DE LA JOURNÉE */}
          <div className="lg:col-span-2 space-y-4">
            {selectedSession ? (
              <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-6">
                
                {/* ENTÊTE DE LA SESSION OUVERTE */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-slate-900 text-emerald-400 px-2 py-0.5 rounded uppercase">{selectedSession.session_code}</span>
                      <span className="text-xs text-slate-500 font-medium">
                        Journée du {new Date(selectedSession.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 text-sm mt-2">
                      Architecture active : {trees[selectedSession.tree_id]?.name || 'Chargement...'}
                    </h3>
                  </div>
                  <button type="button" onClick={() => setSelectedSession(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer">Fermer ✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
                  
                  {/* AFFICHAGE DE LA TIMELINE DU CALENDRIER */}
                  <div className="md:col-span-3 space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">⏱️ Déroulé & Paliers de la Journée</h4>
                    
                    {(!selectedSession.timeline_blocks || selectedSession.timeline_blocks.length === 0) ? (
                      <div className="border-2 border-dashed border-slate-100 rounded-xl p-6 text-center text-xs text-slate-400 italic">
                        Aucun bloc de planning configuré. Utilisez le formulaire de droite pour organiser la journée.
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-purple-200 pl-4 ml-2 space-y-4 py-1">
                        {selectedSession.timeline_blocks.map((block) => (
                          <div key={block.id} className="relative bg-slate-50 border p-3 rounded-xl shadow-xs space-y-1 transition-all hover:bg-white group">
                            {/* Point indicateur visuel sur l'axe du calendrier */}
                            <div className="absolute w-2.5 h-2.5 bg-purple-600 rounded-full -left-[19.5px] top-4 border-2 border-white shadow-xs" />
                            
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[10px] bg-purple-900 text-purple-100 font-mono font-bold px-1.5 py-0.5 rounded">
                                {block.start} ➔ {block.end}
                              </span>
                              <button 
                                type="button"
                                onClick={() => handleDeleteTimelineBlock(block.id)}
                                className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 font-bold cursor-pointer transition-all"
                              >
                                Supprimer
                              </button>
                            </div>
                            <h5 className="text-xs font-black text-slate-800">{block.title}</h5>
                            {block.desc && <p className="text-[11px] text-slate-400 font-medium italic">"{block.desc}"</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FORMULAIRE D'INSERTION DE BLOC (REPAS, BRUNCH, PALIER COORDONNÉ...) */}
                  <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">🧩 Insérer un bloc</h4>
                    
                    <form onSubmit={handleAddTimelineBlock} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-600 font-bold mb-0.5">Type ou titre du bloc :</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Ex: Palier 1 : Fondations / Repas" 
                          value={newBlockTitle} 
                          onChange={(e) => setNewBlockTitle(e.target.value)} 
                          className="w-full bg-white border rounded-lg p-2 font-medium" 
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-0.5">Détail indicatif (Optionnel) :</label>
                        <textarea 
                          rows="2" 
                          placeholder="Ex: Briefing de démarrage / Repas libre en salle" 
                          value={newBlockDesc} 
                          onChange={(e) => setNewBlockDesc(e.target.value)} 
                          className="w-full bg-white border rounded-lg p-2" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-600 font-bold mb-0.5">Début (Heure) :</label>
                          <input 
                            type="time" 
                            required 
                            value={newBlockStart} 
                            onChange={(e) => setNewBlockStart(e.target.value)} 
                            className="w-full bg-white border rounded-lg p-2 font-mono font-bold" 
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-0.5">Fin (Heure) :</label>
                          <input 
                            type="time" 
                            required 
                            value={newBlockEnd} 
                            onChange={(e) => setNewBlockEnd(e.target.value)} 
                            className="w-full bg-white border rounded-lg p-2 font-mono font-bold" 
                          />
                        </div>
                      </div>
                      <button 
                        type="submit" 
                        className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 rounded-lg text-xs mt-1 transition-all cursor-pointer shadow-xs"
                      >
                        ➕ Ajouter à la journée
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed p-12 rounded-3xl text-center text-xs text-slate-400 italic">
                Sélectionnez une carte de session dans le calendrier à gauche pour structurer son déroulé ou y insérer vos blocs (ex: repas, pauses, paliers).
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

        {/* POOL DES MISSIONS DE DROITE */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit space-y-4">
            <h3 className="font-black text-slate-900 border-b pb-2 text-sm tracking-wide uppercase">📦 Catalogue de Missions ({filteredQuests.length})</h3>
            
            <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
              <input 
                type="text" placeholder="🔍 Trouver une mission..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-700 shadow-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5">Axe RSE</label>
                  <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)} className="w-full bg-white border rounded-md p-1.5 font-medium">
                    <option value="all">Tout voir</option>
                    <option value="social">🌱 Social</option>
                    <option value="env">🌍 Environnement</option>
                    <option value="tech">⚙️ Technique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5">Difficulté</label>
                  <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="w-full bg-white border rounded-md p-1.5 font-medium">
                    <option value="all">Toutes</option>
                    <option value="1">1★ Standard</option>
                    <option value="2">2★ Miniboss</option>
                    <option value="3">3★ Boss</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {filteredQuests.map(q => {
                const isQuestCollab = q.is_collaborative || q.is_collaborative === 'true' || q.is_collaborative === true;
                return (
                  <div key={q.id} className={`p-3 border rounded-lg text-xs space-y-1 transition-all ${getQuestBadgeStyle(q)}`}>
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold truncate">{q.name}</span>
                      <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border bg-white/50 shrink-0">
                        {Number(q.difficulty) === 3 ? '3★ Boss' : Number(q.difficulty) === 2 ? '2★ Miniboss' : '1★ Standard'}
                      </span>
                    </div>
                    {isQuestCollab && (
                      <div className="text-[11px] text-purple-900 font-black bg-purple-200/60 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-purple-300">
                        🤝 Collaborative ({q.required_partners || 2} partenaires requis)
                      </div>
                    )}
                    <div className="opacity-80 italic text-[11px] pt-1">"{q.desc}"</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BARRE OUTILS FLOTTANTE GAUCHE */}
      <div className="fixed top-28 left-4 bg-slate-900/95 backdrop-blur-md border border-slate-700 w-16 py-6 rounded-2xl flex flex-col items-center gap-5 shadow-2xl z-40">
        <button onClick={() => setActiveModal('tree')} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-900/50 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-xs" title="Créer un nouvel Arbre pédagogique">🌳</button>
        <button onClick={() => setActiveModal('quest')} className="bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-900/50 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-xs" title="Créer une nouvelle mission en BDD">✨</button>
        <button onClick={() => setActiveModal('session')} className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-900/50 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-xs" title="Ouvrir un nouvel espace Session">📆</button>
        
        {/* ✨ RÉINTÉGRATION DU BOUTON FLOTTANT DE PARTAGE DE L'ARBRE ACTIF */}
        {currentTree && isOwnerOfCurrentTree && currentTree.visibility !== 'public' && (
          <button 
            onClick={handleShareTree} 
            className="bg-amber-600 hover:bg-amber-500 text-white w-10 h-10 rounded-xl flex items-center justify-center text-md font-bold shadow-xs transition-all" 
            title="Partager cet arbre avec la communauté"
          >
            🌍
          </button>
        )}

        <div className="w-8 h-px bg-slate-700 my-1"></div>

        <button onClick={handleSaveChanges} className="bg-emerald-600 hover:bg-emerald-500 text-white w-12 h-12 rounded-xl flex flex-col items-center justify-center text-sm font-black shadow-lg uppercase tracking-tight" title="Enregistrer les modifications sur Supabase">💾</button>
      </div>

      {/* MODALES */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>

            {activeModal === 'tree' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">🌳 Nouvel Arbre Pédagogique</h3>
                <form onSubmit={handleCreateTree} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Nom de la structure / du modèle :</label>
                    <input type="text" required placeholder="Ex: Cursus RSE - Niveau Avancé" value={newTreeName} onChange={(e) => setNewTreeName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-semibold" />
                  </div>
                  <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition-all">Créer le modèle d'Arbre</button>
                </form>
              </>
            )}

            {/* ✨ NOUVELLE MODALE INTERACTIVE : EXPLORATEUR D'ARBRES EN DEUX ONGLETS */}
            {activeModal === 'tree_browser' && (
              <>
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">🔍 Catalogue global des Arbres</h3>
                  <p className="text-[11px] text-slate-500">Sélectionnez le parcours actif ou dupliquez un modèle partagé.</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
                  <button 
                    type="button"
                    onClick={() => setTreeBrowserTab('local')}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all ${treeBrowserTab === 'local' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-500'}`}
                  >
                    🏠 Mes Arbres locaux
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTreeBrowserTab('shared')}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all ${treeBrowserTab === 'shared' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-500'}`}
                  >
                    🌍 Modèles partagés
                  </button>
                </div>

                <input 
                  type="text"
                  placeholder="🔍 Rechercher un arbre..."
                  value={treeSearchQuery}
                  onChange={(e) => setTreeSearchQuery(e.target.value)}
                  className="w-full border text-xs rounded-lg p-2 bg-slate-50 font-medium"
                />

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filteredBrowsedTrees.length > 0 ? (
                    filteredBrowsedTrees.map((t) => {
                      const isSelected = t.id === activeTreeId;
                      const isOwned = t.owner_id === currentUserId;
                      return (
                        <div 
                          key={t.id} 
                          className={`p-3 border rounded-xl flex flex-col justify-between gap-2 transition-all ${
                            isSelected ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                              <span className="truncate max-w-[180px]">Par: {isOwned ? "Moi-même" : `Auteur distant`}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black ${
                                t.visibility === 'public' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {t.visibility === 'public' ? '🌍 Communautaire' : '🔒 Privé'}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-800 mt-1">{t.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5 italic">
                              Structure contenant {Array.isArray(t.floors) ? t.floors.length : 0} paliers de progression.
                            </p>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100/60">
                            {!isSelected && (
                              <button
                                type="button"
                                onClick={() => { setActiveTreeId(t.id); setActiveModal(null); }}
                                className="bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1 rounded-md transition-all hover:bg-slate-800"
                              >
                                🎯 Activer
                              </button>
                            )}
                            {!isOwned && (
                              <button
                                type="button"
                                onClick={() => handleDuplicateTreeAsLocal(t)}
                                className="bg-purple-100 text-purple-700 font-bold text-[10px] px-2.5 py-1 rounded-md transition-all hover:bg-purple-200"
                              >
                                📥 Copier localement
                              </button>
                            )}
                            {isSelected && (
                              <span className="text-purple-700 text-[10px] font-black py-1">✓ Sélectionné</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-[11px] text-slate-400 italic py-4">Aucun modèle trouvé dans cette section.</p>
                  )}
                </div>
              </>
            )}

            {activeModal === 'quest' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">✨ Nouvelle Mission (Base)</h3>
                <form onSubmit={handleCreateQuest} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Nom de la mission :</label>
                    <input type="text" required placeholder="Ex: Audit de maturité IA" value={newQuestName} onChange={(e) => setNewQuestName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Consigne :</label>
                    <textarea required rows="2" placeholder="Description de l'exercice..." value={newQuestDesc} onChange={(e) => setNewQuestDesc(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50" />
                  </div>

                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="is_collaborative_chk"
                        checked={isCollaborative}
                        onChange={(e) => setIsCollaborative(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                      />
                      <label htmlFor="is_collaborative_chk" className="font-bold text-purple-950 uppercase tracking-wider cursor-pointer select-none">
                        🤝 Mission Collaborative d'Équipe
                      </label>
                    </div>

                    {isCollaborative && (
                      <div className="pl-6 space-y-1">
                        <label className="block text-[10px] font-black uppercase text-purple-700">Nombre d'équipiers requis :</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" min="2" max="20"
                            value={requiredPartners}
                            onChange={(e) => setRequiredPartners(Math.max(2, parseInt(e.target.value, 10) || 2))}
                            className="w-16 bg-white border border-purple-300 rounded-lg p-1.5 font-bold font-mono text-center focus:outline-none"
                          />
                          <span className="text-[10px] text-purple-900 opacity-80 font-medium">personnes requises</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Axe RSE :</label>
                      <select value={newQuestTheme} onChange={(e) => setNewQuestTheme(e.target.value)} className="w-full border rounded-lg p-2.5 bg-white">
                        <option value="social">🌱 Social</option>
                        <option value="env">🌍 Environnement</option>
                        <option value="tech">⚙️ Technique</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Rang :</label>
                      <select value={newQuestType} onChange={(e) => setNewQuestType(e.target.value)} className="w-full border rounded-lg p-2.5 bg-white">
                        <option value="normal">📄 Standard (1★)</option>
                        <option value="miniboss">⚡ Miniboss (2★)</option>
                        <option value="boss">🔥 Boss (3★)</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl mt-2 transition-all">Créer la mission</button>
                </form>
              </>
            )}

            {activeModal === 'session' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">💡 Initialiser un Espace Session</h3>
                <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Code d'accès de la session :</label>
                    <input type="text" required placeholder="Ex: AIRBUS-LILLE-26" value={newSessionCode} onChange={(e) => setNewSessionCode(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-mono font-bold uppercase tracking-wider" />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-all">Générer la session</button>
                </form>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
