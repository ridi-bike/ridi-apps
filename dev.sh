set -e 

systemctl is-active --quiet docker.socket || sudo systemctl start docker.socket

supabase start

mprocs
