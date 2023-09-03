const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
const bcryptjs = require("bcryptjs")
const ws = require("ws");
const fs = require("fs");



//IRRELEVANT, CALL THIS FUNCTION IF YOU WANT TO CLEAR MESSAGES and USERS IN DATABASE
async function deleteDatabase() {
    await Message.deleteMany({});
    await User.deleteMany({});
}



require("dotenv").config(); //Initialise .env usage
mongoose.connect(process.env.MONGO_URL); //Connection to database on mongoose

//Middleware
const app = express(); //Initialise express framework
app.use("/uploads", express.static(__dirname + "/uploads")); //Allows you to access files through URL endpoints/links
app.use(express.json()); //Parses incoming requests bodies   with JSON payloads
app.use(cookieParser()); //Parses incoming cookies
app.use(cors({
    origin: ["https://michaelchatapp.onrender.com"], // "http://localhost:5174", "http://localhost:5173"], //NOTE: true = Anywhere can send a request
    credentials: true, //credentials include cookies, authorization headers, and TLS client certificates
    methods: ["GET", "POST"]
}));

const bcryptSalt = bcryptjs.genSaltSync(10);

async function getUserDataFromRequestCookie(req) {
    /*
    return new Promise((resolve, reject) => {
        const token = req.cookies?.token; //If req.cookies.token is undefined or null, return undefined (instead of throwing an error).
        if (token) {
            jwt.verify(token, process.env.JWT, {}, (err, result) => { //Verifies that the token is valid and decodes it back to normal, returned as "result".
                if (err) throw err;
                resolve(result); //Sends back the "result" to front-end after token has been decoded.
            });
        } else {
            reject("No Token");
        }
    });
    */
   return new Promise((resolve, reject) => {
    const token = req.cookies?.token; //If req.cookies.token is undefined or null, return undefined (instead of throwing an error).
    if (token) {
        jwt.verify(token, process.env.JWT, {}, async (err, result) => { //Verifies that the token is valid and decodes it back to normal, returned as "result".
            if (err) throw err;
            const searchUser = result.userId;
            const foundUser = await User.findOne({ _id: searchUser }); //Checks User exists first
            if (foundUser) resolve(result); //Sends back the "result" to front-end after token has been decoded.
            else {
                await Message.deleteMany({$or: [ {sender: searchUser}, {recipient: searchUser} ]});
                reject("DeleteToken");
            }
        });
    } else {
        reject("NoToken");
    }    
   });
}

app.get("/test", (req, res) => { //Testing server by running get request on localhost/4000/test
    res.json("test ok");
});

app.get("/", (req, res) => {
    res.json("Server Online");
});

app.get("/profile", async (req, res) => { //FETCHING USER DATA FROM DB
    await getUserDataFromRequestCookie(req).then((result) => {
        res.json(result);
    }).catch((err) => {
        if (err === "DeleteToken") {
            res.cookie("token", "", { sameSite: "none", secure: true }).status(401).json("User not found"); //Difference here is the cookie returned has an empty token now upon logging out
        }
        else if (err === "NoToken") {
            res.status(401).json('No cookie or token');
        }
    });
});

app.post("/login", async (req, res) => { //LOGIN EXISTING USER
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username: username });
    if (foundUser) {
        const isSame = bcryptjs.compareSync(password, foundUser.password);
        if (isSame) {
            jwt.sign({ userId: foundUser._id, username: username }, process.env.JWT, {}, (err, token) => { //More in README.md
                if (err) throw err;
                res.cookie("token", token, { sameSite: "none", secure: true }).status(201).json({ //Responds with 1)A cookie named "token" holding the JWT 2)success status(201) 3)the userId as JSON
                    id: foundUser._id,                                                      //Note: sameSite:none allows cookie sending to different IPs or URL 
                });                                                                           //Note: secure:true ensures cookie that we have securely encoded our message(using JWT)
            });
        }
        else {
            res.status(401).json("incorrect");
        }
    }
    else {
        res.status(401).json("notFound");
    }
});

app.post("/logout", (req, res) => {
    res.cookie("token", "", { sameSite: "none", secure: true }).status(201).json("ok"); //Difference here is the cookie returned has an token now upon logging out
});

