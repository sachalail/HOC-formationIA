// src/screens/ApprenantScreen.jsx
import React, { useState, useEffect } from 'react';
import { questDatabase } from '../data/mockData';

export default function ApprenantScreen({ users, setUsers, trees }) {
  const [selectedQuestId, setSelectedQuestId] = useState(null);
  const [deliverable, setDeliverable] = useState('');

  const currentUserIdx = 0; 
  const user = users[currentUserIdx];
  const assignedTree = trees[user.assignedTreeId];
  const currentFloorObj = assignedTree?.floors.find(f => f.floorId === user.currentFloorId);
  const activeFloorQuests = user.currentSelection || [];

  // Effet de calcul pour l'aléatoire ou le statique du palier
  useEffect(() => {
    if (!currentFloorObj) return;

    if (currentFloorObj.mode === 'random' && (!user.currentSelection || user.currentSelection.length === 0)) {
      const pool = currentFloorObj.pool;
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selection = shuffled.slice(0, currentFloorObj.count);
      
      const updatedUsers = [...users];
      updatedUsers[currentUserIdx].currentSelection = selection;
      setUsers(updatedUsers);
    } else if (currentFloorObj.mode === 'static' && (!user.currentSelection || user.currentSelection.length === 0)) {
      const updatedUsers = [...users];
      updatedUsers[currentUserIdx].currentSelection = currentFloorObj.quests;
      setUsers(updatedUsers);
    }
  }, [currentFloorObj, user.currentSelection, users, setUsers]);

  const handleQuestSelect = (qId) => {
    if (user.validatedQuests.includes(qId)) return;
    setSelectedQuestId(qId);
    setDeliverable('');
  };

  const handleSubmitQuest = () => {
    if (!selectedQuestId || !deliverable.trim()) return;

    const updatedUsers = [...users];
    const u = updatedUsers[currentUserIdx];

    // Ajouter aux quêtes validées
    u.validatedQuests.push(selectedQuestId);

    // Vérifier si toutes les quêtes du choix actuel sont complétées
    const allDone = u.currentSelection.every(qId => u.validatedQuests.includes(qId));

    if (allDone) {
      const currentFloorIndex = assignedTree.floors.findIndex(f => f.floorId === u.currentFloorId);
      if (currentFloorIndex < assignedTree.floors.length - 1) {
        // Passer au palier suivant
        u.currentFloorId = assignedTree.floors[currentFloorIndex + 1].floorId;
        u.currentSelection = []; // Réinitialiser pour le tirage du prochain palier
      } else {
        // Fin de l'arbre
        u.currentFloorId = 'finished';
      }
    }

    setUsers(updatedUsers);
    setSelectedQuestId(null);
    setDeliverable('');
  };

  if (!assignedTree) {
    return <div className="p-8 text-center text-xs text-slate-400 font-mono">Aucun arbre assigné à ce profil.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 pl-24 grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* COLONNE GAUCHE : TOIT & PROGRESSION */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-950 text-white p-5 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase font-mono">Espace d'entraînement</span>
            <h2 className="text-base font-black tracking-tight">{assignedTree.name}</h2>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-xl text-xs font-mono font-bold text-sky-400">
            {user.currentFloorId === 'finished' ? '🏆 Terminé' : `Palier actuel : ${user.currentFloorId}`}
          </div>
        </div>

        {user.currentFloorId !== 'finished' ? (
          <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b pb-2 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">🎯 Missions obligatoires pour ce niveau</h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded font-mono uppercase">Mode : {currentFloorObj?.mode}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeFloorQuests.map(qId => {
                const quest = questDatabase.find(q => q.id === qId);
                if (!quest) return null;

                const isDone = user.validatedQuests.includes(qId);
                const isSelected = selectedQuestId === qId;

                return (
                  <button
                    key={qId}
                    disabled={isDone}
                    onClick={() => handleQuestSelect(qId)}
                    className={`p-4 rounded-xl text-left border-2 transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                      isDone 
                        ? 'bg-emerald-50/40 border-emerald-200 opacity-60 cursor-not-allowed' 
                        : isSelected 
                        ? 'bg-sky-50 border-sky-500 ring-4 ring-sky-500/5' 
                        : 'bg-slate-50 border-slate-100 hover:border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400">
                        <span>{quest.theme === 'env' ? '🌍 RSE' : '⚙️ TECH'}</span>
                        <span>{quest.difficulty}★</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 mt-1 leading-snug">{quest.name}</h4>
                    </div>
                    {isDone && <span className="text-emerald-700 font-mono font-bold text-[10px] bg-emerald-100 px-2 py-0.5 rounded self-start">Validé ✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
            <h3 className="text-lg font-black text-emerald-950">🏆 Félicitations, parcours terminé !</h3>
            <p className="text-xs text-emerald-700 max-w-md mx-auto">Vous avez validé l'intégralité des paliers requis sur cet arbre de compétences.</p>
            <button 
              onClick={() => {
                const updatedUsers = [...users];
                updatedUsers[currentUserIdx].currentFloorId = assignedTree.floors[0].floorId;
                updatedUsers[currentUserIdx].validatedQuests = [];
                updatedUsers[currentUserIdx].currentSelection = [];
                setUsers(updatedUsers);
                setSelectedQuestId(null);
              }} 
              className="mt-4 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              🔄 Réinitialiser l'arbre de test
            </button>
          </div>
        )}
      </div>

      {/* COLONNE DROITE : FOCUS ET ARCHIVES */}
      <div className="space-y-6">
        {selectedQuestId ? (
          (() => {
            const activeQuest = questDatabase.find(q => q.id === selectedQuestId);
            return (
              <div className="bg-white border-2 border-sky-400 p-5 rounded-2xl shadow-md space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">Mission Sélectionnée</span>
                    <h3 className="font-black text-slate-900 text-sm mt-1.5 leading-tight">{activeQuest?.name}</h3>
                  </div>
                  <button onClick={() => setSelectedQuestId(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold font-mono">✕</button>
                </div>
                <p className="text-xs text-slate-600 italic bg-slate-50 border p-3 rounded-xl">"{activeQuest?.desc}"</p>
                
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Votre document ou réponse :</label>
                  <textarea 
                    rows="4" 
                    value={deliverable} 
                    onChange={(e) => setDeliverable(e.target.value)} 
                    placeholder="Écrivez ou collez votre livrable ici..." 
                    className="w-full bg-white border rounded-xl p-3 text-xs focus:border-sky-500 focus:outline-none placeholder:text-slate-300" 
                  />
                  <button onClick={handleSubmitQuest} className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3 rounded-xl text-xs transition-all uppercase tracking-wide shadow-sm cursor-pointer">
                    Soumettre le livrable
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          user.currentFloorId !== 'finished' && (
            <div className="bg-slate-50 border border-dashed rounded-2xl p-6 text-center text-xs text-slate-400 py-10">
              🎯 Cliquez sur une mission à gauche pour travailler dessus.
            </div>
          )
        )}

        {/* ARCHIVES DES RÉUSSITES LOCALES */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-black text-slate-800 border-b pb-2 text-xs uppercase tracking-wider">📋 Historique local ({user.validatedQuests.length})</h3>
          {user.validatedQuests.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-slate-400 italic">Aucune validation pour le moment.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {user.validatedQuests.map((qId, index) => {
                const qData = questDatabase.find(q => q.id === qId);
                return (
                  <div key={index} className="p-3 bg-slate-50 border-l-4 border-l-emerald-500 rounded-xl text-[11px] flex flex-col gap-0.5">
                    <span className="font-black text-slate-700">{qData ? qData.name : qId}</span>
                    <span className="text-[9px] text-slate-400 font-mono uppercase">{qId} — Validée</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
