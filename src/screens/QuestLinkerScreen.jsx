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
  
  // États de sélection
  const [activeTreeId, setActiveTreeId] = useState("");
  
  // Modale active ('quest', 'tree', 'tree_browser', 'quest_library' ou null)
  const [activeModal, setActiveModal] = useState(null); 

  // États des formulaires
  const [newQuestName, setNewQuestName] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');
  const [newQuestTheme, setNewQuestTheme] = useState('social');
  const [newQuestType, setNewQuestType] = useState('normal'); 
  const [newTreeName, setNewTreeName] = useState('');
  const [newFloorMode, setNewFloorMode] = useState('static');

  // Mode collaboratif
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [requiredPartners, setRequiredPartners] = useState(2);

  // Recherche et filtres du Pool de Missions (à droite)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTheme, setFilterTheme] = useState('all'); 
  const [filterDifficulty, setFilterDifficulty] = useState('all'); 

  // Gestion et exploration des arbres
  const [treeBrowserTab, setTreeBrowserTab] = useState('local'); // 'local' ou 'shared'
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

  // --- ÉTATS POUR LA BIBLIOTHÈQUE DE QUÊTES (NOUVEAU POP-UP) ---
  const [libraryTab, setLibraryTab] = useState('local'); // 'local' ou 'global'
  const [librarySelectedTreeId, setLibrarySelectedTreeId] = useState('all'); // 'all' ou ID de l'arbre
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  // 1. CHARGEMENT INITIAL
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        fetchTrees();
      }
    };
    fetchInitialData();
  }, []);

  const fetchTrees = async () => {
    const { data, error } = await supabase
      .from('trees')
      .select('*');

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
  const isOwnerOfCurrentTree = currentTree && currentTree.owner_id === currentUserId;

  // Filtrage du Pool de Missions de droite (Catalogue)
  const safeQuestsList = quests || [];
  const filteredQuests = safeQuestsList.filter(q => {
    if (!q) return false;
    const matchesSearch = (q.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (q.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = filterTheme === 'all' || q.theme === filterTheme;
    const matchesDifficulty = filterDifficulty === 'all' || Number(q.difficulty) === Number(filterDifficulty);
    return matchesSearch && matchesTheme && matchesDifficulty;
  }).sort((a, b) => (a.theme || '').localeCompare(b.theme || ''));  

  // Calcul automatique de la contrainte max d'équipe
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

  // Sauvegarde
  const handleSaveChanges = async () => {
    if (currentTree) {
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
  };

  // Partage
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
      alert(`🌍 L'arbre "${currentTree.name}" est désormais partagé et accessible à la communauté !`);
    }
  };

  // Duplication d'arbre
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
    alert(`📥 Une copie locale de l'arbre "${treeToCopy.name}" a été ajoutée !`);
  };

  const updateCurrentTreeInState = (updatedFields) => {
    if (!currentTree) return;
    if (!isOwnerOfCurrentTree) return; 
    if (typeof setTrees === 'function') {
      setTrees(prev => ({
        ...prev,
        [activeTreeId]: { ...currentTree, ...updatedFields }
      }));
    }
  };

  // Paliers
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

  // Création
  const handleCreateTree = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTreeName.trim()) return;

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

  // Liste filtrée d'explorateur d'arbres
  const filteredBrowsedTrees = Object.values(trees || {}).filter(t => {
    if (!t) return false;
    const matchesSearch = (t.name || '').toLowerCase().includes(treeSearchQuery.toLowerCase());
    if (treeBrowserTab === 'local') {
      return matchesSearch && t.owner_id === currentUserId;
    } else {
      return matchesSearch && t.visibility === 'public';
    }
  });

  // --- LOGIQUE D'EXTRACTION DES QUÊTES POUR LA BIBLIOTHÈQUE ---
  const getAllQuestsFromTrees = (mode) => {
    const targetTrees = Object.values(trees || {}).filter(t => {
      if (mode === 'local') return t.owner_id === currentUserId;
      return t.visibility === 'public';
    });

    if (mode === 'local' && librarySelectedTreeId !== 'all') {
      const selected = targetTrees.find(t => t.id === librarySelectedTreeId);
      return selected ? extractQuestsFromTree(selected) : [];
    }

    let allExtracted = [];
    targetTrees.forEach(t => {
      allExtracted = [...allExtracted, ...extractQuestsFromTree(t)];
    });

    // Supprimer les doublons éventuels par ID de quête
    const uniqueQuests = [];
    const seenIds = new Set();
    allExtracted.forEach(item => {
      if (!seenIds.has(item.quest.id)) {
        seenIds.add(item.quest.id);
        uniqueQuests.push(item);
      }
    });

    return uniqueQuests;
  };

  const extractQuestsFromTree = (tree) => {
    const list = [];
    if (!tree || !tree.floors) return list;
    tree.floors.forEach(floor => {
      const floorQuests = floor.quests || [];
      floorQuests.forEach(qId => {
        const found = safeQuestsList.find(quest => quest.id === qId);
        if (found) {
          list.push({
            quest: found,
            treeName: tree.name,
            floorId: floor.floorId
          });
        }
      });
    });
    return list;
  };

  const libraryItems = getAllQuestsFromTrees(libraryTab).filter(item => {
    const q = item.quest;
    const matchesSearch = q.name.toLowerCase().includes(librarySearchQuery.toLowerCase()) || 
                          q.desc.toLowerCase().includes(librarySearchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative">
      
      {/* EN-TÊTE PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs gap-4">
        <div>
          <h1 className="text-sm font-black text-slate-950 uppercase tracking-wide">🌲 Éditeur de Parcours Pédagogiques</h1>
          <p className="text-[10px] text-slate-500 font-extrabold uppercase">Créez et configurez la structure de vos arbres d'apprentissage</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs font-bold w-full sm:w-auto">
          {currentTree && (
            <span className="text-purple-700 font-black bg-purple-100/80 px-3 py-1.5 rounded-lg border border-purple-200 shadow-2xs">
              🤝 Taille max. requise du groupe : <span className="text-sm font-black text-purple-900">{currentTree.max_team_constraint || 1}</span> { (currentTree.max_team_constraint || 1) > 1 ? 'apprenants' : 'apprenant (Solo)' }
            </span>
          )}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-500 whitespace-nowrap">Arbre actif :</span>
            <button
              onClick={() => setActiveModal('tree_browser')}
              className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-purple-900 text-left font-bold min-w-[180px] flex justify-between items-center transition-all hover:bg-purple-100"
            >
              <span className="truncate">{currentTree ? currentTree.name : "-- Choisir un arbre --"}</span>
              <span className="text-[10px] ml-2">🔍 Ouvrir...</span>
            </button>
          </div>
        </div>
      </div>

      {/* INDICATION DE LECTURE SEULE SI NON-PROPRIÉTAIRE */}
      {currentTree && !isOwnerOfCurrentTree && (
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
        
        {/* ESPACE DE TRAVAIL (GAUCHE & CENTRE) : ÉDITEUR D'ARBRE ET DE SES PALIERS */}
        <div className="lg:col-span-2 space-y-6">
          {currentTree ? (
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
                              type="number" 
                              min="1" 
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

              {/* ACTION D'AJOUT DE PALIER */}
              {isOwnerOfCurrentTree && (
                <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs font-black text-slate-600 uppercase whitespace-nowrap">Mode du nouveau palier :</span>
                    <select 
                      value={newFloorMode} 
                      onChange={(e) => setNewFloorMode(e.target.value)}
                      className="border rounded-lg p-2 bg-white text-xs font-bold shadow-xs focus:outline-hidden"
                    >
                      <option value="static">📌 Statique (Missions fixes obligatoires)</option>
                      <option value="random">🎲 Aléatoire (Choix dynamique auto parmi un pool)</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleAddFloor}
                    className="w-full sm:w-auto bg-purple-700 hover:bg-purple-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  >
                    ➕ Ajouter un Palier
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <p className="text-sm font-bold text-slate-500">Aucun arbre sélectionné. Utilisez le sélecteur ci-dessus pour ouvrir un arbre de compétences ou en créer un nouveau.</p>
            </div>
          )}
        </div>

        {/* COLONNE DE DROITE : OUTILS DE CONCEPTION (RECTANGULAIRES) & CATALOGUE */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* MENU D'OUTILS DE CONCEPTION (Nouveau Design Rectangulaire Inspiré du Dessin) */}
          <div className="bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-md">
            {/* Header du bloc d'outils */}
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider">🛠️ Outils de Conception</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            
            {/* Grille d'actions rectangulaires et épurées */}
            <div className="grid grid-cols-1 divide-y divide-slate-200">
              
              {/* Ligne 1 : Créer un arbre */}
              <button 
                onClick={() => setActiveModal('tree')} 
                className="w-full bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs uppercase tracking-wider py-4 px-5 transition-all flex items-center justify-between cursor-pointer group"
              >
                <span className="flex items-center gap-2">🌳 <span>Créer un Arbre</span></span>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Ligne 2 : Créer une mission */}
              <button 
                onClick={() => setActiveModal('quest')} 
                className="w-full bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs uppercase tracking-wider py-4 px-5 transition-all flex items-center justify-between cursor-pointer group"
              >
                <span className="flex items-center gap-2">⚔️ <span>Créer une Mission</span></span>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Ligne 3 (NOUVEAU) : La Bibliothèque de Quêtes */}
              <button 
                onClick={() => {
                  setLibraryTab('local');
                  setLibrarySelectedTreeId('all');
                  setActiveModal('quest_library');
                }} 
                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-900 font-black text-xs uppercase tracking-wider py-4 px-5 transition-all flex items-center justify-between cursor-pointer group border-l-4 border-purple-600"
              >
                <span className="flex items-center gap-2">📖 <span>Bibliothèque de Quêtes</span></span>
                <span className="text-purple-600 font-black group-hover:translate-x-1 transition-transform">⚡ Ouvrir</span>
              </button>

              {/* Ligne 4 : Partager / Publier l'Arbre */}
              {currentTree && isOwnerOfCurrentTree && (
                <button 
                  onClick={handleShareTree} 
                  disabled={currentTree.visibility === 'public'}
                  className="w-full bg-white hover:bg-blue-50 disabled:bg-slate-100 disabled:text-slate-400 text-blue-700 font-extrabold text-xs uppercase tracking-wider py-4 px-5 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">🌍 <span>{currentTree.visibility === 'public' ? 'Déjà public' : 'Publier et partager'}</span></span>
                  <span className="text-blue-500">📤</span>
                </button>
              )}

              {/* Ligne 5 : Sauvegarder l'arbre actif */}
              {currentTree && (
                <button 
                  onClick={handleSaveChanges}
                  disabled={!isOwnerOfCurrentTree}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs uppercase tracking-wider py-4 px-5 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">💾 <span>Enregistrer l'Arbre</span></span>
                  <span className="font-bold">✓</span>
                </button>
              )}

            </div>
          </div>

          {/* POOL GÉNÉRAL DES MISSIONS (CONSERVÉ) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">📦 Catalogue Général des Missions ({safeQuestsList.length})</h3>
              <p className="text-[10px] text-slate-400 font-bold">Pool global utilisable et rattachable à vos paliers</p>
            </div>

            {/* FILTRES DE MISSIONS */}
            <div className="space-y-2 text-xs">
              <input 
                type="text" 
                placeholder="Rechercher une mission..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold focus:bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={filterTheme} 
                  onChange={(e) => setFilterTheme(e.target.value)}
                  className="border rounded-lg p-2 bg-white font-bold"
                >
                  <option value="all">Tous les thèmes</option>
                  <option value="social">Social 🤝</option>
                  <option value="env">Env 🌳</option>
                  <option value="tech">Tech 💻</option>
                </select>
                <select 
                  value={filterDifficulty} 
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="border rounded-lg p-2 bg-white font-bold"
                >
                  <option value="all">Difficultés</option>
                  <option value="1">1★ Standard</option>
                  <option value="2">2★ Miniboss</option>
                  <option value="3">3★ Boss</option>
                </select>
              </div>
            </div>

            {/* AFFICHAGE DES MISSIONS FILTRÉES */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {filteredQuests.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-bold">Aucune mission correspondante.</div>
              ) : (
                filteredQuests.map((q) => {
                  const isQuestCollab = q.is_collaborative || q.is_collaborative === 'true' || q.is_collaborative === true;
                  return (
                    <div key={q.id} className="border border-slate-200 p-3 rounded-lg hover:border-slate-300 transition-all space-y-1.5 bg-slate-50/50">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-slate-900 text-xs leading-tight">{q.name}</span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${getQuestBadgeStyle(q)}`}>
                          {Number(q.difficulty) === 3 ? 'Boss' : Number(q.difficulty) === 2 ? 'Miniboss' : q.theme}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">{q.desc}</p>
                      {isQuestCollab && (
                        <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 text-[9px] font-extrabold px-2 py-0.5 rounded border border-purple-200">
                          <span>🤝 Mission Collaborative</span>
                          <span className="bg-purple-950 text-white rounded px-1 text-[8px]">{q.required_partners || 2}p</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ==================== MODALES ==================== */}

      {/* 4. MODALE NOUVELLE : LA BIBLIOTHÈQUE DE QUÊTES DE TOUS LES ARBRES */}
      {activeModal === 'quest_library' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 relative flex flex-col max-h-[85vh]">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg cursor-pointer">×</button>
            
            <div className="border-b pb-3 mb-4">
              <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">📖 Bibliothèque Globale des Quêtes d'Arbres</h3>
              <p className="text-[11px] text-slate-500 font-bold">Explorez et réutilisez toutes les quêtes rattachées à nos architectures de formation</p>
            </div>

            {/* SWITCH SOURCE : LOCAUX VS GLOBALS */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold mb-4 w-full">
              <button 
                onClick={() => {
                  setLibraryTab('local');
                  setLibrarySelectedTreeId('all');
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${libraryTab === 'local' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                📁 Quêtes de nos Arbres Locaux
              </button>
              <button 
                onClick={() => {
                  setLibraryTab('global');
                  setLibrarySelectedTreeId('all');
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${libraryTab === 'global' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                🌍 Quêtes de tous les Arbres Globaux (Publics)
              </button>
            </div>

            {/* FILTRES INTERNES DE LA BIBLIOTHÈQUE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {/* Filtre par arbre (uniquement disponible en mode Local pour cibler plus facilement) */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Filtrer par Arbre :</label>
                <select
                  value={librarySelectedTreeId}
                  onChange={(e) => setLibrarySelectedTreeId(e.target.value)}
                  className="w-full border rounded-lg p-2 bg-slate-50 text-xs font-bold focus:bg-white"
                >
                  <option value="all">-- Tous les arbres ({libraryTab === 'local' ? 'Locaux' : 'Globaux'}) --</option>
                  {Object.values(trees || {})
                    .filter(t => libraryTab === 'local' ? t.owner_id === currentUserId : t.visibility === 'public')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))
                  }
                </select>
              </div>

              {/* Recherche textuelle */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Recherche par mot-clé :</label>
                <input 
                  type="text" 
                  placeholder="Rechercher une quête..." 
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  className="w-full border rounded-lg p-2 bg-slate-50 text-xs font-semibold focus:bg-white"
                />
              </div>
            </div>

            {/* CONTENU / LISTING DES QUÊTES */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {libraryItems.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 font-bold border-2 border-dashed rounded-xl">
                  Aucune quête rattachée ne correspond à vos filtres actuels.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {libraryItems.map((item, idx) => {
                    const q = item.quest;
                    const isQuestCollab = q.is_collaborative || q.is_collaborative === 'true' || q.is_collaborative === true;
                    return (
                      <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2 flex flex-col justify-between hover:border-slate-300 transition-all">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-extrabold text-slate-900 text-xs">{q.name}</h4>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${getQuestBadgeStyle(q)}`}>
                              {Number(q.difficulty) === 3 ? 'Boss' : Number(q.difficulty) === 2 ? 'Miniboss' : q.theme}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal line-clamp-3">{q.desc}</p>
                        </div>

                        <div className="pt-2.5 border-t border-slate-200/60 flex flex-wrap justify-between items-center gap-2">
                          <span className="text-[9px] text-slate-400 font-bold">
                            🌳 Arbre : <strong className="text-slate-700">{item.treeName}</strong> (P. {item.floorId})
                          </span>
                          {isQuestCollab && (
                            <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-purple-200">
                              🤝 {q.required_partners || 2}p
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. MODALE D'EXPLORATION ET DE CHOIX DES ARBRES */}
      {activeModal === 'tree_browser' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border flex flex-col max-h-[85vh]">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg cursor-pointer">×</button>
            
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide border-b pb-3 mb-4">🔍 Choisir un Arbre de Compétences</h3>
            
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold mb-4 w-full">
              <button 
                onClick={() => setTreeBrowserTab('local')}
                className={`flex-1 py-2 rounded-lg transition-all ${treeBrowserTab === 'local' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                📁 Mes arbres locaux
              </button>
              <button 
                onClick={() => setTreeBrowserTab('shared')}
                className={`flex-1 py-2 rounded-lg transition-all ${treeBrowserTab === 'shared' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                🌍 Arbres publics partagés
              </button>
            </div>

            <div className="mb-4">
              <input 
                type="text" 
                placeholder="Filtrer les arbres par nom..." 
                value={treeSearchQuery}
                onChange={(e) => setTreeSearchQuery(e.target.value)}
                className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold text-xs focus:bg-white"
              />
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredBrowsedTrees.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 font-bold">Aucun arbre trouvé dans cette section.</div>
              ) : (
                filteredBrowsedTrees.map((tree) => {
                  const isCurrentlyActive = tree.id === activeTreeId;
                  const isOwned = tree.owner_id === currentUserId;
                  return (
                    <div 
                      key={tree.id} 
                      className={`p-4 rounded-xl border flex justify-between items-center transition-all ${
                        isCurrentlyActive ? 'bg-purple-50/80 border-purple-400 shadow-2xs' : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-xs">{tree.name}</span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            tree.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {tree.visibility === 'public' ? 'Public' : 'Privé'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">🏷️ {tree.floors?.length || 0} paliers configurés</p>
                      </div>

                      <div className="flex gap-2">
                        {!isOwned && tree.visibility === 'public' && (
                          <button
                            onClick={() => handleDuplicateTreeAsLocal(tree)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase border border-purple-200 transition-all cursor-pointer"
                          >
                            📥 Dupliquer localement
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActiveTreeId(tree.id);
                            setActiveModal(null);
                          }}
                          disabled={isCurrentlyActive}
                          className={`font-black px-4 py-1.5 rounded-lg text-[10px] uppercase transition-all border cursor-pointer ${
                            isCurrentlyActive 
                              ? 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed'
                              : 'bg-slate-950 hover:bg-slate-800 text-white border-transparent'
                          }`}
                        >
                          {isCurrentlyActive ? 'Actif' : 'Sélectionner'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MODALE CRÉATION D'ARBRE */}
      {activeModal === 'tree' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg cursor-pointer">×</button>
            
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">🌳 Créer un Arbre de Compétences</h3>
            <form onSubmit={handleCreateTree} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Nom de l'Arbre :</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Parcours Cybersécurité, Devops..." 
                  value={newTreeName} 
                  onChange={(e) => setNewTreeName(e.target.value)} 
                  className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold text-xs" 
                />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer">Créer le parcours</button>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODALE CRÉATION DE MISSION */}
      {activeModal === 'quest' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg cursor-pointer">×</button>
            
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">⚔️ Créer une Mission / Quête</h3>
            <form onSubmit={handleCreateQuest} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Nom de la Mission :</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Analyse de Malware Avancée" 
                  value={newQuestName} 
                  onChange={(e) => setNewQuestName(e.target.value)} 
                  className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold text-xs" 
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Description & livrables attendus :</label>
                <textarea 
                  required 
                  placeholder="Consignes détaillées et critères de réussite..." 
                  value={newQuestDesc} 
                  onChange={(e) => setNewQuestDesc(e.target.value)} 
                  className="w-full border rounded-lg p-2.5 bg-slate-50 font-semibold text-xs h-24 focus:outline-hidden" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Thématique :</label>
                  <select 
                    value={newQuestTheme} 
                    onChange={(e) => setNewQuestTheme(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-slate-50 font-bold text-xs"
                  >
                    <option value="social">Social 🤝</option>
                    <option value="env">Environnement 🌳</option>
                    <option value="tech">Technologie 💻</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Type d'exercice :</label>
                  <select 
                    value={newQuestType} 
                    onChange={(e) => setNewQuestType(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-slate-50 font-bold text-xs"
                  >
                    <option value="normal">📄 Standard (1★)</option>
                    <option value="miniboss">⚡ Miniboss (2★)</option>
                    <option value="boss">🔥 Boss (3★)</option>
                  </select>
                </div>
              </div>

              {/* SECTION MODE COLLABORATIF */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-purple-950 font-extrabold text-xs">👥 Mission Collaborative</label>
                    <span className="text-[9px] text-purple-600 font-medium">Nécessite plusieurs apprenants connectés</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={isCollaborative} 
                    onChange={(e) => setIsCollaborative(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-700"
                  />
                </div>
                
                {isCollaborative && (
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-purple-200/40">
                    <span className="text-[10px] font-bold text-purple-900">Nombre de partenaires requis :</span>
                    <input 
                      type="number" 
                      min="2" 
                      max="10"
                      value={requiredPartners}
                      onChange={(e) => setRequiredPartners(Math.max(2, parseInt(e.target.value, 10) || 2))}
                      className="w-16 border border-purple-300 rounded p-1 text-center font-black text-purple-950 bg-white"
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl mt-2 transition-all cursor-pointer">Créer la mission</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
