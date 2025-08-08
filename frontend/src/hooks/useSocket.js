import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (serverUrl) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const connectSocket = () => {
      const socketInstance = io(serverUrl, {
        transports: ['polling'], // Forcer le polling au lieu de WebSocket
        upgrade: false, // Désactiver l'upgrade vers WebSocket
        rememberUpgrade: false,
        forceNew: true // Forcer une nouvelle connexion
      });

      socketInstance.on('connect', () => {
        console.log('Connecté au serveur');
        setIsConnected(true);
        // Effacer le timeout de reconnexion si la connexion réussit
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      socketInstance.on('disconnect', () => {
        console.log('Déconnecté du serveur');
        setIsConnected(false);
        
        // Programmer une reconnexion automatique après 2 secondes
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Tentative de reconnexion...');
            connectSocket();
          }, 2000);
        }
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Erreur de connexion:', error);
        setIsConnected(false);
      });

      setSocket(socketInstance);
      return socketInstance;
    };

    const socketInstance = connectSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketInstance.disconnect();
    };
  }, [serverUrl]);

  return { socket, isConnected };
};

