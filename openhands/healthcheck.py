from __future__ import annotations

import socket
import sys


def main() -> int:
    try:
        with socket.create_connection(("127.0.0.1", 3000), timeout=3):
            return 0
    except OSError:
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
