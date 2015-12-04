//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var path     = require('path');
var q        = require('q');
var qhttp    = require('q-http');
var log      = require('npmlog');
var express  = require('express');
var request  = require('request');
var uuid     = require('uuid');
var bodyParser = require('body-parser');
var NodeCache = require( "node-cache" );

var ttlCache = new NodeCache( { stdTTL: 28800, checkperiod: 600 } );  // cache this for eight hours

var awsCredentials = require('./aws.credentials.json');


var aws      = require('aws-sdk');
aws.config.update({region: 'us-east-1'});
aws.config.update(awsCredentials);


// var http = require('http');

// var async = require('async');
// var socketio = require('socket.io');

var LOG_PREFIX_STARTUP = "STARTUP";

var bible = require('./nkjv-full.json');
bible.bookNumbers={};
for(var b=0; b<bible.books.length; b++){
  bible.bookNumbers[bible.books[b].name.toLowerCase()]=b;
}

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var app = express();

// handle CORS on all API requests
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

///////////////////////
// handle static requests
app.use(express.static(path.resolve(__dirname, 'client')));
app.use('/bower',express.static(path.resolve(__dirname, 'bower_components')));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


/////////////////////////
// routes go here...
// app.get('/api/story', handleGetAllStories);
// app.get('/api/story/:publisherid', handleGetAllStoriesForPublisher);
// app.get('/api/story/:publisherid/:storyid', handleGetStory);
// app.delete('/api/story/:publisherid/:storyid', handleDeleteStory);
app.get('/api/bible/:book', handleGetBibleVerses);
app.get('/api/pbe/questions/:book', handleGetPbeQuestions);
app.get('/api/pbe/tests', handleGetPbeTests);
app.get('/api/pbe/tests/:testId', handleGetPbeTest);
app.post('/api/pbe/tests/:testId', handlePostCreateOrUpdatePbeTest);
app.post('/api/pbe/tests', handlePostCreateOrUpdatePbeTest);
app.delete('/api/pbe/tests/:testId', handleDeletePbeTest);
app.delete('/api/pbe/cache', handleDeleteCache);


/////////////////////////
// start listening
var server = app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function () {

    var host = server.address().address;
    var port = server.address().port;

    log.info(LOG_PREFIX_STARTUP, 'Proxy app listening at http://%s:%s', process.env.IP, process.env.PORT);


}).on('error', function(err){
  console.log(err);
});

function handleGetAllStories(req, rsp){
  
  var db = new aws.DynamoDB.DocumentClient();
  
  var params = {
      TableName: "Story"
    };
    
  db.scan(params, function(err, data) {
      if(err) {
        console.log(err, err.stack); // an error occurred
        rsp.status(500).send(err);
      } else {
          rsp.json(data.Items);
      }
    });

}

function handleGetStory(req, rsp){
  
  var docClient = new aws.DynamoDB.DocumentClient();
  
  var publisherid = req.params.publisherid;
  var storyid = req.params.storyid;
  
  console.log("publisher: "+publisherid+", story: "+storyid);
  
  var params = {
      TableName: "Story",
      KeyConditionExpression: "PublisherId = :publisher AND StoryId = :story",
      ExpressionAttributeValues: {
          ":publisher": publisherid,
          ":story": storyid
      }
    };
    
  docClient.query(params, function(err, data) {
      if(err) {
        console.log(err, err.stack); // an error occurred
        rsp.status(500).send(err);
      } else {
        //console.log(data);
        if(data.Count > 0){
          rsp.json(data.Items[0]);
        } else {
          rsp.status(400);
          rsp.send("{error: \"not found\"}");
        }
      }
    });

}

function handleGetAllStoriesForPublisher(req, rsp){
  
  var docClient = new aws.DynamoDB.DocumentClient();
  
  var publisherid = req.params.publisherid;

  var params = {
      TableName: "Story",
      KeyConditionExpression: "PublisherId = :publisher",
      ExpressionAttributeValues: {
          ":publisher": publisherid
      }
    };
    
  docClient.query(params, function(err, data) {
      if(err) {
        console.log(err, err.stack); // an error occurred
        rsp.status(500).send(err);
      } else {
          rsp.json(data.Items);
      }
    });

}

function handleDeleteStory(req, rsp){
}

function error(rsp, msg){
  rsp.error(msg);
}

function handleGetBibleVerses(req, rsp){
  
  var bookSpec = req.params.book;
  var verseSpec = req.query.verses;
  var book = bible.books[resolveBookNumber(bookSpec)];  // TODO:  make the book lookup name-to-index
  var verseManifest = parseVerses(book, verseSpec);
  
  var ret = {};
  ret.verses = [];
  var chapter = book.chapters[verseManifest.chapter];
  
  for(var i=0; i<verseManifest.verses.length; i++){
    ret.verses.push(chapter.verses[verseManifest.verses[i]-1]);
  }
  
  rsp.json(ret);
  
}

function resolveBookNumber(bookName){
  var book = bible.bookNumbers[bookName.toLowerCase()];
  if(typeof book == 'undefined'){
    book = 0;
  }
  
  return book;
}

