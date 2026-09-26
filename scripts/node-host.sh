#!/usr/bin/env bash
set -euo pipefail
unset NODE_TLS_REJECT_UNAUTHORIZED
# This optional adapter is for the development server's old glibc only.
# Ordinary machines should run node >=24 directly.
writing_dir="$(cd "$(dirname "$0")/../.." && pwd)"
loader=/public/home/wangzy/.linuxbrew/opt/glibc/lib/ld-linux-x86-64.so.2
if [[ -x "$loader" && -x "$writing_dir/.tooling/node-v24.20.0-linux-x64/bin/node" ]]; then
  unset NODE_OPTIONS
  exec "$loader" --library-path /public/home/wangzy/.linuxbrew/opt/glibc/lib:/public/home/wangzy/.linuxbrew/lib "$writing_dir/.tooling/node-v24.20.0-linux-x64/bin/node" "$@"
fi
exec node "$@"
