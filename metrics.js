const moment = require('moment');

function getMetrics(body, res) {
  const hours = Number(body.hours);
  const currency = body.currency;

  const collection = db.collection('stocks');
  console.log('hours ', hours);

  const windowStart = moment.utc().subtract(hours, 'hours').startOf('hour').toDate();
  const startOfMonth = moment.utc().startOf('month').toDate();
  const currentDate = moment().utc().startOf('day').toDate();
  const windowEnd = moment.utc().toDate();

  console.log('Start ', windowStart);
  console.log('End ', windowEnd);


  const query = [
    {
      $match: { date: new Date(startOfMonth), currency: currency }
    },
    {
      $unwind: '$days'
    },
    {
      $match: { 'days.date': currentDate }
    },
    {
      $unwind: '$days.hours'
    },
    {
      $match: {
        '$and': [
          { 'days.hours.date': { $gte: windowStart } },
          { 'days.hours.date': { $lte: windowEnd } }
        ]
      }
    },
    {
      "$group": {
        _id:      { currency: "$currency" },
        currency: { $first: "$currency" },
        open:     { $first: "$days.open" },
        close:    { $first: "$days.close" },
        high:     { $first: "$days.high" },
        low:      { $first: "$days.low" },
        volume:   { $first: "$volume" }
      }
    },
    {
      $project: {
        "_id": 0,
        "currency": 1,
        "volume": 1,
        "open": "$open",
        "close": "$close",
        "high": "$high",
        "low": "$low"
      }
    }
  ]

  collection.aggregate(query, { batchSize: 1000 }).toArray(function (err, docs) {
    if (err) {
      return res.json({
        error: 'Something went wrong'
      });
    }
    res.json({
      metrics: docs
    });
  })
}


module.exports = {
  getMetrics
}