

Loop54 JS Demo for customer implementations
===========================================

This is a JavaScript Demo using a Loop54 SaaS API backend to implement an e-commerce product page. 

Features
--------

Some of the implemented features:

- Product search
- Autocomplete
- Categories filtering
- Personalisation
- Tracking Events 
	- Click
	- AddToCart
	- Purchase

Technology
----------

The JS demo is written in ES6 using Node.JS, babel and browserify. 
Scripts are included to transpile to ES5. Promises are used and therefore en an ES6-promise polyfill for IE is included.

Getting started
---------------

You can start by running the reference demo locally and modify the config in /src/index.js to reflect your environment/setting. Feel free to change it according to your needs/current solution. At the top of the file you can easily modify the config variable to reflect your Loop54 API parameters. To then include the demo on your site, adapt the guiConfig variable and include the transpiled JS-file on your site. 

Developer
---------

- source files in /src
- rebuild triggered on save in /src directory, refresh browser to see changes after build
- Adaptable to your HTML setup in /src/index.js
  - Change ID:s and classes
  - Change engine URL to point to your engine (dev or prod)
  - Copy or change code as needed, reference implementation

Assuming you have git and node.js installed.

1. git clone <this repo url>

2. install dependencies by running: 
	
    > npm install

3. To install the development tool ‘watch’, run: 

	> npm install -g watch

4. Now you can run the the watch tool, it will watch code folders for change and transpile if necessary, and at the same time launch a static webserver at ip:port defined in server.js. To do this run:

	Mac/*nix: 
	
	> npm run dev
	
	Windows: In git-bash: 
	
	> npm run watch:demo & npm run server

The demo will be transpiled using browserify and babel to '/bin/Scripts/loop54-demo-1.0.0.js’. This will be done on file change when running 

	> npm run dev

or whenever you run 

	> npm run babelify:demo
	
See package.json for further details on the setup of the transpiling.

Only using the lib
------------------

If you don't want to use the demo code, it is also possible to use the core lib directly, which will be exposed as global.Loop54 in the browser env once included (available from npmjs.org. For example usage, see this demo.
