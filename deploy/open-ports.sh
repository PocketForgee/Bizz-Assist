#!/usr/bin/env bash
# Run once ON the server: opens 80 and 443 in iptables (Oracle's Ubuntu image allows only 22) and keeps the rules
# across reboots. Also open both ports in the OCI console: the instance's subnet > Security List > Ingress rules,
# source 0.0.0.0/0, TCP 80 and TCP 443.
set -euo pipefail
for port in 80 443; do
  sudo iptables -C INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null && continue
  # insert just before Oracle's catch-all REJECT rule (or at the top if there is none)
  pos=$(sudo iptables -L INPUT -n --line-numbers | awk '$2 == "REJECT" { print $1; exit }')
  sudo iptables -I INPUT "${pos:-1}" -p tcp -m state --state NEW --dport "$port" -j ACCEPT
done
if command -v netfilter-persistent >/dev/null; then
  sudo netfilter-persistent save
else
  echo "netfilter-persistent not installed: sudo apt-get install -y iptables-persistent, then rerun" >&2
fi
sudo iptables -L INPUT -n --line-numbers | head -20
