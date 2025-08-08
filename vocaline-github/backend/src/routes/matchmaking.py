from flask import Blueprint, request, jsonify
from flask_socketio import emit, join_room, leave_room, disconnect
from src.socketio_instance import get_socketio
from src.utils.logger import vocaline_logger
from src.utils.cleanup import cleanup_waiting_users, validate_user_states
import uuid
import random

matchmaking_bp = Blueprint('matchmaking', __name__)

# Stockage en mémoire des utilisateurs connectés et des paires
connected_users = {}  # {socket_id: {'user_id': str, 'username': str, 'room': str or None}}
waiting_users = []    # Liste des utilisateurs en attente de matchmaking
active_rooms = {}     # {room_id: {'user1': socket_id, 'user2': socket_id}}

def try_find_new_partner(user_socket_id):
    """Essaie de trouver immédiatement un nouveau partenaire pour un utilisateur"""
    socketio = get_socketio()
    
    # Nettoyer les utilisateurs déconnectés avant de chercher un partenaire
    cleanup_count = cleanup_waiting_users(waiting_users, connected_users)
    
    vocaline_logger.log('MATCHMAKING', user_socket_id, None, 
                       'Tentative de recherche d\'un nouveau partenaire', 
                       {'waiting_users_count': len(waiting_users), 
                        'connected_users_count': len(connected_users),
                        'cleaned_users': cleanup_count})
    
    if user_socket_id not in connected_users:
        vocaline_logger.log('ERROR', user_socket_id, None, 
                           'Utilisateur non trouvé dans connected_users')
        return
    
    # Chercher d'autres utilisateurs en attente (excluant l'utilisateur actuel)
    available_partners = []
    current_username = connected_users[user_socket_id]['username']
    
    for uid in waiting_users:
        if uid != user_socket_id and uid in connected_users:
            partner_username = connected_users[uid]['username']
            # Empêcher qu'un utilisateur se connecte à lui-même (même nom)
            if partner_username != current_username:
                available_partners.append(uid)
            else:
                vocaline_logger.log('SELF_MATCH_PREVENTED', user_socket_id, None, 
                                   f'Auto-connexion empêchée: {current_username} → {partner_username}')
    
    vocaline_logger.log('MATCHMAKING', user_socket_id, None, 
                       f'Partenaires disponibles trouvés: {len(available_partners)}',
                       {'available_partners': available_partners})
    
    if available_partners:
        # Prendre le premier partenaire disponible
        partner_socket_id = available_partners[0]
        
        # Suppression sécurisée des utilisateurs de la liste d'attente
        if partner_socket_id in waiting_users:
            waiting_users.remove(partner_socket_id)
            vocaline_logger.log('WAITING_REMOVE', partner_socket_id, None, 
                               'Partenaire retiré de waiting_users')
        else:
            vocaline_logger.log('WARNING', partner_socket_id, None, 
                               'Partenaire non trouvé dans waiting_users')
        
        if user_socket_id in waiting_users:
            waiting_users.remove(user_socket_id)
            vocaline_logger.log('WAITING_REMOVE', user_socket_id, None, 
                               'Utilisateur retiré de waiting_users')
        else:
            vocaline_logger.log('WARNING', user_socket_id, None, 
                               'Utilisateur non trouvé dans waiting_users')
        
        # Créer une nouvelle room
        room_id = str(uuid.uuid4())
        
        vocaline_logger.log('ROOM_CREATE', user_socket_id, room_id, 
                           f'Nouvelle room créée avec {partner_socket_id}',
                           {'partner_id': partner_socket_id,
                            'waiting_users_after': waiting_users.copy()})
        
        # Mettre à jour les données des utilisateurs
        connected_users[user_socket_id]['room'] = room_id
        connected_users[partner_socket_id]['room'] = room_id
        
        # Enregistrer la room active
        active_rooms[room_id] = {
            'user1': user_socket_id,
            'user2': partner_socket_id
        }
        
        # Faire rejoindre les deux utilisateurs à la room
        socketio.server.enter_room(user_socket_id, room_id)
        socketio.server.enter_room(partner_socket_id, room_id)
        
        # Notifier les deux utilisateurs qu'ils sont connectés
        partner_data = connected_users[partner_socket_id]
        user_data = connected_users[user_socket_id]
        
        # Désigner l'initiateur WebRTC : l'utilisateur qui cherche un nouveau partenaire initie
        # Cela évite les conflits de négociation WebRTC (glare condition)
        
        socketio.emit('match_found', {
            'room_id': room_id,
            'partner': {
                'username': partner_data['username'],
                'user_id': partner_data['user_id']
            },
            'webrtc_role': 'initiator',  # L'utilisateur qui cherche initie
            'should_start_call': True
        }, room=user_socket_id)
        
        socketio.emit('match_found', {
            'room_id': room_id,
            'partner': {
                'username': user_data['username'],
                'user_id': user_data['user_id']
            },
            'webrtc_role': 'receiver',   # Le partenaire en attente reçoit
            'should_start_call': False
        }, room=partner_socket_id)
        
        vocaline_logger.log('MATCH_SUCCESS', user_socket_id, room_id, 
                           f'Match réussi avec {partner_socket_id}',
                           {'partner_username': partner_data['username'],
                            'user_username': user_data['username'],
                            'initiator': user_socket_id, 'receiver': partner_socket_id})
    else:
        vocaline_logger.log('MATCHMAKING', user_socket_id, None, 
                           'Aucun partenaire disponible trouvé')

