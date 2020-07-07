const MongoClient = require('mongodb').MongoClient;
const app         = require('express')();
const socketio    = require('socket.io-client');
const moment      = require('moment');
const bodyParser  = require('body-parser')

const { wait }        = require('./utils');
const { getMetrics }  = require('./metrics');


const dbURL = "mongodb://localhost:27017";
const dbName = "crypto";


async function connectToDB() {
   console.log('Connecting to MongoDB Server');
   let [dbError, client] = await wait(MongoClient.connect, MongoClient, dbURL, { useUnifiedTopology: true });
   if (dbError) {
      console.log('Unable to connect to MongoDB Server');
   }
   console.log('Successfully connected to MongoDB Server');
   global.db = client.db(dbName);
}

function connectToFeed() {
   var socket = socketio('wss://ws-feed.zebpay.com/marketdata', {
      transports: ['websocket']
   });

   const channel = 'history_singapore/BTC-INR';
   socket.on('connect', function () {
      console.log('Connected to Socket.IO Server');
      console.log('Subscribing to :: ', channel);
      socket.emit('subscribe', channel);

   });

   socket.on(channel, msg => {
      insertDocument(msg);
   });

   socket.on('error', console.log)
   socket.on('disconnect', function (s) {
      console.log('DISCONNECTED');
      // handle in case of server terminating connection
      socket.connect();
   });
}

function insertDocument(data) {
   console.log('inserting ', data);

   const collection = db.collection('stocks');
   const startOfMonth = moment.utc().startOf('month').toDate();

   const query = {
      date: startOfMonth ,
      currency: data.currencyPair
   }
   const parsed = new Date(data.lastModifiedDate)
   const day = Number(parsed.getDate()) - 1;
   const hour = moment.utc().hour();
   // const minute = parsed.getMinutes();

   console.log('trying to update ', query);

   const updateObj = {
      $max: {
         [`days.${day}.high`]: data.fill_price
      },
      $min: {
         [`days.${day}.low`]: data.fill_price
      },
      $set: {
         [`days.${day}.open`]: data.fill_price,
         [`days.${day}.close`]: data.fill_price,
      },
      $inc: {
         volume: data.fill_qty,
         [`days.${day}.volume`]: data.fill_qty,
         [`days.${day}.hours.${hour}.volume`]: data.fill_qty,
         // [`days.${day}.hours.${hour}.minutes.${minute}.volume`]: data.fill_qty,
      }
   };


   try {
      // if entry exists
      collection.updateOne(query,
         updateObj,
         { upsert: false },
         function (err, result) {
            // try to insert
            result = result.toJSON();
            // console.log('modified ', result.nModified)
            if (result.nModified === 0) {
               try {
                  let document = getDocument(data);

                  collection.insertOne(document, function (insertError, resp) {
                     if (insertError) {
                        console.log(insertError);
                        return
                     }
                     collection.updateOne(query,
                        updateObj
                        , function (e, n) {
                           if (e) {
                              console.log(e);
                           }
                           console.log('updated ', n.toJSON().nModified);
                        });
                  })
               } catch (err) {
                  console.log(err);
               }
            }
         });
   } catch (e) {
      throw err
   }
}

const getDocument = (data) => {
   const parsed = new Date(data.lastModifiedDate);
   const daysInMonth = moment(parsed).daysInMonth();
   const startOfMonth = moment(data.lastModifiedDate).utc().startOf('month').toDate();

   const initialDaysData = []

   for (let i = 0; i < daysInMonth; i++) {
      const day = moment.utc().startOf('month').add(i, 'days').toDate();
      const dayData = {
         "date": day,
         "open": 0,
         "close": 0,
         "high": 0,
         "volume": 0,
         "hours": [ ]
      };
      for (let j = 0; j < 24; j++) {
         let startHour = moment(day).utc().startOf('day').add(j, 'hours').toDate();
         dayData.hours.push({
            date: startHour,
            volume: 0,
         });
      }
      initialDaysData.push(dayData);
   }

   return {
      date: startOfMonth,
      currency: data.currencyPair,
      volume: 0,
      days: initialDaysData
   }
}

async function init() {
   await connectToDB();
   await connectToFeed();
}

app.use(bodyParser.json());

app.post('/metrics', (req, res) => {
   getMetrics(req.body, res)
});


app.listen(7878, function () {
   console.log('Server listening on port 7878');
   init();
})