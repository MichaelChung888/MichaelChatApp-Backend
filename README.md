# Initalising NodeJS (backend)
In terminal, cd to "backend" and type "npm init". It wil ask a few questions, just press enter for each one. 
Install following dependencies:

1 - "yarn add express" or "npm i express" = HTTP framework for running node servers
2 - "yarn add mongoose" or "npm i mongoose" = connection to database
3 - "yarn add dotenv" or "npm i dotenv" = allows use of .env file
4 - "yarn add jsonwebtoken" or "npm i jsonwebtoken" = allows a good way of securely transmitting information between parties.
5 - "yarn add cors" or "npm i cors" = allows us to process requests from other hosts (hence can call server anywhere from the internet)
6 - "yarn add ws" or "npm i ws" = websocket package
7 - "npm i --save-dev nodemon" = allows us to run the server in dev-mode(automatic refresh upon changes)

Currently under scripts in package.json, there is "test": "echo \"Error: no test specified\" && exit 1".
Change this to "start": "nodemon index.js" to make nodemon run our server.


# JsonWebToken
A JWT represents content/data secured with digital signatures using JSON-based data structures.
(More here "https://jwt.io/introduction")

1 - Header = two parts: the type of the token(which is JWT) and the signing algorithm being used(e.g HMAC SHA256 or RSA).
2 - Payload = contains claims(statements about an entity (typically, the user) and additional data).
3 - Signature = used to verify that the sender of the JWT is who it is and to ensure that the message wasn't changed along the way.

They are then encoded into Base64 format and seperated by dots (.): "xxxxx.yyyyy.zzzzz"


# JsonWebToken .sign()
.sign() creates a JSON Web Token for that user and returns the token in the form of a JSON string. It can take 4 parameters:

1 - Response object         = The data which is an object literal, buffer or string representing valid JSON.
2 - Secret Key              = A string that will be used for encoding the signature
3 - Options                 = Additional options for encoding the JWT
4 - Callback                = If callback provided, .sign() becomes async and the callback is called with the err or the JWT.


# Chaining Operator (?.)
The "?." operator returns undefined if an object is undefined or null (instead of throwing an error).



# await and async
An async function declaration creates an AsyncFunction object. 
Each time an async function is called, it returns a new Promise which will either: 
- be resolved with the value returned by the async function
- rejected with an exception uncaught within the async function.

await expressions make promise-returning functions behave as though they're synchronous by suspending execution until the returned promise is fulfilled or rejected.