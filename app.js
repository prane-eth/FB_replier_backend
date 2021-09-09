

'use strict';

var express = require("express");
var request = require("request");
const MongoClient = require('mongodb').MongoClient
const cors = require('cors');


// MongoDB part

var user = 'user1'
var pass = 'pass1234'
var uri = 'mongodb+srv://' + user + ':' + pass
    + '@cluster0.nk3zq.mongodb.net/myFirstDatabase'
    + '?retryWrites=true&w=majority';

const updateMessages = (messages, pageID) => {
  MongoClient.connect(uri, function(err, client) {
    if (err)
      return console.log("Error connecting to DB ");

    var collectionName = 'page' + pageID
    var db = client.db('myFirstDatabase')
    var collection = db.collection(collectionName)

    try {   // delete all existing data
      collection.deleteMany({})
      console.log('Deleted data from DB')
    } catch (err) {
      console.log('DB Deletion error')
      console.log(err.toString())
    }

    // insert data
    collection.insertOne(messages, (err, res) => {
      if (err)
        console.log("Error 2: " + err.toString())
      else
        console.log('inserted to DB')
      client.close();
    })
  });
}



// Socket.io part

var app = express();

var port = process.env.PORT || 5000;

var httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    // origin: "https://google.com",
    methods: ["GET", "POST"]
  }
});
this.socket = null;

io.on("connection", socket => {
  this.socket = socket;
  socket.emit('SocketIO Server online');

  // handle the event which is sent with socket.send()
  socket.on("connectSocket", (pageID) => {
    console.log('Client connected: ' + pageID);
    socket.emit('SocketIO connected with client');
  });
  socket.on('replyMessage', (pageToken, userID, message) => {
    console.log('sending reply');
    sendMessage(userID, message, pageToken);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  socket.on('updateMessages', (messages, pageID) => {
    console.log('storing new messages');
    updateMessages(messages, pageID);
    console.log('stored new messages')
  })
  socket.on('requestOldMessages', (pageID) => {
    console.log('got request for old messages')
    this.message = null
    request({
      'uri': 'http://rpanel-be.herokuapp.com/oldMessages/'+pageID,
      // 'uri': 'http://localhost:5000/oldMessages/'+pageID,
      'method': 'GET'
    }, (err, _res, body) => {
      if (err)
        console.error('Unable to send message:' + err.toString());
      
      body = JSON.parse(body)
      body = body[0]
      socket.emit('oldMessages', body)
      console.log('sent old messages')
      // console.log(body)
    });
  })
});

/* https://cloud.mongodb.com/v2/6129c2d2b742310d77d14f18#clusters/connect?clusterId=Cluster0

Cmd to connect mongo
mongosh "mongodb+srv://cluster0.nk3zq.mongodb.net/myFirstDatabase" \
  --username user1 -p pass1234

db.collectionName.find().forEach(printjson)
*/

/* https://raw.githubusercontent.com/fbsamples/messenger-platform-samples/master/quick-start/app.js
https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/

To run this code:
  1. Deploy this code to a server running Node.js
  2. Run `yarn install`
  3. Add your VERIFY_TOKEN and PAGE_ACCESS_TOKEN to your environment vars
*/

// Webhook server code


app.use(express.urlencoded({ extended: false }));
app.use(express.json());  // Parse application/json
// app.use(cors({origin: 'http://localhost:3000'}));
app.use(cors())

app.get('/', (req, res) => {
  res.status(200).send('welcome')
})

app.get('/oldMessages/:pageID', function (req, res) {
  var user = 'user1'
  var pass = 'pass1234'
  var uri = 'mongodb+srv://' + user + ':' + pass
      + '@cluster0.nk3zq.mongodb.net/myFirstDatabase'
      + '?retryWrites=true&w=majority';
  MongoClient.connect(uri, function(err, client) {
    if (err)
      console.log('error 1 : ' + err.toString())
    var pageID = req.params.pageID
    var collectionName = 'page' + pageID
    var db = client.db('myFirstDatabase')
    var collection = db.collection(collectionName)

    try {
      collection.find({_id: { $ne: '0' }}).toArray((err, arr) => {
        if (err)
          console.log('error' + err.toString())
        
        res.jsonp(arr);
      });
      // client.close();
    } catch (err) {
      console.log('Error loading old messages')
    }
  });
})

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {  // GET request is for webhook verification
  const VERIFY_TOKEN = 'Callback';
  
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      console.log('WEBHOOK verification failed');
      res.sendStatus(403);
    }
  }
  else
    res.status(200).send('no token found');
});

app.post('/webhook', (req, res) => {   // POST request is for receiving messages
  let body = req.body;
  console.log('\n\n got a message')

  // Checks if this is an event from a page subscription
  if (body.object === 'page') {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
      let event = entry.messaging[0];
      console.log(event);

      let userID = event.sender.id;
      let sendTime = event.timestamp;
      let msgText = event.message.text;
      // let msgId = event.message.id;

      console.log('Sender ID: ' + userID);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (event.message)
        handleMessage(userID, msgText, sendTime);
    });
    res.status(200).send('EVENT_RECEIVED');  // status 200 OK
  } else {
    res.sendStatus(404);  // Error 404: Page not found
  }
});

const handleMessage = (userID, msgText, sendTime) => {
  if (msgText) {
    // Create the payload for a basic text message, which
    // will be added to the body of your request to the Send API
    // sendMessage(userID, `Your message: ${msgText}`);   // Send the response to sender/user
    io.emit('newMessage', userID, msgText, sendTime);  // Send to frontend react app
  } else
    console.log('No text mentioned')
}

// Sends response messages via the Send API
const sendMessage = (userID, msgText, pageToken='') => {
  let response = { 'text': msgText };
  // The page access token we have generated in your app settings
  pageToken = pageToken || 'EAAFRHZBzA39kBAG2PHWR0vwqVKdv393PzJCvcfqBZB1RhisMtqGJ81sZAYcvZCcJg7w49fLKxOhjuMEWRdEhQMZC6wNXcVhpCdAPjmOJWXShQ3QQRZCrFsg9ib78KO7ndX3sAxtfZACYZBSOsCCSxyn1qiTZC3MRhsmCFVBBbssRWooscFOOeXPAQYrF1ew1w5nH5M0ALPwGNLZCL6p9TZCU6Qj';
  let requestBody = {
    'recipient': { 'id': userID },
    'message': response
  };

  // Send the HTTP request to the Messenger Platform
  request({
    'uri': 'https://graph.facebook.com/me/messages',
    'qs': { 'access_token': pageToken },
    'method': 'POST',
    'json': requestBody
  }, (err, _res, _body) => {
    if (!err)
      console.log('Reply sent!');
    else
      console.error('Unable to send message:' + err);
  });
}

httpServer.listen(port);
console.log('Your app is listening on port ' + port);
