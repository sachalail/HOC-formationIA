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
  }, [user.currentFloorId, user.currentSelection]);

  useEffect(() => {
    if (activeFloorQuests.length > 0) {
      setSelectedQuestId(activeFloorQuests[0]);
    } else {
      setSelectedQuestId(null);
    }
  }, [user.currentFloorId, user.currentSelection]);

  if (!user) return <div className="p-6">Chargement...</div>;
  const activeQuestData = questDatabase.find(q => q.id === selectedQuestId);

  const handleSubmitQuest = () => {
    if (deliverable.trim().length < 5) {
      alert("⚠️ Merci d'écrire une réponse d'au moins 5 caractères.");
      return;
    }

    const updatedUsers = [...users];
    const u = updatedUsers[currentUserIdx];

    u.validatedQuests.push(activeQuestData.id);
    u.deliverables[activeQuestData.id] = deliverable;
    u.elo += activeQuestData.difficulty * 50;

    if (activeQuestData.isMiniboss && u.currentFloorId === 3) {
      u.currentFloorId = 5; // Jump au niveau 5
      alert("🔥 BONUS MINIBOSS : Saut direct au Palier 5 !");
    } else {
      u.currentFloorId += 1;
    }

    u.currentSelection = [];
    setUsers(updatedUsers);
    setDeliverable('');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-sky-50 border border-sky-200 p-4 rounded-lg flex justify-between items-center mb-8 shadow-sm">
        <div>
          <span className="font-semibold text-sky-900">👤 Apprenant : </span>
          <span className="bg-white px-3 py-1 rounded border border-sky-300 font-bold text-sky-800">{user.name}</span>
        </div>
        <div className="bg-orange-500 font-bold px-4 py-1.5 rounded text-white shadow-sm">
          📍 PALIER ACTUEL : Étape {user.currentFloorId}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-400">Score de Compétence</div>
          <div className="text-2xl font-bold mt-1 text-slate-800">{user.elo} <span className="text-xs font-normal text-slate-500">Points ELO</span></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-400">Missions Terminées</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{user.validatedQuests.length} validée(s)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {currentFloorObj ? (
            <>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">🎯 Quêtes disponibles :</h3>
                  {currentFloorObj.mode === 'random' && (
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded animate-pulse">🎲 Tirage aléatoire actif !</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeFloorQuests.map(qId => {
                    const qData = questDatabase.find(q => q.id === qId);
                    if (!qData) return null;
                    const isActive = selectedQuestId === qId;
                    return (
                      <button
                        key={qId}
                        onClick={() => setSelectedQuestId(qId)}
                        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 bg-white shadow-sm ${
                          isActive ? 'ring-2 ring-orange-500 border-orange-500' : 'border-slate-200 hover:border-orange-300'
                        }`}
                      >
                        <span className={`text-xs font-bold uppercase ${qData.isMiniboss ? 'text-red-500' : 'text-slate-400'}`}>{qData.theme}</span>
                        <div className="font-bold text-slate-800 text-sm">{qData.name}</div>
                        <span className="text-xs text-slate-400">Difficulté : Niv.{qData.difficulty}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeQuestData && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">{activeQuestData.name}</h2>
                    <p className="text-xs text-slate-500 mt-1">{activeQuestData.desc}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 block">Votre réponse :</label>
                    <textarea 
                      value={deliverable}
                      onChange={(e) => setDeliverable(e.target.value)}
                      rows="3" 
                      placeholder="Écrivez votre travail..."
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <button onClick={handleSubmitQuest} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                    Soumettre le livrable
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center shadow-sm">
              <h3 className="text-xl font-bold text-emerald-950">🏆 Parcours terminé !</h3>
              <button onClick={() => window.location.reload()} className="mt-4 bg-white border text-emerald-800 font-bold text-xs px-4 py-2 rounded">Recommencer</button>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit">
          <h3 className="font-bold text-slate-900 border-b pb-2 mb-3 text-sm">📋 Archives</h3>
          <div className="space-y-3">
            {user.validatedQuests.map((qId, index) => {
              const qData = questDatabase.find(q => q.id === qId);
              return (
                <div key={index} className="p-3 bg-slate-50 border-l-4 border-l-emerald-500 rounded text-xs">
                  <div className="font-bold text-slate-800">{qData?.name}</div>
                  <div className="text-slate-500 italic truncate">"{user.deliverables[qId]}"</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}