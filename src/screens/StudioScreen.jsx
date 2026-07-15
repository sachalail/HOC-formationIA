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

  // Mode collaboratif
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [requiredPartners, setRequiredPartners] = useState(2);

  // Index du palier en cours de déplacement (Drag & Drop Architecture Arbre)
  const [draggedFloorIndex, setDraggedFloorIndex] = useState(null);

  // Recherche RH & Cache de correspondance ID -> Email
  const [drhSearchQuery, setDrhSearchQuery] = useState('');
  const [drhSuggestions, setDrhSuggestions] = useState([]);

  // Recherche et filtres du Pool de Missions (à droite)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTheme, setFilterTheme] = useState('all'); 
  const [filterDifficulty, setFilterDifficulty] = useState('all'); 

  // Gestion et exploration des arbres
  const [treeBrowserTab, setTreeBrowserTab] = useState('local'); // 'local' ou 'shared'
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

  // --- NOUVEAUX ÉTATS POUR LE PLANNING DE SESSION ---
  // Un bloc personnalisé en cours de création dans la palette
  const [customBlockConfig, setCustomBlockConfig] = useState({
    name: 'Pause Café / Réflexion',
    desc: 'Un moment de débrief libre ou de pause active',
    color: '#3b82f6', // Bleu par défaut
    duration: 15
  });

  // dragItem tracker pour le planning de session
  // Peut être { source: 'palette-palier', data: floor } ou { source: 'palette-custom' } ou { source: 'timeline', index: number }
  const [draggedPlanningItem, setDraggedPlanningItem] = useState(null);
  // Pour le survol des zones de dépôt du planning
  const [activeDropIndex, setActiveDropIndex] = useState(null);

  // 1. CHARGEMENT INITIAL (USER, ARBRES & SESSIONS DEPUIS LA BDD)
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        fetchSessions(session.user.id);
        fetchTrees();
      }
    };
    fetchInitialData();
  }, []);

  const fetchSessions = async (userId) => {
    const { data, error } = await supabase.from('sessions').select('*').order('created_at', { ascending: false }).eq('created_by', userId);
    if (data && !error) {
      setSessions(data);
      
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
    const { data, error } = await supabase.from('trees').select('*');
    if (data && !error && data.length > 0) {
      const treesMap = {};
      data.forEach(t => { treesMap[t.id] = t; });
      if (typeof setTrees === 'function') setTrees(treesMap);
      
      if (!activeTreeId) {
        const firstOwned = data.find(t => t.owner_id === currentUserId) || data[0];
        setActiveTreeId(firstOwned.id);
      }
    }
  };

  const currentTree = trees[activeTreeId];
  const currentSession = sessions.find(s => String(s.id) === String(activeSessionId));
  const isOwnerOfCurrentTree = currentTree && currentTree.owner_id === currentUserId;

  // Recherche dynamique de DRH
  useEffect(() => {
    const searchDRH = async () => {
      if (drhSearchQuery.trim().length < 2) {
        setDrhSuggestions([]);
        return;
      }
      try {
        let query = supabase.from('profiles').select('id, email, role').ilike('email', `%${drhSearchQuery}%`);
        const currentDrhIds = Array.isArray(currentSession?.drh_ids) ? currentSession.drh_ids.filter(id => id && String(id).trim() !== "") : [];
        if (currentDrhIds.length > 0) {
          query = query.not('id', 'in', `(${currentDrhIds.join(',')})`);
        }
        const { data, error } = await query.limit(5);
        if (data && !error) setDrhSuggestions(data);
      } catch (err) {
        console.error(err);
      }
    };
    const delayDebounce = setTimeout(() => searchDRH(), 300);
    return () => clearTimeout(delayDebounce);
  }, [drhSearchQuery, currentSession?.drh_ids]);

  // Filtrage des quêtes (Axe RSE à droite)
  const safeQuestsList = quests || [];
  const filteredQuests = safeQuestsList.filter(q => {
    if (!q) return false;
    const matchesSearch = (q.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (q.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = filterTheme === 'all' || q.theme === filterTheme;
    const matchesDifficulty = filterDifficulty === 'all' || Number(q.difficulty) === Number(filterDifficulty);
    return matchesSearch && matchesTheme && matchesDifficulty;
  }).sort((a, b) => (a.theme || '').localeCompare(b.theme || ''));  

  // Recalcul de la contrainte maximale d'équipe
  const recalculateAndSaveMaxTeamConstraint = async (treeId, floorsArray) => {
    if (!treeId || !floorsArray) return;
    const attachedQuestIds = floorsArray.flatMap(f => f.quests || []);
    const linkedQuests = safeQuestsList.filter(q => attachedQuestIds.includes(q.id));
    const maxConstraint = linkedQuests.reduce((max, q) => {
      if (q.is_collaborative || q.is_collaborative === 'true') return Math.max(max, Number(q.required_partners) || 2);
      return max;
    }, 1);

    await supabase.from('trees').update({ max_team_constraint: maxConstraint }).eq('id', treeId);
    if (typeof setTrees === 'function') {
      setTrees(prev => (!prev[treeId] ? prev : { ...prev, [treeId]: { ...prev[treeId], max_team_constraint: maxConstraint } }));
    }
  };

  // Sauvegarde globale
  const handleSaveChanges = async () => {
    if (activeTab === 'tree' && currentTree) {
      if (!isOwnerOfCurrentTree) {
        alert("⚠️ Mode lecture seule.");
        return;
      }
      const { error } = await supabase.from('trees').update({ floors: currentTree.floors || [] }).eq('id', currentTree.id);
      if (error) alert(`❌ Erreur : ${error.message}`);
      else {
        await recalculateAndSaveMaxTeamConstraint(currentTree.id, currentTree.floors);
        alert(`🎉 Arbre enregistré !`);
      }
    } 
    if (activeTab === 'sessions' && currentSession) {
      // Sauvegarde de l'arbre relié, des DRH ET du planning
      const { error } = await supabase.from('sessions').update({ 
        tree_id: currentSession.tree_id, 
        drh_ids: currentSession.drh_ids || [],
        planning: currentSession.planning || [] // Sauvegarde directe du planning en colonne JSONB
      }).eq('id', currentSession.id);
      if (error) alert(`❌ Erreur : ${error.message}`);
      else alert(`🎉 Configuration de la session et planning enregistrés !`);
    }
  };

  const handleShareTree = async () => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const { error } = await supabase.from('trees').update({ visibility: 'public' }).eq('id', currentTree.id);
    if (error) alert(error.message);
    else {
      if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [currentTree.id]: { ...prev[currentTree.id], visibility: 'public' } }));
      alert(`🌍 Arbre partagé !`);
    }
  };

  const handleDuplicateTreeAsLocal = async (treeToCopy) => {
    if (!treeToCopy) return;
    const { data, error } = await supabase.from('trees').insert([{ name: `${treeToCopy.name} (Copie locale)`, owner_id: currentUserId, floors: treeToCopy.floors || [], visibility: 'private', max_team_constraint: treeToCopy.max_team_constraint || 1 }]).select().single();
    if (error) return alert(error.message);
    if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [data.id]: data }));
    setActiveTreeId(data.id);
    setActiveModal(null);
  };

  const updateCurrentTreeInState = (updatedFields) => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [activeTreeId]: { ...currentTree, ...updatedFields } }));
  };

  const updateCurrentSessionInState = (updatedFields) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updatedFields } : s));
  };

  // Paliers d'arbres & Drag and drop d'architecture (Onglet ARBRE)
  const handleAddFloor = () => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const floors = currentTree.floors ? [...currentTree.floors] : [];
    const nextFloorId = floors.length > 0 ? Math.max(...floors.map(f => f.floorId || 0)) + 1 : 1;
    const updatedFloors = [...floors, { floorId: nextFloorId, mode: newFloorMode, quests: [], count: 2, allowedDifficulties: [1, 2, 3] }];
    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  const handleRemoveFloor = (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.filter(f => f.floorId !== floorId).map((f, i) => ({ ...f, floorId: i + 1 }));
    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  const handleDragStart = (index) => { if (isOwnerOfCurrentTree) setDraggedFloorIndex(index); };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (index) => {
    if (draggedFloorIndex === null || draggedFloorIndex === index) return;
    const updatedFloors = [...currentTree.floors];
    const [draggedItem] = updatedFloors.splice(draggedFloorIndex, 1);
    updatedFloors.splice(index, 0, draggedItem);
    const reindexedFloors = updatedFloors.map((f, i) => ({ ...f, floorId: i + 1 }));
    updateCurrentTreeInState({ floors: reindexedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, reindexedFloors);
    setDraggedFloorIndex(null);
  };

  const toggleFloorMode = (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({ floors: currentTree.floors.map(f => f.floorId === floorId ? { ...f, mode: f.mode === 'static' ? 'random' : 'static' } : f) });
  };

  const handleCountChange = (floorId, val) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({ floors: currentTree.floors.map(f => f.floorId === floorId ? { ...f, count: Math.max(1, parseInt(val, 10) || 1) } : f) });
  };

  const handleToggleDifficultyInFloor = (floorId, diffLevel) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({
      floors: currentTree.floors.map(f => {
        if (f.floorId !== floorId) return f;
        const currentDiffs = f.allowedDifficulties || [1, 2, 3];
        const nextDiffs = currentDiffs.includes(Number(diffLevel)) ? currentDiffs.filter(d => Number(d) !== Number(diffLevel)) : [...currentDiffs, Number(diffLevel)];
        return { ...f, allowedDifficulties: nextDiffs.map(d => Number(d)) };
      })
    });
  };

  const handleToggleQuestInFloor = (floorId, questId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.map(f => {
      if (f.floorId !== floorId) return f;
      const currentQuests = f.quests || [];
      return { ...f, quests: currentQuests.includes(questId) ? currentQuests.filter(id => id !== questId) : [...currentQuests, questId] };
    });
    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  // Créations formulaires modales
  const handleCreateTree = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTreeName.trim()) return;
    const { data, error } = await supabase.from('trees').insert([{ name: newTreeName.trim(), owner_id: currentUserId, floors: [], visibility: 'private', max_team_constraint: 1, max_user: 100 }]).select().single();
    if (error) return;
    if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [data.id]: data }));
    setActiveTreeId(data.id);
    setNewTreeName('');
    setActiveModal(null);
  };

  const handleCreateQuest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newQuestName || !newQuestDesc) return;
    const calculatedDifficulty = newQuestType === 'boss' ? 3 : newQuestType === 'miniboss' ? 2 : 1;
    const { data, error } = await supabase.from('quests').insert([{ name: newQuestName, desc: newQuestDesc, theme: newQuestTheme, difficulty: String(calculatedDifficulty), owner_id: currentUserId, visibility: 'private', is_collaborative: isCollaborative, required_partners: isCollaborative ? (requiredPartners || 2) : 2 }]).select().single();
    if (error) return;
    if (typeof setQuests === 'function') setQuests(prev => [...(prev || []), data]);
    setNewQuestName(''); setNewQuestDesc(''); setIsCollaborative(false); setActiveModal(null);
  };

  const handleCreateSession = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const code = newSessionCode.trim().toUpperCase();
    if (!code) return;
    const { data, error } = await supabase.from('sessions').insert([{ session_code: code, created_by: currentUserId, manager_id: currentUserId, tree_id: activeTreeId || null, drh_ids: [], planning: [] }]).select().single();
    if (error) return alert(error.message);
    setSessions(prev => [data, ...prev]);
    setActiveSessionId(data.id);
    setNewSessionCode(''); 
    setActiveModal(null);
  };

  const handleAddDRH = (drhUser) => {
    if (!currentSession) return;
    const currentDrhIds = currentSession.drh_ids || [];
    if (currentDrhIds.includes(drhUser.id)) return;
    updateCurrentSessionInState({ drh_ids: [...currentDrhIds, drhUser.id] });
    const emailCache = JSON.parse(localStorage.getItem('drh_emails') || '{}');
    emailCache[drhUser.id] = drhUser.email;
    localStorage.setItem('drh_emails', JSON.stringify(emailCache));
    setDrhSearchQuery(''); setDrhSuggestions([]);
  };

  const handleRemoveDRH = (drhId) => {
    if (!currentSession) return;
    updateCurrentSessionInState({ drh_ids: (currentSession.drh_ids || []).filter(id => id !== drhId) });
  };

  const filteredBrowsedTrees = Object.values(trees || {}).filter(t => {
    if (!t) return false;
    const matchesSearch = (t.name || '').toLowerCase().includes(treeSearchQuery.toLowerCase());
    return treeBrowserTab === 'local' ? (matchesSearch && t.owner_id === currentUserId) : (matchesSearch && t.visibility === 'public');
  });

  // --- LOGIQUE ET VALIDATEURS DRAG & DROP DU PLANNING SESSIONS ---
  const checkPlacementValidity = (floorId, targetIndex, timeline) => {
    if (!floorId) return true; // Les blocs personnalisés n'ont pas de contrainte de palier
    
    // Trouver le palier le plus haut placé AVANT le point de dépôt
    let prevMaxFloor = -1;
    for (let i = 0; i < targetIndex; i++) {
      if (timeline[i]?.type === 'palier') {
        prevMaxFloor = Math.max(prevMaxFloor, timeline[i].floorId);
      }
    }

    // Trouver le palier le plus bas placé APRÈS le point de dépôt
    let nextMinFloor = 999;
    for (let i = targetIndex; i < timeline.length; i++) {
      if (timeline[i]?.type === 'palier') {
        nextMinFloor = Math.min(nextMinFloor, timeline[i].floorId);
      }
    }

    // Le palier courant doit être strictement supérieur aux précédents, et strictement inférieur aux suivants
    return floorId > prevMaxFloor && floorId < nextMinFloor;
  };

  const handleTimelineDrop = (targetIndex) => {
    if (!currentSession || !draggedPlanningItem) return;
    const timeline = currentSession.planning ? [...currentSession.planning] : [];

    if (draggedPlanningItem.source === 'palette-palier') {
      const floor = draggedPlanningItem.data;
      if (!checkPlacementValidity(floor.floorId, targetIndex, timeline)) {
        alert(`🚫 Ordre incorrect : Le Palier ${floor.floorId} ne respecte pas la chronologie d'exécution des paliers.`);
        setActiveDropIndex(null);
        setDraggedPlanningItem(null);
        return;
      }
      const newBlock = {
        id: `palier-${floor.floorId}-${Date.now()}`,
        type: 'palier',
        floorId: floor.floorId,
        name: `🎯 Palier ${floor.floorId}`,
        desc: `Passage obligatoire par les paliers de l'arbre associé.`,
        color: '#7c3aed', // Violet royal pour paliers
        duration: 45
      };
      timeline.splice(targetIndex, 0, newBlock);
    } 
    else if (draggedPlanningItem.source === 'palette-custom') {
      const newBlock = {
        id: `custom-${Date.now()}`,
        type: 'custom',
        name: customBlockConfig.name,
        desc: customBlockConfig.desc,
        color: customBlockConfig.color,
        duration: customBlockConfig.duration
      };
      timeline.splice(targetIndex, 0, newBlock);
    } 
    else if (draggedPlanningItem.source === 'timeline') {
      const sourceIndex = draggedPlanningItem.index;
      const [movedBlock] = timeline.splice(sourceIndex, 1);
      
      // Si c'est un palier, on re-vérifie la cohérence du nouvel emplacement
      if (movedBlock.type === 'palier' && !checkPlacementValidity(movedBlock.floorId, targetIndex, timeline)) {
        alert(`🚫 Mouvement invalide : Re-positionnement impossible.`);
        setActiveDropIndex(null);
        setDraggedPlanningItem(null);
        return;
      }
      timeline.splice(targetIndex, 0, movedBlock);
    }

    updateCurrentSessionInState({ planning: timeline });
    setActiveDropIndex(null);
    setDraggedPlanningItem(null);
  };

  const removePlanningBlock = (blockId) => {
    if (!currentSession) return;
    const filtered = (currentSession.planning || []).filter(b => b.id !== blockId);
    updateCurrentSessionInState({ planning: filtered });
  };

  const updatePlanningBlockDuration = (blockId, value) => {
    if (!currentSession) return;
    const mins = Math.max(1, parseInt(value, 10) || 15);
    const updated = (currentSession.planning || []).map(b => b.id === blockId ? { ...b, duration: mins } : b);
    updateCurrentSessionInState({ planning: updated });
  };

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
            onClick={() => {
              setActiveTab('sessions');
              setActiveSessionId(''); // Permet de ré-afficher la grille de sélection
            }}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'sessions' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            🔗 Liaison & Planning Sessions ({sessions.length})
          </button>
        </div>

        {activeTab === 'tree' && currentTree && (
          <div className="flex items-center gap-2 text-xs font-bold w-full sm:w-auto justify-end">
            <span className="text-purple-700 font-black bg-purple-100/80 px-3 py-1.5 rounded-lg border border-purple-200">
              👥 Taille groupe max : <span className="text-sm font-black text-purple-900">{currentTree.max_team_constraint || 1}</span>
            </span>
            <button
              onClick={() => setActiveModal('tree_browser')}
              className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-purple-900 font-bold min-w-[180px] flex justify-between items-center hover:bg-purple-100"
            >
              <span className="truncate">{currentTree.name}</span>
              <span className="text-[10px] ml-2">🔍 Changer...</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'tree' && currentTree && !isOwnerOfCurrentTree && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-bold flex justify-between items-center">
          <span>🔒 Mode Lecture Seule (Propriétaire distant).</span>
          <button onClick={() => handleDuplicateTreeAsLocal(currentTree)} className="bg-amber-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] uppercase transition-all">Dupliquer en local</button>
        </div>
      )}

      {/* ZONE DE CONTENU PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE/CENTRE */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ONGLET ARCHITECTURE DE L'ARBRE */}
          {activeTab === 'tree' && (
            currentTree ? (
              <div className="space-y-4">
                {(currentTree.floors || []).map((floor, index) => {
                  const allowedDiffs = (floor.allowedDifficulties || [1, 2, 3]).map(d => Number(d));
                  return (
                    <div 
                      key={floor.floorId} draggable={isOwnerOfCurrentTree}
                      onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index)}
                      className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 transition-all ${draggedFloorIndex === index ? 'opacity-40 border-dashed border-purple-400 scale-[0.99]' : ''}`}
                    >
                      <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3 gap-3">
                        <div className="flex items-center gap-3">
                          {isOwnerOfCurrentTree && <span className="text-slate-400 cursor-grab active:cursor-grabbing font-bold text-base px-1 select-none">⠿</span>}
                          <span className="bg-purple-700 text-white font-extrabold px-2.5 py-1 text-xs rounded-lg">PALIER {floor.floorId}</span>
                          <button disabled={!isOwnerOfCurrentTree} onClick={() => toggleFloorMode(floor.floorId)} className={`text-xs font-bold px-3 py-1 rounded-full border ${floor.mode === 'static' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{floor.mode === 'static' ? '📌 Statique' : '🎲 Aléatoire'}</button>
                          <div className="flex items-center bg-slate-100 px-2 py-0.5 rounded-lg border gap-1.5">
                            {[1, 2, 3].map(level => (
                              <button key={level} disabled={!isOwnerOfCurrentTree} onClick={() => handleToggleDifficultyInFloor(floor.floorId, level)} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-black ${allowedDiffs.includes(Number(level)) ? 'bg-amber-400 text-amber-950 border border-amber-500' : 'text-slate-400'}`}>{level}★</button>
                            ))}
                          </div>
                          {floor.mode === 'random' && (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-900">
                              <span>🎯 Tirer :</span>
                              <input type="number" min="1" disabled={!isOwnerOfCurrentTree} value={floor.count !== undefined ? floor.count : 2} onChange={(e) => handleCountChange(floor.floorId, e.target.value)} className="w-10 bg-white border border-amber-300 rounded text-center py-0.5 font-black text-slate-900" />
                            </div>
                          )}
                        </div>
                        {isOwnerOfCurrentTree && <button onClick={() => handleRemoveFloor(floor.floorId)} className="text-slate-400 hover:text-red-500 text-xs font-bold">Supprimer</button>}
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-500 uppercase">{floor.mode === 'static' ? 'Missions obligatoires :' : `Pool aléatoire (${(floor.quests || []).length}) :`}</div>
                        <div className="flex flex-wrap gap-2">
                          {safeQuestsList.filter(q => q && allowedDiffs.includes(Number(q.difficulty))).map(quest => {
                            const isSelected = (floor.quests || []).includes(quest.id);
                            const isQuestCollab = quest.is_collaborative || quest.is_collaborative === 'true' || quest.is_collaborative === true;
                            return (
                              <button key={quest.id} disabled={!isOwnerOfCurrentTree} onClick={() => handleToggleQuestInFloor(floor.floorId, quest.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${isSelected ? 'bg-purple-700 text-white border-purple-800 shadow-sm font-bold' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                <span>{quest.name}</span>
                                {isQuestCollab && <span className={`px-1 rounded text-[10px] uppercase font-black ${isSelected ? 'bg-purple-950 text-purple-300' : 'bg-purple-200 text-purple-900'}`}>🤝 {quest.required_partners || 2}p</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isOwnerOfCurrentTree && (
                  <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-600">Nouveau palier :</label>
                      <select value={newFloorMode} onChange={(e) => setNewFloorMode(e.target.value)} className="bg-white border rounded-lg text-xs p-2 font-semibold">
                        <option value="static">📌 Statique</option>
                        <option value="random">🎲 Aléatoire</option>
                      </select>
                    </div>
                    <button onClick={handleAddFloor} className="bg-purple-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg">➕ Insérer un Palier</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border p-12 rounded-xl text-center text-slate-400 text-xs font-semibold">Aucun arbre actif.</div>
            )
          )}

          {/* SESSIONS : VUE DES SESSIONS ACTIVES (GALERIE 3 COLONNES PROGRESSIVE) */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              
              {/* ÉTAPE A : AUCUNE SESSION SÉLECTIONNÉE -> GALERIE RECTANGULAIRE 3 COLONNES */}
              {!activeSessionId ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h2 className="text-md font-black text-slate-900 uppercase tracking-wide">📆 Calendrier & Galerie de vos Sessions</h2>
                      <p className="text-xs text-slate-500">Sélectionnez ou créez un espace promotionnel pour calibrer son planning.</p>
                    </div>
                    <button onClick={() => setActiveModal('session')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all">
                      ➕ Nouvelle Session
                    </button>
                  </div>

                  {sessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sessions.map(s => {
                        const formattedDate = s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date inconnue';
                        const linkedTree = trees[s.tree_id];
                        const groupMin = linkedTree ? (linkedTree.max_team_constraint || 1) : 1;
                        
                        return (
                          <div 
                            key={s.id}
                            onClick={() => setActiveSessionId(s.id)}
                            className="p-5 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer transition-all flex flex-col justify-between text-xs space-y-4 shadow-3xs"
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-mono font-black text-blue-900 text-xs bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                  {s.session_code || 'SANS CODE'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">📅 {formattedDate}</span>
                              </div>
                              
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Arbre connecté :</span>
                                <span className={`font-semibold truncate block ${linkedTree ? 'text-emerald-700 font-bold' : 'text-slate-400 italic'}`}>
                                  {linkedTree ? `🌳 ${linkedTree.name}` : '❌ Aucun parcours assigné'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-bold text-slate-500">
                              <span>👥 {groupMin} pers. min / groupe</span>
                              <span className="text-blue-600 font-semibold group-hover:underline">Ouvrir →</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-400 text-xs font-medium">
                      Aucune session enregistrée. Créez-en une à l'aide du bouton ci-dessus ou de la barre latérale.
                    </div>
                  )}
                </div>
              ) : (
                
                /* ÉTAPE B : SESSION SELECTIONNÉE -> AFFICHAGE INTERFACE DE CONFIG & TIMELINE DU PLANNING */
                currentSession && (
                  <div className="space-y-6">
                    
                    {/* EN-TÊTE CONFIGURATION */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <button 
                          onClick={() => setActiveSessionId('')} 
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                        >
                          ⬅️ Retour à la Galerie des Sessions
                        </button>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          Session Active : <span className="text-blue-600 font-mono text-sm font-black">{currentSession.session_code}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                        <div>
                          <label className="block text-slate-700 mb-1">Relier à l'Arbre pédagogique :</label>
                          <select 
                            value={currentSession?.tree_id || ""} 
                            onChange={(e) => updateCurrentSessionInState({ tree_id: e.target.value })} 
                            className="w-full p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 focus:outline-none cursor-pointer font-bold"
                          >
                            <option value="">-- Aucun arbre lié --</option>
                            {Object.values(trees || {}).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>

                        <div className="bg-purple-50 text-purple-800 p-2.5 rounded-xl border border-purple-100 flex flex-col justify-center">
                          <span className="text-[10px] uppercase font-black text-purple-500 block">Code Unique Apprenant</span>
                          <div className="text-sm font-mono font-black tracking-widest bg-white border rounded-lg p-1.5 text-center text-purple-900 mt-1 select-all shadow-2xs">
                            {currentSession.session_code || "CODE VIDE ⚠️"}
                          </div>
                        </div>
                      </div>

                      {/* OBSERVATEURS DRH */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 relative text-xs">
                        <span className="text-[10px] uppercase font-black text-slate-500 block">Observateurs DRH rattachés à cette promotion</span>
                        <input 
                          type="text" 
                          placeholder="Rechercher un compte RH par email..." 
                          value={drhSearchQuery} 
                          onChange={(e) => setDrhSearchQuery(e.target.value)} 
                          className="w-full bg-white border text-xs rounded-lg p-2 focus:outline-none focus:border-purple-500 font-medium" 
                        />
                        
                        {drhSuggestions.length > 0 && (
                          <div className="absolute left-4 right-4 mt-1 bg-white border rounded-xl shadow-xl max-h-32 overflow-y-auto z-50 divide-y">
                            {drhSuggestions.map(u => (
                              <button 
                                key={u.id} type="button" onClick={() => handleAddDRH(u)} 
                                className="w-full text-left px-3 py-2 hover:bg-purple-50 font-medium flex justify-between items-center text-xs"
                              >
                                <span>{u.email}</span>
                                <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-400">{u.role || 'DRH'}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Array.isArray(currentSession.drh_ids) && currentSession.drh_ids.length > 0 ? (
                            currentSession.drh_ids.map(id => {
                              let cachedEmails = {};
                              try { cachedEmails = JSON.parse(localStorage.getItem('drh_emails') || '{}'); } catch(e) {}
                              const displayName = cachedEmails[id] || `Manager (${id.substring(0, 5)})`;
                              return (
                                <span key={id} className="text-[11px] bg-slate-950 text-white font-medium px-2.5 py-1 rounded-lg flex items-center gap-2">
                                  <span>{displayName}</span>
                                  <button type="button" onClick={() => handleRemoveDRH(id)} className="text-red-400 hover:text-red-500 font-bold">✕</button>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Aucun manager assigné.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* TIMELINE DE PLANNING (FRISE INTERACTIVE) */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">📅 Planning Pédagogique de la Session</h3>
                        <p className="text-xs text-slate-500">Déposez et organisez vos jalons chronologiques de formation ci-dessous.</p>
                      </div>

                      {/* ZONE DROP INITIALE (timeline vide) */}
                      {(currentSession.planning || []).length === 0 && (
                        <div 
                          onDragOver={(e) => {
                            e.preventDefault();
                            setActiveDropIndex(0);
                          }}
                          onDragLeave={() => setActiveDropIndex(null)}
                          onDrop={() => handleTimelineDrop(0)}
                          className={`border-2 border-dashed p-10 rounded-xl text-center text-xs transition-all ${
                            activeDropIndex === 0 
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                              : 'border-slate-300 text-slate-400'
                          }`}
                        >
                          📂 Glissez vos Paliers ou Blocs Personnalisés ici pour initier la frise temporelle
                        </div>
                      )}

                      {/* ZONE TIMELINE ACTIVE */}
                      {(currentSession.planning || []).length > 0 && (
                        <div className="relative pl-8 border-l-2 border-slate-200 space-y-4 py-2">
                          
                          {/* Dépose au tout début */}
                          <div 
                            onDragOver={(e) => {
                              e.preventDefault();
                              setActiveDropIndex(0);
                            }}
                            onDragLeave={() => setActiveDropIndex(null)}
                            onDrop={() => handleTimelineDrop(0)}
                            className={`h-4 -mt-2 transition-all rounded-lg flex items-center justify-center text-[10px] font-black ${
                              activeDropIndex === 0 
                                ? 'bg-emerald-500 text-white animate-pulse' 
                                : 'opacity-0 hover:opacity-100 bg-slate-100 text-slate-500'
                            }`}
                          >
                            ➕ Déposer ici (Début de planning)
                          </div>

                          {(currentSession.planning || []).map((block, idx) => {
                            return (
                              <React.Fragment key={block.id}>
                                <div 
                                  draggable
                                  onDragStart={() => setDraggedPlanningItem({ source: 'timeline', index: idx })}
                                  className="relative bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-2 group transition-all"
                                  style={{ borderLeft: `5px solid ${block.color || '#cbd5e1'}` }}
                                >
                                  {/* Badge de type */}
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-extrabold uppercase tracking-wide px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${block.color}20`, color: block.color }}>
                                      {block.type === 'palier' ? `🌳 Palier ${block.floorId}` : '📝 Hors Arbre'}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-slate-400 font-bold">⏱️ Durée :</span>
                                        <input 
                                          type="number" 
                                          min="1" 
                                          value={block.duration || 15} 
                                          onChange={(e) => updatePlanningBlockDuration(block.id, e.target.value)}
                                          className="w-14 bg-slate-50 border border-slate-200 text-center rounded text-[11px] font-bold p-0.5"
                                        />
                                        <span className="text-[10px] text-slate-400">mins</span>
                                      </div>
                                      <button 
                                        onClick={() => removePlanningBlock(block.id)}
                                        className="text-slate-400 hover:text-red-500 text-xs font-black transition-all"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>

                                  <h4 className="font-bold text-xs text-slate-900">{block.name}</h4>
                                  <p className="text-[11px] text-slate-500 italic">"{block.desc}"</p>
                                  
                                  {/* Point de la Timeline */}
                                  <div 
                                    className="absolute -left-[39px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all"
                                    style={{ borderColor: block.color }}
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: block.color }}></div>
                                  </div>
                                </div>

                                {/* Zone de drop entre deux éléments */}
                                <div 
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setActiveDropIndex(idx + 1);
                                  }}
                                  onDragLeave={() => setActiveDropIndex(null)}
                                  onDrop={() => handleTimelineDrop(idx + 1)}
                                  className={`h-4 transition-all rounded-lg flex items-center justify-center text-[10px] font-black ${
                                    activeDropIndex === idx + 1 
                                      ? 'bg-emerald-500 text-white animate-pulse' 
                                      : 'opacity-0 hover:opacity-100 bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  ➕ Insérer une étape ici
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

        {/* POOL DROITE (DYNAMIQUE SELON L'ONGLET SÉLECTIONNÉ) */}
        <div className="space-y-6">
          
          {/* CAS A : CATALOGUE DES QUÊTES CLASSIQUE SUR L'ONGLET "ARBRE" */}
          {activeTab === 'tree' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit space-y-4">
              <h3 className="font-black text-slate-900 border-b pb-2 text-sm tracking-wide uppercase">📦 Catalogue de Missions ({filteredQuests.length})</h3>
              
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                <input 
                  type="text" placeholder="🔍 Trouver une mission..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-700 shadow-xs"
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

              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 animate-fadeIn">
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
                          🤝 Collaborative ({q.required_partners || 2}p)
                        </div>
                      )}
                      <div className="opacity-80 italic text-[11px] pt-1">"{q.desc}"</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CAS B : BOÎTE À OUTILS PLANNING SUR L'ONGLET "SESSIONS" (SI UNE SESSION EST SÉLECTIONNÉE) */}
          {activeTab === 'sessions' && activeSessionId && currentSession && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit space-y-6">
              <div>
                <h3 className="font-black text-slate-900 border-b pb-2 text-xs tracking-wide uppercase">🛠️ Palette d'Éléments de Planning</h3>
                <p className="text-[11px] text-slate-400 mt-1">Faites glisser ces jalons vers votre frise à gauche.</p>
              </div>

              {/* SECTION PALIERS DE L'ARBRE ASSOCIE */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">🌳 Paliers de l'arbre connecté</span>
                
                {currentSession.tree_id && trees[currentSession.tree_id] ? (
                  <div className="space-y-2">
                    {(trees[currentSession.tree_id].floors || []).map(floor => {
                      // Vérifier si ce palier a déjà été consommé dans le planning
                      const isAlreadyPlaced = (currentSession.planning || []).some(b => b.type === 'palier' && b.floorId === floor.floorId);
                      
                      return (
                        <div 
                          key={floor.floorId}
                          draggable={!isAlreadyPlaced}
                          onDragStart={() => setDraggedPlanningItem({ source: 'palette-palier', data: floor })}
                          className={`p-3 border rounded-xl text-xs flex justify-between items-center transition-all ${
                            isAlreadyPlaced 
                              ? 'bg-slate-100 border-slate-200 opacity-40 cursor-not-allowed' 
                              : 'bg-purple-50 hover:bg-purple-100/70 border-purple-200 text-purple-950 cursor-grab active:cursor-grabbing'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-black block">🎯 Palier {floor.floorId}</span>
                            <span className="text-[10px] text-purple-700/80">Mode: {floor.mode === 'static' ? '📌 Statique' : '🎲 Aléatoire'}</span>
                          </div>
                          {isAlreadyPlaced ? (
                            <span className="text-[9px] font-black uppercase text-slate-400">Placé</span>
                          ) : (
                            <span className="text-[16px]">⠿</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Liez un arbre pédagogique pour extraire ses paliers.</p>
                )}
              </div>

              {/* SECTION BLOCS ILLIMITES & CONFIGURABLES */}
              <div className="space-y-3 border-t pt-4">
                <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">📝 Générateur de Blocs Personnalisés (Illimité)</span>
                
                {/* Formulaire de configuration locale du Bloc Réutilisable */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-0.5">Intitulé du bloc</label>
                    <input 
                      type="text" 
                      value={customBlockConfig.name} 
                      onChange={(e) => setCustomBlockConfig(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-md p-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-0.5">Description / Objectif</label>
                    <textarea 
                      value={customBlockConfig.desc} 
                      onChange={(e) => setCustomBlockConfig(prev => ({ ...prev, desc: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-[11px] italic"
                      rows="2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-0.5">Couleur</label>
                      <select 
                        value={customBlockConfig.color} 
                        onChange={(e) => setCustomBlockConfig(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full bg-white border rounded-md p-1 font-bold"
                      >
                        <option value="#3b82f6">🔵 Bleu</option>
                        <option value="#10b981">🟢 Vert</option>
                        <option value="#f59e0b">🟡 Ambre</option>
                        <option value="#ef4444">🔴 Rouge</option>
                        <option value="#0d9488">🌐 Sarcelle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-0.5">Défaut (mins)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={customBlockConfig.duration} 
                        onChange={(e) => setCustomBlockConfig(prev => ({ ...prev, duration: parseInt(e.target.value, 10) || 15 }))}
                        className="w-full bg-white border rounded-md p-1 font-bold text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloc à faire glisser (Draggable) */}
                <div 
                  draggable
                  onDragStart={() => setDraggedPlanningItem({ source: 'palette-custom' })}
                  className="p-3 border rounded-xl text-xs flex justify-between items-center cursor-grab active:cursor-grabbing transition-all text-white font-bold"
                  style={{ backgroundColor: customBlockConfig.color }}
                >
                  <div className="space-y-0.5">
                    <span>✨ {customBlockConfig.name || "Nouveau bloc personnalisé"}</span>
                    <span className="text-[10px] block opacity-80 font-normal">({customBlockConfig.duration} mins)</span>
                  </div>
                  <span className="text-[16px]">⠿</span>
                </div>
                <p className="text-[10px] text-center text-slate-400 italic">Ce bloc est réutilisable à l'infini dans le planning de session.</p>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* BARRE OUTILS FLOTTANTE GAUCHE (Totalement préservée et alignée) */}
      <div className="fixed top-28 left-4 bg-slate-900/95 backdrop-blur-md border border-slate-700 w-16 py-6 rounded-2xl flex flex-col items-center gap-5 shadow-2xl z-40">
        <button onClick={() => setActiveModal('tree')} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-900/50 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" title="Créer un nouvel Arbre">🌳</button>
        <button onClick={() => setActiveModal('quest')} className="bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-900/50 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" title="Créer une mission">✨</button>
        <button onClick={() => setActiveModal('session')} className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-900/50 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" title="Créer une session">📆</button>
        
        {currentTree && isOwnerOfCurrentTree && currentTree.visibility !== 'public' && (
          <button onClick={handleShareTree} className="bg-amber-600 hover:bg-amber-500 text-white w-10 h-10 rounded-xl flex items-center justify-center text-md font-bold transition-all" title="Partager l'arbre">🌍</button>
        )}

        <div className="w-8 h-px bg-slate-700 my-1"></div>
        <button onClick={handleSaveChanges} className="bg-emerald-600 hover:bg-emerald-500 text-white w-12 h-12 rounded-xl flex flex-col items-center justify-center text-sm font-black shadow-lg uppercase tracking-tight transition-all" title="Enregistrer sur Supabase">💾</button>
      </div>

      {/* MODALES */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>

            {activeModal === 'tree' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">🌳 Nouvel Arbre Pédagogique</h3>
                <form onSubmit={handleCreateTree} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Nom de l'arbre :</label>
                    <input type="text" required placeholder="Ex: Cursus RSE - Niveau Avancé" value={newTreeName} onChange={(e) => setNewTreeName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-semibold" />
                  </div>
                  <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition-all font-sans uppercase">Créer l'arbre</button>
                </form>
              </>
            )}

            {activeModal === 'tree_browser' && (
              <>
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">🔍 Catalogue global des Arbres</h3>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
                  <button type="button" onClick={() => setTreeBrowserTab('local')} className={`flex-1 py-1.5 rounded-lg text-center ${treeBrowserTab === 'local' ? 'bg-white text-purple-950 shadow-sm' : 'text-slate-500'}`}>🏠 Mes Arbres</button>
                  <button type="button" onClick={() => setTreeBrowserTab('shared')} className={`flex-1 py-1.5 rounded-lg text-center ${treeBrowserTab === 'shared' ? 'bg-white text-purple-950 shadow-sm' : 'text-slate-500'}`}>🌍 Modèles partagés</button>
                </div>
                <input type="text" placeholder="Rechercher un arbre..." value={treeSearchQuery} onChange={(e) => setTreeSearchQuery(e.target.value)} className="w-full border text-xs rounded-lg p-2 bg-slate-50 font-medium" />
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredBrowsedTrees.map((t) => {
                    const isSelected = t.id === activeTreeId;
                    return (
                      <div key={t.id} className={`p-3 border rounded-xl flex flex-col justify-between gap-2 ${isSelected ? 'bg-purple-50 border-purple-300' : 'bg-slate-50'}`}>
                        <div>
                          <h4 className="font-bold text-xs text-slate-800">{t.name}</h4>
                        </div>
                        <div className="flex justify-end gap-1.5 border-t pt-1">
                          {!isSelected && <button type="button" onClick={() => { setActiveTreeId(t.id); setActiveModal(null); }} className="bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1 rounded-md">🎯 Activer</button>}
                          {t.owner_id !== currentUserId && <button type="button" onClick={() => handleDuplicateTreeAsLocal(t)} className="bg-purple-100 text-purple-700 font-bold text-[10px] px-2.5 py-1 rounded-md">📥 Copier</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeModal === 'quest' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">✨ Nouvelle Mission</h3>
                <form onSubmit={handleCreateQuest} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Nom de la mission :</label>
                    <input type="text" required value={newQuestName} onChange={(e) => setNewQuestName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-semibold" />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Consigne :</label>
                    <textarea required rows="2" value={newQuestDesc} onChange={(e) => setNewQuestDesc(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50" />
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_collab" checked={isCollaborative} onChange={(e) => setIsCollaborative(e.target.checked)} />
                      <label htmlFor="is_collab" className="font-bold text-purple-950 uppercase tracking-wider cursor-pointer">🤝 Mission Collaborative</label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Axe RSE :</label>
                      <select value={newQuestTheme} onChange={(e) => setNewQuestTheme(e.target.value)} className="w-full border rounded-lg p-2.5 bg-white font-bold">
                        <option value="social">🌱 Social</option>
                        <option value="env">🌍 Environnement</option>
                        <option value="tech">⚙️ Technique</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Rang :</label>
                      <select value={newQuestType} onChange={(e) => setNewQuestType(e.target.value)} className="w-full border rounded-lg p-2.5 bg-white font-bold">
                        <option value="normal">📄 Standard (1★)</option>
                        <option value="miniboss">⚡ Miniboss (2★)</option>
                        <option value="boss">🔥 Boss (3★)</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-purple-700 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all">Créer la mission</button>
                </form>
              </>
            )}

            {activeModal === 'session' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">💡 Initialiser un Espace Session</h3>
                <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Code d'accès (ex: AIRBUS-26) :</label>
                    <input type="text" required placeholder="AIRBUS-LILLE-26" value={newSessionCode} onChange={(e) => setNewSessionCode(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-mono font-bold uppercase tracking-wider text-center text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all">Générer la session</button>
                </form>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
