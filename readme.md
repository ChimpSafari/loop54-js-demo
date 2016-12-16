```
,--.                        ,-----.  ,---.
|  |    ,---.  ,---.  ,---. |  .--' /    |
|  |   | .-. || .-. || .-. |'--. `\/  '  |
|  '--.' '-' '' '-' '| '-' '.--'  /'--|  |
`-----' `---'  `---' |  |-' `----'    `--'
                     `--'
```
# Loop54 Demo Application
This is a Javascript Demo using the Loop54 js library to implement an e-commerce product page for demonstration purposes. It is heavily dependent on jQuery and jQuery UI.

To read more about our API we refer you to our documenation page (https://www.loop54.com/docs)

## Read before use
This is an example of how one could implement and use our javascript library and should be used as such, if you choose to use this application or parts of it in your production environment you should be aware that we do not offer support on this code once it's modified in any way. 

Further more we cannot promise that this example will work in all browsers or on all platforms, you should always test it yourselves before using it in production to see that it fits your own requirements.

## Features
In this application we show how to use our javascript library (https://www.npmjs.com/package/loop54-js-lib)

You will find example use of the following features in this application:
* search (https://www.loop54.com/docs/product-search-site-search)
  * continous scrolling and pagination
  * direct hits
  * recommended product
  * error handling
* event tracking (https://www.loop54.com/docs/product-search-event-tracking)
  * purchase
  * click
* autocomplete (https://www.loop54.com/docs/product-search-autocomplete)
* faceting (filters) (https://www.loop54.com/docs/faceted-search-navigation)

## Installation
You need to have nodeJS and the node package manager, npm, installed:

`npm install` to install all dependencies

`npm install -g watch` (used to monitor directory changes)

## Usage
This application is meant for development, but if you wish to build it to use it in production
you should follow the steps under the "production" chapter below.

This demo application comes ready to use with our example product catalog (HelloWorld) which you are free to use and test for the purpose of understanding our API.

If you wish to test this application with your own catalog you need to contact our support at support@loop54.com if you haven't already recieved your config file.

### development
On Mac/*nix: 

`npm run dev`

On Windows we assume you use some kind of bash (like git-bash): 
	
`npm run watch:demo & npm run server`

Everything in /src will be transpiled using browserify and babel to '/bin/scripts/loop54-demo-{version}.js'.

Then open http://localhost:5001/ and it will load customer.json for you.

### production
To make a one time build of /src you can run the following command

`npm run babelify:demo`
	
See package.json for further details on the dependencies and details of the transpiling.
