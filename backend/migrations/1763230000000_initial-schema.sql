-- Up Migration
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL CHECK (email = lower(email)),
  password_hash text NOT NULL,
  full_name     text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 120),
  role          text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','REVIEWER')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));

CREATE TABLE accidents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  affected_name     text NOT NULL CHECK (char_length(affected_name) BETWEEN 3 AND 120),
  document_type     text NOT NULL CHECK (document_type IN ('CC','CE','TI','PASAPORTE')),
  document_number   text NOT NULL CHECK (document_number ~ '^[A-Za-z0-9]{5,20}$'),
  phone             text NOT NULL CHECK (phone ~ '^\+?[0-9]{7,15}$'),
  contact_email     text NOT NULL CHECK (char_length(contact_email) <= 254),
  accident_type     text NOT NULL CHECK (accident_type IN ('TRANSITO','LABORAL','DOMESTICO','DEPORTIVO','OTRO')),
  occurred_on       date NOT NULL CHECK (occurred_on >= DATE '1900-01-01'),
  place             text NOT NULL CHECK (char_length(place) BETWEEN 3 AND 200),
  description       text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
  status            text NOT NULL DEFAULT 'REGISTRADO'
                    CONSTRAINT accidents_status_check CHECK (status IN ('REGISTRADO','EN_REVISION','CERRADO')),
  status_changed_by uuid NULL REFERENCES users(id),
  status_changed_at timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK ((status_changed_by IS NULL) = (status_changed_at IS NULL))
);
CREATE INDEX accidents_owner_occurred_idx ON accidents (owner_id, occurred_on DESC, created_at DESC);

CREATE TABLE revoked_tokens (
  jti        uuid PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX revoked_tokens_expires_idx ON revoked_tokens (expires_at);

-- Down Migration
DROP TABLE revoked_tokens;
DROP TABLE accidents;
DROP TABLE users;
