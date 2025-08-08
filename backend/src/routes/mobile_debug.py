from flask import Blueprint, request
from ..socketio_instance import socketio
from ..utils.logger import vocaline_logger

mobile_debug_bp = Blueprint('mobile_debug', __name__)

@socketio.on('mobile_debug')
def handle_mobile_debug(data):
    """Gérer les logs de debug mobile"""
    try:
        message = data.get('message', 'Debug mobile')
        debug_data = data.get('data', {})
        
        # Extraire les informations importantes
        user_agent = debug_data.get('userAgent', 'Unknown')
        is_mobile = debug_data.get('isMobile', False)
        connection_type = debug_data.get('connection', 'unknown')
        online_status = debug_data.get('online', True)
        
        # Déterminer le type d'appareil
        device_type = 'Mobile' if is_mobile else 'Desktop'
        
        # Logger avec informations détaillées
        vocaline_logger.log(
            'MOBILE_DEBUG',
            request.sid,
            'N/A',
            f'{device_type}: {message}',
            {
                'device_type': device_type,
                'user_agent': user_agent[:100],  # Limiter la longueur
                'connection_type': connection_type,
                'online': online_status,
                'debug_data': debug_data
            }
        )
        
    except Exception as e:
        vocaline_logger.log(
            'ERROR',
            request.sid if 'request' in globals() else 'unknown',
            'N/A',
            f'Erreur dans handle_mobile_debug: {str(e)}',
            {'error': str(e)}
        )

@socketio.on('webrtc_state')
def handle_webrtc_state(data):
    """Gérer les états WebRTC avec logs détaillés"""
    try:
        state_type = data.get('type', 'unknown')
        state_value = data.get('state', 'unknown')
        debug_id = data.get('debug', 'NO_DEBUG_ID')
        
        vocaline_logger.log(
            'WEBRTC_STATE',
            request.sid,
            'N/A',
            f'État WebRTC {state_type}: {state_value}',
            {
                'type': state_type,
                'state': state_value,
                'debug': debug_id
            }
        )
        
    except Exception as e:
        vocaline_logger.log(
            'ERROR',
            request.sid if 'request' in globals() else 'unknown',
            'N/A',
            f'Erreur dans handle_webrtc_state: {str(e)}',
            {'error': str(e)}
        )

@socketio.on('webrtc_ice')
def handle_webrtc_ice(data):
    """Gérer les événements ICE avec logs détaillés"""
    try:
        ice_type = data.get('type', 'unknown')
        candidate_type = data.get('candidateType', 'unknown')
        debug_id = data.get('debug', 'NO_DEBUG_ID')
        
        vocaline_logger.log(
            'WEBRTC_ICE',
            request.sid,
            'N/A',
            f'ICE {ice_type}: {candidate_type}',
            {
                'type': ice_type,
                'candidate_type': candidate_type,
                'debug': debug_id
            }
        )
        
    except Exception as e:
        vocaline_logger.log(
            'ERROR',
            request.sid if 'request' in globals() else 'unknown',
            'N/A',
            f'Erreur dans handle_webrtc_ice: {str(e)}',
            {'error': str(e)}
        )

@socketio.on('webrtc_offer')
def handle_webrtc_offer_log(data):
    """Logger les offres WebRTC avec détails"""
    try:
        offer_type = data.get('type', 'unknown')
        offer_subtype = data.get('offerType', 'unknown')
        debug_id = data.get('debug', 'NO_DEBUG_ID')
        
        vocaline_logger.log(
            'WEBRTC_OFFER_DETAIL',
            request.sid,
            'N/A',
            f'Offre WebRTC {offer_type}: {offer_subtype}',
            {
                'type': offer_type,
                'offer_type': offer_subtype,
                'debug': debug_id
            }
        )
        
    except Exception as e:
        vocaline_logger.log(
            'ERROR',
            request.sid if 'request' in globals() else 'unknown',
            'N/A',
            f'Erreur dans handle_webrtc_offer_log: {str(e)}',
            {'error': str(e)}
        )

@socketio.on('webrtc_answer')
def handle_webrtc_answer_log(data):
    """Logger les réponses WebRTC avec détails"""
    try:
        answer_type = data.get('type', 'unknown')
        answer_subtype = data.get('answerType', 'unknown')
        debug_id = data.get('debug', 'NO_DEBUG_ID')
        
        vocaline_logger.log(
            'WEBRTC_ANSWER_DETAIL',
            request.sid,
            'N/A',
            f'Réponse WebRTC {answer_type}: {answer_subtype}',
            {
                'type': answer_type,
                'answer_type': answer_subtype,
                'debug': debug_id
            }
        )
        
    except Exception as e:
        vocaline_logger.log(
            'ERROR',
            request.sid if 'request' in globals() else 'unknown',
            'N/A',
            f'Erreur dans handle_webrtc_answer_log: {str(e)}',
            {'error': str(e)}
        )

@socketio.on('webrtc_error')
def handle_webrtc_error(data):
    """Gérer les erreurs WebRTC avec logs détaillés"""
    try:
        error_type = data.get('type', 'unknown')
        error_message = data.get('error', 'Unknown error')
        debug_id = data.get('debug', 'NO_DEBUG_ID')
        
        vocaline_logger.log(
            'WEBRTC_ERROR',
            request.sid,
            'N/A',
            f'Erreur WebRTC {error_type}: {error_message}',
            {
                'type': error_type,
                'error': error_message,
                'debug': debug_id
            }
        )
        
    except Exception as e:
        vocaline_logger.log(
            'ERROR',
            request.sid if 'request' in globals() else 'unknown',
            'N/A',
            f'Erreur dans handle_webrtc_error: {str(e)}',
            {'error': str(e)}
        )

