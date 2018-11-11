default: BUNDLES

# actual bundles and their dependencies are specified in Gruntfile.js
# target 'update' will execute 'npm update' if needed
BUNDLES: update
	grunt

# update: Wrapper around 'npm update' uses 
# '.git_sync_npm' as its dependency, which
# is written by .git_sync_npm:
# below after calling 'npm update'
update: .git_sync_npm

.git_sync_npm: package.json
	npm update
	touch $@
