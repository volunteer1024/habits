#!/usr/bin/env python3
"""Receive one Habits backup snapshot per browser and store it on disk."""
import json
import os
import re
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA = Path(os.environ.get("SYNC_DATA", BASE / "data"))
INBOX = DATA / "inbox.jsonl"
LATEST = DATA / "latest.json"
CLIENTS = DATA / "clients"
WRITE_LOCK = threading.Lock()
CLIENT_ID = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
COLLECTIONS = (
    "tasks",
    "taskInstances",
    "habits",
    "habitLogs",
    "rewards",
    "redemptions",
    "pointTransactions",
    "settlements",
)
MAX_BODY = 16 * 1024 * 1024


def json_bytes(value):
    return json.dumps(value, ensure_ascii=False).encode("utf-8")


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def valid_pack(payload):
    if not isinstance(payload, dict):
        return None
    client_id = payload.get("clientId")
    if not isinstance(client_id, str) or CLIENT_ID.fullmatch(client_id) is None:
        return None
    if type(payload.get("schemaVersion")) is not int or payload.get("schemaVersion") != 1:
        return None
    exported_at = payload.get("exportedAt")
    if not isinstance(exported_at, str) or exported_at == "":
        return None
    state = payload.get("state")
    if not isinstance(state, dict):
        return None
    for key in COLLECTIONS:
        if not isinstance(state.get(key), list):
            return None
    return client_id


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _headers(self, content_type="application/json; charset=utf-8"):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", content_type)

    def _send(self, status, body=b"", content_type="application/json; charset=utf-8"):
        self.send_response(status)
        self._headers(content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _path(self):
        path = self.path.split("?", 1)[0]
        if len(path) > 1 and path.endswith("/"):
            path = path[:-1]
        return path

    def do_OPTIONS(self):
        self._send(204)

    def do_GET(self):
        path = self._path()
        if path == "/api/latest":
            self._read_file(LATEST)
            return
        prefix = "/api/sync/"
        if path.startswith(prefix):
            client_id = path[len(prefix) :]
            if CLIENT_ID.fullmatch(client_id) is None or "/" in client_id:
                self._send(400, json_bytes({"error": "无效的本机标识"}))
                return
            self._read_file(CLIENTS / f"{client_id}.json")
            return
        self._send(404, json_bytes({"error": "not found"}))

    def _read_file(self, path):
        if not path.is_file():
            self._send(404, json_bytes({"error": "not found"}))
            return
        try:
            self._send(200, path.read_bytes())
        except OSError:
            self._send(500, json_bytes({"error": "读取失败"}))

    def do_PUT(self):
        self.do_POST()

    def do_POST(self):
        if self._path() != "/api/sync":
            self._send(404, json_bytes({"error": "not found"}))
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send(400, json_bytes({"error": "无效的同步数据"}))
            return
        if length <= 0 or length > MAX_BODY:
            self._send(400, json_bytes({"error": "无效的同步数据"}))
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send(400, json_bytes({"error": "无效的同步数据"}))
            return
        client_id = valid_pack(payload)
        if client_id is None:
            self._send(400, json_bytes({"error": "无效的同步数据"}))
            return

        synced_at = utc_now()
        record = {
            "clientId": client_id,
            "syncedAt": synced_at,
            "schemaVersion": payload["schemaVersion"],
            "exportedAt": payload["exportedAt"],
            "state": payload["state"],
        }
        line = json.dumps({"clientId": client_id, "syncedAt": synced_at}, ensure_ascii=False) + "\n"
        try:
            with WRITE_LOCK:
                DATA.mkdir(parents=True, exist_ok=True)
                CLIENTS.mkdir(parents=True, exist_ok=True)
                with INBOX.open("a", encoding="utf-8") as inbox:
                    inbox.write(line)
                encoded = json.dumps(record, ensure_ascii=False, indent=2).encode("utf-8")
                LATEST.write_bytes(encoded)
                (CLIENTS / f"{client_id}.json").write_bytes(encoded)
        except OSError:
            self._send(500, json_bytes({"error": "保存失败"}))
            return
        self._send(201, json_bytes({"ok": True, "clientId": client_id, "syncedAt": synced_at}))

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


def bind_address():
    host = os.environ.get("SYNC_HOST", "127.0.0.1")
    port = int(os.environ.get("SYNC_PORT", "8787"))
    return host, port


if __name__ == "__main__":
    host, port = bind_address()
    DATA.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"habits sync listening on http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
