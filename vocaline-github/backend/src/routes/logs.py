from flask import Blueprint, jsonify, render_template_string
from src.utils.logger import vocaline_logger
import json

logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/logs', methods=['GET'])
def logs_page():
    """Page web pour consulter les logs"""
    html_template = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logs Vocaline</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2em;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
        }
        .controls {
            padding: 20px;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5a6fd8;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
        }
        .btn-warning {
            background: #ffc107;
            color: #212529;
        }
        .btn-warning:hover {
            background: #e0a800;
        }
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        .btn-danger:hover {
            background: #c82333;
        }
        .filter-group {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        select, input {
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
        }
        .logs-container {
            max-height: 600px;
            overflow-y: auto;
            padding: 20px;
        }
        .log-entry {
            margin-bottom: 10px;
            padding: 12px;
            border-left: 4px solid #dee2e6;
            background: #f8f9fa;
            border-radius: 0 4px 4px 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }
        .log-entry.CONNECT { border-left-color: #28a745; }
        .log-entry.DISCONNECT { border-left-color: #dc3545; }
        .log-entry.MATCHMAKING { border-left-color: #007bff; }
        .log-entry.MATCH_SUCCESS { border-left-color: #28a745; }
        .log-entry.ROOM_CREATE { border-left-color: #17a2b8; }
        .log-entry.ROOM_DELETE { border-left-color: #6c757d; }
        .log-entry.ERROR { border-left-color: #dc3545; background: #f8d7da; }
        .log-entry.LEAVE_CONVERSATION { border-left-color: #ffc107; }
        .log-timestamp {
            color: #6c757d;
            font-weight: bold;
        }
        .log-type {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            margin-left: 10px;
        }
        .log-type.CONNECT { background: #d4edda; color: #155724; }
        .log-type.DISCONNECT { background: #f8d7da; color: #721c24; }
        .log-type.MATCHMAKING { background: #d1ecf1; color: #0c5460; }
        .log-type.MATCH_SUCCESS { background: #d4edda; color: #155724; }
        .log-type.ROOM_CREATE { background: #d1ecf1; color: #0c5460; }
        .log-type.ROOM_DELETE { background: #e2e3e5; color: #383d41; }
        .log-type.ERROR { background: #f8d7da; color: #721c24; }
        .log-type.LEAVE_CONVERSATION { background: #fff3cd; color: #856404; }
        .log-message {
            margin: 5px 0;
            color: #495057;
        }
        .log-data {
            margin-top: 5px;
            padding: 8px;
            background: rgba(0,0,0,0.05);
            border-radius: 3px;
            font-size: 12px;
            color: #6c757d;
        }
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: #28a745;
            color: white;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transform: translateX(400px);
            transition: transform 0.3s ease;
            z-index: 1000;
        }
        .notification.show {
            transform: translateX(0);
        }
        @media (max-width: 768px) {
            .controls {
                flex-direction: column;
                align-items: stretch;
            }
            .filter-group {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Logs Vocaline</h1>
            <p>Système de monitoring en temps réel</p>
        </div>
        
        <div class="stats" id="stats">
            <!-- Les statistiques seront chargées ici -->
        </div>
        
        <div class="controls">
            <button class="btn btn-primary" onclick="refreshLogs()">🔄 Actualiser</button>
            <button class="btn btn-success" onclick="copyLogs()">📋 Copier tous les logs</button>
            <button class="btn btn-warning" onclick="exportLogs()">📥 Exporter CSV</button>
            <button class="btn btn-danger" onclick="clearLogs()">🗑️ Vider les logs</button>
            
            <div class="filter-group">
                <label>Filtrer par type:</label>
                <select id="typeFilter" onchange="filterLogs()">
                    <option value="">Tous les types</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label>Limite:</label>
                <input type="number" id="limitInput" value="100" min="10" max="1000" onchange="filterLogs()">
            </div>
        </div>
        
        <div class="logs-container" id="logsContainer">
            <!-- Les logs seront chargés ici -->
        </div>
    </div>
    
    <div class="notification" id="notification"></div>

    <script>
        let allLogs = [];
        let filteredLogs = [];
        
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
        
        async function loadLogs() {
            try {
                const response = await fetch('/api/logs');
                const data = await response.json();
                allLogs = data.logs;
                updateStats(data.stats);
                updateTypeFilter();
                filterLogs();
            } catch (error) {
                console.error('Erreur lors du chargement des logs:', error);
                showNotification('Erreur lors du chargement des logs', 'error');
            }
        }
        
        function updateStats(stats) {
            const statsContainer = document.getElementById('stats');
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${stats.total_logs}</div>
                    <div class="stat-label">Total logs</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${Object.keys(stats.event_counts).length}</div>
                    <div class="stat-label">Types d'événements</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.event_counts.CONNECT || 0}</div>
                    <div class="stat-label">Connexions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.event_counts.MATCH_SUCCESS || 0}</div>
                    <div class="stat-label">Matchs réussis</div>
                </div>
            `;
        }
        
        function updateTypeFilter() {
            const typeFilter = document.getElementById('typeFilter');
            const types = [...new Set(allLogs.map(log => log.event_type))];
            
            typeFilter.innerHTML = '<option value="">Tous les types</option>';
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                typeFilter.appendChild(option);
            });
        }
        
        function filterLogs() {
            const typeFilter = document.getElementById('typeFilter').value;
            const limit = parseInt(document.getElementById('limitInput').value) || 100;
            
            filteredLogs = allLogs.filter(log => {
                return !typeFilter || log.event_type === typeFilter;
            }).slice(-limit);
            
            displayLogs();
        }
        
        function displayLogs() {
            const container = document.getElementById('logsContainer');
            
            if (filteredLogs.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">Aucun log à afficher</p>';
                return;
            }
            
            container.innerHTML = filteredLogs.reverse().map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString('fr-FR');
                const dataStr = log.data && Object.keys(log.data).length > 0 
                    ? JSON.stringify(log.data, null, 2) 
                    : '';
                
                return `
                    <div class="log-entry ${log.event_type}">
                        <span class="log-timestamp">${timestamp}</span>
                        <span class="log-type ${log.event_type}">${log.event_type}</span>
                        ${log.user_id ? `<span style="color: #007bff; margin-left: 10px;">User: ${log.user_id.substring(0, 8)}</span>` : ''}
                        ${log.room_id ? `<span style="color: #17a2b8; margin-left: 10px;">Room: ${log.room_id.substring(0, 8)}</span>` : ''}
                        <div class="log-message">${log.message}</div>
                        ${dataStr ? `<div class="log-data">${dataStr}</div>` : ''}
                    </div>
                `;
            }).join('');
        }
        
        function refreshLogs() {
            loadLogs();
            showNotification('Logs actualisés');
        }
        
        function copyLogs() {
            const logsText = allLogs.map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString('fr-FR');
                const dataStr = log.data && Object.keys(log.data).length > 0 
                    ? ' | Data: ' + JSON.stringify(log.data)
                    : '';
                return `${timestamp} | ${log.event_type} | User: ${log.user_id || 'N/A'} | Room: ${log.room_id || 'N/A'} | ${log.message}${dataStr}`;
            }).join('\\n');
            
            navigator.clipboard.writeText(logsText).then(() => {
                showNotification('Logs copiés dans le presse-papiers');
            }).catch(() => {
                showNotification('Erreur lors de la copie', 'error');
            });
        }
        
        function exportLogs() {
            const csvContent = [
                'Timestamp,Event Type,User ID,Room ID,Message,Data',
                ...allLogs.map(log => {
                    const timestamp = new Date(log.timestamp).toISOString();
                    const dataStr = log.data ? JSON.stringify(log.data).replace(/"/g, '""') : '';
                    return `"${timestamp}","${log.event_type}","${log.user_id || ''}","${log.room_id || ''}","${log.message.replace(/"/g, '""')}","${dataStr}"`;
                })
            ].join('\\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vocaline_logs_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            showNotification('Logs exportés en CSV');
        }
        
        async function clearLogs() {
            if (confirm('Êtes-vous sûr de vouloir vider tous les logs ?')) {
                try {
                    await fetch('/api/logs/clear', { method: 'POST' });
                    loadLogs();
                    showNotification('Logs vidés');
                } catch (error) {
                    showNotification('Erreur lors de la suppression', 'error');
                }
            }
        }
        
        // Auto-refresh toutes les 10 secondes
        setInterval(loadLogs, 10000);
        
        // Chargement initial
        loadLogs();
    </script>
</body>
</html>
    """
    return render_template_string(html_template)

@logs_bp.route('/api/logs', methods=['GET'])
def get_logs_api():
    """API pour récupérer les logs"""
    logs = vocaline_logger.get_logs()
    stats = vocaline_logger.get_stats()
    return jsonify({
        'logs': logs,
        'stats': stats
    })

@logs_bp.route('/api/logs/clear', methods=['POST'])
def clear_logs_api():
    """API pour vider les logs"""
    vocaline_logger.clear_logs()
    return jsonify({'success': True, 'message': 'Logs vidés'})

@logs_bp.route('/api/logs/stats', methods=['GET'])
def get_logs_stats():
    """API pour récupérer les statistiques des logs"""
    return jsonify(vocaline_logger.get_stats())

