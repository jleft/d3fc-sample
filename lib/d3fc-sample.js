(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3'], factory) :
  (factory((global.fc_sample = global.fc_sample || {}),global.d3));
}(this, function (exports,d3) { 'use strict';

  d3 = 'default' in d3 ? d3['default'] : d3;

  function bucket () {

      var bucketSize = 10;

      var bucket = function bucket(data) {
          var numberOfBuckets = Math.ceil(data.length / bucketSize);

          return d3.range(0, numberOfBuckets).map(function (i) {
              return data.slice(i * bucketSize, (i + 1) * bucketSize);
          });
      };

      bucket.bucketSize = function (x) {
          if (!arguments.length) {
              return bucketSize;
          }

          bucketSize = x;
          return bucket;
      };

      return bucket;
  }

  var identity = (function (d) {
    return d;
  })

  function largestTriangleOneBucket () {

      var dataBucketer = bucket();
      var x = identity;
      var y = identity;

      var largestTriangleOneBucket = function largestTriangleOneBucket(data) {

          if (dataBucketer.bucketSize() >= data.length) {
              return data;
          }

          var pointAreas = calculateAreaOfPoints(data);
          var pointAreaBuckets = dataBucketer(pointAreas);

          var buckets = dataBucketer(data.slice(1, data.length - 1));

          var subsampledData = buckets.map(function (thisBucket, i) {

              var pointAreaBucket = pointAreaBuckets[i];
              var maxArea = d3.max(pointAreaBucket);
              var currentMaxIndex = pointAreaBucket.indexOf(maxArea);

              return thisBucket[currentMaxIndex];
          });

          // First and last data points are their own buckets.
          return [].concat(data[0], subsampledData, data[data.length - 1]);
      };

      function calculateAreaOfPoints(data) {

          var xyData = data.map(function (point) {
              return [x(point), y(point)];
          });

          var pointAreas = d3.range(1, xyData.length - 1).map(function (i) {
              var lastPoint = xyData[i - 1];
              var thisPoint = xyData[i];
              var nextPoint = xyData[i + 1];

              var base = (lastPoint[0] - nextPoint[0]) * (thisPoint[1] - lastPoint[1]);
              var height = (lastPoint[0] - thisPoint[0]) * (nextPoint[1] - lastPoint[1]);

              return Math.abs(0.5 * base * height);
          });

          return pointAreas;
      }

      d3.rebind(largestTriangleOneBucket, dataBucketer, 'bucketSize');

      largestTriangleOneBucket.x = function (d) {
          if (!arguments.length) {
              return x;
          }

          x = d;

          return largestTriangleOneBucket;
      };

      largestTriangleOneBucket.y = function (d) {
          if (!arguments.length) {
              return y;
          }

          y = d;

          return largestTriangleOneBucket;
      };

      return largestTriangleOneBucket;
  }

  function largestTriangleThreeBucket () {

      var x = identity;
      var y = identity;
      var dataBucketer = bucket();

      var largestTriangleThreeBucket = function largestTriangleThreeBucket(data) {

          if (dataBucketer.bucketSize() >= data.length) {
              return data;
          }

          var buckets = dataBucketer(data.slice(1, data.length - 1));
          var firstBucket = data[0];
          var lastBucket = data[data.length - 1];

          // Keep track of the last selected bucket info and all buckets
          // (for the next bucket average)
          var allBuckets = [].concat(firstBucket, buckets, lastBucket);

          var lastSelectedX = x(firstBucket);
          var lastSelectedY = y(firstBucket);

          var subsampledData = buckets.map(function (thisBucket, i) {

              var highestArea = -Infinity;
              var highestItem;
              var nextAvgX = d3.mean(allBuckets[i + 1], x);
              var nextAvgY = d3.mean(allBuckets[i + 1], y);

              thisBucket.forEach(function (item, j) {
                  var thisX = x(item);
                  var thisY = y(item);

                  var base = (lastSelectedX - nextAvgX) * (thisY - lastSelectedY);
                  var height = (lastSelectedX - thisX) * (nextAvgY - lastSelectedY);

                  var area = Math.abs(0.5 * base * height);

                  if (area > highestArea) {
                      highestArea = area;
                      highestItem = thisBucket[j];
                  }
              });

              lastSelectedX = x(highestItem);
              lastSelectedY = y(highestItem);

              return highestItem;
          });

          // First and last data points are their own buckets.
          return [].concat(data[0], subsampledData, data[data.length - 1]);
      };

      d3.rebind(largestTriangleThreeBucket, dataBucketer, 'bucketSize');

      largestTriangleThreeBucket.x = function (d) {
          if (!arguments.length) {
              return x;
          }

          x = d;

          return largestTriangleThreeBucket;
      };

      largestTriangleThreeBucket.y = function (d) {
          if (!arguments.length) {
              return y;
          }

          y = d;

          return largestTriangleThreeBucket;
      };

      return largestTriangleThreeBucket;
  }

  function modeMedian () {

      var dataBucketer = bucket();
      var value = identity;

      var modeMedian = function modeMedian(data) {

          if (dataBucketer.bucketSize() > data.length) {
              return data;
          }

          var minMax = d3.extent(data, value);
          var buckets = dataBucketer(data.slice(1, data.length - 1));

          var subsampledData = buckets.map(function (thisBucket, i) {

              var frequencies = {};
              var mostFrequent;
              var mostFrequentIndex;
              var singleMostFrequent = true;

              var values = thisBucket.map(value);

              var globalMinMax = values.filter(function (value) {
                  return value === minMax[0] || value === minMax[1];
              }).map(function (value) {
                  return values.indexOf(value);
              })[0];

              if (globalMinMax !== undefined) {
                  return thisBucket[globalMinMax];
              }

              values.forEach(function (item, i) {
                  if (frequencies[item] === undefined) {
                      frequencies[item] = 0;
                  }
                  frequencies[item]++;

                  if (frequencies[item] > frequencies[mostFrequent] || mostFrequent === undefined) {
                      mostFrequent = item;
                      mostFrequentIndex = i;
                      singleMostFrequent = true;
                  } else if (frequencies[item] === frequencies[mostFrequent]) {
                      singleMostFrequent = false;
                  }
              });

              if (singleMostFrequent) {
                  return thisBucket[mostFrequentIndex];
              } else {
                  return thisBucket[Math.floor(thisBucket.length / 2)];
              }
          });

          // First and last data points are their own buckets.
          return [].concat(data[0], subsampledData, data[data.length - 1]);
      };

      d3.rebind(modeMedian, dataBucketer, 'bucketSize');

      modeMedian.value = function (x) {
          if (!arguments.length) {
              return value;
          }

          value = x;

          return modeMedian;
      };

      return modeMedian;
  }

  exports.bucket = bucket;
  exports.largestTriangleOneBucket = largestTriangleOneBucket;
  exports.largestTriangleThreeBucket = largestTriangleThreeBucket;
  exports.modeMedian = modeMedian;

}));