function parseVerses(book, verseSpec){
  var chapterSpec = verseSpec.split(':')[0];
  var versesSpec = verseSpec.split(':')[1];
  
  var start=1;
  var end=-1;

  // range provided
  if(typeof versesSpec !== 'undefined' && versesSpec.indexOf('-')>-1){
    var vSplit = versesSpec.split('-');
    start = vSplit[0];
    try {
      if(vSplit[1] != null && vSplit[1] != ""){
        end = parseInt(versesSpec.split('-')[1]);
      }
      
    } catch(e){
      // do nothing... our ending index will be -1... the end of the chapter
    }
  }
  
  // single verse
  else if(typeof versesSpec !== 'undefined'){
    start = versesSpec;
    end = versesSpec;
  }
  
  
  var ret = {};
  
  ret.chapter = chapterSpec-1;
  if(ret.chapter < 0 || ret.chapter >= book.chapters.length){
    ret.chapter = book.chapters.length-1;
  }
  ret.verses = [];
  if(end == -1){
    end = book.chapters[ret.chapter].verses.length;
  } 
  if(end > book.chapters[ret.chapter].verses.length){
    end = book.chapters[ret.chapter].verses.length;
  }
  if(start > book.chapters[ret.chapter].verses.length){
    start = book.chapters[ret.chapter].verses.length;
  }

  for(var i=start; i<=end; i++){
    ret.verses.push(i);
  }
  
  
  return ret;
}

function handleGetPbeQuestions(req, rsp){
  
  // call out to Google Apps Script function to read from a Spreadsheet
//  var url="https://script.google.com/macros/s/AKfycbxqdxOL1U516tJ2Wj6afDPBl0XOGNfx8DZxyQjr4qsA2_TbewE/exec";
  var url="https://script.google.com/macros/s/AKfycbxqdxOL1U516tJ2Wj6afDPBl0XOGNfx8DZxyQjr4qsA2_TbewE/exec";
  
  var questions = ttlCache.get("questions");
  
  if(typeof questions == 'undefined'){
  
    request({
        followAllRedirects: true,
        url: url
      }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var rspJson = JSON.parse(response.body);
        ttlCache.set("questions", rspJson);
        
        rsp.json(rspJson);
      }
    });
  } else {
      rsp.json(questions);

  }
  // qhttp.read(url)
  //   .then( function(content){
  //     rsp.json(JSON.parse(content));
  //   }
  // );
}

function handleGetPbeTests(req, rsp){

  var db = new aws.DynamoDB.DocumentClient();
  
  var params = {
      TableName: "PBE_Tests"
    };
    
  db.scan(params, function(err, data) {
      if(err) {
        console.log(err, err.stack); // an error occurred
        rsp.status(500).send(err);
      } else {
          rsp.json(data.Items);
      }
    });


}


function handleGetPbeTest(req, rsp){
  var docClient = new aws.DynamoDB.DocumentClient();
  
  var testId = req.params.testId;
  
  var params = {
      TableName: "PBE_Tests",
      KeyConditionExpression: "TestId=:testId",
      ExpressionAttributeValues: {
          ":testId": testId
      }
    };
    
  docClient.query(params, function(err, data) {
      if(err) {
        console.log(err, err.stack); // an error occurred
        rsp.status(500).send(err);
      } else {
        //console.log(data);
        if(data.Count > 0){
          rsp.json(data.Items[0]);
        } else {
          rsp.status(400);
          rsp.send("{error: \"not found\"}");
        }
      }
    });

}

function handlePostCreateOrUpdatePbeTest(req, rsp){


  var newTest = req.body;

  var docClient = new aws.DynamoDB.DocumentClient();
  
  // first, try to get the testId from the URL
  var testId = req.params.testId;
  
  // next check for an id in the test object passed in...
  if(typeof newTest.TestId != 'undefined' && newTest.TestId !== ""){
    testId = newTest.TestId;
  }

  // finally, if we can't find a UUID anywhere that we've looked, then create a new one
  if(typeof testId == 'undefined'){
    testId = uuid.v1();
  }
  
  if(newTest.Title == null || newTest.Title == ""){
    rsp.status = 500;
    var err = {'error': 'Title must be provided'};
    rsp.json(err);
  }

  if(newTest.SubTitle == ""){
    newTest.SubTitle = null;

  }

    var params = {
      TableName: 'PBE_Tests',
      Item: {
         TestId: testId,
         Title: newTest.Title,
         SubTitle: newTest.SubTitle,
         Questions: newTest.Questions
      }
    };
    
    var docClient = new aws.DynamoDB.DocumentClient();
    
    docClient.put(params, function(err, data) {
      if (err) console.log(err);
      else rsp.json(data);
    });
    
}


function handleDeletePbeTest(req, rsp){
  var docClient = new aws.DynamoDB.DocumentClient();
  
  var testId = req.params.testId;
  
  var params = {
      TableName: "PBE_Tests",
      Key: {
        TestId: testId
      }
    };
    
  docClient.delete(params, function(err, data) {
      if(err) {
        console.log(err, err.stack); // an error occurred
        rsp.status(500).send(err);
      } else {
        //console.log(data);
          rsp.json(data);
      }
    });

}

function handleDeleteCache(req, rsp){
  
  ttlCache.delete('questions');
}
