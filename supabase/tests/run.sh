#!/usr/bin/env bash
# Applies the migrations to a throwaway database and runs the policy tests.
#
# Needs a superuser connection through the usual PG* variables, e.g.
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash supabase/tests/run.sh
# The database named below is dropped and recreated on every run.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
db="${MBC_TEST_DB:-mbc_policy_test}"

psql -d postgres -v ON_ERROR_STOP=1 -q \
  -c "drop database if exists ${db}" \
  -c "create database ${db}"

run() {
  echo "-- $(basename "$1")"
  psql -d "${db}" -v ON_ERROR_STOP=1 -q -f "$1"
}

run "${here}/00_supabase_stub.sql"
for migration in "${here}"/../migrations/*.sql; do
  run "${migration}"
done
run "${here}/policies.sql"

echo "policies hold"
