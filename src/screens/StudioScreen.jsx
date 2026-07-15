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

  // Mode collaboratif & livrables
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [requiredPartners, setRequiredPartners] = useState(2);
  const [requiredDeliverable, setRequiredDeliverable] = useState('');

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

  // --- ÉTATS POUR LE PLANNING DE SESSION (DRAG & DROP TIMELINE) ---
  const [customBlockConfig, setCustomBlockConfig] = useState({
    name: 'Pause Café / Réflexion',
    desc: 'Un moment de débrief libre ou de pause active',
    color: '#3b82f6', // Bleu par défaut
    duration: 15
  });

  const [draggedPlanningItem, setDraggedPlanningItem] = useState(null);
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
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('id', { ascending: false }) // Tri sur ID BigInt
      .eq('created_by', userId);

    if (data && !error) {
      const mappedSessions = data.map(s => ({
        ...s,
        planning: s.planning || []
      }));
      setSessions(mappedSessions);
      
      const allDrhIds = mappedSessions.flatMap(s => s.drh_ids || []);
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

  // Filtrage des quêtes
  const safeQuestsList = quests || [];
  const filteredQuests = safeQuestsList.filter(q => {
    if (!q) return false;
    const matchesSearch = (q.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (q.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = filterTheme === 'all' || q.theme === filterTheme;
    const matchesDifficulty = filterDifficulty === 'all' || Number(q.difficulty) === Number(filterDifficulty);
    return matchesSearch && matchesTheme && matchesDifficulty;
  }).sort((a, b) => (a.theme || '').localeCompare(b.theme || ''));  

  // Recalcul de la contrainte maximale d'équipe (recherche parmi les quêtes liées aux paliers)
  const recalculateAndSaveMaxTeamConstraint = async (treeId, floorsArray) => {
    if (!treeId || !floorsArray) return;
    const attachedQuestIds = floorsArray.flatMap(f => f.quests || []);
    const linkedQuests = safeQuestsList.filter(q => attachedQuestIds.includes(q.id));
    const maxConstraint = linkedQuests.reduce((max, q) => {
      if (q.is_collaborative === true || String(q.is_collaborative) === 'true') {
        return Math.max(max, parseInt(q.required_partners, 10) || 2);
      }
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
      const { error } = await supabase.from('sessions').update({ 
        tree_id: currentSession.tree_id, 
        drh_ids: currentSession.drh_ids || [],
        planning: currentSession.planning || [] 
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
    const { data, error } = await supabase.from('trees').insert([{ 
      name: `${treeToCopy.name} (Copie locale)`, 
      owner_id: currentUserId, 
      floors: treeToCopy.floors || [], 
      visibility: 'private', 
      max_team_constraint: parseInt(treeToCopy.max_team_constraint, 10) || 1,
      max_user: parseInt(treeToCopy.max_user, 10) || 100
    }]).select().single();
    
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

  // Créations formulaires modales (Mise en œuvre des types de la table)
  const handleCreateTree = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTreeName.trim()) return;
    const { data, error } = await supabase.from('trees').insert([{ 
      name: newTreeName.trim(), 
      owner_id: currentUserId, 
      floors: [], 
      visibility: 'private', 
      max_team_constraint: 1, 
      max_user: 100 
    }]).select().single();
    
    if (error) return;
    if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [data.id]: data }));
    setActiveTreeId(data.id);
    setNewTreeName('');
    setActiveModal(null);
  };

  const handleCreateQuest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newQuestName || !newQuestDesc) return;
    
    const calculatedDifficulty = newQuestType === 'boss' ? '3' : newQuestType === 'miniboss' ? '2' : '1';
    
    const { data, error } = await supabase.from('quests').insert([{ 
      name: newQuestName, 
      desc: newQuestDesc, 
      theme: newQuestTheme, 
      difficulty: String(calculatedDifficulty), // difficulty est un text dans la table
      owner_id: currentUserId, 
      visibility: 'private', 
      is_collaborative: isCollaborative, // boolean dans la table
      required_partners: isCollaborative ? (parseInt(requiredPartners, 10) || 2) : 2, // integer dans la table
      required_deliverable: requiredDeliverable.trim() || null // text dans la table
    }]).select().single();
    
    if (error) return;
    if (typeof setQuests === 'function') setQuests(prev => [...(prev || []), data]);
    setNewQuestName('');
    setNewQuestDesc('');
    setRequiredDeliverable('');
    setIsCollaborative(false);
    setActiveModal(null);
  };

  const handleCreateSession = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const code = newSessionCode.trim().toUpperCase();
    if (!code) return;
    
    const { data, error } = await supabase.from('sessions').insert([{ 
      session_code: code, 
      created_by: currentUserId, 
      manager_id: currentUserId, 
      tree_id: activeTreeId || null, 
      drh_ids: [], 
      planning: [] 
    }]).select().single();
    
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
    setDrhSearchQuery('');
    setDrhSuggestions([]);
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

  // --- DRAG & DROP FONCTIONS POUR LE PLANNING DE SESSION ---
  const handleTimelineDragStart = (e, item, index) => {
    setDraggedPlanningItem({ source: 'timeline', index, data: item });
  };

  const handlePaletteDragStart = (e, source, data) => {
    setDraggedPlanningItem({ source, data });
  };

  const handleTimelineDragOver = (e, index) => {
    e.preventDefault();
    setActiveDropIndex(index);
  };

  const handleTimelineDrop = (e, dropIndex) => {
    e.preventDefault();
    setActiveDropIndex(null);
    if (!draggedPlanningItem || !currentSession) return;

    let updatedPlanning = [...(currentSession.planning || [])];

    if (draggedPlanningItem.source === 'timeline') {
      const dragIndex = draggedPlanningItem.index;
      const [movedItem] = updatedPlanning.splice(dragIndex, 1);
      // Ajuster l'index d'insertion
      const targetIndex = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
      updatedPlanning.splice(targetIndex, 0, movedItem);
    } else {
      let newItem = {};
      if (draggedPlanningItem.source === 'palette-palier') {
        const floor = draggedPlanningItem.data;
        newItem = {
          id: `floor-${floor.floorId}-${Date.now()}`,
          type: 'floor',
          name: `Palier ${floor.floorId}`,
          duration: 45,
          color: '#16a34a', // Vert émeraude
          floorId: floor.floorId,
          mode: floor.mode,
          questsCount: floor.quests?.length || 0
        };
      } else if (draggedPlanningItem.source === 'palette-custom') {
        newItem = {
          id: `custom-${Date.now()}`,
          type: 'custom',
          name: customBlockConfig.name,
          desc: customBlockConfig.desc,
          duration: parseInt(customBlockConfig.duration, 10) || 15,
          color: customBlockConfig.color
        };
      }
      updatedPlanning.splice(dropIndex, 0, newItem);
    }

    updateCurrentSessionInState({ planning: updatedPlanning });
    setDraggedPlanningItem(null);
  };

  const handleRemovePlanningItem = (index) => {
    if (!currentSession) return;
    const updatedPlanning = [...(currentSession.planning || [])];
    updatedPlanning.splice(index, 1);
    updateCurrentSessionInState({ planning: updatedPlanning });
  };

  const handleUpdateItemDuration = (index, newDuration) => {
    if (!currentSession) return;
    const updatedPlanning = [...(currentSession.planning || [])];
    updatedPlanning[index].duration = Math.max(1, parseInt(newDuration, 10) || 1);
    updateCurrentSessionInState({ planning: updatedPlanning });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* 1. EN-TÊTE CONFIGURATION & ACTIONS */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 text-white font-black text-xl px-4 py-2 rounded-xl tracking-wider">
            STUDIO
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('tree')}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${
                activeTab === 'tree' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🌳 Éditer un Arbre
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${
                activeTab === 'sessions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              📅 Sessions & Planning
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'tree' && (
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
              <select
                value={activeTreeId}
                onChange={(e) => setActiveTreeId(e.target.value)}
                className="bg-transparent border-0 font-bold text-xs text-slate-800 focus:ring-0 cursor-pointer max-w-[220px]"
              >
                {Object.values(trees).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.owner_id !== currentUserId ? '👁️ (Lecture)' : ''}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setActiveModal('tree_browser')}
                className="p-1.5 hover:bg-white rounded-lg transition-all"
                title="Parcourir tous les arbres"
              >
                📂
              </button>
              <button 
                onClick={() => setActiveModal('tree')}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black text-xs"
                title="Créer un nouvel arbre"
              >
                ＋
              </button>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
              <select
                value={activeSessionId}
                onChange={(e) => setActiveSessionId(e.target.value)}
                className="bg-transparent border-0 font-bold text-xs text-slate-800 focus:ring-0 cursor-pointer"
              >
                <option value="">-- Choisir une session --</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.session_code}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setActiveModal('session')}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black text-xs"
                title="Créer une session"
              >
                ＋
              </button>
            </div>
          )}

          <button
            onClick={handleSaveChanges}
            className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-purple-200 transition-all cursor-pointer"
          >
            💾 Enregistrer
          </button>
        </div>
      </div>

      {/* 2. ZONE PRINCIPALE DE TRAVAIL */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* ONGLET A : ÉDITEUR D'ARBRE */}
        {activeTab === 'tree' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8">
              {currentTree ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h1 className="text-xl font-black text-slate-950 flex items-center gap-2 uppercase tracking-wide">
                        🌳 {currentTree.name}
                      </h1>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Architecture RSE séquentielle • {currentTree.floors?.length || 0} paliers paramétrés
                      </p>
                    </div>
                    {isOwnerOfCurrentTree && currentTree.visibility === 'private' && (
                      <button onClick={handleShareTree} className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-all">
                        🌍 Rendre public / Partager
                      </button>
                    )}
                  </div>

                  {/* Liste des paliers (Drag and Drop d'architecture) */}
                  <div className="space-y-4">
                    {currentTree.floors && currentTree.floors.map((floor, index) => {
                      const associatedQuests = safeQuestsList.filter(q => (floor.quests || []).includes(q.id));
                      
                      return (
                        <div
                          key={floor.floorId}
                          draggable={isOwnerOfCurrentTree}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(index)}
                          className={`bg-white rounded-2xl border-2 p-5 transition-all flex flex-col md:flex-row gap-5 items-start ${
                            draggedFloorIndex === index 
                              ? 'border-purple-600 border-dashed bg-purple-50/20' 
                              : 'border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          {/* Poignée et Index */}
                          <div className="flex items-center gap-3 shrink-0">
                            {isOwnerOfCurrentTree && (
                              <div className="cursor-grab text-slate-400 hover:text-slate-600 font-bold select-none text-md">
                                ☰
                              </div>
                            )}
                            <div className="w-12 h-12 bg-slate-900 text-white flex flex-col items-center justify-center rounded-xl font-black leading-tight">
                              <span className="text-[10px] text-slate-400 uppercase font-black">PAL</span>
                              <span className="text-lg -mt-1">{floor.floorId}</span>
                            </div>
                          </div>

                          {/* Paramètres du palier */}
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                disabled={!isOwnerOfCurrentTree}
                                onClick={() => toggleFloorMode(floor.floorId)}
                                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                                  floor.mode === 'random' 
                                    ? 'bg-purple-50 border-purple-200 text-purple-700' 
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                }`}
                              >
                                {floor.mode === 'random' ? '🎲 Aléatoire contrôlé' : '📍 Sélection statique'}
                              </button>

                              {floor.mode === 'random' && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-medium text-slate-500">Missions à piocher :</span>
                                  <input
                                    type="number"
                                    disabled={!isOwnerOfCurrentTree}
                                    value={floor.count || 1}
                                    onChange={(e) => handleCountChange(floor.floorId, e.target.value)}
                                    className="w-12 text-center font-bold p-1 border border-slate-200 rounded bg-slate-50 focus:ring-0 focus:border-slate-300"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Difficultés autorisées pour le mode aléatoire */}
                            {floor.mode === 'random' && (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>Difficultés admises :</span>
                                {[1, 2, 3].map(diff => {
                                  const allowed = floor.allowedDifficulties || [1, 2, 3];
                                  const active = allowed.includes(diff);
                                  return (
                                    <button
                                      key={diff}
                                      disabled={!isOwnerOfCurrentTree}
                                      onClick={() => handleToggleDifficultyInFloor(floor.floorId, diff)}
                                      className={`px-2 py-1 rounded border transition-all ${
                                        active 
                                          ? 'bg-slate-900 border-slate-950 text-white font-black' 
                                          : 'bg-white border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      {diff === 3 ? '🔥 Boss' : diff === 2 ? '⚡ Miniboss' : '⭐️ Normal'}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Missions rattachées */}
                            <div>
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                {floor.mode === 'random' ? 'Pool de tirage' : 'Mission obligatoire'}
                              </span>
                              
                              <div className="flex flex-wrap gap-2">
                                {associatedQuests.length === 0 ? (
                                  <span className="text-xs text-slate-400 italic">Glissez une mission ou cliquez dans le pool pour l'affecter à ce palier.</span>
                                ) : (
                                  associatedQuests.map(q => (
                                    <div key={q.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-1.5 py-1 text-xs">
                                      <span className="font-bold text-slate-800">{q.name}</span>
                                      <span className="text-[10px] opacity-75 font-black uppercase text-purple-700">
                                        {Number(q.difficulty) === 3 ? 'Boss' : Number(q.difficulty) === 2 ? 'Miniboss' : 'Normal'}
                                      </span>
                                      {isOwnerOfCurrentTree && (
                                        <button 
                                          onClick={() => handleToggleQuestInFloor(floor.floorId, q.id)}
                                          className="w-4 h-4 rounded-full hover:bg-red-50 hover:text-red-600 flex items-center justify-center font-bold text-[10px] transition-all ml-1 cursor-pointer"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bouton de suppression */}
                          {isOwnerOfCurrentTree && (
                            <button
                              onClick={() => handleRemoveFloor(floor.floorId)}
                              className="text-slate-300 hover:text-red-500 transition-all font-bold self-start md:self-center cursor-pointer p-2"
                              title="Supprimer ce palier"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isOwnerOfCurrentTree && (
                    <div className="flex items-center gap-3 border-t border-slate-100 pt-6">
                      <select
                        value={newFloorMode}
                        onChange={(e) => setNewFloorMode(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="static">📍 Palier de mission statique</option>
                        <option value="random">🎲 Palier aléatoire (contrôlé)</option>
                      </select>

                      <button
                        onClick={handleAddFloor}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all cursor-pointer"
                      >
                        ＋ Ajouter un Palier RSE
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <span className="text-4xl">🌳</span>
                  <p className="mt-2 text-sm font-bold">Aucun arbre disponible ou sélectionné.</p>
                  <button onClick={() => setActiveModal('tree')} className="mt-4 bg-purple-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-xl">
                    Créer mon premier Arbre
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET B : GESTION DE SESSION & PLANNING TIMELINE */}
        {activeTab === 'sessions' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8">
              {currentSession ? (
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Info Header de Session */}
                  <div className="border-b border-slate-200 pb-4">
                    <h1 className="text-xl font-black text-slate-950 flex items-center gap-2 uppercase tracking-wide">
                      📅 ESPACE SESSION : {currentSession.session_code}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Pilotez le planning, liez un arbre d'apprentissage RSE et affectez des DRH clients.
                    </p>
                  </div>

                  {/* 1. CONFIGURATION DES DROITS ET DE L'ARBRE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lien de l'arbre */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
                      <label className="block text-xs font-black text-slate-950 uppercase tracking-wide">🌳 Arbre d'apprentissage lié</label>
                      <select
                        value={currentSession.tree_id || ""}
                        onChange={(e) => updateCurrentSessionInState({ tree_id: e.target.value || null })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
                      >
                        <option value="">-- Non lié / Aucun --</option>
                        {Object.values(trees).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Gestionnaires RH autorisés */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
                      <label className="block text-xs font-black text-slate-950 uppercase tracking-wide">👥 DRH Client Associés (Droit d'œil)</label>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(currentSession.drh_ids || []).map(id => {
                          const cache = JSON.parse(localStorage.getItem('drh_emails') || '{}');
                          const email = cache[id] || id;
                          return (
                            <span key={id} className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl px-2.5 py-1 text-xs font-bold">
                              {email}
                              <button onClick={() => handleRemoveDRH(id)} className="font-black hover:text-red-600 cursor-pointer">×</button>
                            </span>
                          );
                        })}
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Rechercher par email pour ajouter..."
                          value={drhSearchQuery}
                          onChange={(e) => setDrhSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-0 focus:border-purple-600 font-medium"
                        />
                        {drhSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 z-50 divide-y overflow-hidden">
                            {drhSuggestions.map(user => (
                              <button
                                key={user.id}
                                onClick={() => handleAddDRH(user)}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 block"
                              >
                                {user.email} <span className="opacity-50 text-[10px]">({user.role})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. CONSTRUCTEUR DE TIMELINE DE LA SESSION */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-6">
                    <div>
                      <h2 className="text-md font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                        🕒 Chronologie de la journée de formation
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Glissez les paliers de l'arbre ou des blocs personnalisés pour planifier la journée.
                      </p>
                    </div>

                    {/* PALETTE DE DRAG & DROP DES BLOCS */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        🛠️ Palette d'activités à glisser
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Bloc 1 : Paliers de l'arbre lié */}
                        <div className="space-y-2">
                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Paliers de l'arbre actuel
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {currentTree?.floors && currentTree.floors.map(floor => (
                              <div
                                key={floor.floorId}
                                draggable
                                onDragStart={(e) => handlePaletteDragStart(e, 'palette-palier', floor)}
                                className="bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-grab hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-1.5 select-none"
                              >
                                🌳 Palier {floor.floorId} <span className="opacity-75 text-[10px]">({floor.mode})</span>
                              </div>
                            ))}
                            {(!currentTree || !currentTree.floors) && (
                              <span className="text-xs text-slate-400 italic">Aucun arbre lié à cette session.</span>
                            )}
                          </div>
                        </div>

                        {/* Bloc 2 : Blocs personnalisés */}
                        <div className="space-y-2">
                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Bloc d'activité personnalisé
                          </span>
                          <div className="flex gap-2 items-center">
                            <div
                              draggable
                              onDragStart={(e) => handlePaletteDragStart(e, 'palette-custom', customBlockConfig)}
                              className="text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-grab hover:scale-105 transition-all shadow-sm select-none"
                              style={{ backgroundColor: customBlockConfig.color }}
                            >
                              ✨ Drag : {customBlockConfig.name}
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <input
                                type="text"
                                placeholder="Nom..."
                                value={customBlockConfig.name}
                                onChange={(e) => setCustomBlockConfig(prev => ({ ...prev, name: e.target.value }))}
                                className="w-28 p-1 text-[10px] border border-slate-200 rounded font-medium focus:ring-0"
                              />
                              <input
                                type="number"
                                placeholder="Min"
                                value={customBlockConfig.duration}
                                onChange={(e) => setCustomBlockConfig(prev => ({ ...prev, duration: e.target.value }))}
                                className="w-12 p-1 text-[10px] text-center border border-slate-200 rounded font-medium focus:ring-0"
                              />
                              <input
                                type="color"
                                value={customBlockConfig.color}
                                onChange={(e) => setCustomBlockConfig(prev => ({ ...prev, color: e.target.value }))}
                                className="w-6 h-6 p-0 border-0 rounded cursor-pointer shrink-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TIMELINE INTERACTIVE */}
                    <div className="space-y-4">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        ⏳ Chronologie de la session (Planning)
                      </span>

                      <div className="space-y-2">
                        {/* Zone de dépôt initiale */}
                        <div
                          onDragOver={(e) => handleTimelineDragOver(e, 0)}
                          onDrop={(e) => handleTimelineDrop(e, 0)}
                          className={`h-2.5 rounded-lg transition-all ${
                            activeDropIndex === 0 ? 'bg-purple-200/50 border border-purple-300' : 'bg-transparent'
                          }`}
                        />

                        {currentSession.planning && currentSession.planning.map((item, index) => {
                          const itemDuration = parseInt(item.duration, 10) || 15;
                          
                          return (
                            <div key={item.id || index}>
                              <div
                                draggable
                                onDragStart={(e) => handleTimelineDragStart(e, item, index)}
                                className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-purple-200 transition-all shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  {/* Poignée de drag */}
                                  <div className="cursor-grab text-slate-300 font-bold select-none">☰</div>
                                  
                                  {/* Pastille de couleur */}
                                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  
                                  <div>
                                    <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                                    {item.desc && (
                                      <p className="text-[10px] text-slate-400 font-medium">{item.desc}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold bg-white px-2.5 py-1.5 border border-slate-200 rounded-lg">
                                    <span>⏱️</span>
                                    <input
                                      type="number"
                                      value={itemDuration}
                                      onChange={(e) => handleUpdateItemDuration(index, e.target.value)}
                                      className="w-10 text-center font-bold p-0 border-0 focus:ring-0"
                                    />
                                    <span>min</span>
                                  </div>

                                  <button
                                    onClick={() => handleRemovePlanningItem(index)}
                                    className="text-slate-300 hover:text-red-500 font-bold transition-all p-1 cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>

                              {/* Zone de dépôt après cet item */}
                              <div
                                onDragOver={(e) => handleTimelineDragOver(e, index + 1)}
                                onDrop={(e) => handleTimelineDrop(e, index + 1)}
                                className={`h-2.5 rounded-lg transition-all ${
                                  activeDropIndex === index + 1 ? 'bg-purple-200/50 border border-purple-300' : 'bg-transparent'
                                }`}
                              />
                            </div>
                          );
                        })}

                        {(!currentSession.planning || currentSession.planning.length === 0) && (
                          <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs font-medium">
                            La timeline est vide. Glissez des éléments de la palette ci-dessus pour composer le déroulé pédagogique de la journée.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <span className="text-4xl">📅</span>
                  <p className="mt-2 text-sm font-bold">Aucune session active sélectionnée.</p>
                  <button onClick={() => setActiveModal('session')} className="mt-4 bg-purple-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-xl">
                    Initialiser un Espace Session
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. PANNEAU LATÉRAL (POOL DE MISSIONS RSE À DROITE) */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-950 uppercase tracking-wide">🏆 Pool des Missions RSE</span>
              <button 
                onClick={() => setActiveModal('quest')}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                ＋ Mission
              </button>
            </div>

            {/* Barre de recherche */}
            <input
              type="text"
              placeholder="Rechercher une mission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-0 font-medium"
            />

            {/* Filtres thématiques */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['all', 'social', 'env', 'tech'].map(theme => (
                <button
                  key={theme}
                  onClick={() => setFilterTheme(theme)}
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border transition-all ${
                    filterTheme === theme 
                      ? 'bg-slate-900 border-slate-950 text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {theme === 'all' ? 'Tout' : theme}
                </button>
              ))}
            </div>
          </div>

          {/* Liste scrollable des quêtes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredQuests.map(quest => {
              const badgeStyle = getQuestBadgeStyle(quest);
              const isCollab = quest.is_collaborative === true || String(quest.is_collaborative) === 'true';
              
              return (
                <div
                  key={quest.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', quest.id);
                  }}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-sm hover:border-slate-300 transition-all select-none group cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                      {quest.theme}
                    </span>
                    <span className="text-[10px] text-slate-400 font-black">
                      {Number(quest.difficulty) === 3 ? '★★★' : Number(quest.difficulty) === 2 ? '★★' : '★'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs mb-1 group-hover:text-purple-700 transition-all">
                    {quest.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed mb-2">
                    {quest.desc}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] font-bold text-slate-400">
                    <span>
                      {isCollab ? `👥 Coop (${quest.required_partners || 2})` : '👤 Solo'}
                    </span>
                    {activeTab === 'tree' && currentTree && isOwnerOfCurrentTree && (
                      <button
                        onClick={() => {
                          const activeFloorId = currentTree.floors?.[currentTree.floors.length - 1]?.floorId;
                          if (activeFloorId) handleToggleQuestInFloor(activeFloorId, quest.id);
                        }}
                        className="text-purple-600 hover:underline"
                      >
                        ＋ Attribuer au dernier palier
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredQuests.length === 0 && (
              <div className="text-center text-xs text-slate-400 italic pt-6">
                Aucune mission RSE ne correspond à vos filtres.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. DIALOGUES DE MODALE */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-md"
            >
              ×
            </button>

            {activeModal === 'tree' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide mb-4">🌳 Créer un Arbre RSE</h3>
                <form onSubmit={handleCreateTree} className="space-y-4 text-xs font-bold text-slate-600">
                  <div>
                    <label className="block mb-1">Nom de l'arbre pédagogique :</label>
                    <input type="text" required placeholder="ex: Airbus Transition 2026" value={newTreeName} onChange={(e) => setNewTreeName(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-semibold" />
                  </div>
                  <button type="submit" className="w-full bg-purple-700 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider">Générer l'arbre</button>
                </form>
              </>
            )}

            {activeModal === 'quest' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide mb-4">🚀 Créer une Mission RSE</h3>
                <form onSubmit={handleCreateQuest} className="space-y-4 text-xs font-bold text-slate-600">
                  <div>
                    <label className="block mb-1">Nom :</label>
                    <input type="text" required placeholder="ex: Audit Carbone" value={newQuestName} onChange={(e) => setNewQuestName(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-semibold text-slate-800" />
                  </div>
                  <div>
                    <label className="block mb-1">Description pédagogique :</label>
                    <textarea required placeholder="Décrivez l'objectif de la mission..." value={newQuestDesc} onChange={(e) => setNewQuestDesc(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 h-20 font-semibold text-slate-800" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Axe RSE :</label>
                      <select value={newQuestTheme} onChange={(e) => setNewQuestTheme(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold text-slate-700">
                        <option value="social">Social & Inclusion</option>
                        <option value="env">Environnemental</option>
                        <option value="tech">Technologie & Éthique</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1">Type de rencontre :</label>
                      <select value={newQuestType} onChange={(e) => setNewQuestType(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold text-slate-700">
                        <option value="normal">⭐ Normal (1★)</option>
                        <option value="miniboss">⚡ Miniboss (2★)</option>
                        <option value="boss">🔥 Boss (3★)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1">Format attendu (Livrable) :</label>
                    <input type="text" placeholder="ex: Rapport PDF, Lien Figma..." value={requiredDeliverable} onChange={(e) => setRequiredDeliverable(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-semibold text-slate-800" />
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input type="checkbox" checked={isCollaborative} onChange={(e) => setIsCollaborative(e.target.checked)} className="rounded text-purple-700 border-slate-300 cursor-pointer" />
                      <span>Coopération requise (Travail en binôme/équipe)</span>
                    </label>

                    {isCollaborative && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Nombre de partenaires minimum :</span>
                        <input type="number" min="2" max="10" value={requiredPartners} onChange={(e) => setRequiredPartners(e.target.value)} className="w-12 text-center p-1 border rounded bg-slate-50 font-bold text-slate-800 focus:ring-0" />
                      </div>
                    )}
                  </div>

                  <button type="submit" className="w-full bg-purple-700 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider">Créer la mission</button>
                </form>
              </>
            )}

            {activeModal === 'session' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide mb-4">💡 Initialiser une Session</h3>
                <form onSubmit={handleCreateSession} className="space-y-4 text-xs font-bold text-slate-600">
                  <div>
                    <label className="block mb-1">Code d'accès d'espace :</label>
                    <input type="text" required placeholder="ex: AIRBUS-LILLE-26" value={newSessionCode} onChange={(e) => setNewSessionCode(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-mono font-black uppercase text-center text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider">Générer la session</button>
                </form>
              </>
            )}

            {activeModal === 'tree_browser' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide mb-3">📂 Parcourir les architectures</h3>
                
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs">
                  <button onClick={() => setTreeBrowserTab('local')} className={`flex-1 py-1.5 rounded-lg font-bold uppercase transition-all ${treeBrowserTab === 'local' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Mes arbres</button>
                  <button onClick={() => setTreeBrowserTab('shared')} className={`flex-1 py-1.5 rounded-lg font-bold uppercase transition-all ${treeBrowserTab === 'shared' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Partagés (Publics)</button>
                </div>

                <input
                  type="text"
                  placeholder="Rechercher par nom d'arbre..."
                  value={treeSearchQuery}
                  onChange={(e) => setTreeSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs mb-3 font-semibold"
                />

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {filteredBrowsedTrees.map(t => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900 block">{t.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{t.floors?.length || 0} paliers paramétrés</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setActiveTreeId(t.id);
                            setActiveModal(null);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg"
                        >
                          Charger
                        </button>
                        {t.owner_id !== currentUserId && (
                          <button
                            onClick={() => handleDuplicateTreeAsLocal(t)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-2.5 py-1.5 rounded-lg"
                            title="Dupliquer l'arbre public en local pour pouvoir l'éditer"
                          >
                            Copier
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredBrowsedTrees.length === 0 && (
                    <p className="text-center text-slate-400 italic py-4">Aucun arbre disponible.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
