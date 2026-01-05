```JSON
db.getCollection('RawEventsData').aggregate([
  {
    $match: {
      customerId: new ObjectId("6271a6ee73c463d046dd4c45"),
      ruleId: new ObjectId("6271a6ef73c463d046dd4cff"),
      timeBucketPeriodStart: { $gt: new Date("Tue, 21 Feb 2023 07:00:00 GMT") },
    },
  },
  { $sort: { timeBucketPeriodStart: -1 } },
  {
    $group: { _id: { customerId: "$customerId" }, all: { $sum: "$flagCount" } },
  },
]);
```