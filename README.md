# gameoftrade
Game of Trade for stock market analysis

# Pre Requisites
  Mongo 3.6

# Usage
 - npm install
 - npm start

NOTE: Wait for sometime to get some data in db.

# API
POST http://localhost:7878/metrics

body: {
    currency: "BTC-INR",
    hours: 2
}


# Result
```
{
    "metrics": [
        {
            "currency": "BTC-INR",
            "volume": 1308879,
            "open": 706800,
            "close": 706800,
            "high": 707990,
            "low": 706800
        }
    ]
}
```