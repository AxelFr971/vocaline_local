from flask import Blueprint, render_template_string, jsonify
from src.routes.feedback import load_feedback
from datetime import datetime, timedelta

feedback_page_bp = Blueprint('feedback_page', __name__)

# Template HTML pour la page d'affichage des avis
FEEDBACK_PAGE_TEMPLATE = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Avis Utilisateurs - Vocaline</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .stats {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
        }
        .stat-item {
            text-align: center;
            margin: 10px;
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
        .actions {
            padding: 20px;
            border-bottom: 1px solid #e9ecef;
            text-align: center;
        }
        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin: 0 10px;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #5a6fd8;
        }
        .btn-secondary {
            background: #6c757d;
        }
        .btn-secondary:hover {
            background: #5a6268;
        }
        .feedback-list {
            padding: 20px;
        }
        .feedback-item {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            margin-bottom: 20px;
            padding: 20px;
            background: #fff;
            transition: box-shadow 0.3s;
        }
        .feedback-item:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .feedback-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        .feedback-date {
            color: #6c757d;
            font-size: 0.9em;
        }
        .feedback-id {
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            color: #495057;
        }
        .feedback-content {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
            margin-bottom: 15px;
        }
        .feedback-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            font-size: 0.85em;
            color: #6c757d;
        }
        .meta-item {
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 4px;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }
        .empty-state h3 {
            margin-bottom: 10px;
            color: #495057;
        }
        .copy-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(400px);
            transition: transform 0.3s ease;
            z-index: 1000;
        }
        .copy-notification.show {
            transform: translateX(0);
        }
        @media (max-width: 768px) {
            .stats {
                flex-direction: column;
            }
            .feedback-header {
                flex-direction: column;
                align-items: flex-start;
            }
            .feedback-meta {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 Avis Utilisateurs Vocaline</h1>
            <p>Gestion et consultation des retours utilisateurs</p>
        </div>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-number">{{ feedback_count }}</div>
                <div class="stat-label">Avis Total</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">{{ today_count }}</div>
                <div class="stat-label">Aujourd'hui</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">{{ week_count }}</div>
                <div class="stat-label">Cette Semaine</div>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn" onclick="copyAllFeedback()">📋 Copier Tous les Avis</button>
            <button class="btn btn-secondary" onclick="exportToCSV()">📊 Exporter CSV</button>
            <button class="btn btn-secondary" onclick="location.reload()">🔄 Actualiser</button>
        </div>
        
        <div class="feedback-list">
            {% if feedback_list %}
                {% for feedback in feedback_list %}
                <div class="feedback-item">
                    <div class="feedback-header">
                        <div class="feedback-date">{{ feedback.formatted_date }}</div>
                        <div class="feedback-id">ID: {{ feedback.short_id }}</div>
                    </div>
                    <div class="feedback-content">
                        {{ feedback.feedback }}
                    </div>
                    <div class="feedback-meta">
                        <div class="meta-item">
                            <strong>IP:</strong> {{ feedback.ip_address }}
                        </div>
                        <div class="meta-item">
                            <strong>Navigateur:</strong> {{ feedback.user_agent_short }}
                        </div>
                    </div>
                </div>
                {% endfor %}
            {% else %}
                <div class="empty-state">
                    <h3>Aucun avis pour le moment</h3>
                    <p>Les avis utilisateurs apparaîtront ici une fois soumis via l'application.</p>
                </div>
            {% endif %}
        </div>
    </div>
    
    <div class="copy-notification" id="copyNotification">
        ✅ Avis copiés dans le presse-papiers !
    </div>

    <script>
        function copyAllFeedback() {
            const feedbackData = {{ feedback_json | safe }};
            
            let textToCopy = "AVIS UTILISATEURS VOCALINE\\n";
            textToCopy += "=" + "=".repeat(50) + "\\n\\n";
            
            feedbackData.forEach((feedback, index) => {
                textToCopy += `AVIS #${index + 1}\\n`;
                textToCopy += `Date: ${feedback.formatted_date}\\n`;
                textToCopy += `Contenu: ${feedback.feedback}\\n`;
                textToCopy += `IP: ${feedback.ip_address}\\n`;
                textToCopy += `Navigateur: ${feedback.user_agent}\\n`;
                textToCopy += "-".repeat(50) + "\\n\\n";
            });
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                showCopyNotification();
            }).catch(err => {
                console.error('Erreur lors de la copie:', err);
                // Fallback pour les navigateurs plus anciens
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showCopyNotification();
            });
        }
        
        function exportToCSV() {
            const feedbackData = {{ feedback_json | safe }};
            
            let csvContent = "Date,Avis,IP,Navigateur\\n";
            feedbackData.forEach(feedback => {
                const row = [
                    feedback.formatted_date,
                    `"${feedback.feedback.replace(/"/g, '""')}"`,
                    feedback.ip_address,
                    `"${feedback.user_agent.replace(/"/g, '""')}"`
                ].join(',');
                csvContent += row + "\\n";
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `vocaline_avis_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        function showCopyNotification() {
            const notification = document.getElementById('copyNotification');
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    </script>
</body>
</html>
"""

@feedback_page_bp.route('/feedbacks')
def feedback_page():
    """Page d'affichage de tous les avis utilisateurs"""
    try:
        # Charger tous les avis
        feedback_list = load_feedback()
        
        # Traitement des données pour l'affichage
        processed_feedback = []
        today = datetime.now().date()
        week_start = today - timedelta(days=7)
        
        today_count = 0
        week_count = 0
        
        for feedback in reversed(feedback_list):  # Plus récents en premier
            try:
                # Formatage de la date
                feedback_date = datetime.fromisoformat(feedback['timestamp'].replace('Z', '+00:00'))
                formatted_date = feedback_date.strftime('%d/%m/%Y à %H:%M')
                
                # Compteurs
                feedback_date_only = feedback_date.date()
                if feedback_date_only == today:
                    today_count += 1
                if feedback_date_only >= week_start:
                    week_count += 1
                
                # ID court
                short_id = feedback['id'][:8] if 'id' in feedback else 'N/A'
                
                # User agent court
                user_agent = feedback.get('user_agent', 'Non disponible')
                user_agent_short = user_agent[:50] + '...' if len(user_agent) > 50 else user_agent
                
                processed_feedback.append({
                    'feedback': feedback['feedback'],
                    'formatted_date': formatted_date,
                    'short_id': short_id,
                    'ip_address': feedback.get('ip_address', 'Non disponible'),
                    'user_agent': user_agent,
                    'user_agent_short': user_agent_short
                })
            except Exception as e:
                print(f"Erreur lors du traitement d'un avis: {e}")
                continue
        
        # Données JSON pour JavaScript
        import json
        feedback_json = json.dumps(processed_feedback, ensure_ascii=False)
        
        return render_template_string(
            FEEDBACK_PAGE_TEMPLATE,
            feedback_list=processed_feedback,
            feedback_count=len(feedback_list),
            today_count=today_count,
            week_count=week_count,
            feedback_json=feedback_json
        )
        
    except Exception as e:
        print(f"Erreur lors de l'affichage de la page des avis: {e}")
        return f"Erreur lors du chargement des avis: {str(e)}", 500

