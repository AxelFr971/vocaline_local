import { useState, useRef, useEffect } from 'react';

export const useWebRTC = (socket, localStream) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [needsManualStart, setNeedsManualStart] = useState(false);
  const peerConnection = useRef(null);
  const remoteAudioRef = useRef(null);

  // SOLUTION RADICALE : Fonction de démarrage audio manuel avec logs forcés
  const startRemoteAudio = async () => {
    console.log('🔊 AUDIO MOBILE RADICAL: Démarrage manuel demandé');
    
    try {
      // Activer l'AudioContext si nécessaire (requis sur mobile)
      if (window.AudioContext || window.webkitAudioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!window.audioContext) {
          window.audioContext = new AudioContext();
        }
        
        if (window.audioContext.state === 'suspended') {
          await window.audioContext.resume();
          console.log('🔊 AUDIO MOBILE RADICAL: AudioContext activé');
        }
      }
      
      // Démarrer la lecture audio
      if (remoteAudioRef.current) {
        await remoteAudioRef.current.play();
        console.log('🔊 AUDIO MOBILE RADICAL: Audio démarré manuellement avec succès');
        
        // Log forcé de succès
        socket.emit('webrtc_audio_state', {
          enabled: true,
          type: 'remote_manual_start',
          success: true,
          timestamp: new Date().toISOString(),
          debug: 'RADICAL_MANUAL_SUCCESS'
        });
        
        setNeedsManualStart(false);
      }
    } catch (error) {
      console.error('🔊 AUDIO MOBILE RADICAL: Échec démarrage manuel:', error);
      
      // Log forcé d'erreur
      socket.emit('webrtc_error', {
        type: 'manual_audio_start_failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        debug: 'RADICAL_MANUAL_ERROR'
      });
    }
  };

  const startCall = async (partnerId) => {
    console.log('🔊 AUDIO MOBILE RADICAL: Démarrage appel avec', partnerId);
    
    try {
      // Créer la connexion peer
      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Ajouter le stream local
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, localStream);
        });
      }

      // Gérer le stream distant avec logs forcés
      peerConnection.current.ontrack = (event) => {
        console.log('🔊 AUDIO MOBILE RADICAL: Stream distant reçu');
        const [stream] = event.streams;
        setRemoteStream(stream);
        
        // Log forcé de réception
        socket.emit('webrtc_audio_state', {
          enabled: true,
          type: 'remote_received',
          timestamp: new Date().toISOString(),
          debug: 'RADICAL_STREAM_RECEIVED'
        });
      };

      // Gérer les candidats ICE
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            candidate: event.candidate,
            to: partnerId
          });
        }
      };

      // Créer et envoyer l'offre
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      socket.emit('webrtc_offer', {
        offer: offer,
        to: partnerId
      });

      setIsCallActive(true);
      console.log('🔊 AUDIO MOBILE RADICAL: Appel initié avec succès');
      
    } catch (error) {
      console.error('🔊 AUDIO MOBILE RADICAL: Erreur lors du démarrage:', error);
      
      socket.emit('webrtc_error', {
        type: 'call_start_failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        debug: 'RADICAL_START_ERROR'
      });
    }
  };

  // SOLUTION RADICALE : Gestion automatique de l'audio avec logs forcés
  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      console.log('🔊 AUDIO MOBILE RADICAL: Configuration audio distant');
      remoteAudioRef.current.srcObject = remoteStream;
      
      // Tentative de lecture automatique avec logs forcés
      const attemptAutoplay = async () => {
        try {
          console.log('🔊 AUDIO MOBILE RADICAL: Tentative autoplay');
          await remoteAudioRef.current.play();
          console.log('🔊 AUDIO MOBILE RADICAL: Autoplay réussi');
          
          socket.emit('webrtc_audio_state', {
            enabled: true,
            type: 'remote_playing',
            autoplay: true,
            timestamp: new Date().toISOString(),
            debug: 'RADICAL_AUTOPLAY_SUCCESS'
          });
          
        } catch (error) {
          console.error('🔊 AUDIO MOBILE RADICAL: Autoplay bloqué:', error);
          
          socket.emit('webrtc_audio_state', {
            enabled: false,
            type: 'autoplay_blocked',
            error: error.message,
            timestamp: new Date().toISOString(),
            debug: 'RADICAL_AUTOPLAY_BLOCKED'
          });
          
          // Activer le bouton de démarrage manuel
          setNeedsManualStart(true);
          console.log('🔊 AUDIO MOBILE RADICAL: Bouton manuel activé');
        }
      };
      
      // Délai pour s'assurer que l'élément audio est prêt
      setTimeout(attemptAutoplay, 200);
    }
  }, [remoteStream, socket]);

  const handleReceiveOffer = async (data) => {
    console.log('🔊 AUDIO MOBILE RADICAL: Offre reçue');
    
    try {
      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Ajouter le stream local
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, localStream);
        });
      }

      // Gérer le stream distant
      peerConnection.current.ontrack = (event) => {
        console.log('🔊 AUDIO MOBILE RADICAL: Stream distant reçu (réponse)');
        const [stream] = event.streams;
        setRemoteStream(stream);
        
        socket.emit('webrtc_audio_state', {
          enabled: true,
          type: 'remote_received',
          timestamp: new Date().toISOString(),
          debug: 'RADICAL_STREAM_RECEIVED_ANSWER'
        });
      };

      // Gérer les candidats ICE
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            candidate: event.candidate,
            to: data.from
          });
        }
      };

      // Définir la description distante et créer la réponse
      await peerConnection.current.setRemoteDescription(data.offer);
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit('webrtc_answer', {
        answer: answer,
        to: data.from
      });

      setIsCallActive(true);
      console.log('🔊 AUDIO MOBILE RADICAL: Réponse envoyée avec succès');
      
    } catch (error) {
      console.error('🔊 AUDIO MOBILE RADICAL: Erreur lors de la réponse:', error);
      
      socket.emit('webrtc_error', {
        type: 'answer_failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        debug: 'RADICAL_ANSWER_ERROR'
      });
    }
  };

  const handleReceiveAnswer = async (data) => {
    console.log('🔊 AUDIO MOBILE RADICAL: Réponse reçue');
    
    try {
      await peerConnection.current.setRemoteDescription(data.answer);
      console.log('🔊 AUDIO MOBILE RADICAL: Description distante définie');
    } catch (error) {
      console.error('🔊 AUDIO MOBILE RADICAL: Erreur description distante:', error);
      
      socket.emit('webrtc_error', {
        type: 'remote_description_failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        debug: 'RADICAL_REMOTE_DESC_ERROR'
      });
    }
  };

  const handleReceiveIceCandidate = async (data) => {
    try {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(data.candidate);
      }
    } catch (error) {
      console.error('🔊 AUDIO MOBILE RADICAL: Erreur candidat ICE:', error);
    }
  };

  const endCall = () => {
    console.log('🔊 AUDIO MOBILE RADICAL: Fin d\'appel');
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    setRemoteStream(null);
    setIsCallActive(false);
    setNeedsManualStart(false);
  };

  // Écouter les événements WebRTC
  useEffect(() => {
    if (socket) {
      socket.on('webrtc_offer', handleReceiveOffer);
      socket.on('webrtc_answer', handleReceiveAnswer);
      socket.on('webrtc_ice_candidate', handleReceiveIceCandidate);

      return () => {
        socket.off('webrtc_offer', handleReceiveOffer);
        socket.off('webrtc_answer', handleReceiveAnswer);
        socket.off('webrtc_ice_candidate', handleReceiveIceCandidate);
      };
    }
  }, [socket, localStream]);

  return {
    remoteStream,
    isCallActive,
    needsManualStart,
    remoteAudioRef,
    startCall,
    endCall,
    startRemoteAudio
  };
};

