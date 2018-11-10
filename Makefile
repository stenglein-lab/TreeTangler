default:
	[ -n "$(git log -1 --pretty='%ad' --since=$(date -r node_modules "+%Y-%m-%d") package.json)" ] && npm update || echo "node modules are up-to-date"
	grunt
