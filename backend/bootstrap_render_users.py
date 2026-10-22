"""Create the first production gate officer and admin through the bootstrap API.

Run locally after deploying the backend with BOOTSTRAP_SECRET configured:
  python bootstrap_render_users.py
"""
import getpass
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MIN_PASSWORD_LENGTH = 16
MAX_PASSWORD_BYTES = 72


class NoRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def prompt_account(label: str) -> dict[str, str]:
    full_name = input(f"{label} full name: ").strip()
    email = input(f"{label} email: ").strip().lower()
    if not full_name or not email:
        raise ValueError(f"{label} name and email are required")

    password = getpass.getpass(f"{label} password (not echoed): ")
    confirmation = getpass.getpass(f"Confirm {label} password: ")
    if password != confirmation:
        raise ValueError(f"{label} passwords do not match")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"{label} password must be at least {MIN_PASSWORD_LENGTH} characters")
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError(f"{label} password must be at most {MAX_PASSWORD_BYTES} UTF-8 bytes")

    return {"full_name": full_name, "email": email, "password": password}


def main() -> int:
    backend_url = input("Render backend base URL (https://...): ").strip().rstrip("/")
    parsed_url = urlsplit(backend_url)
    if (
        parsed_url.scheme != "https"
        or not parsed_url.netloc
        or parsed_url.path
        or parsed_url.query
        or parsed_url.fragment
        or parsed_url.username
        or parsed_url.password
    ):
        raise ValueError("Enter the HTTPS origin only, without a path or credentials")

    bootstrap_secret = getpass.getpass("Bootstrap secret (not echoed): ")
    if len(bootstrap_secret.encode("utf-8")) < 32:
        raise ValueError("Bootstrap secret must be at least 32 bytes")

    payload = {
        "office_gate": prompt_account("Office Gate"),
        "admin": prompt_account("Admin"),
    }
    if payload["office_gate"]["email"] == payload["admin"]["email"]:
        raise ValueError("Office Gate and Admin must use different email addresses")
    if payload["office_gate"]["password"] == payload["admin"]["password"]:
        raise ValueError("Office Gate and Admin must use different passwords")

    request = Request(
        f"{backend_url}/api/v1/auth/bootstrap",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Bootstrap-Secret": bootstrap_secret,
        },
        method="POST",
    )
    try:
        opener = build_opener(NoRedirectHandler)
        with opener.open(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        message = error.read().decode("utf-8", errors="replace")
        print(f"Provisioning failed (HTTP {error.code}): {message}", file=sys.stderr)
        return 1
    except URLError as error:
        print(f"Could not reach the backend: {error.reason}", file=sys.stderr)
        return 1

    print("Accounts created:")
    for account in result["created"]:
        print(f"  {account['email']} | {account['role']}")
    print("Remove BOOTSTRAP_SECRET from Render and redeploy before signing in.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, KeyboardInterrupt) as error:
        print(f"\nCancelled: {error or 'interrupted'}", file=sys.stderr)
        raise SystemExit(1)
