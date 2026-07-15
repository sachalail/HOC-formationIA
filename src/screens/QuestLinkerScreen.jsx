import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function StudioScreen({ trees = {}, setTrees }) {
  const [loading, setLoading] = useState(false);
  const [selectedTreeId, setSelectedTreeId] = useState('');
  const [newTreeName, setNewTreeName] = useState('');

  // États d'édition locale pour l'arbre sélectionné
  const [editingTree, setEditingTree] = useState(null);
  
  // États pour les formulaires d'ajout
  const [newFloorName, setNewFloorName] = useState('');
  
  // États pour l'ajout de quêtes (rattaché à un palier spécifique)
  const [activeFloorForQuest, setActiveFloorForQuest] = useState(null); // floorId
  const [questForm, setQuestForm] = useState({
    title: '',
    description: '',
    points: 50
  });

  // États pour l'ajout de compétences (rattaché à un palier spécifique)
  const [activeFloorForSkill, setActiveFloorForSkill] = useState(null); // floorId
  const [newSkillName, setNewSkillName] = useState('');

  // Charger les arbres depuis Supabase
  const fetchTrees = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('trees').select('*');
    if (data && !error) {
      const treesMap = {};
      data.forEach(t => { 
        treesMap[t.id] = {
          ...t,
          floors: t.floors || [] // S'assurer que floors est toujours un tableau
        }; 
      });
      if (typeof setTrees === 'function') setTrees(treesMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrees();
  }, []);

  // Mettre à jour l'arbre en cours d'édition lorsque la sélection change
  useEffect(() => {
    if (selectedTreeId && trees[selectedTreeId]) {
      setEditingTree(JSON.parse(JSON.stringify(trees[selectedTreeId])));
    } else {
      setEditingTree(null);
    }
  }, [selectedTreeId, trees]);

  // CRÉER UN NOUVEL ARBRE
  const handleCreateTree = async (e) => {
    if (e) e.preventDefault();
    if (!newTreeName.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('trees')
      .insert([{ name: newTreeName.trim(), floors: [] }])
      .select()
      .single();

    if (error) {
      alert(`❌ Erreur lors de la création : ${error.message}`);
    } else {
      await fetchTrees();
      setSelectedTreeId(data.id);
      setNewTreeName('');
    }
    setLoading(false);
  };

  // ENREGISTRER LES MODIFICATIONS DE L'ARBRE (Paliers, Quêtes, Compétences)
  const handleSaveTreeChanges = async () => {
    if (!editingTree) return;

    setLoading(true);
    const { error } = await supabase
      .from('trees')
      .update({
        name: editingTree.name,
        floors: editingTree.floors
      })
      .eq('id', editingTree.id);

    if (error) {
      alert(`❌ Erreur lors de la sauvegarde : ${error.message}`);
    } else {
      alert(`🎉 Arbre "${editingTree.name}" sauvegardé avec succès !`);
      await fetchTrees();
    }
    setLoading(false);
  };

  // SUPPRIMER L'ARBRE COMPLET
  const handleDeleteTree = async () => {
    if (!editingTree) return;
    if (!window.confirm(`⚠️ Êtes-vous sûr de vouloir supprimer définitivement l'arbre "${editingTree.name}" ?`)) return;

    setLoading(true);
    const { error } = await supabase.from('trees').delete().eq('id', editingTree.id);
    if (error) {
      alert(`❌ Erreur : ${error.message}`);
    } else {
      setSelectedTreeId('');
      setEditingTree(null);
      await fetchTrees();
    }
    setLoading(false);
  };

  // --- GESTION DES PALIERS ---
  const handleAddFloor = (e) => {
    if (e) e.preventDefault();
    if (!editingTree) return;

    const nextFloorId = editingTree.floors.length > 0 
      ? Math.max(...editingTree.floors.map(f => f.floorId)) + 1 
      : 1;

    const newFloor = {
      floorId: nextFloorId,
      name: newFloorName.trim() || `Palier ${nextFloorId}`,
      quests: [],
      skills: []
    };

    setEditingTree({
      ...editingTree,
      floors: [...editingTree.floors, newFloor]
    });
    setNewFloorName('');
  };

  const handleRemoveFloor = (floorId) => {
    if (!editingTree) return;
    if (!window.confirm(`Supprimer le palier ${floorId} ainsi que toutes ses quêtes ?`)) return;

    setEditingTree({
      ...editingTree,
      floors: editingTree.floors.filter(f => f.floorId !== floorId)
    });
  };

  // --- GESTION DES QUÊTES PAR PALIER ---
  const handleAddQuest = (floorId) => {
    if (!questForm.title.trim()) return;

    const updatedFloors = editingTree.floors.map(floor => {
      if (floor.floorId !== floorId) return floor;
      
      const newQuest = {
        id: `quest-${Date.now()}`,
        title: questForm.title.trim(),
        description: questForm.description.trim(),
        points: parseInt(questForm.points, 10) || 0
      };

      return {
        ...floor,
        quests: [...(floor.quests || []), newQuest]
      };
    });

    setEditingTree({ ...editingTree, floors: updatedFloors });
    setQuestForm({ title: '', description: '', points: 50 });
    setActiveFloorForQuest(null);
  };

  const handleRemoveQuest = (floorId, questId) => {
    const updatedFloors = editingTree.floors.map(floor => {
      if (floor.floorId !== floorId) return floor;
      return {
        ...floor,
        quests: (floor.quests || []).filter(q => q.id !== questId)
      };
    });
    setEditingTree({ ...editingTree, floors: updatedFloors });
  };

  // --- GESTION DES COMPÉTENCES PAR PALIER ---
  const handleAddSkill = (floorId) => {
    if (!newSkillName.trim()) return;

    const updatedFloors = editingTree.floors.map(floor => {
      if (floor.floorId !== floorId) return floor;
      const currentSkills = floor.skills || [];
      if (currentSkills.includes(newSkillName.trim())) return floor;

      return {
        ...floor,
        skills: [...currentSkills, newSkillName.trim()]
      };
    });

    setEditingTree({ ...editingTree, floors: updatedFloors });
    setNewSkillName('');
    setActiveFloorForSkill(null);
  };

  const handleRemoveSkill = (floorId, skillToRemove) => {
    const updatedFloors = editingTree.floors.map(floor => {
      if (floor.floorId !== floorId) return floor;
      return {
        ...floor,
        skills: (floor.skills || []).filter(s => s !== skillToRemove)
      };
    });
    setEditingTree({ ...editingTree, floors: updatedFloors });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative">
      
      {/* EN-TÊTE PRINCIPAL */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">🌲 Architecte de Formation (Studio)</h1>
          <p className="text-xs text-slate-500 font-bold">Créez vos arbres de compétences, définissez les paliers et configurez les exercices.</p>
        </div>
        {loading && (
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 animate-pulse">
            🔄 Synchronisation...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE : SÉLECTION & CRÉATION DES ARBRES */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* SÉLECTEUR D'ARBRE */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">🌲 Sélectionner un Arbre</h3>
            <select
              value={selectedTreeId}
              onChange={(e) => setSelectedTreeId(e.target.value)}
              className="w-full border rounded-lg p-2.5 bg-white font-bold text-xs shadow-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="">-- Choisir un arbre --</option>
              {Object.values(trees).map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.floors?.length || 0} paliers)</option>
              ))}
            </select>
          </div>

          {/* CRÉATEUR DE NOUVEL ARBRE */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">➕ Créer un nouvel arbre</h3>
            <form onSubmit={handleCreateTree} className="space-y-3">
              <input
                type="text"
                placeholder="Ex: Parcours Cybersécurité, Management..."
                value={newTreeName}
                onChange={(e) => setNewTreeName(e.target.value)}
                className="w-full border rounded-lg p-2.5 bg-slate-50 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
              <button
                type="submit"
                disabled={loading || !newTreeName.trim()}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-lg transition-all shadow-sm"
              >
                Créer l'Arbre
              </button>
            </form>
          </div>

        </div>

        {/* COLONNE DROITE : CONFIGURATEUR DE L'ARBRE SÉLECTIONNÉ */}
        <div className="lg:col-span-2">
          {editingTree ? (
            <div className="space-y-6">
              
              {/* BARRE D'ACTIONS DE L'ARBRE */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1 w-full sm:w-auto">
                  <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Édition active</span>
                  <input
                    type="text"
                    value={editingTree.name}
                    onChange={(e) => setEditingTree({ ...editingTree, name: e.target.value })}
                    className="block text-lg font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-hidden w-full"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button 
                    type="button"
                    onClick={handleDeleteTree}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-extrabold py-2 px-4 rounded-xl text-xs uppercase transition-all"
                  >
                    🗑️ Supprimer
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveTreeChanges}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold py-2 px-5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all"
                  >
                    💾 Sauvegarder
                  </button>
                </div>
              </div>

              {/* CONCEPTEUR DES PALIERS (FLOORS) */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h3 className="font-black text-slate-900 text-sm">🎯 Structure des Paliers</h3>
                  <form onSubmit={handleAddFloor} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nom du palier (Ex: Les bases du réseau)"
                      value={newFloorName}
                      onChange={(e) => setNewFloorName(e.target.value)}
                      className="border rounded-lg px-3 py-1.5 bg-slate-50 text-xs font-bold focus:bg-white outline-hidden"
                    />
                    <button
                      type="submit"
                      className="bg-purple-700 hover:bg-purple-800 text-white font-black text-xs uppercase px-4 py-1.5 rounded-lg transition-all"
                    >
                      ➕ Ajouter Palier
                    </button>
                  </form>
                </div>

                <div className="space-y-6">
                  {editingTree.floors.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 font-bold border-2 border-dashed rounded-xl">
                      Aucun palier défini pour cet arbre. Ajoutez un palier ci-dessus pour commencer à concevoir votre architecture.
                    </div>
                  ) : (
                    editingTree.floors.map((floor) => (
                      <div key={floor.floorId} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                        
                        {/* EN-TÊTE DU PALIER */}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-1 rounded-md">
                              Palier {floor.floorId}
                            </span>
                            <span className="font-black text-slate-800 text-sm">{floor.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFloor(floor.floorId)}
                            className="text-red-500 hover:text-red-700 font-bold text-xs"
                          >
                            🗑️ Supprimer Palier
                          </button>
                        </div>

                        {/* SECTION COMPÉTENCES */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">💡 Compétences Cibles :</span>
                            {activeFloorForSkill !== floor.floorId ? (
                              <button
                                type="button"
                                onClick={() => setActiveFloorForSkill(floor.floorId)}
                                className="text-purple-600 hover:text-purple-800 text-[10px] font-black uppercase"
                              >
                                ➕ Ajouter compétence
                              </button>
                            ) : (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Ex: Analyse de logs"
                                  value={newSkillName}
                                  onChange={(e) => setNewSkillName(e.target.value)}
                                  className="border rounded px-2 py-0.5 bg-white text-[11px] font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddSkill(floor.floorId)}
                                  className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setActiveFloorForSkill(null); setNewSkillName(''); }}
                                  className="text-slate-400 text-[10px] font-bold px-1"
                                >
                                  Annuler
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {(floor.skills || []).length === 0 ? (
                              <span className="text-[10px] text-slate-400 font-bold italic">Aucune compétence ciblée sur ce palier.</span>
                            ) : (
                              floor.skills.map((skill, sIdx) => (
                                <span key={sIdx} className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200 text-[10px] flex items-center gap-1">
                                  <span>{skill}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSkill(floor.floorId, skill)}
                                    className="text-red-500 hover:text-red-700 font-black"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* SECTION QUÊTES / EXERCICES */}
                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">⚔️ Exercices & Quêtes :</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveFloorForQuest(floor.floorId);
                                setQuestForm({ title: '', description: '', points: 50 });
                              }}
                              className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-md border border-purple-200"
                            >
                              ➕ Ajouter Exercice
                            </button>
                          </div>

                          {/* MODAL / FORMULAIRE D'AJOUT DE QUÊTE INLINE */}
                          {activeFloorForQuest === floor.floorId && (
                            <div className="bg-white border rounded-xl p-4 space-y-3 shadow-sm text-xs">
                              <h4 className="font-extrabold text-slate-800">Ajouter un exercice au Palier {floor.floorId}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-2">
                                  <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Titre :</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: Configuration du pare-feu"
                                    value={questForm.title}
                                    onChange={(e) => setQuestForm({ ...questForm, title: e.target.value })}
                                    className="w-full border rounded p-1.5 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Points XP :</label>
                                  <input
                                    type="number"
                                    value={questForm.points}
                                    onChange={(e) => setQuestForm({ ...questForm, points: e.target.value })}
                                    className="w-full border rounded p-1.5 font-black text-center"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Description / Consignes :</label>
                                <textarea
                                  placeholder="Détaillez les objectifs de cette quête..."
                                  value={questForm.description}
                                  onChange={(e) => setQuestForm({ ...questForm, description: e.target.value })}
                                  className="w-full border rounded p-1.5 font-semibold h-16"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setActiveFloorForQuest(null)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-lg"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddQuest(floor.floorId)}
                                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-1 rounded-lg"
                                >
                                  Valider
                                </button>
                              </div>
                            </div>
                          )}

                          {/* LISTE DES QUÊTES DU PALIER */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(floor.quests || []).length === 0 ? (
                              <div className="col-span-full text-center py-4 bg-white border border-dashed rounded-lg text-[10px] text-slate-400 font-bold">
                                Aucun exercice configuré sur ce palier.
                              </div>
                            ) : (
                              floor.quests.map((q, qIdx) => (
                                <div key={q.id || qIdx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 relative group flex flex-col justify-between shadow-2xs">
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-start gap-2">
                                      <p className="font-extrabold text-slate-900 text-xs truncate pr-4">⚔️ {q.title || "Sans titre"}</p>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveQuest(floor.floorId, q.id)}
                                        className="text-red-500 hover:text-red-700 font-bold text-[10px]"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                    <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-3">{q.description || "Pas de description."}</p>
                                  </div>
                                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                      💎 {q.points || 0} XP
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
              <span className="text-4xl block">🌲</span>
              <h3 className="text-sm font-black text-slate-800 uppercase">Aucun arbre sélectionné</h3>
              <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">
                Choisissez un arbre existant dans le panneau de gauche ou créez-en un nouveau pour configurer vos parcours et quêtes.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