app.post("/register", async (req, res) => { //REGISTER NEW USER
    const { username, password } = req.body;
    try {
        const hashedPassword = bcryptjs.hashSync(password, bcryptSalt);
        const createdUser = await User.create({ //Registering a new user into Mongo database
            username: username,
            password: hashedPassword
        });
        jwt.sign({ userId: createdUser._id, username: username }, process.env.JWT, {}, (err, token) => { //More in README.md
            if (err) throw err;
            res.cookie("token", token, { sameSite: "none", secure: true }).status(201).json({ //Responds with 1)A cookie named "token" holding the JWT 2)success status(201) 3)the userId as JSON
                id: createdUser._id,                                                      //Note: sameSite:none allows cookie sending to different IPs or URL 
            });                                                                           //Note: secure:true ensures cookie that we have securely encoded our message(using JWT)
        });
    } catch (err) {
        res.status(401).json("nameUsed");
    }

});

app.get("/messages/:userId", async (req, res) => { //NOTE: the "":userId" is an additional parameter in the endpoint, it can be found in req.params
    const { userId } = req.params;
    const userData = await getUserDataFromRequestCookie(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({         //"$in" searches values of a field that matches any value in the specified array. We want all messages where:
        sender: { $in: [userId, ourUserId] },     //1)sender = userId or ourUserId
        recipient: { $in: [userId, ourUserId] }   //2)recipient = userId or ourUserId
    }).sort({ createdAt: 1 }); //Sort messages in chronological order timestamp
    res.json(messages);
})

app.get("/people", async (req, res) => {
    const users = await User.find({}, { "_id": 1, username: 1 });
    res.json(users);
});



const server = app.listen(4000);



const wss = new ws.WebSocketServer({ server }); //Turn our server into a wss(webSocketServer)
wss.on("connection", (connection, req) => { //On any req made from client to initiate connection

    function notifyAboutOnlinePeople() {
        // Notify everyone about online people (when someone connects)
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify(
                { online: [...wss.clients]
                    .filter(e => e.userId !== undefined) //Incase there is an undefined bugged client 
                    .map(e => ({ userId: e.userId, username: e.username })) } //object online: which contains objects of all online users
            ));
        });
    }

    connection.isAive = true;

    connection.timer = setInterval(() => {
        connection.ping(); //constantly sending "pings" to client to check if connection is still alive

        /*
        const test = {};
        [...wss.clients].forEach(e => test[e.userId] = e.username);
        console.log(test);
        */

        connection.deathTimer = setTimeout(() => { //If haven't recieved "pong" in the next second, isAlive becomes false
            connection.isAlive = false;
            clearInterval(connection.timer);
            connection.terminate(); //Kill the connection
            notifyAboutOnlinePeople();
        }, 1000);
    }, 3500);

    connection.on("pong", () => {
        clearTimeout(connection.deathTimer);
    });

    // Reads the user and id from the cookie(through jwt.verify decryption) upon first connection
    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(";").find(str => str.startsWith("token="));
        if (tokenCookieString) {
            const token = tokenCookieString.split("=")[1];
            if (token) {
                jwt.verify(token, process.env.JWT, {}, (err, result) => {
                    if (err) throw err;
                    const { userId, username } = result;
                    connection.userId = userId;         //Here we are saving user information to connection, where all connections are held in wss
                    connection.username = username;     //in a variable wss.clients
                });
            }
        }
    }

    // Whenever you recieve a message from any of the clients/connections
    connection.on("message", async message => {
        const messageData = JSON.parse(message.toString());
        const { recipient, text, file } = messageData;
        let filename = null
        if (file) {
            const parts = file.name.split(".");
            const ext = parts[parts.length - 1];
            filename = Date.now() + "." + ext;
            const path = __dirname + "/uploads/" + filename;
            const bufferData = new Buffer(file.data.split(",")[1], "base64");
            fs.writeFile(path, bufferData, () => {
                console.log("file saved: " + path);
            });
        }
        if (recipient && ( text || file)) {
            const createdMessage = await Message.create({ //Registering a new message into Mongo database
                sender: connection.userId,
                recipient: recipient,
                text: text,
                file: file ? filename : null
            });
            [...wss.clients]
                .filter(e => e.userId === recipient) //Locate the recipient that client is sending message to
                .forEach(e => e.send(JSON.stringify({ //Send the message as the following JSON object
                    text: text,
                    sender: connection.userId,
                    recipient: recipient,
                    file: file ? filename : null,
                    _id: createdMessage._id,
                })));
        }
    });

    //console.log(req.connection.remoteAddress);

    notifyAboutOnlinePeople(); //Let everyone know your online upon logging in

});