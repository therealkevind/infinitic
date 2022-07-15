# npm i --save-dev node@16 && npm config set prefix=$(pwd)/node_modules/node && export PATH=$(pwd)/node_modules/node/bin:$PATH && npm install && node --version && node .

export N_PREFIX=$(pwd)/.config/n && npm i -g n && ./node_modules/node/lib/node_modules/n/bin/n 16 && export PATH=$(pwd)/.config/n/bin:$PATH && .config/n/bin/npm install && .config/n/bin/node .