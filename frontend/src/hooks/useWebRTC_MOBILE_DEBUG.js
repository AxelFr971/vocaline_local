import { useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';

export const useWebRTC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  
  const peerConnection = useRef(null);
  const { socket } = useSocket();
  
  // 📱 LOGS MOBILES RENFORCÉS
  const logMobileDebug = useCallback((message, data = {}) => {
    const timestamp = new Date().toISOString();
    const userAgent = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    console.log(`📱 MOBILE DEBUG [${timestamp}]: ${message}`, {
      ...data,
      isMobile,
      userAgent: userAgent.substring(0, 100),
      connection: navigator.connection?.effectiveType || 'unknown',
      online: navigator.onLine
    });
    
    // Envoyer au serveur pour logs
    if (socket) {
      socket.emit('mobile_debug', {
        type: 'mobile_debug',
        message,
        data: {
          ...data,
          isMobile,
          userAgent,
          connection: navigator.connection?.effectiveType || 'unknown',
          online: navigator.onLine,
          timestamp
        }
      });
    }
  }, [socket]);

  // Configuration WebRTC avec logs renforcés
  const createPeerConnection = useCallback(() => {
    logMobileDebug('Création PeerConnection', { state: 'initializing' });
    
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const pc = new RTCPeerConnection(configuration);
    
    // Logs d'état de connexion
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      logMobileDebug(`État connexion WebRTC: ${state}`, { connectionState: state });
      setConnectionState(state);
      
      if (socket) {
        socket.emit('webrtc_state', {
          type: 'connection_state',
          state,
          debug: `MOBILE_CONNECTION_${state.toUpperCase()}`
        });
      }
    };
    
    // Logs ICE
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      logMobileDebug(`État ICE: ${iceState}`, { iceConnectionState: iceState });
      
      if (socket) {
        socket.emit('webrtc_state', {
          type: 'ice_state',
          state: iceState,
          debug: `MOBILE_ICE_${iceState.toUpperCase()}`
        });
      }
    };
    
    // Candidats ICE avec logs
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        logMobileDebug('Candidat ICE généré', { 
          candidate: event.candidate.candidate.substring(0, 50) + '...',
          type: event.candidate.type
        });
        
        if (socket) {
          socket.emit('ice-candidate', event.candidate);
          socket.emit('webrtc_ice', {
            type: 'ice_candidate_sent',
            candidateType: event.candidate.type,
            debug: 'MOBILE_ICE_CANDIDATE_SENT'
          });
        }
      } else {
        logMobileDebug('Fin des candidats ICE');
      }
    };
    
    // Stream distant avec logs renforcés
    pc.ontrack = (event) => {
      logMobileDebug('Stream distant reçu', { 
        streamId: event.streams[0]?.id,
        trackCount: event.streams[0]?.getTracks().length,
        audioTracks: event.streams[0]?.getAudioTracks().length
      });
      
      const stream = event.streams[0];
      setRemoteStream(stream);
      
      // Logs audio spécifiques
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        logMobileDebug('Track audio détecté', {
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          readyState: audioTrack.readyState,
          settings: audioTrack.getSettings()
        });
        
        // Tentative de lecture automatique avec logs
        const audio = new Audio();
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.playsInline = true;
        
        audio.play().then(() => {
          logMobileDebug('Autoplay réussi', { success: true });
          
          if (socket) {
            socket.emit('webrtc_audio_state', {
              type: 'autoplay_success',
              enabled: true,
              debug: 'MOBILE_AUTOPLAY_SUCCESS'
            });
          }
        }).catch((error) => {
          logMobileDebug('Autoplay bloqué', { 
            error: error.message,
            name: error.name
          });
          
          if (socket) {
            socket.emit('webrtc_audio_state', {
              type: 'autoplay_blocked',
              enabled: false,
              error: error.message,
              debug: 'MOBILE_AUTOPLAY_BLOCKED'
            });
          }
        });
      }
      
      if (socket) {
        socket.emit('webrtc_audio_state', {
          type: 'remote_received',
          enabled: true,
          streamId: stream.id,
          audioTracks: audioTracks.length,
          debug: 'MOBILE_STREAM_RECEIVED'
        });
      }
    };
    
    return pc;
  }, [socket, logMobileDebug]);

  // Démarrage d'appel avec logs mobiles
  const startCall = useCallback(async (stream) => {
    logMobileDebug('Démarrage appel WebRTC', { hasStream: !!stream });
    
    try {
      if (!peerConnection.current) {
        peerConnection.current = createPeerConnection();
      }
      
      const pc = peerConnection.current;
      
      // Ajout du stream local avec logs
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        logMobileDebug('Ajout stream local', {
          streamId: stream.id,
          audioTracks: audioTracks.length,
          trackSettings: audioTracks[0]?.getSettings()
        });
        
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
        setLocalStream(stream);
      }
      
      // Création offre avec logs
      logMobileDebug('Création offre WebRTC');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      logMobileDebug('Offre créée', { 
        type: offer.type,
        sdpLength: offer.sdp.length
      });
      
      await pc.setLocalDescription(offer);
      logMobileDebug('Description locale définie');
      
      if (socket) {
        socket.emit('offer', offer);
        socket.emit('webrtc_offer', {
          type: 'offer_sent',
          offerType: offer.type,
          debug: 'MOBILE_OFFER_SENT'
        });
      }
      
      setIsConnected(true);
      
    } catch (error) {
      logMobileDebug('Erreur démarrage appel', {
        error: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200)
      });
      
      if (socket) {
        socket.emit('webrtc_error', {
          type: 'start_call_error',
          error: error.message,
          debug: 'MOBILE_START_CALL_ERROR'
        });
      }
    }
  }, [createPeerConnection, socket, logMobileDebug]);

  // Fonction pour démarrer manuellement l'audio (mobile)
  const startRemoteAudio = useCallback(async () => {
    logMobileDebug('Démarrage manuel audio distant');
    
    if (remoteStream) {
      try {
        // Activation AudioContext pour mobile
        if (window.AudioContext || window.webkitAudioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioContext();
          
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            logMobileDebug('AudioContext activé', { state: audioContext.state });
          }
        }
        
        // Lecture forcée
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.playsInline = true;
        
        await audio.play();
        
        logMobileDebug('Audio distant démarré manuellement', { success: true });
        
        if (socket) {
          socket.emit('webrtc_audio_state', {
            type: 'remote_manual_start',
            enabled: true,
            debug: 'MOBILE_MANUAL_SUCCESS'
          });
        }
        
        return true;
      } catch (error) {
        logMobileDebug('Erreur démarrage manuel audio', {
          error: error.message,
          name: error.name
        });
        
        if (socket) {
          socket.emit('webrtc_audio_state', {
            type: 'remote_manual_error',
            enabled: false,
            error: error.message,
            debug: 'MOBILE_MANUAL_ERROR'
          });
        }
        
        return false;
      }
    }
    
    return false;
  }, [remoteStream, socket, logMobileDebug]);

  // Gestion des événements socket avec logs
  useEffect(() => {
    if (!socket) return;
    
    const handleOffer = async (offer) => {
      logMobileDebug('Offre reçue', { type: offer.type });
      
      try {
        if (!peerConnection.current) {
          peerConnection.current = createPeerConnection();
        }
        
        const pc = peerConnection.current;
        
        // CORRECTION CRITIQUE : Le récepteur doit aussi ajouter son stream audio
        const audioStream = window.vocalineAudioStream;
        if (audioStream && audioStream.active) {
          logMobileDebug('Ajout stream local (récepteur)', {
            streamId: audioStream.id,
            audioTracks: audioStream.getAudioTracks().length
          });
          
          audioStream.getTracks().forEach(track => {
            pc.addTrack(track, audioStream);
          });
          setLocalStream(audioStream);
        } else {
          logMobileDebug('ERREUR: Aucun stream audio pour le récepteur', { 
            hasGlobalStream: !!window.vocalineAudioStream 
          });
        }
        
        await pc.setRemoteDescription(offer);
        
        logMobileDebug('Description distante définie');
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        logMobileDebug('Réponse créée et définie', { type: answer.type });
        
        socket.emit('answer', answer);
        socket.emit('webrtc_answer', {
          type: 'answer_sent',
          answerType: answer.type,
          debug: 'MOBILE_ANSWER_SENT'
        });
        
      } catch (error) {
        logMobileDebug('Erreur traitement offre', {
          error: error.message,
          name: error.name
        });
        
        socket.emit('webrtc_error', {
          type: 'offer_handling_error',
          error: error.message,
          debug: 'MOBILE_OFFER_ERROR'
        });
      }
    };
    
    const handleAnswer = async (answer) => {
      logMobileDebug('Réponse reçue', { type: answer.type });
      
      try {
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(answer);
          logMobileDebug('Réponse appliquée avec succès');
          
          socket.emit('webrtc_answer', {
            type: 'answer_received',
            answerType: answer.type,
            debug: 'MOBILE_ANSWER_RECEIVED'
          });
        }
      } catch (error) {
        logMobileDebug('Erreur traitement réponse', {
          error: error.message,
          name: error.name
        });
        
        socket.emit('webrtc_error', {
          type: 'answer_handling_error',
          error: error.message,
          debug: 'MOBILE_ANSWER_ERROR'
        });
      }
    };
    
    const handleIceCandidate = async (candidate) => {
      logMobileDebug('Candidat ICE reçu', { 
        type: candidate.type,
        candidate: candidate.candidate?.substring(0, 50) + '...'
      });
      
      try {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(candidate);
          logMobileDebug('Candidat ICE ajouté');
          
          socket.emit('webrtc_ice', {
            type: 'ice_candidate_received',
            candidateType: candidate.type,
            debug: 'MOBILE_ICE_CANDIDATE_RECEIVED'
          });
        }
      } catch (error) {
        logMobileDebug('Erreur ajout candidat ICE', {
          error: error.message,
          name: error.name
        });
      }
    };
    
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    
    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [socket, createPeerConnection, logMobileDebug]);

  // Nettoyage avec logs
  const cleanup = useCallback(() => {
    logMobileDebug('Nettoyage WebRTC');
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setRemoteStream(null);
    setIsConnected(false);
    setConnectionState('new');
  }, [localStream, logMobileDebug]);

  // Toggle mute avec logs
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        logMobileDebug('Mute togglé', { 
          muted: !audioTrack.enabled,
          trackEnabled: audioTrack.enabled
        });
        
        if (socket) {
          socket.emit('webrtc_audio_state', {
            type: 'mute_toggle',
            enabled: audioTrack.enabled,
            muted: !audioTrack.enabled,
            debug: 'MOBILE_MUTE_TOGGLE'
          });
        }
      }
    }
  }, [localStream, socket, logMobileDebug]);

  // Log initial au chargement
  useEffect(() => {
    logMobileDebug('Hook WebRTC initialisé', {
      hasSocket: !!socket,
      userAgent: navigator.userAgent.substring(0, 100)
    });
  }, [logMobileDebug, socket]);

  return {
    isConnected,
    remoteStream,
    localStream,
    isMuted,
    connectionState,
    startCall,
    startRemoteAudio,
    cleanup,
    toggleMute
  };
};