def register_socketio_events():
    socketio = get_socketio()
    
    @socketio.on('connect')
    def handle_connect():
        vocaline_logger.log('CONNECT', request.sid, None, 
                           f'Utilisateur connecté: {request.sid}')
        print(f'Utilisateur connecté: {request.sid}')
        emit('connected', {'status': 'success', 'socket_id': request.sid})

    @socketio.on('disconnect')
    def handle_disconnect():
        vocaline_logger.log('DISCONNECT', request.sid, None, 
                           f'Utilisateur déconnecté: {request.sid}')
        print(f'Utilisateur déconnecté: {request.sid}')
        user_data = connected_users.get(request.sid)
        
        if user_data:
            vocaline_logger.log('USER_DATA', request.sid, user_data.get('room'), 
                               'Données utilisateur trouvées lors de la déconnexion',
                               {'username': user_data.get('username'),
                                'room': user_data.get('room')})
            
            # Retirer l'utilisateur de la liste d'attente s'il y est
            if request.sid in waiting_users:
                waiting_users.remove(request.sid)
                vocaline_logger.log('WAITING_REMOVE', request.sid, None, 
                                   'Utilisateur retiré de la liste d\'attente')
            
            # Si l'utilisateur était dans une room, notifier l'autre utilisateur
            if user_data.get('room'):
                room_id = user_data['room']
                room_data = active_rooms.get(room_id)
                if room_data:
                    vocaline_logger.log('ROOM_DISCONNECT', request.sid, room_id, 
                                       'Utilisateur déconnecté d\'une room active',
                                       {'room_data': room_data})
                    
                    # Trouver l'autre utilisateur dans la room
                    other_user_id = None
                    if room_data['user1'] == request.sid:
                        other_user_id = room_data['user2']
                    elif room_data['user2'] == request.sid:
                        other_user_id = room_data['user1']
                    
                    if other_user_id and other_user_id in connected_users:
                        vocaline_logger.log('PARTNER_NOTIFY', other_user_id, room_id, 
                                           f'Notification de déconnexion du partenaire {request.sid}')
                        
                        # Notifier que le partenaire s'est déconnecté
                        emit('partner_disconnected', room=other_user_id)
                        
                        # Remettre l'autre utilisateur en attente automatiquement
                        connected_users[other_user_id]['room'] = None
                        leave_room(room_id, sid=other_user_id)
                        
                        # Vérifier que l'utilisateur est toujours connecté avant de le remettre en attente
                        if other_user_id in connected_users and other_user_id not in waiting_users:
                            waiting_users.append(other_user_id)
                            emit('waiting_for_match', {'status': 'Recherche d\'un nouveau partenaire...'}, room=other_user_id)
                            
                            vocaline_logger.log('AUTO_REQUEUE', other_user_id, None, 
                                               'Utilisateur automatiquement remis en attente',
                                               {'waiting_users_count': len(waiting_users),
                                                'waiting_users': waiting_users.copy()})
                            
                            # Essayer de trouver immédiatement un nouveau partenaire
                            try_find_new_partner(other_user_id)
                        else:
                            vocaline_logger.log('WARNING', other_user_id, None, 
                                               'Utilisateur déconnecté, non remis en attente')
                    
                    # Supprimer la room
                    del active_rooms[room_id]
                    vocaline_logger.log('ROOM_DELETE', request.sid, room_id, 
                                       'Room supprimée après déconnexion')
            
            # Retirer l'utilisateur de la liste des connectés
            del connected_users[request.sid]
            vocaline_logger.log('USER_REMOVE', request.sid, None, 
                               'Utilisateur retiré de connected_users')

    @socketio.on('join_matchmaking')
    def handle_join_matchmaking(data):
        username = data.get('username', f'User_{request.sid[:8]}')
        user_id = data.get('user_id', str(uuid.uuid4()))
        
        vocaline_logger.log('JOIN_MATCHMAKING', request.sid, None, 
                           f'Utilisateur {username} rejoint le matchmaking',
                           {'username': username, 'user_id': user_id})
        
        # Enregistrer l'utilisateur
        connected_users[request.sid] = {
            'user_id': user_id,
            'username': username,
            'room': None
        }
        
        vocaline_logger.log('USER_REGISTER', request.sid, None, 
                           'Utilisateur enregistré dans connected_users',
                           {'total_connected': len(connected_users),
                            'waiting_count': len(waiting_users)})
        
        # Chercher un partenaire disponible
        if waiting_users:
            vocaline_logger.log('PARTNER_SEARCH', request.sid, None, 
                               f'Partenaires en attente trouvés: {len(waiting_users)}',
                               {'waiting_users': waiting_users.copy()})
            
            # Filtrer les partenaires pour éviter l'auto-connexion
            valid_partners = []
            for partner_id in waiting_users:
                if partner_id in connected_users:
                    partner_username = connected_users[partner_id]['username']
                    # Empêcher qu'un utilisateur se connecte à lui-même (même nom)
                    if partner_username != username:
                        valid_partners.append(partner_id)
                    else:
                        vocaline_logger.log('SELF_MATCH_PREVENTED', request.sid, None, 
                                           f'Auto-connexion empêchée: {username} → {partner_username}')
            
            if valid_partners:
                # Prendre le premier partenaire valide
                partner_socket_id = valid_partners[0]
                waiting_users.remove(partner_socket_id)
                
                vocaline_logger.log('PARTNER_FOUND', request.sid, None, 
                                   f'Partenaire valide trouvé: {partner_socket_id}')
                
                # Créer une room pour les deux utilisateurs
                room_id = str(uuid.uuid4())
                
                # Mettre à jour les données des utilisateurs
                connected_users[request.sid]['room'] = room_id
                connected_users[partner_socket_id]['room'] = room_id
                
                # Enregistrer la room active
                active_rooms[room_id] = {
                    'user1': request.sid,
                    'user2': partner_socket_id
                }
                
                vocaline_logger.log('ROOM_CREATE', request.sid, room_id, 
                                   f'Room créée entre {request.sid} et {partner_socket_id}',
                                   {'user1': request.sid, 'user2': partner_socket_id})
                
                # Faire rejoindre les deux utilisateurs à la room
                join_room(room_id, sid=request.sid)
                join_room(room_id, sid=partner_socket_id)
                
                # Notifier les deux utilisateurs qu'ils sont connectés
                partner_data = connected_users[partner_socket_id]
                user_data = connected_users[request.sid]
                
                # Désigner l'initiateur WebRTC : l'utilisateur qui rejoint en second initie l'appel
                # Cela évite les conflits de négociation WebRTC (glare condition)
                
                emit('match_found', {
                    'room_id': room_id,
                    'partner': {
                        'username': partner_data['username'],
                        'user_id': partner_data['user_id']
                    },
                    'webrtc_role': 'initiator',  # L'utilisateur qui rejoint initie
                    'should_start_call': True
                }, room=request.sid)
                
                emit('match_found', {
                    'room_id': room_id,
                    'partner': {
                        'username': user_data['username'],
                        'user_id': user_data['user_id']
                    },
                    'webrtc_role': 'receiver',   # Le partenaire en attente reçoit
                    'should_start_call': False
                }, room=partner_socket_id)
                
                vocaline_logger.log('MATCH_SUCCESS', request.sid, room_id, 
                                   f'Match réussi entre {username} et {partner_data["username"]}',
                                   {'initiator': request.sid, 'receiver': partner_socket_id})
                
            else:
                vocaline_logger.log('NO_VALID_PARTNER', request.sid, None, 
                                   f'Aucun partenaire valide trouvé (éviter auto-connexion)')
                # Aucun partenaire valide, ajouter l'utilisateur à la liste d'attente
                waiting_users.append(request.sid)
                emit('waiting_for_match', {'status': 'En attente d\'un partenaire...'})
        else:
            vocaline_logger.log('NO_PARTNER', request.sid, None, 
                               'Aucun partenaire disponible, ajout en liste d\'attente')
            # Aucun partenaire disponible, ajouter à la liste d'attente
            waiting_users.append(request.sid)
            emit('waiting_for_match', {'status': 'En attente d\'un partenaire...'})

    @socketio.on('leave_conversation')
    def handle_leave_conversation():
        user_data = connected_users.get(request.sid)
        
        vocaline_logger.log('LEAVE_CONVERSATION', request.sid, None, 
                           'Utilisateur demande à quitter la conversation',
                           {'user_data': user_data})
        
        if user_data and user_data.get('room'):
            room_id = user_data['room']
            room_data = active_rooms.get(room_id)
            
            vocaline_logger.log('LEAVE_ROOM', request.sid, room_id, 
                               'Utilisateur quitte la room',
                               {'room_data': room_data})
            
            if room_data:
                # Trouver l'autre utilisateur
                other_user_id = None
                if room_data['user1'] == request.sid:
                    other_user_id = room_data['user2']
                elif room_data['user2'] == request.sid:
                    other_user_id = room_data['user1']
                
                vocaline_logger.log('PARTNER_IDENTIFIED', request.sid, room_id, 
                                   f'Partenaire identifié: {other_user_id}')
                
                # Quitter la room
                leave_room(room_id, sid=request.sid)
                user_data['room'] = None
                
                # Notifier l'autre utilisateur et le remettre en attente
                if other_user_id and other_user_id in connected_users:
                    vocaline_logger.log('PARTNER_NOTIFY_LEAVE', other_user_id, room_id, 
                                       f'Notification à {other_user_id} que {request.sid} a quitté')
                    
                    leave_room(room_id, sid=other_user_id)
                    connected_users[other_user_id]['room'] = None
                    emit('partner_left', room=other_user_id)
                    
                    # Remettre l'autre utilisateur en liste d'attente seulement s'il est toujours connecté
                    if other_user_id in connected_users and other_user_id not in waiting_users:
                        waiting_users.append(other_user_id)
                        vocaline_logger.log('PARTNER_REQUEUE', other_user_id, None, 
                                           'Partenaire remis en liste d\'attente',
                                           {'waiting_users_count': len(waiting_users),
                                            'waiting_users': waiting_users.copy()})
                        
                        emit('waiting_for_match', {'status': 'Recherche d\'un nouveau partenaire...'}, room=other_user_id)
                        
                        # Essayer de trouver immédiatement un nouveau partenaire
                        try_find_new_partner(other_user_id)
                    else:
                        vocaline_logger.log('WARNING', other_user_id, None, 
                                           'Partenaire déconnecté ou déjà en attente, non ajouté à waiting_users')
                
                # Supprimer la room
                del active_rooms[room_id]
                vocaline_logger.log('ROOM_DELETE', request.sid, room_id, 
                                   'Room supprimée après leave_conversation')
            
            # Remettre l'utilisateur actuel en liste d'attente
            if request.sid not in waiting_users:
                waiting_users.append(request.sid)
                vocaline_logger.log('USER_REQUEUE', request.sid, None, 
                                   'Utilisateur remis en liste d\'attente',
                                   {'waiting_users_count': len(waiting_users),
                                    'waiting_users': waiting_users.copy()})
            else:
                vocaline_logger.log('WARNING', request.sid, None, 
                                   'Utilisateur déjà dans waiting_users')
            
            emit('waiting_for_match', {'status': 'En attente d\'un partenaire...'})
            
            # Essayer de trouver immédiatement un nouveau partenaire pour l'utilisateur actuel
            try_find_new_partner(request.sid)

    @socketio.on('webrtc_offer')
    def handle_webrtc_offer(data):
        user_data = connected_users.get(request.sid)
        if user_data and user_data.get('room'):
            room_id = user_data['room']
            room_data = active_rooms.get(room_id)
            
            vocaline_logger.log('WEBRTC_OFFER', request.sid, room_id, 
                               f'Offre WebRTC envoyée par {user_data["username"]}',
                               {'room_users': room_data, 'offer_type': data.get('type', 'unknown')})
            
            # Transmettre l'offre WebRTC à l'autre utilisateur dans la room
            emit('webrtc_offer', data, room=room_id, include_self=False)
        else:
            vocaline_logger.log('WEBRTC_ERROR', request.sid, None, 
                               'Tentative d\'envoi d\'offre WebRTC sans room active',
                               {'user_data': user_data})

    @socketio.on('webrtc_answer')
    def handle_webrtc_answer(data):
        user_data = connected_users.get(request.sid)
        if user_data and user_data.get('room'):
            room_id = user_data['room']
            room_data = active_rooms.get(room_id)
            
            vocaline_logger.log('WEBRTC_ANSWER', request.sid, room_id, 
                               f'Réponse WebRTC envoyée par {user_data["username"]}',
                               {'room_users': room_data, 'answer_type': data.get('type', 'unknown')})
            
            # Transmettre la réponse WebRTC à l'autre utilisateur dans la room
            emit('webrtc_answer', data, room=room_id, include_self=False)
        else:
            vocaline_logger.log('WEBRTC_ERROR', request.sid, None, 
                               'Tentative d\'envoi de réponse WebRTC sans room active',
                               {'user_data': user_data})

    @socketio.on('webrtc_ice_candidate')
    def handle_webrtc_ice_candidate(data):
        user_data = connected_users.get(request.sid)
        if user_data and user_data.get('room'):
            room_id = user_data['room']
            
            vocaline_logger.log('WEBRTC_ICE', request.sid, room_id, 
                               f'Candidat ICE envoyé par {user_data["username"]}',
                               {'candidate_type': data.get('candidate', {}).get('type', 'unknown')})
            
            # Transmettre le candidat ICE à l'autre utilisateur dans la room
            emit('webrtc_ice_candidate', data, room=room_id, include_self=False)
        else:
            vocaline_logger.log('WEBRTC_ERROR', request.sid, None, 
                               'Tentative d\'envoi de candidat ICE sans room active',
                               {'user_data': user_data})

