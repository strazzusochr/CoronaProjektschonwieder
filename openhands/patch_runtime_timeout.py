from __future__ import annotations

import os
from pathlib import Path


TARGET = Path("/app/openhands/runtime/impl/eventstream/eventstream_runtime.py")
OLD = "stop=tenacity.stop_after_delay(120) | stop_if_should_exit(),"
NEW = (
    "stop=tenacity.stop_after_delay("
    'int(os.environ.get("SANDBOX_REMOTE_RUNTIME_INIT_TIMEOUT", "420"))'
    ") | stop_if_should_exit(),"
)


def main() -> int:
    text = TARGET.read_text(encoding="utf-8")
    if NEW in text:
        print("OpenHands runtime timeout patch already applied")
        return 0
    if OLD not in text:
        print("OpenHands runtime timeout patch skipped: expected marker missing")
        return 2
    TARGET.write_text(text.replace(OLD, NEW), encoding="utf-8")
    print("OpenHands runtime timeout patch applied")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
