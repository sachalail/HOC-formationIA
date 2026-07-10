// src/screens/ClientDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClientDashboardScreen({ trees, quests }) {
  const [sessions, setSessions] = useState([]); // Sessions gérées par ce DRH
  const [selectedSession, setSelectedSession] = useState(null); // Session actuellement sélectionnée
  const [sessionStudents, setSessionStudents] = useState([]); // Étudiants de la session sélectionnée
  const [allProductions, setAllProductions] = useState([]); // Toutes les productions
  const [loading, setLoading] = useState(true);

  // FILTRE CIBLÉ SUR UNE MISSION UNIQUE
  const [selectedQuestFilter, setSelectedQuestFilter] = useState('all');

  useEffect(() => {
    const fetchHRData = async () => {
      try {
        // 1. Récupérer l'utilisateur DRH connecté
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) return;

        const hrUserId = authSession.user.id;

        // 2. Récupérer les sessions où l'utilisateur fait partie du tableau 'drh'
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .contains('drh_ids', JSON.stringify([hrUserId])); // On passe un tableau JS classique, Supabase s'occupe du cast JSONB

        if (sessionsError) throw sessionsError;
        setSessions(sessionsData || []);

        // Sélectionner la première session par défaut s'il y en a
        if (sessionsData && sessionsData.length > 0) {
          setSelectedSession(sessionsData[0].session_code);
        }
      } catch (err) {
        console.error("Erreur d'initialisation de l'espace DRH :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHRData();
  }, []);

  // Déclencheur : dès qu'on change de session, on recharge les participants et leurs productions
  useEffect(() => {
    if (!selectedSession) return;
    
    const fetchSessionDetails = async () => {
      try {
        // 1. Trouver la session actuelle
        const currentSess = sessions.find(s => s.session_code === selectedSession);
        if (!currentSess) return;

        // 2. Récupérer les profils des étudiants inscrits à cette session
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles')
          .select('*')
          .contains('session_codes', JSON.stringify([selectedSession]));

        if (studentsError) throw studentsError;
        setSessionStudents(studentsData || []);

        // 3. Récupérer l'intégralité des rendus (productions) de ces étudiants
        if (studentsData && studentsData.length > 0) {
          const studentIds = studentsData.map(st => st.id);
          
          const { data: prodsData, error: prodsError } = await supabase
            .from('productions')
            .select('*')
            .in('student_id', studentIds)
            .order('created_at', { ascending: false });

          if (prodsError) throw prodsError;

          const formattedProds = (prodsData || []).map(p => ({
            id: p.id,
            studentId: p.student_id,
            studentEmail: p.student_email,
            questId: p.quest_id,
            questName: p.quest_name,
            content: p.content,
            file_url: p.file_url,
            date: new Date(p.created_at).toLocaleDateString('fr-FR')
          }));

          setAllProductions(formattedProds);
        } else {
          setAllProductions([]);
        }

      } catch (err) {
        console.error("Erreur de récupération des données de session :", err);
      }
    };

    fetchSessionDetails();
  }, [selectedSession, sessions]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 pl-24 text-center text-xs font-bold text-slate-400">
        Chargement des données de l'Espace Client / DRH...
      </div>
    );
  }

  // Informations de la session active
  const currentSessionSafe = sessions.find(s => s.session_code === selectedSession) || { id: 'N/A', tree_id: null };
  const currentTreeObj = trees[currentSessionSafe.tree_id];

  // Calculer l'XP d'une quête d'après sa difficulté
  const getPointsByDifficulty = (difficulty) => {
    const numericDifficulty = parseInt(difficulty, 10);
    if (numericDifficulty === 3) return 500;
    if (numericDifficulty === 2) return 250;
    return 100;
  };

  // Filtrer les productions selon le filtre par mission sélectionné
  const filteredProductions = allProductions.filter(p => {
    if (selectedQuestFilter === 'all') return true;
    return p.questId === selectedQuestFilter;
  });

  // Calcul dynamique de l'XP cumulé uniquement sur la sélection actuelle
  const companyTotalXp = filteredProductions.reduce((sum, prod) => {
    const originalQuest = quests.find(q => q.id === prod.questId);
    return sum + (originalQuest ? getPointsByDifficulty(originalQuest.difficulty) : 100);
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6">
      
      {/* HEADER CLIENT */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2 text-indigo-400">
            📊 Espace Client & Pilotage RH
          </h2>
          <p className="text-[11px] text-slate-400 font-medium">
            Supervisez l'engagement, l'acquisition de compétences et l'XP de vos collaborateurs.
          </p>
        </div>

        {/* SELECTEUR DE SESSION DIRECT */}
        {sessions.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Session suivie :</label>
            <select 
              value={selectedSession || ''} 
              onChange={(e) => { setSelectedSession(e.target.value); setSelectedQuestFilter('all'); }}
              className="bg-slate-950 border border-slate-700 text-emerald-400 text-xs font-mono font-bold rounded-lg px-3 py-1.5 focus:outline-none"
            >
              {sessions.map(s => (
                <option key={s.session_code} value={s.session_code}>📍 {s.session_code}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white border rounded-3xl p-8 text-center text-xs text-slate-400 italic font-medium shadow-sm">
          Aucune session de formation n'est actuellement rattachée à vos droits de supervision d'entreprise.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* STATS & COLLABORATEURS (GAUCHE) */}
          <div className="space-y-6">
            
            {/* STATS DE LA SÉLECTION ACCUMULÉES */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b pb-2">📈 Métriques de Sélection</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border p-3 rounded-xl text-center">
                  <span className="block text-[9px] font-black text-slate-400 uppercase">XP Équipe Cumulé</span>
                  <span className="text-md font-mono font-black text-slate-900">{companyTotalXp} XP</span>
                </div>
                <div className="bg-slate-50 border p-3 rounded-xl text-center">
                  <span className="block text-[9px] font-black text-slate-400 uppercase">Rendus Validés</span>
                  <span className="text-md font-mono font-black text-emerald-600">{filteredProductions.length}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 italic text-center font-medium leading-relaxed bg-slate-50/50 p-2 rounded-xl border border-dashed">
                Statistiques synchronisées en direct avec les critères de recherche.
              </div>
            </div>

            {/* LISTE DES COLLABORATEURS INSCRITS */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex justify-between items-center">
                <span>👥 Effectif Collaborateurs</span>
                <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono">{sessionStudents.length}</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">Liste des collaborateurs rattachés à la clé active.</p>
              
              {sessionStudents.length === 0 ? (
                <div className="text-xs text-slate-400 italic pt-2">Aucun apprenant inscrit à ce code.</div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {sessionStudents.map(st => {
                    // Compter le nombre de productions de cet étudiant sur la sélection actuelle
                    const stepsDone = filteredProductions.filter(p => p.studentId === st.id).length;
                    return (
                      <div key={st.id} className="bg-slate-50 border rounded-xl p-2.5 flex justify-between items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700 truncate">{st.student_email || st.email || "Utilisateur anonyme"}</span>
                        <span className="text-[9px] font-mono font-bold bg-white text-slate-500 border rounded px-1.5 py-0.5 shrink-0">
                          {stepsDone} rendu(s)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* HISTORIQUE DE TOUS LES RENDUS ENREGISTRÉS (DROITE) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* COMPOSANT CENTRE DE TRI / FILTRE DE MISSION EXCLUSIF */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">🎛️ Centre de Tri Client</h4>
                <p className="text-[10px] text-slate-400">Isolez les résultats sur une mission spécifique.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-300 font-bold uppercase">Mission cible :</label>
                <select 
                  value={selectedQuestFilter} 
                  onChange={(e) => setSelectedQuestFilter(e.target.value)} 
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white cursor-pointer max-w-[240px] focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">🎯 Toutes les missions de la session ({quests.length})</option>
                  {quests.map(q => (
                    <option key={q.id} value={q.id}>⚡ {q.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-b pb-2 flex justify-between items-center">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">
                📂 Flux Général des Livrables ({filteredProductions.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Parcours technique : {currentTreeObj ? currentTreeObj.name : 'N/A'}</span>
            </div>

            {filteredProductions.length === 0 ? (
              <div className="bg-white border rounded-2xl p-12 text-center text-xs text-slate-400 font-medium italic shadow-sm">
                Aucun livrable n'a été déposé pour les critères sélectionnés.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProductions.map(prod => {
                  const linkedQuest = quests.find(q => q.id === prod.questId);
                  const difficultyStars = linkedQuest ? `${linkedQuest.difficulty}★` : '1★';

                  return (
                    <div key={prod.id} className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-2.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          🧑‍💻 {prod.studentEmail}
                          {prod.file_url && (
                            <a 
                              href={prod.file_url} 
                              download={`Livrable_${prod.id}`}
                              className="ml-2 inline-flex items-center text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded font-mono font-bold text-[9px] border border-purple-200 transition-all cursor-pointer"
                            >
                              📄 doc livré
                            </a>
                          )}
                        </span>
                        <span className="text-slate-400 font-mono">{prod.date}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 pt-1">🎯 Quête : {prod.questName} <span className="text-[10px] font-mono font-bold text-amber-500 ml-1">({difficultyStars})</span></h4>
                      <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border leading-relaxed font-medium italic">"{prod.content}"</p>
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
