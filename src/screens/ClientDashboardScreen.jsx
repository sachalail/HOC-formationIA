// src/screens/ClientDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClientDashboardScreen({ trees, quests }) {
  const [sessions, setSessions] = useState([]); // Sessions gérées par ce DRH
  const [selectedSession, setSelectedSession] = useState(null); // Session actuellement sélectionnée
  const [sessionStudents, setSessionStudents] = useState([]); // Étudiants de la session sélectionnée
  const [allProductions, setAllProductions] = useState([]); // Toutes les productions
  const [loading, setLoading] = useState(true);

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
          setSelectedSession(sessionsData[0]);
        }

        // 3. Récupérer l'intégralité des livrables pour pouvoir filtrer localement par la suite
        const { data: prods, error: prodsError } = await supabase
          .from('productions')
          .select('*')
          .order('created_at', { ascending: false });

        if (prodsError) throw prodsError;

        if (prods) {
          const formatted = prods.map(p => ({
            id: p.id,
            studentId: p.student_id,
            studentEmail: p.student_email,
            questId: p.quest_id,
            questName: p.quest_name,
            content: p.content,
            file_url: p.file_url,
            date: new Date(p.created_at).toLocaleDateString('fr-FR')
          }));
          setAllProductions(formatted);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données DRH:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHRData();
  }, []);

  // 4. Dès que la session sélectionnée change, on récupère AUTOMATIQUEMENT ses étudiants via leur profil Supabase
  useEffect(() => {
    if (!selectedSession || !selectedSession.session_code) {
      setSessionStudents([]);
      return;
    }

    const fetchStudentsProfiles = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, email')
          .contains('session_codes', JSON.stringify([selectedSession.session_code]));

        if (error) throw error;

        if (profiles) {
          const formattedStudents = profiles.map(p => ({
            uid: p.id,
            name: p.email ? p.email.split('@')[0] : "Apprenant", // Fallback visuel sympa
            email: p.email,
            joinedTrees: selectedSession.tree_id ? [selectedSession.tree_id] : [] // L'unique arbre lié à cette session
          }));
          setSessionStudents(formattedStudents);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération automatique des étudiants :", err);
      }
    };

    fetchStudentsProfiles();
  }, [selectedSession]);

  // Handler de changement de session dans le menu déroulant (Sécurisé en comparaison String)
  const handleSessionChange = (e) => {
    const sessionDocId = e.target.value;
    const found = sessions.find(s => String(s.id) === String(sessionDocId));
    if (found) {
      setSelectedSession(found);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-8 text-center text-xs font-mono text-slate-400">
        Chargement des données d'audit...
      </div>
    );
  }

  // Si le DRH n'a absolument aucune session assignée
  if (sessions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12 text-center bg-white border rounded-2xl shadow-sm">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Aucune session affectée</h2>
        <p className="text-xs text-slate-400 mt-1">Votre compte n'est actuellement déclaré comme DRH sur aucune session active.</p>
      </div>
    );
  }

  // Parer au cas où le state selectedSession soit temporairement null pendant un rafraîchissement
  const currentSessionSafe = selectedSession || sessions[0];

  // FILTRAGE DYNAMIQUE DES DONNÉES DE LA COHORTE SÉLECTIONNÉE
  const studentIdsInCurrentSession = sessionStudents.map(s => s.uid);
  
  const filteredProductions = allProductions.filter(p => 
    studentIdsInCurrentSession.includes(p.studentId)
  );

  const uniqueProductionsGlobal = filteredProductions.filter(p => !p.content?.startsWith("[Importé"));
  let totalLivrables = uniqueProductionsGlobal.length;
  let totalXP = 0;

  // Calcul du score global d'avancement
  const questsList = quests || [];
  const getPointsByDifficulty = (diff) => {
    const d = parseInt(diff, 10);
    if (d === 3) return 500;
    if (d === 2) return 250;
    return 100;
  };

  const studentsProgress = sessionStudents.map(student => {
    const studentProds = filteredProductions.filter(p => p.studentId === student.uid);
    const studentUniqueProds = studentProds.filter(p => !p.content?.startsWith("[Importé"));

    // Calcul de l'XP cumulé par l'élève
    const studentPoints = studentProds.reduce((sum, prod) => {
      const originalQuest = questsList.find(q => q.id === prod.questId);
      if (originalQuest) {
        return sum + getPointsByDifficulty(originalQuest.difficulty);
      }
      if (prod.questId && String(prod.questId).startsWith('quest_')) {
        return sum + 250; // Fallback pour les quêtes natives
      }
      return sum + 100;
    }, 0);
    
    totalXP += studentPoints;

    // Détermination du Palier max atteint (via localStorage de secours des élèves)
    let maxFloor = 1;
    if (Array.isArray(student.joinedTrees)) {
      student.joinedTrees.forEach(treeId => {
        const savedFloor = localStorage.getItem(`ecolearn_floor_${student.uid}_${treeId}`);
        const floorIdx = savedFloor ? parseInt(savedFloor, 10) : 0;
        if (floorIdx + 1 > maxFloor) {
          maxFloor = floorIdx + 1;
        }
      });
    }

    return {
      ...student,
      xp: studentPoints,
      livrablesCount: studentUniqueProds.length,
      maxFloor: maxFloor
    };
  });

  // KPI additionnelles de la vue décideur
  const totalStudents = sessionStudents.length;
  const countPalier1 = studentsProgress.filter(s => s.maxFloor >= 1).length;
  const countPalier2 = studentsProgress.filter(s => s.maxFloor >= 2).length;

  const pctPalier1 = totalStudents > 0 ? Math.round((countPalier1 / totalStudents) * 100) : 0;
  const pctPalier2 = totalStudents > 0 ? Math.round((countPalier2 / totalStudents) * 100) : 0;

  const activeStudentsCount = studentsProgress.filter(s => s.livrablesCount > 0).length;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
      
      {/* BARRE HAUTE DE SÉLECTION DE LA COHORTE DIRECTE (CORRIGÉE EN STRING) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider whitespace-nowrap">
            📂 Sélectionner la cohorte :
          </label>
          <select 
            value={String(currentSessionSafe.id || '')} 
            onChange={handleSessionChange}
            className="bg-white border border-slate-200 text-xs font-bold rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-purple-500 shadow-sm min-w-[220px] cursor-pointer"
          >
            {sessions.map(s => (
              <option key={String(s.id)} value={String(s.id)}>
                📍 {s.name || `Session — ${s.session_code || `ID: ${String(s.id).substring(0, 6)}`}`}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[11px] font-medium text-slate-400">
          Supervision de <strong className="text-slate-600">{sessions.length} session(s)</strong> actives rattachées
        </div>
      </div>

      {/* HEADER BANNER */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-md">
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-black tracking-wider text-amber-400">Suivi d'Acculturation Entreprise</div>
          <h2 className="text-lg font-black tracking-tight">
            Portail Décideur & RH — {currentSessionSafe.name || 'Ma Session'}
          </h2>
          <p className="text-xs text-slate-400">
            Code unique d'arrimage : <span className="font-mono text-amber-500 font-bold bg-slate-800 px-2 py-0.5 rounded">{currentSessionSafe.session_code || 'N/A'}</span> | {totalStudents} collaborateur(s) inscrit(s) dans cette cohorte.
          </p>
        </div>
        <button 
          onClick={() => alert(`📊 Génération du rapport de suivi pour ${currentSessionSafe.name || 'la session'}...`)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          📥 Télécharger le rapport (.xlsx)
        </button>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Compteur de Compétences (XP cohorte)</div>
          <div className="text-3xl font-black text-slate-900">{totalXP} <span className="text-xs font-bold text-slate-400">XP</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Somme stricte des quêtes validées par cette cohorte.</p>
        </div>

        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cas Pratiques / Livrables Déposés</div>
          <div className="text-3xl font-black text-emerald-600">{totalLivrables} <span className="text-xs font-bold text-slate-400">Rendus</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Preuves concrètes de manipulation d'outils IA.</p>
        </div>

        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Taux d'Engagement Actif</div>
          <div className="text-3xl font-black text-purple-600">{engagementRate}%</div>
          <p className="text-[11px] text-slate-500 font-medium">Pourcentage de collaborateurs ayant rendu au moins 1 livrable.</p>
        </div>
      </div>

      {/* CORPS PRINCIPAL DE L'AUDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAPHIQUE TAUX DE REUSSITE */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">📉 Taux de passage des Paliers</h3>
          
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Palier 1</span>
                <span>{pctPalier1}% ({countPalier1}/{totalStudents})</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${pctPalier1}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Palier 2</span>
                <span>{pctPalier2}% ({countPalier2}/{totalStudents})</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full" style={{ width: `${pctPalier2}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* TABLEAU SYNTHESE REEL */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-3 lg:col-span-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">👥 Synthèse par Collaborateur ({totalStudents})</h3>
          
          {totalStudents === 0 ? (
            <div className="text-center p-12 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed">
              💡 Aucun collaborateur n'est encore associé au code "{currentSessionSafe.session_code || 'N/A'}" pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider border-b">
                    <th className="pb-2">Collaborateur</th>
                    <th className="pb-2">Niveau Max Atteint</th>
                    <th className="pb-2">Livrables</th>
                    <th className="pb-2 text-right">Score d'XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {studentsProgress.map(student => (
                    <tr key={student.uid} className="hover:bg-slate-50/50">
                      <td className="py-3 font-black text-slate-800 flex flex-col">
                        <span>{student.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{student.email}</span>
                      </td>
                      <td className="py-3 font-medium">
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-bold font-mono">Palier {student.maxFloor}</span>
                      </td>
                      <td className="py-3 font-semibold text-slate-500">{student.livrablesCount} déposé(s)</td>
                      <td className="py-3 text-right font-black text-emerald-600">{student.xp} XP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* REGISTRE DES LIVRABLES DE LA SESSION */}
      <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">📂 Registre d'audit des Livrables de la session</h3>
        
        {uniqueProductionsGlobal.length === 0 ? (
          <div className="text-center p-8 text-xs text-slate-400 font-medium italic bg-slate-50 rounded-xl border border-dashed">
            Aucun livrable n'a encore été déposé par cette cohorte.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uniqueProductionsGlobal.map(prod => (
              <div key={prod.id} className="border rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between gap-3 relative overflow-hidden">
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-slate-300" />
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-900 font-black">
                      👤 Par : {sessionStudents.find(s => s.uid === prod.studentId)?.name || prod.studentEmail || "Inconnu"}
                      
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
                  <h4 className="font-bold text-xs text-slate-800 pt-1">🎯 Quête : {prod.questName}</h4>
                  <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border leading-relaxed font-medium italic">"{prod.content}"</p>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  {/* SÉCURISÉ : On force String() sur l'ID avant le substring de secours */}
                  <span>Réf Espace : DRH-SESS-{String(currentSessionSafe.id).substring(0, 5)}</span>
                  <span className="text-emerald-600 font-extrabold">✓ Livrable Archivé</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
