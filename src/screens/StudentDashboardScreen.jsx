// src/screens/StudentDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// 🧬 Fonction utilitaire pour calculer le Hash SHA-256 d'un fichier en local dans le navigateur
async function calculateFileHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function StudentDashboardScreen({ trees, quests }) {
  const [user, setUser] = useState(null);
  const [sessionCodesList, setSessionCodesList] = useState([]); 
  const [mySessionsData, setMySessionsData] = useState([]); 
  const [selectedSessionCode, setSelectedSessionCode] = useState(null); 
  const [selectedTreeId, setSelectedTreeId] = useState(null); 
  
  const [accessCode, setAccessCode] = useState('');
  const [activeTab, setActiveTab] = useState('parcours'); 
  
  // FILTRES DE JEU
  const [filterTheme, setFilterTheme] = useState('all');
  const [filterPoints, setFilterPoints] = useState('all');

  // ÉTATS DE SUIVI UNIQUE
  const [unlockedFloorsObj, setUnlockedFloorsObj] = useState({}); 
  const [myProductions, setMyProductions] = useState([]); 
  const [allValidatedProds, setAllValidatedProds] = useState([]); 
  const [allStudentsInSession, setAllStudentsInSession] = useState([]); 

  // MODALE RENDU CIBLÉ
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // GESTION FICHIERS JOINT
  const [selectedFile, setSelectedFile] = useState(null);

  // 1. CHARGEMENT INITIAL DE L'UTILISATEUR ET DE SES COMPTES-RENDUS/PRODUCTIONS
  useEffect(() => {
    const fetchUserAndSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        
        // Récupérer le profil pour extraire la liste des sessions jointes
        const { data: profile } = await supabase
          .from('profiles')
          .select('joined_sessions')
          .eq('id', session.user.id)
          .single();

        if (profile && Array.isArray(profile.joined_sessions)) {
          setSessionCodesList(profile.joined_sessions);
          if (profile.joined_sessions.length > 0) {
            setSelectedSessionCode(profile.joined_sessions[0]);
          }
        }
        
        // Charger les productions de cet étudiant
        fetchMyProductions(session.user.id);
      }
    };
    fetchUserAndSession();
  }, []);

  // 2. RÉCUPÉRATION SYNCHRONISÉE DES SESSIONS ASSOCIEES ET DE L'ARBRE PEDAGOGIQUE
  useEffect(() => {
    if (sessionCodesList.length === 0) return;

    const fetchSessionsMetadata = async () => {
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .in('session_code', sessionCodesList);

      if (sessionsData) {
        setMySessionsData(sessionsData);
        const current = sessionsData.find(s => s.session_code === selectedSessionCode);
        if (current && current.tree_id) {
          setSelectedTreeId(current.tree_id);
        } else {
          setSelectedTreeId(null);
        }
      }
    };

    fetchSessionsMetadata();
  }, [sessionCodesList, selectedSessionCode]);

  // CHARGER TOUTES LES PRODUCTIONS DE L'ÉTUDIANT CONNECTÉ
  const fetchMyProductions = async (userId) => {
    const { data } = await supabase
      .from('productions')
      .select('*')
      .eq('student_id', userId);
    if (data) setMyProductions(data);
  };

  // 3. CHARGEMENT DE TOUTES LES PRODUCTIONS VALIDÉES DE LA SESSION POUR LE CALCUL COLLABORATIF ET L'ANALYSE DU FLUX DE TRACE DES CO-ÉQUIPIERS
  useEffect(() => {
    if (!selectedSessionCode) return;

    const fetchGlobalSessionData = async () => {
      // Récupérer toutes les productions validées de cette session spécifique
      const { data: prods } = await supabase
        .from('productions')
        .select('*')
        .eq('session_code', selectedSessionCode)
        .eq('is_validated', true);

      if (prods) setAllValidatedProds(prods);

      // Récupérer la liste des étudiants ayant rejoint cette même session
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, name, joined_sessions');

      if (profiles) {
        const filtered = profiles.filter(p => 
          Array.isArray(p.joined_sessions) && p.joined_sessions.includes(selectedSessionCode)
        );
        setAllStudentsInSession(filtered);
      }
    };

    fetchGlobalSessionData();
    
    // Mettre en place un abonnement temps réel pour synchroniser les validations d'équipes instantanément
    const channel = supabase
      .channel(`session-realtime-${selectedSessionCode}`)
      .on('postgres_changes', { event: '*', scheme: 'public', table: 'productions' }, () => {
        fetchGlobalSessionData();
        if (user) fetchMyProductions(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSessionCode, user]);

  // 4. ALGORITHME DE CALCUL DES ÉTAGES DÉVERROUILLÉS (FLUX DE PROGRESSION CONTINU)
  useEffect(() => {
    if (!selectedTreeId || !trees || !trees[selectedTreeId]) {
      setUnlockedFloorsObj({});
      return;
    }

    const currentTree = trees[selectedTreeId];
    const floors = currentTree.floors || [];
    const unlockedMap = {};

    // Le Palier 1 est toujours ouvert par défaut pour démarrer le parcours
    if (floors.length > 0) {
      const sortedFloors = [...floors].sort((a, b) => (a.floorId || 0) - (b.floorId || 0));
      if (sortedFloors[0]) {
        unlockedMap[sortedFloors[0].floorId] = true;
      }

      // Pour chaque palier supérieur, on vérifie si le palier précédent a été entièrement validé
      for (let i = 1; i < sortedFloors.length; i++) {
        const previousFloor = sortedFloors[i - 1];
        const currentFloor = sortedFloors[i];

        // Regarder les quêtes requises du palier précédent
        const requiredQuestIds = previousFloor.quests || [];
        
        let isPreviousFloorFullyCompleted = false;

        if (previousFloor.mode === 'random') {
          // Mode Aléatoire : Il suffit d'avoir validé le nombre requis de quêtes ('count') parmi celles du pool du palier
          const targetCount = previousFloor.count || 1;
          const validatedInPoolCount = requiredQuestIds.filter(qId => isQuestValidatedByMe(qId)).length;
          isPreviousFloorFullyCompleted = validatedInPoolCount >= targetCount;
        } else {
          // Mode Statique : Toutes les quêtes rattachées au palier doivent être individuellement accomplies
          isPreviousFloorFullyCompleted = requiredQuestIds.length > 0 && requiredQuestIds.every(qId => isQuestValidatedByMe(qId));
        }

        if (isPreviousFloorFullyCompleted && unlockedMap[previousFloor.floorId]) {
          unlockedMap[currentFloor.floorId] = true;
        }
      }
    }

    setUnlockedFloorsObj(unlockedMap);
  }, [selectedTreeId, trees, myProductions, allValidatedProds]);

  // FONCTION DE VÉRIFICATION INDIVIDUELLE : MA QUÊTE EST-ELLE VALIDÉE ET COMPTABILISÉE ?
  const isQuestValidatedByMe = (questId) => {
    const questMeta = (quests || []).find(q => q.id === questId);
    if (!questMeta) return false;

    // Si la quête est solo, on regarde simplement si ma propre production est validée
    if (!questMeta.is_collaborative) {
      return myProductions.some(p => p.quest_id === questId && p.is_validated === true);
    }

    // Si la quête est collaborative : elle est considérée validée si le nombre de personnes requises a rendu le même livrable (même hash ou même contenu textuel précis)
    const myProdForQuest = myProductions.find(p => p.quest_id === questId);
    if (!myProdForQuest) return false;

    // Si le manager l'a explicitement validée en direct
    if (myProdForQuest.is_validated === true) return true;

    // Sinon, calcul collaboratif automatique par redondance de traces cryptographiques ou textuelles
    const requiredThreshold = questMeta.required_partners || 2;
    
    const matchingProds = allValidatedProds.filter(p => {
      const targetQuestMatch = p.quest_id === questId;
      if (!targetQuestMatch) return false;

      // Si un hash de fichier est disponible, on compare la signature physique
      if (myProdForQuest.file_hash && p.file_hash) {
        return myProdForQuest.file_hash === p.file_hash;
      }
      // Sinon repli sur l'exactitude du texte soumis
      return String(myProdForQuest.content).trim() === String(p.content).trim();
    });

    return matchingProds.length >= requiredThreshold;
  };

  // OBTENIR LE NOMBRE ACTUEL DE SOUMISSIONS PARTAGÉES POUR UNE QUÊTE COLLABORATIVE
  const getCollaborativePartnersCount = (questId) => {
    const myProdForQuest = myProductions.find(p => p.quest_id === questId);
    if (!myProdForQuest) return 0;

    return allValidatedProds.filter(p => {
      if (p.quest_id !== questId) return false;
      if (myProdForQuest.file_hash && p.file_hash) {
        return myProdForQuest.file_hash === p.file_hash;
      }
      return String(myProdForQuest.content).trim() === String(p.content).trim();
    }).length;
  };

  // REJOINDRE UNE NOUVELLE SESSION PEDAGOGIQUE VIA LE CODE D'ACCÈS
  const handleJoinSession = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanCode = accessCode.trim().toUpperCase();
    if (!cleanCode) return;

    // 1. Vérifier la validité réelle du code de session dans la base
    const { data: sessionData, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, session_code')
      .eq('session_code', cleanCode)
      .single();

    if (sessionErr || !sessionData) {
      alert("⚠️ Code de session introuvable. Veuillez vérifier l'exactitude des caractères.");
      return;
    }

    if (sessionCodesList.includes(cleanCode)) {
      alert("💡 Vous êtes déjà enregistré au sein de cette session localisée.");
      return;
    }

    const updatedList = [...sessionCodesList, cleanCode];

    // 2. Mettre à jour le profil de l'élève
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ joined_sessions: updatedList })
      .eq('id', user.id);

    if (updateErr) {
      alert(`❌ Erreur d'inscription : ${updateErr.message}`);
    } else {
      setSessionCodesList(updatedList);
      setSelectedSessionCode(cleanCode);
      setAccessCode('');
      alert(`🎉 Félicitations ! Vous avez rejoint la session ${cleanCode} avec succès.`);
    }
  };

  // INTERFACE DE SOUMISSION DU TRAVAIL ÉLÈVE (SOUVENIR DE PRODUCTION AVEC SIGNATURE HASHLOCAL OPTIONNELLE)
  const handleUploadAndSubmitProduction = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!submissionText.trim() || !selectedQuest || submitting) return;

    setSubmitting(true);
    try {
      let fileUrl = null;
      let fileHash = null;

      // S'il y a un fichier joint, on procède au téléversement et au calcul de son empreinte unique
      if (selectedFile) {
        // Calcul du hash local avant envoi pour l'Ultra-Bonus collaboratif
        try {
          fileHash = await calculateFileHash(selectedFile);
        } catch (hashErr) {
          console.error("Erreur lors du calcul du hash du fichier :", hashErr);
        }

        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `livrables/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
          
        if (publicUrlData) fileUrl = publicUrlData.publicUrl;
      }

      const calculatedPts = Number(selectedQuest.difficulty) === 3 ? 100 : Number(selectedQuest.difficulty) === 2 ? 50 : 20;

      const payload = {
        student_id: user.id,
        student_email: user.email,
        session_code: selectedSessionCode,
        quest_id: selectedQuest.id,
        quest_name: selectedQuest.name,
        content: submissionText.trim(),
        points: calculatedPts,
        is_validated: !selectedQuest.is_collaborative, // Les quêtes solos s'auto-valident, les collaboratives attendent le nombre requis d'équipiers
        file_url: fileUrl,
        file_hash: fileHash,
        date: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };

      const { error: insertErr } = await supabase
        .from('productions')
        .insert([payload]);

      if (insertErr) throw insertErr;

      alert("🚀 Votre livrable a été correctement transmis dans le flux de traces de la session !");
      
      // Recharger les productions de l'étudiant
      await fetchMyProductions(user.id);
      
      // Reset des états du formulaire
      setSubmissionText('');
      setSelectedFile(null);
      setSelectedQuest(null);
    } catch (err) {
      alert(`❌ Échec de la transmission : ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // CALCULS DU SCORE GLOBAL XP DE L'ÉLÈVE
  const totalXPEarned = myProductions
    .filter(p => isQuestValidatedByMe(p.quest_id))
    .reduce((sum, p) => sum + (p.points || 0), 0);

  // FILTRAGE DU COMPTEUR DE QUÊTES DISPONIBLES ET COMPATIBLES
  const currentTreeObj = trees ? trees[selectedTreeId] : null;
  const activeFloorsArray = currentTreeObj ? (currentTreeObj.floors || []) : [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative">
      
      {/* SECTION BANDEAU : STATUT ET SÉLECTION DE LA SESSION ACTIVE */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Tableau de bord Apprenant</div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            🎖️ Compteur d'expérience : <span className="text-purple-600 bg-purple-50 border border-purple-100 px-3 py-0.5 rounded-lg font-mono">{totalXPEarned} XP</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold w-full md:w-auto">
          {sessionCodesList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 whitespace-nowrap">Session active :</span>
              <select 
                value={selectedSessionCode || ''} 
                onChange={(e) => setSelectedSessionCode(e.target.value)}
                className="bg-slate-50 border rounded-xl p-2.5 text-slate-800 focus:outline-none cursor-pointer"
              >
                {sessionCodesList.map(code => (
                  <option key={code} value={code}>Session {code}</option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleJoinSession} className="flex items-center gap-2 w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Saisir un code session..." 
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="bg-slate-100 text-slate-800 border rounded-xl p-2.5 font-mono uppercase tracking-wider text-center w-full sm:w-44 focus:outline-none focus:border-purple-500"
            />
            <button type="submit" className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2.5 rounded-xl transition-all shrink-0">Rejoindre ➔</button>
          </form>
        </div>
      </div>

      {/* SÉLECTEUR D'ONGLETS DU DASHBOARD */}
      <div className="flex gap-2 border-b pb-1 text-xs font-bold">
        <button 
          onClick={() => setActiveTab('parcours')} 
          className={`pb-2.5 px-4 border-b-2 transition-all ${activeTab === 'parcours' ? 'border-purple-600 text-purple-900 font-black' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          🌳 Mon Parcours d'Arbre
        </button>
        <button 
          onClick={() => setActiveTab('historique')} 
          className={`pb-2.5 px-4 border-b-2 transition-all ${activeTab === 'historique' ? 'border-purple-600 text-purple-900 font-black' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          📁 Mes Livrables transmis ({myProductions.length})
        </button>
      </div>

      {/* REPRÉSENTATION DU CONTENU SELON L'ONGLET ACTIF */}
      {activeTab === 'parcours' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE & CENTRE : VUE DE L'ARBRE INTELLIGENT */}
          <div className="lg:col-span-2 space-y-6">
            {activeFloorsArray.length === 0 ? (
              <div className="bg-white border p-12 rounded-2xl text-center text-slate-400 font-medium text-xs">
                🫙 Aucun Arbre pédagogique n'est encore associé à cette session. Mettez-vous en relation avec votre enseignant ou manager.
              </div>
            ) : (
              [...activeFloorsArray]
                .sort((a, b) => (b.floorId || 0) - (a.floorId || 0)) // Inversion visuelle pour l'effet de croissance (racine en bas, cime en haut)
                .map((floor) => {
                  const isFloorUnlocked = unlockedFloorsObj[floor.floorId] === true;
                  const floorQuestsIds = floor.quests || [];
                  const floorQuestsMeta = (quests || []).filter(q => floorQuestsIds.includes(q.id));

                  // Filtres optionnels sur le parcours
                  const filteredFloorQuests = floorQuestsMeta.filter(q => {
                    const matchesTheme = filterTheme === 'all' || q.theme === filterTheme;
                    const pts = Number(q.difficulty) === 3 ? 100 : Number(q.difficulty) === 2 ? 50 : 20;
                    const matchesPoints = filterPoints === 'all' || String(pts) === filterPoints;
                    return matchesTheme && matchesPoints;
                  });

                  return (
                    <div 
                      key={floor.floorId} 
                      className={`transition-all duration-300 rounded-2xl p-5 border ${
                        isFloorUnlocked 
                          ? 'bg-white border-slate-200 shadow-xs' 
                          : 'bg-slate-50/70 border-slate-200/50 opacity-60 pointer-events-none select-none'
                      }`}
                    >
                      <div className="flex flex-wrap justify-between items-center border-b pb-3 mb-4 gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`font-black text-xs px-3 py-1 rounded-lg text-white shadow-xs ${isFloorUnlocked ? 'bg-purple-700' : 'bg-slate-400'}`}>
                            ÉTAGE {floor.floorId}
                          </span>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Mode : {floor.mode === 'random' ? `🎲 Aléatoire (Piocher ${floor.count || 1} au choix)` : '📌 Statique (Tout valider)'}
                          </span>
                        </div>

                        {!isFloorUnlocked && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-black uppercase px-2 py-0.5 rounded-md">
                            🔒 Complétez l'étage inférieur pour débloquer
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredFloorQuests.map(q => {
                          const isAlreadyValidated = isQuestValidatedByMe(q.id);
                          const hasSubmitted = myProductions.some(p => p.quest_id === q.id);
                          const isBoss = Number(q.difficulty) === 3;
                          const isMiniBoss = Number(q.difficulty) === 2;
                          const xpReward = isBoss ? 100 : isMiniBoss ? 50 : 20;

                          return (
                            <div 
                              key={q.id} 
                              className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                                isAlreadyValidated 
                                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                                  : hasSubmitted 
                                    ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                                    : 'bg-slate-50 text-slate-800 border-slate-100 hover:border-slate-200'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center gap-2 text-[10px] font-black uppercase">
                                  <span className="opacity-75 tracking-wider">Axe {q.theme || 'Général'}</span>
                                  <span className="bg-white/70 border px-1.5 py-0.5 rounded">
                                    {isBoss ? '🔥 BOSS' : isMiniBoss ? '⚡ MINIBOSS' : '📄 STANDARD'}
                                  </span>
                                </div>

                                <h3 className="font-extrabold text-xs leading-snug flex items-center gap-1.5">
                                  {q.name} {q.is_collaborative && "🤝"}
                                </h3>
                                <p className="text-[11px] opacity-80 leading-relaxed font-medium line-clamp-3">
                                  "{q.desc}"
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200 mt-1">
                                <span className="font-mono text-xs font-bold text-purple-700">+{xpReward} XP</span>
                                
                                {isAlreadyValidated ? (
                                  <span className="text-[11px] font-black text-emerald-600 flex items-center gap-1">✅ Validée</span>
                                ) : hasSubmitted ? (
                                  <div className="text-right">
                                    <span className="text-[10px] font-black text-amber-600 block">⏳ En attente</span>
                                    {q.is_collaborative && (
                                      <span className="text-[9px] text-slate-400 font-medium">
                                        ({getCollaborativePartnersCount(q.id)}/{q.required_partners || 2} équipiers)
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      setSelectedQuest(q);
                                      setSubmissionText('');
                                      setSelectedFile(null);
                                    }}
                                    className="bg-white text-slate-700 border text-[11px] font-black px-3 py-1.5 rounded-lg hover:bg-purple-700 hover:text-white transition-all shadow-2xs cursor-pointer"
                                  >
                                    Transmettre mon travail
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* COLONNE DROITE : BARRE DE FILTRES ET ENCADRÉ CO-ÉQUIPIERS REJOINTS */}
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider border-b pb-2">🎯 Filtres du Parcours</h3>
              
              <div className="space-y-3 text-xs font-bold">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Thématique RSE</label>
                  <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2 cursor-pointer font-medium">
                    <option value="all">Toutes les thématiques</option>
                    <option value="social">🌱 Axe Social</option>
                    <option value="env">🌍 Axe Environnement</option>
                    <option value="tech">⚙️ Axe Technique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Valeur en points</label>
                  <select value={filterPoints} onChange={(e) => setFilterPoints(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2 cursor-pointer font-medium">
                    <option value="all">Tous les barèmes</option>
                    <option value="20">20 XP (Standard)</option>
                    <option value="50">50 XP (Miniboss)</option>
                    <option value="100">100 XP (Boss)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* LISTE DES COMPAGNONS DE ROUTE REJOINTS DANS CETTE SESSION */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider border-b pb-2 flex justify-between items-center">
                <span>👥 Équipiers en ligne</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">{allStudentsInSession.length}</span>
              </h3>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                {allStudentsInSession.map(student => (
                  <div key={student.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 font-medium">
                    <div className="truncate pr-2">
                      <div className="font-bold text-slate-800 truncate">{student.name || "Apprenant anonyme"}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{student.email}</div>
                    </div>
                    {student.id === user?.id && (
                      <span className="text-[9px] bg-purple-100 text-purple-700 font-black uppercase px-1.5 py-0.5 rounded-md shrink-0">Moi</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* HISTORIQUE COMPLET DES LIVRABLES DÉPOSÉS PAR L'ÉLÈVE */}
      {activeTab === 'historique' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b pb-2">📂 Registre de vos traces d'apprentissage</h2>
          
          {myProductions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium italic">Vous n'avez soumis aucun livrable textuel ou numérique pour le moment.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myProductions.map(p => {
                const originalQuest = (quests || []).find(q => q.id === p.quest_id);
                const isCurrentlyValidated = isQuestValidatedByMe(p.quest_id);
                const pts = p.points || 20;

                return (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3 text-xs relative">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 font-mono border-b pb-1.5 mb-2">
                        <span>SESSION : {p.session_code}</span>
                        <span>Dépôt le {p.date}</span>
                      </div>
                      
                      <h4 className="font-black text-slate-800 text-xs leading-snug">
                        🎯 Quête : {p.quest_name || "Nom inconnu"} {originalQuest?.is_collaborative && "🤝"}
                      </h4>
                      <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 mt-2 font-medium italic leading-relaxed">
                        "{p.content}"
                      </p>

                      {p.file_url && (
                        <div className="mt-2.5">
                          <a 
                            href={p.file_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg font-bold font-mono text-[10px] border border-purple-200/60 transition-all cursor-pointer"
                          >
                            📄 Pièce jointe téléversée ➔
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-dashed border-slate-200 text-[10px] font-black">
                      <span className={isCurrentlyValidated ? 'text-emerald-600' : 'text-amber-600'}>
                        {isCurrentlyValidated ? '✅ Statut : Confirmée' : '⏳ Statut : Attente validation / Équipiers'}
                      </span>
                      <span className={`font-mono text-xs ${isCurrentlyValidated ? 'text-purple-700' : 'text-slate-400'}`}>
                        {isCurrentlyValidated ? `+${pts} XP` : '0 / ' + pts + ' XP'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALE POUR TRANSMETTRE UN LIVRABLE / COMPTE-RENDU (OUVERTE SUR CLIC) */}
      {selectedQuest && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 shadow-2xl border border-slate-100 relative space-y-4 max-h-[90vh] overflow-y-auto">
            
            <button 
              type="button" 
              onClick={() => setSelectedQuest(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-sm focus:outline-none"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block">Soumission de livrable</span>
              <h3 className="text-md font-black text-slate-950 leading-snug">
                {selectedQuest.name} {selectedQuest.is_collaborative && "🤝"}
              </h3>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                "{selectedQuest.desc}"
              </p>
            </div>

            {selectedQuest.is_collaborative && (
              <div className="p-3 bg-purple-50 text-purple-950 rounded-xl border border-purple-200/60 text-xs font-medium leading-relaxed">
                📢 <span className="font-black uppercase text-purple-700">Mission Collaborative d'Équipe :</span> Pour déverrouiller et valider automatiquement cette quête sans intervention du manager, un seuil minimum de <strong>{selectedQuest.required_partners || 2} participants</strong> de votre session doit copier-coller exactement le même livrable textuel ou téléverser le même fichier physique. Accordez-vous bien avec vos équipiers !
              </div>
            )}

            <form onSubmit={handleUploadAndSubmitProduction} className="space-y-4 text-xs font-bold">
              <div className="space-y-1.5">
                <label className="block text-slate-700">Saisir votre compte-rendu textuel ou réponse :</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="Rédigez votre démonstration ou copiez le texte partagé avec votre équipe..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  className="w-full border rounded-xl p-3 bg-slate-50 text-slate-800 font-medium leading-relaxed focus:outline-none focus:bg-white focus:border-purple-500 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-700">Pièce jointe justificative (Facultatif) :</label>
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative hover:bg-slate-100/60 transition-all">
                  <input 
                    type="file" 
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-slate-400 font-medium">
                    {selectedFile ? (
                      <span className="text-purple-700 font-black">📄 Sélectionné : {selectedFile.name}</span>
                    ) : (
                      <span>📎 Déposer un fichier ou cliquer pour explorer</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedQuest(null)}
                  className="w-1/2 bg-slate-100 text-slate-700 py-2.5 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={submitting || !submissionText.trim()}
                  className="w-1/2 bg-purple-700 text-white py-2.5 rounded-xl hover:bg-purple-800 transition-all shadow-md font-black disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Téléversement en cours..." : "Valider et envoyer 🚀"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
