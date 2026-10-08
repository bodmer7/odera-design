-- Ereignisse der Statistik (nur nach Einwilligung). Keine IP-Adressen, keine Cookies, keine Personendaten.
-- sitzung ist eine zufällige ID aus dem sessionStorage des Tabs, sie wechselt mit jedem neuen Tab.
CREATE TABLE ereignisse (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  zeit    TEXT NOT NULL,
  tag     TEXT NOT NULL,
  sitzung TEXT NOT NULL,
  typ     TEXT NOT NULL,
  seite   TEXT NOT NULL,
  ziel    TEXT,
  zahl    REAL,
  info    TEXT,
  geraet  TEXT,
  land    TEXT,
  quelle  TEXT,
  k       TEXT
);
CREATE INDEX ereignisse_tag_typ ON ereignisse (tag, typ);

-- Zähler pro Tag, damit das Gratis-Kontingent nie überschritten wird.
CREATE TABLE tageszaehler (
  tag    TEXT PRIMARY KEY,
  anzahl INTEGER NOT NULL DEFAULT 0
);
