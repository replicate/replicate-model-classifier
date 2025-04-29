CREATE TABLE model_classifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_key TEXT UNIQUE NOT NULL,
  classification TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_model_key ON model_classifications(model_key); 