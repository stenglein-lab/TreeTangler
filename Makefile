default: BUNDLES

# The local copy of this file .git_sync_npm
#   is ignored by the repository so it can sync
#   your local node_modules with package.json.
# Therefore, if package.json is newer than 
# .git_sync_npm, it will run 'npm update'
# and 'touch .git_sync_npm'
.git_sync_npm: package.json
	npm update
	touch $@

	grunt

BUNDLES: update
	grunt

update: .git_sync_npm



	
