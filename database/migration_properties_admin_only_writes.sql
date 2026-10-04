-- Only admins may add, edit or delete properties.
--
-- Previously four policies let ANY signed-in user (including buyers with a
-- free account) insert, update or delete listings. They are rewritten to
-- require is_admin(). The HUD import, scripts and /api routes use the service
-- key, which bypasses RLS, so they are unaffected.
-- Reading is unchanged: the public sees active listings and signed-in users can
-- still read every listing (broker referrals can point at delisted homes).

CREATE POLICY "Admins manage properties" ON properties
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Replaces the read access the old "manage" policy gave every signed-in user
CREATE POLICY "Signed-in users can read properties" ON properties
  FOR SELECT TO authenticated
  USING (true);

ALTER POLICY "Allow authenticated delete" ON properties
  TO authenticated USING (is_admin(auth.uid()));
ALTER POLICY "Allow authenticated insert" ON properties
  TO authenticated WITH CHECK (is_admin(auth.uid()));
ALTER POLICY "Allow authenticated update" ON properties
  TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
ALTER POLICY "Authenticated users can manage properties" ON properties
  TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER POLICY "Allow authenticated delete" ON properties RENAME TO "Admins delete properties";
ALTER POLICY "Allow authenticated insert" ON properties RENAME TO "Admins insert properties";
ALTER POLICY "Allow authenticated update" ON properties RENAME TO "Admins update properties";
ALTER POLICY "Authenticated users can manage properties" ON properties RENAME TO "Admins manage all properties";
