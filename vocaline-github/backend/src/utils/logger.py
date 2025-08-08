import json
from datetime import datetime
from typing import Dict, List, Any
import threading

class VocalineLogger:
    def __init__(self):
        self.logs: List[Dict[str, Any]] = []
        self.lock = threading.Lock()
    
    def log(self, event_type: str, user_id: str = None, room_id: str = None, 
            message: str = "", data: Dict = None):
        """Ajouter un log avec timestamp et informations contextuelles"""
        with self.lock:
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'event_type': event_type,
                'user_id': user_id,
                'room_id': room_id,
                'message': message,
                'data': data or {}
            }
            self.logs.append(log_entry)
            
            # Garder seulement les 1000 derniers logs pour éviter la surcharge mémoire
            if len(self.logs) > 1000:
                self.logs = self.logs[-1000:]
    
    def get_logs(self, limit: int = None) -> List[Dict[str, Any]]:
        """Récupérer les logs, optionnellement limités"""
        with self.lock:
            if limit:
                return self.logs[-limit:]
            return self.logs.copy()
    
    def get_logs_by_type(self, event_type: str) -> List[Dict[str, Any]]:
        """Récupérer les logs filtrés par type d'événement"""
        with self.lock:
            return [log for log in self.logs if log['event_type'] == event_type]
    
    def get_logs_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Récupérer les logs filtrés par utilisateur"""
        with self.lock:
            return [log for log in self.logs if log['user_id'] == user_id]
    
    def clear_logs(self):
        """Vider tous les logs"""
        with self.lock:
            self.logs.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Obtenir des statistiques sur les logs"""
        with self.lock:
            event_counts = {}
            for log in self.logs:
                event_type = log['event_type']
                event_counts[event_type] = event_counts.get(event_type, 0) + 1
            
            return {
                'total_logs': len(self.logs),
                'event_counts': event_counts,
                'oldest_log': self.logs[0]['timestamp'] if self.logs else None,
                'newest_log': self.logs[-1]['timestamp'] if self.logs else None
            }

# Instance globale du logger
vocaline_logger = VocalineLogger()

