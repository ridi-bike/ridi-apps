#! /usr/bin/bash

trap 'kill ${jobs -p}g' EXIT

web_url="http://localhost:3000"
mobile_url="http://localhost:9876"
mobile_pipe=/tmp/mobile_pipe
ngrok_url="http://localhost:4040/api/tunnels"
trap "rm -f $mobile_pipe" EXIT
if [[ ! -p $mobile_pipe ]]; then
    mkfifo $mobile_pipe
fi

systemctl is-active docker.socket --quiet || sudo systemctl start docker.socket

pnpm dev:db

pnpm dev:web > /dev/null &
until curl -s -f -o /dev/null "$web_url"; do
	echo "Waiting for Web to start"
	sleep 1
done

ngrok http $web_url > /dev/null &
until curl -s -f -o /dev/null "$ngrok_url"; do
	echo "Waiting for ngrok to start"
	sleep 1
done
export RIDI_API_URL="$(curl -s "$ngrok_url" | jq -r ".tunnels[0].public_url")/api"

pnpm dev:mobile > /dev/null <$mobile_pipe &
sleep 1
echo "o" >$mobile_pipe
until curl -s -f -o /dev/null "$mobile_url"; do
	echo "Waiting for NativeScriptPreview to start"
	sleep 2
done

RED='\033[0;31m'
GREEN='\033[0;32m'
NOCOLOR='\033[0m' # No Color
echo -e "${GREEN}OK${NOCOLOR}"
echo -e "Web: ${GREEN}$web_url${NOCOLOR}"
echo -e "NativeScriptPreview: ${GREEN}$mobile_url${NOCOLOR}"
echo -e "Api endpoint: ${GREEN}$RIDI_API_URL${NOCOLOR}"
echo -e "Api endpoint url variable ${GREEN}RIDI_API_URL${NOCOLOR}"
sleep infinity