# Enregistrer les événements SocketIO
register_socketio_events()

@matchmaking_bp.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        'connected_users': len(connected_users),
        'waiting_users': len(waiting_users),
        'active_rooms': len(active_rooms)
    })


    # Nouveaux événements pour le suivi de l'état WebRTC côté client
    @socketio.on('webrtc_connection_state')
    def handle_webrtc_connection_state(data):
        user_data = connected_users.get(request.sid)
        if user_data:
            room_id = user_data.get('room')
            state = data.get('state', 'unknown')
            
            vocaline_logger.log('WEBRTC_STATE', request.sid, room_id, 
                               f'État de connexion WebRTC: {state} pour {user_data["username"]}',
                               {'connection_state': state, 'timestamp': data.get('timestamp')})
            
            # Si la connexion échoue, notifier l'autre utilisateur
            if state in ['failed', 'disconnected', 'closed']:
                if room_id and room_id in active_rooms:
                    room_data = active_rooms[room_id]
                    partner_id = room_data['user1'] if room_data['user2'] == request.sid else room_data['user2']
                    
                    vocaline_logger.log('WEBRTC_FAILURE', request.sid, room_id, 
                                       f'Échec WebRTC détecté, notification du partenaire {partner_id}')
                    
                    emit('webrtc_connection_failed', {
                        'reason': f'Connexion audio échouée avec {user_data["username"]}'
                    }, room=partner_id)

    @socketio.on('webrtc_audio_state')
    def handle_webrtc_audio_state(data):
        user_data = connected_users.get(request.sid)
        if user_data:
            room_id = user_data.get('room')
            audio_enabled = data.get('enabled', False)
            audio_type = data.get('type', 'unknown')
            
            vocaline_logger.log('WEBRTC_AUDIO', request.sid, room_id, 
                               f'Audio {audio_type} pour {user_data["username"]}',
                               {'audio_enabled': audio_enabled, 'type': audio_type, 'data': data})

    @socketio.on('webrtc_error')
    def handle_webrtc_error(data):
        user_data = connected_users.get(request.sid)
        if user_data:
            room_id = user_data.get('room')
            error_type = data.get('type', 'unknown')
            error_message = data.get('message', 'Erreur inconnue')
            
            vocaline_logger.log('WEBRTC_CLIENT_ERROR', request.sid, room_id, 
                               f'Erreur WebRTC côté client: {error_type} - {error_message}',
                               {'error_type': error_type, 'error_message': error_message})

