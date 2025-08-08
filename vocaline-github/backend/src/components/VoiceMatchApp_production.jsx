import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Mic, MicOff, Phone, PhoneOff, Users, Volume2 } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';

const VoiceMatchApp = () => {
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [currentPartner, setCurrentPartner] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [status, setStatus] = useState('Déconnecté');
  const [connectionStats, setConnectionStats] = useState({ connected_users: 0, waiting_users: 0, active_rooms: 0 });

  // Utiliser l'URL actuelle pour le déploiement
  const { socket, isConnected } = useSocket(window.location.origin);
  const { 
    localStream, 
    remoteStream, 
    isCallActive, 
    isMuted, 
    localAudioRef, 
    remoteAudioRef, 
    startCall, 
    endCall, 
    toggleMute 
  } = useWebRTC(socket, roomId);

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
      
      // Démarrer automatiquement l'appel vocal
      setTimeout(() => {
        startCall();
      }, 1000);
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

  const handleJoinMatchmaking = () => {
    if (!username.trim()) {
      alert('Veuillez entrer un nom d\'utilisateur');
      return;
    }

    if (!socket) {
      alert('Connexion au serveur en cours...');
      return;
    }

    socket.emit('join_matchmaking', { username: username.trim() });
    setIsJoined(true);
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">VoiceMatch</h1>
          <p className="text-gray-600">Rencontrez de nouvelles personnes par la voix</p>
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

        {/* Interface principale */}
        {!isJoined ? (
          <Card>
            <CardHeader>
              <CardTitle>Rejoindre VoiceMatch</CardTitle>
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
                disabled={!isConnected}
              >
                {isConnected ? 'Rejoindre le matchmaking' : 'Connexion...'}
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
                <div className="flex justify-center gap-4">
                  <Button
                    variant={isMuted ? 'destructive' : 'outline'}
                    size="lg"
                    onClick={toggleMute}
                    className="flex items-center gap-2"
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    {isMuted ? 'Réactiver le micro' : 'Couper le micro'}
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {currentPartner ? (
                  <Button 
                    onClick={handleLeaveConversation}
                    variant="outline"
                    className="flex-1"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    Changer de partenaire
                  </Button>
                ) : null}
                
                <Button 
                  onClick={handleDisconnect}
                  variant="destructive"
                  className="flex-1"
                >
                  Se déconnecter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Éléments audio cachés */}
        <audio ref={localAudioRef} muted autoPlay />
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  );
};

export default VoiceMatchApp;

