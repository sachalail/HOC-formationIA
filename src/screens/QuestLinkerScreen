// src/screens/QuestLinkerScreen.jsx
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

export default function QuestLinkerScreen({ trees = {}, setTrees, quests = [], setQuests }) {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTreeId, setActiveTreeId] = useState("");
  const [questCatalogTab, setQuestCatalogTab] = useState('local'); // 'local' ou 'shared'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTheme, setFilterTheme] = useState('all'); 
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  
  // États de création rapide de quête
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQuestName, setNewQuestName] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');
  const [newQuestTheme, setNewQuestTheme] = useState('social');
  const [newQuestType, setNewQuestType] = useState('normal'); 
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [requiredPartners, setRequiredPartners] = useState(2);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUserId(session.user.id);
      }
    });
  }, []);

  // Définir l'arbre par défaut si non sélectionné
  useEffect(() => {
    const treeList = Object.values(trees);
    if (treeList.length > 0 && !activeTreeId) {
      const firstOwned = treeList.find(t => t.ownerId === currentUserId) || treeList[0];
      setActiveTreeId(firstOwned.id);
    }
  }, [trees, currentUserId, activeTreeId]);

  const currentTree = trees[activeTreeId];
  const isOwnerOfCurrentTree = currentTree && currentTree.ownerId === currentUserId;

  // 1. Sauvegarde et mise à jour de la contrainte d'équipe max sur l'arbre
  const recalculateAndSaveMaxTeamConstraint = async (treeId, floorsArray) => {
    if (!treeId || !floorsArray) return;
    const attachedQuestIds = floorsArray.flatMap(f => f.quests || []);
    const linkedQuests = (quests || []).filter(q => attachedQuestIds.includes(q.id));
    
    const maxConstraint = linkedQuests.reduce((max, q) => {
      if (q.is_collaborative) return Math.max(max, Number(q.required_partners) || 2);
      return max;
    }, 1);

    const { error } = await supabase
      .from('trees')
      .update({ max_team_constraint: maxConstraint, floors: floorsArray })
      .eq('id', treeId);

    if (!error && typeof setTrees === 'function') {
      setTrees(prev => ({
        ...prev,
        [treeId]: { ...prev[treeId], floors: floorsArray, max_team_constraint: maxConstraint }
      }));
    }
  };

  // 2. Gestion de l'association / désassociation des quêtes par palier
  const handleToggleQuestInFloor = async (floorId, questId) => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.map(f => {
      if (f.floorId !== floorId) return f;
      const currentFloorQuests = f.quests || [];
      return {
        ...f,
        quests: currentFloorQuests.includes(questId) 
          ? currentFloorQuests.filter(id => id !== questId) 
          : [...currentFloorQuests, questId]
      };
    });
    await recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  // 3. Création rapide d'une nouvelle quête locale
  const handleCreateQuest = async (e) => {
    if (e) e.preventDefault();
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
      .select()
      .single();

    if (error) {
      alert(`Erreur : ${error.message}`);
      return;
    }

    const formatted = {
      id: data.id,
      name: data.name,
      desc: data.desc,
      theme: data.theme,
      difficulty: data.difficulty,
      ownerId: data.owner_id,
      is_collaborative: data.is_collaborative,
      required_partners: data.required_partners,
      sharing: { type: data.visibility || 'private', allowedUsers: [data.owner_id] }
    };

    if (typeof setQuests === 'function') setQuests(prev => [...prev, formatted]);
    setNewQuestName('');
    setNewQuestDesc('');
    setIsCollaborative(false);
    setIsCreateModalOpen(false);
  };

  // 4. Logique de l'import et de la copie intelligente
  const handleImportQuestToTree = async (questToImport, forceCopy = false) => {
    if (!currentTree || !isOwnerOfCurrentTree) {
      alert("Impossible d'importer : Arbre introuvable ou en lecture seule.");
      return;
    }

    let targetQuestId = questToImport.id;

    // Si c'est une quête externe (partagée) ou qu'on force la copie
    if (forceCopy || questToImport.ownerId !== currentUserId) {
      const { data, error } = await supabase
        .from('quests')
        .insert([{
          name: `${questToImport.name} (Copie)`,
          desc: questToImport.desc,
          theme: questToImport.theme,
          difficulty: questToImport.difficulty,
          owner_id: currentUserId,
          visibility: 'private',
          is_collaborative: questToImport.is_collaborative,
          required_partners: questToImport.required_partners
        }])
        .select()
        .single();

      if (error) {
        alert(`Erreur de copie : ${error.message}`);
        return;
      }

      const formatted = {
        id: data.id,
        name: data.name,
        desc: data.desc,
        theme: data.theme,
        difficulty: data.difficulty,
        ownerId: data.owner_id,
        is_collaborative: data.is_collaborative,
        required_partners: data.required_partners,
        sharing: { type: data.visibility || 'private', allowedUsers: [data.owner_id] }
      };

      if (typeof setQuests === 'function') setQuests(prev => [...prev, formatted]);
      targetQuestId = data.id;
    }

    // Association par défaut au tout premier palier disponible
    if (currentTree.floors && currentTree.floors.length > 0) {
      const updatedFloors = currentTree.floors.map((f, i) => {
        if (i === 0) {
          return { ...f, quests: [...new Set([...(f.quests || []), targetQuestId])] };
        }
        return f;
      });
      await recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
      alert("🎉 Mission importée avec succès sur le Palier 1 !");
    } else {
      alert("⚠️ Votre arbre n'a pas encore de paliers. Configurez d'abord au moins un palier dans le Studio.");
    }
  };

  // ==========================================
  // SEGMENTATION DU CATALOGUE ET FILTRES
  // ==========================================
  const treeAttachedQuestIds = currentTree?.floors?.flatMap(f => f.quests || []) || [];
  const activeTreeQuests = (quests || []).filter(q => treeAttachedQuestIds.includes(q.id));

  const catalogueQuestsFiltered = (quests || []).filter(q => {
    const matchesSearch = (q.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (q.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = filterTheme === 'all' || q.theme === filterTheme;
    const matchesDifficulty = filterDifficulty === 'all' || Number(q.difficulty) === Number(filterDifficulty);
    return matchesSearch && matchesTheme && matchesDifficulty;
  });

  // Onglet 1 : Quêtes locales éditables de l'utilisateur (exclut celles déjà associées)
  const localCatalogQuests = catalogueQuestsFiltered.filter(q => 
    q.ownerId === currentUserId && !treeAttachedQuestIds.includes(q.id)
  );

  // Onglet 2 : Quêtes partagées globales et externes
  const sharedCatalogQuests = catalogueQuestsFiltered.filter(q => 
    q.sharing?.type === 'public' || q.ownerId !== currentUserId
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6">
      
      {/* HEADER DE L'ÉCRAN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">🔗 Liaison des Missions de l'Arbre</h2>
          <p className="text-[11px] text-slate-400 font-bold">Associez vos missions à vos paliers ou piochez des quêtes dans la bibliothèque partagée.</p>
        </div>
        
        {/* Sélecteur d'arbre actif */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-extrabold text-slate-500">Arbre cible :</label>
          <select 
            value={activeTreeId} 
            onChange={(e) => setActiveTreeId(e.target.value)}
            className="border rounded-xl p-2 bg-slate-50 text-xs font-bold border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
          >
            {Object.values(trees).map(t => (
              <option key={t.id} value={t.id}>{t.name} {t.ownerId !== currentUserId ? '(Lecture seule)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE & CENTRE : ARCHITECTURE DE L'ARBRE (PALIERS & QUÊTES ASSIGNÉES) */}
        <div className="lg:col-span-2 space-y-6">
          {currentTree ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-purple-50 border border-purple-200 p-4 rounded-xl">
                <span className="text-xs font-bold text-purple-900">👥 Taille d'équipe max requise par cet arbre :</span>
                <span className="bg-purple-700 text-white font-black text-sm px-3 py-1 rounded-lg">
                  {currentTree.max_team_constraint || 1} {currentTree.max_team_constraint > 1 ? 'joueurs' : 'joueur'}
                </span>
              </div>

              {(currentTree.floors || []).map((floor) => (
                <div key={floor.floorId} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white text-[11px] font-black px-2.5 py-1 rounded-lg">PALIER {floor.floorId}</span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${floor.mode === 'static' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {floor.mode === 'static' ? '📌 Mode Statique' : '🎲 Mode Aléatoire'}
                      </span>
                    </div>
                  </div>

                  {floor.mode === 'static' ? (
                    <div className="space-y-2">
                      <span className="block font-black text-slate-800 uppercase tracking-wider text-[10px]">Missions assignées à ce palier :</span>
                      <div className="flex flex-wrap gap-2">
                        {activeTreeQuests.map(q => {
                          const isLinked = (floor.quests || []).includes(q.id);
                          return (
                            <button
                              key={q.id}
                              disabled={!isOwnerOfCurrentTree}
                              onClick={() => handleToggleQuestInFloor(floor.floorId, q.id)}
                              className={`px-3 py-1.5 rounded-xl border transition-all text-[11px] font-bold flex items-center gap-1.5 ${
                                isLinked 
                                  ? 'bg-purple-700 text-white border-purple-800 shadow-xs' 
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              <span>{q.name}</span>
                              {isLinked && <span>✓</span>}
                            </button>
                          );
                        })}
                        {activeTreeQuests.length === 0 && (
                          <p className="text-xs text-slate-400 italic">Aucune mission disponible dans cet arbre. Importez-en depuis la bibliothèque de droite.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs text-slate-500">
                      🎲 Les missions de ce palier sont distribuées de façon dynamique aux apprenants selon la configuration configurée dans l'onglet d'édition.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400 font-bold">
              Veuillez sélectionner ou créer un arbre pour pouvoir y associer des quêtes.
            </div>
          )}
        </div>

        {/* COLONNE DROITE : LE DOUBLE CATALOGUE INTELLIGENT */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            
            {/* Header du catalogue */}
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">📚 Catalogue de Quêtes</h3>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="text-purple-700 font-black text-[10px] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all"
              >
                ➕ Créer
              </button>
            </div>

            {/* Sélecteur d'onglets local / partagé */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-extrabold gap-1">
              <button 
                onClick={() => setQuestCatalogTab('local')}
                className={`flex-1 py-2 px-1 rounded-lg transition-all ${questCatalogTab === 'local' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-500 hover:text-slate-950'}`}
              >
                🏠 Quêtes Locales ({localCatalogQuests.length})
              </button>
              <button 
                onClick={() => setQuestCatalogTab('shared')}
                className={`flex-1 py-2 px-1 rounded-lg transition-all ${questCatalogTab === 'shared' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-500 hover:text-slate-950'}`}
              >
                🌍 Partagées / Globales ({sharedCatalogQuests.length})
              </button>
            </div>

            {/* Moteur de filtres */}
            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="Rechercher une mission..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-xl p-2 bg-slate-50 text-xs font-bold border-slate-200 outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)} className="border rounded-lg p-1.5 text-[10px] bg-white font-extrabold border-slate-200">
                  <option value="all">🎨 Tous thèmes</option>
                  <option value="social">🟢 Social</option>
                  <option value="env">🔵 Env</option>
                  <option value="tech">🟣 Tech</option>
                </select>
                <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="border rounded-lg p-1.5 text-[10px] bg-white font-extrabold border-slate-200">
                  <option value="all">⭐ Difficultés</option>
                  <option value="1">📄 Std (1★)</option>
                  <option value="2">⚡ Miniboss (2★)</option>
                  <option value="3">🔥 Boss (3★)</option>
                </select>
              </div>
            </div>

            {/* Liste des quêtes filtrées */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {(questCatalogTab === 'local' ? localCatalogQuests : sharedCatalogQuests).map(q => {
                const badgeClass = getQuestBadgeStyle(q);
                return (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2 hover:bg-slate-100 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-extrabold text-xs text-slate-800 leading-tight">{q.name}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClass} flex-shrink-0`}>
                        {Number(q.difficulty) === 3 ? '🔥 3★' : Number(q.difficulty) === 2 ? '⚡ 2★' : '📄 1★'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold line-clamp-2 leading-normal">{q.desc}</p>
                    
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[10px] font-black">
                      <span className="text-slate-400 uppercase tracking-widest text-[9px]">{q.theme}</span>
                      
                      {/* Actions d'importation */}
                      <div className="flex gap-1.5">
                        {questCatalogTab === 'shared' ? (
                          <button
                            onClick={() => handleImportQuestToTree(q, true)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-md"
                          >
                            📥 Importer (Copie)
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleImportQuestToTree(q, false)}
                              className="bg-purple-700 hover:bg-purple-800 text-white text-[9px] font-extrabold uppercase px-2 py-1 rounded-md"
                            >
                              ➕ Importer
                            </button>
                            <button
                              onClick={() => handleImportQuestToTree(q, true)}
                              className="bg-slate-300 hover:bg-slate-400 text-slate-700 text-[9px] font-extrabold uppercase px-1.5 py-1 rounded-md"
                              title="Importer en dupliquant"
                            >
                              📋 Copie
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {(questCatalogTab === 'local' ? localCatalogQuests : sharedCatalogQuests).length === 0 && (
                <span className="text-slate-400 italic text-center block py-6 text-xs font-bold">Aucune quête trouvée.</span>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* MODALE DE CRÉATION RAPIDE DE QUÊTE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg">×</button>
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide mb-4">🎨 Créer une Mission Locale</h3>
            <form onSubmit={handleCreateQuest} className="space-y-3 text-xs">
              <input type="text" required placeholder="Nom de la mission" value={newQuestName} onChange={(e) => setNewQuestName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold" />
              <textarea rows="3" required placeholder="Description..." value={newQuestDesc} onChange={(e) => setNewQuestDesc(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold"></textarea>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Thématique</label>
                  <select value={newQuestTheme} onChange={(e) => setNewQuestTheme(e.target.value)} className="w-full border rounded-lg p-2 bg-white font-bold">
                    <option value="social">Social</option>
                    <option value="env">Environnement</option>
                    <option value="tech">Technologie</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">Type de Mission</label>
                  <select value={newQuestType} onChange={(e) => setNewQuestType(e.target.value)} className="w-full border rounded-lg p-2 bg-white font-bold">
                    <option value="normal">Standard (1★)</option>
                    <option value="miniboss">Miniboss (2★)</option>
                    <option value="boss">Boss (3★)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isCollaborative} 
                    onChange={(e) => setIsCollaborative(e.target.checked)} 
                    className="rounded border-slate-300 text-purple-700 focus:ring-purple-500"
                  />
                  <span>🤝 Mission collaborative en équipe</span>
                </label>
                {isCollaborative && (
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Membres requis par équipe :</label>
                    <input 
                      type="number" 
                      min="2" 
                      value={requiredPartners} 
                      onChange={(e) => setRequiredPartners(parseInt(e.target.value) || 2)} 
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-purple-700 text-white font-black py-2.5 rounded-xl uppercase tracking-wider text-xs">Créer la mission</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
