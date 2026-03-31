-- Tier 2: Feature 3 - In-App Notification Center
-- Purpose: Unified notification timeline for patient, donor, and admin events
-- Date: 2026-03-29

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id BIGINT REFERENCES appointments(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL,
  recipient_patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  recipient_donor_id UUID REFERENCES donor(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_notification_recipient_role
    CHECK (recipient_role IN ('patient', 'donor', 'admin')),
  CONSTRAINT chk_notification_recipient_mapping
    CHECK (
      (recipient_role = 'patient' AND recipient_patient_id IS NOT NULL AND recipient_donor_id IS NULL)
      OR (recipient_role = 'donor' AND recipient_donor_id IS NOT NULL AND recipient_patient_id IS NULL)
      OR (recipient_role = 'admin' AND recipient_patient_id IS NULL AND recipient_donor_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient_created ON notifications(recipient_patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_donor_created ON notifications(recipient_donor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_role_created ON notifications(recipient_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(read_at) WHERE read_at IS NULL;

-- ============================================
-- 2. HELPER FUNCTION: CREATE NOTIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION create_notification(
  p_appointment_id BIGINT,
  p_recipient_role TEXT,
  p_recipient_patient_id UUID,
  p_recipient_donor_id UUID,
  p_event_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    appointment_id,
    recipient_role,
    recipient_patient_id,
    recipient_donor_id,
    event_type,
    title,
    message,
    payload
  ) VALUES (
    p_appointment_id,
    p_recipient_role,
    p_recipient_patient_id,
    p_recipient_donor_id,
    p_event_type,
    p_title,
    p_message,
    p_payload
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. FUNCTION: APPOINTMENT EVENT -> NOTIFICATIONS
-- ============================================
CREATE OR REPLACE FUNCTION create_appointment_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_name TEXT;
  v_donor_name TEXT;
  v_event_type TEXT;
  v_title_patient TEXT;
  v_message_patient TEXT;
  v_title_donor TEXT;
  v_message_donor TEXT;
  v_title_admin TEXT;
  v_message_admin TEXT;
BEGIN
  -- Resolve names for better UX in timeline
  SELECT name INTO v_patient_name FROM patients WHERE id = NEW.patient_id;
  IF NEW.donor_id IS NOT NULL THEN
    SELECT name INTO v_donor_name FROM donor WHERE id = NEW.donor_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Appointment booked
    v_event_type := 'booked';

    v_title_patient := 'Appointment booked';
    v_message_patient := 'Your appointment is scheduled for ' || NEW.date || '.';

    v_title_admin := 'New appointment request';
    v_message_admin := COALESCE(v_patient_name, 'Patient') || ' booked for ' || NEW.date || '.';

    PERFORM create_notification(
      NEW.id,
      'patient',
      NEW.patient_id,
      NULL,
      v_event_type,
      v_title_patient,
      v_message_patient,
      jsonb_build_object('status', NEW.status, 'date', NEW.date)
    );

    PERFORM create_notification(
      NEW.id,
      'admin',
      NULL,
      NULL,
      v_event_type,
      v_title_admin,
      v_message_admin,
      jsonb_build_object('status', NEW.status, 'date', NEW.date, 'patient_id', NEW.patient_id)
    );

    -- Notify donor only when already assigned on insert
    IF NEW.donor_id IS NOT NULL THEN
      v_title_donor := 'New appointment assigned';
      v_message_donor := 'You are assigned for appointment on ' || NEW.date || '.';

      PERFORM create_notification(
        NEW.id,
        'donor',
        NULL,
        NEW.donor_id,
        'assigned',
        v_title_donor,
        v_message_donor,
        jsonb_build_object('status', NEW.status, 'date', NEW.date, 'patient_name', v_patient_name)
      );
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE path: fire only on important changes
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_event_type := lower(NEW.status);

      v_title_patient := 'Appointment status: ' || NEW.status;
      v_message_patient := 'Your appointment for ' || NEW.date || ' is now ' || NEW.status || '.';

      v_title_admin := 'Status changed to ' || NEW.status;
      v_message_admin := 'Appointment #' || NEW.id || ' for ' || COALESCE(v_patient_name, 'Patient') || ' is now ' || NEW.status || '.';

      PERFORM create_notification(
        NEW.id,
        'patient',
        NEW.patient_id,
        NULL,
        v_event_type,
        v_title_patient,
        v_message_patient,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'date', NEW.date)
      );

      PERFORM create_notification(
        NEW.id,
        'admin',
        NULL,
        NULL,
        v_event_type,
        v_title_admin,
        v_message_admin,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'date', NEW.date, 'patient_id', NEW.patient_id, 'donor_id', NEW.donor_id)
      );

      IF NEW.donor_id IS NOT NULL THEN
        v_title_donor := 'Appointment update: ' || NEW.status;
        v_message_donor := 'Appointment for ' || NEW.date || ' is now ' || NEW.status || '.';

        PERFORM create_notification(
          NEW.id,
          'donor',
          NULL,
          NEW.donor_id,
          v_event_type,
          v_title_donor,
          v_message_donor,
          jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'date', NEW.date, 'patient_name', v_patient_name)
        );
      END IF;
    END IF;

    -- Donor assignment change
    IF NEW.donor_id IS DISTINCT FROM OLD.donor_id AND NEW.donor_id IS NOT NULL THEN
      v_title_donor := 'New appointment assigned';
      v_message_donor := 'You are newly assigned for appointment on ' || NEW.date || '.';

      PERFORM create_notification(
        NEW.id,
        'donor',
        NULL,
        NEW.donor_id,
        'assigned',
        v_title_donor,
        v_message_donor,
        jsonb_build_object('date', NEW.date, 'patient_name', v_patient_name)
      );

      PERFORM create_notification(
        NEW.id,
        'admin',
        NULL,
        NULL,
        'assigned',
        'Donor assigned',
        COALESCE(v_donor_name, 'Donor') || ' assigned for appointment #' || NEW.id || '.',
        jsonb_build_object('date', NEW.date, 'patient_id', NEW.patient_id, 'donor_id', NEW.donor_id)
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_appointment_notifications ON appointments;
CREATE TRIGGER trg_create_appointment_notifications
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION create_appointment_notifications();

-- ============================================
-- 4. TIMELINE VIEW
-- ============================================
CREATE OR REPLACE VIEW vw_notifications_timeline AS
SELECT
  n.id,
  n.appointment_id,
  n.recipient_role,
  n.recipient_patient_id,
  n.recipient_donor_id,
  n.event_type,
  n.title,
  n.message,
  n.payload,
  n.read_at,
  n.created_at,
  p.name AS patient_name,
  d.name AS donor_name
FROM notifications n
LEFT JOIN patients p ON n.recipient_patient_id = p.id
LEFT JOIN donor d ON n.recipient_donor_id = d.id
ORDER BY n.created_at DESC;

-- ============================================
-- 5. COMMENTS
-- ============================================
COMMENT ON TABLE notifications IS 'In-app notification center timeline for patient, donor, and admin events';
COMMENT ON FUNCTION create_notification IS 'Low-level helper to insert a single notification';
COMMENT ON FUNCTION create_appointment_notifications IS 'Trigger function creating notifications for appointment insert/update events';
COMMENT ON VIEW vw_notifications_timeline IS 'Unified timeline view of notifications with recipient names';
