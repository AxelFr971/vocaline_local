import { useState, useEffect, useRef } from 'react';

export const usePersistentAudio = () => {
  const [audioStream, setAudioStream] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'granted', 'denied', 'prompt'
  const [isInitializing, setIsInitializing] = useState(false);
  const streamRef = useRef(null);

  // Vérifier les permissions au chargement
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      // Vérifier si l'API Permissions est supportée
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        setPermissionStatus(permission.state);
        
        if (permission.state === 'granted') {
          setHasPermission(true);
          // Si on a déjà la permission, essayer de récupérer le stream
          await initializeAudioStream();
        }

        // Écouter les changements de permission
        permission.onchange = () => {
          setPermissionStatus(permission.state);
          if (permission.state === 'denied') {
            setHasPermission(false);
            stopAudioStream();
          }
        };
      }
    } catch (error) {
      console.log('Vérification des permissions non supportée:', error);
    }
  };

  const initializeAudioStream = async () => {
    if (streamRef.current && streamRef.current.active) {
      // Stream déjà actif, le réutiliser
      setAudioStream(streamRef.current);
      setHasPermission(true);
      return streamRef.current;
    }

    setIsInitializing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      streamRef.current = stream;
      setAudioStream(stream);
      setHasPermission(true);
      setPermissionStatus('granted');
      
      // Sauvegarder dans localStorage que l'utilisateur a accordé la permission
      localStorage.setItem('vocaline_mic_permission', 'granted');
      
      console.log('Stream audio initialisé avec succès');
      return stream;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du stream audio:', error);
      setHasPermission(false);
      setPermissionStatus('denied');
      localStorage.setItem('vocaline_mic_permission', 'denied');
      throw error;
    } finally {
      setIsInitializing(false);
    }
  };

  const getAudioStream = async () => {
    // Si on a déjà un stream actif, le retourner
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }

    // Sinon, initialiser un nouveau stream
    return await initializeAudioStream();
  };

  const stopAudioStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setAudioStream(null);
  };

  const cloneAudioStream = () => {
    if (!streamRef.current) return null;
    
    // Créer un clone du stream pour éviter les conflits
    return streamRef.current.clone();
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Retourne l'état muted
      }
    }
    return false;
  };

  const isMuted = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      return audioTrack ? !audioTrack.enabled : true;
    }
    return true;
  };

  // Vérifier si l'utilisateur a déjà accordé la permission précédemment
  const hasPreviousPermission = () => {
    return localStorage.getItem('vocaline_mic_permission') === 'granted';
  };

  return {
    audioStream,
    hasPermission,
    permissionStatus,
    isInitializing,
    initializeAudioStream,
    getAudioStream,
    stopAudioStream,
    cloneAudioStream,
    toggleMute,
    isMuted,
    hasPreviousPermission,
    checkMicrophonePermission
  };
};

