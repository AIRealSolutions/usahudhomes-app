#!/usr/bin/env python3
"""
Get a YouTube refresh token for the Video Library's "Upload to YouTube" button.

1. Put client_secrets.json (downloaded from Google Cloud Console) next to this script.
2. Run:  python3 get_youtube_token.py
3. A browser opens — sign in with the Google account that owns your YouTube
   channel and click Allow.
4. Copy the three values it prints into Supabase:
   Dashboard → Edge Functions → Secrets.

Needs:  pip install google-auth-oauthlib
"""
import json, sys
from pathlib import Path

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    sys.exit("Missing dependency: pip install google-auth-oauthlib")

SECRETS = Path(__file__).parent / "client_secrets.json"
if not SECRETS.exists():
    sys.exit(f"client_secrets.json not found. Put it here: {SECRETS}")

flow = InstalledAppFlow.from_client_secrets_file(
    str(SECRETS), scopes=["https://www.googleapis.com/auth/youtube.upload"]
)
# prompt=consent + offline access guarantees Google returns a refresh token
creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

info = json.loads(SECRETS.read_text())
client = info.get("installed") or info.get("web") or {}

if not creds.refresh_token:
    sys.exit("Google did not return a refresh token. Remove the app's access at "
             "myaccount.google.com/permissions and run this again.")

print("\nAdd these three secrets in Supabase → Edge Functions → Secrets:\n")
print(f"YOUTUBE_CLIENT_ID      = {client.get('client_id')}")
print(f"YOUTUBE_CLIENT_SECRET  = {client.get('client_secret')}")
print(f"YOUTUBE_REFRESH_TOKEN  = {creds.refresh_token}")
print("\nKeep these private — they allow uploading to your channel.\n")
