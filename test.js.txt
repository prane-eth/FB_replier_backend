const MongoClient = require('mongodb').MongoClient

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

var messages = {   // dummy data
  '365836151': {
      userReply: '2021-09-02T02:49:10+0000',
      pageReply: '2021-09-02T02:49:10+0000',
      lastReply: '2021-09-02T02:49:10+0000',
      firstName: 'Dummy',
      lastName: 'Chat',
      fullName: 'Dummy Chat',
      userEmail: 'user@email.com',
      userProfilePic: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyb_QltThW67ODgBYOo4qFR8n7Xai2JLQhIVEDQ2cpJ8S2Hs5eDmlU9R3JMnvrVn99gkw&usqp=CAU",
      msgSource: 'Facebook DM',
      messages: [
          {from: 'user Name', message: 'this is comment'},
          {from: 'page', message: 'reply given by page'},
          {from: 'user Name', message: 'Got item replaced. Thank you.'},
          {from: 'page', message: 'Thank you for choosing Amazon'},
      ]
  },
}
// updateMessages(messages, '123')


const getOldMessages = (pageID, callback) => {
  MongoClient.connect(uri, function(err, client) {
    if (err)
      return console.log("Error connecting to DB ");

    var collectionName = 'page' + pageID
    var db = client.db('myFirstDatabase')
    var collection = db.collection(collectionName)

    try {
      // find collections which have _id != 0  (get all data)
      // var response = collection.find({_id: { $ne: '0' }})
      // callback(response, client)
      collection.find({_id: { $ne: '0' }}).toArray((err, arr) => {
        if (err)
          console.log('error' + err.toString())
        callback(arr, client)
      });
      // client.close();
    } catch (err) {
      console.log('Error loading old messages')
    }
  });
}
// var express = require("express");
pageID = '101135272313869'
this.message = null;
getOldMessages(pageID, (response, client) => {
  this.message = response[0]
  this.message = JSON.parse(JSON.stringify(this.message))
  console.log(typeof (this.message))
  console.log(this.message.toString())  //.messages)
  client.close();
});
