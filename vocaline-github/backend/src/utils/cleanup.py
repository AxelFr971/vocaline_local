from src.utils.logger import vocaline_logger

def cleanup_waiting_users(waiting_users, connected_users):
    """
    Nettoie la liste waiting_users en supprimant les utilisateurs déconnectés
    """
    initial_count = len(waiting_users)
    
    # Filtrer les utilisateurs qui sont toujours connectés
    valid_users = [user_id for user_id in waiting_users if user_id in connected_users]
    
    # Identifier les utilisateurs à supprimer
    invalid_users = [user_id for user_id in waiting_users if user_id not in connected_users]
    
    # Mettre à jour la liste
    waiting_users.clear()
    waiting_users.extend(valid_users)
    
    # Logger le nettoyage
    if invalid_users:
        vocaline_logger.log('CLEANUP', None, None, 
                           f'Nettoyage de waiting_users: {len(invalid_users)} utilisateurs déconnectés supprimés',
                           {'removed_users': invalid_users,
                            'before_count': initial_count,
                            'after_count': len(waiting_users),
                            'remaining_users': valid_users})
    
    return len(invalid_users)

def validate_user_states(waiting_users, connected_users, active_rooms):
    """
    Valide la cohérence des états des utilisateurs
    """
    issues = []
    
    # Vérifier que tous les utilisateurs en attente sont connectés
    for user_id in waiting_users:
        if user_id not in connected_users:
            issues.append(f"User {user_id} in waiting_users but not in connected_users")
    
    # Vérifier que les utilisateurs dans les rooms sont connectés
    for room_id, room_data in active_rooms.items():
        for user_key in ['user1', 'user2']:
            user_id = room_data.get(user_key)
            if user_id and user_id not in connected_users:
                issues.append(f"User {user_id} in room {room_id} but not in connected_users")
    
    # Vérifier qu'aucun utilisateur n'est à la fois en room et en attente
    for user_id, user_data in connected_users.items():
        if user_data.get('room') and user_id in waiting_users:
            issues.append(f"User {user_id} both in room and waiting_users")
    
    if issues:
        vocaline_logger.log('VALIDATION_ERROR', None, None, 
                           f'Incohérences détectées: {len(issues)}',
                           {'issues': issues})
    
    return issues

