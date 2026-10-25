CREATE OR REPLACE FUNCTION revoke_disabled_account() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF OLD.is_active AND NOT NEW.is_active THEN
    UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=NEW.id AND revoked_at IS NULL;
    UPDATE access_grants SET is_revoked=TRUE WHERE patient_id=NEW.id OR doctor_id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS revoke_disabled_account_trigger ON users;
CREATE TRIGGER revoke_disabled_account_trigger AFTER UPDATE OF is_active ON users
FOR EACH ROW EXECUTE FUNCTION revoke_disabled_account();
REVOKE ALL ON FUNCTION revoke_disabled_account() FROM PUBLIC;
