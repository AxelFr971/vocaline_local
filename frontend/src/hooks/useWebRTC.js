import { useEffect, useRef, useState } from 'react';

export const useWebRTC = (socket, roomId, persistentAudio) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const peerConnection = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const currentLocalStream = useRef(null);

  // Configuration des serveurs STUN/TURN
  const pcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (!socket || !roomId) return;

    // Initialiser la connexion peer-to-peer
    peerConnection.current = new RTCPeerConnection(pcConfig);

    // Gérer les candidats ICE
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Candidat ICE généré:', event.candidate.type);
        socket.emit('webrtc_ice_candidate', {
          candidate: event.candidate,
          room_id: roomId
        });
      }
    };

    // Gérer les changements d'état de connexion
    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current.connectionState;
      console.log('État de connexion WebRTC:', state);
      
      // Envoyer l'état au serveur pour logging
      socket.emit('webrtc_connection_state', {
        state: state,
        timestamp: new Date().toISOString()
      });
      
      if (state === 'connected') {
        setIsCallActive(true);
      } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        setIsCallActive(false);
        console.error('Connexion WebRTC échouée ou fermée:', state);
      }
    };

    // Gérer les changements d'état ICE
    peerConnection.current.oniceconnectionstatechange = () => {
      const iceState = peerConnection.current.iceConnectionState;
      console.log('État de connexion ICE:', iceState);
      
      if (iceState === 'failed' || iceState === 'disconnected') {
        console.error('Connexion ICE échouée:', iceState);
        socket.emit('webrtc_error', {
          type: 'ice_connection_failed',
          message: `État ICE: ${iceState}`
        });
      }
    };

    // Gérer le stream distant
    peerConnection.current.ontrack = (event) => {
      console.log('Stream distant reçu');
      setRemoteStream(event.streams[0]);
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        
        // Gestion spécifique mobile pour l'autoplay
        const playAudio = async () => {
          try {
            // Tenter de jouer l'audio automatiquement
            await remoteAudioRef.current.play();
            console.log('Audio distant démarré automatiquement');
            
            socket.emit('webrtc_audio_state', {
              enabled: true,
              type: 'remote_playing',
              autoplay: true
            });
          } catch (error) {
            console.warn('Autoplay bloqué, interaction utilisateur requise:', error);
            
            // Sur mobile, l'autoplay peut être bloqué
            socket.emit('webrtc_audio_state', {
              enabled: false,
              type: 'autoplay_blocked',
              error: error.message
            });
            
            // Marquer que l'interaction utilisateur est nécessaire
            setIsCallActive(true); // L'interface montrera un bouton pour démarrer l'audio
          }
        };
        
        // Délai pour laisser le temps au stream de se stabiliser
        setTimeout(playAudio, 500);
      }
      
      // Notifier que l'audio est reçu
      socket.emit('webrtc_audio_state', {
        enabled: true,
        type: 'remote_received'
      });
    };

    // Écouter les événements WebRTC du socket
    socket.on('webrtc_offer', handleReceiveOffer);
    socket.on('webrtc_answer', handleReceiveAnswer);
    socket.on('webrtc_ice_candidate', handleReceiveIceCandidate);

    return () => {
      socket.off('webrtc_offer', handleReceiveOffer);
      socket.off('webrtc_answer', handleReceiveAnswer);
      socket.off('webrtc_ice_candidate', handleReceiveIceCandidate);
      
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, [socket, roomId]);

  const handleReceiveOffer = async (data) => {
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      socket.emit('webrtc_answer', {
        answer: answer,
        room_id: roomId
      });
    } catch (error) {
      console.error('Erreur lors de la réception de l\'offre:', error);
    }
  };

  const handleReceiveAnswer = async (data) => {
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('Erreur lors de la réception de la réponse:', error);
    }
  };

  const handleReceiveIceCandidate = async (data) => {
    try {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Erreur lors de l\'ajout du candidat ICE:', error);
    }
  };

  const startCall = async () => {
    try {
      console.log('Démarrage de l\'appel WebRTC...');
      
      // Utiliser le stream audio persistant au lieu de demander une nouvelle permission
      const stream = await persistentAudio.getAudioStream();
      console.log('Stream audio obtenu:', stream.id);
      
      // Créer un clone du stream pour cette connexion
      const clonedStream = stream.clone();
      currentLocalStream.current = clonedStream;
      setIsCallActive(true);
      setIsMuted(persistentAudio.isMuted());

      // Notifier le serveur que l'audio local est configuré
      socket.emit('webrtc_audio_state', {
        enabled: true,
        type: 'local_configured'
      });

      // Ajouter le stream à la connexion peer-to-peer
      clonedStream.getTracks().forEach(track => {
        console.log('Ajout du track audio:', track.kind, track.enabled);
        peerConnection.current.addTrack(track, clonedStream);
      });

      // Créer et envoyer l'offre
      console.log('Création de l\'offre WebRTC...');
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      console.log('Envoi de l\'offre WebRTC au serveur...');
      socket.emit('webrtc_offer', {
        offer: offer,
        room_id: roomId
      });

      console.log('Appel démarré avec stream persistant');
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'appel:', error);
      setIsCallActive(false);
      
      // Notifier le serveur de l'erreur
      socket.emit('webrtc_error', {
        type: 'start_call_failed',
        message: error.message || 'Erreur inconnue lors du démarrage de l\'appel'
      });
    }
  };

  const endCall = () => {
    // Arrêter seulement le clone du stream, pas le stream principal
    if (currentLocalStream.current) {
      currentLocalStream.current.getTracks().forEach(track => track.stop());
      currentLocalStream.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = new RTCPeerConnection(pcConfig);
    }
    
    setRemoteStream(null);
    setIsCallActive(false);
  };

  const toggleMute = () => {
    const newMutedState = persistentAudio.toggleMute();
    setIsMuted(newMutedState);
    return newMutedState;
  };

  const startRemoteAudio = async () => {
    if (remoteAudioRef.current && remoteStream) {
      try {
        // Activer l'AudioContext si nécessaire (requis sur mobile)
        if (window.AudioContext || window.webkitAudioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!window.audioContext) {
            window.audioContext = new AudioContext();
          }
          
          if (window.audioContext.state === 'suspended') {
            await window.audioContext.resume();
            console.log('AudioContext activé pour mobile');
          }
        }
        
        // Démarrer la lecture audio
        await remoteAudioRef.current.play();
        console.log('Audio distant démarré manuellement');
        
        socket.emit('webrtc_audio_state', {
          enabled: true,
          type: 'remote_manual_start',
          success: true
        });
        
        return true;
      } catch (error) {
        console.error('Erreur lors du démarrage manuel de l\'audio:', error);
        
        socket.emit('webrtc_error', {
          type: 'manual_audio_start_failed',
          message: error.message
        });
        
        return false;
      }
    }
    return false;
  };

  // Synchroniser l'état muted avec le stream persistant
  useEffect(() => {
    if (persistentAudio) {
      setIsMuted(persistentAudio.isMuted());
    }
  }, [persistentAudio]);

  return {
    localStream: currentLocalStream.current,
    remoteStream,
    isCallActive,
    isMuted,
    localAudioRef,
    remoteAudioRef,
    startCall,
    endCall,
    toggleMute,
    startRemoteAudio  // Nouvelle fonction pour mobile
  };
};

