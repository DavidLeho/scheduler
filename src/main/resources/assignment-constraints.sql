-- Egy dolgozó ugyanazon a napon külön normál és készenléti beosztást kaphat.
ALTER TABLE assignment ADD CONSTRAINT IF NOT EXISTS uk_assignment_employee_date_layer
    UNIQUE NULLS NOT DISTINCT (employee_id, assignment_date, assignment_layer);
