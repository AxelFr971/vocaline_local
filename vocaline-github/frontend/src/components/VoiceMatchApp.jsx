import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Mic, MicOff, Phone, PhoneOff, Users, Volume2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC_MOBILE_DEBUG';
import { usePersistentAudio } from '../hooks/usePersistentAudio';

const VoiceMatchApp = () => {
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [currentPartner, setCurrentPartner] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [status, setStatus] = useState('Déconnecté');
  const [connectionStats, setConnectionStats] = useState({ connected_users: 0, waiting_users: 0, active_rooms: 0 });
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showMicPermission, setShowMicPermission] = useState(false);

  // Utiliser l'URL actuelle pour le déploiement
  const { socket, isConnected } = useSocket(window.location.origin);
  
  // Hook pour gérer l'audio persistant
  const persistentAudio = usePersistentAudio();
  
  const { 
    localStream, 
    remoteStream, 
    isCallActive, 
    isMuted, 
    localAudioRef, 
    remoteAudioRef, 
    startCall, 
    endCall, 
    toggleMute,
    startRemoteAudio  // Nouvelle fonction pour mobile
  } = useWebRTC(socket, roomId, persistentAudio);

  // Vérifier les permissions microphone au chargement
  useEffect(() => {
    const checkInitialPermissions = async () => {
      // Si l'utilisateur a déjà accordé la permission précédemment
      if (persistentAudio.hasPreviousPermission()) {
        try {
          // Essayer de réinitialiser le stream audio
          await persistentAudio.checkMicrophonePermission();
          setShowMicPermission(false);
        } catch (error) {
          console.log('Impossible de réinitialiser automatiquement le microphone');
          setShowMicPermission(true);
        }
      } else if (!persistentAudio.hasPermission) {
        setShowMicPermission(true);
      }
    };

    checkInitialPermissions();
  }, [persistentAudio.hasPermission, persistentAudio.hasPreviousPermission]);

  const handleMicrophoneSetup = async () => {
    try {
      await persistentAudio.initializeAudioStream();
      setShowMicPermission(false);
    } catch (error) {
      console.error('Erreur lors de la configuration du microphone:', error);
      alert('Impossible d\'accéder au microphone. Veuillez vérifier vos paramètres de navigateur.');
    }
  };

  useEffect(() => {
    if (!socket) return;

    // Écouter les événements du matchmaking
    socket.on('connected', (data) => {
      console.log('Connecté avec succès:', data);
      setStatus('Connecté');
    });

    socket.on('waiting_for_match', (data) => {
      setStatus(data.status);
      setCurrentPartner(null);
      setRoomId(null);
    });

    socket.on('match_found', (data) => {
      console.log('Partenaire trouvé:', data);
      setCurrentPartner(data.partner);
      setRoomId(data.room_id);
      setStatus('Connecté avec ' + data.partner.username);
      
      // Démarrer l'appel vocal seulement si désigné comme initiateur
      // Cela évite les conflits de négociation WebRTC (glare condition)
      if (data.should_start_call) {
        console.log('Rôle WebRTC: Initiateur - Démarrage de l\'appel');
        setTimeout(() => {
          // CORRECTION CRITIQUE : Utiliser le stream audio stocké
          const audioStream = window.vocalineAudioStream;
          if (audioStream && audioStream.active) {
            console.log('🎤 Démarrage appel avec stream:', {
              streamId: audioStream.id,
              audioTracks: audioStream.getAudioTracks().length
            });
            startCall(audioStream);
          } else {
            console.error('❌ Aucun stream audio disponible pour l\'appel');
            alert('Erreur: Microphone non disponible. Veuillez vous reconnecter.');
          }
        }, 1000);
      } else {
        console.log('Rôle WebRTC: Récepteur - En attente de l\'offre');
      }
    });

    socket.on('partner_left', () => {
      setStatus('Votre partenaire a quitté la conversation');
      setCurrentPartner(null);
      setRoomId(null);
      endCall();
    });

    socket.on('partner_disconnected', () => {
      setStatus('Votre partenaire s\'est déconnecté');
      setCurrentPartner(null);
      setRoomId(null);
      endCall();
    });

    return () => {
      socket.off('connected');
      socket.off('waiting_for_match');
      socket.off('match_found');
      socket.off('partner_left');
      socket.off('partner_disconnected');
    };
  }, [socket, startCall, endCall]);

  // Récupérer les statistiques de connexion
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        setConnectionStats(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
      }
    };

    if (isConnected) {
      fetchStats();
      const interval = setInterval(fetchStats, 5000); // Mettre à jour toutes les 5 secondes
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const handleJoinMatchmaking = async () => {
    if (!username.trim()) {
      alert('Veuillez entrer un nom d\'utilisateur');
      return;
    }

    if (!socket) {
      alert('Connexion au serveur en cours...');
      return;
    }

    // CORRECTION CRITIQUE : S'assurer qu'on a un stream audio avant de rejoindre
    let audioStream = null;
    
    try {
      // Si pas de permission, l'obtenir
      if (!persistentAudio.hasPermission) {
        console.log('🎤 Initialisation du microphone...');
        audioStream = await persistentAudio.initializeAudioStream();
      } else {
        // Si permission existante, récupérer le stream
        console.log('🎤 Récupération du stream existant...');
        audioStream = await persistentAudio.getAudioStream();
      }
      
      // Vérifier que le stream est valide
      if (!audioStream || audioStream.getAudioTracks().length === 0) {
        throw new Error('Aucun track audio disponible');
      }
      
      console.log('✅ Stream audio prêt:', {
        streamId: audioStream.id,
        audioTracks: audioStream.getAudioTracks().length,
        active: audioStream.active
      });
      
    } catch (error) {
      console.error('❌ Erreur microphone:', error);
      alert('Impossible d\'accéder au microphone. Veuillez vérifier vos paramètres de navigateur et autoriser l\'accès au microphone.');
      return;
    }

    // Rejoindre le matchmaking seulement si on a un stream audio valide
    socket.emit('join_matchmaking', { username: username.trim() });
    setIsJoined(true);
    
    // Stocker le stream pour WebRTC
    window.vocalineAudioStream = audioStream;
    console.log('🚀 Matchmaking rejoint avec stream audio prêt');
  };

  const handleLeaveConversation = () => {
    if (socket) {
      socket.emit('leave_conversation');
    }
    endCall();
  };

  const handleDisconnect = () => {
    setIsJoined(false);
    setCurrentPartner(null);
    setRoomId(null);
    setStatus('Déconnecté');
    endCall();
    if (socket) {
      socket.disconnect();
    }
    // Ne pas forcer setIsConnected(false) car le hook useSocket gère déjà la reconnexion
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      alert('Veuillez entrer votre avis avant de soumettre');
      return;
    }

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedback.trim(),
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        setFeedback(''); // Réinitialiser le champ
        setFeedbackSubmitted(true);
        setTimeout(() => setFeedbackSubmitted(false), 3000); // Masquer le message après 3 secondes
      } else {
        alert('Erreur lors de l\'envoi de votre avis. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'avis:', error);
      alert('Erreur lors de l\'envoi de votre avis. Veuillez réessayer.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Vocaline</h1>
          <p className="text-gray-600">Connectez-vous par la voix avec d'autres chauffeurs routiers</p>
        </div>

        {/* Statistiques de connexion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Statistiques en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{connectionStats.connected_users}</div>
                <div className="text-sm text-gray-500">Utilisateurs connectés</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{connectionStats.waiting_users}</div>
                <div className="text-sm text-gray-500">En attente</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{connectionStats.active_rooms}</div>
                <div className="text-sm text-gray-500">Conversations actives</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration du microphone */}
        {showMicPermission && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                Configuration du microphone
              </CardTitle>
              <CardDescription className="text-orange-700">
                Pour utiliser Vocaline, nous avons besoin d'accéder à votre microphone. Cette autorisation sera mémorisée pour vos prochaines visites.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleMicrophoneSetup}
                disabled={persistentAudio.isInitializing}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <Mic className="h-4 w-4 mr-2" />
                {persistentAudio.isInitializing ? 'Configuration...' : 'Autoriser le microphone'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Statut du microphone */}
        {persistentAudio.hasPermission && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Microphone configuré</span>
                <Badge variant="secondary" className="ml-auto">
                  {persistentAudio.permissionStatus === 'granted' ? 'Autorisé' : 'En attente'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interface principale */}
        {!isJoined ? (
          <Card>
            <CardHeader>
              <CardTitle>Rejoindre Vocaline</CardTitle>
              <CardDescription>
                Entrez votre nom d'utilisateur pour commencer à rencontrer de nouvelles personnes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="text"
                placeholder="Votre nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinMatchmaking()}
              />
              <Button 
                onClick={handleJoinMatchmaking} 
                className="w-full"
                disabled={!isConnected || (!persistentAudio.hasPermission && !persistentAudio.hasPreviousPermission())}
              >
                {(!persistentAudio.hasPermission && !persistentAudio.hasPreviousPermission()) ? 'Configurez d\'abord le microphone' : 
                 !isConnected ? 'Connexion...' : 'Rejoindre le matchmaking'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Conversation vocale</span>
                <Badge variant={isConnected ? 'default' : 'destructive'}>
                  {isConnected ? 'Connecté' : 'Déconnecté'}
                </Badge>
              </CardTitle>
              <CardDescription>{status}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations sur le partenaire */}
              {currentPartner && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-900">
                    En conversation avec: {currentPartner.username}
                  </div>
                  {isCallActive && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Volume2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Appel vocal actif</span>
                    </div>
                  )}
                </div>
              )}

              {/* Contrôles audio */}
              {isCallActive && (
                <div className="flex justify-center gap-4 flex-wrap">
                  <Button
                    variant={isMuted ? 'destructive' : 'outline'}
                    size="lg"
                    onClick={toggleMute}
                    className="flex items-center gap-2"
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    {isMuted ? 'Réactiver le micro' : 'Couper le micro'}
                  </Button>
                  
                  {/* Bouton pour démarrer l'audio manuellement (utile sur mobile) */}
                  {remoteStream && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={startRemoteAudio}
                      className="flex items-center gap-2"
                    >
                      <Volume2 className="h-5 w-5" />
                      <span className="hidden sm:inline">Démarrer l'audio</span>
                      <span className="inline sm:hidden">Audio</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {currentPartner ? (
                  <Button 
                    onClick={handleLeaveConversation}
                    variant="outline"
                    className="flex-1 text-sm px-2 py-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Trouver un autre partenaire</span>
                    <span className="inline sm:hidden">Autre partenaire</span>
                  </Button>
                ) : null}
                
                <Button 
                  onClick={handleDisconnect}
                  variant="destructive"
                  className="flex-1 text-sm px-2 py-2"
                >
                  <span className="hidden sm:inline">Se déconnecter</span>
                  <span className="inline sm:hidden">Déconnexion</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section d'avis utilisateurs */}
        <Card>
          <CardHeader>
            <CardTitle>Votre avis nous intéresse</CardTitle>
            <CardDescription>
              Partagez votre expérience avec Vocaline pour nous aider à améliorer l'application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <textarea
                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Écrivez votre avis ici..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={500}
              />
              <div className="text-sm text-gray-500 text-right">
                {feedback.length}/500 caractères
              </div>
            </div>
            
            {feedbackSubmitted && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">
                  ✓ Merci pour votre avis ! Il a été envoyé avec succès.
                </p>
              </div>
            )}
            
            <Button 
              onClick={handleFeedbackSubmit}
              className="w-full"
              disabled={!feedback.trim() || feedbackSubmitted}
            >
              {feedbackSubmitted ? 'Avis envoyé !' : 'Envoyer mon avis'}
            </Button>
          </CardContent>
        </Card>

        {/* Éléments audio cachés */}
        <audio ref={localAudioRef} muted autoPlay />
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  );
};

export default VoiceMatchApp;

