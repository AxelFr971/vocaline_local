from flask import Blueprint, request, jsonify
from datetime import datetime
import os
import json

feedback_bp = Blueprint('feedback', __name__)

# Chemin vers le fichier de stockage des avis
FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'feedback.json')

def ensure_feedback_directory():
    """S'assurer que le répertoire data existe"""
    data_dir = os.path.dirname(FEEDBACK_FILE)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

def load_feedback():
    """Charger les avis depuis le fichier JSON"""
    ensure_feedback_directory()
    if os.path.exists(FEEDBACK_FILE):
        try:
            with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []

def save_feedback(feedback_list):
    """Sauvegarder les avis dans le fichier JSON"""
    ensure_feedback_directory()
    try:
        with open(FEEDBACK_FILE, 'w', encoding='utf-8') as f:
            json.dump(feedback_list, f, ensure_ascii=False, indent=2)
        return True
    except IOError:
        return False

@feedback_bp.route('/feedback', methods=['POST'])
def submit_feedback():
    """Endpoint pour soumettre un avis utilisateur"""
    try:
        data = request.get_json()
        
        if not data or 'feedback' not in data:
            return jsonify({'error': 'Avis manquant'}), 400
        
        feedback_text = data['feedback'].strip()
        if not feedback_text:
            return jsonify({'error': 'L\'avis ne peut pas être vide'}), 400
        
        if len(feedback_text) > 500:
            return jsonify({'error': 'L\'avis ne peut pas dépasser 500 caractères'}), 400
        
        # Créer l'objet avis
        feedback_entry = {
            'id': datetime.now().isoformat(),
            'feedback': feedback_text,
            'timestamp': data.get('timestamp', datetime.now().isoformat()),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', '')
        }
        
        # Charger les avis existants
        feedback_list = load_feedback()
        
        # Ajouter le nouvel avis
        feedback_list.append(feedback_entry)
        
        # Sauvegarder
        if save_feedback(feedback_list):
            return jsonify({
                'success': True,
                'message': 'Avis enregistré avec succès',
                'id': feedback_entry['id']
            }), 200
        else:
            return jsonify({'error': 'Erreur lors de la sauvegarde'}), 500            
    except Exception as e:
        print(f"Erreur lors de la soumission d'avis: {e}")
        return jsonify({'error': 'Erreur interne du serveur'}), 500

@feedback_bp.route('/feedback', methods=['GET'])
def get_feedback():
    """Endpoint pour récupérer tous les avis (pour l'administration)"""
    try:
        feedback_list = load_feedback()
        return jsonify({
            'success': True,
            'feedback': feedback_list,
            'count': len(feedback_list)
        }), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des avis: {e}")
        return jsonify({'error': 'Erreur interne du serveur'}), 500

@feedback_bp.route('/feedback/stats', methods=['GET'])
def get_feedback_stats():
    """Endpoint pour récupérer les statistiques des avis"""
    try:
        feedback_list = load_feedback()
        
             # Calculer les statistiques
        total_feedback = len(feedback_list)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_feedback': total_feedback
            }
        }), 200
    except Exception as e:
        print(f"Erreur lors de la récupération des statistiques: {e}")
        return jsonify({'error': 'Erreur interne du serveur'}), 500

