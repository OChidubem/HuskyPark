// HuskyPark Predictor — MongoDB Index Setup
// Run: mongosh huskypark_mongo < mongo_indexes.js

// crowdsourced_reports
db.crowdsourced_reports.createIndex({ lot_id: 1, reported_at: -1 });
db.crowdsourced_reports.createIndex({ sql_report_id: 1 }, { unique: true });
db.crowdsourced_reports.createIndex(
  { reported_at: 1 },
  { expireAfterSeconds: 7776000 }  // TTL: auto-delete after 90 days
);

// lot_hourly_analytics
db.lot_hourly_analytics.createIndex({ lot_id: 1, date: 1, hour: 1 }, { unique: true });

// ai_recommendation_sessions
db.ai_recommendation_sessions.createIndex({ user_id: 1, created_at: -1 });

// notification_logs
db.notification_logs.createIndex({ user_id: 1, sent_at: -1 });

print("HuskyPark MongoDB indexes created successfully.");
